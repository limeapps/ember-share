module.exports = {
  coffeeTests: {
    files: [
      './test/**/*',
      './lib/**',
      '!./test/coffee/tests.js',
    ],
    options: {
      spawn: false,
      livereload: 1333,
      debounceDelay: 5000
    },
    tasks: ['coffeeTests']
  }
};
