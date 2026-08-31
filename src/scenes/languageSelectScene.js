import * as THREE from 'three';
import { BaseScene } from './baseScene.js';
import { VolumetricSky } from '../shaders/skyShader.js';
import { audio } from '../audio.js';
import { state, saveState } from '../state.js';
import { ui } from '../ui.js';
import { t } from '../localization.js';

export class LanguageSelectScene extends BaseScene {
  constructor(renderer, manager) {
    super(renderer, manager);
    this.sky = null;
    this.overlayElement = null;
    this.langBox = null;
    this.controlBox = null;
  }

  async init() {
    state.currentScene = "LanguageSelect";
    this.sky = new VolumetricSky(this.scene);
    audio.playMusicOnChannel("Damiano Baldoni - A Long Story.mp3", 19, true, 40);

    this.createUI();
    ui.updateHUD();
  }

  createUI() {
    this.overlayElement = document.createElement("div");
    this.overlayElement.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      pointer-events: none;
      z-index: 20000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: rgba(14, 8, 12, 0.85);
    `;

    this.overlayElement.innerHTML = `
      <!-- Окно 1: Выбор языка -->
      <div id="lang-modal-box" class="greek-modal-box" style="
        pointer-events: auto;
        width: 320px;
        background: rgba(18, 14, 28, 0.96);
        padding: 22px 20px;
        display: flex;
        flex-direction: column;
        gap: 14px;
        align-items: center;
        box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
      ">
        <div class="greek-meander-bar"></div>

        <div style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 20px;
          font-weight: bold;
          color: #dfc888;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-shadow: 2px 2px 0px #000;
          text-align: center;
          line-height: 1.3;
        ">
          SELECT LANGUAGE<br/>ВЫБЕРИТЕ ЯЗЫК
        </div>

        <div class="greek-meander-bar"></div>

        <div style="
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        ">
          <button class="lang-select-btn menu-btn" data-lang="en" style="padding: 10px; font-size: 18px;">English</button>
          <button class="lang-select-btn menu-btn" data-lang="be" style="padding: 10px; font-size: 18px;">Беларуская</button>
          <button class="lang-select-btn menu-btn" data-lang="uk" style="padding: 10px; font-size: 18px;">Українська</button>
          <button class="lang-select-btn menu-btn" data-lang="ru" style="padding: 10px; font-size: 18px;">Русский</button>
        </div>

        <div class="greek-meander-bar"></div>
      </div>

      <!-- Окно 2: Выбор управления -->
      <div id="control-modal-box" class="greek-modal-box" style="
        pointer-events: auto;
        width: 340px;
        background: rgba(18, 14, 28, 0.96);
        padding: 22px 20px;
        display: none;
        flex-direction: column;
        gap: 14px;
        align-items: center;
        box-shadow: 0 0 25px rgba(0, 0, 0, 0.9);
      ">
        <div class="greek-meander-bar"></div>

        <div id="control-title-text" style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 20px;
          font-weight: bold;
          color: #dfc888;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          text-shadow: 2px 2px 0px #000;
          text-align: center;
          line-height: 1.3;
        ">
          ${t('selectControls')}
        </div>

        <div class="greek-meander-bar"></div>

        <div style="
          display: flex;
          flex-direction: column;
          gap: 10px;
          width: 100%;
        ">
          <button class="control-select-btn menu-btn" data-control="keyboard" style="padding: 10px; font-size: 16px;">
            ${t('keyboardControls')}
          </button>
          <button class="control-select-btn menu-btn" data-control="touch" style="padding: 10px; font-size: 16px;">
            ${t('touchControls')}
          </button>
        </div>

        <div class="greek-meander-bar"></div>
      </div>
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.overlayElement);

    this.langBox = this.overlayElement.querySelector("#lang-modal-box");
    this.controlBox = this.overlayElement.querySelector("#control-modal-box");

    const langButtons = this.overlayElement.querySelectorAll(".lang-select-btn");
    langButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const lang = btn.getAttribute("data-lang");
        state.language = lang;
        saveState();
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);

        if (this.langBox) this.langBox.style.display = "none";
        if (this.controlBox) {
          const title = this.controlBox.querySelector("#control-title-text");
          if (title) title.innerText = t('selectControls');

          const ctrlBtns = this.controlBox.querySelectorAll(".control-select-btn");
          if (ctrlBtns[0]) ctrlBtns[0].innerText = t('keyboardControls');
          if (ctrlBtns[1]) ctrlBtns[1].innerText = t('touchControls');

          this.controlBox.style.display = "flex";
        }
      });
    });

    const controlButtons = this.overlayElement.querySelectorAll(".control-select-btn");
    controlButtons.forEach(btn => {
      btn.addEventListener("click", () => {
        const ctrlType = btn.getAttribute("data-control");
        state.controlType = ctrlType;
        state.hasSelectedInitialSettings = true;
        saveState();

        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.manager.switchScene("MainMenu");
      });
    });
  }

  update(delta) {
    super.update(delta);
    if (this.sky) {
      this.sky.update(this.camera, delta, 0);
    }
  }

  destroy() {
    super.destroy();
    if (this.sky) {
      this.sky.destroy();
      this.sky = null;
    }
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }
}