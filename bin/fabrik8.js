#!/usr/bin/env node

require('dotenv').config()

require('yargs') // eslint-disable-line no-unused-expressions
  .usage('$0 <command> [options]')
  .command(require('./cmds/create'))
  .demandCommand(1, 'A command is required.')
  .help()
  .version()
  .argv
