"use strict";
var isOpOnArray = function (op) {
  return (op.ld != null) || (op.lm != null) || (op.li != null)
}

var extractArrayPath = function (op) {
  return {
    idx: _.last(op.p),
    p: _.slice(op.p, 0, op.p.length - 1).join('.'),
    addAmt: op.li != null ? 1 : 0,
    removeAmt: op.ld != null ? 1 : 0
  }
}

exports["default"] = Ember.Object.extend({
  unload: function() {
    return this.get('_store').unload(this.get('_type'), this);
  },
  setOpsInit: (function() {
    var doc;
    var self = this;

    var beforeAfter = function (didWill) {
      return function(ops, isFromClient) {
        if (!isFromClient) {
          _.forEach(ops, function(op) {
            if (isOpOnArray(op)) {
              var ex = extractArrayPath(op);
              self.get(ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
            }
            else
              self["property" +  didWill +  "Change"](op.p.join('.'));
          });
        }
      };
    };

    doc = this.get('doc');
    doc.on('before op', beforeAfter("Will"));
    doc.on('op',beforeAfter("Did"));

  }).on('init')

});