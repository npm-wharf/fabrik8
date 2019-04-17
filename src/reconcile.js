const util = require('util')

module.exports = function (clusterInfo) {
  async function processArgv (argv) {
    const {
      environment
    } = argv

    let commonDefaults = await clusterInfo.getCommon()

    const {
      name,
      subdomain,
      url
    } = _reconcileName(argv, commonDefaults.allowedSubdomains)

    var clusterData = {}
    try {
      clusterData = await clusterInfo.getCluster(name)
    } catch (e) {}

    clusterData = await _reifyServiceAccounts(clusterData)
    commonDefaults = await _reifyServiceAccounts(commonDefaults)

    const {
      projectPrefix = ''
    } = commonDefaults
    const projectId = argv.projectId || `${projectPrefix}${name}`


    console.log({ name, subdomain, url, projectId, clusterData })
    return {
      clusterConfig,
      specification,
      data
    }
  }

  async function storeResult (resultOpts) {

  }

  return {
    processArgv,
    storeResult,

    // for testing
    _reconcileName,
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
      const { tokens } = newData
      if (key in tokens || tokens[key] === email) {
        tokens[key] = JSON.stringify(accounts[key])
      }
    })
    return newData
  }
}
