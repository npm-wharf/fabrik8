'use strict'

exports.vault = () => ({
  vaultHost: {
    description: 'the host of the vault server containing sensitive cluster information, auth data, and defaults',
    default: process.env.VAULT_HOST
  },
  vaultToken: {
    description: 'an auth token for the vault server',
    default: process.env.VAULT_TOKEN
  },
  vaultRoleId: {
    description: 'an AppRole id token for the vault server',
    default: process.env.VAULT_ROLE_ID
  },
  vaultSecretId: {
    description: 'an AppRole secret id token for the vault server',
    default: process.env.VAULT_SECRET_ID
  },
  vaultSecretPrefix: {
    description: 'the prefix for the KV secrets engine',
    default: process.env.VAULT_SECRET_PREFIX || 'kv/'
  }
})
