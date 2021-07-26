"use strict";
/* global BCSocket:false, sharedb:false */
var guid = require("./utils").guid;
var patchShare = require("./utils").patchShare;
var inflector = require("./inflector/inflector")["default"];
let { singularize, pluralize } = inflector;
singularize = singularize.bind(inflector);
pluralize = pluralize.bind(inflector);
var Promise = Ember.RSVP.Promise;
var socketReadyState = [
  'CONNECTING',
  'OPEN',
  'CLOSING',
  'CLOSE'
];
var MAX_NUMBER_OF_FAILS = 15;

var ObjectPromiseProxy = Ember.ObjectProxy.extend(Ember.PromiseProxyMixin);

exports["default"] = Ember.Object.extend(Ember.Evented, {
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
            var recursionID;
            var checkState = function (state, cb) {
              switch(state) {
                case 'connected':
                  if (recursionID) { Ember.run.cancel(recursionID); }
                  return resolve();
                case 'connecting':
                  if (recursionID) { Ember.run.cancel(recursionID); }
                  return store.connection.once('connected', resolve);
                default: cb(state);
              }
            };
            var checkStateFail = function (state) {
              switch(state) {
                case 'closed':
                  return reject('connection closed');
                case 'disconnected':
                  return reject('connection disconnected');
                case 'stopped':
                  return reject('connection closing');
              }
            };
            var numberOfFails = 0;
            var checkStateRecursively = function(state) {
              numberOfFails += 1;
              if (numberOfFails >= MAX_NUMBER_OF_FAILS) {
                if (numberOfFails > MAX_NUMBER_OF_FAILS) console.log('Ember-share: connection retries to SDB over max!');
                checkStateFail(state);
                Ember.run.cancel(recursionID);
              }
              else {
                if (numberOfFails === 1) {
                  // Force reconnection on first fail
                  store.socket.end();
                  store.socket.open();
                }
                recursionID = Ember.run.later (this, function () {
                  checkState(store.connection.state, checkStateRecursively);
                }, 1000);
              }
            };

            checkState(store.connection.state, checkStateRecursively);
        }
      });
    };

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
      .then(function(authArgs /* { authToken, customer } */){
        if (authArgs && authArgs.authToken && authArgs.customer) store.setProperties(authArgs);
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
      hostname += ':' + (this.get('port') || 80);
      const authToken = this.get('authToken');
      hostname += authToken ? `?authorization=${authToken}&customer=${this.get('customer')}` : '';
      this.socket = new Primus(hostname, options);
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

    sharedb.Connection.prototype.handleMessage = function(message) {
      var athenticating, handleMessageArgs;
      handleMessageArgs = arguments;
      // console.log(message.a);
      var context = this;
      oldHandleMessage.apply(context, handleMessageArgs);
      if (message.a === 'init' && (typeof message.id === 'string') && message.protocol === 1 && typeof store.authenticate === 'function') {
        store.isAuthenticating = true;
        return store.authenticate(message.id)
          .then(function() {
              console.log('authenticated !');
              store.isAuthenticating = false;
              store.isAuthenticated = true;
              oldHandleMessage.apply(context, handleMessageArgs);
              store.trigger('authenticated')
            })
          .catch(function (err) {
            store.isAuthenticating = false;
            // store.socket.end()
          })
      }
    };

    this.connection = new sharedb.Connection(this.socket);

  }.on('connect'),
  find: function (type, id) {
    type = pluralize(type);
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
    path =  (ref = this._getPathForType(type)) ? ref : type.pluralize();
    path = this._getPrefix(type) + path;
    type = pluralize(type);
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
    var cache = this._cacheFor(pluralize(type));
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
    type = pluralize(type);
    var store = this;
    var prefix = this._getPrefix(type);
    //store.cache[type] = []

    return this.checkConnection()
    .then(function(){
      return new Promise(function (resolve, reject) {
        var fetchedResult, _query;
        function fetchQueryCallback(err, results, extra) {
          if (err !== null) {
            return reject(err);
          }
          resolve(
            store._resolveModels(type, results).then(function (models) {
              fetchedResult = models;
              return { models, query: _query }
            })
          );
        }
        _query = store.connection.createSubscribeQuery(prefix + type, query, null, fetchQueryCallback);
        _query.on('insert', function (docs) {
          store._resolveModels(type, docs).then(function (models) {
              return fetchedResult.addObjects(models);
            })
        });
        _query.on('remove', function (docs) {
          store._resolveModels(type, docs).then(function (models) {
              _.forEach(models, function (model) {
                store.unload(type, model);
              });
              return fetchedResult.removeObjects(models);
          })
        });
      });
    });
  },
  findRecord: function (type, id) {
    var store = this;
    var cache = store.cache[pluralize(type)]
    return ObjectPromiseProxy.create ({
      promise: new Promise(function (resolve, reject){
        try {
          var cachedRecordAvailable = cache[0].doc.id == id && cache.length == 1
        } catch (e) { }
        if (cachedRecordAvailable) {
          resolve(cache[0])
        } else {
          store.findQuery(type, {_id: id})
            .then(function(results){
              resolve(results[0])
            })
            .catch(function (err){
              reject(err)
            });
        }
      })
    })
    // return new Promise(function (resolve, reject){
    //   try {
    //     var cachedRecordAvailable = cache[0].doc.id == id && cache.length == 1
    //   } catch (e) { }
    //   if (cachedRecordAvailable) {
    //     resolve(cache[0])
    //   } else {
    //     store.findQuery(type, {_id: id})
    //       .then(function(results){
    //         resolve(results[0])
    //       })
    //       .catch(function (err){
    //         reject(err)
    //       });
    //   }
    // })
  },
  findQuery: function (type, query) {
    // type = pluralize(type)
    var ref, path;
    path =  (ref = this._getPathForType(type)) ? ref : pluralize(type)
    path = this._getPrefix(type) + path;
    var store = this;
    //store.cache[pluralize(type)] = []
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
    type = pluralize(type)
    throw new Error('findAll not implemented');
    // TODO this.connection subscribe style query
  },
  _cacheFor: function (type) {
    type = pluralize(type)
    var cache = this.cache[type];
    if (cache === undefined) {
      this.cache[type] = cache = [];
    }
    return cache;
  },
  _getPathForType: function (type) {
    var Adapter = Ember.getOwner(this).lookup('adapter:' + singularize(type));
    if (Adapter && Adapter.pathForType)
      return Adapter.pathForType(type);
  },
  _getPrefix: function (type) {
    var Adapter = Ember.getOwner(this).lookup('adapter:' + singularize(type));
    var prefix;
    if (Adapter)
      prefix = Adapter.get('prefix');
    if (!prefix) prefix = '';
    return prefix
  },
  _factoryFor: function (type) {
    var ref;
    var modelStr = (ref = this.get('modelStr')) ? ref : 'model-sdb';
    return Ember.getOwner(this).factoryFor(modelStr + ':'+ singularize(type));
  },
  _createModel: function (type, doc) {
    var modelClass = this._factoryFor(type);
    if(modelClass)
    {
      return modelClass.create({
        doc: doc,
        _type: pluralize(type),
        _store: this
      });
    }
    else
    {
      throw new Error('Cannot find model for '+type);
    }
  },
  _resolveModel: function (type, doc) {
    var cache = this._cacheFor(pluralize(type));
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
    // type = pluralize(type)
    var store = this;
    var cache = this._cacheFor(pluralize(type));
    var models = [];
    var promises = [];
    for (var i=0; i<docs.length; i++) {
      var doc = docs[i];
      var model = cache.findBy('id', doc.id);
      if (model) {
        models.push(model)
      } else {
        promises.push(this._resolveModel(type, doc))
      }
    }
    return new Promise(function (resolve, reject) {
      if (!Ember.isEmpty(promises)) {
        Promise.all(promises).then(function (resolvedModels) {
          cache.addObjects(resolvedModels);
          resolve(models.concat(resolvedModels))
        })
        .catch(function(err){
          reject(err)
        })
      } else {
        resolve(models)
      }
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
  unloadRecord: function (doc, cb) {
    let cache = this.cache[doc.get('_type')];
    doc.get('doc').destroy(() => {
      cache.removeObject(doc);
      doc.destroy();
      if (typeof cb === 'function') return cb();
    });
    return this;
  },
  unload: function (type, doc) {
    type = pluralize(type);
    var cache = this._cacheFor(type);
    try {
      doc.get('doc').destroy(() => {
        cache.removeObject(doc);
        doc.destroy();
      })
    } catch (e) {

    }
    doc.destroy();
    cache.removeObject(doc);
  },
  unloadAll: function (type) {
    return new Promise((resolve, reject) => {
      var cache = this.cache[pluralize(type)] || [];
      const promises = cache.map(doc => {
        return new Promise(resolve => {
          doc.get('doc').destroy(() => {
            doc.destroy();
            resolve();
          })
        })
      });
      return Promise.all(promises)
          .then(() => {
            cache.removeObjects(cache);
            resolve()
          })
          .catch(reject);
    });
  },
  peekAll: function (type) {
    type = pluralize(type);
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