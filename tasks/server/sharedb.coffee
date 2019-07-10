Primus = require 'primus'
ShareDB = require 'sharedb'
primusStream = require './primus-stream'
browserify = require('browserify')()
uglifyJs = require 'uglify-js'
fs = require 'fs'

module.exports = do ->

  jsDir = __dirname + '/public/'
  primusPath = __dirname + '/public' + '/primus.js'
  shareDbPath = __dirname + '/public' + '/share-client.js'

  primus = null

  createClients: (server) ->

    # shareDb client
    createDirs = (dir) -> fs.mkdirSync dir unless fs.existsSync dir
    createDirs __dirname + '/public'
    createDirs jsDir
    fs.writeFile "#{shareDbPath}-temp", "window.sharedb = require('../../../node_modules/sharedb/lib/client');", 'utf-8'
    browserify.add "#{shareDbPath}-temp"
    browserify.bundle (err, buf) =>
      fs.writeFile shareDbPath, (@minify buf.toString()), 'utf-8'

    # primus client
    primus = new Primus(server, {transformer: 'websockets', parser:'JSON' })
    fs.writeFile primusPath, (@minify primus.library().toString()), 'utf-8'


  init: (server, cb) ->

    @createClients(server)

    shareDb = new ShareDB()

    primus.on 'connection', (spark) ->
      shareDb.listen(primusStream spark)

    shareDb

  minify:(orig_code) ->
    uglifyJs.minify orig_code, fromString: true
      .code
