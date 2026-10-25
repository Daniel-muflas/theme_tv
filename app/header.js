/*
 * The pill at the top right: the Developer Mode countdown, with its renewal.
 * main.js moves the focus to it and calls activate(). ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var DAY_MS = 24 * 60 * 60 * 1000;
  var SESSION_MS = 1000 * 60 * 60 * 1000; // LG's Developer Mode session: 1000 hours
  var WARN_DAYS = 7;
  var EXPIRES_STORAGE_KEY = 'devmodeExpiresAt';
  var LG_SESSION_URL = 'https://developer.lge.com/secure/';
  var COUNTDOWN_EVERY_MS = 60 * 1000;

  var t = window.t;
  var config = {};
  var toast = function () {};
  var el = {};
  var session = null; // {token, expiresAt}

  function readStoredExpiry() {
    try {
      return parseInt(window.localStorage.getItem(EXPIRES_STORAGE_KEY), 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function storeExpiry(ms) {
    try {
      window.localStorage.setItem(EXPIRES_STORAGE_KEY, String(ms));
    } catch (e) {}
  }

  // The install script's figure, or a newer one from a renewal made here. A browser gets a sample.
  function loadSession() {
    if (!window.TV.isTV) return {token: 'preview', expiresAt: Date.now() + 23 * DAY_MS + 5 * 60 * 60 * 1000};
    var installed = window.DEVMODE;
    if (!installed) return null;
    return {token: installed.token, expiresAt: Math.max(installed.expiresAt || 0, readStoredExpiry())};
  }

  function daysLeft() {
    return session ? (session.expiresAt - Date.now()) / DAY_MS : null;
  }

  function showCountdown() {
    var days = daysLeft();
    var text;
    if (days === null) text = t('dev.unknown');
    else if (days <= 0) text = t('dev.expired');
    else if (days < 1) text = t('dev.hours', {n: Math.ceil(days * 24)});
    else text = t(Math.floor(days) === 1 ? 'dev.day' : 'dev.days', {n: Math.floor(days)});
    el.devmodeLabel.textContent = text;
    var warn = days !== null && days < WARN_DAYS;
    el.devmode.className = el.devmode.className.replace(/ ?warning/g, '') + (warn ? ' warning' : '');
  }

  // Asks LG to restart the session's 1000 hours, the same as EXTEND in the Developer Mode app.
  // done(ok). On a TV that blocks the request, ok is false.
  function renewSession(done) {
    if (!window.TV.isTV) {
      setTimeout(function () { done(true); }, 300);
      return;
    }
    if (!session || !session.token) {
      done(false);
      return;
    }
    var xhr = new XMLHttpRequest();
    xhr.open('GET', LG_SESSION_URL + 'ResetDevModeSession.dev?sessionToken=' + encodeURIComponent(session.token), true);
    xhr.timeout = 15000;
    xhr.onload = function () {
      var ok = false;
      try {
        ok = JSON.parse(xhr.responseText).result === 'success';
      } catch (e) {}
      done(ok);
    };
    xhr.onerror = xhr.ontimeout = function () { done(false); };
    xhr.send();
  }

  function renewed() {
    session.expiresAt = Date.now() + SESSION_MS;
    storeExpiry(session.expiresAt);
    showCountdown();
  }

  function renew() {
    toast(t('dev.renewing'));
    renewSession(function (ok) {
      if (ok) {
        renewed();
        toast(t('dev.renewed', {n: Math.floor(daysLeft())}));
        return;
      }
      // Renew by hand: EXTEND in LG's own app
      window.TV.openDeveloperMode(function (opened) {
        toast(t(opened ? 'dev.pressExtend' : 'dev.openFailed'));
      });
    });
  }

  function autoRenew() {
    var limit = (config.devMode && config.devMode.autoRenewDays) || 0;
    var days = daysLeft();
    if (!window.TV.isTV || !session || !session.token || days === null || days >= limit) return;
    renewSession(function (ok) {
      if (!ok) return;
      renewed();
      toast(t('dev.autoRenewed'));
    });
  }

  window.Header = {
    // options: {config, toast(text)}. Returns the pills shown, for main.js to focus.
    start: function (options) {
      config = options.config;
      toast = options.toast;
      el.devmode = document.getElementById('devmode');
      el.devmodeLabel = document.getElementById('devmode-label');

      var items = [];
      if (!config.devMode || config.devMode.show !== false) {
        session = loadSession();
        showCountdown();
        setInterval(showCountdown, COUNTDOWN_EVERY_MS);
        autoRenew();
        items.push(el.devmode);
      } else {
        el.devmode.style.display = 'none';
      }
      return items;
    },

    activate: function (item) {
      if (item === el.devmode) renew();
    },

    // Back to the screen after another app
    refresh: function () {
      if (session) showCountdown();
    }
  };
})();
