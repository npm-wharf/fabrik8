const bole = require('bole')
const log = bole('fabrik8.api')
const filterUndefined = require('./filter')

const initialize = (events, Kubeform, hikaru) => async (kubeformParams, specification, hikaruParams, options = {}) => {
  try {
    const kubeformCredentials = options.applicationCredentials || kubeformParams.applicationCredentials
    const kubeform = new Kubeform({
      applicationCredentials: kubeformCredentials,
      projectId: kubeformParams.projectId
    })
    const initialCluster = await provisionCluster(events, kubeform, kubeformParams)
    const {
      cluster,
      ...specData
    } = await deploySpecification(hikaru, initialCluster, specification, hikaruParams, options)
    return { cluster, tokens: filterUndefined(specData) }
  } catch (e) {
    log.error(e.stack)
    throw e
  }
}

async function deploySpecification (hikaru, cluster, specification, data, options) {
  const isCallback = typeof data === 'function'
  const onCluster = options.onCluster || data.onCluster
  const { onCluster: _0, ...filteredOpts } = options
  const { onCluster: _1, ...filteredData } = data
  const tokens = isCallback
    ? filteredOpts
    : { ...filteredData, ...filteredOpts }

  const config = {
    url: `https://${cluster.masterEndpoint}`,
    username: cluster.user,
    password: cluster.password
  }
  if (cluster.credentials && !(typeof cluster.credentials === 'string')) {
    tokens.credentials = tokens.credentials || cluster.credentials
  }
  tokens.masterIP = tokens.masterIP || cluster.masterEndpoint
  if (onCluster) {
    await onCluster(tokens, cluster)
  }
  tokens.cluster = cluster
  try {
    await hikaru.deployCluster(specification, { data: tokens }, config)
    return tokens
  } catch (e) {
    if (e.tokens && isCallback) {
      const tokenData = await data(e.tokens)
      return deploySpecification(hikaru, cluster, specification, tokenData, options)
    } else {
      log.error(`fabrication failed during spec transfiguration step`)
      throw e
    }
  }
}

function provisionCluster (events, kubeform, clusterConfig) {
  kubeform.on('prerequisites-created', ev => events.emit('cluster.prerequisites-created', ev))
  kubeform.on('bucket-permissions-set', ev => events.emit('cluster.bucket-permissions-set', ev))
  kubeform.on('cluster-initialized', ev => events.emit('cluster.cluster-initialized', ev))
  const result = kubeform.create(clusterConfig)
  return result
    .catch(e => {
      log.error(`fabrication failed during cluster provision step`)
      throw e
    })
}

module.exports = (events, Kubeform, hikaru) => {
  return {
    initialize: initialize(events, Kubeform, hikaru),
    events
  }
}
