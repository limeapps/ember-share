/* global BCSocket:false, sharedb:false */
import { guid, patchShare } from './utils';

var Promise = Ember.RSVP.Promise;
var socketReadyState = [
  'CONNECTING',
  'OPEN',
  'CLOSING',
  'CLOSE'
]

export default Ember.Object.extend(Ember.Evented, {
  socket: null,
  connection: null,

  // port: 3000,
  // url : 'https://qa-e.optibus.co',
  url : window.location.hostname,
  init: function () {

    var store = this;

    this.checkSocket = function () {
      return new Promise(function (resolve, reject) {

          if (store.socket == null) {
            store.one('connectionOpen', resolve);
          }
          else {
            var checkState = function (state, cb) {
              switch(state) {
                case 'connected':
                  return resolve();
                case 'connecting':
                  return store.connection.once('connected', resolve);
                default: cb(state)
              }
            }
            var checkStateFail = function (state) {
              switch(state) {
                case 'closed':
                  return reject('connection closed');
                case 'disconnected':
                  return reject('connection disconnected');
                case 'stopped':
                  return reject('connection closing');
              }
            }
            var failed = false
            checkState(store.connection.state, function(state){
              if (failed)
                checkStateFail(state)
              else
                Ember.run.next (this, function () {
                  failed = true;
                  checkState(store.connection.state, checkStateFail)
                })
            })


        }
      });
    }

    this.checkConnection = function () {
      return new Promise(function (resolve, reject) {
        return store.checkSocket()
          .then(function () {
            return resolve()
            if (store.authentication != null && store.isAuthenticated != null) {
              if (store.isAuthenticated) return resolve();
              if (store.isAuthenticating) return store.one('authenticated', resolve);
              if (!store.isAuthenticated) return store.authentication(store.connection.id)
              // if (!store.isAuthenticating) return reject()
              return reject('could not authenticat')
            } else
              return resolve()
          })
          .catch(function (err) {
            return reject(err)
          })
      });
    };

    this.cache = {};
    if(!window.sharedb)
    {
      throw new Error("sharedb client not included");
    }
    if (window.BCSocket === undefined && window.Primus === undefined) {
      throw new Error("No Socket library included");
    }
    if ( this.beforeConnect )
    {
      this.beforeConnect()
      .then(function(){
        store.trigger('connect');
      });
    }
    else
    {
      store.trigger('connect');
    }
  },
  doConnect : function(options){
    var store = this;

    if(window.BCSocket)
    {
      this.setProperties(options);
      this.socket = new BCSocket(this.get('url'), {reconnect: true});
      this.socket.onerror = function(err){
        store.trigger('connectionError', [err]);

      };
      this.socket.onopen = function(){
        store.trigger('connectionOpen');

      };
      this.socket.onclose = function(){
        store.trigger('connectionEnd');
      };
    }
    else if(window.Primus)
    {
      patchShare();
      this.setProperties(options);
      var hostname = this.get('url');
      if (this.get('protocol'))
        hostname = this.get('protocol') + '://' + hostname;
      if (this.get("port"))
        hostname += ':' + this.get('port');
      this.socket = new Primus(hostname);
      // console.log('connection starting');

      this.socket.on('error', function error(err) {
        store.trigger('connectionError', [err]);
      });
      this.socket.on('open', function() {
        // console.log('connection open');
        store.trigger('connectionOpen');
      });
      this.socket.on('end', function() {
        store.trigger('connectionEnd');
      });
      this.socket.on('close', function() {
        store.trigger('connectionEnd');
      });
    }
    else {
      throw new Error("No Socket library included");
    }
    var oldHandleMessage = sharedb.Connection.prototype.handleMessage;
    var oldSend = sharedb.Connection.prototype.send;

    store.on('connectionEnd', function () {
      // console.log('ending connection');
      store.isAuthenticated = false
    })

    sharedb.Connection.prototype.send = function (msg) {
      var self = this, args = arguments;
      if (store.isAuthenticating || !store.isAuthenticated) {
        store.checkConnection().then(function () {
          // console.log(msg);
          oldSend.apply(self, args)
        })
      }
      else {
        // console.log(msg);
        oldSend.apply(self, args);

      }
    };

    sharedb.Connection.prototype.handleMessage = function(message) {
      var athenticating, handleMessageArgs;
      handleMessageArgs = arguments;
      // console.log(message.a);
      var context = this;
      if (message.a === 'init' && (typeof message.id === 'string') && message.protocol === 1 && typeof store.authenticate === 'function') {
        store.isAuthenticating = true;
        oldHandleMessage.apply(context, handleMessageArgs);
        return store.authenticate(message.id)
          .then(function() {
              console.log('authenticated !');
              store.isAuthenticating = false;
              store.isAuthenticated = true;
              store.trigger('authenticated')
            })
          .catch(function (err) {
            store.isAuthenticating = false;
            // store.socket.end()
            // debugger
          })
      } else {
        return oldHandleMessage.apply(this, handleMessageArgs);
      }
    };

    this.connection = new sharedb.Connection(this.socket);

  }.on('connect'),
  find: function (type, id) {
    type = type.pluralize()
    var store = this;
    return this.checkConnection()
      .then(function(){
          return store.findQuery(type, {_id: id}).then(function (models) {
          return models[0];
        },function(err){
          return err;
        });
      });
  },
  createRecord: function (type, data) {
    var ref, path;
    path =  (ref = this._getPathForType(type)) ? ref : type.pluralize()
    path = this._getPrefix(type) + path;
    type = type.pluralize()
    var store = this;
    return store.checkConnection()
      .then(function(){
        var doc = store.connection.get(path, data.id == null ? guid() : data.id);
        return Promise.all([
          store.whenReady(doc).then(function (doc) {
            return store.create(doc, data);
          }),
          store.subscribe(doc)
        ]).then(function () {
          var model = store._createModel(type, doc);
          store._cacheFor(type).addObject(model);
          return model
        });
      });
  },
  deleteRecord : function(type, id) {
    var cache = this._cacheFor(type.pluralize());
    var model = cache.findBy('id', id);
    var doc = model.get('doc');
    return new Promise(function (resolve, reject) {
      doc.del(function (err) {
        if (err != null)
          reject(err)
        else {
          resolve()
        }
      });
    })
  },
  findAndSubscribeQuery: function(type, query) {
    type = type.pluralize()
    var store = this;
    var prefix = this._getPrefix(type);
    store.cache[type] = []

    return this.checkConnection()
    .then(function(){
      return new Promise(function (resolve, reject) {
        function fetchQueryCallback(err, results, extra) {
          if (err !== null) {
            return reject(err);
          }
          resolve(store._resolveModels(type, results));
        }
        query = store.connection.createSubscribeQuery(prefix + type, query, null, fetchQueryCallback);
        query.on('insert', function (docs) {
          store._resolveModels(type, docs)
        });
        query.on('remove', function (docs) {
          for (var i = 0; i < docs.length; i++) {
            var modelPromise = store._resolveModel(type, docs[i]);
            modelPromise.then(function (model) {
              store.unload(type, model)
            });
          }
        });
      });
    });
  },
  findRecord: function (type, id) {
    var store = this;
    return new Promise(function (resolve, reject){
      store.findQuery(type, {_id: id})
        .then(function(results){
          resolve(results[0])
        })
        .catch(function (err){
          reject(err)
        });
    })
  },
  findQuery: function (type, query) {
    // type = type.pluralize()
    var ref, path;
    path =  (ref = this._getPathForType(type)) ? ref : type.pluralize()
    path = this._getPrefix(type) + path;
    var store = this;
    store.cache[type.pluralize()] = []
    return this.checkConnection()
    .then(function(){
      return new Promise(function (resolve, reject) {
        function fetchQueryCallback(err, results, extra) {
          if (err !== null) {
            return reject(err);
          }
          resolve(store._resolveModels(type, results));
        }
        store.connection.createFetchQuery(path, query, null, fetchQueryCallback);
      });
    });
  },
  findAll: function (type, query) {
    type = type.pluralize()
    throw new Error('findAll not implemented');
    // TODO this.connection subscribe style query
  },
  _cacheFor: function (type) {
    type = type.pluralize()
    var cache = this.cache[type];
    if (cache === undefined) {
      this.cache[type] = cache = [];
    }
    return cache;
  },
  _getPathForType: function (type) {
    var Adapter = this.container.lookupFactory('adapter:' + type.singularize());
    if (Adapter)
      return Adapter.create().pathForType();
  },
  _getPrefix: function (type) {
    var Adapter = this.container.lookupFactory('adapter:' + type.singularize());
    var prefix;
    if (Adapter)
      prefix = Adapter.create().get('prefix');
    if (!prefix) prefix = '';
    return prefix
  },
  _factoryFor: function (type) {
    var ref;
    var modelStr = (ref = this.get('modelStr')) ? ref : 'model-sdb'
    return this.container.lookupFactory(modelStr + ':'+ type.singularize());
  },
  _createModel: function (type, doc) {
    var modelClass = this._factoryFor(type);
    type = type.pluralize()
    if(modelClass)
    {
      var model = modelClass.create({
        doc: doc,
        _type: type,
        _store: this
      });
      return model;
    }
    else
    {
      throw new Error('Cannot find model for '+type);
    }
  },
  _resolveModel: function (type, doc) {
    var cache = this._cacheFor(type.pluralize());
    var id = Ember.get(doc, 'id') || Ember.get(doc, '_id');
    var model = cache.findBy('id', id);
    if (model !== undefined) {
      return Promise.resolve(model);
    }
    var store = this;
    return store.subscribe(doc).then(function (doc) {
      return store._createModel(type, doc);
    });
  },
  _resolveModels: function (type, docs) {
    // type = type.pluralize()
    var store = this;
    var cache = this._cacheFor(type.pluralize());
    var promises = new Array(docs.length);
    for (var i=0; i<docs.length; i++) {
      promises[i] = this._resolveModel(type, docs[i]);
    }
    return new Promise(function (resolve, reject) {
      Promise.all(promises).then(function (models){
        cache.addObjects(models);
        resolve(cache)
      })
      .catch(function(err){
        reject(err)
      })
    })
    // return Promise.all(cache);
  },
  /* returns Promise for when sharedb doc is ready */
  whenReady: function(doc) {
    if (doc.state === 'ready') {
      return Promise.resolve(doc);
    }
    return new Promise(function (resolve, reject) {
      doc.on('load', function () {
        Ember.run(null, resolve, doc);
      });
    });
  },
  unloadRecord: function (doc) {
    var cache = this.cache[doc.get("_type")];
    doc.get('doc').destroy();
    doc.destroy();
    cache.removeObject(doc);
    return this
  },
  unload: function (type, doc) {
    type = type.pluralize();
    var cache = this._cacheFor(type);
    doc.destroy()
    cache.removeObject(doc)
  },
  unloadAll: function (type) {
    try
      {
        var cache = this.cache[type.pluralize()];
        for (var i = 0; i < cache.length; i++) {
          var doc = cache[i];
          doc.get('doc').destroy();
          doc.destroy();
        }
        cache.removeObjects(cache);
      }
    catch (err){

    }
  },
  peekAll: function (type) {
    type = type.pluralize()
    return this._cacheFor(type);
  },
  /* returns Promise for when sharedb doc is subscribed */
  subscribe: function(doc) {
    if (doc.subscribed) {
      return Promise.resolve(doc);
    }
    return new Promise(function (resolve, reject) {
      doc.subscribe(function (err) {
        if (err === undefined) {
          Ember.run(null, resolve, doc);
        } else {
          Ember.run(null, reject, err);
        }
      });
    });
  },
  /* returns Promise for when sharedb json0 type doc is created */
  create: function (doc, data) {
    return new Promise(function (resolve, reject) {
      doc.create(data, 'json0', function (err) {
        if (err === undefined) {
          Ember.run(null, resolve, doc);
        } else {
          Ember.run(null, reject, err);
        }
      });
    });
  }
});
