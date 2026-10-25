// Home screen settings. Edit, then refresh the preview or reinstall on the TV.
window.HOME_CONFIG = {
  // Screen language: es, en, or auto (the TV's)
  language: 'es',

  // Apps on the home screen, in this order: an app id or part of its name (any case).
  // Empty list = every app on the TV.
  favorites: ['netflix', 'youtube', 'prime', 'disney', 'spotify', 'hdmi 1'],

  // Look: auto, dark, swiss, brutal, glass, pastel, immersive, skeuo, metro, neumorph, clay, material,
  // editorial, eink, synthwave, cyberpunk, teletext, terminal, pixel, artdeco, bento or carousel.
  // Pick one on the TV from the "Tema" tile, or cycle with the remote's blue button (T in a browser);
  // the TV remembers it, and this is only the first one.
  theme: 'dark',

  // The 'auto' theme: day from dayStarts to nightStarts (hours, 0-23), night the rest
  autoTheme: {day: 'swiss', night: 'dark', dayStarts: 7, nightStarts: 20},

  // The open-an-app transition (the tile grows until it fills the screen)
  launchAnimation: true,

  // Tiles per row
  columns: 6,

  // Weather cards, one per city (Open-Meteo, no key needed)
  weather: [
    {name: 'Madrid', latitude: 40.4168, longitude: -3.7038},
    {name: 'Palma', latitude: 39.5696, longitude: 2.6502}
  ],

  // The top cryptocurrencies by market cap, stablecoins left out (CoinGecko, no key needed). count: 0 hides it.
  crypto: {count: 5, currency: 'eur'},

  // The Developer Mode countdown at the top right (on the TV). autoRenewDays: renew on its own when fewer
  // days than this are left, as the app starts (0 = never).
  devMode: {show: true, autoRenewDays: 7},

  // The wallpaper: none, baroque (100 Baroque paintings in a gilt frame) or fireplace. Pick one on the TV from
  // the "Fondo" tile; this is only the first one. artMinutes: time per painting. idleMinutes: show the
  // wallpaper alone after this long without a key (0 = never); the yellow button (A in a browser) does it now.
  wallpaper: {initial: 'none', artMinutes: 10, idleMinutes: 5},

  // Updates: the TV checks this every few hours and switches to a newer version on its own. The repo's
  // GitHub workflow publishes it on every push that changes app/.
  update: {url: 'https://daniel-muflas.github.io/theme_tv/bundle.json', everyHours: 6},

  // Shows a last tile that opens every app on the TV
  showAllAppsTile: true,

  clock24h: true
};
