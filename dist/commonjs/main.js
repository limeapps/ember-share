"use strict";
var ShareTextMixin = require("ember-share/mixins/share-text")["default"];
var ShareProxy = require("ember-share/models/share-proxy")["default"];
var ShareArray = require("ember-share/models/share-array")["default"];
var Store = require("ember-share/store")["default"];
var Utils = require("ember-share/utils")["default"];

Ember.onLoad('Ember.Application', function(Application) {
	Application.initializer({
		name: 'ember-share',
		initialize : function(container, application){
			application.register('store:main', application.Store || StoreStore);
			container.lookup('store:main');
		}
	});
	Application.initializer({
		name: 'injectStore',
		before : 'ember-share',
		initialize : function(container, application) {
			application.register('model:share-proxy',ShareProxy);
			application.register('model:share-array',ShareArray);
			application.inject('controller', 'store', 'store:main');
			application.inject('route', 'store', 'store:main');
		}
	});
});


exports.ShareTextMixin = ShareTextMixin;
exports.ShareProxy = ShareProxy;
exports.ShareArray = ShareArray;
exports.Store = Store;
exports.Utils = Utils;