const bole = require('bole')
const log = bole('fabrik8.api')
const filterUndefined = require('./filter')

const initialize = (Kubeform, hikaru, setupKubectx = () => {}) => async (kubeformParams, specification, hikaruParams, options = {}) => {
  try {
    const kubeformCredentials = options.applicationCredentials || kubeformParams.applicationCredentials
    const kubeform = new Kubeform({
      applicationCredentials: kubeformCredentials,
      projectId: kubeformParams.projectId
    })
    const initialCluster = await provisionCluster(kubeform, kubeformParams)
    await setupKubectx(initialCluster, kubeformParams.environment, kubeformParams.slug)
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
  const onCluster = options.onCluster || data.onCluster
  const { onCluster: _0, ...filteredOpts } = options
  const { onCluster: _1, ...filteredData } = data
  const tokens = { ...filteredData, ...filteredOpts }

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
    log.error(`fabrication failed during spec transfiguration step`)
    throw e
  }
}

function provisionCluster (kubeform, clusterConfig) {
  const result = kubeform.create(clusterConfig)
  return result
    .catch(e => {
      log.error(`fabrication failed during cluster provision step`)
      throw e
    })
}

module.exports = (Kubeform, hikaru, setupKubectx) => {
  return {
    initialize: initialize(Kubeform, hikaru, setupKubectx)
  }
}
