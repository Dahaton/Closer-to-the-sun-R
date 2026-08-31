
import { state, saveState } from './state.js';
import { audio } from './audio.js';
import { t } from './localization.js';
import { ITEM_DATA } from './panelsComponent.js';

export class ModalsComponent {
  constructor(hudComponent) {
    this.hud = hudComponent;
    this.appManager = null;

    this.pauseModal = null;
    this.tutorialModal = null;
    this.summaryModal = null;
    this.retryModal = null;

    this.blackScreen = document.getElementById("black-screen");
    this.customLoadingText = null;

    this.initPauseModal();
    this.initTutorialModal();
    this.initRunSummaryModal();
    this.initRetryModal();
    this.initLoadingScreen();
  }

  initRetryModal() {
    if (this.retryModal) return;

    this.retryModal = document.createElement("div");
    this.retryModal.id = "modal-retry";
    this.retryModal.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 640px;
      height: 480px;
      background: #000000;
      z-index: 999800;
      display: none;
      opacity: 0;
      transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      pointer-events: auto;
      overflow: hidden;
    `;

    this.retryModal.innerHTML = `
      <div id="retry-hero-container" style="
        position: absolute;
        left: calc(50% - 68px);
        top: 150px;
        width: 160px;
        height: 128px;
        transform: translate(-50%, -50%);
        margin: 0;
        padding: 0;
        animation: fallingSway 2.4s ease-in-out infinite;
        filter: drop-shadow(0 0 14px rgba(226, 200, 155, 0.65));
      ">
        <div id="retry-body-sprite" style="
          position: absolute;
          inset: 0;
          background-color: #e2c89b;
          mask-image: url('assets/player/falling_anim.png');
          -webkit-mask-image: url('assets/player/falling_anim.png');
          mask-size: contain;
          -webkit-mask-size: contain;
          mask-repeat: no-repeat;
          -webkit-mask-repeat: no-repeat;
          mask-position: center;
          -webkit-mask-position: center;
          image-rendering: pixelated;
        "></div>
      </div>

      <div id="retry-content" style="
        position: absolute;
        left: 50%;
        top: 270px;
        transform: translate(-50%, 0);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        opacity: 0;
        transition: opacity 0.5s ease 0.2s;
      ">
        <div id="retry-prompt-text" style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 26px;
          font-weight: bold;
          color: #e2c89b;
          text-transform: uppercase;
          letter-spacing: 2px;
          text-shadow: 3px 3px 0px #000, -2px -2px 0px #000, 2px -2px 0px #000;
          text-align: center;
          animation: textTremble 0.14s infinite linear;
          display: inline-block;
          white-space: nowrap;
        ">
          ${t('retryPrompt')}
        </div>

        <div style="
          display: flex;
          align-items: center;
          gap: 18px;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 22px;
          font-weight: bold;
          color: #dfc888;
          text-shadow: 2px 2px 0px #000, -2px -2px 0px #000;
          animation: textTremble 0.16s infinite linear;
          white-space: nowrap;
        ">
          <span id="btn-retry-yes" style="
            cursor: pointer;
            color: #dfc888;
            transition: all 0.15s ease;
            display: inline-block;
          ">${t('retryYes')}</span>

          <span style="color: #8c7853;">-</span>

          <span id="btn-retry-no" style="
            cursor: pointer;
            color: #dfc888;
            transition: all 0.15s ease;
            display: inline-block;
          ">${t('retryNo')}</span>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #btn-retry-yes:hover, #btn-retry-no:hover {
        color: #ffffff !important;
        transform: scale(1.15) !important;
        text-shadow: 0 0 10px rgba(255, 255, 255, 0.9), 2px 2px 4px #000 !important;
      }
      @keyframes flyingRiseAnim {
        0% { transform: translateY(35px) scale(0.85) rotate(-3deg); filter: drop-shadow(0 0 10px rgba(255, 213, 79, 0.7)); }
        50% { transform: translateY(-15px) scale(1.15) rotate(3deg); filter: drop-shadow(0 0 18px rgba(255, 213, 79, 1)); }
        100% { transform: translateY(-55px) scale(1.4) rotate(-3deg); filter: drop-shadow(0 0 25px rgba(255, 213, 79, 1)); }
      }
    `;
    document.head.appendChild(style);

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.retryModal);
  }

  showRetryModal(onRetry, onExitToCity) {
    this.initRetryModal();

    state.interactingWithUI = true;

    const promptText = this.retryModal.querySelector("#retry-prompt-text");
    const btnYes = this.retryModal.querySelector("#btn-retry-yes");
    const btnNo = this.retryModal.querySelector("#btn-retry-no");
    const content = this.retryModal.querySelector("#retry-content");

    if (promptText) promptText.innerText = t('retryPrompt');
    if (btnYes) btnYes.innerText = t('retryYes');
    if (btnNo) btnNo.innerText = t('retryNo');

    this.retryModal.style.display = "block";
    void this.retryModal.offsetWidth;
    this.retryModal.style.opacity = "1";

    if (this.hud) this.hud.updateHUD();

    setTimeout(() => {
      if (content) content.style.opacity = "1";
    }, 180);

    const handleYes = () => {
      btnYes.removeEventListener("click", handleYes);
      btnNo.removeEventListener("click", handleNo);
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);

      this.fadeInBlackScreen(400, () => {
        this.hideRetryModal();
        if (onRetry) onRetry();
      });
    };

    const handleNo = () => {
      btnYes.removeEventListener("click", handleYes);
      btnNo.removeEventListener("click", handleNo);
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);

      this.fadeInBlackScreen(400, () => {
        this.hideRetryModal();
        if (onExitToCity) onExitToCity();
      });
    };

    btnYes.addEventListener("click", handleYes);
    btnNo.addEventListener("click", handleNo);
  }

  hideRetryModal() {
    if (this.retryModal) {
      this.retryModal.style.opacity = "0";
      this.retryModal.style.display = "none";
      const content = this.retryModal.querySelector("#retry-content");
      if (content) content.style.opacity = "0";
      state.interactingWithUI = false;
    }
    if (this.hud) this.hud.updateHUD();
  }

  initPauseModal() {
    if (this.pauseModal) return;

    this.pauseModal = document.createElement("div");
    this.pauseModal.id = "modal-pause";
    this.pauseModal.className = "greek-modal-box";
    this.pauseModal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      max-height: 450px;
      background: rgba(18, 14, 28, 0.98);
      padding: 12px 16px;
      display: none;
      flex-direction: column;
      gap: 7px;
      color: #dfc888;
      font-family: 'MainFont', monospace, sans-serif;
      z-index: 999000;
      pointer-events: auto;
      box-sizing: border-box;
      overflow-y: auto;
    `;

