const EventEmitter = require('events')
const API = require('./api')
const kubeform = require('@npm-wharf/kubeform')
const hikaru = require('@npm-wharf/hikaru')
const setupKubectx = require('./kubectx')

const events = new EventEmitter()
const fabricator = API(events, kubeform, hikaru, setupKubectx)

module.exports = fabricator
