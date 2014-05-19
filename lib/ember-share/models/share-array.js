import ShareProxy from './share-proxy';

export default Ember.Object.extend(Ember.MutableArray, {
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
