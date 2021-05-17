const PluginError = require('plugin-error');
const replaceExtension = require('replace-ext');
const through = require('through2');

const PLUGIN_NAME = 'gulp-nunjucks-a101';

function nunjucksBuild(templater, opts) {
  return through.obj((file, enc, cb) => {
    if (file.isNull()) {
      return cb(null, file);
    }

    if (file.isStream()) {
      return cb(new PluginError(PLUGIN_NAME, 'Streams are not supported'));
    }

    const options = {
      locals: {},
      ...opts,
    };

    const str = file.contents.toString('utf8');
    const data = file.data ? file.data : {};
    const fm = file.frontMatter ? file.frontMatter : {};
    const context = { ...options.locals, ...data, ...fm };

    templater.env.renderString(str, context, (err, res) => {
      if (err) {
        return cb(new PluginError(PLUGIN_NAME, err));
      }

      file.contents = Buffer.from(res);

      if (options.ext) {
        file.path = replaceExtension(file.path, opts.ext);
      }

      cb(null, file);
    });
  });
}

module.exports = nunjucksBuild;
