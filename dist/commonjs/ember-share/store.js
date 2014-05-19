"use strict";
/* global BCSocket:false, sharejs:false */
var guid = require("./utils").guid;
var patchShare = require("./utils").patchShare;

var Promise = Ember.RSVP.Promise;

exports["default"] = Ember.Object.extend({
  socket: null,
  connection: null,
  url : 'http://'+window.location.hostname,
  init: function () {
    this.checkConnection = Ember.Deferred.create({});
    var store = this;
    this.cache = {};
    if(!window.sharejs)
    {
      throw new Error("ShareJS client not included"); 
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
  doConnect : function(){
    var store = this;
    
    if(window.BCSocket)
    {
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
      this.socket = new Primus(this.get('url'));
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
    this.connection = new sharejs.Connection(this.socket);
    
  }.on('connect'),
  find: function (type, id) {
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
          return store._createModel(type, doc);
        });
      });
  },
  deleteRecord : function(model) {
    // TODO: delete and cleanup caches
    // model._context.context._doc.del()
  },
  findQuery: function (type, query) {
    var store = this;
    return this.checkConnection
    .then(function(){
      return new Promise(function (resolve, reject) {
        function fetchQueryCallback(err, results, extra) {
          if (err !== undefined) {
            return reject(err);
          }
          resolve(store._resolveModels(type, results));
        }
        store.connection.createFetchQuery(type, query, null, fetchQueryCallback);
      });
    });
  },
  findAll: function (type) {
    throw new Error('findAll not implemented');
    // TODO this.connection subscribe style query
  },
  _cacheFor: function (type) {
    var cache = this.cache[type];
    if (cache === undefined) {
      this.cache[type] = cache = {};
    }
    return cache;
  },
  _factoryFor: function (type) {
    return this.container.lookupFactory('model:'+type);
  },
  _createModel: function (type, doc) {
    var cache = this._cacheFor(type);
    var modelClass = this._factoryFor(type);
    if(modelClass)
    {
      var model = modelClass.create({
        id: doc.name,
        _context: doc.createContext().createContextAt()
      });
      cache[doc.name] = model;
      return model;
    }
    else
    {
      throw new Error('Cannot find model for '+type);
    }
  },
  _resolveModel: function (type, doc) {
    var cache = this._cacheFor(type);
    var model = cache[doc.name];
    if (model !== undefined) {
      return Promise.resolve(model);
    }
    var store = this;
    return store.subscribe(doc).then(function (doc) {
      return store._createModel(type, doc);
    });
  },
  _resolveModels: function (type, docs) {
    var promises = new Array(docs.length);
    for (var i=0; i<docs.length; i++) {
      promises[i] = this._resolveModel(type, docs[i]);
    }
    return Promise.all(promises);
  },
  /* returns Promise for when ShareJS doc is ready */
  whenReady: function(doc) {
    if (doc.state === 'ready') {
      return Promise.resolve(doc);
    }
    return new Promise(function (resolve, reject) {
      doc.whenReady(function () {
        Ember.run(null, resolve, doc);
      });
    });
  },
  /* returns Promise for when ShareJS doc is subscribed */
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
  /* returns Promise for when ShareJS json0 type doc is created */
  create: function (doc, data) {
    return new Promise(function (resolve, reject) {
      doc.create('json0', data, function (err) {
        if (err === undefined) {
          Ember.run(null, resolve, doc);
        } else {
          Ember.run(null, reject, err);
        }
      });
    });
  }
});