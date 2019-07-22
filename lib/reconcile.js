'use strict'
const fastDeepEqual = require('fast-deep-equal')
const nunjucks = require('nunjucks')
const crypto = require('crypto')
const Ajv = require('ajv')
const log = require('bole')('fabrik8')

const ajv = new Ajv()
const validate = ajv.compile(require('@npm-wharf/cluster-info-client/schema.json'))

module.exports = function (clusterInfo, uuid = require('uuid')) {
  return {
    processArgv,
    storeResult,

    // for testing
    _reconcileName,
    _yargsOverrides,
    _reifyServiceAccounts
  }

  /**
   * A lot is going on here!  We have to take in the yargs args, and then
   * produce the params needed for fabrik8.  Some of these will be inferred
   * from the input, others will come from Vault as default values.  Some params
   * will come from previous fabrik8 runs, if the cluster exists!  We also have
   * to process args that override defaults, and generate certain missing values
   * according to rules specified in the common default config.
   *
   * argv takes precedence over existing cluster data, which takes precedence
   * over cluster-info defaults.
   *
   * Cluster info is stored roughly as
   *
   * {
   *   common: {...}
   *   cluster: {...}
   *   tokens:  {...}
   *   spec: '...'
   *   serviceAccounts: {...}
   * }
   *
   * `cluster` is a set of params for Kubeform, `tokens` are a set of params to
   * use as tokens when templating the McGonagall `spec` with Hikaru, and
   * `common` is a set of params used by both.  Service accounts is a map of
   * keys to service account emails.  If the same `key: email` pair exists in
   * any of the three sets of parameters, the full json  key will be fetched
   * and used to replace the email values within the parameter sets.
   *
   * @param  {Object} argv Yargs args
   * @return {Object}      parameters to pass to fabrik8 api
   */
  async function processArgv (argv) {
    var {
      environment = 'production',
      specification,
      clusterName,
      slug,
      url: urlArg,
      domain: domainArg,
      zone
    } = argv

    log.info('fetching default cluster info...')
    let commonDefaultConfig = await clusterInfo.getCommon()

    if (slug && (!urlArg || !domainArg)) {
      try {
        log.info(`fetching existing cluster info for ${slug}...`)
        var info = await clusterInfo.getCluster(slug)
      } catch (e) {
        log.error(e.stack)
        throw new Error(`cluster ${slug} doesn't appear to exist`)
      }

      // fetch service accounts
      log.info(`${slug} found, re-applying config...`)
      const merged = _extendDefaults(commonDefaultConfig, info.value)
      const props = await _reifyServiceAccounts(merged)

      const { cluster, tokens, spec, applicationCredentials } = props

      cluster.applicationCredentials = cluster.applicationCredentials || applicationCredentials

      if (typeof cluster.credentials === 'string') {
        cluster.credentials = JSON.parse(cluster.credentials)
      }

      if (typeof cluster.applicationCredentials === 'string') {
        cluster.applicationCredentials = JSON.parse(cluster.applicationCredentials)
      }

      log.debug('final config:', JSON.stringify({ cluster, tokens }, null, 2))

      return {
        kubeformSettings: cluster, // kubeform params
        hikaruSettings: tokens, // hikaru tokens
        specification: spec
      }
    }

    var {
      name,
      domain,
      url
    } = _reconcileName(argv, commonDefaultConfig.allowedDomains)

    slug = slug || name

    let commonSettings = { slug, name, domain, url, environment }

    try {
      log.info(`checking for existing cluster info for ${slug}...`)
      var { value: existingClusterConfig } = await clusterInfo.getCluster(slug)
    } catch (e) {}

    let inputSettings

    if (!existingClusterConfig) {
      log.info(`no existing cluster info, using input configuration...`)
      inputSettings = _extendDefaults(commonDefaultConfig, { common: commonSettings })
    } else {
      log.info(`${slug} found, re-applying config...`)
      inputSettings = _extendDefaults(commonDefaultConfig, existingClusterConfig)
    }

    let projectId = argv.projectId ||
      (inputSettings.common && inputSettings.common.projectId) ||
      commonSettings.projectId ||
      `${slug}`
    inputSettings.common.projectId = projectId

    // fetch service accounts
    inputSettings = await _reifyServiceAccounts(inputSettings)

    // override parameters
    inputSettings = _yargsOverrides(inputSettings, argv)

    const { common, cluster, tokens } = inputSettings

    if (typeof common.credentials === 'string') {
      common.credentials = JSON.parse(common.credentials)
    }

    if (typeof cluster.credentials === 'string') {
      cluster.credentials = JSON.parse(cluster.credentials)
    }

    clusterName = clusterName || slug

    common.zones = zone || common.zones

    if (!common.zones || !common.zones.length) throw new Error('no zone')
    const kubeformSettings = {
      ...common,
      ...cluster,
      clusterName
    }

    if (inputSettings.applicationCredentials) {
      kubeformSettings.applicationCredentials = JSON.parse(inputSettings.applicationCredentials)
    }

    const hikaruSettings = {
      ...common,
      // hikaru names things weird :(
      subdomain: name,
      awsZone: domain,
      ...tokens
    }

    log.debug('final config:', JSON.stringify({
      cluster: kubeformSettings,
      tokens: hikaruSettings
    }, null, 2))

    return {
      kubeformSettings, // kubeform params
      hikaruSettings, // hikaru tokens
      specification
    }
  }

  /**
   * This does roughly the inverse of processArgv, taking the result, pulling
   * out common values and service accounts, and storing the result in vault.
   * @param  {Object} resultOpts The results from a fabrik8 run
   * @return {Promise}
   */
  async function storeResult (resultOpts) {
    const [ serviceAccounts, filteredOpts ] = _removeServiceAccounts(JSON.parse(JSON.stringify(resultOpts)))
    const {
      cluster,
      tokens,
      specification
    } = filteredOpts

    const { environment = 'production' } = cluster

    const commonKeys = Object.keys(cluster).filter(key => {
      return (cluster[key] === tokens[key] || fastDeepEqual(cluster[key], tokens[key]))
    })
    const common = {}
    commonKeys.forEach(key => { common[key] = cluster[key] })

    await Promise.all(serviceAccounts.map(async ([key, sa]) => {
      return clusterInfo.addServiceAccount(sa)
    }))

    const props = {
      cluster,
      tokens,
      common,
      environment,
      spec: specification,
      serviceAccounts: serviceAccounts.reduce((obj, [key, sa]) => {
        obj[key] = sa.client_email
        return obj
      }, {})
    }

    const valid = validate(props)
    if (!valid) throw new Error('data invalid:\n' + JSON.stringify(validate.errors, null, 2))

    log.info(`storing cluster info for ${tokens.slug}...`)
    log.debug(JSON.stringify(props, null, 2))
    await clusterInfo.registerCluster(tokens.slug, environment, props, [environment])
  }

  /* helper funcs */

  // figure out the name from the argv
  function _reconcileName (argv, allowedDomains = ['npme.io']) {
    const {
      url: inputUrl,
      name: inputName,
      domain: inputDomain = allowedDomains[0]
    } = argv

    let url, name, domain

    if (inputUrl) {
      url = inputUrl
      name = inputName || url.slice(0, url.indexOf('.'))
      domain = url.slice(url.indexOf('.') + 1)
    } else {
      if (!inputName) throw new Error('Either a `name` or a `url` must be supplied.')
      name = inputName
      domain = inputDomain
      url = `${name}.${domain}`
    }

    if (allowedDomains && !allowedDomains.includes(domain)) {
      throw new Error(`${url} not a subdomain of ${allowedDomains.join(', ')}`)
    }

    return { url, name, domain }
  }

  // merge existing cluster data into the defaults, generate default values
  function _extendDefaults (commonDefaultConfig, inputSettings) {
    const newSettings = JSON.parse(JSON.stringify(commonDefaultConfig))
    _renderDefaults(newSettings, inputSettings.common)

    const {
      common: inputCommon,
      cluster: inputCluster,
      tokens: inputTokens
    } = inputSettings
    // clone defaults
    const { common = {}, tokens = {}, cluster = {} } = newSettings

    // in case they don't exist
    newSettings.common = common
    newSettings.cluster = cluster
    newSettings.tokens = tokens

    Object.assign(common, inputCommon)
    Object.assign(tokens, inputTokens)
    Object.assign(cluster, inputCluster)

    newSettings.serviceAccounts = {
      ...commonDefaultConfig.serviceAccounts,
      ...inputSettings.serviceAccounts
    }
    newSettings.spec = inputSettings.spec || inputSettings.specification
    return newSettings
  }

  // do nunjucks templating on properties
  function _renderDefaults (commonDefaultConfig, commonVars) {
    const templateVars = {
      uuid () { return uuid.v4() },
      randomBytes (n = 32) { return crypto.pseudoRandomBytes(n).toString('hex') },
      ...commonVars
    }

    const { common, tokens, cluster } = commonDefaultConfig

    ;[common, tokens, cluster].forEach(obj => Object.keys(obj).forEach(key => {
      const val = obj[key]
      if (typeof val === 'string' && val.match(/{{.+}}/)) {
        const newVal = nunjucks.renderString(val, templateVars)
        obj[key] = newVal
      }
    }))
  }

  // handle argv overrides for values that come from cluster-info
  function _yargsOverrides (settings, argv) {
    const prefix = 'arg-'
    Object.keys(argv)
      .filter(key => key.startsWith(prefix))
      .forEach(key => {
        const val = argv[key]
        const path = key.replace(prefix, '').split('.')
        if (path.length === 1) {
          return _setIn(settings.common, path, val)
        }
        _setIn(settings, path, val)
      })
    return settings
  }

  function _setIn (obj, path, val) {
    let i
    for (i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]]
      if (!obj) return
    }
    try {
      obj[path[i]] = JSON.parse(val)
    } catch (e) {
      obj[path[i]] = val
    }
  }

  // we scrub full credential objects from the cluster data before saving, so
  // when fetching, we need to also fetch the SAs and replace the email
  // placeholder in cluster data
  async function _reifyServiceAccounts (clusterData) {
    const { serviceAccounts = {}, ...newData } = clusterData

    log.info('fetching service accounts...')
    const results = await Promise.all(Object.keys(serviceAccounts).map(async key => {
      const email = serviceAccounts[key]
      return [key, await clusterInfo.getServiceAccount(email)]
    }))

    const accounts = {}
    results.forEach(([key, json]) => { accounts[key] = json })

    const replaceRecursive = (obj) => {
      Object.keys(accounts).forEach(key => {
        const email = accounts[key].client_email
        if (key in obj || obj[key] === email) {
          obj[key] = JSON.stringify(accounts[key])
        }

        Object.keys(obj).map(key => obj[key]).forEach(val => {
          if (val && typeof val === 'object' && !Array.isArray(val)) {
            replaceRecursive(val)
          }
        })
      })
      return obj
    }

    return replaceRecursive(JSON.parse(JSON.stringify(newData)))
  }

  // the inverse of _reifyServiceAccounts()
  function _removeServiceAccounts (clusterData) {
    const serviceAccounts = []

    const scrubRecursive = (obj) => {
      Object.keys(obj).forEach(key => {
        const val = obj[key]
        // assume anything json-like with a client_email prop is a SA
        if (typeof val === 'string' && val.includes('"client_email"') && val.includes('"private_key"')) {
          const serviceAccount = JSON.parse(val)
          serviceAccounts.push([key, serviceAccount])
          obj[key] = serviceAccount.client_email
        } else if (val && val.client_email && val.private_key) {
          serviceAccounts.push([key, val])
          obj[key] = val.client_email
        } else if (val && typeof val === 'object' && !Array.isArray(val)) {
          scrubRecursive(val)
        }
      })
    }

    scrubRecursive(clusterData)

    return [serviceAccounts, clusterData]
  }
}
