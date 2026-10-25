/*
 * Wallpapers behind the screen: the Baroque gallery (paintings from baroque.js, from Wikimedia Commons, in a
 * gilt frame with a plaque) and a wood fire (a canvas fire in a stone fireplace). main.js picks one and
 * hides the rest of the screen to show it alone. ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'wallpaper';
  var ART_INDEX_KEY = 'wallpaperArt';
  var IMAGE_WIDTH = 1600; // Commons scales the images to this width
  var FRAME = 56; // the gilt frame's width around the painting
  var PLAQUE = 96; // room under the frame for the plaque
  var AREA = {width: 1600, height: 1080 - 2 * 40}; // where the framed painting fits
  var FAILED_RETRY_MS = 15000;

  // Fire: a small grid of heat values, drawn scaled up (the blur makes it soft) at about 30 frames a second
  var FIRE_W = 120;
  var FIRE_H = 80;
  var FIRE_FRAME_MS = 33;

  var config = {};
  var layer = null;
  var current = 'none';
  var art = {timer: null, index: 0, slot: 0, slots: []};
  var fire = {timer: null, canvas: null, context: null, glow: null, heat: null, image: null, palette: null};

  var OPTIONS = [
    {id: 'none', swatch: '#2a2d34', ink: '#9aa1ae'},
    {id: 'baroque', swatch: '#3a1014', ink: '#3a1014',
      swatchImage: 'linear-gradient(135deg, #f6e27a 0%, #b8862b 35%, #f3d777 55%, #8a6420 80%, #e6c66e 100%)'},
    {id: 'fireplace', swatch: '#1a0f0a', ink: '#ffcf70',
      swatchImage: 'radial-gradient(ellipse at 50% 100%, #ffcf70 0%, #ff7a1a 30%, #8a1c06 60%, #1a0f0a 85%)'}
  ];

  function read(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function store(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {}
  }

  function element(className, parent) {
    var node = document.createElement('div');
    node.className = className;
    if (parent) parent.appendChild(node);
    return node;
  }

  // ---------- Baroque gallery ----------

  function imageUrl(file) {
    return 'https://commons.wikimedia.org/wiki/Special:FilePath/' + encodeURIComponent(file) + '?width=' + IMAGE_WIDTH;
  }

  // The painting at its own proportions, as big as AREA allows with the frame and the plaque, centered
  function placePainting(slot, width, height) {
    var scale = Math.min((AREA.width - 2 * FRAME) / width, (AREA.height - 2 * FRAME - PLAQUE) / height);
    var w = Math.round(width * scale);
    var h = Math.round(height * scale);
    var left = Math.round((1920 - w) / 2);
    var top = Math.round((1080 - h - PLAQUE) / 2);
    slot.frame.style.left = left - FRAME + 'px';
    slot.frame.style.top = top - FRAME + 'px';
    slot.frame.style.width = w + 2 * FRAME + 'px';
    slot.frame.style.height = h + 2 * FRAME + 'px';
    slot.plaque.style.top = top + h + FRAME + 24 + 'px';
  }

  function artSlot(parent) {
    var slot = {node: element('art-slot', parent)};
    slot.frame = element('gilt-frame', slot.node);
    ['tl', 'tr', 'bl', 'br'].forEach(function (corner) {
      element('ornament ornament-' + corner, slot.frame);
    });
    element('ornament ornament-top', slot.frame);
    slot.canvas = element('painting', slot.frame);
    slot.plaque = element('plaque', slot.node);
    return slot;
  }

  function showPainting(index) {
    var works = window.BAROQUE || [];
    if (!works.length || current !== 'baroque') return;
    var work = works[index % works.length];
    var image = new Image();
    image.onload = function () {
      if (current !== 'baroque') return;
      // Two slots take turns, so the new painting fades in over the old one
      var slot = art.slots[art.slot];
      art.slot = 1 - art.slot;
      slot.canvas.style.backgroundImage = 'url("' + image.src + '")';
      slot.plaque.innerHTML = '';
      var title = document.createElement('div');
      title.className = 'plaque-title';
      title.textContent = work.title[window.LANGUAGE] || work.title.en;
      var by = document.createElement('div');
      by.className = 'plaque-artist';
      by.textContent = work.artist + ', ' + work.year;
      slot.plaque.appendChild(title);
      slot.plaque.appendChild(by);
      placePainting(slot, image.naturalWidth, image.naturalHeight);
      slot.node.className = 'art-slot shown';
      art.slots[art.slot].node.className = 'art-slot';
    };
    image.onerror = function () {
      art.timer = setTimeout(nextPainting, FAILED_RETRY_MS);
    };
    image.src = imageUrl(work.file);
  }

  function nextPainting() {
    clearTimeout(art.timer);
    var works = window.BAROQUE || [];
    art.index = (art.index + 1) % Math.max(works.length, 1);
    store(ART_INDEX_KEY, String(art.index));
    showPainting(art.index);
    art.timer = setTimeout(nextPainting, (config.artMinutes || 10) * 60 * 1000);
  }

  function startBaroque() {
    var gallery = element('gallery', layer);
    art.slots = [artSlot(gallery), artSlot(gallery)];
    art.slot = 0;
    art.index = parseInt(read(ART_INDEX_KEY), 10) || 0;
    showPainting(art.index);
    art.timer = setTimeout(nextPainting, (config.artMinutes || 10) * 60 * 1000);
  }

  // ---------- Fireplace ----------

  // From black through red, orange and yellow to white; the coolest colors are see-through, so the
  // firebox's darkness shows between the flames
  function firePalette() {
    var stops = [[0, 0, 0, 0], [8, 31, 7, 7], [16, 143, 39, 7], [24, 207, 111, 15], [30, 223, 159, 39],
      [34, 239, 207, 79], [36, 255, 255, 255]];
    var palette = [];
    for (var i = 0; i <= 36; i++) {
      var a = 0;
      while (stops[a + 1][0] < i) a++;
      var from = stops[a];
      var to = stops[a + 1];
      var k = (i - from[0]) / (to[0] - from[0]);
      var alpha = Math.min(1, i / 10);
      palette.push([
        Math.round(from[1] + (to[1] - from[1]) * k),
        Math.round(from[2] + (to[2] - from[2]) * k),
        Math.round(from[3] + (to[3] - from[3]) * k),
        Math.round(alpha * 255)
      ]);
    }
    return palette;
  }

  // The fuel line: hottest in the middle, under the logs, cold at the sides, flickering
  function fuel(x) {
    var fromCenter = Math.abs(x - FIRE_W / 2) / (FIRE_W / 2);
    if (fromCenter > 0.8) return 0;
    return Math.max(0, Math.round(36 - fromCenter * 14 - Math.random() * 8));
  }

  // Each cell takes the heat of the one below, cooler and blown a little sideways: flames about half the
  // canvas high
  function spreadFire() {
    var heat = fire.heat;
    for (var x = 0; x < FIRE_W; x++) {
      heat[(FIRE_H - 1) * FIRE_W + x] = fuel(x);
      for (var y = 1; y < FIRE_H; y++) {
        var from = y * FIRE_W + x;
        var value = heat[from];
        var drift = Math.floor(Math.random() * 3);
        var to = from - drift + 1;
        if (to - FIRE_W < 0) continue;
        heat[to - FIRE_W] = value === 0 ? 0 : Math.max(0, value - Math.floor(Math.random() * 2.2));
      }
    }
  }

  function drawFire() {
    var data = fire.image.data;
    var heat = fire.heat;
    for (var i = 0; i < heat.length; i++) {
      var color = fire.palette[heat[i]];
      var p = i * 4;
      data[p] = color[0];
      data[p + 1] = color[1];
      data[p + 2] = color[2];
      data[p + 3] = color[3];
    }
    fire.context.putImageData(fire.image, 0, 0);
    fire.glow.style.opacity = (0.7 + Math.random() * 0.3).toFixed(2);
  }

  function fireFrame() {
    if (current !== 'fireplace') return;
    if (!document.hidden && !document.webkitHidden) {
      spreadFire();
      drawFire();
    }
    fire.timer = setTimeout(fireFrame, FIRE_FRAME_MS);
  }

  function startFireplace() {
    var room = element('room', layer);
    fire.glow = element('room-glow', room);
    var place = element('fireplace', room);
    element('mantel', place);
    var box = element('firebox', place);
    fire.canvas = document.createElement('canvas');
    fire.canvas.className = 'fire';
    fire.canvas.width = FIRE_W;
    fire.canvas.height = FIRE_H;
    box.appendChild(fire.canvas);
    element('embers', box);
    ['log log-back', 'log log-left', 'log log-right'].forEach(function (name) {
      element(name, box);
    });
    element('hearth', place);

    fire.context = fire.canvas.getContext('2d');
    fire.image = fire.context.createImageData(FIRE_W, FIRE_H);
    fire.heat = new Uint8Array(FIRE_W * FIRE_H);
    fire.palette = firePalette();
    fireFrame();
  }

  // ---------- Switching ----------

  function stop() {
    clearTimeout(art.timer);
    clearTimeout(fire.timer);
    art.timer = fire.timer = null;
    layer.innerHTML = '';
  }

  function choose(id) {
    stop();
    current = id;
    layer.className = 'wallpaper wallpaper-' + id;
    if (id === 'baroque') startBaroque();
    else if (id === 'fireplace') startFireplace();
  }

  window.Wallpaper = {
    start: function (options) {
      config = options.config.wallpaper || {};
      layer = document.getElementById('wallpaper');
      var stored = read(STORAGE_KEY);
      var exists = window.Wallpaper.exists;
      choose(exists(stored) ? stored : exists(config.initial) ? config.initial : 'none');
    },

    // [{id, swatch, ink, swatchImage}] for the picker, named by i18n.js's wallpaper.<id>
    options: function () {
      return OPTIONS;
    },

    exists: function (id) {
      for (var i = 0; i < OPTIONS.length; i++) {
        if (OPTIONS[i].id === id) return true;
      }
      return false;
    },

    current: function () {
      return current;
    },

    active: function () {
      return current !== 'none';
    },

    pick: function (id) {
      store(STORAGE_KEY, id);
      choose(id);
    }
  };
})();
