#!/usr/bin/env node

const fabricator = require('../lib/index')
const bistre = require('bistre')()
require('dotenv').config()

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(require('../lib/commands/init')(fabricator, bistre))
  .command(require('../lib/commands/create')(fabricator, bistre))
  .demandCommand(1, 'A command is required.')
  .help()
  .version()
  .argv
