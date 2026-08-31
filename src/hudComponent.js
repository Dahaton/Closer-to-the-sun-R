// src/hudComponent.js

import * as THREE from 'three';
import { state, saveState, RECIPES } from './state.js';
import { input } from './input.js';
import { t } from './localization.js';

export class HUDComponent {
  constructor() {
    this.distanceCounter = document.getElementById("distance-counter");
    this.feathersContainer = null;
    this.equippedText = document.getElementById("current-wings-text");
    this.equippedIcon = document.getElementById("current-wings-icon");
    this.promptText = document.getElementById("prompt-text");

    this.returnHintElem = null;
    this.speedLinesOverlay = null;
    this.windEffectTimeout = null;

    this.runLootWidget = null;
    this.runCoinsCountElem = null;
    this.runItemsCountElem = null;

    this.chargeBarContainer = null;
    this.chargeFillElem = null;
    this.chargeTextElem = null;

    this.touchOverlay = null;
    this.endTierLabel = null;

    this.frameCount = 0;
    this.lastFpsTime = performance.now();
    this.fps = 60;

    this.alertPositionCache = new Map();

    this.initTooltip();
    this.initTowerProgressBar();
    this.initAlerts();
    this.initGlideTimer();
    this.initSpeedLines();
    this.initRunLootWidget();
    this.initChargeBar();
    this.ensureFeathersContainer();
    this.initTouchControls();
  }

  // Заглушка для обратной совместимости
  updateReturnHint(hasTakenOff) {}

  // Красивое центральное уведомление в виде стилизованного баннера
  showCenterNotification(text, durationMs = 3000) {
    const viewport = document.getElementById("game-viewport") || document.body;

    const existing = document.getElementById("center-notification-elem");
    if (existing) existing.remove();

    const notifElem = document.createElement("div");
    notifElem.id = "center-notification-elem";
    notifElem.style.cssText = `
      position: absolute;
      top: 32%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 18px;
      font-weight: bold;
      color: #dfc888;
      background: rgba(18, 14, 28, 0.94);
      border: 3px double #b89855;
      outline: 2px solid #523a1a;
      outline-offset: 2px;
      border-radius: 4px;
      padding: 10px 22px;
      text-shadow: 2px 2px 0px #180e1c, -1px -1px 0px #523a1a;
      max-width: 82%;
      text-align: center;
      word-wrap: break-word;
      pointer-events: none;
      z-index: 28000;
      opacity: 0;
      transition: opacity 0.5s ease, transform 0.5s ease;
      line-height: 1.35;
      box-shadow: 0 0 25px rgba(0, 0, 0, 0.95), inset 0 0 10px rgba(184, 152, 85, 0.15);
      letter-spacing: 1px;
    `;

    notifElem.innerText = text;
    viewport.appendChild(notifElem);

    requestAnimationFrame(() => {
      notifElem.style.opacity = "1";
      notifElem.style.transform = "translate(-50%, -50%) scale(1.02)";
    });

    setTimeout(() => {
      notifElem.style.opacity = "0";
      notifElem.style.transform = "translate(-50%, -50%) scale(0.95)";
      setTimeout(() => {
        if (notifElem.parentNode) notifElem.remove();
      }, 500);
    }, durationMs);
  }

  initTouchControls() {
    if (this.touchOverlay) return;

    const viewport = document.getElementById("game-viewport") || document.body;

    this.touchOverlay = document.createElement("div");
    this.touchOverlay.id = "touch-controls-overlay";
    this.touchOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      pointer-events: none;
      z-index: 29000;
      display: none;
    `;

    this.touchOverlay.innerHTML = `
      <button id="touch-btn-pause" class="touch-btn" style="
        position: absolute;
        width: 44px; height: 44px;
        background: rgba(18, 14, 28, 0.88);
        border: 2px solid rgba(184, 152, 85, 0.95);
        border-radius: 5px;
        color: #dfc888;
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 20px; font-weight: bold;
        box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.85);
        display: flex; align-items: center; justify-content: center;
        user-select: none; -webkit-user-select: none;
        touch-action: none;
        outline: none;
        pointer-events: auto;
        z-index: 30000;
      ">❚❚</button>

      <div id="touch-left-group" style="
        position: absolute;
        bottom: 64px; left: 24px;
        display: flex; gap: 18px;
        pointer-events: auto;
      ">
        <button id="touch-btn-left" class="touch-btn" style="
          width: 54px; height: 54px;
          background: rgba(18, 14, 28, 0.88);
          border: 2px solid rgba(184, 152, 85, 0.95);
          border-radius: 5px;
          color: #dfc888;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 22px; font-weight: bold;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.85);
          display: flex; align-items: center; justify-content: center;
          user-select: none; -webkit-user-select: none;
          touch-action: none;
          outline: none;
        ">◄</button>

        <button id="touch-btn-right" class="touch-btn" style="
          width: 54px; height: 54px;
          background: rgba(18, 14, 28, 0.88);
          border: 2px solid rgba(184, 152, 85, 0.95);
          border-radius: 5px;
          color: #dfc888;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 22px; font-weight: bold;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.85);
          display: flex; align-items: center; justify-content: center;
          user-select: none; -webkit-user-select: none;
          touch-action: none;
          outline: none;
        ">►</button>
      </div>

