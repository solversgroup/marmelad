const cheerio = require('cheerio');
/**
 * Return array of paths to blocks.
 * @param {string} blocksPath path to _blocks directory
 * @returns {array} array of paths to blocks
 */
module.exports = (file, cb) => {
  try {
    const $ = cheerio.load(file.contents.toString());
    const blocks = $('[block]');
    const blocksSet = new Set();

    blocks.each((index, block) => {
      blocksSet.add($(block).attr('block'));
    });

    cb(false, blocksSet);
  } catch (error) {
    cb(error, false);
  }
};
