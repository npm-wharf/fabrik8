const chai = require('chai')
chai.should()
global.expect = chai.expect
chai.use(require('chai-as-promised'))

global.sinon = require('sinon')
chai.use(require('sinon-chai'))
