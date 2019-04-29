const createInfoClient = require('@npm-wharf/cluster-info-client')
const createReconciler = require('../reconcile')
const bole = require('bole')

function build () {
  return {
    url: {
      description: 'the url of the cluster you wish to create, e.g. `mycluster.example.com`',
      alias: 'u'
    },
    name: {
      description: 'the name of the cluster.  Can be inferred from the url',
      alias: 'n'
    },
    domain: {
      description: 'the subdomain of the cluster.  Can be inferred from the url'
    },
    projectId: {
      description: 'the name of the gke project to use.  Can be inferred from the cluster name'
    },
    environment: {
      description: 'the environment of the cluster, e.g. development, production',
      default: 'production'
    },
    specification: {
      alias: ['m', 'spec'],
      required: true,
      description: 'the path or URL to the mcgonagall specification'
    },
    verbose: {
      description: 'output verbose logging (status check output for hikaru)',
      default: false,
      boolean: true
    },
    redisUrl: {
      description: 'the url of the redis containing cluster information',
      default: process.env.REDIS_URL || 'redis://localhost:6379'
    },
    vaultHost: {
      description: 'the host of the vault server containing sensitive cluster information, auth data, and defaults',
      default: process.env.VAULT_HOST
    },
    vaultToken: {
      description: 'an auth token for the vault server',
      default: process.env.VAULT_TOKEN
    },
    provider: {
      description: 'the cloud provider to use, defaults to KUBE_SERVICE environment variable',
      default: process.env.KUBE_SERVICE || 'GKE'
    }
  }
}

function handle (fabricator, debugOut, argv) {
  bole.output({
    level: argv.verbose ? 'debug' : 'info',
    stream: debugOut
  })

  main(fabricator, debugOut, argv)
    .catch(err => {
      console.error(err.stack)
      process.exit(1)
    })
}

async function main (fabricator, debugOut, argv) {
  // fetch info from vault
  const {
    redisUrl,
    vaultHost,
    vaultToken
  } = argv
  if (!redisUrl || !vaultHost || !vaultToken) {
    throw new Error('Invalid configuration for cluster-info Vault.')
  }
  const clusterInfo = createInfoClient({ redisUrl, vaultToken, vaultHost })
  const { processArgv, storeResult } = createReconciler(clusterInfo)

  // reconcile options with argv
  const { kubeformSettings, hikaruSettings, specification } = await processArgv(argv)
  // fabrik8

  // console.log(kubeformSettings)
  // console.log(hikaruSettings)
  // console.log(specification)

  await storeResult({
    cluster: kubeformSettings,
    tokens: hikaruSettings,
    specification
  })

  const onCluster = async (tokens, cluster) => {
    await storeResult({
      cluster,
      tokens,
      specification
    })
  }

  try {
    var resultOpts = await fabricator.initialize(kubeformSettings, specification, hikaruSettings, { onCluster })
  } catch (err) {
    if (err.tokens) {
      console.error(`missing tokens: ${err.tokens.sort().join()}`)
    }
    throw err
  }

  await storeResult({ ...resultOpts, specification })

  clusterInfo.close()
}

module.exports = function (fabricator, debugOut) {
  return {
    command: 'create [options]',
    desc: 'performs full provisioning of a Kubernetes cluster and deployment of software.\n' +
          'It will fetch defaults from a configured Vault server, and store results in Vault.\n' +
          'Defaults can be overridden as extra yargs arguments, e.g.:\n\n' +
          '--arg-organizationId 1234567890 or --arg-cluster.worker.memory 26GB',
    builder: build(),
    handler: handle.bind(null, fabricator, debugOut)
  }
}
