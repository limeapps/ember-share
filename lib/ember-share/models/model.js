import Utils from './utils';
import SDBBase from './base';

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

var SDBRoot = SDBBase.extend({
	unload: function() {
		return this.get('_store').unload(this.get('_type'), this);
	},

	id: Ember.computed.oneWay('doc.id'),

	_childLimiations: (function() {
		return []
	}).property(),

	_root: (function() {
		return this
	}).property(),

	_children: (function() {
		return {}
	}).property(),

	_sdbProps: (function () {
		return []
	}).property(),

	setOpsInit: (function() {
		var doc = this.get('doc', true);
		var utils = Utils(this);

		doc.on('before op', utils.beforeAfter("Will"));
		doc.on('op', utils.beforeAfter("Did"));

	}).observes('doc').on('init')
});

// var set = Ember.Object.prototype.set;
// var get = Ember.Object.prototype.get;
//
// Ember.Object.prototype.get = function (key, selfCall) {
//   var firstValue = _.first(key.split('.'));
//   var secondValue = key.split('.')[1]
//   if (!selfCall &&
//       Ember.get(this, 'content._isSDB', true) &&
//       ((firstValue != 'content' && Ember.get(this, 'content.' + firstValue) != null) ||
//       (firstValue == 'content' && secondValue != null)
//     )
//   ) {
//     var content = Ember.get(this, 'content');
//     if (firstValue == 'content') key = key.split('.').slice(1).join('.');
//     return content.get(key)
//   }
//   else
//   // if ((key != '_sdbProps') && (key != 'doc')console.log(key);
//     return get.call(this, key)
// };
//
// Ember.Object.prototype.set = function(key, value, selfCall) {
// 	var firstValue = _.first(key.split('.'));
// 	var secondValue = key.split('.')[1]
// 	if (!selfCall && this.get('content._isSDB') && ((firstValue != 'content' && this.get('content.' + firstValue) != null) || (firstValue == 'content' && secondValue != null))) {
// 		var content = this.get('content');
// 		if (firstValue == 'content')
// 			key = key.split('.').slice(1).join('.');
// 		return content.set(key, value)
// 	} else
// 		return set.call(this, key, value)
// };

export default SDBRoot
