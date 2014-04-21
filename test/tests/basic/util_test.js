/*global describe, specify, it, assert */
import {guid, isArray} from 'ember-share/utils';

describe('has guid function', function() {
  it('exists', function(){
    assert(guid);
  });
});

describe('test Array', function() {
  it('can test arrays', function(){
    assert.ok(isArray([]));
  });
});