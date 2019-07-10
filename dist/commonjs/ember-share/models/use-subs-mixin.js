"use strict";
var subs = require("./subs-handler")["default"];
var Utils = require("./utils")["default"];exports["default"] = Ember.Mixin.create({

	useSubs: function useSubs(content, k, idx) {
		var utils = Utils(this);

		if (utils.matchChildToLimitations(k))
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
				// doc: this.get('doc'),
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