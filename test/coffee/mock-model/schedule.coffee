# import model from './sdb-model'
model = require './sdb-model'
json = require 'node_modules/ot-json0/lib/json0'
data = require './cson'


module.exports = ->


	model.create

		doc:
			id: 'abcd'
			listeners: {}

			on: (event, fn) ->
				@listeners[event] = [] if (_.isEmpty @listeners[event])
				@listeners[event].push fn

			opsSent: []

			submitOp: (op) ->
				_.forEach @listeners['before op'], (fn) -> fn op, true
				json.apply @data, op
				@opsSent.push op
				_.forEach @listeners['op'], (fn) -> fn op, true

			data: data()