    this.pauseModal.innerHTML = `
      <div class="greek-meander-bar"></div>
      <div id="pause-title-text" style="font-size: 20px; font-weight: bold; color: #dfc888; text-align: center;">
        ${t('pauseTitle')}
      </div>
      <div class="greek-meander-bar"></div>

      <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span id="pause-label-music">${t('music')}:</span>
        <input type="range" id="pause-slider-music" min="0" max="100" value="${state.musicVolume}" style="width: 105px; accent-color: #b89855;">
      </div>
      <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span id="pause-label-sounds">${t('sounds')}:</span>
        <input type="range" id="pause-slider-sound" min="0" max="100" value="${state.soundVolume}" style="width: 105px; accent-color: #b89855;">
      </div>
      <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span id="pause-label-fullscreen">${t('fullscreen')}:</span>
        <input type="checkbox" id="pause-checkbox-fullscreen" ${document.fullscreenElement ? 'checked' : ''}>
      </div>
      <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span id="pause-label-controls">${t('controls')}:</span>
        <select id="pause-select-controls" style="
          background: rgba(28, 20, 32, 0.95);
          color: #dfc888;
          border: 1.5px solid #b89855;
          padding: 3px 6px;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 13px;
          font-weight: bold;
          border-radius: 3px;
        ">
          <option value="keyboard" ${state.controlType === 'keyboard' ? 'selected' : ''}>${t('keyboardControls')}</option>
          <option value="touch" ${state.controlType === 'touch' ? 'selected' : ''}>${t('touchControls')}</option>
        </select>
      </div>
      <div style="font-size: 14px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
        <span id="pause-label-lang">${t('language')}:</span>
        <select id="pause-select-lang" style="
          background: rgba(28, 20, 32, 0.95);
          color: #dfc888;
          border: 1.5px solid #b89855;
          padding: 3px 6px;
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 13px;
          font-weight: bold;
          border-radius: 3px;
        ">
          <option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option>
          <option value="be" ${state.language === 'be' ? 'selected' : ''}>Беларуская</option>
          <option value="uk" ${state.language === 'uk' ? 'selected' : ''}>Українська</option>
          <option value="ru" ${state.language === 'ru' ? 'selected' : ''}>Русский</option>
        </select>
      </div>
      <div class="greek-meander-bar"></div>
      <button id="btn-pause-resume" class="menu-btn" style="padding: 6px; font-size: 15px;">${t('resume')}</button>
      <button id="btn-pause-returntown" class="menu-btn" style="padding: 6px; font-size: 15px; display: none;">${t('promptReturnCity')}</button>
      <button id="btn-pause-mainmenu" class="menu-btn" style="padding: 6px; font-size: 15px;">${t('mainMenu')}</button>
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.pauseModal);

    this.bindPauseEvents();
  }

  bindPauseEvents() {
    const btnResume = this.pauseModal.querySelector("#btn-pause-resume");
    const btnReturnTown = this.pauseModal.querySelector("#btn-pause-returntown");
    const btnMainMenu = this.pauseModal.querySelector("#btn-pause-mainmenu");
    const selectLang = this.pauseModal.querySelector("#pause-select-lang");
    const selectControls = this.pauseModal.querySelector("#pause-select-controls");
    const pauseCheckboxFullscreen = this.pauseModal.querySelector("#pause-checkbox-fullscreen");
    const sliderMusic = this.pauseModal.querySelector("#pause-slider-music");
    const sliderSound = this.pauseModal.querySelector("#pause-slider-sound");

    if (btnResume) {
      btnResume.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.hidePauseMenu();
      });
    }

    if (btnReturnTown) {
      btnReturnTown.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.hidePauseMenu();
        const activeScene = window.gameApp?.currentScene;
        if (activeScene && typeof activeScene.recordRunSummary === 'function') {
          activeScene.recordRunSummary();
        }
        if (this.appManager) {
          this.appManager.switchScene("City");
        }
      });
    }

    if (btnMainMenu) {
      btnMainMenu.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.hidePauseMenu();
        if (this.appManager) {
          this.appManager.switchScene("MainMenu");
        }
      });
    }

    if (sliderMusic) {
      sliderMusic.addEventListener("input", (e) => {
        state.musicVolume = parseInt(e.target.value);
        audio.updateVolumes();
        saveState();
      });
    }

    if (sliderSound) {
      sliderSound.addEventListener("input", (e) => {
        state.soundVolume = parseInt(e.target.value);
        saveState();
      });
    }

    if (selectLang) {
      selectLang.addEventListener("change", (e) => {
        state.language = e.target.value;
        saveState();
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.updatePauseTexts();
        if (this.hud) this.hud.updateHUD();
      });
    }

    if (selectControls) {
      selectControls.addEventListener("change", (e) => {
        state.controlType = e.target.value;
        saveState();
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.updateTutorialModalText();
        if (this.hud) this.hud.updateHUD();
      });
    }

    if (pauseCheckboxFullscreen) {
      pauseCheckboxFullscreen.addEventListener("change", (e) => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        if (e.target.checked) {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          }
        } else {
          if (document.exitFullscreen && document.fullscreenElement) {
            document.exitFullscreen().catch(() => {});
          }
        }
      });
    }
  }

  updatePauseTexts() {
    if (!this.pauseModal) return;
    const title = this.pauseModal.querySelector("#pause-title-text");
    const labelMusic = this.pauseModal.querySelector("#pause-label-music");
    const labelSounds = this.pauseModal.querySelector("#pause-label-sounds");
    const labelLang = this.pauseModal.querySelector("#pause-label-lang");
    const labelControls = this.pauseModal.querySelector("#pause-label-controls");
    const labelFullscreen = this.pauseModal.querySelector("#pause-label-fullscreen");
    const btnResume = this.pauseModal.querySelector("#btn-pause-resume");
    const btnReturnTown = this.pauseModal.querySelector("#btn-pause-returntown");
    const btnMainMenu = this.pauseModal.querySelector("#btn-pause-mainmenu");

    if (title) title.innerText = t('pauseTitle');
    if (labelMusic) labelMusic.innerText = `${t('music')}:`;
    if (labelSounds) labelSounds.innerText = `${t('sounds')}:`;
    if (labelLang) labelLang.innerText = `${t('language')}:`;
    if (labelControls) labelControls.innerText = `${t('controls')}:`;
    if (labelFullscreen) labelFullscreen.innerText = `${t('fullscreen')}:`;
    if (btnResume) btnResume.innerText = t('resume');
    if (btnReturnTown) btnReturnTown.innerText = t('promptReturnCity');
    if (btnMainMenu) btnMainMenu.innerText = t('mainMenu');

    // Кнопка возврата в город отображается в паузе Башни, если игрок еще не взлетел (!hasTakenOff)
    if (btnReturnTown) {
      const activeScene = window.gameApp?.currentScene;
      const isTower = state.currentScene === "Tower";
      const isGround = activeScene && !activeScene.hasTakenOff;

      btnReturnTown.style.display = (isTower && isGround) ? "block" : "none";
    }
  }

  togglePauseMenu(appManager = null) {
    if (appManager) this.appManager = appManager;
    if (state.isPaused) {
      this.hidePauseMenu();
    } else {
      this.showPauseMenu();
    }
  }

  showPauseMenu() {
    state.isPaused = true;
    this.initPauseModal();
    this.updatePauseTexts();
    const pauseCheckboxFullscreen = this.pauseModal ? this.pauseModal.querySelector("#pause-checkbox-fullscreen") : null;
    if (pauseCheckboxFullscreen) {
      pauseCheckboxFullscreen.checked = !!document.fullscreenElement;
    }
    if (this.pauseModal) {
      this.pauseModal.style.display = "flex";
    }
    if (this.hud) this.hud.updateHUD();
  }

  hidePauseMenu() {
    state.isPaused = false;
    if (this.pauseModal) {
      this.pauseModal.style.display = "none";
    }
    if (this.hud) this.hud.updateHUD();
  }

  initTutorialModal() {
    if (this.tutorialModal) return;

    this.tutorialModal = document.createElement("div");
    this.tutorialModal.id = "modal-tutorial";
    this.tutorialModal.className = "greek-modal-box";
    this.tutorialModal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      background: rgba(18, 14, 28, 0.96);
      padding: 16px 18px;
      display: none;
      flex-direction: column;
      gap: 12px;
      color: #dfc888;
      font-family: 'MainFont', monospace, sans-serif;
      z-index: 999500;
      pointer-events: auto;
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.tutorialModal);

    this.updateTutorialModalText();
  }

  updateTutorialModalText() {
    if (!this.tutorialModal) return;

    // Автоматическая адаптация гайда под тип управления (Сенсорный экран / Клавиатура)
    const isTouch = state.controlType === 'touch';
    const cityText = isTouch ? t('tutorialCityTextTouch') : t('tutorialCityText');
    const towerText = isTouch ? t('tutorialTowerTextTouch') : t('tutorialTowerText');

    this.tutorialModal.innerHTML = `
      <div class="greek-meander-bar"></div>
      <div id="tutorial-title-text" style="font-size: 22px; font-weight: bold; color: #dfc888; text-align: center;">
        ${t('tutorialTitle')}
      </div>
      <div class="greek-meander-bar"></div>

