export default function() {
    var options, type;
    options = {};
    type = null;
    _.forEach(arguments, function(arg) {
      if (_.isPlainObject(arg)) {
        return options = arg;
      } else {
        if (_.isString(arg)) {
          return type = null;
        }
      }
    });
    return Ember.computed({
      get: function(k) {
        var ref;
        return this.get((ref = "doc.data." + k) != null ? ref : Ember.get(options, 'defaultValue'));
      },
      set: function(p, oi, isFromServer) {
        var od;
        if (type != null) {
          oi = window[type.toUpperCase(type)](oi);
        }
        od = this.get(p);
        p = p.split('.');
        this.get('doc').submitOp([
          {
            p: p,
            od: od,
            oi: oi
          }
        ]);
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
