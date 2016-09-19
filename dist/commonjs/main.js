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
			application.register('ShareStore:main', application.Store || Store);
			container.lookup('ShareStore:main');
		}
	});
	Application.initializer({
		name: 'injectStoreS',
		before : 'ember-share',
		initialize : function(container, application) {
			application.register('model:share-proxy',ShareProxy);
			application.register('model:share-array',ShareArray);
			application.inject('controller', 'ShareStore', 'ShareStore:main');
			application.inject('route', 'ShareStore', 'ShareStore:main');
		}
	});
});


exports.ShareTextMixin = ShareTextMixin;
exports.ShareProxy = ShareProxy;
exports.ShareArray = ShareArray;
exports.Store = Store;
exports.Utils = Utils;