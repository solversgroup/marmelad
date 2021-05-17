// ------------------------------------
// #GULP - POSTHTML - INDEX
// ------------------------------------
const path = require('path');
const transform = require('through2').obj;

const PLUGIN_NAME = 'gulp-posthtml';

const posthtml = require('posthtml');
const posthtmlrc = require('posthtml-load-config');

const PluginError = require('plugin-error');

function rc(cb) {
  return function(plugins, options) {
    if (Array.isArray(plugins)) {
      return cb(() => Promise.resolve({ plugins: plugins, options: options })) // eslint-disable-line standard/no-callback-literal
    } else if (typeof plugins === 'function') {
      return cb((file) => Promise.resolve(plugins(file))) // eslint-disable-line standard/no-callback-literal
    } else {
      const ctx = plugins || {}

      return cb((file) => { // eslint-disable-line standard/no-callback-literal
        const config = {}

        if (ctx.config) {
          config.path = path.resolve(ctx.config)
        } else {
          config.path = file.dirname
        }

        config.ctx = { file: file, options: ctx }

        return posthtmlrc(config.ctx, config.path)
      })
    }
  }
}
/**
 * @author Ivan Voishev (@voishev) <voischev.ivan@ya.ru>
 * @description PostHTML Plugin for Gulp
 * @license MIT
 *
 * @module gulp-posthtml
 * @version 3.0.0
 *
 * @requires plugin-error
 * @requires through2
 * @requires posthtml
 * @requires posthtml-load-config
 *
 * @method gulp-posthtml
 *
 * @param  {Array}  plugins PostHTML Plugins
 * @param  {Object} options PostHTML Options
 *
 * @return {Function}       Stream (Transform)
 */
module.exports = rc((loadConfig) => {
  return transform((file, enc, cb) => {
    if (file.isNull()) {
      return cb(null, file)
    }

    if (file.isStream()) {
      return cb(
        new PluginError({
          plugin: PLUGIN_NAME,
          message: 'Streams are not supported'
        })
      )
    }

    loadConfig(file).then((config) => {
      config.options = Object.assign(
        { from: file.path, to: file.path }, config.options
      )

      return posthtml(config.plugins)
        .process(file.contents.toString(enc), config.options)
        .then((result) => {
          file.contents = Buffer.from(result.html)
          cb(null, file)
        })
        .catch((err) => {
          // passing the error object directly would usually be fine,
          // but plugins like posthtml-expressions are an exception, so we're being safe
          // https://github.com/posthtml/posthtml-expressions/issues/89
          cb(
            new PluginError({
              plugin: PLUGIN_NAME,
              message: err.message,
              stack: err.stack,
              showStack: true
            })
          )
        })
    })
  })
})
