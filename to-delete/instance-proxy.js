import Utils from './utils';

var embObjToJson = function (emberObj) {
  return JSON.parse(JSON.stringify(emberObj))
};

var isNumber = function(n) {
  return !isNaN(+n);
};

export default Ember.ObjectProxy.extend({

  // _copyContent: (function () {
  //   var doc = this.get('parent.doc');
  //   if (!doc) return;
  //   this.set('content', _.cloneDeep(this.get('content')), true);
  // }).on('init'),

  _notifyContent: (function() {
    var doc, parent, path, proxy;
    doc = this.get('parent.doc');
    if (!doc) {
      return;
    }
    parent = this.get('parent');
    proxy = this;
    path = this.get('path.parent');
    if (this.get('path.inner')) {
      path += '.' + this.get('path.inner');
    }
    parent.on("arr-" + path, function(p, idx, removeAmt, addAmt, op) {
      var newOp;
      newOp = _.clone(p);
      newOp.pop();
      newOp = newOp.join('.').replace(path, 'content');
      if (removeAmt && !addAmt) {
        return proxy.get(newOp).removeAt(+idx);
      } else {
        if (addAmt && !removeAmt) {
          return proxy.get(newOp).insertAt(+idx, (op.li));
        } else {
          return proxy.get(newOp).replace(+idx, removeAmt, [(op.li)]);
        }
      }
    });
    parent.on("set-" + path, function(p, op) {
      var idx, insert, newOp, origPath;
      newOp = _.clone(p);
      //  check if there is an array inside the path
      if ((idx = _.find(newOp, isNumber))) {
        _.some(_.clone(newOp).reverse(), function(p) {
          newOp.pop();
          return +p === +idx;
        });
        origPath = _.clone(newOp);
        newOp = newOp.join('.').replace(path, 'content');
        insert = _.cloneDeep((_.get(doc.data, origPath.join('.')))[+idx]);
        return proxy.get(newOp).replace(+idx, 1, insert);
      } else {
        if (op.oi != null) {
          newOp = p.join('.').replace(path, 'content');
          return proxy.set(newOp,_.cloneDeep( _.get(doc.data, p.join('.'))), true);
        }
        // delete
        else {
          if (path == p.join('.'))
            proxy.destroy()
          else {
            var lastKey = _.last(p);
            var tempContent = proxy.get(newP.substr(0, (lastKey.length + 1)));
            delete tempContent[lastKey]
          }
        }
      }
    });
  }).on('init'),

  set: function (k, oi, fromServer) {
    // if (this.get('allwaysOp') && !k.match('content')) k = 'content.' + k;
    if (k.match('content') && !fromServer) {
      var path = this.get('path');
      // var od;
      // try {
      //   od = embObjToJson(this.get(k) );
      // }
      // catch(err) {
      //   od = this.get(k);
      // }
      var p = [path.parent];
      if (path.inner != null) p.push(path.inner);
      if (k.split('content.')[1] != null) p.push(k.split('content.')[1]);

      this.get('parent').set(p.join('.'),oi)
      // this.get('parent.doc').submitOp([
      //   {
      //     p: p,
      //     od: od,
      //     oi: oi
      //   }
      // ]);
      // // return oi;

    }
    return this._super(k, oi)
  }

});
