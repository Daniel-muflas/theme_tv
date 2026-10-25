/*
 * Starts the app from the files installed with it, or from a newer bundle that updater.js downloaded from
 * GitHub and kept in localStorage. Written into the page while it loads (document.write), so the files run
 * in order, as script tags would. This file and index.html never update themselves: keep them simple.
 * ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  // The installed files, in loading order. A bundle carries its own list.
  var FILES = ['styles.css', 'themes.css', 'wallpaper.css', 'config.js', 'i18n.js', 'layout.js', 'tv.js',
    'widgets.js', 'devmode.js', 'header.js', 'baroque.js', 'wallpaper.js', 'updater.js', 'main.js'];
  // Written per TV by install-tv: always the installed copy
  var LOCAL_ONLY = {'devmode.js': true};

  var BUNDLE_KEY = 'updateBundle';
  var STARTING_KEY = 'updateStarting'; // set while a bundle starts; main.js clears it once the screen is up
  var BROKEN_KEY = 'updateBroken';

  var store = null;
  try {
    store = window.localStorage;
  } catch (e) {}

  function read(key) {
    try {
      return store ? store.getItem(key) : null;
    } catch (e) {
      return null;
    }
  }

  function write(key, value) {
    try {
      if (value === null) store.removeItem(key);
      else store.setItem(key, value);
    } catch (e) {}
  }

  var bundle = null;
  try {
    bundle = JSON.parse(read(BUNDLE_KEY));
  } catch (e) {}

  if (bundle) {
    // A bundle that did not finish starting last time is broken: back to the installed files, for good
    var crashed = read(STARTING_KEY) === String(bundle.version);
    if (crashed) write(BROKEN_KEY, String(bundle.version));
    if (crashed || !(bundle.version > window.APP_VERSION) || !bundle.files || !bundle.order) {
      write(BUNDLE_KEY, null);
      bundle = null;
    }
    write(STARTING_KEY, bundle ? String(bundle.version) : null);
  }

  window.RUNNING_VERSION = bundle ? bundle.version : window.APP_VERSION;

  var html = [];
  (bundle ? bundle.order : FILES).forEach(function (name) {
    var css = /\.css$/.test(name);
    var text = bundle && !LOCAL_ONLY[name] ? bundle.files[name] : undefined;
    if (text === undefined) {
      html.push(css ? '<link rel="stylesheet" href="' + name + '">' : '<script src="' + name + '"></scr' + 'ipt>');
    } else if (css) {
      html.push('<style>' + text + '</style>');
    } else {
      // A closing script tag inside the code would end the tag early
      html.push('<script>' + text.replace(/<\/(script)/gi, '<\\/$1') + '</scr' + 'ipt>');
    }
  });
  document.write(html.join('\n'));
})();
