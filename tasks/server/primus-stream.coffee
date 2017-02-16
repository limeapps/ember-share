Duplex = require('stream').Duplex


module.exports = (spark) ->
	stream = new Duplex objectMode: true

	stream._write = (chunk, encoding, callback) ->
		if spark.state != 'closed'
			spark.write chunk
		callback()

	stream._read = ->

	stream.headers = spark.headers
	stream.remoteAddress = stream.address
	spark.on 'data', (data) -> stream.push JSON.parse data
	stream.on 'error', (msg) -> spark.emit 'error', msg
	spark.on 'end', (reason) ->
		stream.emit 'close'
		stream.emit 'end'
		stream.end()

	stream
