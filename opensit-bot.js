const Twitter = require('twitter');
const yargs = require('yargs')
const sessions = require('./sessions.js')

// check README.md for instructions how to setup .env file.
require('dotenv').config();

// setup script and CLI options
yargs.version('1.0')

yargs.command({
  command: 'tweet',
  describe: 'tweet an opensit session',
  builder: {
    sit: {
      alias: 's',
      describe: 'filter by SIT',
      demandOption: false,
      type: 'string'
    },
    author: {
      alias: 'a',
      describe: 'filter by author',
      demandOption: false,
      type: 'string'
    }
  },
  handler: function(argv) {
    console.log('tweeting', argv)
    // get session
    // tweet session
    // flag session as tweeted
    const data = sessions.getBySpeaker(argv.author)
    // .then??
    console.log('data')
  }
})

yargs.command({
  command: 'init',
  describe: 'initialise session repository',
  handler: function(argv) {
    console.log('init', argv)
    const data = sessions.getAllSessions()
    console.log(data)
  }
})

yargs.parse()

