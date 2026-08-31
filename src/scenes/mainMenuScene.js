

import * as THREE from 'three';
import { BaseScene } from './baseScene.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { VolumetricSky } from '../shaders/skyShader.js';
import { audio } from '../audio.js';
import { state, clearSave, saveState } from '../state.js';
import { ui } from '../ui.js';
import { t } from '../localization.js';

const loader = new GLTFLoader();

export class MainMenuScene extends BaseScene {
  constructor(renderer, manager) {
    super(renderer, manager);

    this.sky = null;
    this.towerGroup = null;
    this.menuAngle = 0;

    this.ambientLight = null;
    this.hemiLight = null;
    this.dirLight = null;
    this.dirLightTarget = null;
    this.lightOffset = new THREE.Vector3(250, 450, 650);

    this.overlayElement = null;
    this.settingsModal = null;
    this.creditsModal = null;
  }

  setupLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffe8d6, 1.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x4a3b52, 1.0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;

    const d = 3000;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 8000;
    this.dirLight.shadow.bias = -0.0001;
    this.dirLight.shadow.normalBias = 0.08;

    this.dirLightTarget = new THREE.Object3D();
    this.dirLightTarget.position.set(0, 100, 27350);
    this.scene.add(this.dirLightTarget);

    this.dirLight.position.set(-400, -600, 28500);
    this.dirLight.target = this.dirLightTarget;

