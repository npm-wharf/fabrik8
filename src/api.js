const bole = require('bole')
const log = bole('fabrik8.api')
const fount = require('fount')
const filterUndefined = require('./filter')

const initialize = (events, Kubeform, hikaru) => async (clusterConfig, specification, data, options = {}) => {
  try {
    const kubeform = new Kubeform(options)
    const initialCluster = await provisionCluster(events, kubeform, clusterConfig)
    const { cluster, ...specData } = await deploySpecification(events, hikaru, initialCluster, specification, data, options)
    return { cluster, tokens: filterUndefined(specData) }
  } catch (e) {
    log.error(e.stack)
    throw e
  }
}

async function deploySpecification (events, hikaru, cluster, specification, data, options) {
  const isCallback = typeof data === 'function'
  const onCluster = options.onCluster || data.onCluster
  const { onCluster: _0, ...filteredOpts } = options
  const { onCluster: _1, ...filteredData } = data
  const tokens = isCallback
    ? filteredOpts
    : { ...filteredData, ...filteredOpts }
  const config = fount.get('config')
  config.url = `https://${cluster.masterEndpoint}`
  config.username = cluster.user
  config.password = cluster.password
  if (onCluster) {
    onCluster(tokens, cluster)
  }
  tokens.cluster = cluster

  try {
    await hikaru.deployCluster(specification, tokens)
    return tokens
  } catch (e) {
    if (e.tokens && isCallback) {
      const tokenData = await data(e.tokens)
      return deploySpecification(events, hikaru, cluster, specification, tokenData, options)
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
    initialize: initialize(events, Kubeform, hikaru)
  }
}
