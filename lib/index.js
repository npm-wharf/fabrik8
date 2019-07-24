'use strict'

const API = require('./api')
const kubeform = require('@npm-wharf/kubeform')
const hikaru = require('@npm-wharf/hikaru')
const setupKubectx = require('./kubectx')

const fabricator = API(kubeform, hikaru, setupKubectx)

module.exports = fabricator
