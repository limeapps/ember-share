express = require 'express'
app = express()
shareDb = require './sharedb'
bodyParser = require 'body-parser'

module.exports =
	start: ->

		allowCrossDomain = (req, res, next) ->
			res.header('Access-Control-Allow-Origin', '*')
			res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE')
			res.header('Access-Control-Allow-Headers', 'Content-Type')

			next()

		app.use allowCrossDomain
		app.use bodyParser.json()
		app.use bodyParser.urlencoded extended: true
		app.use express.static __dirname + '/public'

		server = app.listen 3333, ->
			console.log ''
			console.log 'ShareDB OP Tests Webserver Running on port 3333!'
			console.log ''

		share = shareDb.init server
		SDBConnection = share.connect()

		app.post '/op', (req, res) ->
			{id, op, collection} = req.body
			# console.log op
			doc = SDBConnection.get collection, id
			doc.fetch (err) ->
				return res.send errorFetch: err if err?
				try
					doc.submitOp [op], (err) ->

					if err?
						res.send errorSubmit: err
					else
						res.send msg: 'Success'

				catch error
					console.log error
					res.send errors: error
