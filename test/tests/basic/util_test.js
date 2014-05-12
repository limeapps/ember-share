/*global describe, specify, it, chai */
import {guid, isArray} from 'ember-share/utils';

var assert = chai.assert;

describe('has guid function', function() {
  it('exists', function(){
    assert(guid);
  });
});

describe('test Array', function() {
  it('can test arrays', function(){
    assert(isArray([]));
  });
});