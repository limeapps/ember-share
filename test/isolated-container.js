// from ember-qunit at https://github.com/rpflorence/ember-qunit/blob/master/lib/isolated-container.js

import {get, set} from 'test/test-resolver';

export default function isolatedContainer(fullNames) {
  if(!fullNames)
  {
    fullNames = [];
  }
  set(Ember.DefaultResolver.create());
  var resolver = get();
  var container = new Ember.Container();
  container.optionsForType('component', { singleton: false });
  container.optionsForType('view', { singleton: false });
  container.optionsForType('template', { instantiate: false });
  container.optionsForType('helper', { instantiate: false });
  container.register('component-lookup:main', Ember.ComponentLookup);
  for (var i = fullNames.length; i > 0; i--) {
    var fullName = fullNames[i - 1];
    container.register(fullName, resolver.resolve(fullName));
  }
  return container;
}