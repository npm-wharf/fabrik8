module.exports = function (clusterInfo, uuid = require('uuid')) {
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
      subdomain,
      url
    } = _reconcileName(argv, commonDefaultConfig.allowedSubdomains)

    const { projectPrefix = '' } = commonDefaultConfig
    const projectId = argv.projectId || `${projectPrefix}${name}`

    const commonSettings = { name, subdomain, url, projectId, environment }

    try {
      var existingClusterConfig = await clusterInfo.getCluster(name)
    } catch (e) {}

    var inputSettings = existingClusterConfig

    if (!existingClusterConfig) {
      inputSettings = _extendDefaults(commonDefaultConfig, commonSettings, argv)
    }

    // fetch service accounts
    inputSettings = await _reifyServiceAccounts(inputSettings)

    // override parameters
    inputSettings = _yargsOverrides(inputSettings, argv)

    const { common, cluster, tokens } = inputSettings

    const kubeformSettings = {
      ...common,
      ...cluster,
      ...commonSettings
    }

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

  }

  return {
    processArgv,
    storeResult,

    // for testing
    _reconcileName,
    _yargsOverrides,
    _reifyServiceAccounts
  }

  function _reconcileName (argv, allowedSubdomains = ['npme.io']) {
    const {
      url: inputUrl,
      name: inputName,
      subdomain: inputSubdomain = allowedSubdomains[0]
    } = argv

    let url, name, subdomain

    if (inputUrl) {
      url = inputUrl
      name = inputName || url.slice(0, url.indexOf('.'))
      subdomain = url.slice(url.indexOf('.') + 1)
    } else {
      if (!inputName) throw new Error('Either a `name` or a `url` must be supplied.')
      name = inputName
      subdomain = inputSubdomain
      url = `${name}.${subdomain}`
    }

    if (allowedSubdomains && !allowedSubdomains.includes(subdomain)) {
      throw new Error(`${url} not a subdomain of ${allowedSubdomains.join(', ')}`)
    }

    return { url, name, subdomain }
  }

  function _extendDefaults (commonDefaultConfig, commonSettings, argv) {
    // clone defaults
    const newSettings = JSON.parse(JSON.stringify(commonDefaultConfig))
    const { common = {}, tokens = {} } = newSettings

    // in case they don't exist
    newSettings.common = common
    newSettings.tokens = tokens

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

    Object.keys(accounts).forEach(key => {
      const email = accounts[key].client_email
      if (key in newData || newData[key] === email) {
        newData[key] = JSON.stringify(accounts[key])
      }
      const { common = {} } = newData
      if (key in common || common[key] === email) {
        common[key] = JSON.stringify(accounts[key])
      }
      const { tokens = {} } = newData
      if (key in tokens || tokens[key] === email) {
        tokens[key] = JSON.stringify(accounts[key])
      }
    })
    return newData
  }
}
