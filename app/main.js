/*
 * The home screen: a clock and a grid of the chosen apps, driven by the remote's arrows and OK,
 * or by the Magic Remote's pointer. ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var KEY = {LEFT: 37, UP: 38, RIGHT: 39, DOWN: 40, OK: 13, BACK: 461, BACKSPACE: 8, ESCAPE: 27, YELLOW: 405,
    BLUE: 406, A: 65, T: 84};
  var t = window.t;
  var ALL_APPS_TILE = {id: '__all__', title: t('all.heading'), icon: '', color: ''};
  var THEMES_TILE = {id: '__themes__', title: t('themes.heading'), icon: '', color: ''};
  var WALLPAPERS_TILE = {id: '__wallpapers__', title: t('wallpapers.heading'), icon: '', color: ''};

  // Looks in themes.css, named by i18n.js's theme.<id>; swatch and ink color their tile in the theme
  // picker. layout swaps the home grid for another arrangement (also in themes.css). 'auto' stands for config.autoTheme's day and night themes.
  var THEMES = [
    {id: 'auto', swatch: '#888888', ink: '#ffffff',
      swatchImage: 'linear-gradient(90deg, #f2f0eb 50%, #111318 50%)'},
    {id: 'dark', swatch: '#111318', ink: '#eef0f4'},
    {id: 'swiss', swatch: '#f2f0eb', ink: '#e30613'},
    {id: 'brutal', swatch: '#ffe14d', ink: '#000000'},
    {id: 'glass', swatch: '#4b3a9e', ink: '#ffffff'},
    {id: 'pastel', swatch: '#ffc8dd', ink: '#4a3f55'},
    {id: 'immersive', swatch: '#1b2a6b', ink: '#8fb4ff'},
    {id: 'skeuo', swatch: '#6b4220', ink: '#f0d48c'},
    {id: 'metro', swatch: '#00aba9', ink: '#ffffff'},
    {id: 'neumorph', swatch: '#e0e5ec', ink: '#5b7cfa'},
    {id: 'clay', swatch: '#ff8fab', ink: '#ffffff'},
    {id: 'material', swatch: '#eaddff', ink: '#6750a4'},
    {id: 'editorial', swatch: '#f7f3ea', ink: '#111111'},
    {id: 'eink', swatch: '#f4f4f0', ink: '#000000'},
    {id: 'synthwave', swatch: '#2a0845', ink: '#ff2975'},
    {id: 'cyberpunk', swatch: '#0a0a0f', ink: '#fcee0a'},
    {id: 'teletext', swatch: '#0000ff', ink: '#ffff00'},
    {id: 'terminal', swatch: '#050a05', ink: '#33ff66'},
    {id: 'pixel', swatch: '#5c94fc', ink: '#f8b800'},
    {id: 'artdeco', swatch: '#0f0f0f', ink: '#d4af37'},
    {id: 'bento', swatch: '#1a1a1f', ink: '#ff8a5c', layout: 'bento'},
    {id: 'carousel', swatch: '#000000', ink: '#e8e8e8', layout: 'carousel'}
  ];
  var TILE_PITCH = 280; // a tile's width plus its side margins, in styles.css
  var THEME_STORAGE_KEY = 'theme';

  var config = window.HOME_CONFIG || {};
  var columns = config.columns || 6;
  var auto = config.autoTheme || {};

  var state = {
    apps: [],
    view: 'home', // 'home' | 'all' | 'themes' | 'wallpapers'
    theme: 'dark', // what was picked, maybe 'auto'
    rootClass: '',
    tiles: [],
    area: 'grid', // 'grid' | 'header': where the focus is
    ambient: false, // the wallpaper alone, the rest of the screen hidden
    headerItems: [],
    headerFocus: 0,
    focus: 0,
    homeFocus: 0
  };

  var el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function findTheme(id) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === id) return THEMES[i];
    }
    return null;
  }

  function themeIndex(id) {
    return THEMES.indexOf(findTheme(id));
  }

  // Storage can be missing or throw (private windows, blocked site data): the theme then lasts until a reload.
  function readStoredTheme() {
    try {
      return window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch (e) {
      return null;
    }
  }

  function storeTheme(id) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, id);
    } catch (e) {}
  }

  // ?theme=<id> in the address wins, for previews; then the last one picked; then config.js.
  function initialTheme() {
    var match = /[?&]theme=([a-z]+)/.exec(window.location.search);
    var candidates = [match && match[1], readStoredTheme(), config.theme];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && findTheme(candidates[i])) return candidates[i];
    }
    return 'dark';
  }

  // The theme on screen: 'auto' resolves to the day or the night one by the hour.
  function shownTheme() {
    if (state.theme !== 'auto') return findTheme(state.theme);
    var hour = new Date().getHours();
    var day = hour >= (auto.dayStarts || 7) && hour < (auto.nightStarts || 20);
    return findTheme(day ? auto.day : auto.night) || findTheme(day ? 'swiss' : 'dark');
  }

  // Layouts other than the grid apply only to the home view: the app list and the theme picker stay grids.
  // Returns whether the class changed.
  function updateRootClass() {
    var theme = shownTheme();
    var cls = 'theme-' + theme.id;
    if (theme.layout && state.view === 'home') cls += ' layout-' + theme.layout;
    if (window.Wallpaper.active()) cls += ' has-wallpaper';
    if (state.ambient) cls += ' ambient';
    if (cls === state.rootClass) return false;
    state.rootClass = cls;
    el.root.className = cls;
    return true;
  }

  function pickTheme(id) {
    state.theme = id;
    storeTheme(id);
    render();
  }

  function cycleTheme() {
    var next = THEMES[(themeIndex(state.theme) + 1) % THEMES.length];
    pickTheme(next.id);
    toast(t('toast.theme', {name: t('theme.' + next.id)}));
  }

  // Favorites in the configured order, each matched by exact id or by part of its title.
  function pickFavorites(apps, wanted) {
    if (!wanted || !wanted.length) return apps.slice();
    var used = {};
    var out = [];
    wanted.forEach(function (entry) {
      var needle = String(entry).toLowerCase();
      var match = null;
      apps.forEach(function (app) {
        if (match || used[app.id]) return;
        if (app.id.toLowerCase() === needle) match = app;
      });
      apps.forEach(function (app) {
        if (match || used[app.id]) return;
        if (app.title.toLowerCase().indexOf(needle) !== -1) match = app;
      });
      if (match) {
        used[match.id] = true;
        out.push(match);
      }
    });
    return out;
  }

  function tilesFor(view) {
    if (view === 'all') return state.apps.slice();
    if (view === 'themes') {
      return THEMES.map(function (theme) {
        return {id: '__theme__' + theme.id, title: t('theme.' + theme.id), icon: '', color: '', theme: theme};
      });
    }
    if (view === 'wallpapers') {
      return window.Wallpaper.options().map(function (option) {
        return {id: '__wallpaper__' + option.id, title: t('wallpaper.' + option.id), icon: '', color: '',
          wallpaper: option};
      });
    }
    var tiles = pickFavorites(state.apps, config.favorites);
    if (config.showAllAppsTile !== false) tiles.push(ALL_APPS_TILE);
    if (config.showThemeTile !== false) tiles.push(THEMES_TILE);
    if (config.showWallpaperTile !== false) tiles.push(WALLPAPERS_TILE);
    return tiles;
  }

  // A theme's or a wallpaper's tile in its picker: its colors, a sample and a check on the one in use
  function swatchArt(art, option, inUse) {
    // Inline !important beats the themes' own tile colors, so each swatch shows its own
    art.className += ' art-swatch';
    art.style.setProperty('background-color', option.swatch, 'important');
    art.style.setProperty('background-image', option.swatchImage || 'none', 'important');
    var sample = document.createElement('div');
    sample.className = 'letter';
    sample.textContent = 'Aa';
    sample.style.setProperty('color', option.ink, 'important');
    art.appendChild(sample);
    if (inUse) {
      var check = document.createElement('div');
      check.className = 'check';
      check.textContent = '✓';
      art.appendChild(check);
    }
  }

  function tileElement(app, index) {
    var tile = document.createElement('div');
    tile.className = 'tile';
    tile.setAttribute('data-index', index);

    var art = document.createElement('div');
    art.className = 'art c' + (index % 6);
    if (app.color) art.style.backgroundColor = app.color;
    if (app.theme) {
      swatchArt(art, app.theme, app.theme.id === state.theme);
    } else if (app.wallpaper) {
      swatchArt(art, app.wallpaper, app.wallpaper.id === window.Wallpaper.current());
    } else if (app === ALL_APPS_TILE) {
      art.className += ' art-all';
      art.innerHTML = '<span></span><span></span><span></span><span></span>';
    } else if (app === THEMES_TILE) {
      art.className += ' art-themes';
      art.innerHTML = '<span></span>';
    } else if (app === WALLPAPERS_TILE) {
      // Shares the theme tile's colors in every theme, with its own symbol
      art.className += ' art-themes art-wallpapers';
      art.innerHTML = '<i></i>';
    } else if (app.icon) {
      var img = document.createElement('img');
      img.src = app.icon;
      img.alt = '';
      art.appendChild(img);
    } else {
      var letter = document.createElement('div');
      letter.className = 'letter';
      letter.textContent = app.title.charAt(0).toUpperCase();
      art.appendChild(letter);
    }

    var label = document.createElement('div');
    label.className = 'label';
    label.textContent = app.title;

    tile.appendChild(art);
    tile.appendChild(label);
    return tile;
  }

  function hintFor(view) {
    if (view === 'all') return t('hint.back');
    if (view === 'themes') return t('hint.themes');
    if (view === 'wallpapers') return t('hint.wallpapers');
    return '';
  }

  function render() {
    updateRootClass();
    state.tiles = tilesFor(state.view);
    if (state.focus >= state.tiles.length) state.focus = Math.max(0, state.tiles.length - 1);

    el.heading.textContent = t(state.view + '.heading');
    el.hint.textContent = hintFor(state.view);
    el.grid.innerHTML = '';
    state.tiles.forEach(function (app, i) {
      el.grid.appendChild(tileElement(app, i));
    });
    if (!state.tiles.length) {
      var empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = t('grid.empty');
      el.grid.appendChild(empty);
    }
    el.gridWrap.scrollTop = 0;
    showFocus();
  }

  function showFocus() {
    var inGrid = state.area === 'grid';
    state.headerItems.forEach(function (item, i) {
      var focused = !inGrid && i === state.headerFocus;
      item.className = item.className.replace(/ ?focused/g, '') + (focused ? ' focused' : '');
    });
    var tiles = el.grid.querySelectorAll('.tile');
    for (var i = 0; i < tiles.length; i++) {
      tiles[i].className = inGrid && i === state.focus ? 'tile focused' : 'tile';
    }
    var focused = tiles[state.focus];
    if (!focused) return;
    centerCarousel(focused);
    var top = focused.offsetTop;
    var bottom = top + focused.offsetHeight;
    if (top < el.gridWrap.scrollTop) {
      el.gridWrap.scrollTop = top;
    } else if (bottom > el.gridWrap.scrollTop + el.gridWrap.clientHeight) {
      el.gridWrap.scrollTop = bottom - el.gridWrap.clientHeight;
    }
  }

  // The carousel keeps the focused tile in the middle of the screen by sliding the row under it.
  function centerCarousel(focused) {
    var transform = '';
    if (state.rootClass.indexOf('layout-carousel') !== -1) {
      var x = focused.offsetLeft + focused.offsetWidth / 2 - 960;
      transform = 'translateX(' + (-x) + 'px)';
    }
    el.grid.style.webkitTransform = transform;
    el.grid.style.transform = transform;
  }

  function center(rect) {
    return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2};
  }

  // Spatial navigation: the nearest tile in the arrow's direction, as laid out on screen, so the bento and
  // carousel layouts and the 3D tilt need no rules of their own. Left and right stay on tiles that share
  // the row band; up and down prefer tiles that share the column band and otherwise take the nearest one
  // (the last tile of a shorter row below).
  function moveFocus(key) {
    var tiles = el.grid.querySelectorAll('.tile');
    if (!tiles[state.focus]) return;
    var from = tiles[state.focus].getBoundingClientRect();
    var origin = center(from);
    var horizontal = key === KEY.LEFT || key === KEY.RIGHT;
    var sign = key === KEY.LEFT || key === KEY.UP ? -1 : 1;
    var best = {aligned: -1, alignedScore: Infinity, any: -1, anyScore: Infinity};

    for (var i = 0; i < tiles.length; i++) {
      if (i === state.focus) continue;
      var rect = tiles[i].getBoundingClientRect();
      var c = center(rect);
      var along = sign * (horizontal ? c.x - origin.x : c.y - origin.y);
      if (along <= 1) continue;
      var across = Math.abs(horizontal ? c.y - origin.y : c.x - origin.x);
      var score = along + 2 * across;
      var aligned = horizontal
        ? rect.top < from.bottom && rect.bottom > from.top
        : rect.left < from.right && rect.right > from.left;
      if (aligned && score < best.alignedScore) {
        best.aligned = i;
        best.alignedScore = score;
      }
      if (score < best.anyScore) {
        best.any = i;
        best.anyScore = score;
      }
    }

    var next = best.aligned >= 0 ? best.aligned : horizontal ? -1 : best.any;
    if (next >= 0) {
      state.focus = next;
      showFocus();
    } else if (key === KEY.UP && state.headerItems.length) {
      // Above the first row: the pills at the top right
      state.area = 'header';
      showFocus();
    }
  }

  function moveHeaderFocus(key) {
    if (key === KEY.DOWN) state.area = 'grid';
    else if (key === KEY.LEFT && state.headerFocus > 0) state.headerFocus -= 1;
    else if (key === KEY.RIGHT && state.headerFocus < state.headerItems.length - 1) state.headerFocus += 1;
    showFocus();
  }

  function showView(view) {
    if (state.view === 'home') state.homeFocus = state.focus;
    if (view === 'home') state.focus = state.homeFocus;
    else if (view === 'themes') state.focus = Math.max(0, themeIndex(state.theme));
    else state.focus = 0;
    state.view = view;
    render();
  }

  var toastTimer = null;

  function toast(text) {
    el.toast.textContent = text;
    el.toast.className = 'toast visible';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.toast.className = 'toast'; }, 2500);
  }

  var ZOOM_MS = 520;

  // The launch transition: a copy of the tile's artwork grows from where it is until it fills the screen,
  // while the rest of the screen comes forward and fades, as if going into the app. done() runs when the
  // screen is covered. The copy stays until resetZoom(): on the TV the app opens over it, and coming back
  // (relaunch or visibility) clears it.
  function zoomInto(index, done) {
    var art = el.grid.querySelectorAll('.tile')[index];
    art = art && art.querySelector('.art');
    if (!art || config.launchAnimation === false) {
      done();
      return;
    }
    state.launching = true;

    // The root is scaled to the window; work in its own 1920x1080 coordinates
    var rootRect = el.root.getBoundingClientRect();
    var scale = rootRect.width / 1920;
    var rect = art.getBoundingClientRect();
    var w = rect.width / scale;
    var h = rect.height / scale;
    var x = (rect.left - rootRect.left) / scale;
    var y = (rect.top - rootRect.top) / scale;

    var zoom = art.cloneNode(true);
    zoom.className += ' zoom';
    zoom.style.left = x + 'px';
    zoom.style.top = y + 'px';
    zoom.style.width = w + 'px';
    zoom.style.height = h + 'px';
    el.root.appendChild(zoom);
    el.zoom = zoom;

    var grow = Math.max(1920 / w, 1080 / h) * 1.2;
    var target = 'translate(' + (960 - x - w / 2) + 'px, ' + (540 - y - h / 2) + 'px) scale(' + grow + ')';
    // Next frame, so the copy is drawn at the tile's place before it moves
    setTimeout(function () {
      zoom.style.webkitTransform = target;
      zoom.style.transform = target;
      zoom.className += ' zoom-in';
      el.root.className += ' launching';
    }, 20);
    setTimeout(done, ZOOM_MS);
  }

  function resetZoom() {
    state.launching = false;
    el.root.className = state.rootClass;
    var zoom = el.zoom;
    el.zoom = null;
    if (!zoom) return;
    zoom.className += ' zoom-out';
    setTimeout(function () {
      if (zoom.parentNode) zoom.parentNode.removeChild(zoom);
    }, 300);
  }

  function open(index) {
    var app = state.tiles[index];
    if (!app) return;
    if (app === ALL_APPS_TILE) {
      showView('all');
      return;
    }
    if (app === THEMES_TILE) {
      showView('themes');
      return;
    }
    if (app === WALLPAPERS_TILE) {
      showView('wallpapers');
      return;
    }
    if (app.theme) {
      pickTheme(app.theme.id);
      return;
    }
    if (app.wallpaper) {
      window.Wallpaper.pick(app.wallpaper.id);
      render();
      return;
    }
    if (state.launching) return;
    zoomInto(index, function () {
      window.TV.launch(app.id, function (ok, error) {
        if (!ok) {
          resetZoom();
          toast(t('toast.openFailed', {name: app.title}) + (error ? ' (' + error + ')' : ''));
        } else if (!window.TV.isTV) {
          // In a browser nothing takes over the screen, so come back out after a moment
          setTimeout(function () {
            resetZoom();
            toast(t('toast.openingSimulated', {name: app.title}));
          }, 700);
        }
      });
    });
  }

  // The wallpaper alone: the rest of the screen fades away until a key is pressed
  function setAmbient(on) {
    state.ambient = on && window.Wallpaper.active();
    updateRootClass();
  }

  var idleTimer = null;

  function stillHere() {
    clearTimeout(idleTimer);
    var minutes = (config.wallpaper || {}).idleMinutes;
    if (!minutes) return;
    idleTimer = setTimeout(function () {
      if (!state.launching) setAmbient(true);
    }, minutes * 60 * 1000);
  }

  function onKey(event) {
    var key = event.keyCode;
    stillHere();
    if (state.launching) {
      event.preventDefault();
      return;
    }
    // Any key brings the screen back, and does nothing else
    if (state.ambient) {
      setAmbient(false);
      event.preventDefault();
      return;
    }
    var arrow = key === KEY.LEFT || key === KEY.RIGHT || key === KEY.UP || key === KEY.DOWN;
    if (arrow && state.area === 'header') {
      moveHeaderFocus(key);
    } else if (arrow) {
      moveFocus(key);
    } else if (key === KEY.OK && state.area === 'header') {
      window.Header.activate(state.headerItems[state.headerFocus]);
    } else if (key === KEY.OK) {
      open(state.focus);
    } else if (key === KEY.BACK || key === KEY.BACKSPACE || key === KEY.ESCAPE) {
      if (state.view !== 'home') showView('home');
    } else if (key === KEY.BLUE || key === KEY.T) {
      cycleTheme();
    } else if (key === KEY.YELLOW || key === KEY.A) {
      setAmbient(true);
    } else {
      return;
    }
    event.preventDefault();
  }

  function tileIndex(target) {
    while (target && target !== el.grid) {
      if (target.getAttribute && target.getAttribute('data-index') !== null) {
        return parseInt(target.getAttribute('data-index'), 10);
      }
      target = target.parentNode;
    }
    return -1;
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function updateClock() {
    var now = new Date();
    var hours = now.getHours();
    var suffix = '';
    if (config.clock24h === false) {
      suffix = hours < 12 ? t('time.am') : t('time.pm');
      hours = hours % 12 || 12;
    }
    el.time.textContent = (config.clock24h === false ? hours : pad(hours)) + ':' + pad(now.getMinutes()) + suffix;
    el.date.textContent = t('date.format', {
      day: t('date.days')[now.getDay()],
      date: now.getDate(),
      month: t('date.months')[now.getMonth()]
    });
    // The automatic theme turns to night (or day) on the hour
    if (state.theme === 'auto' && el.grid.firstChild && updateRootClass()) showFocus();
  }

  // The layout is drawn for 1920x1080, the TV's size; a smaller browser window gets it scaled down.
  function fitToWindow() {
    var scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    var transform = scale === 1 ? '' : 'scale(' + scale + ')';
    el.root.style.webkitTransform = transform;
    el.root.style.transform = transform;
  }

  function loadApps() {
    window.TV.listApps(function (apps, error) {
      if (error) toast(t('toast.appsFailed') + ' (' + error + ')');
      state.apps = apps;
      render();
    });
  }

  function start() {
    document.body.insertAdjacentHTML('afterbegin', window.LAYOUT);
    el.root = $('root');
    el.time = $('time');
    el.date = $('date');
    el.heading = $('heading');
    el.hint = $('hint');
    el.grid = $('grid');
    el.gridWrap = $('grid-wrap');
    el.toast = $('toast');

    state.theme = initialTheme();
    el.grid.style.width = columns * TILE_PITCH + 'px';
    // The header ends where the grid's last column does: 120px of grid padding and tile margin on the left
    var right = 1920 - (120 + columns * TILE_PITCH - 32) + 'px';
    document.querySelector('.widgets').style.right = right;
    document.querySelector('.header-actions').style.right = right;

    document.addEventListener('keydown', onKey);
    el.grid.addEventListener('mouseover', function (event) {
      var i = tileIndex(event.target);
      if (i >= 0 && (i !== state.focus || state.area !== 'grid')) {
        state.focus = i;
        state.area = 'grid';
        showFocus();
      }
    });
    el.grid.addEventListener('click', function (event) {
      var i = tileIndex(event.target);
      if (i >= 0) open(i);
    });

    // Opening the app again (it is already running) comes back to the home view, with any new apps.
    // Back from an opened app: undo the launch transition
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) return;
      if (state.launching) resetZoom();
      window.Header.refresh();
    });
    document.addEventListener('webkitvisibilitychange', function () {
      if (document.webkitHidden) return;
      if (state.launching) resetZoom();
      window.Header.refresh();
    });

    document.addEventListener('webOSRelaunch', function () {
      if (state.launching) resetZoom();
      window.Header.refresh();
      state.area = 'grid';
      if (state.view !== 'home') state.focus = state.homeFocus;
      state.view = 'home';
      loadApps();
    });

    window.Wallpaper.start({config: config});
    window.Widgets.start($('widgets'), config);
    state.headerItems = window.Header.start({config: config, toast: toast});
    state.headerItems.forEach(function (item, i) {
      item.addEventListener('mouseover', function () {
        state.area = 'header';
        state.headerFocus = i;
        showFocus();
      });
      item.addEventListener('click', function () {
        window.Header.activate(item);
      });
    });

    document.addEventListener('mousemove', function () {
      stillHere();
      if (state.ambient) setAmbient(false);
    });

    window.addEventListener('resize', fitToWindow);
    fitToWindow();
    updateClock();
    setInterval(updateClock, 10000);
    loadApps();
    stillHere();

    window.Updater.start({config: config, toast: toast, isBusy: function () {
      return state.launching;
    }});
    window.Updater.started();
  }

  document.addEventListener('DOMContentLoaded', start);
})();