      <div style="display: flex; gap: 12px; justify-content: space-between;">
        <div style="
          flex: 1;
          background: rgba(28, 20, 32, 0.85);
          border: 1.5px solid #b89855;
          border-radius: 4px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        ">
          <div style="
            width: 48px; height: 48px;
            background-color: #e2c89b;
            mask-image: url('assets/player/walk_anim9.png');
            -webkit-mask-image: url('assets/player/walk_anim9.png');
            mask-size: contain; -webkit-mask-size: contain;
            mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
            mask-position: center; -webkit-mask-position: center;
            image-rendering: pixelated;
          "></div>
          <div style="font-size: 15px; font-weight: bold; color: #ffd54f;">${t('tutorialCityTitle')}</div>
          <div style="font-size: 13px; color: #dfc888; line-height: 1.3;">${cityText}</div>
        </div>

        <div style="
          flex: 1;
          background: rgba(28, 20, 32, 0.85);
          border: 1.5px solid #b89855;
          border-radius: 4px;
          padding: 10px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          text-align: center;
        ">
          <div style="position: relative; width: 48px; height: 48px;">
            <div style="
              position: absolute; inset: 0;
              background-color: #e2c89b;
              mask-image: url('assets/wings/wooden_wings1.png');
              -webkit-mask-image: url('assets/wings/wooden_wings1.png');
              mask-size: contain; -webkit-mask-size: contain;
              mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
              mask-position: center; -webkit-mask-position: center;
              image-rendering: pixelated;
            "></div>
            <div style="
              position: absolute; inset: 0;
              background-color: #e2c89b;
              mask-image: url('assets/player/idle_anim5.png');
              -webkit-mask-image: url('assets/player/idle_anim5.png');
              mask-size: contain; -webkit-mask-size: contain;
              mask-repeat: no-repeat; -webkit-mask-repeat: no-repeat;
              mask-position: center; -webkit-mask-position: center;
              image-rendering: pixelated;
            "></div>
          </div>
          <div style="font-size: 15px; font-weight: bold; color: #ffd54f;">${t('tutorialTowerTitle')}</div>
          <div style="font-size: 13px; color: #dfc888; line-height: 1.3;">${towerText}</div>
        </div>
      </div>

