const path = require('path');
const fs = require('fs-extra');
const Nunjucks = require('nunjucks');

class Templater {
  constructor() {
    this.store = {};
    this.env = null;
    this.templatePaths = null;
    this.templaterLoader = null;
    this.Nunjucks = Nunjucks;
  }

  init(templatePaths) {
    this.templatePaths = fs.readdirSync(templatePaths).map((blockPath) => path.join(templatePaths, blockPath));

    this.templaterLoader = new this.Nunjucks.FileSystemLoader(this.templatePaths, {
      watch: true,
      noCache: false,
    });

    this.env = new this.Nunjucks.Environment(this.templaterLoader);
  }
}

module.exports = Templater;
