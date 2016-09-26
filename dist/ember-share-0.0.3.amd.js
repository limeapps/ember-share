define("ember-share", 
  ["ember-share/mixins/share-text","ember-share/models/share-proxy","ember-share/models/share-array","ember-share/store","ember-share/utils","ember-share/attr","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var ShareTextMixin = __dependency1__["default"];
    var ShareProxy = __dependency2__["default"];
    var ShareArray = __dependency3__["default"];
    var Store = __dependency4__["default"];
    var Utils = __dependency5__["default"];
    var attr = __dependency6__["default"];

    Ember.onLoad('Ember.Application', function(Application) {
    	Application.initializer({
    		name: 'ember-share',
    		initialize : function(container, application){
    			application.register('ShareStore:main', application.Store || Store);
    			container.lookup('ShareStore:main');
    		}
    	});
    	Application.initializer({
    		name: 'injectStoreS',
    		before : 'ember-share',
    		initialize : function(container, application) {
    			// application.register('model:share-proxy',ShareProxy);
    			// application.register('model:share-array',ShareArray);
    			application.inject('controller', 'ShareStore', 'ShareStore:main');
    			application.inject('route', 'ShareStore', 'ShareStore:main');
    		}
    	});
    });


    __exports__.attr = attr;
    __exports__.ShareTextMixin = ShareTextMixin;
    __exports__.ShareProxy = ShareProxy;
    __exports__.ShareArray = ShareArray;
    __exports__.Store = Store;
    __exports__.Utils = Utils;
  });
define("ember-share/attr", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function() {
        var options, type;
        options = {};
        type = null;
        _.forEach(arguments, function(arg) {
          if (_.isPlainObject(arg)) {
            return options = arg;
          } else {
            if (_.isString(arg)) {
              return type = null;
            }
          }
        });
        return Ember.computed({
          get: function(k) {
            var ref;
            return this.get((ref = "doc.data." + k) != null ? ref : Ember.get(options, 'defaultValue'));
          },
          set: function(p, oi, isFromServer) {
            var od;
            if (type != null) {
              oi = window[type.toUpperCase(type)](oi);
            }
            od = this.get(p);
            p = p.split('.');
            this.get('doc').submitOp([
              {
                p: p,
                od: od,
                oi: oi
              }
            ]);
            return oi;
          }
        });
      }


    // attr: ->
    //   options = {}; type = null
    //   _.forEach arguments, (arg) ->
    //     if _.isPlainObject(arg)
    //       options = arg
    //     else
    //       if _.isString arg
    //         type = null
    //
    //   Ember.computed
    //     get: (k) ->
    //       @get "doc.data.#{k}" ? Ember.get(options, 'defaultValue')
    //     set: (p, oi, isFromServer) ->
    //       if type?
    //         oi = window[type.toUpperCase type] oi
    //       od = @get p
    //       p = p.split '.'
    //       @get('doc').submitOp [{p,od,oi}]
    //       oi
  });
