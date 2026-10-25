// The screen's markup, put into the page by main.js. In JavaScript rather than index.html so that updates
// from GitHub (loader.js) can change it too.
window.LAYOUT =
  '<div id="root">' +
  '  <div class="decor"><div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div></div>' +
  '  <div id="wallpaper" class="wallpaper"></div>' +
  '  <header class="top">' +
  '    <div id="time" class="time"></div>' +
  '    <div id="date" class="date"></div>' +
  '  </header>' +
  '  <div class="header-actions">' +
  '    <div id="devmode" class="pill devmode">' +
  '      <span class="pill-icon">&lt;/&gt;</span>' +
  '      <span id="devmode-label">Dev</span>' +
  '    </div>' +
  '  </div>' +
  '  <div id="widgets" class="widgets"></div>' +
  '  <main class="content">' +
  '    <div class="section-title">' +
  '      <h1 id="heading"></h1>' +
  '      <span id="hint" class="hint"></span>' +
  '    </div>' +
  '    <div id="grid-wrap" class="grid-wrap">' +
  '      <div id="grid" class="grid"></div>' +
  '    </div>' +
  '  </main>' +
  '  <div id="toast" class="toast"></div>' +
  '</div>';
