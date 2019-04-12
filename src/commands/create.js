const createInfoClient = require('@npm-wharf/cluster-info-client')

function build () {
  return {
    url: {
      description: 'the url of the cluster you wish to create',
      alias: 'a',
      required: true
    },
    spec: {
      alias: 'm',
      required: true,
      description: 'the path or URL to the mcgonagall specification'
    },
    projectId: {
      description: 'the name of the gke project to use.  Can be inferred from the url'
    },
    name: {
      description: 'the name of the cluster.  Can be inferred from the url',
      alias: 'n'
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
      alias: 'p',
      description: 'the cloud provider to use, defaults to KUBE_SERVICE environment variable',
      default: process.env.KUBE_SERVICE || 'GKE'
    }
  }
}

async function handle (fabricator, debugOut, argv) {
  // fetch info from vault
  const {
    redisUrl,
    vaultHost,
    vaultToken,
    url,
    name,
    projectId
  } = argv
  if (!redisUrl || !vaultHost || !vaultToken) {
    throw new Error('Invalid configuration for cluster-info Vault.')
  }
  const clusterInfo = createInfoClient({ redisUrl, vaultToken, vaultHost })
  const commonDefaults = await clusterInfo.getCommon()

  // reconcile options with argv
  const { allowedSubdomains } = commonDefaults
  if (allowedSubdomains.some(subd => !url.includes(subd))) {
    throw new Error(`${url} not a subdomain of ${allowedSubdomains.join(', ')}`)
  }


  // fabrik8

  // store results in vault
}

module.exports = function (fabricator, debugOut) {
  return {
    command: 'create [options]',
    desc: 'performs full provisioning of a Kubernetes cluster and deployment of software.\n' +
          'It will fetch defaults from a configured Vault server, and store results in Vault.\n' +
          'Defaults can be overridden as extra yargs arguments, e.g.:\n\n',
          '--zones eu-central-1b',
    builder: build(),
    handler: handle.bind(null, fabricator, debugOut)
  }
}
