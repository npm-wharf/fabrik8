'use strict'

const { spawnSync } = require('child_process')
const yaml = require('js-yaml')
const path = require('path')
const fs = require('fs')
const os = require('os')
const log = require('bole')('fabrik8.kubeconfig')

module.exports = async function setupKubeContext (clusters) {
  const config = _readKubeConfig()
  const currentContext = config['current-context'] || null
  const existingContexts = config.contexts
    .map(context => context.name)
    .filter(name => name.startsWith('cluster/'))

  for (const [cluster, env, slug] of clusters) {
    try {
      var project = cluster.projectId
      var zone = cluster.zones[0]
      var clusterName = cluster.clusterName
      var defaultContextName = `gke_${project}_${zone}_${clusterName}`
      var desiredName = `cluster/${env}/${slug}`
    } catch (err) {
      log.error(`${slug} cluster contains invalid data! make sure vault looks correct`)
      process.exitCode = 1
      continue
    }

    if (existingContexts.includes(desiredName)) {
      log.info(`${desiredName} already in kubeconfig`)
      return
    }

    if (!existingContexts.includes(defaultContextName)) {
      log.info('asking gcloud to configure cluster...')
      const res = spawnSync('gcloud', ['container', 'clusters', 'get-credentials', clusterName, '--project', project, '--zone', zone])
      if (res.error) throw new Error(res.error)
      if (res.status !== 0) throw new Error(res.stderr)
      log.debug(`${slug} done`)
    }

    log.info('asking kubectl to rename cluster context...')
    const res = spawnSync('kubectl', ['config', 'rename-context', defaultContextName, desiredName])
    if (res.error) throw new Error(res.error)
    if (res.status !== 0) throw new Error(res.stderr)
    log.info(`${desiredName} configured in kubeconfig`)
  }

  if (currentContext) {
    log.info('restoring kubectl context to original value...')
    try {
      const res = spawnSync('kubectl', ['config', 'use-context', currentContext])
      if (res.error) {
        throw res.error
      }

      if (res.status !== 0) {
        throw new Error(res.stderr)
      }
      log.debug(`${currentContext} done`)
    } catch (err) {
      log.debug(`${currentContext} error!`)
      log.error(err.stack)
      process.exitCode = 1
    }
  }
}

function _readKubeConfig () {
  try {
    const configPath = process.env.KUBECONFIG || path.join(os.homedir(), '.kube', 'config')
    const contents = fs.readFileSync(path.resolve(configPath), { encoding: 'utf8' })
    const config = yaml.safeLoad(contents)
    return config
  } catch (err) {
    return { contexts: [] }
  }
}
