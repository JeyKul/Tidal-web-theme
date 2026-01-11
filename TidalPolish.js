// ==UserScript==
// @name         Tidal Polish
// @namespace    tidal-polish
// @version      1.0
// @description  Lyrics polish, smooth scroll, max-res draggable images & looping videos, remove overlays, album hover + border-radius tweak
// @match        *://*.tidal.com/*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const css = `
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
    scroll-behavior: auto; /* handled by JS animation */
  }

  @keyframes nowPlayingBoxHover {
    0%, 100% { transform: translateY(0); filter: drop-shadow(5px 5px 10px #ffffff55) 0 20px 40px #FFFFFF24; }
    50% { transform: translateY(-6px); filter: drop-shadow(5px 5px 10px #ffffff55) 0 25px 45px #FFFFFF36; }
  }

  ._albumImage_6305d93[data-test="now-playing-image"] {
    animation: nowPlayingBoxHover 3s ease-in-out infinite;
    transition: transform 0.2s, filter 0.2s;
    display: inline-block;
    z-index: 1;
    pointer-events: auto;
    border-radius: 50px !important;
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
  background-color: transparent;
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

      if (progress < 1) {
        currentAnimation.frame = requestAnimationFrame(step);
      } else {
        currentAnimation = null;
      }
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

})();
