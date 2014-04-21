module.exports = {
  options: {
    pkgFiles: [
      'package.json',
      'bower.json'
    ],
    srcRepo: '<%= pkg.srcRepo %>',
    distRepo: '<%= pkg.distRepo ',
    distStageDir: 'tmp/stage',
    distFiles: [
      'dist/thing.js',
      'dist/<%= pkg.name %>.min.js',
      'dist/<%= pkg.name %>.amd.js'
    ],
    distBase: 'dist'
  }
};
