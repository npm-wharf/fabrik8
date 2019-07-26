const createInfoClient = require('@npm-wharf/cluster-info-client')
const { setMaintenanceWindow, setMaintenanceTime, getMaintenanceTime } = require('../../lib/maintenance-window')
const container = require('@google-cloud/container')
const createReconciler = require('../../lib/reconcile')
const bole = require('bole')
const log = bole('fabrik8')
const fs = require('fs')

const fabricator = require('../../lib')
const bistre = require('bistre')()

exports.command = 'create'
exports.desc = 'performs full provisioning of a Kubernetes cluster and deployment of software.\n' +
'It will fetch defaults from a configured Vault server, and store results in Vault.\n' +
'Defaults can be overridden as extra yargs arguments, e.g.:\n\n' +
'--arg-organizationId 1234567890 or --arg-cluster.worker.memory 26GB'
exports.builder = function (yargs) {
  return yargs
  .option('url', {
    description: 'the url of the cluster you wish to create, e.g. `mycluster.example.com`',
    alias: 'u'
  })
  .option('name', {
    description: 'the name, or general identifier of the cluster.  Can be inferred from the url',
    alias: ['n']
  })
  .option('slug', {
    description: 'the general identifier of the cluster.  Can be inferred from the url.  ' +
    'If explicitly passed and the cluster already exists, the existing cluster config will be used with no modifications.',
    alias: ['s']
  })
  .option('clusterName', {
    desription: 'the name of the cluster in GKE'
  })
  .option('domain', {
    description: 'the subdomain of the cluster.  Can be inferred from the url'
  })
  .option('projectId', {
    description: 'the name of the gke project to use.  Can be inferred from the cluster name or slug'
  })
  .option('environment', {
    description: 'the environment of the cluster, e.g. development, production',
    default: 'production'
  })
  .option('zone', {
    description: 'the GCS zone to create the cluster in',
    coerce (input) {
      try {
        var result = JSON.parse(input)
      } catch (e) {}
      if (result) return result
      return input.split(',')
    }
  })
  .option('specification', {
    alias: ['m', 'spec'],
    required: true,
    description: 'the path or URL to the mcgonagall specification'
  })
  .option('output', {
    alias: 'o',
    description: 'the file to which to write cluster data, for debugging purposes'
  })
  .option('provider', {
    description: 'the cloud provider to use, defaults to KUBE_SERVICE environment variable',
    default: process.env.KUBE_SERVICE || 'GKE'
  })
}

exports.handler = function (argv) {
  main(argv)
    .catch(err => {
      console.error(err.stack)
      process.exit(1)
    })
}

async function main (argv) {
  bistre.pipe(process.stdout)
  bole.output({
    level: argv.verbose ? 'debug' : 'info',
    stream: bistre
  })
  // fetch info from vault
  const {
    vaultHost,
    vaultToken,
    vaultRoleId,
    vaultSecretId
  } = argv
  const hasVaultAuth = vaultToken || (vaultRoleId && vaultSecretId)
  if (!vaultHost || !hasVaultAuth) {
    throw new Error('Invalid configuration for cluster-info Vault.')
  }

  const clusterInfo = createInfoClient({ vaultToken, vaultHost, vaultRoleId, vaultSecretId })
  const { maintenanceWindows } = await clusterInfo.getCommon()
  const { processArgv, storeResult } = createReconciler(clusterInfo)

  // reconcile options with argv
  const { kubeformSettings, hikaruSettings, specification } = await processArgv(argv)

  await _storeResult({
    cluster: kubeformSettings,
    tokens: hikaruSettings,
    specification
  })

  const onCluster = async (tokens, cluster) => {
    await _storeResult({
      cluster,
      tokens,
      specification
    })

    // make sure the cluster has a PX00 maintenance window channel, and the
    // maintenance startTime is correct
    const gkeClient = new container.v1.ClusterManagerClient({
      credentials: cluster.applicationCredentials
    })
    const { channels } = await clusterInfo.getCluster(cluster.slug)
    const win = channels.find(c => c.match(/^P\d{3}/))
    log.debug(`cluster is in ${win} maintenance channel`)
    if (win) {
      const existingTime = getMaintenanceTime(gkeClient, cluster)
      log.info('ensuring maintenance window startTime is correct..')
      if (maintenanceWindows[win].startTime === existingTime) return
      return setMaintenanceTime(gkeClient, cluster, maintenanceWindows[win].startTime)
    }
    const windowChannel = await setMaintenanceWindow(gkeClient, maintenanceWindows, cluster)
    await clusterInfo.addClusterToChannel(cluster.slug, windowChannel)
  }

  try {
    var resultOpts = await fabricator.initialize(kubeformSettings, specification, hikaruSettings, { onCluster })
  } catch (err) {
    if (err.tokens) {
      console.error(`missing tokens: ${err.tokens.sort().join()}`)
    }
    throw err
  }

  await _storeResult({ ...resultOpts, specification })

  clusterInfo.close()

  log.info('cluster deployment successful!')

  async function _storeResult (obj) {
    await storeResult(obj)
    if (argv.output) {
      fs.writeFileSync(argv.output, JSON.stringify(obj, null, 2))
    }
  }
}
