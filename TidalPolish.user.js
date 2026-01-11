// ==UserScript==
// @name         Tidal Polish
// @namespace    tidal-polish
// @version      1.1
// @description  Lyrics polish, smooth scroll, max-res draggable images & looping videos, remove overlays, album hover + border-radius tweak + 3D look-at-cursor album cover + vibrant radial background
// @match        *://*.tidal.com/*
// @grant        none
// @license      WTFPL
// ==/UserScript==

(function () {
  'use strict';

  const css = `
  /* Your existing CSS here (unchanged) */
  span[data-test="lyrics-line"] {
    transition: filter 190ms ease, opacity 150ms ease, text-shadow 150ms ease;
    cursor: default;
  }
  span[data-test="lyrics-line"][data-current="true"] {
    text-shadow: rgba(255,255,255,0.50) 0px 0px 8px;
    opacity: 1;
    filter: none;
  }
  span[data-test="lyrics-line"][data-current="false"] {
    filter: blur(2px);
    opacity: 0.5;
    cursor: pointer;
  }
  span[data-test="lyrics-line"][data-current="false"]:hover {
    filter: none;
    opacity: 1;
  }
  div[class*="smoothScroll"] {
    scroll-behavior: linear;
  }

  ._albumImage_6305d93[data-test="now-playing-image"] {
    transition: transform 0.08s cubic-bezier(.03,.98,.52,.99);
    display: inline-block;
    z-index: 1;
    pointer-events: auto;
    border-radius: 50px !important;
    transform-style: preserve-3d;
    will-change: transform;
    position: relative;
  }

  ._albumImage_6305d93[data-test="now-playing-image"]::after {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 50px;
    pointer-events: none;
    background: radial-gradient(
      circle at var(--x,50%) var(--y,50%),
      rgba(0,120,255,0.20) 20%,
      transparent 80%
    );
    mix-blend-mode: screen;
    opacity: 0;
    transition: opacity 0.12s;
  }

  ._albumImage_6305d93[data-test="now-playing-image"].tilt-hover::after {
    opacity: 1;
  }

  .css-1tk08rl {
    overflow: hidden !important;
    position: absolute !important;
    width: 100% !important;
    height: 100% !important;
  }

  ._animationContainer_983dc83, .css-1tk08rl {
    border-radius: 10px;
  }

  ._imageWrapper_aecc0c5, ._round_5776dee, ._imageWrapper_aecc0c5._rounded_cc3b823, ._rounded_cc3b823 + ._overlay_91ba65b {
    border-radius: 20px !important;
  }

  ._shortcutItem_6c8e7b4, ._navigationItem_4e9deae, ._thumbnail_f82abfa img, ._overlay_aab3645, ._thumbnail_f82abfa, ._contentItem_684cbbe, ._submenuItem_3d0e609, ._actionItem_e0c1e65, ._activeTab_f47dafa, ._tabItem_8436610, ._baseButton_15fc215 {
    border-radius: 100px !important;
  }

  ._shortcutItem_6c8e7b4 > img, ._container_b1b02cf::before{
    border-radius: 50% !important;
  }

  ._player_1d16b04._notFullscreen_a82939e {
    background-color: rgba(0, 0, 0, 0.5);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 -6px 24px #0000003d;
  }

  ._mainContainer_6519c30._hasPlayer_57557c6 {
    height: calc(100svh);
  }
  `;

  function injectCSS() {
    if (!document.getElementById('tidal-super-polish-css')) {
      const style = document.createElement('style');
      style.id = 'tidal-super-polish-css';
      style.textContent = css;
      document.head.appendChild(style);
    }
  }

  injectCSS();
  new MutationObserver(injectCSS).observe(document.documentElement, { childList: true, subtree: true });

  const SCROLL_DURATION = 320;
  const EASING = t => 1 - Math.pow(1 - t, 3);
  let currentAnimation = null;

  function findScrollContainer() {
    return document.querySelector('div[class*="smoothScroll"]');
  }

  function animateScroll(container, targetScrollTop) {
    if (currentAnimation) cancelAnimationFrame(currentAnimation.frame);
    const start = container.scrollTop;
    const distance = targetScrollTop - start;
    const startTime = performance.now();

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / SCROLL_DURATION, 1);
      const eased = EASING(progress);
      container.scrollTop = start + distance * eased;
      if (progress < 1) currentAnimation.frame = requestAnimationFrame(step);
      else currentAnimation = null;
    }

    currentAnimation = { frame: requestAnimationFrame(step) };
  }

  function centerLyric(line) {
    const container = findScrollContainer();
    if (!container || !line) return;
    const lineTop = line.offsetTop;
    const lineHeight = line.offsetHeight;
    const containerHeight = container.clientHeight;
    const targetScrollTop = lineTop - containerHeight / 3 + lineHeight / 2;
    const finalScroll = Math.max(0, Math.min(targetScrollTop, container.scrollHeight - containerHeight));
    animateScroll(container, finalScroll);
  }

  const lyricObserver = new MutationObserver(muts => {
    muts.forEach(m => {
      if (m.type === 'attributes' && m.attributeName === 'data-current' && m.target.getAttribute('data-current') === 'true') {
        centerLyric(m.target);
      }
    });
  });

  function attachLyricObserver() {
    document.querySelectorAll('span[data-test="lyrics-line"]').forEach(el => {
      lyricObserver.observe(el, { attributes: true });
    });
  }

  attachLyricObserver();
  new MutationObserver(attachLyricObserver).observe(document.body, { childList: true, subtree: true });

  function upgradeMedia() {
    document.querySelectorAll('img._cellImage_0ef8dd3').forEach(img => {
      const src = img.srcset.split(',').pop()?.trim().split(' ')[0] || img.src;
      img.src = src;
      img.srcset = '';
      img.sizes = '';
      img.setAttribute('draggable', 'true');
    });

    document.querySelectorAll('video._cellImage_0ef8dd3').forEach(video => {
      const source = video.querySelector('source');
      if (source) {
        const largest = source.srcset?.split(',').pop()?.trim().split(' ')[0] || source.src;
        source.src = largest;
        source.srcset = '';
      }
      video.loop = true;
      video.autoplay = true;
      video.muted = true;
      video.setAttribute('draggable', 'true');
      video.load();
    });

    document.querySelectorAll('div._albumImageOverlay_2eabc2b').forEach(overlay => overlay.remove());
  }

  upgradeMedia();
  new MutationObserver(upgradeMedia).observe(document.body, { childList: true, subtree: true });

  let album = null;
  let bounds = null;

  function initAlbumTilt(el) {
    el.addEventListener("mouseenter", () => {
      bounds = el.getBoundingClientRect();
      el.classList.add("tilt-hover");
    });

    el.addEventListener("mouseleave", () => {
      bounds = null;
      el.classList.remove("tilt-hover");
      el.style.transform = `perspective(800px) rotateX(0deg) rotateY(0deg) scale(1)`;
      el.style.setProperty("--x", "50%");
      el.style.setProperty("--y", "50%");
    });

    el.addEventListener("mousemove", e => {
      if (!bounds) return;
      const x = e.clientX - bounds.left;
      const y = e.clientY - bounds.top;
      const xP = x / bounds.width;
      const yP = y / bounds.height;
      const rotY = (xP - 0.5) * 22;
      const rotX = (0.5 - yP) * 22;
      el.style.setProperty("--x", `${xP * 100}%`);
      el.style.setProperty("--y", `${yP * 100}%`);
      el.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.06)`;
    });
  }

  function findAlbum() {
    const el = document.querySelector('._albumImage_6305d93[data-test="now-playing-image"]');
    if (el && !el.dataset.tiltInit) {
      el.dataset.tiltInit = "1";
      album = el;
      initAlbumTilt(el);
    }
  }

  findAlbum();
  new MutationObserver(findAlbum).observe(document.body, { childList: true, subtree: true });

  let lastImgSrc = null;

  async function updateBackground() {
    const imgEl = document.querySelector('div[data-test="footer-player"] img._cellImage_0ef8dd3');
    const npEl = document.querySelector('section[data-test="now-playing"], #nowPlaying');
    if (!imgEl || !npEl) return;
    if (imgEl.src === lastImgSrc) return;
    lastImgSrc = imgEl.src;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imgEl.src + '?cors=' + Date.now();

    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext('2d');
      ctx.drawImage(img, 0, 0);

      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let r = 0, g = 0, b = 0, n = 0;
      for (let i = 0; i < d.length; i += 40*4) {
        if(d[i+3]<200) continue;
        r += d[i]; g += d[i+1]; b += d[i+2]; n++;
      }
      if(!n) return;
      const avg = { r: Math.round(r/n), g: Math.round(g/n), b: Math.round(b/n) };
      const gradient = `radial-gradient(circle, rgba(${avg.r},${avg.g},${avg.b},0.8) 0%, rgba(0,0,0,1) 100%)`;
      npEl.style.setProperty('background-image', gradient, 'important');
    };
  }

  setInterval(updateBackground, 1000);

})();
