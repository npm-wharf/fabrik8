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
   * @param  {Object} argv Yargs args
   * @return {Object}      parameters to pass to fabrik8 api
   */
  async function processArgv (argv) {
    const {
      environment = 'production',
      specification
    } = argv

    let commonDefaultConfig = await clusterInfo.getCommon()

    const {
      name,
      domain,
      url
    } = _reconcileName(argv, commonDefaultConfig.allowedDomains)

    const { projectPrefix = '' } = commonDefaultConfig
    const projectId = argv.projectId || `${projectPrefix}${name}`

    const commonSettings = { name, domain, url, projectId, environment }

    // REMOVE THIS
    try {
      await clusterInfo.unregisterCluster(name)
    } catch (e) {}

    try {
      var { secretProps: existingClusterConfig } = await clusterInfo.getCluster(name)
    } catch (e) {}

    var inputSettings

    if (!existingClusterConfig) {
      inputSettings = _extendDefaults(commonDefaultConfig, { common: commonSettings }, argv)
    } else {
      inputSettings = _extendDefaults(commonDefaultConfig, existingClusterConfig, argv)
    }

    // fetch service accounts
    inputSettings = await _reifyServiceAccounts(inputSettings)

    // override parameters
    inputSettings = _yargsOverrides(inputSettings, argv)

    let { common, cluster, tokens } = inputSettings

    const kubeformSettings = {
      ...common,
      ...cluster,
      ...commonSettings
    }
    if (inputSettings.credentials) {
      kubeformSettings.credentials = JSON.parse(inputSettings.credentials)
    }
    if (inputSettings.applicationCredentials) {
      kubeformSettings.applicationCredentials = JSON.parse(inputSettings.applicationCredentials)
    }

    // hikaru names things weird :(
    tokens = { subdomain: name, awsZone: domain, ...tokens }

    const hikaruSettings = {
      ...common,
      ...tokens,
      ...commonSettings
    }

    return {
      kubeformSettings, // kubeform params
      hikaruSettings, // hikaru tokens
      specification
    }
  }

  async function storeResult (resultOpts) {
    const [ serviceAccounts, filteredOpts ] = _removeServiceAccounts(resultOpts)
    const {
      cluster,
      tokens
    } = filteredOpts

    await Promise.all(serviceAccounts.map(async ([key, sa]) => {
      return clusterInfo.addServiceAccount(sa)
    }))

    await clusterInfo.registerCluster(cluster.name, {}, {
      cluster,
      tokens,
      serviceAccounts: serviceAccounts.reduce((obj, [key, sa]) => {
        obj[key] = sa.client_email
        return obj
      }, {})
    }, [cluster.environment])
  }

  function _reconcileName (argv, allowedDomains = ['npme.io']) {
    const {
      url: inputUrl,
      name: inputName,
      domain: inputSubdomain = allowedDomains[0]
    } = argv

    let url, name, domain

    if (inputUrl) {
      url = inputUrl
      name = inputName || url.slice(0, url.indexOf('.'))
      domain = url.slice(url.indexOf('.') + 1)
    } else {
      if (!inputName) throw new Error('Either a `name` or a `url` must be supplied.')
      name = inputName
      domain = inputSubdomain
      url = `${name}.${domain}`
    }

    if (allowedDomains && !allowedDomains.includes(domain)) {
      throw new Error(`${url} not a subdomain of ${allowedDomains.join(', ')}`)
    }

    return { url, name, domain }
  }

  function _extendDefaults (commonDefaultConfig, inputSettings, argv) {
    const {
      common: inputCommon,
      cluster: inputCluster,
      tokens: inputTokens
    } = inputSettings
    // clone defaults
    const newSettings = JSON.parse(JSON.stringify(commonDefaultConfig))
    const { common = {}, tokens = {}, cluster = {} } = newSettings

    // in case they don't exist
    newSettings.common = common
    newSettings.cluster = cluster
    newSettings.tokens = tokens

    Object.assign(common, inputCommon)
    Object.assign(tokens, inputTokens)
    Object.assign(cluster, inputCluster)

    // generate cluster user/password
    common.user = common.user || 'admin'
    common.password = uuid.v4()

    // generate dashboard pass
    tokens.dashboardAdmin = tokens.dashboardAdmin || 'admin'
    tokens.dashboardPass = uuid.v4()
    return newSettings
  }

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
    obj[path[i]] = val
  }

  async function _reifyServiceAccounts (clusterData) {
    const { serviceAccounts = {}, ...newData } = clusterData

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
    }

    replaceRecursive(newData)
    return newData
  }

  function _removeServiceAccounts (clusterData) {
    const serviceAccounts = []

    const { cluster, tokens } = clusterData

    ;[cluster, tokens].forEach(obj => Object.keys(obj).forEach(key => {
      const val = obj[key]
      // assume anything json-like with a client_email prop is a SA
      if (typeof val === 'string' && val.includes('"client_email"')) {
        const serviceAccount = JSON.parse(val)
        serviceAccounts.push([key, serviceAccount])
        obj[key] = serviceAccount.client_email
      }
    }))

    return [serviceAccounts, clusterData]
  }
}
