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

	id: Ember.computed.reads('doc.id'),

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

	delayOp: (function () {
		return new Promise(function (resolve, reject) {
			return resolve()
		})
	}).property(),

	setOpsInit: (function() {
		var doc = this.get('doc', true);
		var oldDoc = this.get('oldDoc');
		var utils = Utils(this);
		var self = this;


		if (oldDoc) {
			oldDoc.destroy();
		}

		var onComp = function (fn) {
			return function () {
				var args = arguments;
				var that = this;
				self.get('delayOp').then(function () {
					fn.apply(that, args)
				});
			}
		};

		// doc.on('before op', utils.beforeAfter("Will"));
		doc.on('before component', onComp(utils.beforeAfter("Will")));
		doc.on('after component', onComp(utils.beforeAfter("Did")));
		// doc.on('op', utils.beforeAfter("Did"));

		this.set('oldDoc', doc);

	}).observes('doc').on('init'),


	willDestroy: function () {
		var utils = Utils(this);
		this.get('doc').destroy();
		this._super.apply(this, arguments)
		utils.removeChildren();
		console.log('destroying children');
	}

});


export default SDBRoot
