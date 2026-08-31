
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { PosterizePass } from './shaders/posterizePass.js';
import { LanguageSelectScene } from './scenes/languageSelectScene.js';
import { MainMenuScene } from './scenes/mainMenuScene.js';
import { CutsceneScene } from './scenes/cutsceneScene.js';
import { CityScene } from './scenes/cityScene.js';
import { TowerScene } from './scenes/towerScene.js';
import { input } from './input.js';
import { state, debugUnlockAll } from './state.js';
import { ui } from './ui.js';

const RENDER_WIDTH = 640;
const RENDER_HEIGHT = 480;

class GameApp {
  constructor() {
    this.container = document.getElementById('canvasArea');

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      powerPreference: "high-performance"
    });
    this.renderer.setSize(RENDER_WIDTH, RENDER_HEIGHT, false);
    this.renderer.setPixelRatio(1);
    
    this.renderer.toneMapping = THREE.LinearToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.setSize(RENDER_WIDTH, RENDER_HEIGHT);
    this.renderPass = null;
    this.outputPass = null;
    this.posterizePass = new PosterizePass(50.0);

    this.currentScene = null;
    this.clock = new THREE.Clock();

    window.gameApp = this;

    this.initViewportScaling();
    this.initDebugLauncherUI();

    const initialScene = state.hasSelectedInitialSettings ? "MainMenu" : "LanguageSelect";
    this.switchScene(initialScene);

    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  initViewportScaling() {
    const resizeViewport = () => {
      const viewport = document.getElementById('game-viewport');
      if (!viewport) return;
      const scale = Math.min(window.innerWidth / RENDER_WIDTH, window.innerHeight / RENDER_HEIGHT);
      viewport.style.transform = `translate(-50%, -50%) scale(${scale})`;
      viewport.style.position = 'absolute';
      viewport.style.left = '50%';
      viewport.style.top = '50%';
    };

    window.addEventListener('resize', resizeViewport);
    resizeViewport();
  }

  // Панель отладки для запуска любых катсцен и сцен (вызывается по F2 или O)
  initDebugLauncherUI() {
    const viewport = document.getElementById('game-viewport') || document.body;

    this.debugLauncherOverlay = document.createElement("div");
    this.debugLauncherOverlay.id = "debug-scene-launcher";
    this.debugLauncherOverlay.className = "greek-modal-box";
    this.debugLauncherOverlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 320px;
      background: rgba(14, 10, 22, 0.98);
      padding: 16px 18px;
      display: none;
      flex-direction: column;
      gap: 10px;
      color: #dfc888;
      font-family: 'MainFont', monospace, sans-serif;
      z-index: 999999;
      pointer-events: auto;
      box-shadow: 0 0 30px rgba(0,0,0,0.95);
    `;

    this.debugLauncherOverlay.innerHTML = `
      <div class="greek-meander-bar"></div>
      <div style="font-size: 20px; font-weight: bold; color: #ffd54f; text-align: center; text-transform: uppercase;">
        DEBUG SCENE LAUNCHER
      </div>
      <div class="greek-meander-bar"></div>

      <div style="display: flex; flex-direction: column; gap: 8px; width: 100%;">
        <button class="menu-btn debug-launch-btn" data-scene="MainCutscene" style="padding: 8px; font-size: 15px;">Intro Cutscene [9]</button>
        <button class="menu-btn debug-launch-btn" data-scene="EndingCutscene" style="padding: 8px; font-size: 15px;">Ending Cutscene [0]</button>
        <button class="menu-btn debug-launch-btn" data-scene="City" style="padding: 8px; font-size: 15px;">City Scene [1]</button>
        <button class="menu-btn debug-launch-btn" data-scene="Tower" style="padding: 8px; font-size: 15px;">Tower Scene [2]</button>
        <button class="menu-btn debug-launch-btn" data-scene="MainMenu" style="padding: 8px; font-size: 15px;">Main Menu [4]</button>
        <button class="menu-btn debug-launch-btn" data-scene="LanguageSelect" style="padding: 8px; font-size: 15px;">Language Select [3]</button>
      </div>

      <div class="greek-meander-bar"></div>
      <button id="btn-close-debug-launcher" class="menu-btn" style="padding: 6px; font-size: 14px;">CLOSE [F2 / O]</button>
    `;

    viewport.appendChild(this.debugLauncherOverlay);

    const buttons = this.debugLauncherOverlay.querySelectorAll(".debug-launch-btn");
    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const scene = btn.getAttribute("data-scene");
        this.hideDebugLauncher();
        this.switchScene(scene);
      });
    });

    const btnClose = this.debugLauncherOverlay.querySelector("#btn-close-debug-launcher");
    if (btnClose) {
      btnClose.addEventListener("click", () => this.hideDebugLauncher());
    }
  }

  toggleDebugLauncher() {
    if (!this.debugLauncherOverlay) return;
    if (this.debugLauncherOverlay.style.display === "flex") {
      this.hideDebugLauncher();
    } else {
      this.showDebugLauncher();
    }
  }

  showDebugLauncher() {
    if (this.debugLauncherOverlay) {
      this.debugLauncherOverlay.style.display = "flex";
      state.interactingWithUI = true;
    }
  }

  hideDebugLauncher() {
    if (this.debugLauncherOverlay) {
      this.debugLauncherOverlay.style.display = "none";
      state.interactingWithUI = false;
    }
  }

  async switchScene(sceneName, customLoadingText = null, isFalling = false, isRising = false) {
    const currentName = this.currentScene ? this.currentScene.constructor.name : "";
    const isLangTransition = (currentName === "LanguageSelectScene" && sceneName === "MainMenu") || sceneName === "LanguageSelect";

    if (!isLangTransition) {
      ui.showLoadingScreen(customLoadingText, isFalling, isRising);
      await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50)));
    }

    if (this.currentScene) {
      this.currentScene.destroy();
      this.currentScene = null;
    }

    let newScene = null;
    switch (sceneName) {
      case "LanguageSelect":
        newScene = new LanguageSelectScene(this.renderer, this);
        break;
      case "MainMenu":
        newScene = new MainMenuScene(this.renderer, this);
        break;
      case "MainCutscene":
      case "Cutscene":
        newScene = new CutsceneScene(this.renderer, this, false);
        break;
      case "City":
        newScene = new CityScene(this.renderer, this);
        break;
      case "Tower":
        newScene = new TowerScene(this.renderer, this);
        break;
      case "EndingCutscene":
        newScene = new CutsceneScene(this.renderer, this, true);
        break;
      default:
        newScene = new LanguageSelectScene(this.renderer, this);
    }

    this.currentScene = newScene;
    await this.currentScene.init();

    this.composer.passes = [];
    this.renderPass = new RenderPass(this.currentScene.scene, this.currentScene.camera);
    this.outputPass = new OutputPass();

    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.posterizePass.getPass());
    this.composer.addPass(this.outputPass);

    this.composer.render();

    if (!isLangTransition) {
      await new Promise(resolve => setTimeout(resolve, 800));
      ui.hideLoadingScreen();
    }
  }

  animate() {
    requestAnimationFrame(this.animate);

    // Горячие клавиши отладки: F2 / KeyO — вызвать Debug Scene Launcher
    if (input.isKeyJustPressed("F2") || input.isKeyJustPressed("o")) {
      this.toggleDebugLauncher();
    }

    // Быстрый запуск катсцен по клавишам [9] и [0]
    if (input.isKeyJustPressed("9")) {
      this.switchScene("MainCutscene");
    } else if (input.isKeyJustPressed("0")) {
      this.switchScene("EndingCutscene");
    }

    // Открытие паузы заблокировано в Главном меню и выборе языка
    if (input.isKeyJustPressed("escape") || input.isKeyJustPressed("p")) {
      if (state.currentScene !== "LanguageSelect" && state.currentScene !== "MainMenu") {
        ui.togglePauseMenu(this);
      }
    }

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (this.currentScene && !state.isPaused) {
      this.currentScene.update(delta);
    }

    if (input.isKeyJustPressed("f")) {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      }
    }

    if (this.currentScene) {
      this.composer.render();
    }

    input.endFrame();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});