// from ember-qunit at https://github.com/rpflorence/ember-qunit/blob/master/lib/test-resolver.js

var __resolver__;

export function set(resolver) {
  __resolver__ = resolver;
}

export function get() {
  if (__resolver__ == null) throw new Error('you must set a resolver with `testResolver.set(resolver)`');
  return __resolver__;
}