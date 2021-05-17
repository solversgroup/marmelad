console.log('\nMarmelad Warming up...');

const { performance } = require('perf_hooks');

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const gulp = require('gulp');
const bsSP = require('browser-sync').create('Dev Server');
const bsPS = require('browser-sync').create('Proxy Server');
const rename = require('gulp-rename');
const uglify = require('gulp-uglify');
const postcss = require('gulp-postcss');
const flexBugsFixes = require('postcss-flexbugs-fixes');
const momentumScrolling = require('postcss-momentum-scrolling');
const inlineSvg = require('postcss-inline-svg');
const easingGradients = require('postcss-easing-gradients');
const viewportHeightCorrection = require('postcss-viewport-height-correction');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const gif = require('gulp-if');
const LOG = require('fancy-log');
const plumber = require('gulp-plumber');
const notify = require('gulp-notify');
const combineAndSortMQ = require('postcss-sort-media-queries');
const changed = require('gulp-changed');
const concat = require('gulp-concat');
const GLOB = require('glob');
const branchName = require('current-git-branch');
const pkg = require('../package.json');
const pipeErrorStop = require('../modules/pipe-error-stop');

const TCI = require('../modules/tci');

const Database = require('../modules/database'); // eslint-disable-line
const DB = new Database();

const Lagman = require('../modules/nunjucks/lagman'); // eslint-disable-line
const LAGMAN = new Lagman();

const authArgs = require('../modules/authArgs');
const getIconsNamesList = require('../modules/iconsNames');

const getSettings = require('../modules/get-settings');

console.log(`Marmelad Warmed at ${Math.round(performance.now())}ms\n`);

