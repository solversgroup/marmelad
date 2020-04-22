const gulp = require('gulp');
const removeComments = require ("gulp-strip-css-comments");
const cssnano = require ("gulp-cssnano");
const uglify = require('gulp-uglify');
const rename = require('gulp-rename');
const postHTML = require('gulp-posthtml');
const attrsSorter = require('posthtml-attrs-sorter');
const pretty = require('gulp-pretty-html');
const ora = require('ora');

const hasher = require('../modules/posthtml/hasher');
const getSettings = require('../modules/get-settings');



module.exports = () => {
  const settings = getSettings();

  const htmlFmtOpts = {
    html: {
      indent_size: 4,
      indent_char: '',
      indent_with_tabs: true,
      wrap_line_length: 0,
      preserve_newlines: false,
      unformatted: ['code', 'pre', 'em', 'strong', 'span', 'i', 'b', 'br', 'symbol'],
    },
    ...settings.pretty,
  };

  gulp.task('format:html', (done) => {
    const formatHTML = ora('Format HTML started').start();

    const stream = gulp.src(`${settings.paths.dist}/*.html`)
      .pipe(pretty(htmlFmtOpts))
      .pipe(gulp.dest(settings.paths.dist));

    stream.on('end', () => {
      formatHTML.succeed('Format HTML done');
      done();
    });
  });

  gulp.task('posthtml:tools', (done) => {
    const dist = settings.dist || {
      attrsSorter: {},
      hasher: {},
    };

    const attrsSorterOpts = {
      order: [
        'id', 'class', 'name',
        'data-.+', 'ng-.+', 'src',
        'for', 'type', 'href',
        'values', 'title', 'alt',
        'role', 'aria-.+',
        '$unknown$',
      ],
      ...dist.attrsSorter,
    };

    const hasherOpts = {
      attributes: [],
      path: settings.paths.dist,
      ...dist.hasher,
    };

    const posthtmlTools = ora('PostHTML tools started').start();

    const stream = gulp.src(`${settings.paths.dist}/*.html`)
      .pipe(postHTML([
        attrsSorter(attrsSorterOpts),
        hasher(hasherOpts),
      ]))
      .pipe(gulp.dest(settings.paths.dist));

    stream.on('end', () => {
      posthtmlTools.succeed('PostHTML tools done');
      done();
    });
  });
  
  gulp.task('compression:css', (done) => {
    const compressionCss = ora('Compression css started').start();
    const stream = gulp.src(`${settings.paths.dist}/css/app.css`)
    .pipe(cssnano({
          zindex: false,
          discardComments: {
              removeAll: true
          }
    }))
    .pipe(removeComments())
    .pipe(rename({
        suffix: ".min",
        extname: ".css"
    }))
    .pipe(gulp.dest(`${settings.paths.dist}/css`))
    stream.on('end', () => {
      compressionCss.succeed('Compression css done');
      done();
    });
  });

  gulp.task('compression:js', (done) => {
    const compressionCss = ora('Compression js started').start();
    const stream = gulp.src(`${settings.paths.dist}/js/app.js`)
    .pipe(uglify())
    .pipe(rename({
        suffix: ".min",
        extname: ".js"
    }))
    .pipe(gulp.dest(`${settings.paths.dist}/js`))
    stream.on('end', () => {
      compressionCss.succeed('Compression js done');
      done();
    });
  });

  gulp.series('format:html', 'posthtml:tools', 'compression:css', 'compression:js')();
};
