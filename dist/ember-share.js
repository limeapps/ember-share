(function(global) {
define("ember-share", 
  ["ember-share/mixins/share-text","ember-share/models/model","ember-share/store","ember-share/utils","ember-share/attr","ember-share/belongs-to","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __dependency6__, __exports__) {
    "use strict";
    var ShareTextMixin = __dependency1__["default"];
    var ShareProxy = __dependency2__["default"];
    var Store = __dependency3__["default"];
    var Utils = __dependency4__["default"];
    var attrFunc = __dependency5__["default"];
    var belongsTo = __dependency6__["default"];

    var attr =  attrFunc('_sdbProps')

    __exports__.ShareTextMixin = ShareTextMixin;
    __exports__.ShareProxy = ShareProxy;
    __exports__.belongsTo = belongsTo;
    __exports__.Store = Store;
    __exports__.Utils = Utils;
    __exports__.attr = attr;
  });
define("ember-share/attr", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function(sdbProps) {
    	return function() {
    		var options,
    			type;
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
    				this.get(sdbProps, true).addObject(k);
    				// return this.get(k, true);
    				var isSpecielKey = _.includes([
    					'_isSDB',
    					'_sdbProps',
    					'_subProps',
    					'doc',
    					'_prefix',
    					'content',
    					'_idx',
    					'_root'
    				], k);

    				if (isSpecielKey || this._fullPath == null)
    					return this._get(k, true)
    				else
    					return this._get(this._fullPath(k))

    			},
    			set: function(k, v, isFromServer) {
    				// return this._super(p, oi)
    				var path = (k == null) ? this.get('_prefix') : ((k == '_idx' || !this._fullPath)  ? k : this._fullPath(k));
    				return this._set(path, v)

    			}
    		});
    	}
    }
  });
