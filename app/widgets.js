/*
 * The header's cards: the weather in the configured cities (Open-Meteo) and the top cryptocurrencies by
 * market cap (CoinGecko). Both are free and keyless. ES5 only: webOS 3 runs Chromium 38.
 */
(function () {
  'use strict';

  var WEATHER_EVERY_MS = 30 * 60 * 1000;
  var CRYPTO_EVERY_MS = 5 * 60 * 1000;
  var RETRY_MS = 60 * 1000; // after a failed load (CoinGecko limits bursts of requests)
  var CRYPTO_STORAGE_KEY = 'cryptoLast';
  var TIMEOUT_MS = 15000;

  // Stablecoins and wrapped or staked copies: their price says nothing new
  var NOT_SHOWN = ['usdt', 'usdc', 'usds', 'dai', 'usde', 'fdusd', 'tusd', 'pyusd', 'usd1', 'busd', 'usdd', 'figr_heloc',
    'wbtc', 'weth', 'steth', 'wsteth', 'weeth', 'wbeth', 'cbbtc', 'wbt'];

  var CURRENCY_SIGNS = {eur: '€', usd: '$', gbp: '£'};

  var t = window.t;

  // WMO weather codes, as Open-Meteo returns them. \uFE0E asks for the text (not emoji) form of the symbol.
  function describeWeather(code, isDay) {
    if (code === 0) return {icon: isDay ? '\u2600\uFE0E' : '\u263E\uFE0E', text: t('weather.clear')};
    if (code === 1 || code === 2) return {icon: isDay ? '\u26C5\uFE0E' : '\u263E\uFE0E', text: t('weather.partlyCloudy')};
    if (code === 3) return {icon: '\u2601\uFE0E', text: t('weather.cloudy')};
    if (code === 45 || code === 48) return {icon: '\u2248', text: t('weather.fog')};
    if (code >= 51 && code <= 57) return {icon: '\u2602\uFE0E', text: t('weather.drizzle')};
    if (code >= 61 && code <= 67) return {icon: '\u2602\uFE0E', text: t('weather.rain')};
    if (code >= 71 && code <= 77) return {icon: '\u2744\uFE0E', text: t('weather.snow')};
    if (code >= 80 && code <= 82) return {icon: '\u2602\uFE0E', text: t('weather.showers')};
    if (code === 85 || code === 86) return {icon: '\u2744\uFE0E', text: t('weather.snowShowers')};
    if (code >= 95) return {icon: '\u26A1\uFE0E', text: t('weather.storm')};
    return {icon: '\u2601\uFE0E', text: ''};
  }

  function getJSON(url, done) {
    var xhr = new XMLHttpRequest();
    var finished = false;
    function finish(data) {
      if (finished) return;
      finished = true;
      done(data);
    }
    xhr.open('GET', url, true);
    xhr.timeout = TIMEOUT_MS;
    xhr.onload = function () {
      if (xhr.status !== 200) return finish(null);
      try {
        finish(JSON.parse(xhr.responseText));
      } catch (e) {
        finish(null);
      }
    };
    xhr.onerror = xhr.ontimeout = function () { finish(null); };
    xhr.send();
  }

  // In the screen's language: 71.887 / 2.089,81 / 0,2937 in Spanish
  function formatNumber(n, decimals) {
    var parts = n.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, t('number.thousands'));
    return parts.join(t('number.decimal'));
  }

  function formatPrice(n, currency) {
    var sign = CURRENCY_SIGNS[currency] || currency.toUpperCase();
    var text = formatNumber(n, n >= 1000 ? 0 : n >= 1 ? 2 : 4);
    return currency === 'usd' ? sign + text : text + ' ' + sign;
  }

  function formatChange(n) {
    return (n >= 0 ? '+' : '\u2212') + formatNumber(Math.abs(n), 1) + '%';
  }

  function element(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // ---------- Weather ----------

  function weatherCard(city) {
    var card = element('div', 'card weather-card');
    card.appendChild(element('div', 'card-title', city.name));
    var body = element('div', 'card-body');
    body.appendChild(element('div', 'card-status', t('card.loading')));
    card.appendChild(body);
    return {city: city, card: card, body: body};
  }

  function showWeather(entry, data) {
    var body = entry.body;
    body.innerHTML = '';
    if (!data || !data.current || !data.daily) {
      body.appendChild(element('div', 'card-status', t('card.noData')));
      return;
    }
    var now = data.current;
    var look = describeWeather(now.weather_code, now.is_day === 1);
    var row = element('div', 'weather-now');
    row.appendChild(element('span', 'weather-icon', look.icon));
    row.appendChild(element('span', 'weather-temp', Math.round(now.temperature_2m) + '°'));
    body.appendChild(row);
    body.appendChild(element('div', 'weather-text', look.text));
    body.appendChild(element('div', 'weather-range',
      '↑ ' + Math.round(data.daily.temperature_2m_max[0]) + '°  ↓ ' +
      Math.round(data.daily.temperature_2m_min[0]) + '°'));
  }

  function loadWeather(entry) {
    var c = entry.city;
    getJSON('https://api.open-meteo.com/v1/forecast?latitude=' + c.latitude + '&longitude=' + c.longitude +
      '&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min' +
      '&timezone=auto&forecast_days=1', function (data) {
      // Keep the last good reading when a refresh fails
      if (data || !entry.loaded) showWeather(entry, data);
      if (data) entry.loaded = true;
    });
  }

  // ---------- Crypto ----------

  function cryptoCard(settings) {
    var card = element('div', 'card crypto-card');
    card.appendChild(element('div', 'card-title', t('card.crypto')));
    var body = element('div', 'card-body');
    body.appendChild(element('div', 'card-status', t('card.loading')));
    card.appendChild(body);
    return {settings: settings, card: card, body: body};
  }

  function showCrypto(entry, coins) {
    var body = entry.body;
    body.innerHTML = '';
    if (!coins) {
      body.appendChild(element('div', 'card-status', t('card.noData')));
      return;
    }
    var currency = entry.settings.currency;
    coins.forEach(function (coin) {
      var change = coin.price_change_percentage_24h || 0;
      var row = element('div', 'crypto-row');
      row.appendChild(element('span', 'crypto-symbol', coin.symbol.toUpperCase()));
      row.appendChild(element('span', 'crypto-price', formatPrice(coin.current_price, currency)));
      row.appendChild(element('span', 'crypto-change ' + (change >= 0 ? 'up' : 'down'), formatChange(change)));
      body.appendChild(row);
    });
  }

  function readStoredCoins() {
    try {
      return JSON.parse(window.localStorage.getItem(CRYPTO_STORAGE_KEY));
    } catch (e) {
      return null;
    }
  }

  function storeCoins(coins) {
    try {
      window.localStorage.setItem(CRYPTO_STORAGE_KEY, JSON.stringify(coins));
    } catch (e) {}
  }

  function loadCrypto(entry) {
    var s = entry.settings;
    getJSON('https://api.coingecko.com/api/v3/coins/markets?vs_currency=' + s.currency +
      '&order=market_cap_desc&per_page=25&page=1', function (list) {
      var coins = null;
      if (list && list.length) {
        coins = list.filter(function (coin) {
          return NOT_SHOWN.indexOf(coin.symbol.toLowerCase()) === -1;
        }).slice(0, s.count);
      }
      if (coins) {
        entry.loaded = true;
        storeCoins(coins);
        showCrypto(entry, coins);
        return;
      }
      if (!entry.loaded) showCrypto(entry, null);
      setTimeout(function () { loadCrypto(entry); }, RETRY_MS);
    });
  }

  window.Widgets = {
    // Builds the cards into container and keeps them up to date
    start: function (container, config) {
      var cities = config.weather || [];
      var crypto = config.crypto;

      cities.forEach(function (city) {
        var entry = weatherCard(city);
        container.appendChild(entry.card);
        loadWeather(entry);
        setInterval(function () { loadWeather(entry); }, WEATHER_EVERY_MS);
      });

      if (crypto && crypto.count > 0) {
        var cryptoEntry = cryptoCard({currency: (crypto.currency || 'eur').toLowerCase(), count: crypto.count});
        container.appendChild(cryptoEntry.card);
        // The last prices, until fresh ones arrive
        var stored = readStoredCoins();
        if (stored && stored.length) {
          cryptoEntry.loaded = true;
          showCrypto(cryptoEntry, stored);
        }
        loadCrypto(cryptoEntry);
        setInterval(function () { loadCrypto(cryptoEntry); }, CRYPTO_EVERY_MS);
      }
    }
  };
})();
