const glob = require('glob');
const path = require('path');

class Lagman {
  constructor() {
    this.store = {
      src: null,
      isFront: false,
      onDemand: new Set(),
      blocks: [],
      pages: [],
    };
  }

  init(opts) {
    this.store.src = path.join(opts._pages, '**', '*.html');

    glob.sync(path.join(opts._blocks, '**', '*.html')).forEach((block) => {
      this.create(block, 'blocks');
    });

    glob.sync(path.join(opts._pages, '**', '*.html')).forEach((page) => {
      this.create(page, 'pages');
    });
  }

  getName(templatePath, ext = 'html') {
    return path.basename(templatePath, `.${ext}`);
  }

  create(templatePath, type) {
    const name = this.getName(templatePath);
    this.store[type][name] = new Set();

    if (type === 'pages') {
      this.store.onDemand.add(name);
      // this.store.src = templatePath;
    }
  }

  refresh(name, type, newSet) {
    const result = this.compare(this.store[type][name], newSet);
    // console.log(result);

    if (type === 'pages') {
      if (result.deleted.size) {
        [...result.deleted].forEach((block) => {
          if (typeof this.store.blocks[block] === 'undefined') {
            this.store.blocks[block] = new Set();
          }
          this.store.blocks[block].delete(name);
        });
      }

      if (result.addeded.size) {
        [...result.addeded].forEach((block) => {
          if (!(this.store.blocks[block] instanceof Set)) {
            this.store.blocks[block] = new Set();
          }
          this.store.blocks[block].add(name);
        });
      }
    }

    this.store[type][name] = newSet;
  }

  compare(oldSet, newSet) {
    return {
      deleted: new Set([...oldSet].filter((block) => !newSet.has(block))),
      addeded: new Set([...newSet].filter((block) => !oldSet.has(block))),
    };
  }

  read() {}

  update() {}

  delete(name, type) {
    delete this.store[type][name];
  }
}

module.exports = Lagman;
