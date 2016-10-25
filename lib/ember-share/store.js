/* global BCSocket:false, sharedb:false */
import { guid, patchShare } from './utils';

var Promise = Ember.RSVP.Promise;

export default Ember.Object.extend({
  socket: null,
  connection: null,
  port: 3000,
  url : 'https://'+window.location.hostname,
  init: function () {
    this.checkConnection = Ember.Deferred.create({});
    var store = this;
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
        Ember.sendEvent(store,'connect');
      });
    }
    else
    {
      Ember.sendEvent(this,'connect');
    }
  },
  doConnect : function(options){
    var store = this;

    if(window.BCSocket)
    {
      this.setProperties(options);
      this.socket = new BCSocket(this.get('url'), {reconnect: true});
      this.socket.onerror = function(err){
        Ember.sendEvent(store,'connectionError',[err]);
      };
      this.socket.onopen = function(){
        store.checkConnection.resolve();
        Ember.sendEvent(store,'connectionOpen');
      };
      this.socket.onclose = function(){
        Ember.sendEvent(store,'connectionEnd');
      };
    }
    else if(window.Primus)
    {
      patchShare();
      this.setProperties(options);
      var hostname = this.get('url');
      if (this.get("port") !== null)
        hostname += ':' + this.get('port');
      this.socket = new Primus(hostname);
      this.socket.on('error', function error(err) {
         Ember.sendEvent(store,'connectionError',[err]);
      });
      this.socket.on('open', function() {
        store.checkConnection.resolve();
         Ember.sendEvent(store,'connectionOpen');
      });
      this.socket.on('end', function() {
         Ember.sendEvent(store,'connectionEnd');
      });
    }
    else {
      throw new Error("No Socket library included");
    }
    this.connection = new sharedb.Connection(this.socket);

  }.on('connect'),
  find: function (type, id) {
    type = type.pluralize()
    var store = this;
    return this.checkConnection
      .then(function(){
          return store.findQuery(type, {_id: id}).then(function (models) {
          return models[0];
        },function(err){
          return err;
        });
      });
  },
  createRecord: function (type, data) {
    type = type.pluralize()
    var store = this;
    return store.checkConnection
      .then(function(){
        var doc = store.connection.get(type, guid());
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
  deleteRecord : function(model) {
    // TODO: delete and cleanup caches
    // model._context.context._doc.del()
  },
  findAndSubscribeQuery: function(type, query) {
    type = type.pluralize()
    var store = this;
    store.cache[type] = []
    return this.checkConnection
    .then(function(){
      return new Promise(function (resolve, reject) {
        function fetchQueryCallback(err, results, extra) {
          if (err !== null) {
            return reject(err);
          }
          resolve(store._resolveModels(type, results));
        }
        query = store.connection.createSubscribeQuery(type, query, null, fetchQueryCallback);
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
  findQuery: function (type, query) {
    type = type.pluralize()
    var store = this;
    store.cache[type] = []
    return this.checkConnection
    .then(function(){
      return new Promise(function (resolve, reject) {
        function fetchQueryCallback(err, results, extra) {
          if (err !== null) {
            return reject(err);
          }
          resolve(store._resolveModels(type, results));
        }
        store.connection.createFetchQuery(type, query, null, fetchQueryCallback);
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
  _factoryFor: function (type) {
    return this.container.lookupFactory('model:'+type.singularize());
  },
  _createModel: function (type, doc) {
    var modelClass = this._factoryFor(type);
    type = type.pluralize()
    if(modelClass)
    {
      var model = modelClass.create({
        id: doc.id,
        // content: JSON.parse(JSON.stringify(doc.data)),
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
    type = type.pluralize()
    var store = this;
    var cache = this._cacheFor(type);
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
  unload: function (type, doc) {
    type = type.pluralize();
    var cache = this._cacheFor(type);
    cache.removeObject(doc)
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
