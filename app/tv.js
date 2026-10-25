/*
 * Access to the TV: the webOS system bus (Luna) through PalmServiceBridge on the TV,
 * and a stand-in with sample apps in a desktop browser, so the screen can be previewed on the Mac.
 * ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var SELF_ID = 'io.themetv.home';
  var isTV = typeof window.PalmServiceBridge !== 'undefined';

  // A bridge that is garbage collected before it answers never calls back, so keep it until it does.
  var pending = [];

  function luna(uri, params, done) {
    var bridge = new window.PalmServiceBridge();
    pending.push(bridge);
    bridge.onservicecallback = function (message) {
      pending.splice(pending.indexOf(bridge), 1);
      var result;
      try {
        result = JSON.parse(message);
      } catch (e) {
        result = {returnValue: false, errorText: 'Invalid response'};
      }
      if (done) done(result);
    };
    bridge.call(uri, JSON.stringify(params || {}));
  }

  function fromLaunchPoint(lp) {
    return {
      id: lp.id,
      title: lp.title || lp.id,
      icon: lp.largeIcon || lp.icon || '',
      color: lp.bgColor || ''
    };
  }

  // ---------- The TV's remote control API (SSAP) ----------
  // webOS 6 gives Developer Mode apps only the public Luna group, which leaves out listLaunchPoints. The TV's
  // remote control API (a WebSocket on port 3000, the one LG's phone app uses) answers it with the
  // READ_INSTALLED_APPS permission. The TV asks the viewer once to allow it; the key it gives back is kept.

  var SSAP_URL = 'ws://127.0.0.1:3000';
  var SSAP_KEY_STORAGE = 'ssapClientKey';
  var SSAP_TIMEOUT_MS = 90 * 1000; // time to answer the TV's prompt

  function readSsapKey() {
    try {
      return window.localStorage.getItem(SSAP_KEY_STORAGE);
    } catch (e) {
      return null;
    }
  }

  function storeSsapKey(key) {
    try {
      window.localStorage.setItem(SSAP_KEY_STORAGE, key);
    } catch (e) {}
  }

  // One request: registers (pairing on the first time), sends uri, done(payload) or done(null, error)
  function ssap(uri, done) {
    var socket;
    var finished = false;
    var timer = setTimeout(function () { finish(null, 'SSAP timeout'); }, SSAP_TIMEOUT_MS);

    function finish(payload, error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      try {
        socket.close();
      } catch (e) {}
      done(payload, error);
    }

    function send(message) {
      socket.send(JSON.stringify(message));
    }

    try {
      socket = new WebSocket(SSAP_URL);
    } catch (e) {
      finish(null, 'SSAP unavailable');
      return;
    }
    socket.onerror = function () { finish(null, 'SSAP connection failed'); };
    socket.onopen = function () {
      var payload = {
        forcePairing: false,
        pairingType: 'PROMPT',
        manifest: {manifestVersion: 1, appVersion: '1.0', permissions: ['READ_INSTALLED_APPS']}
      };
      var key = readSsapKey();
      if (key) payload['client-key'] = key;
      send({type: 'register', id: 'register', payload: payload});
    };
    socket.onmessage = function (event) {
      var message;
      try {
        message = JSON.parse(event.data);
      } catch (e) {
        return;
      }
      if (message.type === 'registered') {
        if (message.payload && message.payload['client-key']) storeSsapKey(message.payload['client-key']);
        send({type: 'request', id: 'request', uri: 'ssap://' + uri});
      } else if (message.type === 'error') {
        finish(null, message.error || 'SSAP refused');
      } else if (message.type === 'response' && message.id === 'request') {
        finish(message.payload);
      }
    };
  }

  function isShown(lp) {
    return lp.id !== SELF_ID && lp.visible !== false && lp.hidden !== true;
  }

  var SAMPLE_APPS = [
    {id: 'netflix', title: 'Netflix', icon: '', color: '#b20710'},
    {id: 'youtube.leanback.v4', title: 'YouTube', icon: '', color: '#cc0000'},
    {id: 'amazon', title: 'Prime Video', icon: '', color: '#00739e'},
    {id: 'com.disney.disneyplus-prod', title: 'Disney+', icon: '', color: '#0e2a8a'},
    {id: 'spotify-beehive', title: 'Spotify', icon: '', color: '#168d40'},
    {id: 'com.webos.app.hdmi1', title: 'HDMI 1', icon: '', color: ''},
    {id: 'com.webos.app.hdmi2', title: 'HDMI 2', icon: '', color: ''},
    {id: 'com.webos.app.livetv', title: window.t('sample.liveTv'), icon: '', color: ''},
    {id: 'com.webos.app.browser', title: window.t('sample.browser'), icon: '', color: ''},
    {id: 'com.webos.app.photovideo', title: window.t('sample.photos'), icon: '', color: ''},
    {id: 'com.webos.app.music', title: window.t('sample.music'), icon: '', color: ''},
    {id: 'com.webos.app.discovery', title: 'LG Content Store', icon: '', color: ''},
    {id: 'com.palm.app.settings', title: window.t('sample.settings'), icon: '', color: ''}
  ];

  window.TV = {
    isTV: isTV,

    // done(apps, error): apps as [{id, title, icon, color}] in the TV's order
    listApps: function (done) {
      if (!isTV) {
        setTimeout(function () { done(SAMPLE_APPS.slice()); }, 0);
        return;
      }
      function answer(res, error) {
        if (!res || !res.launchPoints) {
          done([], error || (res && res.errorText) || 'listLaunchPoints failed');
          return;
        }
        done(res.launchPoints.filter(isShown).map(fromLaunchPoint));
      }
      luna('luna://com.webos.applicationManager/listLaunchPoints', {}, function (res) {
        // Denied (webOS 6 and later in Developer Mode): ask the remote control API instead
        if (res.returnValue) answer(res);
        else ssap('com.webos.applicationManager/listLaunchPoints', answer);
      });
    },

    // done(ok, error)
    launch: function (id, done) {
      if (!isTV) {
        setTimeout(function () { if (done) done(true); }, 0);
        return;
      }
      luna('luna://com.webos.applicationManager/launch', {id: id}, function (res) {
        if (done) done(!!res.returnValue, res.errorText);
      });
    },

    // Opens LG's Developer Mode app, where EXTEND renews the session; done(ok, error)
    openDeveloperMode: function (done) {
      if (!isTV) {
        setTimeout(function () { if (done) done(true); }, 0);
        return;
      }
      luna('luna://com.webos.applicationManager/launch', {id: 'com.palmdts.devmode'}, function (res) {
        if (done) done(!!res.returnValue, res.errorText);
      });
    }
  };
})();