      <div class="greek-meander-bar"></div>
      <button id="btn-tutorial-close" class="menu-btn" style="padding: 8px; font-size: 16px;">${t('tutorialBtn')}</button>
    `;

    const btnClose = this.tutorialModal.querySelector("#btn-tutorial-close");
    if (btnClose) {
      btnClose.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.hideTutorialModal();
      });
    }
  }

  showTutorialModal() {
    this.initTutorialModal();
    if (this.tutorialModal) {
      this.updateTutorialModalText();
      this.tutorialModal.style.display = "flex";
      state.interactingWithUI = true;
    }
    if (this.hud) this.hud.updateHUD();
  }

  hideTutorialModal() {
    if (this.tutorialModal) {
      this.tutorialModal.style.display = "none";
      state.interactingWithUI = false;
    }
    if (this.hud) this.hud.updateHUD();
  }

  initRunSummaryModal() {
    if (this.summaryModal) return;

    this.summaryModal = document.createElement("div");
    this.summaryModal.id = "modal-summary";
    this.summaryModal.className = "greek-modal-box";
    this.summaryModal.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 440px;
      background: rgba(18, 14, 28, 0.96);
      padding: 16px 18px;
      display: none;
      flex-direction: column;
      gap: 12px;
      color: #dfc888;
      font-family: 'MainFont', monospace, sans-serif;
      z-index: 999600;
      pointer-events: auto;
      box-sizing: border-box;
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.summaryModal);
  }

  showRunSummary(summaryData) {
    if (!summaryData) return;
    this.initRunSummaryModal();

    state.interactingWithUI = true;
    audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 70);

    const distTarget = summaryData.distance || 0;
    const timeTarget = summaryData.time || 0;
    const items = summaryData.items || {};
    const itemKeys = Object.keys(items);

    const minutes = Math.floor(timeTarget / 60);
    const seconds = Math.floor(timeTarget % 60);
    const timeFormatted = `${minsFormatted(minutes)}:${secsFormatted(seconds)}`;

    function minsFormatted(m) { return m < 10 ? '0' + m : '' + m; }
    function secsFormatted(s) { return s < 10 ? '0' + s : '' + s; }

    let lootHTML = "";
    if (itemKeys.length === 0) {
      lootHTML = `
        <div style="
          width: 100%;
          padding: 12px;
          background: rgba(28, 20, 32, 0.85);
          border: 1.5px solid #523a1a;
          border-radius: 4px;
          text-align: center;
          font-style: italic;
          color: #a08c6a;
          font-size: 14px;
        ">${t('nothingCollected')}</div>
      `;
    } else {
      lootHTML = `<div style="display: flex; flex-wrap: wrap; gap: 8px; width: 100%; justify-content: center;">`;
      itemKeys.forEach((key, idx) => {
        const count = items[key];
        const itemMeta = ITEM_DATA[key] || { key, icon: "assets/items/bag.png" };
        const localizedName = t(itemMeta.key) || key;

        lootHTML += `
          <div style="
            background: rgba(28, 20, 32, 0.9);
            border: 1.5px solid #b89855;
            border-radius: 4px;
            padding: 6px 10px;
            display: flex;
            align-items: center;
            gap: 8px;
            min-width: 110px;
            box-shadow: 2px 2px 0px rgba(0,0,0,0.6);
            animation: summaryItemSlide 0.35s ease forwards;
            animation-delay: ${idx * 0.08}s;
            opacity: 0;
          ">
            <div style="
              width: 24px; height: 24px;
              background-image: url('${itemMeta.icon}');
              background-size: contain;
              background-repeat: no-repeat;
              background-position: center;
              filter: drop-shadow(1px 1px 0px rgba(0,0,0,0.5));
            "></div>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 12px; color: #dfc888; font-weight: bold; line-height: 1.1;">${localizedName}</span>
              <span style="font-size: 14px; color: #ffd54f; font-weight: bold;">+${count}</span>
            </div>
          </div>
        `;
      });
      lootHTML += `</div>`;
    }

    this.summaryModal.innerHTML = `
      <div class="greek-meander-bar"></div>
      <div style="font-size: 22px; font-weight: bold; color: #ffd54f; text-align: center; text-shadow: 2px 2px 0px #180e1c;">
        ${t('runSummaryTitle')}
      </div>
      <div class="greek-meander-bar"></div>

