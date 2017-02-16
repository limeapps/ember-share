"use strict";
exports["default"] = function(DS, modelName) {
    // var options, type;
    // options = {};
    // type = null;
    // _.forEach(arguments, function(arg) {
    //   if (_.isPlainObject(arg)) {
    //     return options = arg;
    //   } else {
    //     if (_.isString(arg)) {
    //       return type = null;
    //     }
    //   }
    // });
    var store = this.originalStore;
    return Ember.computed({
      get: function(k) {
        var ref;

        return store.findRecord(modelName, this.get(ref = "doc.data." + k));
        // return  != null ? ref : Ember.get(options, 'defaultValue'));
      },
      set: function(p, oi, isFromServer) {
        return oi;
      }
    });
  }


// attr: ->
//   options = {}; type = null
//   _.forEach arguments, (arg) ->
//     if _.isPlainObject(arg)
//       options = arg
//     else
//       if _.isString arg
//         type = null
//
//   Ember.computed
//     get: (k) ->
//       @get "doc.data.#{k}" ? Ember.get(options, 'defaultValue')
//     set: (p, oi, isFromServer) ->
//       if type?
//         oi = window[type.toUpperCase type] oi
//       od = @get p
//       p = p.split '.'
//       @get('doc').submitOp [{p,od,oi}]
//       oi