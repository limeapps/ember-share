"use strict";
var Utils = require("./utils")["default"];
var SDBBase = require("./base")["default"];

//
//   ShareDb Ember Model Class
//
//        extends Base.
//        this is model has a recursive structure, getting an inner object or array will return
//        a sub object which is conencted to its parent.
//        an over view of the entire structure can be found here:
//        https://www.gliffy.com/go/share/sn1ehtp86ywtwlvhsxid
//
//

const SDBRoot = SDBBase.extend({
  unload() {
    return this.get('_store').unload(this.get('_type'), this);
  },

  id: Ember.computed.reads('doc.id'),

  _childLimiations: (function () {
    return [];
  }).property(),

  _root: (function () {
    return this;
  }).property(),

  _children: (function () {
    return {};
  }).property(),

  _sdbProps: (function () {
    return [];
  }).property(),

  setOpsInit: (function () {
    const doc = this.get('doc', true);
    const oldDoc = this.get('oldDoc');
    const utils = Utils(this);
    const self = this;


    if (oldDoc) {
      oldDoc.destroy();
    }

    // doc.on('before op', utils.beforeAfter('Will'));
    doc.on('before component', utils.beforeAfter('Will'));
    doc.on('after component', utils.beforeAfter('Did'));
    // doc.on('op', utils.beforeAfter('Did'));

    this.set('oldDoc', doc);
  }).observes('doc').on('init'),


  willDestroy() {
    if (this.get('doc')) {
      this.get('doc').destroy(() => {
        const utils = Utils(this);
        this._super.apply(this, arguments);
        utils.removeChildren();
      });
    }
  },
});


exports["default"] = SDBRoot;