      <div style="display: flex; gap: 10px; width: 100%; justify-content: space-between;">
        <div style="
          flex: 1;
          background: rgba(28, 20, 32, 0.9);
          border: 1.5px solid #b89855;
          border-radius: 4px;
          padding: 10px;
          text-align: center;
          box-shadow: 2px 2px 0px rgba(0,0,0,0.5);
        ">
          <div style="font-size: 13px; color: #a08c6a; font-weight: bold; text-transform: uppercase;">${t('summaryDistance')}</div>
          <div id="summary-dist-val" style="font-size: 22px; color: #ffffff; font-weight: bold; margin-top: 4px; text-shadow: 1px 1px 0px #000;">0 m</div>
        </div>

        <div style="
          flex: 1;
          background: rgba(28, 20, 32, 0.9);
          border: 1.5px solid #b89855;
          border-radius: 4px;
          padding: 10px;
          text-align: center;
          box-shadow: 2px 2px 0px rgba(0,0,0,0.5);
        ">
          <div style="font-size: 13px; color: #a08c6a; font-weight: bold; text-transform: uppercase;">${t('summaryTime')}</div>
          <div id="summary-time-val" style="font-size: 22px; color: #ffffff; font-weight: bold; margin-top: 4px; text-shadow: 1px 1px 0px #000;">00:00</div>
        </div>
      </div>

