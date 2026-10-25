/*
 * The screen's text, by language. config.js picks one with `language` ('es', 'en', or 'auto' for the
 * TV's). The code asks for text with t(key, {placeholder: value}). ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var STRINGS = {
    es: {
      'home.heading': 'Tus apps',
      'all.heading': 'Todas las apps',
      'themes.heading': 'Tema',
      'hint.back': 'Atrás para volver',
      'hint.themes': 'OK para aplicar · Atrás para volver',
      'grid.empty': 'No hay apps que mostrar. Revisa la lista de favoritas en config.js.',

      'toast.theme': 'Tema: {name}',
      'toast.openFailed': 'No se pudo abrir {name}',
      'toast.openingSimulated': 'Abriendo {name} (simulado)',
      'toast.appsFailed': 'No se pudo leer la lista de apps',

      'date.days': ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
      'date.months': ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre',
        'octubre', 'noviembre', 'diciembre'],
      'date.format': '{day}, {date} de {month}',
      'time.am': ' a. m.',
      'time.pm': ' p. m.',
      'number.thousands': '.',
      'number.decimal': ',',

      'weather.clear': 'Despejado',
      'weather.partlyCloudy': 'Poco nuboso',
      'weather.cloudy': 'Nublado',
      'weather.fog': 'Niebla',
      'weather.drizzle': 'Llovizna',
      'weather.rain': 'Lluvia',
      'weather.snow': 'Nieve',
      'weather.showers': 'Chubascos',
      'weather.snowShowers': 'Chubascos de nieve',
      'weather.storm': 'Tormenta',
      'card.loading': 'Cargando…',
      'card.noData': 'Sin datos',
      'card.crypto': 'Cripto · 24 h',

      'dev.unknown': 'Modo dev.',
      'dev.expired': 'Dev · caducado',
      'dev.hours': 'Dev · {n} h',
      'dev.day': 'Dev · {n} día',
      'dev.days': 'Dev · {n} días',
      'dev.renewing': 'Renovando el modo desarrollador…',
      'dev.renewed': 'Modo desarrollador renovado: quedan {n} días',
      'dev.autoRenewed': 'Modo desarrollador renovado automáticamente',
      'dev.pressExtend': 'Pulsa EXTEND en Developer Mode para renovar',
      'dev.openFailed': 'No se pudo abrir Developer Mode',

      'theme.auto': 'Automático día/noche',
      'theme.dark': 'Oscuro moderno',
      'theme.swiss': 'Minimalismo suizo',
      'theme.brutal': 'Neobrutalismo',
      'theme.glass': 'Glassmorfismo',
      'theme.pastel': 'Pastel alegre',
      'theme.immersive': 'Inmersivo 3D',
      'theme.skeuo': 'Esqueuomorfismo',
      'theme.metro': 'Metro',
      'theme.neumorph': 'Neumorfismo',
      'theme.clay': 'Claymorfismo',
      'theme.material': 'Material You',
      'theme.editorial': 'Editorial',
      'theme.eink': 'Tinta electrónica',
      'theme.synthwave': 'Synthwave',
      'theme.cyberpunk': 'Cyberpunk',
      'theme.teletext': 'Teletexto',
      'theme.terminal': 'Terminal',
      'theme.pixel': 'Pixel art',
      'theme.artdeco': 'Art déco',
      'theme.bento': 'Bento',
      'theme.carousel': 'Carrusel cine',

      'sample.liveTv': 'TV en directo',
      'sample.browser': 'Navegador web',
      'sample.photos': 'Fotos y vídeos',
      'sample.music': 'Música',
      'sample.settings': 'Ajustes'
    },

    en: {
      'home.heading': 'Your apps',
      'all.heading': 'All apps',
      'themes.heading': 'Theme',
      'hint.back': 'Back to return',
      'hint.themes': 'OK to apply · Back to return',
      'grid.empty': 'No apps to show. Check the favorites list in config.js.',

      'toast.theme': 'Theme: {name}',
      'toast.openFailed': 'Couldn\'t open {name}',
      'toast.openingSimulated': 'Opening {name} (simulated)',
      'toast.appsFailed': 'Couldn\'t read the app list',

      'date.days': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      'date.months': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September',
        'October', 'November', 'December'],
      'date.format': '{day}, {month} {date}',
      'time.am': ' AM',
      'time.pm': ' PM',
      'number.thousands': ',',
      'number.decimal': '.',

      'weather.clear': 'Clear',
      'weather.partlyCloudy': 'Partly cloudy',
      'weather.cloudy': 'Cloudy',
      'weather.fog': 'Fog',
      'weather.drizzle': 'Drizzle',
      'weather.rain': 'Rain',
      'weather.snow': 'Snow',
      'weather.showers': 'Showers',
      'weather.snowShowers': 'Snow showers',
      'weather.storm': 'Thunderstorm',
      'card.loading': 'Loading…',
      'card.noData': 'No data',
      'card.crypto': 'Crypto · 24 h',

      'dev.unknown': 'Dev mode',
      'dev.expired': 'Dev · expired',
      'dev.hours': 'Dev · {n} h',
      'dev.day': 'Dev · {n} day',
      'dev.days': 'Dev · {n} days',
      'dev.renewing': 'Renewing Developer Mode…',
      'dev.renewed': 'Developer Mode renewed: {n} days left',
      'dev.autoRenewed': 'Developer Mode renewed automatically',
      'dev.pressExtend': 'Press EXTEND in Developer Mode to renew',
      'dev.openFailed': 'Couldn\'t open Developer Mode',

      'theme.auto': 'Automatic day/night',
      'theme.dark': 'Modern dark',
      'theme.swiss': 'Swiss minimalist',
      'theme.brutal': 'Neo-brutalist',
      'theme.glass': 'Glassmorphism',
      'theme.pastel': 'Playful pastel',
      'theme.immersive': 'Immersive 3D',
      'theme.skeuo': 'Skeuomorphic',
      'theme.metro': 'Metro',
      'theme.neumorph': 'Neumorphism',
      'theme.clay': 'Claymorphism',
      'theme.material': 'Material You',
      'theme.editorial': 'Editorial',
      'theme.eink': 'E-ink',
      'theme.synthwave': 'Synthwave',
      'theme.cyberpunk': 'Cyberpunk',
      'theme.teletext': 'Teletext',
      'theme.terminal': 'Terminal',
      'theme.pixel': 'Pixel art',
      'theme.artdeco': 'Art deco',
      'theme.bento': 'Bento',
      'theme.carousel': 'Cinema carousel',

      'sample.liveTv': 'Live TV',
      'sample.browser': 'Web browser',
      'sample.photos': 'Photos & videos',
      'sample.music': 'Music',
      'sample.settings': 'Settings'
    }
  };

  function pickLanguage(wanted) {
    if (STRINGS[wanted]) return wanted;
    var tv = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return STRINGS[tv] ? tv : 'en';
  }

  // ?lang=<code> in the address wins, for previews
  var forced = /[?&]lang=([a-z]+)/.exec(window.location.search);
  var language = pickLanguage(forced ? forced[1] : (window.HOME_CONFIG || {}).language);
  document.documentElement.lang = language;

  window.LANGUAGE = language;

  // The text for key in the screen's language (English when missing there), with {name} placeholders filled
  window.t = function (key, values) {
    var text = STRINGS[language][key];
    if (text === undefined) text = STRINGS.en[key];
    if (text === undefined) return key;
    if (typeof text !== 'string' || !values) return text;
    return text.replace(/\{(\w+)\}/g, function (all, name) {
      return values[name] !== undefined ? values[name] : all;
    });
  };
})();
