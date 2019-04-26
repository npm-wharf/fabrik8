require('./setup')
const API = require('../src/api')

const events = {
  raise () {},
  emit () {}
}

describe('API', function () {
  const clusterConfig = {
    name: 'description',
    user: 'admin',
    password: 'root',
    version: '1.9.7-gke.6'
  }
  const clusterDetail = {
    user: 'admin',
    password: 'admin',
    masterEndpoint: '192.168.1.1'
  }
  const specificationUrl = 'git://github.com@org/repo'
  const data = {
    token1: 'a',
    token2: 'b'
  }
  const options = {
    version: '1.9'
  }
  const hikaruSpec = {
    ...options,
    ...data
  }
  const HIKARU_AUTH = {
    username: 'admin',
    password: 'admin',
    url: 'https://192.168.1.1'
  }
  const SERVICE_ACCOUNT = {
    totally: 'a',
    service: 'account-json',
    private_key: 'd34db33f',
    client_email: 'my-sa@iam.google.com'
  }

  describe('when initialization fails on cluster provision', function () {
    let fabrik8
    let onExpectation
    let createExpectations
    const hikaru = {
      deployCluster: () => {}
    }
    before(function () {
      onExpectation = sinon.mock('on').thrice()
      createExpectations = sinon.mock('create')
        .withArgs(clusterConfig)
        .once()
        .rejects(new Error('provisioning failed'))
      class Kubeform {
        constructor () {
          this.on = onExpectation
          this.create = createExpectations
        }
      }

      fabrik8 = API(events, Kubeform, hikaru)
    })

    it('should fail to initialize during provisioning', function () {
      return fabrik8.initialize(clusterConfig, specificationUrl, data, options)
        .should.eventually.be.rejectedWith('provisioning failed')
    })

    it('should call on to subscribe to events', function () {
      onExpectation.verify()
    })

    it('should call create', function () {
      createExpectations.verify()
    })

    after(function () {
    })
  })

  describe('when tokens are missing', function () {
    describe('and deploy fails', function () {
      let hMock
      let fabrik8
      let onExpectation
      let createExpectations
      let tokenList
      const hikaru = {
        deployCluster: () => {}
      }
      before(function () {
        onExpectation = sinon.mock('on').thrice()
        createExpectations = sinon.mock('create')
          .withArgs(clusterConfig)
          .once()
          .resolves({ ...clusterDetail })
        class Kubeform {
          constructor () {
            this.on = onExpectation
            this.create = createExpectations
          }
        }
        tokenList = [
          'token1',
          'token2',
          'token3'
        ]
        const err = new Error('tokens are missing')
        err.tokens = tokenList
        hMock = sinon.mock(hikaru)
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, { data:
            {
              ...options,
              ...data,
              masterIP: '192.168.1.1',
              cluster: { ...clusterDetail }
            }
          }, HIKARU_AUTH)
          .once()
          .rejects(err)
        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should fail to initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specificationUrl, data, options)
          .should.eventually.be.rejectedWith('tokens are missing')
      })

      it('should call on to subscribe to events', function () {
        onExpectation.verify()
      })

      it('should call create', function () {
        createExpectations.verify()
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })

      after(function () {
      })
    })

    describe('and deploy succeeds', function () {
      let hMock
      let fabrik8
      let tokenList
      let getData
      let errorList
      let specData
      let clusterInfo
      let onExpectation
      let createExpectations
      const hikaru = {
        deployCluster: () => {}
      }

      before(function () {
        onExpectation = sinon.mock('on').thrice()
        createExpectations = sinon.mock('create')
          .withArgs(clusterConfig)
          .once()
          .resolves({ ...clusterDetail, credentials: SERVICE_ACCOUNT })
        class Kubeform {
          constructor () {
            this.on = onExpectation
            this.create = createExpectations
          }
        }

        tokenList = [
          'token1',
          'token2',
          'token3'
        ]

        specData = {
          token1: 'e',
          token2: 'f',
          token3: 'g'
        }

        const err = new Error('tokens are missing')
        err.tokens = tokenList
        hMock = sinon.mock(hikaru)

        let firstArgs = { data: {
          ...options,
          credentials: SERVICE_ACCOUNT,
          masterIP: '192.168.1.1',
          cluster: { ...clusterDetail, credentials: SERVICE_ACCOUNT }
        } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, firstArgs)
          .once()
          .rejects(err)

        let secondArgs = { data: {
          ...hikaruSpec,
          ...specData,
          credentials: SERVICE_ACCOUNT,
          masterIP: '192.168.1.1',
          cluster: { ...clusterDetail, credentials: SERVICE_ACCOUNT }
        } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, secondArgs)
          .once()
          .resolves({})

        getData = (tokens) => {
          errorList = tokens
          return Promise.resolve(specData)
        }

        let tempSpec = { ...specData, ...options, masterIP: '192.168.1.1', credentials: SERVICE_ACCOUNT }
        clusterInfo = { cluster: { ...clusterDetail, credentials: SERVICE_ACCOUNT }, tokens: tempSpec }
        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specificationUrl, getData, options)
          .should.eventually.eql(clusterInfo)
      })

      it('should have returned missing tokens', function () {
        errorList.should.eql(tokenList)
      })

      it('should call on to subscribe to events', function () {
        onExpectation.verify()
      })

      it('should call create', function () {
        createExpectations.verify()
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })

      after(function () {
      })
    })
  })

  describe('when tokens come from cluster detail', function () {
    let fabrik8
    let tokenList
    let getData
    let errorList
    let specData
    let clusterInfo
    let onCluster
    let onExpectation
    let createExpectations
    const hikaru = {
      deployCluster: () => {}
    }

    before(function () {
      onExpectation = sinon.mock('on').thrice()
      createExpectations = sinon.mock('create')
        .withArgs(clusterConfig)
        .once()
        .resolves({ ...clusterDetail })
      class Kubeform {
        constructor () {
          this.on = onExpectation
          this.create = createExpectations
        }
      }

      tokenList = [
        'token1',
        'token2',
        'token3'
      ]

      specData = {
        token1: 'e',
        token2: 'f',
        token3: 'g',
        ip: '192.168.1.1'
      }

      const err = new Error('tokens are missing')
      err.tokens = tokenList

      onCluster = (tokens, cluster) => {
        tokens.ip = cluster.masterEndpoint
      }

      const firstArgs = {
        ...hikaruSpec,
        cluster: { ...clusterDetail }
      }
      const secondArgs = {
        ...hikaruSpec,
        ...specData,
        cluster: { ...clusterDetail },
        onCluster
      }

      hikaru.deployCluster = sinon.stub()
        .withArgs(specificationUrl, secondArgs)
        .onCall(1)
        .resolves({})
        .withArgs(specificationUrl, firstArgs)
        .onCall(0)
        .rejects(err)

      getData = (tokens) => {
        errorList = tokens
        return Promise.resolve({
          onCluster,
          token1: 'e',
          token2: 'f',
          token3: 'g'
        })
      }

      clusterInfo = {
        cluster: { ...clusterDetail },
        tokens: {
          ...hikaruSpec,
          ...specData,
          ...options,
          masterIP: '192.168.1.1'
        }
      }

      fabrik8 = API(events, Kubeform, hikaru)
    })

    it('should initialize during provisioning', function () {
      return fabrik8.initialize(clusterConfig, specificationUrl, getData, options)
        .should.eventually.eql(clusterInfo)
    })

    it('should have returned missing tokens', function () {
      errorList.should.eql(tokenList)
    })

    it('should call on to subscribe to events', function () {
      onExpectation.verify()
    })

    it('should call create', function () {
      createExpectations.verify()
    })
  })

  describe('when tokens are supplied', function () {
    describe('and deploy fails', function () {
      let hMock
      let fabrik8
      let onExpectation
      let createExpectations
      const hikaru = {
        deployCluster: () => {}
      }

      before(function () {
        onExpectation = sinon.mock('on').thrice()
        createExpectations = sinon.mock('create')
          .withArgs(clusterConfig)
          .once()
          .resolves({ ...clusterDetail })
        class Kubeform {
          constructor () {
            this.on = onExpectation
            this.create = createExpectations
          }
        }

        const err = new Error('something went terribly wrong')
        hMock = sinon.mock(hikaru)
        const newSpec = { data: {
          ...hikaruSpec,
          ...data,
          masterIP: '192.168.1.1',
          cluster: { ...clusterDetail } } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, newSpec)
          .once()
          .rejects(err)

        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should fail to initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specificationUrl, data, options)
          .should.eventually.be.rejectedWith('something went terribly wrong')
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })

      after(function () {
      })
    })

    describe('and deploy succeeds', function () {
      let hMock
      let fabrik8
      let newSpec
      let specData
      let clusterInfo
      let onCalls = []
      let createExpectations
      const hikaru = {
        deployCluster: () => {}
      }

      before(function () {
        createExpectations = sinon.mock('create')
          .withArgs(clusterConfig)
          .once()
          .resolves({ ...clusterDetail })
        class Kubeform {
          constructor () {
            this.create = createExpectations
          }
          on (name, cb) {
            onCalls.push(name)
            cb()
          }
        }

        specData = {
          token1: 'e',
          token2: 'f',
          token3: 'g'
        }
        hMock = sinon.mock(hikaru)

        newSpec = { data: {
          ...specData,
          masterIP: '192.168.1.1',
          cluster: { ...clusterDetail }
        } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, newSpec)
          .once()
          .resolves({})

        clusterInfo = {
          cluster: { ...clusterDetail },
          tokens: {
            ...specData,
            masterIP: '192.168.1.1'
          }
        }

        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specificationUrl, specData)
          .should.eventually.eql(clusterInfo)
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
        onCalls.should.eql([
          'prerequisites-created',
          'bucket-permissions-set',
          'cluster-initialized'
        ])
      })
    })
  })
})