      <div id="touch-right-group" style="
        position: absolute;
        bottom: 64px; right: 24px;
        display: flex; gap: 8px;
        pointer-events: auto;
      ">
        <button id="touch-btn-action" class="touch-btn" style="
          width: 82px; height: 54px;
          background: rgba(18, 14, 28, 0.88);
          border: 2px solid rgba(184, 152, 85, 0.95);
          border-radius: 5px;
          color: #ffd54f;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 16px; font-weight: bold;
          letter-spacing: 1px;
          box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.85);
          display: flex; align-items: center; justify-content: center;
          text-transform: uppercase;
          text-align: center;
          user-select: none; -webkit-user-select: none;
          touch-action: none;
          outline: none;
        ">FLAP</button>
      </div>
    `;

    viewport.appendChild(this.touchOverlay);

    this.bindTouchButton("#touch-btn-left", "a");
    this.bindTouchButton("#touch-btn-right", "d");
    this.bindTouchButton("#touch-btn-action", "space", "e");

    const btnPause = this.touchOverlay.querySelector("#touch-btn-pause");
    if (btnPause) {
      const handlePause = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.ui && window.gameApp) {
          window.ui.togglePauseMenu(window.gameApp);
        }
      };
      btnPause.addEventListener("touchstart", handlePause, { passive: false });
      btnPause.addEventListener("mousedown", handlePause);
    }

    const style = document.createElement("style");
    style.textContent = `
      .touch-btn:active, .touch-btn.pressed {
        background: rgba(184, 152, 85, 0.95) !important;
        color: #120a0e !important;
        transform: scale(0.94) !important;
        box-shadow: 0 0 8px rgba(255, 221, 144, 0.9) !important;
      }
    `;
    document.head.appendChild(style);
  }

  bindTouchButton(selector, keyName1, keyName2 = null) {
    const btn = this.touchOverlay ? this.touchOverlay.querySelector(selector) : null;
    if (!btn) return;

    const pressHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.add("pressed");
      input.setVirtualKey(keyName1, true);
      if (keyName2) input.setVirtualKey(keyName2, true);
    };

    const releaseHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      btn.classList.remove("pressed");
      input.setVirtualKey(keyName1, false);
      if (keyName2) input.setVirtualKey(keyName2, false);
    };

    btn.addEventListener("touchstart", pressHandler, { passive: false });
    btn.addEventListener("touchend", releaseHandler, { passive: false });
    btn.addEventListener("touchcancel", releaseHandler, { passive: false });

    btn.addEventListener("mousedown", pressHandler);
    btn.addEventListener("mouseup", releaseHandler);
    btn.addEventListener("mouseleave", releaseHandler);
  }

  initChargeBar() {
    if (this.chargeBarContainer) return;

    this.chargeBarContainer = document.createElement("div");
    this.chargeBarContainer.id = "ui-charge-bar";
    this.chargeBarContainer.style.cssText = `
      position: absolute;
      pointer-events: none;
      display: none;
      z-index: 25000;
      transform: translate(-50%, -50%);
      width: 150px;
      flex-direction: column;
      align-items: center;
      gap: 5px;
    `;

    this.chargeBarContainer.innerHTML = `
      <div id="charge-text-elem" style="
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 13px; font-weight: bold; color: #ffd54f;
        text-shadow: 2px 2px 0px #000, -1px -1px 0px #000;
        text-transform: uppercase; letter-spacing: 1px;
      ">SKIP: 1 FEATHER</div>
      <div style="
        width: 100%; height: 10px;
        background: rgba(18, 14, 28, 0.92);
        border: 1.5px solid #b89855;
        border-radius: 3px;
        overflow: hidden;
        box-shadow: 2px 2px 0px rgba(0,0,0,0.8);
      ">
        <div id="charge-fill-elem" style="
          width: 0%; height: 100%;
          background: linear-gradient(90deg, #ffb74d, #ffd54f);
          transition: width 0.04s linear;
        "></div>
      </div>
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.chargeBarContainer);

    this.chargeFillElem = this.chargeBarContainer.querySelector("#charge-fill-elem");
    this.chargeTextElem = this.chargeBarContainer.querySelector("#charge-text-elem");
  }

  updateChargeBar(playerObj, camera, progress, feathersSpent) {
    if (!this.chargeBarContainer) this.initChargeBar();

    if (this.chargeBarContainer && playerObj && camera) {
      this.chargeBarContainer.style.display = "flex";
      const tempVec = new THREE.Vector3().copy(playerObj.position);
      tempVec.project(camera);

      let screenX = (tempVec.x * 0.5 + 0.5) * 640;
      let screenY = (-tempVec.y * 0.5 + 0.5) * 480 - 75;

      screenX = Math.max(80, Math.min(560, screenX));
      screenY = Math.max(40, Math.min(420, screenY));

      this.chargeBarContainer.style.left = `${Math.round(screenX)}px`;
      this.chargeBarContainer.style.top = `${Math.round(screenY)}px`;

      const pct = Math.max(0, Math.min(100, progress * 100));
      if (this.chargeFillElem) this.chargeFillElem.style.width = `${pct}%`;
      if (this.chargeTextElem) {
        this.chargeTextElem.innerText = `SKIP: ${feathersSpent} ${feathersSpent === 1 ? 'FEATHER' : 'FEATHERS'}`;
      }
    }
  }

  hideChargeBar() {
    if (this.chargeBarContainer) {
      this.chargeBarContainer.style.display = "none";
    }
  }

  triggerSingleSpiralFeather(playerObj, camera, index = 0) {
    const viewport = document.getElementById("game-viewport") || document.body;
    const startX = 320;
    const startY = 440;

    const feather = document.createElement("div");
    feather.style.cssText = `
      position: absolute;
      width: 26px;
      height: 36px;
      background-image: url('assets/ui/feather10.png');
      background-size: contain;
      background-repeat: no-repeat;
      background-position: center;
      pointer-events: none;
      z-index: 32000;
      filter: drop-shadow(0 0 10px rgba(255, 213, 79, 1));
      transform: translate(-50%, -50%);
    `;
    viewport.appendChild(feather);

    const phaseOffset = index * 1.6;
    const duration = 520;
    const startTime = performance.now();

    const animateSpiral = (now) => {
      const elapsed = now - startTime;
      const t = Math.min(1.0, elapsed / duration);

      const curTargetVec = new THREE.Vector3().copy(playerObj.position);
      curTargetVec.project(camera);
      const liveTargetX = (curTargetVec.x * 0.5 + 0.5) * 640;
      const liveTargetY = (-curTargetVec.y * 0.5 + 0.5) * 480;

      const baseX = (1 - t) * startX + t * liveTargetX;
      const baseY = (1 - t) * startY + t * liveTargetY;

      const radius = 85 * (1 - t) * Math.sin(t * Math.PI);
      const angle = t * Math.PI * 3.8 + phaseOffset;

      const x = baseX + Math.cos(angle) * radius;
      const y = baseY + Math.sin(angle) * radius;

      const scale = (1 - t * 0.25) * (0.85 + Math.sin(t * Math.PI) * 0.45);
      const rotDeg = Math.sin(angle) * 50;

      feather.style.left = `${Math.round(x)}px`;
      feather.style.top = `${Math.round(y)}px`;
      feather.style.transform = `translate(-50%, -50%) scale(${scale.toFixed(2)}) rotate(${Math.round(rotDeg)}deg)`;
      feather.style.opacity = `${(1 - Math.pow(t, 2.5)).toFixed(2)}`;

      if (t < 1.0) {
        requestAnimationFrame(animateSpiral);
      } else {
        feather.remove();
      }
    };

    requestAnimationFrame(animateSpiral);
  }

  initRunLootWidget() {
    const viewport = document.getElementById("game-viewport") || document.body;

    this.runLootWidget = document.createElement("div");
    this.runLootWidget.id = "run-loot-widget";
    this.runLootWidget.style.cssText = `
      position: absolute;
      top: 10px;
      right: 14px;
      display: none;
      flex-direction: row;
      align-items: center;
      gap: 12px;
      z-index: 20000;
      pointer-events: none;
    `;

    this.runLootWidget.innerHTML = `
      <div id="run-loot-coins-box" style="
        display: flex; align-items: center; gap: 5px;
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
        filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.9));
        transition: transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      ">
        <div id="run-coin-icon-elem" style="
          width: 22px; height: 22px;
          background-image: url('assets/items/coin.png');
          background-size: contain; background-repeat: no-repeat; background-position: center;
        "></div>
        <span id="run-coin-count-text" style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 18px; font-weight: bold; color: #ffd54f;
          text-shadow: 2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000;
        ">0</span>
      </div>

      <div id="run-loot-items-box" style="
        display: flex; align-items: center; gap: 5px;
        background: transparent;
        border: none;
        padding: 0;
        box-shadow: none;
        filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.9));
        transition: transform 0.12s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      ">
        <div id="run-item-icon-elem" style="
          width: 22px; height: 22px;
          background-image: url('assets/items/bag.png');
          background-size: contain; background-repeat: no-repeat; background-position: center;
        "></div>
        <span id="run-item-count-text" style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 18px; font-weight: bold; color: #dfc888;
          text-shadow: 2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000, -1px 1px 0px #000;
        ">0</span>
      </div>
    `;

    viewport.appendChild(this.runLootWidget);

    this.runCoinsCountElem = this.runLootWidget.querySelector("#run-coin-count-text");
    this.runItemsCountElem = this.runLootWidget.querySelector("#run-item-count-text");

    const style = document.createElement("style");
    style.textContent = `
      @keyframes lootTwitchCoin {
        0% { transform: scale(1); filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.9)); }
        35% { transform: scale(1.5) rotate(-10deg); filter: drop-shadow(0 0 10px rgba(255, 213, 79, 1)); }
        70% { transform: scale(0.9) rotate(4deg); }
        100% { transform: scale(1) rotate(0deg); filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.9)); }
      }
      @keyframes lootTwitchItem {
        0% { transform: scale(1); filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.9)); }
        35% { transform: scale(1.5) rotate(10deg); filter: drop-shadow(0 0 10px rgba(129, 199, 132, 1)); }
        70% { transform: scale(0.9) rotate(-4deg); }
        100% { transform: scale(1) rotate(0deg); filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.9)); }
      }
      @keyframes floatPlusOneAnim {
        0% { transform: translate(-50%, -40%) scale(0.3) rotate(-6deg); opacity: 0; }
        25% { transform: translate(-50%, -80%) scale(1.45) rotate(3deg); opacity: 1; }
        70% { transform: translate(-50%, -125%) scale(1.0) rotate(0deg); opacity: 1; }
        100% { transform: translate(-50%, -160%) scale(0.7); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  triggerLootPickupUI(type, screenX, screenY) {
    const viewport = document.getElementById("game-viewport") || document.body;

    const plusOne = document.createElement("div");
    plusOne.innerText = type === "rune" ? "+FEATHERS!" : "+1";
    plusOne.style.cssText = `
      position: absolute;
      left: ${Math.round(screenX)}px;
      top: ${Math.round(screenY)}px;
      font-family: 'MainFont', monospace, sans-serif;
      font-size: ${type === "rune" ? "18px" : "22px"};
      font-weight: bold;
      color: ${type === "coin" ? "#ffd54f" : (type === "rune" ? "#c084fc" : "#81c784")};
      text-shadow: 2px 2px 0px #000, -1px -1px 0px #000, 1px -1px 0px #000;
      pointer-events: none;
      z-index: 30000;
      animation: floatPlusOneAnim 0.48s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
    `;
    viewport.appendChild(plusOne);
    setTimeout(() => plusOne.remove(), 480);

    const boxId = type === "coin" ? "#run-loot-coins-box" : "#run-loot-items-box";
    const animName = type === "coin" ? "lootTwitchCoin 0.32s ease-out" : "lootTwitchItem 0.32s ease-out";
    const targetBox = this.runLootWidget ? this.runLootWidget.querySelector(boxId) : null;

    if (targetBox) {
      targetBox.style.animation = "none";
      void targetBox.offsetWidth;
      targetBox.style.animation = animName;
    }
  }

  updateRunLootCounters(coins, itemsTotal) {
    if (this.runCoinsCountElem) this.runCoinsCountElem.innerText = `${coins}`;
    if (this.runItemsCountElem) this.runItemsCountElem.innerText = `${itemsTotal}`;
  }

  initSpeedLines() {
    const viewport = document.getElementById("game-viewport") || document.body;
    this.speedLinesOverlay = document.createElement("div");
    this.speedLinesOverlay.id = "speed-lines-overlay";
    this.speedLinesOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      pointer-events: none;
      z-index: 18000;
      opacity: 0;
      transition: opacity 0.15s ease;
      background: radial-gradient(circle, transparent 30%, rgba(255, 255, 255, 0.15) 100%);
      overflow: hidden;
    `;

    for (let i = 0; i < 14; i++) {
      const line = document.createElement("div");
      const left = Math.random() * 100;
      const width = 1 + Math.random() * 2;
      const height = 40 + Math.random() * 80;
      const animDelay = Math.random() * 0.3;
      const animDuration = 0.25 + Math.random() * 0.25;

      line.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: -100px;
        width: ${width}px;
        height: ${height}px;
        background: linear-gradient(to bottom, rgba(255, 255, 255, 0), rgba(255, 255, 255, 0.75), rgba(255, 255, 255, 0));
        animation: speedLineAnim ${animDuration}s linear infinite ${animDelay}s;
      `;
      this.speedLinesOverlay.appendChild(line);
    }

    viewport.appendChild(this.speedLinesOverlay);

    const style = document.createElement("style");
    style.textContent = `
      @keyframes speedLineAnim {
        0% { transform: translateY(0px); opacity: 0; }
        30% { opacity: 0.85; }
        100% { transform: translateY(580px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  showWindEffect(durationSec = 0.6) {
    if (!this.speedLinesOverlay) this.initSpeedLines();
    if (this.speedLinesOverlay) {
      this.speedLinesOverlay.style.opacity = "1";
      if (this.windEffectTimeout) clearTimeout(this.windEffectTimeout);
      this.windEffectTimeout = setTimeout(() => {
        if (this.speedLinesOverlay) {
          this.speedLinesOverlay.style.opacity = "0";
        }
      }, durationSec * 1000);
    }
  }

  ensureFeathersContainer() {
    let container = document.getElementById("feathers-container");
    const viewport = document.getElementById("game-viewport") || document.body;

    if (!container) {
      container = document.createElement("div");
      container.id = "feathers-container";
      viewport.appendChild(container);
    } else if (container.parentElement !== viewport) {
      viewport.appendChild(container);
    }

    container.style.cssText = `
      position: absolute !important;
      top: auto !important;
      bottom: 20px !important;
      left: 50% !important;
      right: auto !important;
      transform: translateX(-50%) !important;
      margin: 0 !important;
      padding: 0 !important;
      width: auto !important;
      height: 40px !important;
      display: flex !important;
      flex-direction: row !important;
      justify-content: center !important;
      align-items: center !important;
      z-index: 25000 !important;
      pointer-events: none !important;
      transition: bottom 0.35s cubic-bezier(0.16, 1, 0.3, 1) !important;
    `;

    this.feathersContainer = container;
    return container;
  }

  initGlideTimer() {
    if (this.glideTimerContainer) return;

    this.glideTimerContainer = document.createElement("div");
    this.glideTimerContainer.id = "ui-glide-timer";
    this.glideTimerContainer.style.cssText = `
      position: absolute;
      pointer-events: none;
      display: none;
      z-index: 9500;
      transform: translate(-50%, -50%);
      width: 48px;
      height: 48px;
    `;
    this.glideTimerContainer.innerHTML = `
      <svg width="48" height="48" viewBox="0 0 48 48" style="filter: drop-shadow(2px 2px 0px rgba(0,0,0,0.8));">
        <circle cx="24" cy="24" r="18" fill="rgba(18, 14, 28, 0.88)" stroke="rgba(255, 255, 255, 0.25)" stroke-width="3.5"/>
        <circle id="glide-ring-elem" cx="24" cy="24" r="18" fill="none" stroke="#e2c89b" stroke-width="4"
                stroke-dasharray="113.1" stroke-dashoffset="0" stroke-linecap="round"
                transform="rotate(-90 24 24)"/>
      </svg>
      <div id="glide-text-elem" style="
        position: absolute; top:0; left:0; width:100%; height:100%;
        display:flex; align-items:center; justify-content:center;
        color: #e2c89b; font-family: 'MainFont', monospace, sans-serif; font-size: 16px; font-weight: bold;
        text-shadow: 1px 1px 0px #000, -1px -1px 0px #000;
      ">3.0</div>
    `;
    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.glideTimerContainer);

    this.glideRing = this.glideTimerContainer.querySelector("#glide-ring-elem");
    this.glideText = this.glideTimerContainer.querySelector("#glide-text-elem");
  }

  updateGlideTimer(playerObj, camera, remainingTime, maxTime = 3.0) {
    const activeScene = window.gameApp?.currentScene;
    const isGliding = activeScene && activeScene.isGliding;

    if (state.currentScene !== "Tower" || !playerObj || !camera || remainingTime <= 0 || !isGliding) {
      this.hideGlideTimer();
      return;
    }

    if (!this.glideTimerContainer) this.initGlideTimer();

    if (this.glideTimerContainer) {
      this.glideTimerContainer.style.display = "block";
      const tempVec = new THREE.Vector3().copy(playerObj.position);
      tempVec.project(camera);

      let screenX = (tempVec.x * 0.5 + 0.5) * 640 + 52;
      let screenY = (-tempVec.y * 0.5 + 0.5) * 480 - 15;

      screenX = Math.max(30, Math.min(610, screenX));
      screenY = Math.max(40, Math.min(440, screenY));

      this.glideTimerContainer.style.left = `${Math.round(screenX)}px`;
      this.glideTimerContainer.style.top = `${Math.round(screenY)}px`;

      const pct = Math.max(0, Math.min(1, remainingTime / maxTime));
      const circumference = 113.1;
      if (this.glideRing) {
        this.glideRing.style.strokeDashoffset = `${circumference * (1 - pct)}`;
        this.glideRing.style.stroke = pct < 0.35 ? "#ef4444" : "#e2c89b";
      }
      if (this.glideText) {
        this.glideText.innerText = Math.max(0, remainingTime).toFixed(1);
        this.glideText.style.color = pct < 0.35 ? "#ef4444" : "#e2c89b";
      }
    }
  }

  hideGlideTimer() {
    if (this.glideTimerContainer) {
      this.glideTimerContainer.style.display = "none";
    }
  }

  initTooltip() {
    this.tooltip = document.createElement("div");
    this.tooltip.id = "ui-item-tooltip";
    this.tooltip.style.cssText = `
      position: fixed;
      pointer-events: none;
      display: none;
      z-index: 99999;
      background: rgba(18, 14, 28, 0.95);
      border: 2px solid #b89855;
      border-radius: 2px;
      padding: 8px 12px;
      color: #dfc888;
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 15px;
      line-height: 1.4;
      max-width: 260px;
      word-wrap: break-word;
      box-shadow: 3px 3px 0px rgba(0, 0, 0, 0.6);
      white-space: pre-line;
    `;
    document.body.appendChild(this.tooltip);
  }

  showTooltip(e, htmlContent) {
    if (!this.tooltip) return;
    this.tooltip.innerHTML = htmlContent;
    this.tooltip.style.display = "block";
    this.updateTooltipPosition(e);
  }

  updateTooltipPosition(e) {
    if (!this.tooltip || this.tooltip.style.display === "none") return;
    let x = e.clientX + 12;
    let y = e.clientY + 12;

    const rect = this.tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 8) {
      x = e.clientX - rect.width - 8;
    }
    if (y + rect.height > window.innerHeight - 8) {
      y = e.clientY - rect.height - 8;
    }

    this.tooltip.style.left = `${Math.max(8, x)}px`;
    this.tooltip.style.top = `${Math.max(8, y)}px`;
  }

  hideTooltip() {
    if (this.tooltip) {
      this.tooltip.style.display = "none";
    }
  }

  initTowerProgressBar() {
    if (this.progressBarContainer) return;

    this.progressBarContainer = document.createElement("div");
    this.progressBarContainer.id = "tower-progress-bar-container";
    this.progressBarContainer.style.cssText = `
      position: absolute;
      top: 10px;
      left: 50%;
      transform: translateX(-50%);
      width: 320px;
      height: 14px;
      background: rgba(18, 14, 28, 0.88);
      border: 2px solid #b89855;
      border-radius: 2px;
      box-shadow: 2px 2px 0px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 10000;
      display: none;
    `;

    this.progressFill = document.createElement("div");
    this.progressFill.style.cssText = `
      width: 0%;
      height: 100%;
      background: linear-gradient(90deg, #388e3c, #81c784, #ffd54f);
      border-radius: 1px;
    `;
    this.progressBarContainer.appendChild(this.progressFill);

    this.progressPlayerPin = document.createElement("div");
    this.progressPlayerPin.style.cssText = `
      position: absolute;
      top: -4px;
      left: 0%;
      width: 6px;
      height: 22px;
      background: #ffffff;
      border: 1px solid #000;
      box-shadow: 0 0 4px #fff;
      transform: translateX(-50%);
      z-index: 2;
    `;
    this.progressBarContainer.appendChild(this.progressPlayerPin);

    this.progressBestPin = document.createElement("div");
    this.progressBestPin.id = "tower-best-pin";
    this.progressBestPin.style.cssText = `
      position: absolute;
      top: -5px;
      left: 0%;
      width: 4px;
      height: 24px;
      background: #ffd54f;
      border: 1px solid #180e1c;
      box-shadow: 0 0 5px #ffd54f;
      transform: translateX(-50%);
      z-index: 3;
      display: none;
    `;
    const bestTop = document.createElement("div");
    bestTop.style.cssText = `
      position: absolute;
      top: -9px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 11px;
      color: #ffd54f;
      text-shadow: 1px 1px 0px #000, -1px -1px 0px #000;
    `;
    bestTop.innerText = "★";
    this.progressBestPin.appendChild(bestTop);
    this.progressBarContainer.appendChild(this.progressBestPin);

    const tiers = [
      { label: "T1", z: 0 },
      { label: "1.5", z: 25000 },
      { label: "T2", z: 50000 },
      { label: "2.5", z: 80000 },
      { label: "T3", z: 110000 },
      { label: "T4", z: 145000 },
      { label: "☼", z: 220000 }
    ];

    tiers.forEach(tier => {
      const pct = (tier.z / 220000) * 100;
      const marker = document.createElement("div");
      marker.style.cssText = `
        position: absolute;
        top: 0;
        left: ${pct}%;
        width: 1px;
        height: 100%;
        background: rgba(255, 255, 255, 0.4);
        z-index: 1;
      `;

      const label = document.createElement("span");
      label.innerText = tier.label;
      label.style.cssText = `
        position: absolute;
        top: 16px;
        left: ${pct}%;
        transform: translateX(-50%);
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 12px;
        font-weight: bold;
        color: ${tier.label === '☼' || tier.label === '∞' ? '#ffd54f' : '#dfc888'};
        text-shadow: 1px 1px 0px #000;
        line-height: 1;
        white-space: nowrap;
      `;

      if (tier.z === 220000) {
        this.endTierLabel = label;
      }

      this.progressBarContainer.appendChild(marker);
      this.progressBarContainer.appendChild(label);
    });

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.progressBarContainer);
  }

  updateTowerProgressBar(playerZ = 0) {
    if (state.currentScene !== "Tower") {
      if (this.progressBarContainer) this.progressBarContainer.style.display = "none";
      return;
    }

    if (this.endTierLabel) {
      this.endTierLabel.innerText = state.endlessUnlocked ? "∞" : "☼";
    }

    if (playerZ > (state.highScore || 0)) {
      state.highScore = Math.round(playerZ);
      saveState();
    }

    if (this.progressBarContainer) {
      this.progressBarContainer.style.display = "block";
      const pct = Math.max(0, Math.min(100, (playerZ / 220000) * 100));
      if (this.progressFill) this.progressFill.style.width = `${pct}%`;
      if (this.progressPlayerPin) this.progressPlayerPin.style.left = `${pct}%`;

      if (state.highScore && state.highScore > 0) {
        const bestPct = Math.max(0, Math.min(100, (state.highScore / 220000) * 100));
        if (this.progressBestPin) {
          this.progressBestPin.style.display = "block";
          this.progressBestPin.style.left = `${bestPct}%`;
        }
      }
    }
  }

  initAlerts() {
    this.alertsContainer = document.createElement("div");
    this.alertsContainer.id = "tower-alerts-container";
    this.alertsContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 640px;
      height: 480px;
      pointer-events: none;
      z-index: 9000;
      overflow: hidden;
    `;
    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.alertsContainer);
  }

  updateTowerAlerts(playerObj, camera, obstacles = [], collectibles = [], flags = []) {
    if (state.currentScene !== "Tower" || !playerObj || !camera) {
      this.hideAlerts();
      return;
    }

    const playerZ = playerObj.position.z;
    const playerX = playerObj.position.x;
    const playerY = playerObj.position.y;
    const playerDistXY = Math.hypot(playerX, playerY);

    const tempVec = new THREE.Vector3();
    const upcoming = [];

    const isSameSide = (objX, objY) => {
      const objDistXY = Math.hypot(objX, objY);
      if (objDistXY < 20) return true;
      if (playerDistXY < 1) return true;

      const cosAngle = (playerX * objX + playerY * objY) / (playerDistXY * objDistXY);
      return cosAngle > 0.15;
    };

    const processItem = (obj, isDanger, icon) => {
      const objWorldPos = new THREE.Vector3();
      obj.getWorldPosition(objWorldPos);

      const dz = objWorldPos.z - playerZ;
      if (dz > 40 && dz < 2400) {
        if (isSameSide(objWorldPos.x, objWorldPos.y)) {
          upcoming.push({ obj, pos: objWorldPos, dz, isDanger, icon, id: obj.uuid });
        }
      }
    };

    for (const obs of obstacles) {
      processItem(obs, true, "assets/ui/danger.png");
    }

    for (const col of collectibles) {
      if (col.userData && col.userData.pickingUp) continue;
      const isCoin = col.userData && col.userData.type === "coin";
      const isRune = col.userData && col.userData.type === "rune";
      const icon = isCoin ? "assets/ui/coins.png" : (isRune ? "assets/ui/Rune.png" : "assets/ui/items.png");
      processItem(col, false, icon);
    }

    for (const flag of flags) {
      if (!flag.userData || !flag.userData.used) {
        processItem(flag, false, "assets/ui/flag.png");
      }
    }

    upcoming.sort((a, b) => a.dz - b.dz);
    const closest = upcoming.slice(0, 8);

    const activeIds = new Set(closest.map(i => i.id));
    for (const key of this.alertPositionCache.keys()) {
      if (!activeIds.has(key)) {
        this.alertPositionCache.delete(key);
      }
    }

    this.alertsContainer.innerHTML = "";

    for (const item of closest) {
      tempVec.copy(item.pos);
      tempVec.project(camera);

      if (tempVec.z > 1) continue;

      let targetX = (tempVec.x * 0.5 + 0.5) * 640;
      let targetY = (-tempVec.y * 0.5 + 0.5) * 480;

      targetX = Math.max(24, Math.min(616, targetX));
      targetY = Math.max(68, Math.min(450, targetY));

      const depthRatio = Math.max(0, Math.min(1, (2200 - item.dz) / 2000));
      const targetScale = 0.65 + depthRatio * 0.45;
      const targetOpacity = 0.55 + depthRatio * 0.45;

      let cached = this.alertPositionCache.get(item.id);
      if (!cached) {
        cached = { x: targetX, y: targetY, scale: targetScale, opacity: targetOpacity };
      } else {
        cached.x += (targetX - cached.x) * 0.35;
        cached.y += (targetY - cached.y) * 0.35;
        cached.scale += (targetScale - cached.scale) * 0.35;
        cached.opacity += (targetOpacity - cached.opacity) * 0.35;
      }
      this.alertPositionCache.set(item.id, cached);

      const alertNode = document.createElement("div");
      const isClose = item.dz < 700;

      const size = Math.round(26 * cached.scale);

      alertNode.style.cssText = `
        position: absolute;
        left: ${Math.round(cached.x)}px;
        top: ${Math.round(cached.y)}px;
        transform: translate(-50%, -50%);
        width: ${size}px;
        height: ${size}px;
        background-image: url('${item.icon}');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        opacity: ${cached.opacity.toFixed(2)};
        filter: drop-shadow(2px 2px 0px rgba(0, 0, 0, 0.7));
        animation: ${item.isDanger && isClose ? "alertPulse 0.35s infinite alternate" : "none"};
      `;

      this.alertsContainer.appendChild(alertNode);
    }
  }

  hideAlerts() {
    if (this.alertsContainer) {
      this.alertsContainer.innerHTML = "";
    }
    if (this.alertPositionCache) {
      this.alertPositionCache.clear();
    }
  }

  updateFps(delta) {
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsTime));
      this.frameCount = 0;
      this.lastFpsTime = now;
    }
  }

  updateHUD(playerZ = 0, delta = 0.016) {
    const isTower = state.currentScene === "Tower";
    const isCity = state.currentScene === "City";
    const isCutscene = state.currentScene === "Cutscene" || state.currentScene === "EndingCutscene";

    if (isCutscene) {
      if (this.distanceCounter) this.distanceCounter.style.display = "none";
      if (this.runLootWidget) this.runLootWidget.style.display = "none";
      if (this.progressBarContainer) this.progressBarContainer.style.display = "none";
      if (this.returnHintElem) this.returnHintElem.style.display = "none";
      if (this.promptText) this.promptText.style.display = "none";
      if (this.alertsContainer) this.alertsContainer.innerHTML = "";

      if (this.touchOverlay) {
        this.touchOverlay.style.display = "none";
      }

      const container = this.ensureFeathersContainer();
      if (container) container.style.display = "none";
      return;
    }

    this.updateFps(delta);

    if (this.touchOverlay) {
      const leftGroup = this.touchOverlay.querySelector("#touch-left-group");
      if (leftGroup) leftGroup.style.display = "flex";

      const dialogueBox = document.getElementById("dialogue-box");
      const modalOverlay = document.getElementById("modal-overlay");
      const workshopPanel = document.getElementById("workshop-panel");
      const shopPanel = document.getElementById("shop-panel");
      const pauseModal = document.getElementById("modal-pause");
      const summaryModal = document.getElementById("modal-summary");
      const tutorialModal = document.getElementById("modal-tutorial");
      const retryModal = document.getElementById("modal-retry");

      const isDialogueVisible = !!(dialogueBox && dialogueBox.style.display !== "none" && dialogueBox.style.display !== "");
      const isModalOverlayVisible = !!(modalOverlay && modalOverlay.classList.contains("visible"));
      const isWorkshopVisible = !!(workshopPanel && workshopPanel.style.display !== "none" && workshopPanel.style.display !== "");
      const isShopVisible = !!(shopPanel && shopPanel.style.display !== "none" && shopPanel.style.display !== "");
      const isPauseVisible = !!(pauseModal && pauseModal.style.display !== "none" && pauseModal.style.display !== "");
      const isSummaryVisible = !!(summaryModal && summaryModal.style.display !== "none" && summaryModal.style.display !== "");
      const isTutorialVisible = !!(tutorialModal && tutorialModal.style.display !== "none" && tutorialModal.style.display !== "");
      const isRetryVisible = !!(retryModal && retryModal.style.display !== "none" && retryModal.style.display !== "");

      const isAnyMenuOpen = state.isPaused || 
                            state.interactingWithUI || 
                            state.inDialogue || 
                            isDialogueVisible || 
                            isModalOverlayVisible || 
                            isWorkshopVisible || 
                            isShopVisible || 
                            isPauseVisible || 
                            isSummaryVisible || 
                            isTutorialVisible || 
                            isRetryVisible;

      const canShowTouch = state.controlType === 'touch' && (isTower || isCity) && !isAnyMenuOpen;

      this.touchOverlay.style.display = canShowTouch ? "block" : "none";

      const btnPause = this.touchOverlay.querySelector("#touch-btn-pause");
      if (btnPause) {
        if (isCity) {
          btnPause.style.top = "12px";
          btnPause.style.right = "12px";
          btnPause.style.left = "auto";
        } else {
          btnPause.style.top = "12px";
          btnPause.style.left = "12px";
          btnPause.style.right = "auto";
        }
      }

      if (canShowTouch) {
        const actionBtn = this.touchOverlay.querySelector("#touch-btn-action");
        if (actionBtn) {
          if (isTower) {
            actionBtn.innerText = t('btnFlap') || "FLAP";
          } else {
            actionBtn.innerText = t('btnAction') || "INTERACT";
          }
        }
      }
    }

    if (this.distanceCounter) {
      if (isTower && state.showDebug) {
        this.distanceCounter.innerText = `${t('distance')}: ${Math.round(playerZ)} | ${t('tier')}: ${state.currentTier} | FPS: ${this.fps}`;
        this.distanceCounter.style.display = "block";
      } else {
        this.distanceCounter.style.display = "none";
      }
    }

    if (this.runLootWidget) {
      this.runLootWidget.style.display = isTower ? "flex" : "none";
    }

    if (this.progressBarContainer) {
      this.progressBarContainer.style.display = isTower ? "block" : "none";
    }

    const wingsContainer = document.getElementById("current-wings-box") ||
                           document.getElementById("equipped-wings-container") ||
                           (this.equippedText ? this.equippedText.parentElement : null);

    if (isCity) {
      let localizedWingName = t('none');
      if (state.equippedWings) {
        localizedWingName = t(`wing_${state.equippedWings}`) || state.equippedWingsDisplayName || t('none');
      }
      if (this.equippedText) {
        this.equippedText.innerText = `${t('equipped')} ${localizedWingName}`;
        this.equippedText.style.display = "inline-block";
      }
      if (wingsContainer) {
        wingsContainer.style.display = "flex";
      }
    } else {
      if (this.equippedText) this.equippedText.style.display = "none";
      if (wingsContainer && wingsContainer !== document.body) {
        wingsContainer.style.display = "none";
      }
    }

    if (this.equippedIcon) {
      const currentRecipe = RECIPES.find(r => r.codeName === state.equippedWings);
      if (currentRecipe && isCity) {
        this.equippedIcon.style.backgroundImage = `url('assets/ui/${currentRecipe.icon}')`;
        this.equippedIcon.style.display = "inline-block";
        this.equippedIcon.style.filter = "none";
      } else {
        this.equippedIcon.style.display = "none";
      }
    }

    const container = this.ensureFeathersContainer();
    if (isTower) {
      const maxFeathers = state.wingsDurability || 4;
      const maxWidth = 420;
      const spacingRequired = maxWidth / maxFeathers;

      let featherWidth = 28;
      let featherHeight = 38;
      let gap = 6;

      if (maxFeathers > 6) {
        featherWidth = Math.min(28, Math.max(10, spacingRequired - 4));
        featherHeight = Math.round(featherWidth * (38 / 28));
        gap = Math.min(6, Math.max(1.5, spacingRequired - featherWidth));
      }

      container.style.display = "flex";
      container.style.gap = `${gap}px`;

      const targetCount = state.staminaCounter;
      container.innerHTML = "";

      for (let i = 0; i < targetCount; i++) {
        const feather = document.createElement("div");
        feather.className = "feather-icon";

        const isPurple = i >= (targetCount - (state.purpleFeathersCount || 0));
        const filterStyle = isPurple
          ? "drop-shadow(0 0 6px rgba(192, 132, 252, 0.95)) hue-rotate(220deg) brightness(1.25) !important;"
          : "drop-shadow(1px 2px 2px rgba(0, 0, 0, 0.8)) !important;";

        feather.style.cssText = `
          width: ${featherWidth}px !important;
          height: ${featherHeight}px !important;
          min-width: ${featherWidth}px !important;
          min-height: ${featherHeight}px !important;
          background-image: url('assets/ui/feather10.png') !important;
          background-size: contain !important;
          background-repeat: no-repeat !important;
          background-position: center !important;
          flex-shrink: 0 !important;
          display: block !important;
          filter: ${filterStyle}
        `;
        container.appendChild(feather);
      }
    } else {
      container.style.cssText = `
        display: none !important;
      `;
      container.innerHTML = "";
    }
  }

  showPrompt(text) {
    if (this.promptText) {
      const isTouch = state.controlType === 'touch';
      this.promptText.style.bottom = isTouch ? "128px" : "24px";
      this.promptText.innerText = text;
      this.promptText.style.display = "block";
    }
  }

  hidePrompt() {
    if (this.promptText) {
      this.promptText.style.display = "none";
    }
  }
}