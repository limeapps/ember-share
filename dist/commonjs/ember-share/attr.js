"use strict";
var sillyFunction = function (value) {return value};

exports["default"] = function(sdbProps) {
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
					return type = arg.charAt(0).toUpperCase() + arg.slice(1);
				}
			}
		});
		if (type != null && window[type] != null) {
			var transfromToType = function (value) {
				var newValue = new window[type](value)
					if (type == 'Date')
						return newValue
					else
						return newValue.valueOf()
			};
		} else {
			var transfromToType = sillyFunction
		}

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
					return transfromToType(this._get(k, true))
				else
					return transfromToType(this._get(this._fullPath(k)))

			},
			set: function(k, v, isFromServer) {
				// return this._super(p, oi)
				var path = (k == null) ? this.get('_prefix') : ((k == '_idx' || !this._fullPath)  ? k : this._fullPath(k));
				return this._set(path, v)

			}
		});
	}
}