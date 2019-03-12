require('./setup')
const fount = require('fount')
const API = require('../src/api')

const hikaru = {
  deployCluster: () => {}
}

const events = {
  raise: () => {}
}

describe('API', function () {
  let clusterConfig
  let clusterDetail
  let hikaruSpec
  let specification
  let data
  let options
  let hikaruConfig

  before(function () {
    clusterConfig = {
      name: 'description',
      user: 'admin',
      password: 'root',
      version: '1.9.7-gke.6'
    }
    specification = 'git://github.com@org/repo'
    data = {
      token1: 'a',
      token2: 'b'
    }
    options = {
      version: '1.9'
    }

    clusterDetail = {
      user: 'admin',
      password: 'admin',
      masterEndpoint: '192.168.1.1'
    }

    hikaruSpec = Object.assign({}, options, { data })
    hikaruConfig = {}
    fount.register('config', hikaruConfig)
  })

  describe('when initialization fails on cluster provision', function () {
    let fabrik8
    let onExpectation
    let createExpectations
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
      return fabrik8.initialize(clusterConfig, specification, data, options)
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
          .withArgs(specification, hikaruSpec)
          .once()
          .rejects(err)
        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should fail to initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specification, data, options)
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
          .withArgs(specification, firstArgs)
          .once()
          .rejects(err)

        let secondArgs = Object.assign({}, hikaruSpec, { data: specData })
        secondArgs.data.cluster = clusterDetail

        hMock.expects('deployCluster')
          .withArgs(specification, secondArgs)
          .once()
          .resolves({})

        getData = (tokens) => {
          errorList = tokens
          return Promise.resolve(specData)
        }

        let tempSpec = Object.assign({}, { data: specData }, options)
        clusterInfo = Object.assign({}, clusterDetail, { specData: tempSpec })
        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specification, getData, options)
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
    let hMock
    let fabrik8
    let tokenList
    let getData
    let errorList
    let specData
    let clusterInfo
    let onCluster
    let onExpectation
    let createExpectations

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
      hMock = sinon.mock(hikaru)

      onCluster = (opts, cluster) => {
        opts.ip = cluster.masterEndpoint
      }

      const firstArgs = Object.assign(
        {},
        hikaruSpec,
        {
          data: { cluster: clusterDetail },
          onCluster: onCluster
        },
        { onCluster }
      )
      firstArgs.data.cluster = clusterDetail
      console.log('first', firstArgs)
      hMock.expects('deployCluster')
        .withArgs(specification, firstArgs)
        .once()
        .rejects(err)

      const secondArgs = Object.assign({}, hikaruSpec, { data: specData }, { onCluster })
      secondArgs.data.cluster = clusterDetail
      console.log('second', secondArgs)
      hMock.expects('deployCluster')
        .withArgs(specification, secondArgs)
        .once()
        .resolves({})

      getData = (tokens) => {
        errorList = tokens
        return Promise.resolve({
          onCluster,
          token1: 'e',
          token2: 'f',
          token3: 'g'
        })
      }

      let tempSpec = Object.assign({}, specData, options, { onCluster })
      clusterInfo = Object.assign({}, clusterDetail, { specData: tempSpec })

      fabrik8 = API(events, Kubeform, hikaru)
    })

    it('should initialize during provisioning', function () {
      return fabrik8.initialize(clusterConfig, specification, getData, options)
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
  })

  describe('when tokens are supplied', function () {
    describe('and deploy fails', function () {
      let kfMock
      let hMock
      let fabrik8
      let onExpectation
      let createExpectations

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
        kfMock = sinon.mock(Kubeform)
        kfMock.expects('on')
          .thrice()

        kfMock.expects('create')
          .withArgs(clusterConfig)
          .once()
          .resolves(clusterDetail)

        const err = new Error('something went terribly wrong')
        hMock = sinon.mock(hikaru)
        hMock.expects('deployCluster')
          .withArgs(specification, hikaruSpec)
          .once()
          .rejects(err)

        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should fail to initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specification, data, options)
          .should.eventually.be.rejectedWith('something went terribly wrong')
      })

      it('should call kubeform.create', function () {
        kfMock.verify()
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })

      after(function () {
      })
    })

    describe('and deploy succeeds', function () {
      let kfMock
      let hMock
      let fabrik8
      let newSpec
      let specData
      let clusterInfo
      let onExpectation
      let createExpectations

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
        kfMock = sinon.mock(Kubeform)
        kfMock.expects('on')
          .thrice()

        kfMock.expects('create')
          .withArgs(clusterConfig)
          .once()
          .resolves(clusterDetail)

        specData = {
          token1: 'e',
          token2: 'f',
          token3: 'g'
        }
        hMock = sinon.mock(hikaru)

        newSpec = Object.assign({}, hikaruSpec, specData)
        hMock.expects('deployCluster')
          .withArgs(specification, newSpec)
          .once()
          .resolves({})

        let tempSpec = Object.assign({}, specData, options)
        clusterInfo = Object.assign({}, clusterDetail, { specData: tempSpec })

        fabrik8 = API(events, Kubeform, hikaru)
      })

      it('should initialize during provisioning', function () {
        return fabrik8.initialize(clusterConfig, specification, specData, options)
          .should.eventually.eql(clusterInfo)
      })

      it('it should call kubeform.create', function () {
        kfMock.verify()
      })

      it('should call hikaru.deployCluster', function () {
        hMock.verify()
      })
    })
  })
})
