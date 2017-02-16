module.exports = {
  tests: {
    cwd: './test/coffee',
    src: ['tests.coffee'],
    dest: './test/',
    aliases : [
      {
        cwd: './dist/commonjs/ember-share',
        dest: 'ember-share',
        src: ['**/*.js']
      },
      {
        cwd: './dist/commonjs',
        dest: 'commonjs',
        src: ['*.js']
      },
      {
        cwd: './node_modules',
        dest: 'node_modules',
        src: ['**/*.js']
      }

    ]

  }
}
