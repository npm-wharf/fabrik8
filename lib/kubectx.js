'use strict'

const { spawnSync } = require('child_process')
const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
const os = require('os')
const log = require('bole')('fabrik8.kubeconfig')

module.exports = async function setupKubeContext (cluster, env, slug) {
  const config = _readKubeConfig()
  const existingContexts = config.contexts
    .map(context => context.name)
    .filter(name => name.startsWith('cluster/'))

  const project = cluster.projectId
  const zone = cluster.zones[0]
  const clusterName = cluster.clusterName
  const defaultContextName = `gke_${project}_${zone}_${clusterName}`
  const desiredName = `cluster/${env}/${slug}`
  if (existingContexts.includes(desiredName)) {
    log.info(`${desiredName} already in kubeconfig`)
    return
  }

  if (!existingContexts.includes(defaultContextName)) {
    log.info('asking gcloud to configure cluster...')
    const res = spawnSync('gcloud', ['container', 'clusters', 'get-credentials', clusterName, '--project', project, '--zone', zone])
    if (res.error) throw res.error
    if (res.status !== 0) throw new Error(res.stderr)
  }

  log.info('asking kubectl to rename cluster context...')
  const res = spawnSync('kubectl', ['config', 'rename-context', defaultContextName, desiredName])
  if (res.error) throw res.error
  if (res.status !== 0) throw new Error(res.stderr)
  log.info(`${desiredName} configured in kubeconfig`)
}

function _readKubeConfig () {
  const configPath = process.env.KUBECONFIG || path.join(os.homedir(), '.kube', 'config')
  const contents = fs.readFileSync(path.resolve(configPath), { encoding: 'utf8' })
  const config = yaml.safeLoad(contents)
  return config
}
