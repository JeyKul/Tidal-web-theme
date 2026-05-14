// ==UserScript==
// @name           Tidal Polish
// @namespace      https://openuserjs.org/users/JeyKul
// @version        2.0.0
// @description    Lyrics polish, smooth scroll, max-res draggable images & looping videos, remove overlays, album hover + border-radius tweak + 3D look-at-cursor album cover + vibrant radial background, toggle
// @author         JeyKul
// @copyright      2026, JeyKul
// @license        CC
// @match          *://*.tidal.com/*
// @updateURL      https://openuserjs.org/meta/JeyKul/TidalPolish.user.js
// @contributionURL https://github.com/JeyKul/Tidal-web-theme
// ==/UserScript==

// WARNING: LICENSE GOT CHANGED

(function () {
  'use strict';

  const settings = {
    blobs: true,
    floatingArt: true,
    fullscreenMeta: true,
    lyricFocus: true
  };

  const state = {
    currentColors: [[82, 26, 34], [24, 58, 62], [74, 34, 78], [30, 24, 28]],
    lastArtworkSrc: '',
    lastRenderedGradient: '',
    lastGradientBucket: -1,
    artFloatHost: null,
    metaEl: null,
    panelEl: null,
    toggleBtnEl: null,
    observer: null,
    paletteTimer: null,
    metaTimer: null,
    mediaTimer: null,
    lyricsTimer: null,
    gradientTimer: null,
    currentAnimation: null,
    lyricObserverAttached: false
  };

  const css = `
    span[data-test="lyrics-line"] {
      transition: filter 180ms ease, opacity 140ms ease, text-shadow 140ms ease;
      cursor: default;
    }

    html.tp-lyrics-off span[data-test="lyrics-line"] {
      filter: none !important;
      opacity: 1 !important;
      text-shadow: none !important;
    }

    span[data-test="lyrics-line"][data-current="true"] {
      text-shadow: rgba(255,255,255,0.44) 0 0 8px;
      opacity: 1;
      filter: none;
    }

    span[data-test="lyrics-line"]:not([data-current="true"]) {
      filter: blur(2px);
      opacity: 0.52;
    }

    img[data-test="now-playing-artwork"],
    ._tilt_8fda471._artworkTilt_1c6d5cc {
      border-radius: 28px !important;
    }

    ._tilt_8fda471._artworkTilt_1c6d5cc {
      overflow: hidden !important;
      position: relative !important;
    }

    img[data-test="now-playing-artwork"] {
      display: block;
      overflow: hidden !important;
      box-shadow: 0 10px 30px rgba(0,0,0,0.22);
      clip-path: inset(0 round 28px);
      filter: none !important;
      opacity: 1 !important;
    }

    .tp-art-float-wrap {
      display: block !important;
      will-change: transform;
    }

    ._artworkWrapper_bca4689._artworkWrapperHidden_7e72bc4
     > ._artworkContainer_a3f2f92._artworkShifted_92ad2d0 {
     animation: tpArtworkFloat 6s ease-in-out infinite !important;
     will-change: transform;
    }

    @keyframes tpArtworkFloat {
   0% {
		transform: translatey(0px);
	}
	50% {
		transform: translatey(-20px);
	}
	100% {
		transform: translatey(0px);
    }

    .tp-meta {
      position: fixed;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      width: min(76vw, 680px);
      text-align: center;
      z-index: 9998;
      pointer-events: none;
      opacity: 0;
      transition: opacity 180ms ease;
    }

    html.tp-fullscreen-meta-on .tp-meta.tp-visible {
      opacity: 1;
    }

    .tp-meta-inner {
      padding: 13px 18px;
      border-radius: 18px;
      background: linear-gradient(180deg, rgba(0,0,0,0.34), rgba(0,0,0,0.16));
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 10px 30px rgba(0,0,0,0.22);
    }

    .tp-meta-title {
      color: rgba(255,255,255,0.98);
      font-size: clamp(20px, 2.3vw, 32px);
      font-weight: 700;
      line-height: 1.1;
      letter-spacing: -0.02em;
    }

    .tp-meta-artist {
      margin-top: 7px;
      color: rgba(255,255,255,0.72);
      font-size: clamp(13px, 1.2vw, 17px);
      font-weight: 500;
      line-height: 1.24;
    }

    .tp-toggle-btn {
      position: fixed;
      right: 18px;
      bottom: 94px;
      width: 42px;
      height: 42px;
      border: 0;
      border-radius: 999px;
      z-index: 9999;
      background: rgba(15,15,17,0.68);
      color: rgba(255,255,255,0.94);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.22);
      cursor: pointer;
    }

    .tp-panel {
      position: fixed;
      right: 18px;
      bottom: 144px;
      width: min(280px, calc(100vw - 28px));
      padding: 12px;
      border-radius: 18px;
      z-index: 9999;
      background: rgba(12,12,14,0.76);
      color: rgba(255,255,255,0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 18px 44px rgba(0,0,0,0.28);
      opacity: 0;
      pointer-events: none;
      transform: translateY(8px);
      transition: opacity 160ms ease, transform 160ms ease;
    }

    .tp-panel.tp-open {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0);
    }

    .tp-panel-title {
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: rgba(255,255,255,0.58);
      margin-bottom: 8px;
    }

    .tp-setting {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding: 10px 8px;
      border-radius: 12px;
    }

    .tp-setting-name {
      font-size: 14px;
      font-weight: 600;
      color: rgba(255,255,255,0.95);
    }

    .tp-setting-desc {
      font-size: 12px;
      color: rgba(255,255,255,0.56);
      margin-top: 2px;
    }

    .tp-switch {
      position: relative;
      width: 42px;
      height: 24px;
      border-radius: 999px;
      border: 0;
      background: rgba(255,255,255,0.14);
      cursor: pointer;
      flex: 0 0 auto;
    }

    .tp-switch::after {
      content: '';
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: rgba(255,255,255,0.96);
      transition: transform 160ms ease;
    }

    .tp-switch[aria-checked="true"] {
      background: rgba(94, 176, 146, 0.86);
    }

    .tp-switch[aria-checked="true"]::after {
      transform: translateX(18px);
    }

    @media (prefers-reduced-motion: reduce) {
      html.tp-floating-art-on ._player_8c80ae6.nowPlayingVisible .tp-art-float-wrap.tp-art-floating {
        animation: none !important;
      }
    }
  `;

  function injectCSS() {
    if (document.getElementById('tidal-polish-lite-fixed-css')) return;
    const style = document.createElement('style');
    style.id = 'tidal-polish-lite-fixed-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  function applySettingClasses() {
    const root = document.documentElement;
    root.classList.toggle('tp-floating-art-on', settings.floatingArt);
    root.classList.toggle('tp-fullscreen-meta-on', settings.fullscreenMeta);
    root.classList.toggle('tp-lyrics-off', !settings.lyricFocus);
  }

  function findScrollContainer() {
    return document.querySelector('div[class*="smoothScroll"]');
  }

  function animateScroll(container, targetScrollTop) {
    if (state.currentAnimation) cancelAnimationFrame(state.currentAnimation.frame);
    const start = container.scrollTop;
    const distance = targetScrollTop - start;
    const startTime = performance.now();
    const duration = 320;

    function step(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      container.scrollTop = start + distance * eased;
      if (progress < 1) state.currentAnimation.frame = requestAnimationFrame(step);
      else state.currentAnimation = null;
    }

    state.currentAnimation = { frame: requestAnimationFrame(step) };
  }

  function attachLyricObserver() {
    document.querySelectorAll('span[data-test="lyrics-line"]').forEach(el => {
      if (el.dataset.lyricObserved === '1') return;
      el.dataset.lyricObserved = '1';
      const lyricObserver = new MutationObserver(mutations => {
        for (const mutation of mutations) {
          if (mutation.type === 'attributes' && mutation.attributeName === 'data-current' && mutation.target.getAttribute('data-current') === 'true') {
            centerLyric(mutation.target);
            break;
          }
        }
      });
      lyricObserver.observe(el, { attributes: true, attributeFilter: ['data-current'] });
    });
  }

  function getFooterAlbumImage() {
    return document.querySelector('button[data-test="player-details-toggle-now-playing"] img._cellImage_0ef8dd3, button[data-test="player-details-toggle-now-playing"] img');
  }

  function pickBestArtworkSource() {
    const candidates = [
      document.querySelector('#nowPlaying img[data-test="now-playing-artwork"]'),
      document.querySelector('img[data-test="now-playing-artwork"]'),
      getFooterAlbumImage()
    ].filter(Boolean);

    for (const img of candidates) {
      const src = img.currentSrc || img.src || '';
      if (src && !src.startsWith('data:')) return { img, src };
    }

    return { img: null, src: '' };
  }

  function getBlobTargets() {
    const targets = [];
    const section = document.querySelector('section[data-test="now-playing"], #nowPlaying');
    if (section) targets.push(section);
    document.querySelectorAll('._background_42cea4e').forEach(el => targets.push(el));
    return targets;
  }

  function getTrackInfo() {
    const titleEl = document.querySelector('._trackContent_7b758a9 ._marketText_1lyag_1._semibold20_1lyag_246');
    const artistEl = document.querySelector('._trackContent_7b758a9 ._item_39605ae._link_6a45a19');
    return {
      title: titleEl?.textContent?.trim() || pickBestArtworkSource().img?.getAttribute('alt') || '',
      artist: artistEl?.getAttribute('aria-label')?.trim() || artistEl?.textContent?.trim() || ''
    };
  }

  function isFullscreenForMeta() {
    return !!document.querySelector('._player_8c80ae6.nowPlayingVisible._controlsHidden_ec77acd[aria-hidden="true"]');
  }

  function ensureMetaOverlay() {
    if (state.metaEl && document.body.contains(state.metaEl)) return state.metaEl;
    const el = document.createElement('div');
    el.className = 'tp-meta';
    el.innerHTML = '<div class="tp-meta-inner"><div class="tp-meta-title"></div><div class="tp-meta-artist"></div></div>';
    document.body.appendChild(el);
    state.metaEl = el;
    return el;
  }

  function updateMetaOverlay() {
    const el = ensureMetaOverlay();
    const { title, artist } = getTrackInfo();
    el.querySelector('.tp-meta-title').textContent = title || '';
    el.querySelector('.tp-meta-artist').textContent = artist || '';
    el.classList.toggle('tp-visible', settings.fullscreenMeta && isFullscreenForMeta() && !!title);
  }

  function ensureFloatingArtworkWrapper() {
    const container = document.querySelector('._player_8c80ae6.nowPlayingVisible ._artworkContainer_a3f2f92');
    if (!container) return;

    if (container.parentElement && container.parentElement.classList.contains('tp-art-float-wrap')) {
      state.artFloatHost = container.parentElement;
      state.artFloatHost.classList.toggle('tp-art-floating', settings.floatingArt);
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'tp-art-float-wrap';
    container.parentNode.insertBefore(wrapper, container);
    wrapper.appendChild(container);
    state.artFloatHost = wrapper;
    state.artFloatHost.classList.toggle('tp-art-floating', settings.floatingArt);
  }

  function updateFloatingArtworkState() {
    ensureFloatingArtworkWrapper();
    if (!state.artFloatHost) return;
    state.artFloatHost.classList.toggle('tp-art-floating', settings.floatingArt);
  }

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function rgba(r, g, b, a = 1) {
    return `rgba(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(clamp(b, 0, 255))}, ${a})`;
  }

  function darken(rgb, factor) {
    return [
      Math.round(clamp(rgb[0] * factor, 0, 255)),
      Math.round(clamp(rgb[1] * factor, 0, 255)),
      Math.round(clamp(rgb[2] * factor, 0, 255))
    ];
  }

  function saturate(rgb, factor = 1.08) {
    const [r, g, b] = rgb;
    const avg = (r + g + b) / 3;
    return [
      Math.round(clamp(avg + (r - avg) * factor, 0, 255)),
      Math.round(clamp(avg + (g - avg) * factor, 0, 255)),
      Math.round(clamp(avg + (b - avg) * factor, 0, 255))
    ];
  }

  function distance(a, b) {
    return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
  }

  function uniqueColors(colors, threshold = 26) {
    const out = [];
    for (const c of colors) {
      if (!out.some(existing => distance(existing, c) < threshold)) out.push(c);
    }
    return out;
  }

  function swatchToRgb(swatch) {
    return swatch && typeof swatch.getRgb === 'function' ? swatch.getRgb() : null;
  }

  function tonePalette(colors) {
    const toned = uniqueColors(colors).slice(0, 4).map((c, i) => {
      if (i === 0) return darken(saturate(c, 1.10), 0.58);
      if (i === 1) return darken(saturate(c, 1.08), 0.54);
      if (i === 2) return darken(saturate(c, 1.06), 0.50);
      return darken(saturate(c, 1.04), 0.46);
    });

    if (toned.length >= 4) return toned;
    if (toned.length === 3) return [toned[0], toned[1], toned[2], darken(toned[1], 0.75)];
    if (toned.length === 2) return [toned[0], toned[1], darken(toned[0], 0.78), darken(toned[1], 0.74)];
    if (toned.length === 1) return [toned[0], darken(toned[0], 0.84), darken(toned[0], 0.72), darken(toned[0], 0.60)];
    return [[82, 26, 34], [24, 58, 62], [74, 34, 78], [30, 24, 28]];
  }

  async function extractColorsFromArtwork() {
    const picked = pickBestArtworkSource();
    if (!picked.img || !picked.src || typeof Vibrant === 'undefined') return null;

    try {
      const vibrant = new Vibrant(picked.img, 96, 1);
      const swatches = vibrant.swatches();
      const extracted = [
        swatchToRgb(swatches.DarkVibrant),
        swatchToRgb(swatches.Vibrant),
        swatchToRgb(swatches.DarkMuted),
        swatchToRgb(swatches.Muted),
        swatchToRgb(swatches.LightVibrant)
      ].filter(Boolean);

      if (!extracted.length) return null;
      return tonePalette(extracted);
    } catch {
      return null;
    }
  }

  function buildAnimatedGradient(colors, phase) {
    const c1 = colors[0] || [82, 26, 34];
    const c2 = colors[1] || [24, 58, 62];
    const c3 = colors[2] || [74, 34, 78];
    const c4 = colors[3] || [30, 24, 28];

    const p1x = 16 + Math.sin(phase * 0.9) * 6;
    const p1y = 18 + Math.cos(phase * 0.8) * 5;
    const p2x = 82 + Math.sin(phase * 0.7 + 1.3) * 6;
    const p2y = 16 + Math.cos(phase * 0.9 + 0.8) * 6;
    const p3x = 56 + Math.sin(phase * 0.65 + 2.2) * 7;
    const p3y = 80 + Math.cos(phase * 0.8 + 1.7) * 6;
    const p4x = 20 + Math.sin(phase * 0.75 + 2.8) * 6;
    const p4y = 76 + Math.cos(phase * 0.7 + 0.4) * 7;

    return [
      `radial-gradient(circle at ${p1x}% ${p1y}%, ${rgba(c1[0], c1[1], c1[2], 0.76)} 0%, ${rgba(c1[0], c1[1], c1[2], 0.42)} 18%, ${rgba(c1[0], c1[1], c1[2], 0.12)} 38%, ${rgba(c1[0], c1[1], c1[2], 0)} 62%)`,
      `radial-gradient(circle at ${p2x}% ${p2y}%, ${rgba(c2[0], c2[1], c2[2], 0.70)} 0%, ${rgba(c2[0], c2[1], c2[2], 0.36)} 18%, ${rgba(c2[0], c2[1], c2[2], 0.10)} 38%, ${rgba(c2[0], c2[1], c2[2], 0)} 62%)`,
      `radial-gradient(circle at ${p3x}% ${p3y}%, ${rgba(c3[0], c3[1], c3[2], 0.64)} 0%, ${rgba(c3[0], c3[1], c3[2], 0.32)} 18%, ${rgba(c3[0], c3[1], c3[2], 0.09)} 38%, ${rgba(c3[0], c3[1], c3[2], 0)} 62%)`,
      `radial-gradient(circle at ${p4x}% ${p4y}%, ${rgba(c4[0], c4[1], c4[2], 0.46)} 0%, ${rgba(c4[0], c4[1], c4[2], 0.22)} 16%, ${rgba(c4[0], c4[1], c4[2], 0.06)} 34%, ${rgba(c4[0], c4[1], c4[2], 0)} 58%)`,
      `linear-gradient(145deg, rgba(0,0,0,0.42), rgba(0,0,0,0.20) 42%, rgba(0,0,0,0.34))`,
      `radial-gradient(circle at 14% 84%, rgba(0,0,0,0.34) 0%, rgba(0,0,0,0.16) 24%, rgba(0,0,0,0) 54%)`
    ].join(', ');
  }

  function renderGradientFrame() {
    if (!settings.blobs) return;
    const now = performance.now();
    const bucket = Math.floor(now / 140);
    if (bucket === state.lastGradientBucket) return;
    state.lastGradientBucket = bucket;

    const gradient = buildAnimatedGradient(state.currentColors, now / 2600);
    if (gradient === state.lastRenderedGradient) return;
    state.lastRenderedGradient = gradient;

    getBlobTargets().forEach(el => {
      el.style.setProperty('background-image', gradient, 'important');
      el.style.setProperty('background-repeat', 'no-repeat, no-repeat, no-repeat, no-repeat, no-repeat, no-repeat', 'important');
    });
  }

  function clearBlobs() {
    getBlobTargets().forEach(el => el.style.removeProperty('background-image'));
  }

  function schedulePaletteUpdate(delay = 120) {
    if (state.paletteTimer) clearTimeout(state.paletteTimer);
    state.paletteTimer = setTimeout(async () => {
      if (!settings.blobs) return;
      const picked = pickBestArtworkSource();
      if (!picked.src || picked.src === state.lastArtworkSrc) return;
      const colors = await extractColorsFromArtwork();
      if (colors && colors.length) {
        state.currentColors = colors;
        state.lastArtworkSrc = picked.src;
        state.lastGradientBucket = -1;
        state.lastRenderedGradient = '';
      }
    }, delay);
  }

  function renderSettingsPanel() {
    if (!state.panelEl) return;
    state.panelEl.innerHTML = `
      <div class="tp-panel-title">Tidal Polish</div>
      ${[
        ['blobs', 'Animated blobs', 'Dark, lighter-cost background'],
        ['floatingArt', 'Floating artwork', 'Subtle artwork container hover'],
        ['fullscreenMeta', 'Fullscreen metadata', 'Uses aria-hidden="true" state'],
        ['lyricFocus', 'Lyrics focus', 'Blur inactive lines']
      ].map(([key, name, desc]) => `
        <div class="tp-setting">
          <div>
            <div class="tp-setting-name">${name}</div>
            <div class="tp-setting-desc">${desc}</div>
          </div>
          <button class="tp-switch" type="button" role="switch" aria-checked="${settings[key] ? 'true' : 'false'}" data-key="${key}"></button>
        </div>
      `).join('')}
    `;
  }

  function ensureControls() {
    if (!state.toggleBtnEl || !document.body.contains(state.toggleBtnEl)) {
      const btn = document.createElement('button');
      btn.className = 'tp-toggle-btn';
      btn.type = 'button';
      btn.textContent = '✦';
      btn.setAttribute('aria-label', 'Toggle Tidal Polish settings');
      btn.addEventListener('click', () => state.panelEl?.classList.toggle('tp-open'));
      document.body.appendChild(btn);
      state.toggleBtnEl = btn;
    }

    if (!state.panelEl || !document.body.contains(state.panelEl)) {
      const panel = document.createElement('div');
      panel.className = 'tp-panel';
      panel.addEventListener('click', e => {
        const btn = e.target.closest('.tp-switch');
        if (!btn) return;
        const key = btn.dataset.key;
        settings[key] = !settings[key];
        applySettingClasses();
        renderSettingsPanel();
        if (!settings.blobs) clearBlobs();
        if (settings.blobs) schedulePaletteUpdate(0);
        updateFloatingArtworkState();
        updateMetaOverlay();
      });
      document.body.appendChild(panel);
      state.panelEl = panel;
    }

    renderSettingsPanel();
  }

  function setupObserver() {
    if (state.observer) return;
    state.observer = new MutationObserver(mutations => {
      let needsPalette = false;
      let needsMeta = false;
      let needsFloat = false;
      let needsLyrics = false;

      for (const mutation of mutations) {
        if (mutation.type === 'attributes') {
          if (mutation.attributeName === 'src' || mutation.attributeName === 'srcset') needsPalette = true;
          if (mutation.attributeName === 'aria-hidden' || mutation.attributeName === 'class') {
            needsMeta = true;
            needsFloat = true;
          }
        }
        if (mutation.addedNodes && mutation.addedNodes.length) {
          needsMeta = true;
          needsFloat = true;
          needsLyrics = true;
        }
      }

      if (needsPalette) schedulePaletteUpdate(90);
      if (needsMeta) setTimeout(updateMetaOverlay, 0);
      if (needsFloat) setTimeout(updateFloatingArtworkState, 0);
      if (needsLyrics) setTimeout(attachLyricObserver, 0);
    });

    state.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'class', 'aria-hidden']
    });
  }

  function start() {
    injectCSS();
    applySettingClasses();
    attachLyricObserver();
    upgradeMedia();
    ensureMetaOverlay();
    ensureControls();
    updateFloatingArtworkState();
    updateMetaOverlay();
    schedulePaletteUpdate(20);
    setupObserver();

    state.mediaTimer = setInterval(upgradeMedia, 3000);
    state.metaTimer = setInterval(updateMetaOverlay, 700);
    state.lyricsTimer = setInterval(attachLyricObserver, 2500);
    state.gradientTimer = setInterval(renderGradientFrame, 140);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
