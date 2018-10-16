"use strict";
var SubMixin = require("./sub-mixin")["default"];
var SDBBase = require("./base")["default"];
var Utils = require("./utils")["default"];

var allButLast = function(arr) {
  return arr.slice(0, arr.length - 1)
};

//
//   Sub Array Class
//
//        this is An Ember Array Proxy, uses sub mixin and 'Use Sub Mixin'
//
//

exports["default"] = function(SubMixin, GetterSettersMixin) {
  return Ember.ArrayProxy.extend(Ember.Evented, SubMixin, GetterSettersMixin, {

    _isArrayProxy: true,

    arrayContentDidChange: function(startIdx, removeAmt, addAmt) {
      var _removeAmt = (removeAmt == null) ? 0 : removeAmt * -1;
      if (!!(_removeAmt + (addAmt == null) ? 0 : addAmt))
        Ember.get(this, 'content').propertyDidChange('lastObject');
      return this._super.apply(this, arguments)
    },

    arrayContentWillChange: function(startIdx, removeAmt, addAmt) {
      var children = Ember.get(this, '_children');
      var childrenKeys = Object.keys(children);
      var prefix = Ember.get(this, '_prefix');
      var self = this;
      var utils = Utils(this);

      var replaceLastIdx = function(str, idx) {
        var arr = allButLast(str.split('.'))
        return arr.join('.') + '.' + idx
      }
      var _removeAmt = (removeAmt == null) ? 0 : removeAmt * -1;
      addAmt = (addAmt == null) ? 0 : addAmt;
      if (!!(_removeAmt + addAmt))
        Ember.get(this, 'content').propertyWillChange('lastObject');
      var childrenKeysReduced = _.reduce(childrenKeys, function(result, key) {
        if (allButLast(key.split('.')).join('.') == prefix)
          result.push(key);
        return result
      }, []);
      _.forEach(childrenKeysReduced, function(childKey) {
        var idx = +_.last(childKey.split("."));
        if (!isNaN(idx)) {
          var child = children[childKey];
          if ((_removeAmt + addAmt == 0)) {
            if (idx >= addAmt) {
              utils.removeChildren(childKey, true);
              Ember.get(self, 'content').propertyWillChange('lastObject');
            }
          } else {
            if (addAmt && (startIdx <= idx) || removeAmt && (startIdx < idx)) {
              var newIdx = idx + _removeAmt + addAmt;
              var newChildKey = replaceLastIdx(childKey, newIdx);
              childrenKeys.filter(function (childKeyA){
                return childKeyA.match(new RegExp('^' + childKey + '\\.'))
              }).forEach(function(grandChildKey) {
                var grandChild = children[grandChildKey];
                var newGrandChildKey = grandChildKey.replace(new RegExp("^" + childKey), newChildKey)
                grandChild.set("_prefix", newGrandChildKey);
                delete children[grandChildKey];
                children[newGrandChildKey] = grandChild
              });
              delete children[childKey];
              var tempChild = {};
              tempChild[replaceLastIdx(childKey, newIdx)] = child;
              _.assign(children, tempChild);
              Ember.set(child, '_idx', newIdx);
            };
          }

        }
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

      if (typeof li != 'undefined')
        op.li = li;

      if (typeof ld != 'undefined')
        op.ld = ld;

      if (li != null || ld != null) {
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
      if (!_.isArray(objects)) {
        objects = [ objects ]
      }
      this.arrayContentWillChange(start, len, objects.length);
      var iterationLength = (len > objects.length)
        ? len
        : objects.length;
      for (var i = 0; i < iterationLength; i++) {
        var newIndex = i + start;
        var obj = objects.objectAt(i);
        if (obj != null)
          obj = obj.toJson == null ? obj : obj.toJson();
        var oldObj = this.objectAt(newIndex);
        if (oldObj != null)
          oldObj = oldObj.toJson == null ? oldObj : oldObj.toJson();
        this._submitOp(newIndex, obj, (len > i
          ? oldObj
          : undefined))
      }
      this.arrayContentDidChange(start, len, objects.length);
      var realContent = this.get('doc.data.' + this.get('_prefix'));
      if ((_.isEqual(objects, realContent)) && !(_.isEqual(this.get('content'),realContent))) {
        this.onChangeDoc()
      }
      return this
    },

    onChangeDoc: (function () {
      // debugger
      // this.set ('content', this.get('doc.data.' + this.get('_prefix')))
      // Ember.run.next (this, function () P{})
      this.replaceContent(this.get('doc.data.' + this.get('_prefix')), true)
    }).observes('doc')
  });
}