define("ember-share/belongs-to", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function(DS, modelName) {
        // var options, type;
        // options = {};
        // type = null;
        // _.forEach(arguments, function(arg) {
        //   if (_.isPlainObject(arg)) {
        //     return options = arg;
        //   } else {
        //     if (_.isString(arg)) {
        //       return type = null;
        //     }
        //   }
        // });
        var store = this.originalStore;
        return Ember.computed({
          get: function(k) {
            var ref;

            return store.findRecord(modelName, this.get(ref = "doc.data." + k));
            // return  != null ? ref : Ember.get(options, 'defaultValue'));
          },
          set: function(p, oi, isFromServer) {
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
define("ember-share/models/base", 
  ["./use-subs-mixin","./sub-mixin","./sub-array","./subs-handler","./utils","exports"],
  function(__dependency1__, __dependency2__, __dependency3__, __dependency4__, __dependency5__, __exports__) {
    "use strict";
    var UseSubsMixin = __dependency1__["default"];
    var SubMixin = __dependency2__["default"];
    var SDBSubArray = __dependency3__["default"];
    var subs = __dependency4__["default"];
    var Utils = __dependency5__["default"];

    var toJson = function(obj) {
    	return (obj == null)
    		? void 0
    		: JSON.parse(JSON.stringify(obj));
    };

    var getPlainObject = function (value) {
    	if (value != null && !((typeof value == 'string') || (typeof value == 'number')))
    		if (typeof value.toJson == 'function')
    			return value.toJson()
    		else
    			return toJson(value)
    	else {
    		return value
    	}
    }

    //
    //   ShareDb Base Class
    //
    //        Root and all subs (currently not arrays) inherit from base.
    //
    //

    var GetterSettersMixin = Ember.Mixin.create({

    	_get: function(k, selfCall) {
    		var firstValue = _.first(k.split('.'));

    		if (k != '_sdbProps' && _.includes(this.get('_sdbProps'), firstValue)) {
    			var content = this.get("doc.data." + k);
    			return this.useSubs(content, k)
    		} else {
    			return this.get(k);
    		}
    	},

    	_set: function(path, oi) {
    		var firstValue = _.first(path.split('.'));
    		var self = this;

    		if (Ember.get(this, '_prefix') == null)
    			this.get(firstValue);

    		if (path != '_sdbProps' && _.includes(this.get('_sdbProps'), firstValue)) {
    			var od = getPlainObject(this._get(path));
    			oi = getPlainObject(oi);
    			var p = path.split('.');
    			var utils = Utils(this);
    			utils.removeChildren(path);
    			var op = {
    				p: p,
    				od: od,
    				oi: oi
    			};

    			if (od == null)
    				delete op.od;

    			if (op.oi != op.od) {
    				this.get('doc').submitOp([op], function(err) {
    					self.get('_root', true).trigger('submitted', err);
    				});
    			}

    			return this.useSubs(oi,path);
    		} else {
    			return this.set(path, oi, true)

    		}
    	}

    });
    var SDBBase = Ember.Object.extend(Ember.Evented, GetterSettersMixin, {

    	_isSDB: true,

    	notifyProperties: function notifyProperties(props) {
    		var self = this;
    		_.forEach(props, function(prop) {
    			self.notifyPropertyChange(prop)
    		})
    		return this
    	},

    	notifyDidProperties: function notifyDidProperties(props) {
    		var self = this;
    		_.forEach(props, function(prop) {
    			self.propertyDidChange(prop)
    		})
    		return this
    	},

    	notifyWillProperties: function notifyWillProperties(props) {
    		var self = this;
    		_.forEach(props, function(prop) {
    			self.propertyWillChange(prop)
    		})
    		return this
    	},

    	deleteProperty: function deleteProperty(k) {
    		var doc = this.get('doc');
    		var p = k.split('.');
    		var od = this.get(k);
    		doc.submitOp([
    			{
    				p: p,
    				od: od
    			}
    		]);
    	},

    	setProperties: function setProperties(obj) {
    		var sdbProps = this.get('_sdbProps');
    		var self = this;
    		var SDBpropsFromObj = _.filter(_.keys(obj), function(key) {
    			self.get(key);
    			return _.includes(sdbProps, key)
    		});
    		var nonSDB = _.reject(_.keys(obj), function(key) {
    			return _.includes(sdbProps, key)
    		});
    		this._super(_.pick(obj, nonSDB));
    		_.forEach(SDBpropsFromObj, function(key) {
    			self.set(key, obj[key])
    		});
    	}
    });

    SDBBase = SDBBase.extend(UseSubsMixin);
    subs.object = SDBBase.extend(SubMixin);
    subs.array = SDBSubArray(SubMixin, GetterSettersMixin).extend(UseSubsMixin);

    __exports__["default"] = SDBBase
  });
define("ember-share/models/model", 
  ["./utils","./base","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Utils = __dependency1__["default"];
    var SDBBase = __dependency2__["default"];

    //
    //   ShareDb Ember Model Class
    //
    //        extends Base.
    //        this is model has a recursive structure, getting an inner object or array will return
    //        a sub object which is conencted to its parent.
    //        an over view of the entire structure can be found here:
    //        https://www.gliffy.com/go/share/sn1ehtp86ywtwlvhsxid
    //
    //

    var SDBRoot = SDBBase.extend({
    	unload: function() {
    		return this.get('_store').unload(this.get('_type'), this);
    	},

    	id: Ember.computed.oneWay('doc.id'),

    	_childLimiations: (function() {
    		return []
    	}).property(),

    	_root: (function() {
    		return this
    	}).property(),

    	_children: (function() {
    		return {}
    	}).property(),

    	_sdbProps: (function () {
    		return []
    	}).property(),

    	setOpsInit: (function() {
    		var doc = this.get('doc', true);
    		var utils = Utils(this);

    		doc.on('before op', utils.beforeAfter("Will"));
    		doc.on('after op', utils.beforeAfter("Did"));
    		doc.on('op', utils.beforeAfter("Did"));

    	}).observes('doc').on('init')
    });

    // var set = Ember.Object.prototype.set;
    // var get = Ember.Object.prototype.get;
    //
    // Ember.Object.prototype.get = function (key, selfCall) {
    //   var firstValue = _.first(key.split('.'));
    //   var secondValue = key.split('.')[1]
    //   if (!selfCall &&
    //       Ember.get(this, 'content._isSDB', true) &&
    //       ((firstValue != 'content' && Ember.get(this, 'content.' + firstValue) != null) ||
    //       (firstValue == 'content' && secondValue != null)
    //     )
    //   ) {
    //     var content = Ember.get(this, 'content');
    //     if (firstValue == 'content') key = key.split('.').slice(1).join('.');
    //     return content.get(key)
    //   }
    //   else
    //   // if ((key != '_sdbProps') && (key != 'doc')console.log(key);
    //     return get.call(this, key)
    // };
    //
    // Ember.Object.prototype.set = function(key, value, selfCall) {
    // 	var firstValue = _.first(key.split('.'));
    // 	var secondValue = key.split('.')[1]
    // 	if (!selfCall && this.get('content._isSDB') && ((firstValue != 'content' && this.get('content.' + firstValue) != null) || (firstValue == 'content' && secondValue != null))) {
    // 		var content = this.get('content');
    // 		if (firstValue == 'content')
    // 			key = key.split('.').slice(1).join('.');
    // 		return content.set(key, value)
    // 	} else
    // 		return set.call(this, key, value)
    // };

    __exports__["default"] = SDBRoot
  });
define("ember-share/models/sub-array", 
  ["./sub-mixin","./base","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var SubMixin = __dependency1__["default"];
    var SDBBase = __dependency2__["default"];

    var allButLast = function(arr) {
    	return arr.slice(0, arr.length - 1)
    };

    //
    //   Sub Array Class
    //
    //        this is An Ember Array Proxy, uses sub mixin and 'Use Sub Mixin'
    //
    //

    __exports__["default"] = function(SubMixin, GetterSettersMixin) {
    	return Ember.ArrayProxy.extend(Ember.Evented, SubMixin, GetterSettersMixin, {

    		_isArrayProxy: true,

    		arrayContentDidChange: function(startIdx, removeAmt, addAmt) {
    			var _removeAmt = (removeAmt == null)
    				? 0
    				: removeAmt * -1;
    			if (!!(_removeAmt + (addAmt == null)
    				? 0
    				: addAmt))
    				Ember.get(this, 'content').propertyDidChange('lastObject');
    			return this._super.apply(this, arguments)
    		},

    		arrayContentWillChange: function(startIdx, removeAmt, addAmt) {
    			var children = Ember.get(this, '_children');
    			var childrenKeys = Object.keys(children);
    			var prefix = Ember.get(this, '_prefix');
    			var self = this;
    			var replaceLastIdx = function(str, idx) {
    				var arr = allButLast(str.split('.'))
    				return arr.join('.') + '.' + idx
    			}
    			var _removeAmt = (removeAmt == null) ? 0 : removeAmt * -1;
    			addAmt = (addAmt == null) ? 0 : addAmt;
    			if (!!(_removeAmt + addAmt))
    				Ember.get(this, 'content').propertyWillChange('lastObject');
    			childrenKeys = _.reduce(childrenKeys, function(result, key) {
    				if (allButLast(key.split('.')).join('.') == prefix)
    					result.push(key);
    				return result
    			}, []);
    			_.forEach(childrenKeys, function(childKey) {
    				var idx = +_.last(childKey);
    				if (!isNaN(idx))
    					if (addAmt && (startIdx <= idx) || removeAmt && (startIdx < idx)) {
    						var newIdx = idx + _removeAmt + addAmt;
    						var child = children[childKey];
    						delete children[childKey];
    						var tempChild = {};
    						tempChild[replaceLastIdx(childKey, newIdx)] = child
    						_.assign(children, tempChild);
    						Ember.set(child, '_idx', newIdx);
    					};
    			});
    			return this._super.apply(this, arguments)
    		},

    		// useSubs:

    		replaceContent: function(content, noSet) {
    			var removeAmt,
    				addAmt,
    				prefix = Ember.get(this, '_prefix');

    			var children = Ember.get(this, '_children');
    			_.forEach(this.toArray(), function(value, index) {
    				var child = children[prefix + '.' + index];
    				if (child != null)
    					if (content[index] != null)
    						child.replaceContent(content[index], true)
    					else {
    						delete children[prefix + '.' + index]
    						child.destroy()
    					}
    			});

    			if (!noSet)
    				this._set(prefix, content);

    			Ember.set(this, 'content', content);
    			return this
    		},

    		_submitOp: function(p, li, ld) {
    			var path = this.get('_prefix').split('.');
    			var op = {
    				p: path.concat(p)
    			};

    			if (li != null)
    				op.li = li;

    			if (ld != null)
    				op.ld = ld;

    			if (li != null || ld != null) {
    				// console.log(op);
    				return this.get('doc').submitOp([op]);

    			}
    		},

    		objectAt: function(idx) {
    			var content = this._super(idx);
    			var prefix = this.get('_prefix');
    			return this.useSubs(content, prefix, idx)
    		},

    		toJson: function() {
    			var self = this;
    			return _.map(this.toArray(), function(value) {
    				if ((typeof value == 'string') || (typeof value == 'number'))
    					return value
    				else
    					return value.toJson()
    			})
    		},

    		_replace: function(start, len, objects) {
    			this.arrayContentWillChange(start, len, objects.length);
    			var iterationLength = (len > objects.length)
    				? len
    				: objects.length;
    			for (var i = 0; i < iterationLength; i++) {
    				var newIndex = i + start;
    				var obj = objects.objectAt(i);
    				this._submitOp(newIndex, obj, (len > i
    					? this.objectAt(newIndex)
    					: null))
    			}
    			this.arrayContentDidChange(start, len, objects.length);
    			return this //._super(start, len, objects)
    		}
    	});
    }
  });
define("ember-share/models/sub-mixin", 
  ["./utils","../attr","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var Utils = __dependency1__["default"];
    var attrs = __dependency2__["default"];

    var allButLast = function(arr) {
    	return arr.slice(0, arr.length - 1)
    };

    //
    //   Sub Mixin
    //
    //        All subs use this mixin (Object and Array)
    //
    //

    __exports__["default"] = Ember.Mixin.create({

    	_children: (function() {
    		return {}
    	}).property(),

    	_sdbProps: (function() {
    		return []
    	}).property(),

    	_subProps: (function() {
    		return []
    	}).property(),

    	createInnerAttrs: (function() {
    		var tempContent = Ember.get(this, 'tempContent');
    		var self = this;
    		var attr = attrs('_subProps');
    		var keys = [];

    		_.forEach(tempContent, function(value, key) {
    			keys.push(key);
    			Ember.defineProperty(self, key, attr());
    		})

    		Ember.get(this, '_subProps').addObjects(keys);
    		delete this['tempContent'];
    	}).on('init'),

    	activateListeners: (function() {
    		var utils = Utils(this);
    		var doc = this.get('doc');

    		this.on('before op', utils.beforeAfterChild("Will"));
    		this.on('op', utils.beforeAfterChild("Did"));

    	}).on('init'),

    	_fullPath: function(path) {
    		var prefix = Ember.get(this, '_prefix');
    		var idx = Ember.get(this, '_idx');

    		if (prefix) {
    			if (idx != null) {
    				return prefix + '.' + idx + '.' + path
    			} else {
    				return prefix + '.' + path;
    			}
    		} else
    			return path;
    		}
    	,

    	deleteProperty: function(k) {
    		this.removeKey(k);
    		return this._super(this._fullPath(k))
    	},

    	replaceContent: function(content, noSet) {
    		this.notifyWillProperties(this.get('_subProps').toArray());
    		var prefix = this.get('_prefix');
    		var idx = this.get('_idx')
    		var path = (idx == null) ? prefix : prefix + '.' + idx

    		if (!noSet)
    			this._set(path, content);

    		var self = this;
    		var utils = Utils(this);

    		utils.removeChildren(path);
    		if (_.isPlainObject(content))
    			var toDelete = _.difference(Object.keys(this), Object.keys(content))
    		else
    			var toDelete = Object.keys(this);

    		_.forEach(toDelete, function(prop) {
    			delete self[prop]
    		});
    		this.get('_subProps').removeObjects(toDelete);
    		Ember.setProperties(this, {tempContent: content});
    		this.createInnerAttrs();
    		this.notifyDidProperties(this.get('_subProps').toArray());

    		return this
    	},

    	toJson: function() {
    		var idx = Ember.get(this, '_idx'),
    			k = Ember.get(this, '_prefix');
    		var path = (idx == null)
    			? k
    			: (k + '.' + idx);
    		return this.get('doc.data.' + path);
    	},

    	addKey: function (key) {
    		var attr = attrs('_subProps');
    		if (!(this.get('_subProps').indexOf(key) > -1))
    			Ember.defineProperty(this, key, attr());
    		return this
    	},

    	removeKey: function (key) {
    		var attr = attrs('_subProps');
    		var utils = Utils(this);
    		utils.removeChildren(key);
    		this.get('_subProps').removeObject(key);
    		delete this[key];
    		return this
    	}

    	// set: function (path) {
    	// 	debugger
    	// 	if (!path.match('.') && this.get('_subProps'))
    	// 		console.log('d');
    	// },
    	// get: function (key) {
    	// 	debugger
    	// }

    })
  });
define("ember-share/models/subs-handler", 
  ["exports"],
  function(__exports__) {
    "use strict";
    //
    //   Subs Handler
    //
    //        since we have a recursive model structure there is a need for
    //        creating the subs in a common place and then reuse it in its own class.
    //
    //

    __exports__["default"] = {
        object : {},
        array : {}
    }
  });
define("ember-share/models/use-subs-mixin", 
  ["./subs-handler","./utils","exports"],
  function(__dependency1__, __dependency2__, __exports__) {
    "use strict";
    var subs = __dependency1__["default"];
    var Utils = __dependency2__["default"];__exports__["default"] = Ember.Mixin.create({

    	useSubs: function useSubs(content, k, idx) {
    		var utils = Utils(this);

    		if (utils.prefixToChildLimiations(k))
    			return content;

    		if (_.isPlainObject(content)) {
    			content = {
    				tempContent: content
    			};
    			var use = 'object'

    		} else if (_.isArray(content)) {
    			content = {
    				content: content
    			};
    			var use = 'array';
    		}
    		if (use) {
    			var child,
    				_idx;
    			var path = (idx == null) ? k : (k + '.' + idx);
    			var ownPath = Ember.get(this, '_prefix');
    			if ((_idx = Ember.get(this, '_idx')) != null)
    				ownPath += '.' + _idx;
    			if (path == ownPath) {
    				return this;
    			}

    			var children = Ember.get(this, '_children');
    			var childrenKeys = Object.keys(children);

    			if (_.includes(childrenKeys, path))
    				return children[path]
    			else
    				child = {};

    			var sub = subs[use].extend({
    				doc: this.get('doc'),
    				_children: Ember.get(this, '_children'),
    				_prefix: k,
    				_idx: idx,
    				_sdbProps: Ember.get(this, '_sdbProps'),
    				_root: Ember.get(this,'_root')
    			});

    			sub = sub.create(content);

    			child[path] = sub;
    			_.assign(Ember.get(this, '_children'), child);

    			return sub
    		} else
    			return content
    	}
    })
  });
define("ember-share/models/utils", 
  ["exports"],
  function(__exports__) {
    "use strict";
    __exports__["default"] = function(context) {

    	return {

    		isOpOnArray: function(op) {
    			return (op.ld != null) || (op.lm != null) || (op.li != null)
    		},

    		matchingPaths: function(as, bs) {
    			var counter = 0;
    			var higherLength = (as.length > bs.length)
    				? as.length
    				: bs.length
    			while ((as[counter] == '*' || as[counter] == bs[counter]) && counter < higherLength) {
    				counter++
    			}
    			return counter - (as.length / 1000)
    		},

    		prefixToChildLimiations: function (key) {
    			var childLimiations = Ember.get(context, '_root._childLimiations');
    			var prefix = Ember.get(context, '_prefix')

    			if (prefix == null || key.match(prefix))
    				prefix = key
    			else
    				prefix += '.' + key

    			prefix = prefix.split('.');
    			var self = this;
    			return _.some (childLimiations, function (_limit) {
    				var limit = _limit.split('/');
    				return prefix.length == limit.length && Math.ceil(self.matchingPaths(limit, prefix)) == prefix.length
    			})
    		},

    		removeChildren: function (path) {
    			var children = Ember.get(context, '_children');
    			var childrenKeys = Object.keys(children);
    			var prefix = context.get('_prefix');
    			var utils = this;

    			if (prefix != null) {
    				path = prefix + '.' + path
    			}

    			childrenKeys = _.reduce(childrenKeys, function(result, key) {
    				var matches = Math.ceil(utils.matchingPaths(key.split('.'), path.split('.')))
    				if (matches >= path.split('.').length)
    					result.push(key);
    				return result
    			}, []);

    			_.forEach (childrenKeys, function (key) {
    				children[key].destroy()
    				delete children[key]
    			})
    		},

    		comparePathToPrefix: function(path, prefix) {
    			return Boolean(this.matchingPaths(path.split('.'), prefix.split('.')))
    		},

    		cutLast: function(path, op) {
    			var tempPath;
    			if (this.isOpOnArray(op) && !isNaN(+ _.last(path))) {
    				tempPath = _.clone(path);
    				tempPath.pop();
    			}
    			return (tempPath)
    				? tempPath
    				: path
    		},

    		comparePathToChildren: function(path, op) {
    			var utils = this;
    			var children = Ember.get(context, '_children');
    			var childrenKeys = Object.keys(children);
    			var hasChildren = _.some(childrenKeys, function(childKey) {
    				var pathsCounter = utils.matchingPaths(childKey.split('.'), utils.cutLast(path, op))
    				return Math.ceil(pathsCounter) == childKey.split('.').length
    			});
    			return !Ember.isEmpty(childrenKeys) && hasChildren
    		},

    		triggerChildren: function(didWill, op, isFromClient) {
    			var newP = _.clone(op.p);
    			// var children = Ember.get(context, '_children');
    			var children = context.get('_children');
    			var childrenKeys = Object.keys(children);
    			if (Ember.isEmpty(childrenKeys))
    				return;
    			var child,
    				utils = this;
    			var counterToChild = _.mapKeys(children, function(v, childKey) {
    				if (utils.isOpOnArray(op) && !isNaN(+ _.last(childKey.split('.'))))
    					return 0
    				else
    					return utils.matchingPaths(utils.cutLast(childKey.split('.'), op), op.p)
    			});
    			var toNumber = function(strings) {
    				return _.map(strings, function(s) {
    					return + s
    				})
    			};
    			var chosenChild = counterToChild[_.max(toNumber(Object.keys(counterToChild)))]
    			if (didWill == 'Will')
    				chosenChild.trigger('before op', [op], isFromClient);
    			if (didWill == 'Did')
    				chosenChild.trigger('op', [op], isFromClient);
    			}
    		,

    		beforeAfter: function(didWill) {
    			var utils = this;
    			var ex;
    			return function(ops, isFromClient) {
    				// console.log( _.first (ops));

    				if (!isFromClient) {
    					_.forEach(ops, function(op) {
    						// if (didWill == 'Did')
    						// console.log(Ember.get(context,'_prefix') + ' recieved log');
    						if (utils.comparePathToChildren(op.p, op)) {
    							utils.triggerChildren(didWill, op, isFromClient);
    						} else {
    							if (utils.isOpOnArray(op)) {
    								ex = utils.extractArrayPath(op);

    								// console.log(Ember.get(context,'_prefix') + ' perform log');
    								// console.log('op came to parent');
    								context.get(ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
    							} else {
    								context["property" + didWill + "Change"](op.p.join('.'));
    							}
    						}
    					});
    				}
    			};
    		},

    		beforeAfterChild: function(didWill) {
    			var utils = this;
    			var ex,
    				prefix,
    				_idx;
    			return function(ops, isFromClient) {
    				if (((_idx = Ember.get(context, '_idx')) != null) || !isFromClient) {
    					_.forEach(ops, function(op) {

    						if (op.p.join('.') == (prefix = Ember.get(context, '_prefix')) && didWill == 'Did') {
    							if  (op.oi != null) {
    								context.replaceContent(op.oi, true)
    							} else {
    								if (op.od != null) {
    									prefix = prefix.split('.');
    									var key = prefix.pop();
    									var father;
    									if (father = context.get('_children.' + prefix.join('.')))
    										father.removeKey(key);
    								}
    							}
    						} else {
    							var path = (_idx == null)
    								? prefix.split('.')
    								: prefix.split('.').concat(String(_idx));
    							var newP = _.difference(op.p, path);
    							if (utils.comparePathToPrefix(op.p.join('.'), prefix)) {
    								if (utils.isOpOnArray(op) && (Ember.get(context, '_idx') == null)) {

    									var newOp = _.clone(op);
    									newOp.p = newP;
    									ex = utils.extractArrayPath(newOp);

    									if (ex.p == "")
    										context["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
    									else
    										Ember.get(context, ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt);
    									}
    								else {
    									if (newP.join('.') == '') {

    										// delete self from father
    										if (false && _.isEmpty(newOp) && op.od && (op.oi == null) && (_.isEqual(op.od, context.toJson()))) {
    											var keyToRemove = path.pop();
    											if (_.isEmpty(path)) {
    												utils.removeChildren(keyToRemove);
    											}
    											else {
    												var father = context.get('_children')[path.join('.')];
    												father.removeKey (keyToRemove);
    											}
    										}
    										else {
    											context["property" + didWill + "Change"]('content');
    										}
    									}

    									else {

    										if (op.oi && op.od == null)
    											context.addKey(_.first(newP))

    										if (op.od && op.oi == null)
    											context.removeKey(_.first(newP))

    										context["property" + didWill + "Change"](newP.join('.'));
    									}
    								}
    							}
    						}
    					});
    				}
    			}
    		},

    		extractArrayPath: function(op) {
    			return {
    				idx: + _.last(op.p),
    				p: _.slice(op.p, 0, op.p.length - 1).join('.'),
    				addAmt: op.li != null
    					? 1
    					: 0,
    				removeAmt: op.ld != null
    					? 1
    					: 0
    			}
    		}

    	}
    }
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

      // port: 3000,
      // url : 'https://qa-e.optibus.co',
      url : window.location.hostname,
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
          if (this.get('protocol'))
            hostname = this.get('protocol') + '://' + hostname;
          if (this.get("port"))
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
        var ref, path;
        path =  (ref = this._getPathForType(type)) ? ref : type.pluralize()
        path = this._getPrefix(type) + path;
        type = type.pluralize()
        var store = this;
        return store.checkConnection
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
        return this.checkConnection
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
global.EmberShare = require('ember-share');
}(window));