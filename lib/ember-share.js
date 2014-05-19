import ShareTextMixin from 'ember-share/mixins/share-text';
import ShareProxy from 'ember-share/models/share-proxy';
import ShareArray from 'ember-share/models/share-array';
import Store from 'ember-share/store';
import Utils from 'ember-share/utils';

Ember.onLoad('Ember.Application', function(Application) {
	Application.initializer({
		name: 'ember-share',
		initialize : function(container, application){
			application.register('store:main', application.Store || StoreStore);
			container.lookup('store:main');
		}
	});
	Application.initializer({
		name: 'injectStore',
		before : 'ember-share',
		initialize : function(container, application) {
			application.register('model:share-proxy',ShareProxy);
			application.register('model:share-array',ShareArray);
			application.inject('controller', 'store', 'store:main');
			application.inject('route', 'store', 'store:main');
		}
	});
});


export {
   ShareTextMixin,
   ShareProxy,
   ShareArray,
   Store,
   Utils
};
