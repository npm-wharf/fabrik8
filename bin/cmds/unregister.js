const createInfoClient = require('@npm-wharf/cluster-info-client')
const bistre = require('bistre')()
const bole = require('bole')
const log = bole('fabrik8')

exports.command = 'unregister <clusterName>'
exports.desc = 'unregister a cluster from the cluster info Vault. Does not delete the GKE cluster or any associated resources in GCS.'
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
    clusterName,
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

  log.info(`Removing '${clusterName}'...`)
  try {
    await clusterInfo.unregisterCluster(clusterName)
    log.info(`Removed '${clusterName}'.`)
  } catch (e) {
    log.error(`Unable to remove '${clusterName}'`)
    log.error(e.message)
  }
  clusterInfo.close()
}
