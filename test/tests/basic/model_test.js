/*global describe, specify, it, chai */
import isolatedContainer from 'test/isolated-container';
import Store from 'ember-share/store';
import ShareProxy from 'ember-share/models/share-proxy';
import ShareArray from 'ember-share/models/share-array';

describe('Model', function() {
	this.timeout(5000);
	var assert = chai.assert,container,store1,store2;
	it('updates subdoc paths',function(done){
		container = new isolatedContainer(['model:document']);
		store1 = Store.create({
			url:'http://localhost:9999',
			container: container
		});
		var Doc = ShareProxy.extend({
			id: null,
		});
		// compensating for ember container wiring
		store2 = Store.create({
			url:'http://localhost:9999',
			container: container
		});
		ShareArray.reopen({
			container : container
		});
		ShareProxy.reopen({
			container : container,
			_cache : {}
		});
		container.register('model:share-array',ShareArray,{singleton: false});
		container.register('model:share-proxy',ShareProxy,{singleton: false});
		container.register('model:document',Doc,{singleton: false});
		store1.createRecord('document',{title:'Batman',sections:[
			{
				title:'one',
				chapters : [{title:'one.one',figures:[{caption:'acaption',page:10}]},{title:'one.two'},{title:'one.three'}]
			},
			{
				title:'two',
				chapters : [{title:'two.one',figures:[{caption:'acaption',page:20}]},{title:'two.two'},{title:'two.three'}]
			},
			{
				title:'three',
				chapters : [{title:'three.one',figures:[{caption:'acaption',page:30}]},{title:'three.two'},{title:'three.three'}]
			}]
		})
		.then(function(model){
			model.container = container;
			var newId = model.get('id');
			var sec1 = model.get('sections').objectAt(0);
			assert.deepEqual(sec1._context.path,['sections',0]);
			store2.find('document',newId)
			.then(function(otherModel){
				otherModel._cache = {};
				otherModel.container = container;
				model.get('sections').insertAt(0,{
					title:'perface',
					chapters : [{title:'zero.one'},{title:'zero.two'},{title:'zero.three'}]
				});
				setTimeout(function() {
					var sectionOne = otherModel.get('sections').objectAt(1);
					var sectionTwo = otherModel.get('sections').objectAt(2);
					var chapters = sectionOne.get('chapters');
					var chapterOne = chapters.objectAt(0);
					var figureOne = sectionTwo.get('chapters').objectAt(0).get('figures').objectAt(0);
					assert.deepEqual(sectionOne._context.path,['sections',1]);
					console.log(chapterOne._context.path);
					assert.deepEqual(chapters._context.path,['sections',1,'chapters']);
					assert.deepEqual(chapterOne._context.path,['sections',1,'chapters',0]);
					assert.deepEqual(figureOne._context.path,['sections',2,'chapters',0,'figures',0]);
					assert.equal(chapterOne.get('title'),'one.one');
					done();
				}, 40);
			});
		});
	});
});