define("ember-share/mixins/share-text", 
  ["../utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /*
    * Share-text mixin, this mixin sends text operations instead of the default
    * behaviour which is to replace the entire string. to utilize the mixin add
    * the text property names to the textKeys array
    */
    var isArray = __dependency1__.isArray;
    var diff = __dependency1__.diff;
    __exports__["default"] = Ember.Mixin.create({
    	textKeys : [],
    	triggerEvents : false,
    	textEvents : function(){
    		var that = this;
    		this._textContexts = new Array(this.textKeys.length);

    		// to hold the listners and remove them on destory
    		this._handlers = new Array(this._textContexts.length * 2);
    		for (var i = 0; i < this.textKeys.length; i++) {
    			var key = this.textKeys[i];
    			var subCtx = this._context.createContextAt([key]);
    			this._handlers[key] = new Array(2);

    			// server changes -> local
    			this._handlers[key].push(subCtx.on('insert',Ember.run.bind(this,this.handleInsert,key)));
    			this._handlers[key].push(subCtx.on('delete',Ember.run.bind(this,this.handleDelete,key)));
    			this._textContexts[key] = subCtx;
    		}
    	}.on('init'),
    	setUnknownProperty: function (key, value) {
    		if(this.textKeys.indexOf(key) >= 0)
    		{
    			// local changes -> server
    			this.textOp(key,value);
    		}
    		else 
    		{
    			this._super(key,value);
    		}
    	},
    	textOp : function(key,value){

    		// when the object was removed but has a lingering binding
    		// propably an assertion is better
    		if(this._context.get() === undefined)
    		{
    			return;
    		}
    		this.propertyWillChange(key);
    		var components = diff.diff(this._cache[key] || "", value.replace(/\r\n/g, '\n'));
    		this._cache[key] = value.replace(/\r\n/g, '\n');
    		var changePosition = 0;
    		for (var i = 0; i < components.length; i++) {
    			if(components[i].added)
    			{
    				this._context.insert([key,changePosition],components[i].value);
    			}
    			else if(components[i].removed)
    			{
    				this._context.remove([key,changePosition],components[i].value.length);
    			}
    			changePosition += components[i].value.length;
    		}
    		this.propertyDidChange(key);
    	},
    	handleInsert : function (key, position, data) {
    		this.propertyWillChange(key);
    		if(this._cache[key] === undefined)
    		{
    			// force caching
    			this.get(key);
    		}
    		var updatedText = this._cache[key].slice(0,position) + data + this._cache[key].slice(position);
    		this._cache[key] = updatedText;
    		// use trigger to update the view when in DOM
    		if(this.triggerEvents)
    		{
    			this.trigger('textInsert',position,data);
    		}
    		this.propertyDidChange(key);
    	},
    	handleDelete : function (key, position, data) {
    		if(this._cache[key] === undefined)
    		{
    			// force caching
    			this.get(key);
    		}
    		this.propertyWillChange(key);
    		var length = data.length;
    		var updatedText = this._cache[key].slice(0,position) + this._cache[key].slice(position+length);
    		this._cache[key] = updatedText;
    		// use trigger to update the view when in DOM
    		if(this.triggerEvents)
    		{
    			this.trigger('textDelete',position,data);
    		}
    		this.propertyDidChange(key);
    	},
    	willDestroy : function(){
    		// remove the listners
    		for (var key in this._textContexts)
    		{
    			this._textContexts[key].removeListener(this._handlers[key][0]);
    			this._textContexts[key].removeListener(this._handlers[key][1]);
    			this._textContexts[key].destroy();
    		}
    		this._super();
    	}
    });
  });
define("ember-share/models/share-array", 
  ["./share-proxy","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    var ShareProxy = __dependency1__["default"];

    __exports__["default"] = Ember.Object.extend(Ember.MutableArray, {
      _context: null,
      _cache: null,
      itemType: 'share-proxy',
      init: function () {
        this._cache = []; // cache wrapped objects
        this._factory = this.container.lookupFactory('model:'+this.itemType);
        // TODO subscribe to array ops on context
        var _this = this;
        this._context.on('delete', function (index, removed) {
          _this.arrayContentWillChange(index, 1, 0);

          _this._cache.splice(index, 1);

          // update paths
          var depth = _this._context.path.length;
          _this._cache.forEach(function(item,idx){
            item._context.path[depth]= idx;
          })
          _this.arrayContentDidChange(index, 1, 0);
        });
        this._context.on('insert', function (index, value) {
          _this.arrayContentWillChange(index, 0, 1);

          var model = _this._factory.create({
            _context: _this._context.createContextAt(index)
          });

          _this._cache.splice(index, 0, model);
          // update paths
          var depth = _this._context.path.length;
          _this._cache.forEach(function(item,idx){
            item._context.path[depth]= idx;
          });
          _this.arrayContentDidChange(index, 0, 1);
        });
      },
      length: function () {
        return this._context.get().length;
      }.property().volatile(),
      objectAt: function (index) {
        if (this._cache[index] === undefined && this._context.get(index) !== undefined) {
          this._cache[index] = this._factory.create({
            _context: this._context.createContextAt(index)
          });
        }
        return this._cache[index];
      },
      replace: function (index, length, objects) {
        var objectsLength = objects.length;
        var args = new Array(objectsLength+2);
        var model;
        args[0] = index;
        args[1] = length;

        this.arrayContentWillChange(index, length, objectsLength);

        if (length > 0) {
          this._context.remove([index], length);
        }

        for (var i=0; i<objectsLength; i++) {
          this._context.insert([index+i], objects[i]);

          args[2+i] = this._factory.create({
            id : objects[i].id,
            _context: this._context.createContextAt(index+i)
          });
        }

        this._cache.splice.apply(this._cache, args);

        this.arrayContentDidChange(index, length, objectsLength);
      },
      toJSON: function () {
        return this._context.get();
      },
    });
  });
