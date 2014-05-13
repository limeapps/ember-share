var Duplex, backend, Primus, PrimusCluster, connect, livedb, livedbMongo, port, share, sharejs, webserver;

Duplex = require('stream').Duplex;

Primus = require('primus');

connect = require('connect');

livedb = require('livedb');

livedbMongo = require('livedb-mongo');

sharejs = require('share');

module.exports = function(grunt) {
	grunt.registerTask('share', 'Start a ShareJS server', function() {
		webserver =  require('http').createServer(connect(connect.static(__dirname + "/.."),connect.static(__dirname + "/dist"), connect.static(sharejs.scriptsDir)));
		webserver.on('error',function(err){
			console.log(err);
		});
		backend = livedb.client(livedbMongo('localhost:27017/test?auto_reconnect', {
			safe: false
		}));

		share = sharejs.server.createClient({
			backend: backend
		});
		var primus = new Primus(webserver,{
			transformer : 'engine.io'
		});

		primus.on('connection', function (spark) {
			var stream;
			stream = new Duplex({
				objectMode: true
			});
			stream._write = function(chunk, encoding, callback) {
				// console.log('s->c ', chunk);
				if (spark.state !== 'closed') {
					spark.write(chunk);
				}
				return callback();
			};
			stream._read = function() {};
			stream.headers = spark.headers;
			stream.remoteAddress = stream.address;
			spark.on('data', function(data) {
				// console.log('c->s ', data);
				return stream.push(data);
			});
			stream.on('error', function(msg) {
				return spark.emit('error',msg);
			});
			spark.on('end', function(reason) {
				stream.emit('close');
				stream.emit('end');
				return stream.end();
			});
			return share.listen(stream);
		});

		primus.save(__dirname +'/../test/vendor/primus.js');
		webserver.listen(9999);
	});
};