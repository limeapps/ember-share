module.exports = {
  phantom: {
    options: {
      urls: ['test/index.html'],

      phantomConfig:{
                  "--web-security": false
              }
    }
  }
};
