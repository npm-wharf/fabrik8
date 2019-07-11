const _ = require('fauxdash')
const bole = require('bole')
const inquire = require('./inquire')
const fs = require('fs')
const path = require('path')
const log = bole('fabrik8')
const yaml = require('js-yaml')

function build () {
  return {
    auth: {
      alias: 'a',
      description: 'the authentication file to use when authenticating with the cloud provider',
      required: true,
      default: process.env.GOOGLE_APPLICATION_CREDENTIALS
    },
    spec: {
      alias: 'm',
      required: true,
      description: 'the path or URL to the mcgonagall specification'
    },
    data: {
      alias: 'f',
      description: 'the path to the data file used to supply token values in the specification'
    },
    provider: {
      alias: 'p',
      description: 'the cloud provider to use, defaults to KUBE_SERVICE environment variable',
      default: process.env.KUBE_SERVICE || 'GKE'
    },
    verbose: {
      description: 'output verbose logging (status check output for hikaru)',
      default: false,
      boolean: true
    },
    apiVersion: {
      alias: 'v',
      describe: 'kubernetes cluster API version',
      default: '1.9'
    },
    scale: {
      alias: 's',
      describe: 'choose a scale factor to apply (if available) for the cluster',
      type: 'string'
    },
    tokens: {
      alias: 't',
      describe: 'where to write out all data used to populate the specification',
      default: `./data-${Date.now()}.yml`
    },
    saveDiffs: {
      alias: 'd',
      describe: 'if deploying a cluster over an existing one, save any differences that exist between existing resources and deployed ones in a `./diff` folder',
      default: false,
      boolean: true
    },
    output: {
      alias: 'o',
      default: `./cluster-${Date.now()}.json`
    }
  }
}

async function handle (fabricator, debugOut, argv) {
  const options = {}
  if (argv.apiVersion) {
    options.version = argv.apiVersion
  }
  if (argv.auth) {
    process.env.GOOGLE_APPLICATION_CREDENTIALS = argv.auth
  }
  if (argv.data) {
    options.data = inquire.loadTokens(argv.data)
  }
  if (argv.spec && !argv.data) {
    options.data = inquire.loadTokens(path.join(argv.spec, 'data.yml'))
  }
  if (argv.provider) {
    process.env.KUBE_SERVICE = argv.provider
  }
  if (argv.saveDiffs) {
    options.saveDiffs = true
  }
  if (argv.scale) {
    options.scale = argv.scale
  }
  if (argv.token) {
    options.token = argv.token
  }
  if (argv.url) {
    options.url = argv.url
  }

  bole.output({
    level: argv.verbose ? 'debug' : 'info',
    stream: debugOut
  })

  const clusterSpec = inquire.loadTokens(argv.source)
  try {
    const result = await fabricator.initialize(clusterSpec, argv.spec, options.data, options)
    writeOutput(result, argv)
  } catch (e) {
    if (e.tokens) {
      const missing = await inquire.acquireTokens(e.tokens)
      const complete = _.merge(options.data, missing)
      try {
        const final = await fabricator.initialize(clusterSpec, argv.spec, complete, options)
        writeOutput(final, argv)
      } catch (e) {
        log.error(`fabrication failed with error: ${e.message}`)
        process.exit(100)
      }
    } else {
      log.error(`fabrication failed with error: ${e.message}`)
      process.exit(100)
    }
  }
}

function writeOutput (result, argv) {
  if (argv.tokens) {
    const tokenPath = path.resolve(argv.tokens)
    fs.writeFileSync(
      tokenPath,
      yaml.dump(
        result.specData.data,
        {
          skipInvalid: true,
          sortKeys: true,
          noCompatMode: true
        }
      ),
      { encoding: 'utf8' }
    )
    log.info(`specification data written to '${tokenPath}'`)
  }
  const outputPath = path.resolve(argv.output)
  fs.writeFileSync(
    outputPath,
    JSON.stringify(result, null, 2),
    { encoding: 'utf8' }
  )
  log.info(`cluster details written to '${outputPath}'`)
}

module.exports = function (fabricator, debugOut) {
  return {
    command: 'init <source> [options]',
    desc: '[DEPRECATED, use `create`] performs full provisioning of a Kubernetes cluster and deployment of software',
    builder: build(),
    handler: handle.bind(null, fabricator, debugOut)
  }
}
