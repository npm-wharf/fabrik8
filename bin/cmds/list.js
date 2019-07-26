const createInfoClient = require('@npm-wharf/cluster-info-client')
const bistre = require('bistre')()
const bole = require('bole')
const log = bole('fabrik8')

exports.command = 'list'
exports.desc = 'lists clusters'
exports.builder = function (yargs) {
  return yargs.options({
    channel: {
      alias: 'c',
      description: 'limit results to a given channel'
    }
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
    channel,
    vaultHost,
    vaultToken,
    vaultRoleId,
    vaultSecretId
  } = argv

  const hasVaultAuth = vaultToken || (vaultRoleId && vaultSecretId)
  if (!vaultHost || !hasVaultAuth) {
    throw new Error('Invalid configuration for cluster-info Vault.')
  }

  let list

  const clusterInfo = createInfoClient({ vaultToken, vaultHost, vaultRoleId, vaultSecretId })
  if (channel) {
    list = await clusterInfo.listClustersByChannel(channel)
  } else {
    list = await clusterInfo.listClusters(channel)
  }

  log.info(list.join('\n'))
}