      <div style="font-size: 15px; font-weight: bold; color: #dfc888; text-align: center; margin-top: 2px; text-transform: uppercase; letter-spacing: 1px;">
        ${t('summaryLoot')}
      </div>

      ${lootHTML}

      <div class="greek-meander-bar"></div>
      <button id="btn-summary-continue" class="menu-btn" style="padding: 8px; font-size: 16px;">${t('continueBtn')}</button>
    `;

    this.summaryModal.style.animation = "summaryPopIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards";
    this.summaryModal.style.display = "flex";

    if (this.hud) this.hud.updateHUD();

    const btnContinue = this.summaryModal.querySelector("#btn-summary-continue");
    if (btnContinue) {
      btnContinue.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.hideRunSummaryModal();
      });
    }

    const distElem = this.summaryModal.querySelector("#summary-dist-val");
    const timeElem = this.summaryModal.querySelector("#summary-time-val");

    const startTime = performance.now();
    const duration = 750;

    const animateNumbers = (now) => {
      const elapsed = Math.min(duration, now - startTime);
      const progress = elapsed / duration;
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const currentDist = Math.round(distTarget * easeProgress);
      const currentTimeSec = timeTarget * easeProgress;
      const curMins = Math.floor(currentTimeSec / 60);
      const curSecs = Math.floor(currentTimeSec % 60);

      if (distElem) distElem.innerText = `${currentDist} m`;
      if (timeElem) timeElem.innerText = `${curMins < 10 ? '0' + curMins : curMins}:${curSecs < 10 ? '0' + curSecs : curSecs}`;

      if (elapsed < duration) {
        requestAnimationFrame(animateNumbers);
      } else {
        if (distElem) distElem.innerText = `${distTarget} m`;
        if (timeElem) timeElem.innerText = timeFormatted;
      }
    };

    requestAnimationFrame(animateNumbers);
  }

  hideRunSummaryModal() {
    if (this.summaryModal) {
      this.summaryModal.style.display = "none";
      state.interactingWithUI = false;
    }
    if (this.hud) this.hud.updateHUD();
  }

  initLoadingScreen() {
    this.loadingOverlay = document.createElement("div");
    this.loadingOverlay.id = "loading-screen-overlay";
    this.loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: #000000;
      z-index: 999999;
      display: none;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      opacity: 0;
      pointer-events: all;
    `;

