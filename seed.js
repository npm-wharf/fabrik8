const createClient = require('@npm-wharf/cluster-info-client')
const createVault = require('node-vault')
const path = require('path')
const fs = require('fs')
require('dotenv').config()

async function main () {
  const vaultHost = process.env.VAULT_HOST || 'https://your.vault.server:8200'
  const vaultToken = process.env.VAULT_TOKEN || 's.myVaultToken'
  const vaultPrefix = process.env.VAULT_SECRET_PREFIX || 'kv/'
  const gkeDefaultsPath = process.env.GKE_DEFAULTS_PATH || './gke-common'

  const client = createClient({
    vaultHost,
    vaultToken,
    vaultPrefix
  })

  const vault = createVault({
    endpoint: vaultHost,
    token: vaultToken
  })

  const resourceManagerJson = JSON.parse(fs.readFileSync(`${process.env.HOME}/resource-manager.json`))
  const wombotProdJson = JSON.parse(fs.readFileSync(`${process.env.HOME}/wombot-prod.json`))
  await client.addServiceAccount(resourceManagerJson)
  await client.addServiceAccount(wombotProdJson)

  console.log('service accounts:\n')
  console.log((await client.listServiceAccounts()).join('\n'))

  const exampleGkeCommonData = {
    allowedDomains: ['my-company.net'],
    projectPrefix: 'my-project-',

    // used by both kubeform and hikaru
    common: {
      billingAccount: '123456-123456-123456',
      organizationId: '234523452345',
      user: 'admin',
      version: '1.10.12-gke.14',
      basicAuth: true,
      zones: ['us-central1-a']
    },

    applicationCredentials: 'resource-manager-svc@my-project.iam.gserviceaccount.com',

    serviceAccounts: {
      cluster_sa: 'some-service-account@my-project.iam.gserviceaccount.com',
      applicationCredentials: 'resource-manager-svc@my-project.iam.gserviceaccount.com'
    },

    // used by hikaru
    tokens: {
      awsAccount: 'AASDGHJKASGDJKASGDJ',
      awsSecret: 'asdfghjkasdfgjkasdfhjasdjkhfg',
      awsZone: 'my-company.net',
      bucketACL: 'private',
      dashboardAdmin: 'admin',
      nginx_upstream1: 'frontdoor.npm.svc.cluster.local:5000',
      nginx_upstream2: 'rewrite.npm.svc.cluster.local:5001',
      cluster_sa: 'some-service-account@my-project.iam.gserviceaccount.com'
    },

    // used by kubeform
    cluster: {
      worker: {
        cores: 2,
        memory: '13GB',
        count: 3,
        min: 3,
        max: 6,
        maxPerInstance: 4,
        reserved: true,
        storage: {
          ephemeral: '0GB',
          persistent: '160GB'
        },
        network: {},
        maintenanceWindow: '08:00'
      },

      flags: {
        alphaFeatures: false,
        authedNetworksOnly: false,
        autoRepair: true,
        autoScale: false,
        autoUpgrade: false,
        basicAuth: true,
        clientCert: true,
        includeDashboard: false,
        legacyAuthorization: false,
        loadBalanceHTTP: true,
        maintenanceWindow: '08:00:00Z',
        networkPolicy: true,
        privateCluster: false,
        serviceLogging: false,
        serviceMonitoring: false
      },
      manager: {
        distributed: false,
        network: {}
      },
      managers: 1
    }
  }

  try {
    var gkeCommonData = require(path.join(process.cwd(), gkeDefaultsPath))
  } catch (e) {}

  await vault.write(vaultPrefix + 'data/clusters/common/gke', {
    data: {
      value: JSON.stringify(gkeCommonData || exampleGkeCommonData, null, 2)
    }
  })

  console.log('\nGKE defaults:\n')
  console.log(await client.getCommon())

  client.close()
}

main()
  .then(() => console.log('\nDone.'))
  .catch(err => {
    console.error(err.stack)
    process.exit(1)
  })
