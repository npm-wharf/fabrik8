require('./setup')
const createReconciler = require('../src/reconcile')

const SERVICE_ACCOUNTS = [{
  totally: 'a',
  service: 'account-json',
  'client_email': 'my-sa@iam.google.com'
},
{
  totally: 'a',
  service: 'account-json',
  'client_email': 'my-sa2@iam.google.com'
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
const TOKEN_DEFAULTS = {}
const DEFAULT_PROPS = {
  billingAccount: '234523452345',
  organizationId: '123412341234',
  user: 'admin',
  version: '1.10.11-gke.1',
  basicAuth: true,
  zones: ['us-central1-a']
}
const DEFAULTS = {
  allowedSubdomains: ['npme.io', 'google.io'],
  projectPrefix: 'project-',
  ...DEFAULT_PROPS,
  credendials: 'my-sa@iam.google.com',

  serviceAccounts: {
    service_accout: 'my-sa2@iam.google.com',
    credendials: 'my-sa@iam.google.com'
  },
  tokens: { ...TOKEN_DEFAULTS },
  cluster: { ...CLUSTER_DEFAULTS }
}

describe('reconciler', () => {
  describe('processArgv', () => {
    let processArgv

    before(() => {
      processArgv = createReconciler({
        async getCommon () {
          return DEFAULTS
        },
        async getServiceAccount (email) {
          return SERVICE_ACCOUNTS.find(json => json.client_email === email)
        }
      }).processArgv
    })

    it('should process argv and get options', (done) => {
      const result = processArgv({ name: 'mycluster', specification: '.' })
      result.should.eql({
        specification: '.',
        cluster: {
          name: 'mycluster',
          ...CLUSTER_DEFAULTS
        }

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
        subdomain: 'npme.io',
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
        subdomain: 'google.io',
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
        subdomain: 'google.io',
        url: 'mycluster.google.io'
      })
    })

    it('should work with a name and subdomain', () => {
      const result = _reconcileName({ name: 'mycluster', subdomain: 'npme.io' }, ['google.io', 'npme.io'])
      result.should.eql({
        name: 'mycluster',
        subdomain: 'npme.io',
        url: 'mycluster.npme.io'
      })
    })

    it('should allow a name unrelated to the domain', () => {
      const result = _reconcileName({
        name: 'mycluster',
        url: 'asdfasdf.npme.io' })
      result.should.eql({
        name: 'mycluster',
        subdomain: 'npme.io',
        url: 'asdfasdf.npme.io'
      })
    })

    it('should throw if nothing relevant is passed', () => {
      (() => _reconcileName({ foo: 'bar' })).should.throw()
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
          my_sa: 'my-sa@iam.google.com',
          auth: 'my-sa2@iam.google.com'
        },
        other: 'bar',

        auth: 'my-sa2@iam.google.com',
        tokens: {
          my_sa: 'my-sa@iam.google.com',
          other: 'foo'
        }
      })

      result.should.eql({
        other: 'bar',
        auth: JSON.stringify(SERVICE_ACCOUNTS[1]),
        tokens: {
          my_sa: JSON.stringify(SERVICE_ACCOUNTS[0]),
          other: 'foo'
        }
      })
    })
  })
})
