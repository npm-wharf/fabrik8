const bole = require('bole')
const log = bole('fabrik8.api')
const fount = require('fount')

async function initialize (events, Kubeform, hikaru, clusterConfig, specification, data = {}, options = { data }) {
  try {
    const kubeform = new Kubeform(options)
    const cluster = await provisionCluster(events, kubeform, clusterConfig)
    const specData = await deploySpecification(events, hikaru, cluster, specification, data, options)
    return Object.assign({}, cluster, { specData })
  } catch (e) {
    log.error(e.stack)
    throw e
  }
}

async function deploySpecification (events, hikaru, cluster, specification, data, options) {
  const isCallback = typeof data === 'function'
  const opts = isCallback
    ? Object.assign({}, options, { data: {} })
    : Object.assign({}, { data }, options)
  const config = fount.get('config')
  config.url = `https://${cluster.masterEndpoint}`
  config.username = cluster.user
  config.password = cluster.password
  if (opts.onCluster) {
    opts.onCluster(opts, cluster)
  } else {
    opts.data.cluster = cluster
  }
  try {
    await hikaru.deployCluster(specification, opts)
    return opts
  } catch (e) {
    if (e.tokens && isCallback) {
      return data(e.tokens)
        .then(tokenData => deploySpecification(events, hikaru, cluster, specification, tokenData, options))
    } else {
      log.error(`fabrication failed during spec transfiguration step`)
      throw e
    }
  }
}

function provisionCluster (events, kubeform, clusterConfig) {
  kubeform.on('prerequisites-created', e => events.emit('cluster.prerequisites-created', e))
  kubeform.on('bucket-permissions-set', e => events.emit('cluster.bucket-permissions-set', e))
  kubeform.on('cluster-initialized', e => events.emit('cluster.cluster-initialized', e))
  const result = kubeform.create(clusterConfig)
  return result
    .catch(e => {
      log.error(`fabrication failed during cluster provision step`)
      throw e
    })
}

module.exports = function (events, Kubeform, hikaru) {
  return {
    initialize: initialize.bind(null, events, Kubeform, hikaru)
  }
}
