import Utils from './utils';
import attrs from '../attr';

var allButLast = function(arr) {
	return arr.slice(0, arr.length - 1)
};

//
//   Sub Mixin
//
//        All subs use this mixin (Object and Array)
//
//

export default Ember.Mixin.create({

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
