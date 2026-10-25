/*
 * Updates from GitHub: fetches the bundle the repo publishes on GitHub Pages (config.update.url,
 * tools/build_bundle.py) and, when its version is higher than the one running, keeps it in localStorage and
 * restarts the screen, which loader.js then starts from the bundle. ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var BUNDLE_KEY = 'updateBundle';
  var STARTING_KEY = 'updateStarting';
  var BROKEN_KEY = 'updateBroken';
  var FIRST_CHECK_MS = 30 * 1000; // after the screen is up, not to slow the start
  var BUSY_RETRY_MS = 30 * 1000;

  var t = window.t;
  var options = {};

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function usable(bundle) {
    return bundle && typeof bundle.version === 'number' && bundle.files && bundle.order &&
      bundle.files['main.js'] !== undefined;
  }

  // Restarts once nothing is going on (an app launching, say)
  function restart() {
    if (options.isBusy && options.isBusy()) {
      setTimeout(restart, BUSY_RETRY_MS);
      return;
    }
    window.location.reload();
  }

  function check() {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', options.config.update.url + '?t=' + Date.now(), true);
    xhr.timeout = 60000;
    xhr.onload = function () {
      if (xhr.status !== 200) return;
      var bundle;
      try {
        bundle = JSON.parse(xhr.responseText);
      } catch (e) {
        return;
      }
      if (!usable(bundle) || bundle.version <= window.RUNNING_VERSION) return;
      if (String(bundle.version) === read(BROKEN_KEY)) return;
      try {
        window.localStorage.setItem(BUNDLE_KEY, xhr.responseText);
      } catch (e) {
        return; // no room: stay on this version
      }
      options.toast(t('update.ready'));
      setTimeout(restart, 3000);
    };
    xhr.send();
  }

  window.Updater = {
    // options: {config, toast(text), isBusy()}
    start: function (opts) {
      options = opts;
      var update = options.config.update;
      if (!update || !update.url) return;
      setTimeout(check, FIRST_CHECK_MS);
      setInterval(check, (update.everyHours || 6) * 60 * 60 * 1000);
    },

    // The screen is up: the bundle running, if any, works
    started: function () {
      try {
        window.localStorage.removeItem(STARTING_KEY);
      } catch (e) {}
    }
  };
})();
