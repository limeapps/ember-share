# EmberShare

EmberShare is an Ember persistence library that utilizes ShareJS, a robust Operational Transforms backend server. It takes care of keeping models consistent, in addition to providing collaborative editing capabilities. 

## Building:

```sh
grunt build-release
```
## How to use:

+ Include the the version of the library most suitable for your project from the `/dist` forlder
+ Inject the store into the application

```
App.initializer({
  name: 'injectStore',
  initialize: function(container, application) {
	application.register('store:main',EmberShare.Store);
    application.inject('controller', 'store', 'store:main');
    application.inject('route', 'store', 'store:main');
  }
});
```

+ For your models you can extend either `ShareProxy` or `ShareArray`.

```
var ItemModel = EmberShare.ShareProxy.extend({
	id: null	// only add id or any non-persistant properties
});
```

## Testing:

```sh
grunt test         # headless testing

```
## Contribution:

+ Have a look at the issues, we posta any challanges/todo items there.
+ Help us identify short commings via submitting issues.
+ We think there is a need for a node module/library to go along with ShareJS in the backend to allow for aspects like Access Control that are needed and are not part of ShareJS.

Dependencies:

- ShareJS
- BrowserChannel or Primus

