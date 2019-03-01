[ci-img]:  https://travis-ci.org/solversgroup/marmelad.svg
[ci]:      https://travis-ci.org/solversgroup/marmelad

# marmelad <sup>[4.55.31](CHANGELOG.md#45531-07012019)</sup> [![npm](https://img.shields.io/npm/v/marmelad.svg)](https://www.npmjs.com/package/marmelad)

<img src="marmelad.svg?sanitize=true" align="right" title="Marmelad logo made by Jelly beans from www.flaticon.com is licensed by CC 3.0 BY" width="100" height="100">

Сборщик сайтов, предназначенный для подготовки вёрстки для использования в роли реального сайта, либо, для последующего использования в различных CMS, либо в React, Vue, Angular, и т.п. приложениях, или там, где вам заблагорассудится, дело ваше 🤘.

## Для разработчиков
Разработка ведётся по правилам **git-flow**. Ознакомиться и изучить мо в  [шпаргалке по git-flow](http://danielkummer.github.io/git-flow-cheatsheet/index.ru_RU.html)

### Этапы/соглашение по внесению изменения

 - Форк репозитория к себе
 - Разработка фичи по правилам git-flow
 - Завершение разработки фичи
 - Создание пул-реквеста
 - Скачивание изменений после одобрения пул-реквеста

## Установка

`marmelad` можно устанавливать тремя способами.

> Не пытайтесь установить marmelad путём копирования файлов сборщика с Windows на Linux. Для разных ОС устанавливаются разные зависимости. Пользуйтесь доступными способами для установки.

### Из npm
```bash
npm i marmelad -g
```

### Для разработчиков
```bash
git clone https://github.com/solversgroup/marmelad.git
cd marmelad
npm i . -g --from-lock-file
npm link
```
Установка произойдёт также, как и через **npm**, только в этом случае появится возможность быстро исправлять/улучшать **marmelad** либо под требования заказчика, либо под собственные нужды.

### Для определённого проекта

Такой тип установки подходит, когда заказчик требует определённую структуру размещения файлов проекта, либо работа сборщика нуждается в переделке под требования заказчика. Там может быть всё что угодно.

```bash
git clone https://github.com/solversgroup/marmelad.git && cd marmelad && npm i
```

Далее, инициализируея/запуская **marmelad** указывая NodeJs путь до исполняемого файла **marmelad**.

```bash
# node C:\marmelad\bin\marmelad.js
node <путь до исполняемого файла marmelad>
```

## Использование CLI

**Marmelad** устанавливается в систему как `marmelad` и `mmd` (сокращённый алиас для CLI). Для вызова справки по использованию необходимо запустить в консоли:
```bash
# без параметров
marmelad # или mmd
# или
marmelad --help # или mmd --help
```

Далее в консоль выведется справка с описанием команд и опций сборщика
```bash
mmd --help

Usage: marmelad [options] [command]

# описание из package.json

Options:
  -v, --version         output the version number
  -h, --help            output usage information

Commands:
  init [options] [dir]  initialize new project
  dev                   run development server
  cp <name>             create new page
  cb [options] <name>   create new block

Commands help:
  marmelad [command] --help
  mmd [command] --help
```

## Инициализация проекта

Для инициализации нового проекта, служит команда `mmd init [options] [dir]`.

В случае, когда не передан параметр для папки инициализации, проект инициализируется в текущей папке открытой в терминале.

### `init [options]`
`-c, --css` - заменяет значение ключа `app.css` в `settings.marmelad.js` при копировании заготовки нового проекта. Далее этот ключ используется для команды создания блока `mmd cb`, для создания файлов для css препроцессоров с расширением установленным в `app.css` в `settings.marmelad.js`. Для добавления поддержки в проект на старом проекте после обновления до актуальной версии **marmelad**, необходимо добавить в `settings.marmelad.js` в объект `app` свойство `css` с значением/расширением требуемого css препроцессора.

`-t, --test` - необходим только для тестирования, в разработке проектов никакого смысла он не имеет.

### `init [dir]`

`[dir]` - позволяет инициализировать проект в указанной папке. Например `mmd init new-and-awesome -t scss`.

## Запуск на проектах предыдущих версий

Необходимо заменить/добавить в `settings.marmelad.js`:
 - объекте `paths`, свойство `stylus` на `styles`
 - объект `app` свойство `css` с требуемого css препроцессора (scss, styl, sass)

## Шаблоны/Блоки

Блок состоит из набора файлов отвечающих за скрипты, данные, стили, разметку.

```bash
[example-block]
  ├ example-block.html  # разметка
  ├ example-block.styl  # стили (less,scss,sass,styl)
  ├ example-block.js    # скрипты
  └ example-block.json  # данные
```

### Данные для шаблонов/блоков

Данные для блока доступны в шаблонах по ключу с названием блока (если файл данных для блока создан и хоть чем-то заполнен), либо из `data.marmelad.js` (глобальные данные). Названия/ключи собственных данных блока преобразуются в **camelCase**.

## Модуль TCI

TCI (text command interface) - добавлен в шаблон вёрстки и дублирует CLI команды **marmelad** (cp, cb).


## Описание сборки стилей


Поддержка нескольких препроцессоров и полезных плагинов.


### Список поддерживаемых препроцессоров:

* **[gulp-stylus](https://www.npmjs.com/package/gulp-stylus)** - препроцессор CSS, использующий SASS-подобный синтаксис.
* **[gulp-postcss](https://github.com/postcss/gulp-postcss)** - инструмент для преобразования стилей с помощью плагинов JS.
* **[gulp-sass](https://www.npmjs.com/package/gulp-sass)** - препроцессор CSS, позволяющий компилировать scss и sass файлы в css.

### Список дополнительных плагинов:

* **[autoprefixer](https://www.npmjs.com/package/autoprefixer)** - для добавления префиксов к экспериментальным свойствам из CSS.
* **[postcss-momentum-scrolling](https://www.npmjs.com/package/postcss-momentum-scrolling)** - добавляет плавную прокрутку на iOS.
* **[postcss-inline-svg](https://www.npmjs.com/package/postcss-inline-svg)** - подключает svg и управляет его атрибутами.
* **[postcss-flexbugs-fixes](https://www.npmjs.com/package/postcss-flexbugs-fixes)** - исправляет все баги с flex.
* **[gulp-group-css-media-queries](https://www.npmjs.com/package/gulp-group-css-media-queries)** - группирует все медия-запросы в самом конце таблицы стилей.

## Bootstrap

Сборка **bootstrap** включается в `settings.marmelad.js` настройкой `app.bts.use: true`, все файлы собираются в корне сборке, в директории   `bootstrap`.

### Bootstrap как донор

Сборка **bootstrap как донор** включается в `settings.marmelad.js` настройкой `app.bts.donor: true`, при этом `app.bts.use` должен быть в `false`.

В случае использования **bootstrap** как **донора** для сборки стилей, файлы скриптов **bootstrap** копируются в директорию сборки `js/vendors`. Файлы стилей уже встраиваются так как вы их настроете, т.е. изменение файлов стилей **bootstrap** запускает сборку основных стилей, не запуская отдельную сборку стилей для **bootstrap**.

## Iconizer

Iconizer претерпел изменения в плане способах его подключения и использования в шаблонах.

### Типы SVG-спрайта

- `icons` - монохромные иконки, вырезаются все лишние атрибуты оформления
- `colored` - цветные иконоки, вырезается только тег `title`

### Пример использования цветной SVG-иконки

Для подключения цветной иконки необходимо добавить атрибут `type="colored"`

```html
<icon name="marmelad" type="colored">
```

### Режимы подключения SVG-спрайта

- `inline` - инлайнится в HTML-код страницы
- `external` - используется как отдельный файл, через обращение по URL его размещения

### Миграция для Iconizer 5+

В `settings.marmelad.js`, в секции `paths`, необходимо удалить более не требуемые данные, ключ `iconizer`

```js
const paths = {
  // удалить
  iconizer: {
    ...
  },
};
```

Добавить новый объект в `settings.marmelad.js`

```js
const iconizer = {
  cssClass: 'main-svg-sprite',
  mode: 'inline', // external отдельный подключаемый файл спрайта (default:inline)
  dest: path.join(paths.dist, 'img'), // путь для собираемых спрайтов
  url: 'img', // путь до подключаемого спрайта iconizer.dest без paths.dist
  srcIcons: path.join(folders.marmelad, folders.iconizer.src, 'icons'),
  srcColored: path.join(folders.marmelad, folders.iconizer.src, 'colored'),
  icon: (name, opts) => {
    opts = Object.assign({
      tag: 'div',
      type: 'icons',
      class: '',
    }, opts);

    let external = '';
    let typeClass = '';

    if (opts.mode === 'external') {
      external = `${opts.url}/sprite.${opts.type}.svg`;
    }

    if (opts.type !== 'icons') {
      typeClass = ` svg-icon--${opts.type}`;
    }

    opts.class = opts.class ? ` ${opts.class}` : '';

    return `
      <${opts.tag} class="svg-icon svg-icon--${name}${typeClass}${opts.class}" aria-hidden="true" focusable="false">
        <svg class="svg-icon__link">
          <use xlink:href="${external}#${name}"></use>
        </svg>
      </${opts.tag}>
    `;
  },
  plugin: {
    mode: {
      symbol: { // symbol mode to build the SVG
        example: false, // Build sample page
      },
    },
    svg: {
      xmlDeclaration: false, // strip out the XML attribute
      doctypeDeclaration: false, // don't include the !DOCTYPE declaration
    },
  },
};
```

и не забыть добавить его в экспорт настроек

```js
module.exports = {
  // добавить
  iconizer,
};
```

## Лицензия
[MIT](LICENSE)

*Логотип был взят и изменён, из набора иконок автора <a href="https://www.flaticon.com/authors/freepik" title="Jelly beans">Jelly beans</a> распространяемого под лицензией <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0" target="_blank">CC 3.0 BY</a> с <a href="https://www.flaticon.com/"     title="Flaticon">www.flaticon.com</a>*
