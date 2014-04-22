/* global BCSocket:false, sharejs:false */
import { guid, patchShare } from './utils';

var Promise = Ember.RSVP.Promise;

/* returns Promise for when ShareJS doc is ready */
function whenReady(doc) {
  if (doc.state === 'ready') {
    return Promise.resolve(doc);
  }
  return new Promise(function (resolve, reject) {
    doc.whenReady(function () {
      Ember.run(null, resolve, doc);
    });
  });
}

/* returns Promise for when ShareJS doc is subscribed */
function subscribe(doc) {
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
}

/* returns Promise for when ShareJS json0 type doc is created */
function create(doc, data) {
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

export default Ember.Object.extend({
  socket: null,
  connection: null,
  url : 'http://'+window.location.hostname,
  init: function () {
    if(window.BCSocket)
    {
      this.socket = new BCSocket(this.url, {reconnect: true});
    }
    else if(window.Primus)
    {
      patchShare();
      this.socket = new Primus(this.url);
    }
    this.connection = new sharejs.Connection(this.socket);
    this.cache = {};
  },
  find: function (type, id) {
    return this.findQuery(type, {_id: id}).then(function (models) {
      return models[0];
    });
  },
  createRecord: function (type, data) {
    var doc = this.connection.get(type, guid());
    var store = this;
    return Promise.all([
      whenReady(doc).then(function (doc) {
        return create(doc, data);
      }),
      subscribe(doc)
    ]).then(function () {
      return store._createModel(type, doc);
    });
  },
  findQuery: function (type, query) {
    var store = this;
    return new Promise(function (resolve, reject) {
      function fetchQueryCallback(err, results, extra) {
        if (err !== undefined) {
          return reject(err);
        }
        resolve(store._resolveModels(type, results));
      }
      store.connection.createFetchQuery(type, query, null, fetchQueryCallback);
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
    var model = this._factoryFor(type).create({
      id: doc.name,
      _context: doc.createContext().createContextAt()
    });
    cache[doc.name] = model;
    return model;
  },
  _resolveModel: function (type, doc) {
    var cache = this._cacheFor(type);
    var model = cache[doc.name];
    if (model !== undefined) {
      return Promise.resolve(model);
    }
    var store = this;
    return subscribe(doc).then(function (doc) {
      return store._createModel(type, doc);
    });
  },
  _resolveModels: function (type, docs) {
    var promises = new Array(docs.length);
    for (var i=0; i<docs.length; i++) {
      promises[i] = this._resolveModel(type, docs[i]);
    }
    return Promise.all(promises);
  }
});
