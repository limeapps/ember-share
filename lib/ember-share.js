import ShareTextMixin from 'ember-share/mixins/share-text';
import ShareProxy from 'ember-share/models/share-proxy';
import ShareArray from 'ember-share/models/share-array';
import Store from 'ember-share/store';
import Utils from 'ember-share/utils';
import attr from 'ember-share/attr';

Ember.onLoad('Ember.Application', function(Application) {
	Application.initializer({
		name: 'ember-share',
		initialize : function(container, application){
			application.register('ShareStore:main', application.Store || Store);
			container.lookup('ShareStore:main');
		}
	});
	Application.initializer({
		name: 'injectStoreS',
		before : 'ember-share',
		initialize : function(container, application) {
			// application.register('model:share-proxy',ShareProxy);
			// application.register('model:share-array',ShareArray);
			application.inject('controller', 'ShareStore', 'ShareStore:main');
			application.inject('route', 'ShareStore', 'ShareStore:main');
		}
	});
});


export  {
	 attr,
   ShareTextMixin,
   ShareProxy,
   ShareArray,
   Store,
   Utils
};