define("ember-share/models/share-proxy", 
  ["exports"],
  function(__exports__) {
    "use strict";
    var isOpOnArray = function (op) {
      return (op.ld != null) || (op.lm != null) || (op.li != null)
    }

    var extractArrayPath = function (op) {
      return {
        idx: _.last(op.p),
        p: _.slice(op.p, 0, op.p.length - 1).join('.'),
        addAmt: op.li != null ? 1 : 0,
        removeAmt: op.ld != null ? 1 : 0
      }
    }

    __exports__["default"] = Ember.Object.extend({
      unload: function() {
        return this.get('_store').unload(this.get('_type'), this);
      },
      setOpsInit: (function() {
        var doc;
        var self = this;

        var beforeAfter = function (didWill) {
          return function(ops, isFromClient) {
            if (!isFromClient) {
              _.forEach(ops, function(op) {
                if (isOpOnArray(op)) {
                  var ex = extractArrayPath(op);
                  self.get(ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
                }
                else
                  self["property" +  didWill +  "Change"](op.p.join('.'));
              });
            }
          };
        };

        doc = this.get('doc');
        doc.on('before op', beforeAfter("Will"));
        doc.on('op',beforeAfter("Did"));

      }).on('init')

    });
  });
define("ember-share/store", 
  ["./utils","exports"],
  function(__dependency1__, __exports__) {
    "use strict";
    /* global BCSocket:false, sharedb:false */
    var guid = __dependency1__.guid;
    var patchShare = __dependency1__.patchShare;

    var Promise = Ember.RSVP.Promise;

    __exports__["default"] = Ember.Object.extend({
      socket: null,
      connection: null,
      port: 3000,
      url : 'http://'+window.location.hostname,
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
        type = type.pluralize()
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
  });
define("ember-share/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    function guid() {
    	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    		var r = Math.random() * 16 | 0,
    		v = c === 'x' ? r : r & 3 | 8;
    		return v.toString(16);
    	});
    }

    /*
    * Software License Agreement (BSD License)
    *
    * Copyright (c) 2009-2011, Kevin Decker kpdecker@gmail.com
    *
    * Text diff implementation.
    *
    * This library supports the following APIS:
    * JsDiff.diffChars: Character by character diff
    * JsDiff.diffWords: Word (as defined by \b regex) diff which ignores whitespace
    * JsDiff.diffLines: Line based diff
    *
    * JsDiff.diffCss: Diff targeted at CSS content
    *
    * These methods are based on the implementation proposed in
    * "An O(ND) Difference Algorithm and its Variations" (Myers, 1986).
    * http://citeseerx.ist.psu.edu/viewdoc/summary?doi=10.1.1.4.6927
    * All rights reserved.
    */
    function clonePath(path) {
    	return { newPos: path.newPos, components: path.components.slice(0) };
    }
    var fbDiff = function(ignoreWhitespace) {
    	this.ignoreWhitespace = ignoreWhitespace;
    };
    fbDiff.prototype = {
    	diff: function(oldString, newString) {
    		// Handle the identity case (this is due to unrolling editLength == 0
    			if (newString === oldString) {
    				return [{ value: newString }];
    			}
    			if (!newString) {
    				return [{ value: oldString, removed: true }];
    			}
    			if (!oldString) {
    				return [{ value: newString, added: true }];
    			}

    			newString = this.tokenize(newString);
    			oldString = this.tokenize(oldString);

    			var newLen = newString.length, oldLen = oldString.length;
    			var maxEditLength = newLen + oldLen;
    			var bestPath = [{ newPos: -1, components: [] }];

    		// Seed editLength = 0
    		var oldPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    		if (bestPath[0].newPos+1 >= newLen && oldPos+1 >= oldLen) {
    			return bestPath[0].components;
    		}

    		for (var editLength = 1; editLength <= maxEditLength; editLength++) {
    			for (var diagonalPath = -1*editLength; diagonalPath <= editLength; diagonalPath+=2) {
    				var basePath;
    				var addPath = bestPath[diagonalPath-1],
    				removePath = bestPath[diagonalPath+1];
    				oldPos = (removePath ? removePath.newPos : 0) - diagonalPath;
    				if (addPath) {
    					// No one else is going to attempt to use this value, clear it
    					bestPath[diagonalPath-1] = undefined;
    				}

    				var canAdd = addPath && addPath.newPos+1 < newLen;
    				var canRemove = removePath && 0 <= oldPos && oldPos < oldLen;
    				if (!canAdd && !canRemove) {
    					bestPath[diagonalPath] = undefined;
    					continue;
    				}

    				// Select the diagonal that we want to branch from. We select the prior
    				// path whose position in the new string is the farthest from the origin
    				// and does not pass the bounds of the diff graph
    				if (!canAdd || (canRemove && addPath.newPos < removePath.newPos)) {
    					basePath = clonePath(removePath);
    					this.pushComponent(basePath.components, oldString[oldPos], undefined, true);
    				} else {
    					basePath = clonePath(addPath);
    					basePath.newPos++;
    					this.pushComponent(basePath.components, newString[basePath.newPos], true, undefined);
    				}

    				oldPos = this.extractCommon(basePath, newString, oldString, diagonalPath);

    				if (basePath.newPos+1 >= newLen && oldPos+1 >= oldLen) {
    					return basePath.components;
    				} else {
    					bestPath[diagonalPath] = basePath;
    				}
    			}
    		}
    	},

    	pushComponent: function(components, value, added, removed) {
    		var last = components[components.length-1];
    		if (last && last.added === added && last.removed === removed) {
    			// We need to clone here as the component clone operation is just
    			// as shallow array clone
    			components[components.length-1] =
    			{value: this.join(last.value, value), added: added, removed: removed };
    		} else {
    			components.push({value: value, added: added, removed: removed });
    		}
    	},
    	extractCommon: function(basePath, newString, oldString, diagonalPath) {
    		var newLen = newString.length,
    		oldLen = oldString.length,
    		newPos = basePath.newPos,
    		oldPos = newPos - diagonalPath;
    		while (newPos+1 < newLen && oldPos+1 < oldLen && this.equals(newString[newPos+1], oldString[oldPos+1])) {
    			newPos++;
    			oldPos++;

    			this.pushComponent(basePath.components, newString[newPos], undefined, undefined);
    		}
    		basePath.newPos = newPos;
    		return oldPos;
    	},

    	equals: function(left, right) {
    		var reWhitespace = /\S/;
    		if (this.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right)) {
    			return true;
    		} else {
    			return left === right;
    		}
    	},
    	join: function(left, right) {
    		return left + right;
    	},
    	tokenize: function(value) {
    		return value;
    	}
    };
    // copied from https://github.com/Dignifiedquire/share-primus/blob/master/lib/client/share-primus.js
    function patchShare() {
    	// Map Primus ready states to ShareJS ready states.
    	var STATES = {};
    	STATES[window.Primus.CLOSED] = 'disconnected';
    	STATES[window.Primus.OPENING] = 'connecting';
    	STATES[window.Primus.OPEN] = 'connected';

    	// Override Connection's bindToSocket method with an implementation
    	// that understands Primus Stream.
    	window.sharedb.Connection.prototype.bindToSocket = function(stream) {
    		var connection = this;
    		this.state = (stream.readyState === 0 || stream.readyState === 1) ? 'connecting' : 'disconnected';

    		setState(Primus.OPENING);
    		setState(stream.readyState);
    		this.canSend = this.state === 'connected'; // Primus can't send in connecting state.

    		// Tiny facade so Connection can still send() messages.
    		this.socket = {
    			send: function(msg) {
    				stream.write(msg);
    			}
    		};

    		stream.on('data', function(msg) {
    			if(msg.a)
    			{
    				try {
    					connection.handleMessage(msg);
    				} catch (e) {
    					connection.emit('error', e);
    					throw e;
    				}
    			}
    		});

    		stream.on('readyStateChange', function() {
    			setState(stream.readyState);
    		});

    		stream.on('reconnecting', function() {
    			if(connection.state === "disconnected")
    			{
    				setState(Primus.OPENING);
    				connection.canSend = false;
    			}
    		});

    		function setState(readyState) {
    			var shareState = STATES[readyState];
    			connection._setState(shareState);
    		}
        };
    }
    var isArray = Array.isArray || function (obj) {
    	return obj instanceof Array;
    };
    var diff = new fbDiff(false);
    __exports__.guid = guid;
    __exports__.diff = diff;
    __exports__.isArray = isArray;
    __exports__.patchShare = patchShare;
  });