    this.scene.add(this.dirLight);
  }

  async init() {
    state.currentScene = "MainMenu";
    state.inDialogue = false;
    state.interactingWithUI = true;

    this.setupLighting();

    this.sky = new VolumetricSky(this.scene);

    audio.playMusicOnChannel("Damiano Baldoni - A Long Story.mp3", 19, true, 50);

    try {
      const gltf = await loader.loadAsync('assets/models/TowerV2.glb');
      const rawTowerScene = gltf.scene;

      rawTowerScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(rawTowerScene);
      const rawSize = new THREE.Vector3();
      box.getSize(rawSize);

      const chunkDepth = 5000;
      const scaleX = 455 / (rawSize.x || 1);
      const scaleY = chunkDepth / (rawSize.y || 1);
      const scaleZ = 455 / (rawSize.z || 1);

      this.towerGroup = new THREE.Group();

      const heights = [15000, 20000, 25000, 30000, 35000];
      for (const h of heights) {
        const chunk = rawTowerScene.clone();
        chunk.scale.set(scaleX, scaleY, scaleZ);
        chunk.rotation.order = 'ZYX';
        chunk.rotation.set(Math.PI / 2, 0, Math.PI);
        chunk.position.set(0, 0, h);
        this.towerGroup.add(chunk);
      }

      this.scene.add(this.towerGroup);
    } catch (e) {
      console.warn("Failed to load Tower model for Main Menu", e);
    }

    this.createMenuUI();
    ui.updateHUD();
  }

  getMainButtonText() {
    if (state.endlessUnlocked) {
      return t('endlessMode');
    }
    if (state.hasSaveData) {
      return t('continueGame');
    }
    return t('newGame');
  }

  createMenuUI() {
    this.overlayElement = document.createElement("div");
    this.overlayElement.id = "main-menu-overlay";
    this.overlayElement.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 640px;
      height: 480px;
      pointer-events: none;
      z-index: 15000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      padding: 24px 20px 20px 20px;
      box-sizing: border-box;
    `;

    this.overlayElement.innerHTML = `
      <div style="
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 38px;
        font-weight: bold;
        color: #dfc888;
        text-transform: uppercase;
        letter-spacing: 2px;
        text-shadow: 3px 3px 0px #180e1c, -2px -2px 0px #523a1a, 2px -2px 0px #523a1a, -2px 2px 0px #180e1c;
        text-align: center;
        margin-top: 5px;
        filter: drop-shadow(0 0 10px rgba(184, 152, 85, 0.6));
      ">
        ${t('gameTitle')}
      </div>

      <div style="
        pointer-events: auto;
        display: flex;
        flex-direction: column;
        gap: 14px;
        width: 250px;
        align-items: center;
      ">
        <button id="btn-menu-newgame" class="menu-btn">${this.getMainButtonText()}</button>
        <button id="btn-menu-settings" class="menu-btn">${t('settings')}</button>
        <button id="btn-menu-credits" class="menu-btn">${t('credits')}</button>
      </div>

      <div style="
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 14px;
        color: #dfc888;
        text-shadow: 1px 1px 0px #000;
        letter-spacing: 1px;
      ">
        ${t('versionText')}
      </div>

      <div id="modal-settings" class="greek-modal-box" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 320px;
        background: rgba(18, 14, 28, 0.96);
        padding: 16px 18px;
        display: none;
        flex-direction: column;
        gap: 12px;
        color: #dfc888;
        font-family: 'MainFont', monospace, sans-serif;
        z-index: 16000;
        pointer-events: auto;
      ">
        <div class="greek-meander-bar"></div>
        <div style="font-size: 22px; font-weight: bold; color: #dfc888; text-align: center;">
          ${t('settings')}
        </div>
        <div class="greek-meander-bar"></div>

        <div style="font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${t('music')}:</span>
          <input type="range" id="slider-music" min="0" max="100" value="${state.musicVolume}" style="width: 110px; accent-color: #b89855;">
        </div>
        <div style="font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${t('sounds')}:</span>
          <input type="range" id="slider-sound" min="0" max="100" value="${state.soundVolume}" style="width: 110px; accent-color: #b89855;">
        </div>
        <div style="font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${t('fullscreen')}:</span>
          <input type="checkbox" id="checkbox-fullscreen" ${document.fullscreenElement ? 'checked' : ''}>
        </div>
        <div style="font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${t('controls')}:</span>
          <select id="select-controls" style="
            background: rgba(28, 20, 32, 0.95);
            color: #dfc888;
            border: 1.5px solid #b89855;
            padding: 4px 8px;
            font-family: 'MainFont', monospace, sans-serif;
            font-size: 14px;
            font-weight: bold;
            border-radius: 3px;
          ">
            <option value="keyboard" ${state.controlType === 'keyboard' ? 'selected' : ''}>${t('keyboardControls')}</option>
            <option value="touch" ${state.controlType === 'touch' ? 'selected' : ''}>${t('touchControls')}</option>
          </select>
        </div>
        <div style="font-size: 16px; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>${t('language')}:</span>
          <select id="select-lang" style="
            background: rgba(28, 20, 32, 0.95);
            color: #dfc888;
            border: 1.5px solid #b89855;
            padding: 4px 8px;
            font-family: 'MainFont', monospace, sans-serif;
            font-size: 14px;
            font-weight: bold;
            border-radius: 3px;
          ">
            <option value="en" ${state.language === 'en' ? 'selected' : ''}>English</option>
            <option value="be" ${state.language === 'be' ? 'selected' : ''}>Беларуская</option>
            <option value="uk" ${state.language === 'uk' ? 'selected' : ''}>Українська</option>
            <option value="ru" ${state.language === 'ru' ? 'selected' : ''}>Русский</option>
          </select>
        </div>
        
        <div style="display: flex; justify-content: center; margin-top: 4px;">
          <button id="btn-menu-clearsave" class="menu-btn" style="
            padding: 6px 14px;
            font-size: 13px;
            width: 100%;
            background: rgba(183, 28, 28, 0.85);
            border-color: #ef5350;
            color: #ffffff;
          ">${t('clearSave')}</button>
        </div>

        <div class="greek-meander-bar"></div>
        <button id="btn-close-settings" class="menu-btn" style="padding: 8px; font-size: 16px;">${t('close')}</button>
      </div>

      <div id="modal-credits" class="greek-modal-box" style="
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 330px;
        background: rgba(18, 14, 28, 0.96);
        padding: 16px 18px;
        display: none;
        flex-direction: column;
        gap: 12px;
        color: #dfc888;
        font-family: 'MainFont', monospace, sans-serif;
        z-index: 16000;
        pointer-events: auto;
        text-align: center;
      ">
        <div class="greek-meander-bar"></div>
        <div style="font-size: 22px; font-weight: bold; color: #dfc888;">
          ${t('creditsTitle')}
        </div>
        <div class="greek-meander-bar"></div>

        <div style="font-size: 16px; line-height: 1.4; color: #dfc888;">
          ${t('gameCreatedBy')}<br/>
          <span style="color: #ffffff; font-size: 18px; font-weight: bold;">${t('authorsList')}</span>
        </div>
        <div style="font-size: 16px; line-height: 1.4; color: #dfc888;">
          ${t('musicBy')}<br/>
          <span style="color: #ffffff; font-size: 18px; font-weight: bold;">${t('musicianName')}</span>
        </div>
        <div style="font-size: 13px; color: #a5d6a7;">
          ${t('specialThanks')}
        </div>
        <div class="greek-meander-bar"></div>
        <button id="btn-close-credits" class="menu-btn" style="padding: 8px; font-size: 16px;">${t('close')}</button>
      </div>
    `;

    const viewport = document.getElementById("game-viewport") || document.body;
    viewport.appendChild(this.overlayElement);

    this.bindMenuEvents();
  }

  bindMenuEvents() {
    const btnNewGame = this.overlayElement.querySelector("#btn-menu-newgame");
    const btnSettings = this.overlayElement.querySelector("#btn-menu-settings");
    const btnCredits = this.overlayElement.querySelector("#btn-menu-credits");
    const btnClearSave = this.overlayElement.querySelector("#btn-menu-clearsave");

    this.settingsModal = this.overlayElement.querySelector("#modal-settings");
    this.creditsModal = this.overlayElement.querySelector("#modal-credits");

    const btnCloseSettings = this.overlayElement.querySelector("#btn-close-settings");
    const btnCloseCredits = this.overlayElement.querySelector("#btn-close-credits");
    const selectLang = this.overlayElement.querySelector("#select-lang");
    const selectControls = this.overlayElement.querySelector("#select-controls");
    const checkboxFullscreen = this.overlayElement.querySelector("#checkbox-fullscreen");
    const sliderMusic = this.overlayElement.querySelector("#slider-music");
    const sliderSound = this.overlayElement.querySelector("#slider-sound");

    if (btnNewGame) {
      btnNewGame.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        if (state.hasSaveData || state.endlessUnlocked) {
          this.manager.switchScene("City");
        } else {
          this.manager.switchScene("MainCutscene");
        }
      });
    }

    if (btnSettings) {
      btnSettings.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        if (checkboxFullscreen) {
          checkboxFullscreen.checked = !!document.fullscreenElement;
        }
        this.settingsModal.style.display = "flex";
        this.creditsModal.style.display = "none";
      });
    }

    if (btnCredits) {
      btnCredits.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.creditsModal.style.display = "flex";
        this.settingsModal.style.display = "none";
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

    if (btnClearSave) {
      btnClearSave.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        if (window.confirm(t('clearSaveConfirm'))) {
          clearSave();
          this.settingsModal.style.display = "none";
          if (btnNewGame) {
            btnNewGame.innerText = this.getMainButtonText();
          }
        }
      });
    }

    if (btnCloseSettings) {
      btnCloseSettings.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.settingsModal.style.display = "none";
      });
    }

    if (btnCloseCredits) {
      btnCloseCredits.addEventListener("click", () => {
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.creditsModal.style.display = "none";
      });
    }

    if (selectLang) {
      selectLang.addEventListener("change", (e) => {
        state.language = e.target.value;
        saveState();
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        this.manager.switchScene("MainMenu");
      });
    }

    if (selectControls) {
      selectControls.addEventListener("change", (e) => {
        state.controlType = e.target.value;
        saveState();
        audio.playSound("566196__scholzi982__press_button_01.wav", 80);
        ui.updateHUD();
      });
    }

    if (checkboxFullscreen) {
      checkboxFullscreen.addEventListener("change", (e) => {
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

  update(delta) {
    super.update(delta);

    this.menuAngle += delta * 0.2;

    const swayX = Math.sin(this.menuAngle) * 45;
    const swayY = Math.cos(this.menuAngle * 0.8) * 35;
    const swayZ = Math.sin(this.menuAngle * 0.6) * 20;

    const camX = -780 + swayX;
    const camY = -80 + swayY;
    const camZ = 27200 + swayZ;

    this.camera.position.set(camX, camY, camZ);
    this.camera.lookAt(0, 100, 27350);

    if (this.sky) {
      this.sky.update(this.camera, delta, 27200);
      if (this.hemiLight) {
        this.hemiLight.color.copy(this.sky.settings.zenithColor);
        this.hemiLight.groundColor.copy(this.sky.settings.horizonColor);
      }
      if (this.ambientLight) {
        this.ambientLight.color.copy(this.sky.settings.horizonColor);
      }
      if (this.dirLight) {
        this.dirLight.color.copy(this.sky.settings.sunColor);
      }
    }
  }

  destroy() {
    super.destroy();
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
  }
}
