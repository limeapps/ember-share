module.exports = {
  amd: {
    src: [
      'tmp/<%= pkg.name %>/**/*.amd.js',
      'tmp/<%= pkg.name %>.amd.js'
    ],
    dest: 'dist/<%= pkg.name %>-<%= pkg.version %>.amd.js',
  },

  amdNoVersion: {
    src: [
      'tmp/<%= pkg.name %>/**/*.amd.js',
      'tmp/<%= pkg.name %>.amd.js'
    ],
    dest: 'dist/<%= pkg.name %>.amd.js'
  },

  deps: {
    src: ['vendor/deps/*.js'],
    dest: 'tmp/deps.amd.js'
  },

  browser: {
    src: [
      'vendor/loader.js',
      'tmp/<%= pkg.name %>/**/*.amd.js',
      'tmp/<%= pkg.name %>.amd.js'
    ],
    dest: 'tmp/<%= pkg.name %>.browser1.js'
  },

  amdNodeTests: {
    src: [
      'vendor/loader.js',
      'dist/<%= pkg.name %>.amd.js',
      'tmp/tests/amd/**/*.js',
    ],
    dest: 'tmp/tests.node.js',
    options: {
      banner: 'var assert = require("../test/vendor/assert");',
      footer: '\n;Object.keys(require.entries).filter(function(file) { return /_test$/.test(file); }).map(require);'
    }
  },

  amdTests: {
    src: [
      'tmp/tests/amd/**/*.js'
    ],
    dest: 'tmp/tests.amd.js',
  }

};
