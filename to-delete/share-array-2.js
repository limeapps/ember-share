export default Ember.ArrayProxy.extend ({
  _submitOp: function (p, li, ld) {
    var path = this.get('path').split('.');
    var op = {p: path.concat(p)} ;
    if (li != null) op.li = li;
    if (ld != null) op.ld = ld;
    if (li != null || li != null)
      this.get('parent.doc').submitOp([op]);
  },
  arrayContentDidChange: function (startIdx, removeCount, additionCount) {
    var additions = [], removes = [];
    var self = this;


    if (additionCount && !removeCount) {
      for (var i = 0; i < additionCount; i++) {
        var newIndex = +startIdx + i;
        this._submitOp(+startIdx, self.objectAt(newIndex), null )
      }

    }
    return this._super(+startIdx, removeCount, additionCount)
  },
  arrayContentWillChange: function (startIdx, removeCount, additionCount) {
    var additions = [], removes = [];
    // var path = this.get('path');
    var self = this;


    if (!additionCount && removeCount) {
      for (var i = 0; i < removeCount; i++) {
        var newIndex = +startIdx + i;
        this._submitOp(+newIndex, null, self.objectAt(newIndex) )
      }

    }
    return this._super(+startIdx, removeCount, additionCount)
  }
})
