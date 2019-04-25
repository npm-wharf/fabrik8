require('./setup')
const createReconciler = require('../src/reconcile')

const SERVICE_ACCOUNTS = [{
  totally: 'a',
  service: 'account-json',
  private_key: 'd34db33f',
  client_email: 'my-sa@iam.google.com'
},
{
  totally: 'a',
  service: 'account-json',
  private_key: 'd34db33f',
  client_email: 'my-sa2@iam.google.com'
}]
const CLUSTER_DEFAULTS = {
  worker: {
    cores: 2,
    memory: '13GB',
    count: 3,
    min: 3,
    max: 6,
    storage: {
      persistent: '160GB'
    }
  },

  flags: {
    alphaFeatures: false,
    maintenanceWindow: '08:00:00Z',
    networkPolicy: true
  },
  manager: {
    distributed: false
  },
  managers: 1
}
const TOKEN_DEFAULTS = {
  nginx_upstream1: 'frontdoor.svc.cluster.local:5000',
  nginx_upstream2: 'rewrite.svc.cluster.local:5001'
}
const DEFAULT_PROPS = {
  billingAccount: '234523452345',
  organizationId: '123412341234',
  user: 'admin',
  version: '1.10.11-gke.1',
  basicAuth: true,
  zones: ['us-central1-a']
}
const UUID = '12341234-1234-1234-1234-123412341234'

