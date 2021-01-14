export default function (context) {
  return {

    isOpOnArray(op) {
      return (op.ld != null) || (op.lm != null) || (op.li != null);
    },

    matchingPaths(as, bs) {
      let counter = 0;
      const higherLength = (as.length > bs.length)
        ? as.length
        : bs.length;
      while ((as[counter] == '*' || as[counter] == bs[counter]) && counter < higherLength) {
        counter++;
      }
      return counter - (as.length / 1000);
    },

    matchChildToLimitations(key) {
      const childLimiations = Ember.get(context, '_root._childLimiations');
      let prefix = Ember.get(context, '_prefix');

      if (prefix == null || key.match(prefix)) prefix = key;
      else prefix += `.${key}`;

      prefix = prefix.split('.');
      const self = this;
      return _.some(childLimiations, (_limit) => {
        const limit = _limit.split('/');
        return prefix.length == limit.length && Math.ceil(self.matchingPaths(limit, prefix)) == prefix.length;
      });
    },

    prefixToChildLimiations(key) {
      const childLimiations = Ember.get(context, '_root._childLimiations');
      let prefix = Ember.get(context, '_prefix');

      if (prefix == null || key.match(prefix)) prefix = key;
      else prefix += `.${key}`;

      prefix = prefix.split('.');
      const self = this; let
        limiationsArray;

      const relevantLimitIndex = this.findMaxIndex(limiationsArray = _.map(childLimiations, (_limit) => {
        const limit = _limit.split('/');
        const result = Math.ceil(self.matchingPaths(limit, prefix));
        return result < limit.length ? 0 : result;
      }));
      if (relevantLimitIndex >= 0 && limiationsArray[relevantLimitIndex] > 0) {
        const relevantLimit = childLimiations[relevantLimitIndex].split('/');
        let orignalPrefix;
        const result = prefix.slice(0, Math.ceil(self.matchingPaths(relevantLimit, prefix)));
        if (orignalPrefix = Ember.get(context, '_prefix')) {
          orignalPrefix = orignalPrefix.split('.');
          return result.slice(orignalPrefix.length).join('.');
        } return result.join('.');
      }
      return key;
    },

    removeChildren(path, includeSelf) {
      const children = Ember.get(context, '_children');
      let childrenKeys = Object.keys(children);
      const prefix = context.get('_prefix');
      const utils = this;

      if ((prefix != null) && path && path.indexOf(prefix) != 0) {
        path = `${prefix}.${path}`;
      }

      if (path) {
        childrenKeys = _.reduce(childrenKeys, (result, key) => {
          if (key == path) {
            if (includeSelf) result.push(key);
          } else if (key.indexOf(path) == 0) result.push(key);
          return result;
        }, []);
      }

      _.forEach(childrenKeys, (key) => {
        children[key].removeListeners();
        children[key].destroy();
        delete children[key];
      });
    },

    comparePathToPrefix(path, prefix) {
      return Boolean(Math.ceil(this.matchingPaths(path.split('.'), prefix.split('.'))));
    },

    cutLast(path, op) {
      let tempPath;
      if (this.isOpOnArray(op) && !isNaN(+_.last(path))) {
        tempPath = _.clone(path);
        tempPath.pop();
      }
      return (tempPath) || path;
    },

    comparePathToChildren(path, op) {
      const utils = this;
      const children = Ember.get(context, '_children');
      const childrenKeys = Object.keys(children);
      const hasChildren = _.some(childrenKeys, (childKey) => {
        const pathsCounter = utils.matchingPaths(childKey.split('.'), utils.cutLast(path, op));
        return Math.ceil(pathsCounter) == childKey.split('.').length;
      });
      return !Ember.isEmpty(childrenKeys) && hasChildren;
    },

    triggerChildren(didWill, op, isFromClient) {
      const newP = _.clone(op.p);
      // var children = Ember.get(context, '_children');
      const children = context.get('_children');
      const childrenKeys = Object.keys(children);
      if (Ember.isEmpty(childrenKeys)) return;
      let child;


      const utils = this;
      const counterToChild = _.mapKeys(children, (v, childKey) => {
        if (utils.isOpOnArray(op) && !isNaN(+_.last(childKey.split('.')))) return 0;
        return utils.matchingPaths(utils.cutLast(childKey.split('.'), op), utils.cutLast(op.p, op));
      });
      const toNumber = function (strings) {
        return _.map(strings, s => +s);
      };
      const chosenChild = counterToChild[_.max(toNumber(Object.keys(counterToChild)))];
      if (didWill == 'Will') chosenChild.trigger('before op', [op], isFromClient);
      if (didWill == 'Did') chosenChild.trigger('op', [op], isFromClient);
    },

    beforeAfter(didWill) {
      const utils = this;
      let ex;
      return function (ops, isFromClient) {
        if (!isFromClient) {
          _.forEach(ops, (op) => {
            if (utils.comparePathToChildren(op.p, op)) {
              utils.triggerChildren(didWill, op, isFromClient);
            } else if (utils.isOpOnArray(op)) {
              ex = utils.extractArrayPath(op);

              context.get(ex.p)[`arrayContent${didWill}Change`](ex.idx, ex.removeAmt, ex.addAmt);
            } else {
              context[`property${didWill}Change`](utils.prefixToChildLimiations(op.p.join('.')));
            }
          });
        }
      };
    },

    beforeAfterChild(didWill) {
      const utils = this;
      let ex;
      let prefix;
      let _idx;
      return function (ops, isFromClient) {
        if (((_idx = Ember.get(context, '_idx')) != null) || !isFromClient) {
          _.forEach(ops, (op) => {
            if (op.p.join('.') == (prefix = Ember.get(context, '_prefix')) && didWill == 'Did') {
              if (op.oi != null) {
                const content = context.get(`_root.doc.data.${prefix}`);
                context.replaceContent(content, true);
              } else if (op.od != null) {
                const fatherPrefix = prefix.split('.');
                const key = fatherPrefix.pop();
                var father;
                if (!_.isEmpty(fatherPrefix) && (father = context.get(`_children.${fatherPrefix.join('.')}`))) father.removeKey(key);
                else context.get('_root').propertyDidChange(prefix);
              }
            } else {
              const path = (_idx == null)
                ? prefix.split('.')
                : prefix.split('.').concat(String(_idx));
              const newP = _.difference(op.p, path);
              if (utils.comparePathToPrefix(op.p.join('.'), prefix)) {
                if (utils.isOpOnArray(op) && (Ember.get(context, '_idx') == null)) {
                  var newOp = _.clone(op);
                  newOp.p = newP;
                  ex = utils.extractArrayPath(newOp);

                  if (ex.p == '') context[`arrayContent${didWill}Change`](ex.idx, ex.removeAmt, ex.addAmt);
                  else Ember.get(context, ex.p)[`arrayContent${didWill}Change`](ex.idx, ex.removeAmt, ex.addAmt);
                } else if (newP.join('.') == '') {
                  // delete self from father
                  if (_.isEmpty(newOp) && op.od && (op.oi == null) && (_.isEqual(op.od, context.toJson()))) {
                    const keyToRemove = path.pop();
                    if (_.isEmpty(path)) {
                      utils.removeChildren(keyToRemove, true);
                    } else {
                      var father = context.get('_children')[path.join('.')];
                      father.removeKey(keyToRemove);
                    }
                  } else {
                    // context["property" + didWill + "Change"]('content');
                  }
                } else {
                  if (op.oi && op.od == null) {
                    context.addKey(_.head(newP));
                  }

                  if (op.od && op.oi == null) {
                    context.notifyPropertyChange(utils.prefixToChildLimiations(newP.join('.')));
                    if (newP.length === 1) {
                      context.removeKey(_.head(newP));
                    }
                  } else {
                    context[`property${didWill}Change`](utils.prefixToChildLimiations(newP.join('.')));
                  }
                }
              }
            }
          });
        }
      };
    },

    findMaxIndex(arr) {
      return arr.indexOf(_.max(arr));
    },

    extractArrayPath(op) {
      return {
        idx: +_.last(op.p),
        p: _.slice(op.p, 0, op.p.length - 1).join('.'),
        addAmt: typeof op.li !== 'undefined'
          ? 1
          : 0,
        removeAmt: typeof op.ld !== 'undefined'
          ? 1
          : 0,
      };
    },

  };
}