    this.loadingCharacter = document.createElement("div");
    this.loadingCharacter.style.cssText = `
      width: 96px;
      height: 96px;
      background-color: #e2c89b;
      mask-size: contain;
      -webkit-mask-size: contain;
      mask-repeat: no-repeat;
      -webkit-mask-repeat: no-repeat;
      mask-position: center;
      -webkit-mask-position: center;
      image-rendering: pixelated;
    `;

    this.loadingText = document.createElement("div");
    this.loadingText.style.cssText = `
      margin-top: 22px;
      color: #e2c89b;
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 24px;
      font-weight: bold;
      line-height: 1.4;
      letter-spacing: 2px;
      text-transform: uppercase;
      text-align: center;
      max-width: 85%;
    `;
    this.loadingText.innerText = t('loading');

    this.loadingOverlay.appendChild(this.loadingCharacter);
    this.loadingOverlay.appendChild(this.loadingText);
    document.body.appendChild(this.loadingOverlay);

    this.loadingWalkFrames = [
      "assets/player/walk_anim9.png",
      "assets/player/walk_anim10.png",
      "assets/player/walk_anim11.png",
      "assets/player/walk_anim12.png",
      "assets/player/walk_anim13.png",
      "assets/player/walk_anim14.png",
      "assets/player/walk_anim15.png",
      "assets/player/walk_anim16.png"
    ];
    this.loadingAnimInterval = null;
    this.loadingTextInterval = null;
  }

  showLoadingScreen(customText = null, isFalling = false, isRising = false) {
    if (!this.loadingOverlay) return;

    this.customLoadingText = customText;

    const isCleanBlackTransition = customText === "" && !isFalling && !isRising;

    if (this.loadingText) {
      if (isCleanBlackTransition) {
        this.loadingText.style.display = "none";
      } else {
        this.loadingText.style.display = "block";
        this.loadingText.innerText = customText !== null ? customText : t('loading');
      }
    }

    if (this.loadingCharacter) {
      if (isCleanBlackTransition) {
        this.loadingCharacter.style.display = "none";
      } else {
        this.loadingCharacter.style.display = "block";
        if (isRising) {
          this.loadingCharacter.style.animation = "flyingRiseAnim 1.1s ease-in-out infinite alternate";
        } else {
          this.loadingCharacter.style.animation = "none";
        }
      }
    }

    this.loadingOverlay.style.transition = "none";
    this.loadingOverlay.style.display = "flex";
    this.loadingOverlay.style.opacity = "1";
    void this.loadingOverlay.offsetWidth;

    if (!isCleanBlackTransition) {
      const animFrames = isRising
        ? ["assets/player/flop_anim1.png", "assets/player/flop_anim2.png", "assets/player/flop_anim3.png"]
        : this.loadingWalkFrames;

      let frameIndex = 0;
      if (this.loadingAnimInterval) clearInterval(this.loadingAnimInterval);
      this.loadingAnimInterval = setInterval(() => {
        if (this.loadingCharacter) {
          const frameUrl = `url('${animFrames[frameIndex]}')`;
          this.loadingCharacter.style.maskImage = frameUrl;
          this.loadingCharacter.style.webkitMaskImage = frameUrl;
        }
        frameIndex = (frameIndex + 1) % animFrames.length;
      }, 110);

      let textDots = 0;
      if (this.loadingTextInterval) clearInterval(this.loadingTextInterval);
      this.loadingTextInterval = setInterval(() => {
        if (this.customLoadingText !== null) {
          if (this.loadingText) this.loadingText.innerText = this.customLoadingText;
          return;
        }
        textDots = (textDots + 1) % 4;
        const dotsStr = ".".repeat(textDots);
        const rawLoading = t('loading').replace(/\.+$/, '');
        if (this.loadingText) {
          this.loadingText.innerText = `${rawLoading}${dotsStr}`;
        }
      }, 280);
    }
  }

  hideLoadingScreen() {
    if (this.blackScreen) {
      this.blackScreen.style.transition = "opacity 0.3s ease";
      this.blackScreen.style.opacity = "0";
    }
    if (!this.loadingOverlay) return;

    this.loadingOverlay.style.transition = "opacity 0.35s ease";
    this.loadingOverlay.style.opacity = "0";
    setTimeout(() => {
      if (this.loadingOverlay) {
        this.loadingOverlay.style.display = "none";
      }
      if (this.loadingAnimInterval) {
        clearInterval(this.loadingAnimInterval);
        this.loadingAnimInterval = null;
      }
      if (this.loadingTextInterval) {
        clearInterval(this.loadingTextInterval);
        this.loadingTextInterval = null;
      }
      if (this.loadingCharacter) {
        this.loadingCharacter.style.animation = "none";
        this.loadingCharacter.style.display = "block";
      }
      if (this.loadingText) {
        this.loadingText.style.display = "block";
      }
      this.customLoadingText = null;
    }, 350);
  }

  fadeInBlackScreen(durationMs = 500, callback = null) {
    if (!this.blackScreen) return;
    this.blackScreen.style.transition = `opacity ${durationMs / 1000}s ease`;
    this.blackScreen.style.opacity = "1";

    setTimeout(() => {
      if (callback) callback();
      this.fadeOutBlackScreen(durationMs);
    }, durationMs);
  }

  fadeOutBlackScreen(durationMs = 500) {
    if (!this.blackScreen) return;
    this.blackScreen.style.transition = `opacity ${durationMs / 1000}s ease`;
    this.blackScreen.style.opacity = "0";
  }
}