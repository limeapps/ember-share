"use strict";
var UseSubsMixin = require("./use-subs-mixin")["default"];
var SubMixin = require("./sub-mixin")["default"];
var SDBSubArray = require("./sub-array")["default"];
var subs = require("./subs-handler")["default"];
var Utils = require("./utils")["default"];

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
			utils.removeChildren(path, true);
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
		var od = getPlainObject(this.get(k));
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
	},

});

SDBBase = SDBBase.extend(UseSubsMixin);
subs.object = SDBBase.extend(SubMixin);
subs.array = SDBSubArray(SubMixin, GetterSettersMixin).extend(UseSubsMixin);

exports["default"] = SDBBase