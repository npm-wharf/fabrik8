require('./setup')
const fount = require('fount')
const API = require('../src/api')

const events = {
  raise: () => {}
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
    data: { ...data }
  }
  let hikaruConfig

  before(function () {
    hikaruConfig = {}
    fount.register('config', hikaruConfig)
  })

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
          .resolves(clusterDetail)
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
          .withArgs(specificationUrl, {
            ...options,
            data: { ...data, cluster: clusterDetail }
          })
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
          .resolves(clusterDetail)
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

        let firstArgs = Object.assign({}, options, { data: { cluster: clusterDetail } })
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, firstArgs)
          .once()
          .rejects(err)

        let secondArgs = { ...hikaruSpec, data: { ...specData, cluster: clusterDetail } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, secondArgs)
          .once()
          .resolves({})

        getData = (tokens) => {
          errorList = tokens
          return Promise.resolve(specData)
        }

        let tempSpec = { data: { ...specData, cluster: clusterDetail }, ...options }
        clusterInfo = Object.assign({}, clusterDetail, { specData: tempSpec })
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
        .resolves(clusterDetail)
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

      onCluster = (opts, cluster) => {
        opts.ip = cluster.masterEndpoint
      }

      const firstArgs = {
        ...hikaruSpec,
        data: {
          cluster: { ...clusterDetail }
        }
      }
      const secondArgs = {
        ...hikaruSpec,
        data: {
          ...specData,
          cluster: { ...clusterDetail }
        },
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
        ...clusterDetail,
        specData: {
          data: {
            ...specData
          },
          ...options
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
          .resolves(clusterDetail)
        class Kubeform {
          constructor () {
            this.on = onExpectation
            this.create = createExpectations
          }
        }

        const err = new Error('something went terribly wrong')
        hMock = sinon.mock(hikaru)
        const newSpec = { ...hikaruSpec, data: { ...data, cluster: clusterDetail } }
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
          .resolves(clusterDetail)
        class Kubeform {
          constructor () {
            this.on = onExpectation
            this.create = createExpectations
          }
        }

        specData = {
          token1: 'e',
          token2: 'f',
          token3: 'g'
        }
        hMock = sinon.mock(hikaru)

        newSpec = { ...hikaruSpec, data: { ...specData, cluster: clusterDetail } }
        hMock.expects('deployCluster')
          .withArgs(specificationUrl, newSpec)
          .once()
          .resolves({})

        let tempSpec = { ...specData, cluster: clusterDetail }
        clusterInfo = {
          ...clusterDetail,
          specData: {
            data: tempSpec,
            ...options
          }
        }

        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specificationUrl, specData, options)
          .should.eventually.eql(clusterInfo)
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })
    })
  })
})
