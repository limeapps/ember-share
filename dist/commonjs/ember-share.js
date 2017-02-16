"use strict";
var ShareTextMixin = require("ember-share/mixins/share-text")["default"];
var ShareProxy = require("ember-share/models/model")["default"];
var Store = require("ember-share/store")["default"];
var Utils = require("ember-share/utils")["default"];
var attrFunc = require("ember-share/attr")["default"];
var belongsTo = require("ember-share/belongs-to")["default"];

var attr =  attrFunc('_sdbProps')

exports.ShareTextMixin = ShareTextMixin;
exports.ShareProxy = ShareProxy;
exports.belongsTo = belongsTo;
exports.Store = Store;
exports.Utils = Utils;
exports.attr = attr;