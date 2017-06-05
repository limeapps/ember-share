"use strict";
exports["default"] = function(context) {

	return {

		isOpOnArray: function(op) {
			return (op.ld != null) || (op.lm != null) || (op.li != null)
		},

		matchingPaths: function(as, bs) {
			var counter = 0;
			var higherLength = (as.length > bs.length)
				? as.length
				: bs.length
			while ((as[counter] == '*' || as[counter] == bs[counter]) && counter < higherLength) {
				counter++
			}
			return counter - (as.length / 1000)
		},

		matchChildToLimitations: function (key) {
			var childLimiations = Ember.get(context, '_root._childLimiations');
			var prefix = Ember.get(context, '_prefix')

			if (prefix == null || key.match(prefix))
				prefix = key
			else
				prefix += '.' + key

			prefix = prefix.split('.');
			var self = this;
			return _.some (childLimiations, function (_limit) {
				var limit = _limit.split('/');
				return prefix.length == limit.length && Math.ceil(self.matchingPaths(limit, prefix)) == prefix.length
			})
		},

		prefixToChildLimiations: function (key) {
			var childLimiations = Ember.get(context, '_root._childLimiations');
			var prefix = Ember.get(context, '_prefix')

			if (prefix == null || key.match(prefix))
				prefix = key
			else
				prefix += '.' + key

			prefix = prefix.split('.');
			var self = this, limiationsArray;

			var relevantLimitIndex = this.findMaxIndex(limiationsArray = _.map (childLimiations, function (_limit) {
				var limit = _limit.split('/');
				var result = Math.ceil(self.matchingPaths(limit, prefix))
				return result < limit.length ? 0 : result
			}));
			if (relevantLimitIndex >= 0 && limiationsArray[relevantLimitIndex] > 0) {
				var relevantLimit = childLimiations[relevantLimitIndex].split('/');
				var orignalPrefix;
				var result = prefix.slice(0, Math.ceil(self.matchingPaths(relevantLimit, prefix)) );
				if (orignalPrefix = Ember.get(context, '_prefix')) {
					orignalPrefix = orignalPrefix.split('.');
					return result.slice(orignalPrefix.length)
				} else
					return result.join('.');
			}
			else {
				return key;
			}

		},

		removeChildren: function (path, includeSelf) {
			var children = Ember.get(context, '_children');
			var childrenKeys = Object.keys(children);
			var prefix = context.get('_prefix');
			var utils = this;

			if ((prefix != null) && path && path.indexOf(prefix) != 0) {
				path = prefix + '.' + path
			}

			if (path) {
				childrenKeys = _.reduce(childrenKeys, function(result, key) {
					var matches = Math.ceil(utils.matchingPaths(key.split('.'), path.split('.')))
					if (includeSelf  && (matches >= path.split('.').length) ||
					   (!includeSelf && (matches >  path.split('.').length)))
						result.push(key);
					return result
				}, []);
			}

			_.forEach (childrenKeys, function (key) {
				children[key].destroy()
				delete children[key]
			})
		},

		comparePathToPrefix: function(path, prefix) {
			return Boolean(Math.ceil(this.matchingPaths(path.split('.'), prefix.split('.'))))
		},

		cutLast: function(path, op) {
			var tempPath;
			if (this.isOpOnArray(op) && !isNaN(+ _.last(path))) {
				tempPath = _.clone(path);
				tempPath.pop();
			}
			return (tempPath)
				? tempPath
				: path
		},

		comparePathToChildren: function(path, op) {
			var utils = this;
			var children = Ember.get(context, '_children');
			var childrenKeys = Object.keys(children);
			var hasChildren = _.some(childrenKeys, function(childKey) {
				var pathsCounter = utils.matchingPaths(childKey.split('.'), utils.cutLast(path, op))
				return Math.ceil(pathsCounter) == childKey.split('.').length
			});
			return !Ember.isEmpty(childrenKeys) && hasChildren
		},

		triggerChildren: function(didWill, op, isFromClient) {
			var newP = _.clone(op.p);
			// var children = Ember.get(context, '_children');
			var children = context.get('_children');
			var childrenKeys = Object.keys(children);
			if (Ember.isEmpty(childrenKeys))
				return;
			var child,
				utils = this;
			var counterToChild = _.mapKeys(children, function(v, childKey) {
				if (utils.isOpOnArray(op) && !isNaN(+ _.last(childKey.split('.'))))
					return 0
				else
					return utils.matchingPaths(utils.cutLast(childKey.split('.'), op), op.p)
			});
			var toNumber = function(strings) {
				return _.map(strings, function(s) {
					return + s
				})
			};
			var chosenChild = counterToChild[_.max(toNumber(Object.keys(counterToChild)))]
			if (didWill == 'Will')
				chosenChild.trigger('before op', [op], isFromClient);
			if (didWill == 'Did')
				chosenChild.trigger('op', [op], isFromClient);
			}
		,

		beforeAfter: function(didWill) {
			var utils = this;
			var ex;
			return function(ops, isFromClient) {
				// console.log( _.first (ops));

				if (!isFromClient) {
					_.forEach(ops, function(op) {
						// if (didWill == 'Did')
						// console.log(Ember.get(context,'_prefix') + ' recieved log');
						if (utils.comparePathToChildren(op.p, op)) {
							utils.triggerChildren(didWill, op, isFromClient);
						} else {
							if (utils.isOpOnArray(op)) {
								ex = utils.extractArrayPath(op);

								// console.log(Ember.get(context,'_prefix') + ' perform log');
								// console.log('op came to parent');
								context.get(ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
							} else {
								context["property" + didWill + "Change"](utils.prefixToChildLimiations(op.p.join('.')));
							}
						}
					});
				}
			};
		},

		beforeAfterChild: function(didWill) {
			var utils = this;
			var ex,
				prefix,
				_idx;
			return function(ops, isFromClient) {
				if (((_idx = Ember.get(context, '_idx')) != null) || !isFromClient) {
					_.forEach(ops, function(op) {

						if (op.p.join('.') == (prefix = Ember.get(context, '_prefix')) && didWill == 'Did') {
							if  (op.oi != null) {
								context.replaceContent(op.oi, true)
							} else {
								if (op.od != null) {
									var fatherPrefix = prefix.split('.');
									var key = fatherPrefix.pop();
									var father;
									if (!_.isEmpty(fatherPrefix) && (father = context.get('_children.' + fatherPrefix.join('.'))))
										father.removeKey(key);
									else
										context.get('_root').propertyDidChange(prefix)
								}
							}
						} else {
							var path = (_idx == null)
								? prefix.split('.')
								: prefix.split('.').concat(String(_idx));
							var newP = _.difference(op.p, path);
							if (utils.comparePathToPrefix(op.p.join('.'), prefix)) {
								if (utils.isOpOnArray(op) && (Ember.get(context, '_idx') == null)) {

									var newOp = _.clone(op);
									newOp.p = newP;
									ex = utils.extractArrayPath(newOp);

									if (ex.p == "")
										context["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt)
									else
										Ember.get(context, ex.p)["arrayContent" + didWill + "Change"](ex.idx, ex.removeAmt, ex.addAmt);
									}
								else {
									if (newP.join('.') == '') {

										// delete self from father
										if (false && _.isEmpty(newOp) && op.od && (op.oi == null) && (_.isEqual(op.od, context.toJson()))) {
											var keyToRemove = path.pop();
											if (_.isEmpty(path)) {
												utils.removeChildren(keyToRemove);
											}
											else {
												var father = context.get('_children')[path.join('.')];
												father.removeKey (keyToRemove);
											}
										}
										else {
											context["property" + didWill + "Change"]('content');
										}
									}

									else {

										if (op.oi && op.od == null)
											context.addKey(_.first(newP))

										if (op.od && op.oi == null)
											context.removeKey(_.first(newP))

										context["property" + didWill + "Change"](utils.prefixToChildLimiations(newP.join('.')));
									}
								}
							}
						}
					});
				}
			}
		},

		findMaxIndex: function (arr) {
			return arr.indexOf(_.max(arr))
		},

		extractArrayPath: function(op) {
			return {
				idx: + _.last(op.p),
				p: _.slice(op.p, 0, op.p.length - 1).join('.'),
				addAmt: op.li != null
					? 1
					: 0,
				removeAmt: op.ld != null
					? 1
					: 0
			}
		}

	}
}