describe('reconciler', () => {
  describe('processArgv', () => {
    describe('with full defaults', () => {
      const DEFAULTS = {
        allowedDomains: ['npme.io', 'google.io'],
        projectPrefix: 'project-',
        common: { ...DEFAULT_PROPS },
        credentials: SERVICE_ACCOUNTS[0].client_email,

        serviceAccounts: {
          service_accout: SERVICE_ACCOUNTS[1].client_email,
          credentials: SERVICE_ACCOUNTS[0].client_email
        },
        tokens: { ...TOKEN_DEFAULTS },
        cluster: { ...CLUSTER_DEFAULTS }
      }
      let processArgv

      before(() => {
        processArgv = createReconciler(
          {
            async getCommon () {
              return DEFAULTS
            },
            async getServiceAccount (email) {
              return SERVICE_ACCOUNTS.find(json => json.client_email === email)
            }
          },
          {
            v4 () {
              return UUID
            }
          }
        ).processArgv
      })

      it('should process argv and get options', async () => {
        const result = await processArgv({ name: 'mycluster', specification: '.' })
        const expectedCommon = {
          ...DEFAULTS.common,
          name: 'mycluster',
          url: 'mycluster.npme.io',
          domain: 'npme.io',
          projectId: 'project-mycluster',
          environment: 'production',
          user: 'admin',
          password: UUID
        }
        result.should.eql({
          specification: '.',
          kubeformSettings: {
            ...CLUSTER_DEFAULTS,
            ...expectedCommon,
            credentials: SERVICE_ACCOUNTS[0]
          },
          hikaruSettings: {
            ...TOKEN_DEFAULTS,
            ...expectedCommon,
            awsZone: expectedCommon.domain,
            subdomain: expectedCommon.name,
            dashboardAdmin: 'admin',
            dashboardPass: '12341234-1234-1234-1234-123412341234'
          }
        })
      })
    })

    describe('with less defaults', () => {
      const DEFAULTS = {
        allowedDomains: ['npme.io', 'google.io'],
        ...DEFAULT_PROPS,
        credentials: SERVICE_ACCOUNTS[0].client_email,

        serviceAccounts: {
          service_accout: 'my-sa2@iam.google.com',
          credentials: SERVICE_ACCOUNTS[0].client_email
        },
        cluster: { ...CLUSTER_DEFAULTS }
      }
      let processArgv

      before(() => {
        processArgv = createReconciler(
          {
            async getCommon () {
              return DEFAULTS
            },
            async getServiceAccount (email) {
              return SERVICE_ACCOUNTS.find(json => json.client_email === email)
            }
          },
          {
            v4 () {
              return UUID
            }
          }
        ).processArgv
      })

      it('should process argv and get options', async () => {
        const result = await processArgv({ name: 'mycluster', specification: '.' })
        const expectedCommon = {
          name: 'mycluster',
          url: 'mycluster.npme.io',
          domain: 'npme.io',
          projectId: 'mycluster',
          environment: 'production',
          user: 'admin',
          password: UUID
        }
        result.should.eql({
          specification: '.',
          kubeformSettings: {
            ...CLUSTER_DEFAULTS,
            ...expectedCommon,
            credentials: SERVICE_ACCOUNTS[0]
          },
          hikaruSettings: {
            ...expectedCommon,
            awsZone: expectedCommon.domain,
            subdomain: expectedCommon.name,
            dashboardAdmin: 'admin',
            dashboardPass: '12341234-1234-1234-1234-123412341234'
          }
        })
      })
    })

    describe('with existing cluster data', () => {
      const DEFAULTS = {
        allowedDomains: ['npme.io', 'google.io'],
        projectPrefix: 'project-',
        ...DEFAULT_PROPS,
        credentials: SERVICE_ACCOUNTS[0].client_email,
        applicationCredentials: SERVICE_ACCOUNTS[0].client_email,

        serviceAccounts: {
          service_accout: 'my-sa2@iam.google.com',
          credentials: SERVICE_ACCOUNTS[0].client_email,
          applicationCredentials: SERVICE_ACCOUNTS[0].client_email
        },
        tokens: { ...TOKEN_DEFAULTS },
        cluster: { ...CLUSTER_DEFAULTS }
      }
      const COMMON = {
        name: 'mycluster',
        url: 'mycluster.npme.io',
        domain: 'npme.io',
        projectId: 'project-mycluster',
        environment: 'production',
        user: 'admin',
        password: UUID
      }
      const STORED = {
        specification: '.',
        cluster: {
          ...CLUSTER_DEFAULTS,
          ...COMMON,
          credentials: SERVICE_ACCOUNTS[0].client_email
        },
        tokens: {
          ...TOKEN_DEFAULTS,
          ...COMMON,
          awsZone: COMMON.domain,
          subdomain: COMMON.name,
          dashboardAdmin: 'admin',
          dashboardPass: '12341234-1234-1234-1234-123412341234'
        },
        credentials: SERVICE_ACCOUNTS[0].client_email
      }
      let processArgv

      before(() => {
        processArgv = createReconciler(
          {
            async getCommon () {
              return DEFAULTS
            },
            async getServiceAccount (email) {
              return SERVICE_ACCOUNTS.find(json => json.client_email === email)
            },
            async getCluster (name) {
              name.should.equal('mycluster')
              return { secretProps: STORED }
            }
          },
          {
            v4 () {
              return UUID
            }
          }
        ).processArgv
      })

      it('should process argv and get options', async () => {
        const result = await processArgv({ name: 'mycluster', specification: '.' })

        result.should.eql({
          specification: STORED.specification,
          kubeformSettings: {
            ...STORED.cluster,
            credentials: SERVICE_ACCOUNTS[0],
            applicationCredentials: SERVICE_ACCOUNTS[0]
          },
          hikaruSettings: {
            ...STORED.tokens
          }
        })
      })
    })
  })

  describe('_reconcileName', () => {
    let _reconcileName

    before(() => {
      _reconcileName = createReconciler({})._reconcileName
    })

    it('should process an url', () => {
      const result = _reconcileName({ url: 'mycluster.npme.io' })
      result.should.eql({
        name: 'mycluster',
        domain: 'npme.io',
        url: 'mycluster.npme.io'
      })
    })

    it('should balk on bad domains', () => {
      (() => _reconcileName({ url: 'mycluster.google.com' })).should.throw()
    })

    it('should allow overriding allowed domains', () => {
      const result = _reconcileName({ url: 'mycluster.google.io' }, ['google.io'])
      result.should.eql({
        name: 'mycluster',
        domain: 'google.io',
        url: 'mycluster.google.io'
      })
    })

    it('should balk on bad domains (overridden)', () => {
      (() => _reconcileName({ url: 'mycluster.npme.io' }, ['google.io'])).should.throw()
    })

    it('should work with just a name', () => {
      const result = _reconcileName({ name: 'mycluster' }, ['google.io'])
      result.should.eql({
        name: 'mycluster',
        domain: 'google.io',
        url: 'mycluster.google.io'
      })
    })

    it('should work with a name and domain', () => {
      const result = _reconcileName({ name: 'mycluster', domain: 'npme.io' }, ['google.io', 'npme.io'])
      result.should.eql({
        name: 'mycluster',
        domain: 'npme.io',
        url: 'mycluster.npme.io'
      })
    })

    it('should allow a name unrelated to the domain', () => {
      const result = _reconcileName({
        name: 'mycluster',
        url: 'asdfasdf.npme.io' })
      result.should.eql({
        name: 'mycluster',
        domain: 'npme.io',
        url: 'asdfasdf.npme.io'
      })
    })

    it('should throw if nothing relevant is passed', () => {
      (() => _reconcileName({ foo: 'bar' })).should.throw()
    })
  })

  describe('_yargsOverrides', () => {
    let _yargsOverrides

    before(() => {
      _yargsOverrides = createReconciler({})._yargsOverrides
    })

    it('should override deep properties', async () => {
      const input = {
        common: {
          a: 1,
          b: 1,
          c: {
            d: 1
          }
        },
        tokens: {
          e: 1
        },
        cluster: {
          f: 1,
          g: {
            h: 1
          }
        }
      }
      const argv = {
        'arg-a': 2,
        'arg-tokens.e': 2,
        'arg-cluster.g.h': 2
      }
      const result = _yargsOverrides(input, argv)

      result.should.eql({
        common: {
          a: 2,
          b: 1,
          c: {
            d: 1
          }
        },
        tokens: {
          e: 2
        },
        cluster: {
          f: 1,
          g: {
            h: 2
          }
        }
      })
    })

    it('should ignore non-existend objects', async () => {
      const result = _yargsOverrides({}, {
        'arg-foo.bar': 1
      })

      result.should.eql({})
    })
  })

  describe('_reifyServiceAccounts', () => {
    let _reifyServiceAccounts

    before(() => {
      _reifyServiceAccounts = createReconciler({
        async getServiceAccount (email) {
          return SERVICE_ACCOUNTS.find(json => json.client_email === email)
        }
      })._reifyServiceAccounts
    })

    it('should turn service accounts into full jsons and insert them into the options', async () => {
      const result = await _reifyServiceAccounts({
        serviceAccounts: {
          my_sa: SERVICE_ACCOUNTS[0].client_email,
          auth: SERVICE_ACCOUNTS[1].client_email
        },
        other: 'bar',

        common: {
          auth: SERVICE_ACCOUNTS[1].client_email
        },

        auth: SERVICE_ACCOUNTS[1].client_email,
        tokens: {
          my_sa: SERVICE_ACCOUNTS[0].client_email,
          other: 'foo'
        }
      })

      result.should.eql({
        other: 'bar',
        auth: JSON.stringify(SERVICE_ACCOUNTS[1]),
        common: {
          auth: JSON.stringify(SERVICE_ACCOUNTS[1])
        },
        tokens: {
          my_sa: JSON.stringify(SERVICE_ACCOUNTS[0]),
          other: 'foo'
        }
      })
    })

    it('should noop if no serviceAccounts in tokens', async () => {
      const result = await _reifyServiceAccounts({
        foo: 'bar',
        serviceAccounts: { my_sa: 'my-sa@iam.google.com' }
      })

      result.should.eql({ foo: 'bar' })
    })

    it('should noop if no serviceAccounts', async () => {
      const result = await _reifyServiceAccounts({ foo: 'bar' })
      result.should.eql({ foo: 'bar' })
    })
  })

  describe('storeResult', () => {
    describe('with a bunch of info', () => {
      let storeResult

      const serviceAccountsCalls = []
      const registerClusterCalls = []

      before(() => {
        storeResult = createReconciler(
          {
            async addServiceAccount (sa) {
              serviceAccountsCalls.push(sa)
            },
            async registerCluster (...args) {
              registerClusterCalls.push(args)
            }
          }
        ).storeResult
      })

      it('should work', async () => {
        const common = {
          name: 'newcluster',
          environment: 'production'
        }
        await storeResult({
          cluster: {
            ...CLUSTER_DEFAULTS,
            ...common,
            auth: JSON.stringify(SERVICE_ACCOUNTS[0])
          },
          tokens: {
            credentials: SERVICE_ACCOUNTS[1],
            ...TOKEN_DEFAULTS,
            ...common
          }
        })

        serviceAccountsCalls.should.eql([SERVICE_ACCOUNTS[0], SERVICE_ACCOUNTS[1]])
        registerClusterCalls.should.eql([
          [
            'newcluster',
            {},
            {
              serviceAccounts: {
                auth: SERVICE_ACCOUNTS[0].client_email,
                credentials: SERVICE_ACCOUNTS[1].client_email
              },
              cluster: {
                auth: SERVICE_ACCOUNTS[0].client_email,
                ...CLUSTER_DEFAULTS,
                ...common
              },
              tokens: {
                ...TOKEN_DEFAULTS,
                ...common,
                credentials: SERVICE_ACCOUNTS[1].client_email
              }
            },
            ['production']
          ]
        ])
      })
    })
  })
})
