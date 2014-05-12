function nameFor(path) {
  var result,  match;
  if (match = path.match(/^(?:lib|test|test\/tests)\/(.*?)(?:\.js)?$/)) {
    result = match[1];
  } else {
    result = path;
  }

  return path;
}

module.exports = {
  amd: {
    moduleName: nameFor,
    type: 'amd',
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'tmp/<%= pkg.name %>/',
      ext: '.amd.js'
    }]
  },

  commonjs: {
    moduleName: nameFor,
    type: 'cjs',
    files: [{
      expand: true,
      cwd: 'lib/',
      src: ['**/*.js'],
      dest: 'dist/commonjs/',
      ext: '.js'
    },
    {
      src: ['lib/<%= pkg.name %>.js'],
      dest: 'dist/commonjs/main.js'
    }]
  },

  testsAmd: {
    moduleName: nameFor,
    type: 'amd',
    expand: true,
    src: [
      'test/test_helpers.js',
      'test/test-resolver.js',
      'test/isolated-container.js',
      'test/tests.js',
      'test/**/*_test.js'
    ],
    dest: 'tmp/tests/amd'
  },

  testsCommonjs: {
    moduleName: nameFor,
    expand: true,
    type: 'cjs',
    src: [
      'test/test_helpers.js',
      'test/tests.js',
      'test/**/*_test.js'
    ],
    dest: 'tmp/tests/cjs'
  }
};
