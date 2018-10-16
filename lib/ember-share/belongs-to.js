export default {
  belongsToShare: function (DS, modelName) {
      var store = this.ShareStore;

      return Ember.computed({
        get: function(k) {
          var ref;
          return store.findRecord(modelName, this.get("doc.data." + k))
        },
        set: function(p, oi, isFromServer) {
          return oi;
        }
      });
  },

  belongsTo: function(DS, modelName) {
      var store = this.originalStore;
      return Ember.computed({
        get: function(k) {
          var ref;

          return store.findRecord(modelName, this.get(ref = "doc.data." + k));
        },
        set: function(p, oi, isFromServer) {
          return oi;
        }
      });
    }

}
