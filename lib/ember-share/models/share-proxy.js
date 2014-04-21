var isArray = Array.isArray || function (obj) {
  return obj instanceof Array;
};

export default Ember.Object.extend({
  _context: null,
  _cache: null,
  init: function () {
    this._cache = {}; // allows old value to be seen on willChange event
    var _this = this;
    this._context.on('replace', function (key, oldValue, newValue) {
      _this.propertyWillChange(key);
      _this._cache[key] = _this.wrapObject(key, newValue);
      _this.propertyDidChange(key);
    });
    this._context.on('insert', function (key, value) {
      _this.propertyWillChange(key);
      _this._cache[key] = _this.wrapObject(key, value);
      _this.propertyDidChange(key);
    });
    this._context.on('child op', function (key, op) {
      // handle add operations
      if(key.length === 1 && op.na)
      {
        _this.propertyWillChange(key[0]);
        _this._cache[key] = (_this._cache[key[0]] || _this.get(key[0]) || 0) + op.na;
        _this.propertyDidChange(key[0]);
      }
    });
  },
  unknownProperty: function (key) {
    var value = this._cache[key];
    if (value === undefined) {
      value = this._cache[key] = this.wrapObject(key, this._context.get([key]));
    }
    return value;
  },
  setUnknownProperty: function (key, value) {
    if (this._cache[key] !== value) {
      this.propertyWillChange(key);
      this._cache[key] = this.wrapObject(key, value);
      this._context.set([key], value);
      this.propertyDidChange(key);
    }
  },
  wrapObject: function (key, value) {
    if (value !== null && typeof value === 'object') {
      var type = this.wrapLookup(key,value);
      var factory = this.container.lookupFactory('model:'+type);
      return factory.create({
        _context: this._context.createContextAt(key)
      });
    }
    return value;
  },
  wrapLookup : function(key,value) {
    return value.type || (isArray(value) ? 'share-array' : 'share-proxy');
  },
  willDestroy: function () {
    this._cache = null;
    this._context.destroy();
    this._context = null;
  },
  toJSON: function () {
    return this._context.get();
  },
  incrementProperty: function(key, increment) {
    if (Ember.isNone(increment)) { increment = 1; }
    Ember.assert("Must pass a numeric value to incrementProperty", (!isNaN(parseFloat(increment)) && isFinite(increment)));
    this.propertyWillChange(key);
    this._cache[key] = (this._cache[key] || this.get(key) || 0) + increment;
    if(this._context.get([key]) !== undefined)
    {
      this._context.add([key], increment);
    }
    else
    {
      this._context.set([key], this._cache[key]);
    }
    this.propertyDidChange(key);
    return this._cache[key];
  },
  decrementProperty: function(key, decrement) {
    if (Ember.isNone(decrement)) { decrement = 1; }
    Ember.assert("Must pass a numeric value to decrementProperty", (!isNaN(parseFloat(decrement)) && isFinite(decrement)));
    this.propertyWillChange(key);
    this._cache[key] = (this._cache[key] || this.get(key) || 0) - decrement;
    if(this._context.get([key]) !== undefined)
    {
      this._context.add([key], -1 * decrement);
    }
    else
    {
      this._context.set([key], this._cache[key]);
    }
    this.propertyDidChange(key);
    return this._cache[key];
  },
});
