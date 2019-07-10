import ShareTextMixin from 'ember-share/mixins/share-text';
import ShareProxy from 'ember-share/models/model';
import Store from 'ember-share/store';
import Utils from 'ember-share/utils';
import attrFunc from 'ember-share/attr';
import belongsTo from 'ember-share/belongs-to';

var attr =  attrFunc('_sdbProps')

export  {
   ShareTextMixin,
   ShareProxy,
	 belongsTo,
	 Store,
	 Utils,
	 attr
};