module.exports = (opts) => {
  const settings = getSettings();

  if (!opts.build) {
    TCI.run();
  }

  DB.set('git', {
    branch: branchName({
      altPath: __dirname,
    }),
  });

  LAGMAN.init({
    _pages: settings.paths._pages,
    _blocks: settings.paths._blocks,
  });

  /**
   * Server Auth
   */
  bsSP.use(require('bs-auth'), {
    user: authArgs(opts.auth, pkg.name)[0],
    pass: authArgs(opts.auth, pkg.name)[1],
    use: opts.auth,
  });

  /**
   * Proxy Server Auth
   */
  bsPS.use(require('bs-auth'), {
    user: authArgs(opts.auth, pkg.name)[0],
    pass: authArgs(opts.auth, pkg.name)[1],
    use: opts.auth,
  });

  /**
   * Nunjucks
   */
  const frontMatter = require('gulp-front-matter');
  const tap = require('gulp-tap');

  const gulpPostHTML = require('../modules/posthtml/gulp');
  const posthtmlBEM = require('../modules/posthtml/bem');

  const gulpNunjucks = require('../modules/nunjucks/gulp');
  const getDepBlocksSet = require('../modules/nunjucks/getDepBlocks');

  const Templater = require('../modules/nunjucks');
  const templater = new Templater();

  const Incw = require('../modules/nunjucks/globals/incw');

  templater.init(settings.paths._blocks);

  templater.env.addFilter('translit', require('../modules/nunjucks/filters/translit'));
  templater.env.addFilter('limitto', require('../modules/nunjucks/filters/limitto'));
  templater.env.addFilter('bodyClass', require('../modules/nunjucks/filters/bodyclass'));

  templater.env.addGlobal('_icon', settings.iconizer.icon);
  templater.env.addGlobal('_fns', settings._fns);
  templater.env.addGlobal('inlineSvgSprite', require('../modules/nunjucks/globals/inlineSvgSprite'));

  templater.env.addExtension('incw', new Incw(templater.env, DB.store, settings));

  gulp.task('nunjucks', (done) => {
    const njkStartPerf = performance.now();

    let templateName = '';
    let hasError = false;

    const stream = gulp.src(LAGMAN.store.src)
      .pipe(plumber({
        errorHandler: notify.onError((error) => {
          bsSP.sockets.emit('error:message', error);
          hasError = true;

          return {
            title: `[nunjucks] ошибка: проверьте шаблоны ${error.plugin}`,
            message: error.message,
          };
        }),
      }))
      .pipe(tap((file) => {
        templateName = path.basename(file.path);
      }))
      .pipe(frontMatter())
      .pipe(gulpNunjucks(templater, {
        locals: DB.store,
        ext: '.html',
      }))
      .pipe(pipeErrorStop({
        errorCallback: (error) => {
          hasError = true;
          error.message = error.message.replace(/(unknown path)/, templateName);
          bsSP.sockets.emit('error:message', error);
          console.log(`\n${error.name}: ${error.message}\n`);
        },
        successCallback: () => {
          hasError = false;
        },
      }))
      .pipe(tap((file) => {
        getDepBlocksSet(file, (err, blocksSet) => {
          if (blocksSet) {
            const pageName = LAGMAN.getName(file.path);

            LAGMAN.refresh(pageName, 'pages', blocksSet);
          }
        });
      }))
      .pipe(gulpPostHTML([
        posthtmlBEM(settings.app.beml),
      ]))
      .pipe(rename({
        dirname: '',
      }))
      .pipe(gulp.dest(settings.paths.dist));

    stream.on('end', () => {
      if (!hasError) {
        LOG(`[nunjucks] ${hasError ? chalk.bold.red('ERROR') : chalk.bold.green('done')} in ${(performance.now() - njkStartPerf).toFixed(0)}ms`);
        bsSP.reload();
      }

      done();
    });

    stream.on('error', (error) => {
      bsSP.sockets.emit('error:message', error);
      console.log(error);
      done(error);
    });
  });

  gulp.task('database', (done) => {
    DB.onError = (blockPath, error) => {
      bsSP.sockets.emit('error:message', error);
      LOG.error(chalk.bold.red(blockPath));
      LOG.error(error.message);
    };

    [`${settings.paths._blocks}/**/*.json`].forEach((paths) => {
      DB.create(GLOB.sync(paths));
    });

    DB.combine(require(`${process.cwd()}/${settings.folders.marmelad}/data.marmelad.js`));

    DB.combine({
      package: pkg,
      storage: settings.folders.storage,
      sprite: {
        icons: getIconsNamesList(settings.iconizer.srcIcons),
        colored: getIconsNamesList(settings.iconizer.srcColored),
      },
      settings,
    }, 'app');

    done();
  });

  /**
   * Iconizer
   */
  gulp.task('iconizer:icons', (done) => {
    const svgSprite = require('gulp-svg-sprite');
    const replace = require('gulp-replace');

    if (settings.iconizer.mode === 'external') {
      settings.iconizer.plugin.svg.doctypeDeclaration = true;
    }

    settings.iconizer.plugin.mode.symbol.sprite = 'sprite.icons.svg';

    const stream = gulp.src(`${settings.iconizer.srcIcons}/*.svg`)
      .pipe(svgSprite(settings.iconizer.plugin))
      .pipe(replace(/\n/g, ''))
      .pipe(replace(/<defs[\s\S]*?\/defs><path[\s\S]*?\s+?d=/g, '<path d='))
      .pipe(replace(/<style[\s\S]*?\/style><path[\s\S]*?\s+?d=/g, '<path d='))
      .pipe(replace(/\sfill[\s\S]*?(['"])[\s\S]*?\1/g, ''))
      .pipe(replace(/<title>[\s\S]*?<\/title>/g, ''))
      .pipe(replace(/<svg /, (match) => `${match} class="${settings.iconizer.cssClass} ${settings.iconizer.cssClass}--icons" `))
      .pipe(rename({
        dirname: '',
      }))
      .pipe(gulp.dest(settings.iconizer.dest));

    stream.on('end', () => {
      DB.combine({
        sprite: {
          icons: getIconsNamesList(settings.iconizer.srcIcons),
          colored: getIconsNamesList(settings.iconizer.srcColored),
        },
      }, 'app');

      LOG(`[iconizer] icons ${chalk.bold.green('Done')}`);

      done();
    });

    stream.on('error', (error) => {
      bsSP.sockets.emit('error:message', error);
      console.log(error);
      done(error);
    });
  });

  gulp.task('iconizer:colored', (done) => {
    const svgSprite = require('gulp-svg-sprite');
    const replace = require('gulp-replace');

    if (settings.iconizer.mode === 'external') {
      settings.iconizer.plugin.svg.doctypeDeclaration = true;
    }

    settings.iconizer.plugin.mode.symbol.sprite = 'sprite.colored.svg';

    const stream = gulp.src(`${settings.iconizer.srcColored}/*.svg`)
      .pipe(svgSprite(settings.iconizer.plugin))
      .pipe(replace(/<title>[\s\S]*?<\/title>/g, ''))
      .pipe(replace(/<svg /, (match) => `${match} class="${settings.iconizer.cssClass} ${settings.iconizer.cssClass}--colored" `))
      .pipe(rename({
        dirname: '',
      }))
      .pipe(gulp.dest(settings.iconizer.dest));

    stream.on('end', () => {
      DB.combine({
        sprite: {
          icons: getIconsNamesList(settings.iconizer.srcIcons),
          colored: getIconsNamesList(settings.iconizer.srcColored),
        },
      }, 'app');

      LOG(`[iconizer] colored ${chalk.bold.green('Done')}`);

      done();
    });

    stream.on('error', (error) => {
      bsSP.sockets.emit('error:message', error);
      console.log(error);
      done(error);
    });
  });

  /**
   * Iconizer update
   */
  gulp.task('iconizer:update', (done) => {
    gulp.series('iconizer:icons', 'iconizer:colored', 'nunjucks')(done);
  });

  /**
   * Scripts blocks
   */
  gulp.task('scripts:others', (done) => {
    const babel = require('gulp-babel');
    const include = require('gulp-include');

    let hasError = false;

    const stream = gulp.src(`${settings.paths.js.src}/*.js`)
      .pipe(plumber({
        errorHandler: notify.onError((error) => {
          bsSP.sockets.emit('error:message', error);
          hasError = true;

          return {
            title: `[scripts:others] ошибка: проверьте скрипты ${error.plugin}`,
            message: error.message,
          };
        }),
      }))
      .pipe(include({
        extensions: 'js',
        hardFail: false,
      })).on('error', LOG)
      .pipe(babel({
        presets: ['@babel/preset-env'].map(require.resolve),
        plugins: ['@babel/plugin-transform-object-assign'].map(require.resolve),
      }))
      .pipe(gulp.dest(`${settings.paths.storage}/${settings.folders.js.src}`));

    stream.on('end', () => {
      if (!hasError) {
        LOG(`[js] others ${chalk.bold.green('Done')}`);
        bsSP.reload();
      }

      done();
    });

    stream.on('error', (error) => {
      done(error);
    });
  });

  /**
   * Scripts vendors
   */
  gulp.task('scripts:vendors', (done) => {
    const vendorsDist = `${settings.paths.storage}/${settings.folders.js.src}/${settings.folders.js.vendors}`;

    let hasError = false;

    const stream = gulp.src(`${settings.paths.js.vendors}/**/*.js`)
      .pipe(plumber({
        errorHandler: notify.onError((error) => {
          bsSP.sockets.emit('error:message', error);
          hasError = true;

          return {
            title: `[scripts:vendors] ошибка: проверьте  ${error.plugin}`,
            message: error.message,
          };
        }),
      }))
      .pipe(changed(vendorsDist))
      .pipe(gulp.dest(vendorsDist));

    stream.on('end', () => {
      if (!hasError) {
        LOG(`[js] vendors ${chalk.bold.green('Done')}`);
        bsSP.reload();
      }

      done();
    });

    stream.on('error', (error) => {
      bsSP.sockets.emit('error:message', error);
      console.log(error);
      done(error);
    });
  });

  /**
   * Scripts plugins
   */
  gulp.task('scripts:plugins', (done) => {
    let hasError = false;

    const stream = gulp.src(`${settings.paths.js.plugins}/**/*.js`)
      .pipe(plumber({
        errorHandler: notify.onError((error) => {
          bsSP.sockets.emit('error:message', error);
          hasError = true;

          return {
            title: `[scripts:plugins] ошибка: проверьте ${error.plugin}`,
            message: error.message,
          };
        }),
      }))
      .pipe(concat('plugins.min.js'))
      .pipe(uglify())
      .pipe(gulp.dest(`${settings.paths.storage}/${settings.folders.js.src}`));

    stream.on('end', () => {
      if (!hasError) {
        LOG(`[js] plugins ${chalk.bold.green('Done')}`);
        bsSP.reload();
      }

      done();
    });

    stream.on('error', (error) => {
      bsSP.sockets.emit('error:message', error);
      console.log(error);
      done(error);
    });
  });

  /**
   * Styles plugins
   */
  gulp.task('styles:plugins', (done) => {
    gulp.src(`${settings.paths.js.plugins}/**/*.css`)
      .pipe(plumber({
        errorHandler: (err) => {
          notify.onError({
            title: `Ошибка: проверьте стили в плагинах ${err.plugin}`,
            message: err.toString(),
          })(err);
        },
      }))
      .pipe(concat('plugins.min.css'))
      .pipe(postcss([
        // viewportHeightCorrection(),
        // momentumScrolling(),
        // flexBugsFixes(),
        // combineAndSortMQ(),
      ], { from: undefined }))
      .pipe(gulp.dest(`${settings.paths.storage}/css`))
      .on('end', () => {
        LOG(`[css] plugins ${chalk.bold.green('Done')}`);
      })
      .pipe(bsSP.stream());
    done();
  });

  /**
   * Styles blocks
   */
  gulp.task('styles', (done) => {
    const autoprefixer = require('autoprefixer');
    const stylus = require('gulp-stylus');
    const $data = {
      beml: settings.app.beml,
    };

    Object.assign($data, DB.store.app.stylus);

    // обратная совместимость с старыми проектами
    const postcssOpts = settings.app.postcss || {};

    gulp.src(`${settings.paths.styles}/*.{styl,scss,sass}`)
      .pipe(plumber({
        errorHandler: (err) => {
          notify.onError({
            title: `Ошибка: проверьте стили ${err.plugin}`,
            message: err.toString(),
          })(err);
          bsSP.sockets.emit('error:message', err);
        },
      }))
      .pipe(gif('*.styl', stylus({
        'include css': true,
        rawDefine: { $data },
      })))
      .pipe(gif('*.scss', sassGlob()))
      .pipe(gif('*.scss', sass()))
      .pipe(gif('*.sass', sass({
        indentedSyntax: true,
      })))
      .pipe(postcss([
        // viewportHeightCorrection(),
        // combineAndSortMQ(postcssOpts.sortMQ),
        // momentumScrolling(postcssOpts.momentumScrolling),
        // flexBugsFixes(),
        // inlineSvg(postcssOpts.inlineSvg),
        // easingGradients(postcssOpts.easingGradients),
        // autoprefixer(settings.app.autoprefixer),
      ], { from: undefined }))
      .pipe(gulp.dest(`${settings.paths.storage}/css`))
      .pipe(bsSP.stream())
      .on('end', () => {
        LOG(`[css] styles ${chalk.bold.green('Done')}`);
      })
      .pipe(bsSP.stream());

    done();
  });

  /**
   * Static files
   */
  gulp.task('static', (done) => {
    const stream = gulp.src([
      `${settings.paths.static}/**/*.*`,
      `!${settings.paths.static}/**/Thumbs.db`,
      `!${settings.paths.static}/**/*tmp*`,
    ], { dot: true })
      .pipe(plumber())
      .pipe(changed(settings.paths.storage))
      .pipe(gulp.dest(settings.paths.storage));

    stream.on('end', () => {
      LOG(`Static files copy ${chalk.bold.green('Done')}`);
      bsSP.reload();
      done();
    });

    stream.on('error', (err) => {
      done(err);
    });
  });

  /**
   * static server
   */
  gulp.task('server:static', (done) => {
    settings.app.bsSP.middleware = [
      (req, res, next) => {
        const latencyRoutes = settings.app.bsSP.latencyRoutes ? settings.app.bsSP.latencyRoutes : [];
        const match = latencyRoutes.filter((item) => req.url.match(new RegExp(`^${item.route}`)) && item.active);

        if (match.length && match[0].active) {
          setTimeout(next, match[0].latency);
        } else {
          next();
        }
      },
      {
        route: '/lagman',
        handle: (req, res) => {
          res.setHeader('Content-Type', 'application/json;charset=UTF-8');
          res.end(JSON.stringify(LAGMAN.store, (key, value) => {
            if (typeof value === 'object' && value instanceof Set) {
              return [...value];
            }

            if (typeof value === 'object' && value instanceof Array) {
              return Object.keys(value).reduce((result, item) => {
                if (typeof value[item] === 'object' && value[item] instanceof Set) {
                  result[item] = value[item];
                }

                return result;
              }, {});
            }

            return value;
          }));
        },
      },
    ];

    bsSP.use(require('../modules/browser-sync/screen-message'));

    bsSP.init(settings.app.bsSP, () => {
      // let urls = bsSP.getOption('urls');
      // let bsAuth = bsSP.getOption('bsAuth');
      // let authString = '';

      // if (bsAuth && bsAuth.use) {
      //   authString = `\n  user: ${bsAuth.user}\npass: ${bsAuth.pass}`;
      // }

      // console.log(authString);

      done();
    });
  });

  /** ^^^
   * Bootstrap 4 tasks
   ==================================================================== */
  gulp.task('bootstrap', (done) => {
    if (settings.app.bts.use || settings.app.bts.donor) {
      if (settings.app.bts.donor) {
        settings.app.bts['4'].dest.js = `${settings.paths.storage}/${settings.folders.js.src}/${settings.folders.js.vendors}`;
        gulp.series('bts4:js')();
      } else {
        gulp.series('bts4:sass', 'bts4:js')();
      }
    }

    done();
  });

  gulp.task('bts4:sass', (done) => {
    const autoprefixer = require('autoprefixer');
    const sourcemaps = require('gulp-sourcemaps');

    gulp.src(`${settings.app.bts['4'].src.css}/scss/[^_]*.scss`)
      .pipe(plumber())
      .pipe(sourcemaps.init())
      .pipe(sass(settings.app.bts['4'].sass))
      .pipe(postcss([
        // momentumScrolling(),
        // autoprefixer(settings.app.bts['4'].autoprefixer),
      ]))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest(settings.app.bts['4'].dest.css))
      .on('end', () => {
        LOG(`Bootstrap ${settings.app.bts['4'].code} SASS ${chalk.bold.green('Done')}`);
      })
      .pipe(bsSP.stream());

    done();
  });

  gulp.task('bts4:js', (done) => {
    const stream = gulp.src(`${settings.app.bts['4'].src.js}/**/*.js`)
      .pipe(plumber())
      .pipe(changed(settings.app.bts['4'].dest.js))
      .pipe(gif(settings.app.bts.donor, rename({ dirname: '' }))) // rename({ dirname: '' })
      .pipe(gulp.dest(settings.app.bts['4'].dest.js));

    stream.on('end', () => {
      LOG(`Bootstrap ${settings.app.bts['4'].code} JS ${chalk.bold.green('Done')}`);
      bsSP.reload();
      done();
    });

    stream.on('error', (err) => {
      done(err);
    });
  });

  gulp.task('watch', (done) => {
    const chokidar = require('chokidar');
    const decache = require('decache');

    const watchOpts = {
      ignoreInitial: true,
      ignored: [
        `${settings.folders.marmelad}/**/*.db`,
        `${settings.folders.marmelad}/**/*tmp*`,
      ],
      usePolling: false,
      cwd: process.cwd(),
      ...settings.app.watchOpts,
    };

    if (settings.app.bts.use || settings.app.bts.donor) {
      let bsTask = '';

      if (settings.app.bts.use) {
        bsTask = 'bts4:sass';
      }

      if (settings.app.bts.donor) {
        bsTask = 'styles';
      }

      /* SCSS */
      gulp.watch(
        `${settings.app.bts['4'].src.css}/**/*.scss`,
        watchOpts,
        gulp.parallel(bsTask),
      );

      /* JS */
      gulp.watch(
        `${settings.app.bts['4'].src.js}/**/*.js`,
        watchOpts,
        gulp.parallel('bts4:js'),
      );
    }

    /* СТАТИКА */
    gulp.watch([
      `${settings.paths.static}/**/*`,
      `${settings.paths.static}/**/.*`,
    ], watchOpts, gulp.parallel('static'));

    /* STYLES */
    gulp.watch([
      `${settings.paths._blocks}/**/*.{styl,scss,sass}`,
      `${settings.paths.styles}/**/*.{styl,scss,sass}`,
    ], watchOpts, gulp.parallel('styles'));

    /* СКРИПТЫ */
    gulp.watch(
      `${settings.paths.js.vendors}/**/*.js`,
      watchOpts,
      gulp.parallel('scripts:vendors'),
    );

    gulp.watch(
      `${settings.paths.js.plugins}/**/*.js`,
      watchOpts,
      gulp.parallel('scripts:plugins'),
    );

    gulp.watch([
      `${settings.paths.js.src}/*.js`,
      `${settings.paths._blocks}/**/*.js`,
    ], watchOpts, gulp.parallel('scripts:others'));

    gulp.watch(
      `${settings.paths.js.plugins}/**/*.css`,
      watchOpts,
      gulp.parallel('styles:plugins'),
    );

    /* NunJucks Pages */
    const watchPages = chokidar.watch(`${settings.paths._pages}/**/*.html`, watchOpts);

    watchPages
      .on('add', (pagePath) => {
        watchPages.add(pagePath);
        LAGMAN.create(pagePath, 'pages');
      })
      .on('change', (pagePath) => {
        LAGMAN.store.src = path.join(process.cwd(), pagePath);
        gulp.series('nunjucks')();
      })
      .on('unlink', (pagePath) => {
        LAGMAN.delete(LAGMAN.getName(pagePath), 'pages');
        watchPages.unwatch(pagePath);
      });

    const watchBlocks = chokidar.watch(`${settings.paths._blocks}/**/*.html`, watchOpts);

    /* NunJucks Blocks */
    watchBlocks
      .on('add', (blockPath) => {
        LAGMAN.create(blockPath, 'blocks');
      })
      .on('change', (blockPath) => {
        const blockName = LAGMAN.getName(blockPath);

        LAGMAN.store.onDemand = new Set([...LAGMAN.store.onDemand, ...LAGMAN.store.blocks[blockName]]);

        LAGMAN.store.src = [];

        LAGMAN.store.blocks[blockName].forEach((page) => {
          LAGMAN.store.src.push(`${settings.paths._pages}/**/${page}.html`);
        });

        if (LAGMAN.store.blocks[blockName].size) {
          gulp.series('nunjucks')();
        } else {
          LOG(`[nunjucks] block ${chalk.bold.yellow(blockName)} has no dependencies`);
        }
      })
      .on('unlink', (blockPath) => {
        const blockName = LAGMAN.getName(blockPath);

        LAGMAN.delete(blockName, 'blocks');
        watchBlocks.unwatch(blockPath);
      });

    /* NunJucks Datas */
    gulp.watch(
      `${settings.paths._blocks}/**/*.json`,
      watchOpts,
    )
      .on('change', (blockPath) => {
        const blockName = LAGMAN.getName(blockPath, 'json');

        DB.update(blockPath);

        LAGMAN.store.onDemand = new Set([...LAGMAN.store.onDemand, ...LAGMAN.store.blocks[blockName]]);

        LAGMAN.store.src = [];

        LAGMAN.store.onDemand.forEach((page) => {
          LAGMAN.store.src.push(`${settings.paths._pages}/**/${page}.html`);
        });

        gulp.series('nunjucks')();
      })
      .on('unlink', (blockPath) => {
        DB.delete(blockPath);
        gulp.series('nunjucks')();
      });

    try {
      /* Database */
      const dataPath = `${process.cwd()}/${settings.folders.marmelad}/data.marmelad.js`;

      gulp.watch(
        [
          dataPath,
        ],
        watchOpts, (decached) => {
          decache(dataPath);

          DB.combine(require(dataPath));
          DB.combine({
            package: pkg,
            storage: settings.folders.storage,
            sprite: {
              icons: getIconsNamesList(settings.iconizer.srcIcons),
              colored: getIconsNamesList(settings.iconizer.srcColored),
            },
            settings,
          }, 'app');

          gulp.series('nunjucks')(decached);
        },
      );
    } catch (error) {
      console.log(error);
    }

    /* Iconizer */

    gulp.watch([
      `${settings.iconizer.srcIcons}/*.svg`,
      `${settings.iconizer.srcColored}/*.svg`,
    ],
    watchOpts,
    (complete) => {
      const { srcIcons } = settings.iconizer;
      let sizeLimitError = false;

      try {
        if (fs.existsSync(srcIcons)) {
          fs.readdirSync(srcIcons).forEach((iconName) => {
            const iconStats = fs.statSync(`${srcIcons}/${iconName}`);

            if (iconStats.size > 3072) {
              sizeLimitError = true;
              console.log(chalk`{bgRed  ERROR } icon {yellow ${iconName}} more than 3kb`);
            }
          });
        }
      } catch (err) {
        console.log(err);
      }

      if (!sizeLimitError) {
        gulp.series('iconizer:update')(complete);
      }
    });

    done();
  });

  /**
   * Clean build directory
   */
  gulp.task('clean', (done) => {
    const del = require('del');

    del.sync(settings.paths.dist);
    done();
  });

  /**
   * Proxy mod
   */
  gulp.task('proxy-mod', (done) => {
    if (opts.proxyMod) {
      if (opts.build) {
        gulp.series('proxy:copy-sources')();
      } else {
        gulp.series('proxy:copy-sources', 'proxy:watch-sources', 'proxy:server')();
      }

      LOG(`Proxy Mod ${chalk.bold.green('Started')}`);
    }

    done();
  });

  /**
   * Proxy server
   */
  gulp.task('proxy:server', (done) => {
    settings.proxy.server.middleware = [
      (req, res, next) => {
        const latencyRoutes = settings.proxy.server.latencyRoutes ? settings.proxy.server.latencyRoutes : [];
        const match = latencyRoutes.filter((item) => req.url.match(new RegExp(`^${item.route}`)) && item.active);

        if (match.length && match[0].active) {
          setTimeout(next, match[0].latency);
        } else {
          next();
        }
      },
    ];

    bsPS.init(settings.proxy.server, () => {
      done();
    });
  });

  /**
   * Proxy mod Static files
   */
  gulp.task('proxy:copy-sources', (done) => {
    const sources = settings.proxy.sources.copy.map((directory) => `${directory}/**/*`);
    const ignored = settings.proxy.sources.ignored.map((ignore) => `!${ignore}`);

    const stream = gulp.src([...sources, ...ignored], {
      allowEmpty: true,
      base: settings.folders.static,
    })
      .pipe(plumber())
      .pipe(gulp.dest(settings.proxy.sources.to));

    stream.on('end', () => {
      LOG(`Proxy Copy Sources ${chalk.bold.green('Done')}`);
      // bsSP.reload();
      done();
    });

    stream.on('error', (err) => {
      done(err);
    });
  });

  /**
   * Proxy watcher
   */
  gulp.task('proxy:watch-sources', (done) => {
    const watchOpts = {
      ignoreInitial: true,
      usePolling: false,
      cwd: process.cwd(),
      ...settings.app.watchOpts,
    };

    watchOpts.ignored = [...watchOpts.ignored, ...settings.proxy.sources.ignored];

    const sources = settings.proxy.sources.copy.map((directory) => `${directory}/**/*`);

    gulp.watch(
      sources,
      watchOpts,
      gulp.parallel('proxy:copy-sources'),
    );

    LOG(`Proxy Watch Sources ${chalk.bold.green('Started')}`);

    done();
  });

  gulp.task(
    'develop',
    gulp.series(
      'clean',
      // 'static',
      // 'iconizer:icons',
      // 'iconizer:colored',
      'database',
      gulp.parallel(
        'nunjucks',
        // 'scripts:vendors',
        // 'scripts:plugins',
        // 'scripts:others',
        // 'styles:plugins',
        // 'styles',
        // 'bootstrap',
      )
      // 'proxy-mod',
    ),
  );

  if (opts.build) {
    gulp.series('develop')();
  } else {
    gulp.series('develop', 'server:static', 'watch')();
  }
};
