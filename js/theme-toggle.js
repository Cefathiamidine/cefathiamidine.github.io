(function () {
  'use strict';

  var STORAGE_KEY = 'theme-mode';
  var MODES = ['light', 'dark', 'system'];
  var LABELS = { light: '日间', dark: '夜间', system: '跟随系统' };
  var ICONS = {
    light: 'fa-solid fa-sun',
    dark: 'fa-solid fa-moon',
    system: 'fa-solid fa-circle-half-stroke'
  };
  var media = window.matchMedia('(prefers-color-scheme: dark)');

  function getMode() {
    try {
      var mode = localStorage.getItem(STORAGE_KEY);
      return MODES.indexOf(mode) > -1 ? mode : 'system';
    } catch (e) {
      return 'system';
    }
  }

  function effectiveMode(mode) {
    if (mode === 'system') return media.matches ? 'dark' : 'light';
    return mode;
  }

  function refreshButton() {
    var mode = getMode();
    var buttons = document.querySelectorAll('.toggle-mode-btn');
    Array.prototype.forEach.call(buttons, function (btn) {
      var icon = btn.querySelector('i');
      if (icon) icon.className = ICONS[mode] + ' fa-fw';

      // 只保留图标，重建文字，避免反复追加
      Array.prototype.slice.call(btn.childNodes).forEach(function (node) {
        if (node.nodeType === 3) btn.removeChild(node);
      });
      btn.appendChild(document.createTextNode(LABELS[mode]));
      btn.setAttribute('title', '当前：' + LABELS[mode] + '，点击切换');
      btn.setAttribute('aria-label', '切换主题，当前为' + LABELS[mode]);
    });
  }

  // 主题自带的逻辑在“强制模式与系统一致”时会移除属性，
  // 这里把它补回来，保证用户选择的日间/夜间不会被系统设置覆盖。
  function enforceMode() {
    var mode = getMode();
    if (mode === 'system') return;
    var root = document.documentElement;
    if (root.getAttribute('color-scheme') !== mode) {
      root.setAttribute('color-scheme', mode);
    }
    try {
      if (localStorage.getItem('color-scheme') !== mode) {
        localStorage.setItem('color-scheme', mode);
      }
    } catch (e) {}
  }

  function notifyVolantis(mode) {
    if (!window.volantis || !volantis.dark) return;
    volantis.dark.mode = effectiveMode(mode);
    if (volantis.dark.method && volantis.dark.method.toggle) {
      volantis.dark.method.toggle.start();
    }
  }

  function applyMode(mode) {
    var root = document.documentElement;
    try {
      localStorage.setItem(STORAGE_KEY, mode);
      if (mode === 'system') {
        localStorage.removeItem('color-scheme');
        root.removeAttribute('color-scheme');
      } else {
        localStorage.setItem('color-scheme', mode);
        root.setAttribute('color-scheme', mode);
      }
    } catch (e) {
      // localStorage 不可用时仍然切换当前页面
      if (mode === 'system') root.removeAttribute('color-scheme');
      else root.setAttribute('color-scheme', mode);
    }
    notifyVolantis(mode);
    refreshButton();
  }

  function cycle() {
    var index = MODES.indexOf(getMode());
    applyMode(MODES[(index + 1) % MODES.length]);
  }

  // 捕获阶段拦截，避免主题自带的二态切换再执行一次
  document.addEventListener('click', function (event) {
    var btn = event.target.closest && event.target.closest('.toggle-mode-btn');
    if (!btn) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cycle();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      enforceMode();
      refreshButton();
    });
  } else {
    enforceMode();
    refreshButton();
  }

  document.addEventListener('pjax:complete', refreshButton);

  // 跟随系统时，系统主题变化要实时同步
  var onSystemChange = function () {
    if (getMode() === 'system') {
      notifyVolantis('system');
    } else {
      enforceMode();
      notifyVolantis(getMode());
    }
  };
  if (media.addEventListener) media.addEventListener('change', onSystemChange);
  else if (media.addListener) media.addListener(onSystemChange);
})();
