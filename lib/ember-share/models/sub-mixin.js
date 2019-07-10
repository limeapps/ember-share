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

	doc: Ember.computed.reads('_root.doc'),

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

	beforeFn: (function (){return []}).property(),
	afterFn: (function (){return []}).property(),

	activateListeners: (function() {
		var utils = Utils(this);

		var beforeFn = utils.beforeAfterChild("Will");
		var afterFn = utils.beforeAfterChild("Did");

		if (this.has('before op')) {
			this.off('before op', this.get('beforeFn').pop())
		}
		if (this.has('op')) {
			this.off('op', this.get('afterFn').pop())
		}
		this.on('before op', beforeFn);
		this.on('op', afterFn);

		this.get('beforeFn').push(beforeFn);
		this.get('afterFn').push(afterFn);

	// }).on('init'),
	}).observes('doc').on('init'),

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

		if (_.isEmpty(Object.keys(this))) {
			Ember.setProperties(this, {tempContent: content});
			this.createInnerAttrs();

			var notifyFather = function (prefixArr, keys) {
				if (_.isEmpty(prefixArr))
					self.get('_root').notifyPropertyChange(keys.join('.'))
				else {
					var child = self.get['_children'][prefixArr.join('.')]
					if (child != null)
						child.notifyPropertyChange(prefixArr.join('.') + '.' + keys.join('.'))
					else
						keys.push(prefixArr.pop());
						notifyFather(prefixArr, keys);
				}
			};
			var prefixArr = prefix.split('.')
			var key = prefixArr.pop()

			notifyFather(prefixArr, [key]);
		}
		else {
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
		}

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
		utils.removeChildren(key, true);
		this.get('_subProps').removeObject(key);
		delete this[key];
		return this
	},

	removeListeners: function () {
		this.off('before op', this.get('beforeFn'))
		this.off('op', this.get('afterFn'))

	}

})
