
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BaseScene } from './baseScene.js';
import { Player } from '../entities/player.js';
import { BillboardSprite } from '../entities/billboardSprite.js';
import { loadAndFitGLTF } from '../utils/modelLoader.js';
import { VolumetricSky } from '../shaders/skyShader.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { state, saveState } from '../state.js';
import { ui } from '../ui.js';
import { t } from '../localization.js';

const loader = new GLTFLoader();

const INTRO_PHASES = {
  WAITING_START_CLICK: 0,
  PANNING_DOWN: 1,
  DIALOGUE_SKEPTIC: 2,
  PROMPT_FLAP: 3,
  FLAP_RISE: 4,
  COYOTE_PAUSE: 5,
  FALLING: 6,
  LANDING_STANDING: 7,
  BLACK_SCREEN_TEXT: 8,
  REST_ITEMS_FALL: 9,
  CAMERA_ZOOM_TITLE: 10,
  COMPLETED: 11
};

const ENDING_PHASES = {
  FLYING_UP: 0,
  WINGS_CATCH_FIRE: 1,
  WINGS_BURNING: 2,
  PLAYER_FALLING_CAM_RISING: 3,
  TEXT_DISPLAY: 4,
  DEVELOPER_BONUS: 5,
  COMPLETED: 6
};

export class CutsceneScene extends BaseScene {
  constructor(renderer, manager, isEnding = false) {
    super(renderer, manager);
    this.isEnding = isEnding;

    this.overlayElement = document.getElementById("cutscene-overlay");
    this.textElement = document.getElementById("cutscene-text");

    this.introPhase = INTRO_PHASES.WAITING_START_CLICK;
    this.endingPhase = ENDING_PHASES.FLYING_UP;

    this.player = null;
    this.sky = null;
    this.towerGroup = null;
    this.rawTowerScene = null;
    this.rawTowerSize = new THREE.Vector3();
    this.highestEndingTowerZ = 220000;

    this.ambientLight = null;
    this.hemiLight = null;
    this.dirLight = null;
    this.dirLightTarget = null;
    this.lightOffset = new THREE.Vector3(250, 450, 650);

    this.phaseTimer = 0;
    this.fireSparkTimer = 0;
    this.panProgress = 0;
    this.camRiseVelocity = 0;
    this.skipHoldTimer = 0;
    this.isFadingOut = false;
    this.loreFinished = false;
    this.hasShownDeveloperBonus = false;

    this.cutsceneTimeouts = [];

    this.endingCamSpeedZ = 350;

    this.loreElement = null;
    this.loreTextSpan = null;
    this.loreArrow = null;
    this.skipHintElement = null;
    this.blackTextOverlay = null;
    this.blackTextArrow = null;
    this.titleElement = null;
    this.cutscenePromptElem = null;

    this.endingTextOverlay = null;
    this.endingTextContainer = null;
    this.endingBlackBgOverlay = null;
    this.bonusOverlay = null;
    this.endingSentenceIndex = 0;

    this.fireTextureCore = null;
    this.fireTextureFlame = null;
    this.fireParticles = [];
    this.endingFireLight = null;

    this.typewriterInterval = null;
    this.currentTypewriterText = "";
    this.isTypewritingLore = false;

    this.camStartPos = new THREE.Vector3(0, 795, 1030);
    this.camEndPos = new THREE.Vector3(0, 795, 258);
    this.camLookStart = new THREE.Vector3(0, 275, 950);
    this.camLookEnd = new THREE.Vector3(0, 275, 178);

    this.legendLines = [
      t('introSlide2') || "The legend says people of the past have built a tower.",
      t('introSlide3') || "Tower so tall one couldn't even see its peak.",
      t('introSlide4') || "Its purpose is unknown to this very day.",
      t('introSlide5') || "And every day to come."
    ];

    this.legendIndex = 0;
    this.fragments = [];
  }

  setCutsceneTimeout(fn, delayMs) {
    const id = setTimeout(() => {
      this.cutsceneTimeouts = this.cutsceneTimeouts.filter(tId => tId !== id);
      fn();
    }, delayMs);
    this.cutsceneTimeouts.push(id);
    return id;
  }

  clearCutsceneTimeouts() {
    for (const id of this.cutsceneTimeouts) {
      clearTimeout(id);
    }
    this.cutsceneTimeouts = [];
  }

  getEndingSentences() {
    return [
      t('endingSentence1') || "In the veiled dawn of forgotten legends, the Tower was whispered to bear some sacred purpose — that ancient delusion now lies shattered into dust.",
      t('endingSentence2') || "It rises instead as the raw, throbbing embodiment of human will alone.",
      t('endingTheEnd') || "THE END"
    ];
  }

  createFireTexture() {
    if (this.fireTexture) return this.fireTexture;

    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, 16, 16);

    const rad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    rad.addColorStop(0, '#ffffff');
    rad.addColorStop(0.35, '#ffd54f');
    rad.addColorStop(0.7, '#ff5722');
    rad.addColorStop(1.0, 'rgba(211, 47, 47, 0)');

    ctx.fillStyle = rad;
    ctx.beginPath();
    ctx.arc(8, 8, 7, 0, Math.PI * 2);
    ctx.fill();

    const texture = new THREE.CanvasTexture(canvas);
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;
    texture.generateMipmaps = false;
    texture.colorSpace = THREE.SRGBColorSpace;
    this.fireTexture = texture;
    return this.fireTexture;
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

    this.dirLight.shadow.camera.left = -2500;
    this.dirLight.shadow.camera.right = 2500;
    this.dirLight.shadow.camera.top = 8000;
    this.dirLight.shadow.camera.bottom = -4000;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 12000;
    this.dirLight.shadow.bias = -0.0001;
    this.dirLight.shadow.normalBias = 0.08;

    this.dirLightTarget = new THREE.Object3D();
    this.dirLightTarget.position.set(0, 275, 2000);
    this.scene.add(this.dirLightTarget);

    this.dirLight.position.set(1200, 1800, 4500);
    this.dirLight.target = this.dirLightTarget;

    this.scene.add(this.dirLight);

    this.scene.fog = new THREE.FogExp2(0xb1d1ef, 0.000015);
  }

  createUIElements() {
    const viewport = document.getElementById("game-viewport") || document.body;

    if (!this.isEnding) {
      const isTouch = state.controlType === 'touch';
      this.skipHintElement = document.createElement("div");
      this.skipHintElement.style.cssText = `
        position: absolute;
        bottom: 12px;
        right: 16px;
        font-family: 'MainFont', monospace, sans-serif;
        font-size: 14px;
        font-weight: bold;
        color: #dfc888;
        text-shadow: 1px 1px 2px #000, -1px -1px 0px #000, 1px -1px 0px #000;
        z-index: 35000;
        pointer-events: auto;
        cursor: pointer;
        opacity: 0.85;
      `;
      this.skipHintElement.innerText = isTouch ? t('skipHintTouch') : "Hold [R] or TAP to Skip";

      this.skipHintElement.addEventListener("click", (e) => {
        e.stopPropagation();
        this.skipCutscene();
      });

      viewport.appendChild(this.skipHintElement);
    }

    this.loreElement = document.createElement("div");
    this.loreElement.style.cssText = `
      position: absolute;
      top: 42%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 21px;
      font-weight: bold;
      color: #dfc888;
      text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
      max-width: 82%;
      text-align: center;
      word-wrap: break-word;
      pointer-events: none;
      z-index: 25000;
      display: none;
      line-height: 1.35;
    `;

    this.loreTextSpan = document.createElement("div");
    this.loreArrow = document.createElement("div");
    this.loreArrow.style.cssText = `
      position: absolute;
      bottom: -32px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 18px;
      color: #ffd54f;
      text-shadow: 1px 1px 2px #000;
      animation: bounceArrow 0.8s infinite ease-in-out;
      display: none;
    `;
    this.loreArrow.innerText = "▼";

    this.loreElement.appendChild(this.loreTextSpan);
    this.loreElement.appendChild(this.loreArrow);
    viewport.appendChild(this.loreElement);

    this.cutscenePromptElem = document.createElement("div");
    this.cutscenePromptElem.style.cssText = `
      position: absolute;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 22px;
      font-weight: bold;
      color: #dfc888;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      text-shadow: 3px 3px 0px #180e1c, -2px -2px 0px #523a1a, 2px -2px 0px #523a1a, -2px 2px 0px #180e1c;
      text-align: center;
      z-index: 30000;
      pointer-events: none;
      display: none;
      filter: drop-shadow(0 0 8px rgba(184, 152, 85, 0.6));
    `;
    viewport.appendChild(this.cutscenePromptElem);
  }

  showCutscenePrompt(text) {
    if (this.cutscenePromptElem) {
      this.cutscenePromptElem.innerText = text;
      this.cutscenePromptElem.style.display = "block";
    }
  }

  hideCutscenePrompt() {
    if (this.cutscenePromptElem) {
      this.cutscenePromptElem.style.display = "none";
    }
  }

  startLoreTypewriter(text) {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.currentTypewriterText = `“${text}”`;
    this.isTypewritingLore = true;

    if (this.loreArrow) this.loreArrow.style.display = "none";

    if (this.loreElement && this.loreTextSpan) {
      this.loreElement.style.display = "block";
      this.loreTextSpan.innerText = "";
    }

    let charIdx = 0;
    this.typewriterInterval = setInterval(() => {
      charIdx++;
      if (this.loreTextSpan) {
        this.loreTextSpan.innerText = this.currentTypewriterText.substring(0, charIdx);
      }
      if (charIdx >= this.currentTypewriterText.length) {
        clearInterval(this.typewriterInterval);
        this.typewriterInterval = null;
        this.isTypewritingLore = false;
        if (this.loreArrow) this.loreArrow.style.display = "block";
      }
    }, 48);
  }

  skipLoreTypewriter() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    if (this.loreTextSpan) {
      this.loreTextSpan.innerText = this.currentTypewriterText;
    }
    this.isTypewritingLore = false;
    if (this.loreArrow) this.loreArrow.style.display = "block";
  }

  hideLoreText() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }
    this.isTypewritingLore = false;
    if (this.loreElement) {
      this.loreElement.style.display = "none";
    }
  }

  async init() {
    audio.stopAll();

    if (this.isEnding) {
      await this.initEnding();
      return;
    }

    state.currentScene = "Cutscene";
    state.inDialogue = false;
    state.interactingWithUI = false;

    if (this.overlayElement) {
      this.overlayElement.style.display = "none";
    }

    this.setupLighting();
    this.sky = new VolumetricSky(this.scene);

    try {
      const towerStartMesh = await loadAndFitGLTF(
        'assets/models/TowerStart3.glb',
        625000, 625000, 1988,
        90, 0, 0,
        true
      );
      towerStartMesh.position.set(0, 0, 17);
      towerStartMesh.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = true;
        }
      });
      this.scene.add(towerStartMesh);

      const towerGltf = await loader.loadAsync('assets/models/TowerV2.glb');
      const rawTowerScene = towerGltf.scene;
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
      for (const h of [-5000, 0, 5000, 10000, 15000, 20000]) {
        const chunk = rawTowerScene.clone();
        chunk.scale.set(scaleX, scaleY, scaleZ);
        chunk.rotation.order = 'ZYX';
        chunk.rotation.set(Math.PI / 2, 0, Math.PI);
        chunk.position.set(0, 0, h);
        this.towerGroup.add(chunk);
      }
      this.scene.add(this.towerGroup);
    } catch (e) {
      console.warn("Failed to load tower models in CutsceneScene", e);
    }

    state.equippedWings = "WoodenWings";
    this.player = new Player();
    this.player.equipWings("WoodenWings");
    this.player.Object3D.position.set(0, 275, 78);
    this.scene.add(this.player.Object3D);

    this.camera.position.copy(this.camStartPos);
    this.camera.lookAt(this.camLookStart);

    this.createUIElements();

    audio.playMusicOnChannel("Damiano Baldoni - A Long Story.mp3", 1, true, 45);

    const startPromptText = state.controlType === 'touch' ? t('promptCutsceneStart') : "Press any key to continue";
    this.showCutscenePrompt(startPromptText);
  }

  async initEnding() {
    state.currentScene = "EndingCutscene";
    state.inDialogue = false;
    state.interactingWithUI = false;
    this.hasShownDeveloperBonus = false;
    this.clearCutsceneTimeouts();

    ui.hideAlerts();
    ui.hideGlideTimer();
    ui.hideChargeBar();
    ui.hidePrompt();
    ui.updateHUD();

    if (this.overlayElement) {
      this.overlayElement.style.display = "none";
    }

    this.setupLighting();
    this.sky = new VolumetricSky(this.scene);
    this.createFireTexture();

    try {
      const towerGltf = await loader.loadAsync('assets/models/TowerV2.glb');
      this.rawTowerScene = towerGltf.scene;
      this.rawTowerScene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = false;
          child.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(this.rawTowerScene);
      box.getSize(this.rawTowerSize);

      const chunkDepth = 5000;
      const scaleX = 455 / (this.rawTowerSize.x || 1);
      const scaleY = chunkDepth / (this.rawTowerSize.y || 1);
      const scaleZ = 455 / (this.rawTowerSize.z || 1);

      this.towerGroup = new THREE.Group();
      for (const h of [200000, 205000, 210000, 215000, 220000, 225000, 230000]) {
        const chunk = this.rawTowerScene.clone();
        chunk.scale.set(scaleX, scaleY, scaleZ);
        chunk.rotation.order = 'ZYX';
        chunk.rotation.set(Math.PI / 2, 0, Math.PI);
        chunk.position.set(0, 0, h);
        this.towerGroup.add(chunk);
      }
      this.scene.add(this.towerGroup);
      this.highestEndingTowerZ = 235000;
    } catch (e) {
      console.warn("Failed to load tower model in Ending Cutscene", e);
    }

    state.equippedWings = "WaxWings";
    this.player = new Player();
    this.player.equipWings("WaxWings");
    this.player.Object3D.position.set(0, 275, 220000);
    this.player.playAnimation("Fly");
    this.player.currentJumpSpeed = 1600;
    this.scene.add(this.player.Object3D);

    this.camera.position.set(0, 795, 220180);
    this.camera.lookAt(0, 275, 220100);

    this.createUIElements();

    audio.playMusicOnChannel("Damiano Baldoni - Celtic Warrior.mp3", 1, true, 50);

    this.endingPhase = ENDING_PHASES.FLYING_UP;
    this.phaseTimer = 0;
    this.fireSparkTimer = 0;
  }

  updateEndingTowerChunks() {
    if (!this.rawTowerScene || !this.towerGroup) return;

    while (this.highestEndingTowerZ < this.camera.position.z + 25000) {
      const chunk = this.rawTowerScene.clone();
      const chunkDepth = 5000;
      const scaleX = 455 / (this.rawTowerSize.x || 1);
      const scaleY = chunkDepth / (this.rawTowerSize.y || 1);
      const scaleZ = 455 / (this.rawTowerSize.z || 1);

      chunk.scale.set(scaleX, scaleY, scaleZ);
      chunk.rotation.order = 'ZYX';
      chunk.rotation.set(Math.PI / 2, 0, Math.PI);
      chunk.position.set(0, 0, this.highestEndingTowerZ);

      this.towerGroup.add(chunk);
      this.highestEndingTowerZ += chunkDepth;
    }
  }

  spawnWingsMeltEffect(pos) {
    const fTex = this.createFireTexture();

    if (!this.endingFireLight) {
      this.endingFireLight = new THREE.PointLight(0xff6d00, 35.0, 1000);
      this.endingFireLight.decay = 1.2;
      this.scene.add(this.endingFireLight);
    }
    if (this.endingFireLight) {
      this.endingFireLight.position.copy(pos);
      this.endingFireLight.intensity = 45.0;
    }

    for (let i = 0; i < 70; i++) {
      const size = 6 + Math.floor(Math.random() * 8);
      const pGeo = new THREE.PlaneGeometry(size, size);

      const pMat = new THREE.MeshBasicMaterial({
        map: fTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.frustumCulled = false;

      const offsetWingsX = (i % 2 === 0 ? 1 : -1) * (10 + Math.random() * 45);
      mesh.position.set(
        pos.x + offsetWingsX,
        pos.y + (Math.random() - 0.5) * 20,
        pos.z + (Math.random() - 0.5) * 20
      );
      this.scene.add(mesh);

      this.fireParticles.push({
        mesh,
        mat: pMat,
        velocity: new THREE.Vector3(
          offsetWingsX * 1.2 + (Math.random() - 0.5) * 40,
          (Math.random() - 0.5) * 30,
          -80 - Math.random() * 140
        ),
        life: 0,
        maxLife: 0.6 + Math.random() * 0.6,
        seed: Math.random() * 10
      });
    }
  }

  spawnContinuousMeltSparks(pos, count = 2) {
    const fTex = this.createFireTexture();

    if (!this.endingFireLight) {
      this.endingFireLight = new THREE.PointLight(0xff6d00, 15.0, 800);
      this.endingFireLight.decay = 1.2;
      this.scene.add(this.endingFireLight);
    }

    for (let i = 0; i < count; i++) {
      const size = 5 + Math.floor(Math.random() * 6);
      const pGeo = new THREE.PlaneGeometry(size, size);

      const pMat = new THREE.MeshBasicMaterial({
        map: fTex,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const mesh = new THREE.Mesh(pGeo, pMat);
      mesh.frustumCulled = false;

      const wingSide = (Math.random() < 0.5 ? 1 : -1);
      const offsetX = wingSide * (15 + Math.random() * 45);

      mesh.position.set(
        pos.x + offsetX,
        pos.y + (Math.random() - 0.5) * 15,
        pos.z + (Math.random() - 0.5) * 15
      );
      this.scene.add(mesh);

      this.fireParticles.push({
        mesh,
        mat: pMat,
        velocity: new THREE.Vector3(
          offsetX * 0.4 + (Math.random() - 0.5) * 20,
          (Math.random() - 0.5) * 20,
          -60 - Math.random() * 100
        ),
        life: 0,
        maxLife: 0.45 + Math.random() * 0.4,
        seed: Math.random() * 10
      });
    }
  }

  update(delta) {
    super.update(delta);

    if (this.isEnding) {
      this.updateEnding(delta);
      return;
    }

    if (this.sky) {
      this.sky.update(this.camera, delta, this.camera.position.z);
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

    const hintElem = document.getElementById("dialogue-hint");
    if (hintElem) {
      hintElem.style.display = "none";
    }

    this.updateSkipCheck(delta);

    if (this.player) {
      this.player.update(delta, this.camera);
    }

    switch (this.introPhase) {
      case INTRO_PHASES.WAITING_START_CLICK:
        this.updateWaitingStart();
        break;
      case INTRO_PHASES.PANNING_DOWN:
        this.updatePanningDown(delta);
        break;
      case INTRO_PHASES.DIALOGUE_SKEPTIC:
        this.updateDialogueSkeptic();
        break;
      case INTRO_PHASES.PROMPT_FLAP:
        this.updatePromptFlap();
        break;
      case INTRO_PHASES.FLAP_RISE:
        this.updateFlapRise(delta);
        break;
      case INTRO_PHASES.COYOTE_PAUSE:
        this.updateCoyotePause(delta);
        break;
      case INTRO_PHASES.FALLING:
        this.updateFalling(delta);
        break;
      case INTRO_PHASES.LANDING_STANDING:
        this.updateLandingStanding(delta);
        break;
      case INTRO_PHASES.BLACK_SCREEN_TEXT:
        this.updateBlackScreenText(delta);
        break;
      case INTRO_PHASES.REST_ITEMS_FALL:
        this.updateRestItemsFall(delta);
        break;
      case INTRO_PHASES.CAMERA_ZOOM_TITLE:
      case INTRO_PHASES.COMPLETED:
        this.updateCameraZoomTitle(delta);
        break;
    }
  }

  updateEnding(delta) {
    if (this.sky) {
      this.sky.update(this.camera, delta, this.camera.position.z);
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

    if (this.player) {
      this.player.update(delta, this.camera);
    }

    this.updateEndingTowerChunks();

    for (let i = this.fireParticles.length - 1; i >= 0; i--) {
      const p = this.fireParticles[i];
      p.life += delta;

      p.mesh.position.x += Math.sin(p.life * 15 + p.seed) * 12 * delta;
      p.mesh.position.addScaledVector(p.velocity, delta);

      const ratio = Math.min(1.0, p.life / p.maxLife);
      p.mat.opacity = Math.max(0, 1.0 - ratio);

      const scale = Math.max(0.05, 1.0 - ratio);
      p.mesh.scale.setScalar(scale);

      if (this.camera) {
        p.mesh.quaternion.copy(this.camera.quaternion);
      }

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.mat.dispose();
        p.mesh.geometry.dispose();
        this.fireParticles.splice(i, 1);
      }
    }

    switch (this.endingPhase) {
      case ENDING_PHASES.FLYING_UP:
        this.updateEndingFlyingUp(delta);
        break;
      case ENDING_PHASES.WINGS_CATCH_FIRE:
        this.updateEndingWingsCatchFire(delta);
        break;
      case ENDING_PHASES.WINGS_BURNING:
        this.updateEndingWingsBurning(delta);
        break;
      case ENDING_PHASES.PLAYER_FALLING_CAM_RISING:
        this.updateEndingPlayerFallingCamRising(delta);
        break;
      case ENDING_PHASES.TEXT_DISPLAY:
        this.updateEndingTextDisplay(delta);
        break;
      case ENDING_PHASES.DEVELOPER_BONUS:
        this.updateEndingDeveloperBonus(delta);
        break;
    }
  }

  updateEndingFlyingUp(delta) {
    const playerObj = this.player.Object3D;
    this.player.currentJumpSpeed = 1600;
    playerObj.position.z += this.player.currentJumpSpeed * delta;

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, playerObj.position.z + 180, 4.5 * delta);
    this.camera.lookAt(0, 275, playerObj.position.z + 100);

    if (playerObj.position.z >= 221800) {
      this.endingPhase = ENDING_PHASES.WINGS_CATCH_FIRE;
      this.phaseTimer = 0;
      this.fireSparkTimer = 0;

      audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 60);
    }
  }

  updateEndingWingsCatchFire(delta) {
    this.phaseTimer += delta;
    this.fireSparkTimer += delta;

    const playerObj = this.player.Object3D;

    this.player.currentJumpSpeed = THREE.MathUtils.lerp(this.player.currentJumpSpeed, 380, 1.0 * delta);
    playerObj.position.z += this.player.currentJumpSpeed * delta;

    const meltProgress = Math.min(1.0, this.phaseTimer / 2.2);
    if (this.player) {
      this.player.applyWingsMeltingEffect(meltProgress);
    }

    const sparkInterval = this.phaseTimer < 1.0 ? 0.12 : (this.phaseTimer < 2.0 ? 0.07 : 0.04);
    if (this.fireSparkTimer >= sparkInterval) {
      this.fireSparkTimer = 0;
      const count = this.phaseTimer < 1.0 ? 1 : (this.phaseTimer < 2.0 ? 2 : 3);
      this.spawnContinuousMeltSparks(playerObj.position, count);
    }

    if (this.endingFireLight) {
      this.endingFireLight.position.copy(playerObj.position);
      this.endingFireLight.intensity = (this.phaseTimer / 2.2) * 25.0;
    }

    const shakeX = (Math.random() - 0.5) * 4;
    const shakeZ = (Math.random() - 0.5) * 4;

    this.player.setLean(0);

    this.camera.position.x = shakeX;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, playerObj.position.z + 180, 4.5 * delta) + shakeZ;
    this.camera.lookAt(0, 275, playerObj.position.z + 100);

    if (this.phaseTimer >= 2.2 || playerObj.position.z >= 223800) {
      this.endingPhase = ENDING_PHASES.WINGS_BURNING;
      this.phaseTimer = 0;

      audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 80);
      this.spawnWingsMeltEffect(playerObj.position);

      state.equippedWings = "";
      this.player.equipWings("");
      this.player.resetWingsMeltingEffect();
      this.player.playAnimation("Damage");
    }
  }

  updateEndingWingsBurning(delta) {
    this.phaseTimer += delta;

    const playerObj = this.player.Object3D;

    this.player.currentJumpSpeed = THREE.MathUtils.lerp(this.player.currentJumpSpeed, 0, 2.8 * delta);
    playerObj.position.z += this.player.currentJumpSpeed * delta;

    const shakeX = (Math.random() - 0.5) * 6;
    const shakeZ = (Math.random() - 0.5) * 6;

    this.camera.position.x = shakeX;
    this.camera.position.z += 220 * delta + shakeZ;
    this.camera.lookAt(0, 275, this.camera.position.z - 60);

    if (this.phaseTimer >= 1.0) {
      this.endingPhase = ENDING_PHASES.PLAYER_FALLING_CAM_RISING;
      this.phaseTimer = 0;
      this.player.playAnimation("Fall");
    }
  }

  updateEndingPlayerFallingCamRising(delta) {
    this.phaseTimer += delta;

    const playerObj = this.player.Object3D;

    this.player.currentJumpSpeed = Math.max(-240, this.player.currentJumpSpeed - 180 * delta);
    playerObj.position.z += this.player.currentJumpSpeed * delta;

    if (Math.random() < 0.25) {
      this.spawnContinuousMeltSparks(playerObj.position, 1);
    }

    this.player.setCustomRotation(null);

    if (this.endingFireLight) {
      this.endingFireLight.intensity = Math.max(0, 25.0 - this.phaseTimer * 10.0);
    }

    this.camera.position.x = 0;
    this.camera.position.z += this.endingCamSpeedZ * delta;
    this.camera.lookAt(0, 275, this.camera.position.z - 60);

    if (this.player.bodySprite && this.player.bodySprite.material) {
      this.player.bodySprite.material.opacity = Math.max(0, 1.0 - (this.phaseTimer * 0.42));
    }

    if (this.phaseTimer >= 2.4) {
      this.showEndingTextOverlay();
    }
  }

  showEndingTextOverlay() {
    this.endingPhase = ENDING_PHASES.TEXT_DISPLAY;
    this.phaseTimer = 0;
    this.endingSentenceIndex = 0;

    const viewport = document.getElementById("game-viewport") || document.body;

    this.endingBlackBgOverlay = document.createElement("div");
    this.endingBlackBgOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      background: #000000;
      z-index: 27500;
      opacity: 0;
      transition: opacity 1.8s ease;
      pointer-events: none;
    `;

    this.endingTextOverlay = document.createElement("div");
    this.endingTextOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      background: transparent;
      z-index: 28000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-sizing: border-box;
      pointer-events: auto;
    `;

    this.endingTextContainer = document.createElement("div");
    this.endingTextContainer.style.cssText = `
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 20px;
      font-weight: bold;
      color: #dfc888;
      text-align: center;
      line-height: 1.45;
      letter-spacing: 1px;
      text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
      max-width: 92%;
      white-space: pre-wrap;
      opacity: 0;
      transition: opacity 0.6s ease;
    `;

    this.endingTextOverlay.appendChild(this.endingTextContainer);
    viewport.appendChild(this.endingBlackBgOverlay);
    viewport.appendChild(this.endingTextOverlay);

    this.endingTextOverlay.addEventListener("click", () => {
      this.advanceEndingText();
    });

    this.displayNextEndingSentence();
  }

  advanceEndingText() {
    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
      const sentences = this.getEndingSentences();
      const isTheEnd = (this.endingSentenceIndex - 1 === sentences.length - 1);
      if (!isTheEnd && this.endingTextContainer) {
        this.endingTextContainer.innerText = sentences[this.endingSentenceIndex - 1];
      }
      return;
    }
    this.displayNextEndingSentence();
  }

  displayNextEndingSentence() {
    const sentences = this.getEndingSentences();

    if (this.endingSentenceIndex >= sentences.length) {
      this.showDeveloperBonusScreen();
      return;
    }

    const isTheEndSentence = (this.endingSentenceIndex === sentences.length - 1);
    const currentText = sentences[this.endingSentenceIndex];
    this.endingSentenceIndex++;

    if (this.endingTextContainer) {
      this.endingTextContainer.style.opacity = "0";
    }

    if (isTheEndSentence && this.endingBlackBgOverlay) {
      this.endingBlackBgOverlay.style.opacity = "1";
    }

    setTimeout(() => {
      if (!this.endingTextContainer) return;

      if (isTheEndSentence) {
        this.endingTextContainer.style.cssText = `
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 36px;
          padding: 0 20px;
          box-sizing: border-box;
          opacity: 1;
          transition: opacity 0.6s ease;
        `;
        this.endingTextContainer.innerHTML = `
          <div style="
            font-family: 'MainFont', monospace, sans-serif;
            font-size: 32px;
            font-weight: bold;
            color: #dfc888;
            text-transform: uppercase;
            letter-spacing: 2px;
            text-shadow: 3px 3px 0px #180e1c, -2px -2px 0px #523a1a;
            text-align: center;
            filter: drop-shadow(0 0 10px rgba(184, 152, 85, 0.6));
          ">
            ${t('gameTitle') || "Closer to the sun ☼"}
          </div>

          <div style="
            font-family: 'MainFont', monospace, sans-serif;
            font-size: 48px;
            font-weight: bold;
            color: #ffd54f;
            text-transform: uppercase;
            letter-spacing: 4px;
            text-shadow: 3px 3px 0px #180e1c, -2px -2px 0px #523a1a;
            text-align: center;
            filter: drop-shadow(0 0 12px rgba(255, 213, 79, 0.7));
          ">
            ${t('endingTheEnd') || "THE END"}
          </div>
        `;

        this.setCutsceneTimeout(() => {
          this.showDeveloperBonusScreen();
        }, 3500);
      } else {
        this.endingTextContainer.style.cssText = `
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 20px;
          font-weight: bold;
          color: #dfc888;
          text-align: center;
          line-height: 1.45;
          letter-spacing: 1px;
          text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
          max-width: 92%;
          white-space: pre-wrap;
          opacity: 1;
          transition: opacity 0.6s ease;
        `;

        this.endingTextContainer.innerText = "";

        let charIdx = 0;
        if (this.typewriterInterval) clearInterval(this.typewriterInterval);

        this.typewriterInterval = setInterval(() => {
          charIdx++;
          if (this.endingTextContainer) {
            this.endingTextContainer.innerText = currentText.substring(0, charIdx);
          }

          if (charIdx >= currentText.length) {
            clearInterval(this.typewriterInterval);
            this.typewriterInterval = null;
          }
        }, 42);
      }
    }, 600);
  }

  showDeveloperBonusScreen() {
    if (this.hasShownDeveloperBonus) return;
    this.hasShownDeveloperBonus = true;
    this.clearCutsceneTimeouts();

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.endingPhase = ENDING_PHASES.DEVELOPER_BONUS;
    this.phaseTimer = 0;
    this.isFadingOut = false;

    state.endlessUnlocked = true;
    saveState();

    if (this.endingTextOverlay) {
      this.endingTextOverlay.remove();
      this.endingTextOverlay = null;
    }

    const viewport = document.getElementById("game-viewport") || document.body;

    this.bonusOverlay = document.createElement("div");
    this.bonusOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      background-image: url('assets/ui/Bonus.png');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 38000;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: center;
      padding: 20px 24px 24px 24px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.8s ease;
      pointer-events: auto;
    `;

    this.bonusOverlay.innerHTML = `
      <div style="
        width: 100%;
        max-height: 30%;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: 6px;
        box-sizing: border-box;
      ">
        <div style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 18px;
          font-weight: bold;
          color: #ffd54f;
          text-transform: uppercase;
          letter-spacing: 1px;
          text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
        ">
          ${t('developerNoteTitle')}
        </div>
        <div style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 15px;
          line-height: 1.4;
          color: #dfc888;
          font-weight: bold;
          text-shadow: 2px 2px 4px #000, -2px -2px 4px #000, 2px -2px 4px #000, -2px 2px 4px #000;
          white-space: pre-wrap;
          max-width: 95%;
        ">
          ${t('developerNoteBody')}
        </div>
        <div style="
          font-family: 'MainFont', monospace, sans-serif;
          font-size: 13px;
          font-weight: bold;
          color: #a5d6a7;
          text-shadow: 2px 2px 4px #000, -1px -1px 0px #000;
          margin-top: 4px;
          animation: bounceArrow 0.8s infinite ease-in-out;
        ">
          ▼ ${t('promptContinue')}
        </div>
      </div>
    `;

    const handleBonusClick = () => {
      if (!this.isFadingOut) {
        this.isFadingOut = true;
        ui.fadeInBlackScreen(800, () => {
          this.endingPhase = ENDING_PHASES.COMPLETED;
          this.manager.switchScene("MainMenu");
        });
      }
    };

    this.bonusOverlay.addEventListener("click", handleBonusClick);
    viewport.appendChild(this.bonusOverlay);

    setTimeout(() => {
      if (this.bonusOverlay) {
        this.bonusOverlay.style.opacity = "1";
      }
    }, 50);
  }

  updateEndingTextDisplay(delta) {
    this.phaseTimer += delta;

    this.camera.position.z += this.endingCamSpeedZ * delta;
    this.camera.lookAt(0, 275, this.camera.position.z - 60);

    if (input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter")) {
      this.advanceEndingText();
    }
  }

  updateEndingDeveloperBonus(delta) {
    this.phaseTimer += delta;

    if (input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter") || input.mouse.justDown) {
      if (!this.isFadingOut) {
        this.isFadingOut = true;
        ui.fadeInBlackScreen(800, () => {
          this.endingPhase = ENDING_PHASES.COMPLETED;
          this.manager.switchScene("MainMenu");
        });
      }
    }
  }

  updateSkipCheck(delta) {
    if (this.introPhase === INTRO_PHASES.COMPLETED) return;

    if (input.isKeyDown("r")) {
      this.skipHoldTimer += delta;
      if (this.skipHintElement) {
        const pct = Math.round((this.skipHoldTimer / 0.9) * 100);
        this.skipHintElement.innerText = `Holding [R] to Skip... ${Math.min(100, pct)}`;
        this.skipHintElement.style.color = "#ffd54f";
      }
      if (this.skipHoldTimer >= 0.9) {
        this.skipCutscene();
      }
    } else {
      this.skipHoldTimer = 0;
      if (this.skipHintElement) {
        const isTouch = state.controlType === 'touch';
        this.skipHintElement.innerText = isTouch ? t('skipHintTouch') : "Hold [R] or TAP to Skip";
        this.skipHintElement.style.color = "#dfc888";
      }
    }
  }

  skipCutscene() {
    this.introPhase = INTRO_PHASES.COMPLETED;
    state.inventory.fabric1 = (state.inventory.fabric1 || 0) + 2;
    state.inventory.steel1 = (state.inventory.steel1 || 0) + 1;
    state.inventory.wood1 = (state.inventory.wood1 || 0) + 1;
    saveState();

    this.hideCutscenePrompt();
    ui.fadeInBlackScreen(600, () => {
      this.manager.switchScene("City");
    });
  }

  updateWaitingStart() {
    if (input.isKeyJustPressed("space") || input.isKeyJustPressed("e") || input.isKeyJustPressed("enter") || input.mouse.justDown || Object.keys(input.justPressed).length > 0) {
      this.hideCutscenePrompt();
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);
      this.introPhase = INTRO_PHASES.PANNING_DOWN;
      this.panProgress = 0;
      this.legendIndex = 0;
      this.loreFinished = false;
      this.startLoreTypewriter(this.legendLines[0]);
    }
  }

  updatePanningDown(delta) {
    this.panProgress += delta * 0.054;
    const tProgress = Math.min(1.0, this.panProgress);
    const smoothT = THREE.MathUtils.smoothstep(tProgress, 0, 1);

    this.camera.position.lerpVectors(this.camStartPos, this.camEndPos, smoothT);
    const currentLook = new THREE.Vector3().lerpVectors(this.camLookStart, this.camLookEnd, smoothT);
    this.camera.lookAt(currentLook);

    if (input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter") || input.mouse.justDown) {
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);

      if (this.isTypewritingLore) {
        this.skipLoreTypewriter();
      } else {
        this.legendIndex++;
        if (this.legendIndex < this.legendLines.length) {
          this.startLoreTypewriter(this.legendLines[this.legendIndex]);
        } else {
          this.hideLoreText();
          this.loreFinished = true;
        }
      }
    }

    if (this.loreFinished && tProgress >= 1.0) {
      this.hideCutscenePrompt();
      this.introPhase = INTRO_PHASES.DIALOGUE_SKEPTIC;
      ui.showDialogue(t('introSlide6') || "Or so it says.", "Daedalus", t('npc_daedalus'));
    }
  }

  updateDialogueSkeptic() {
    this.camera.position.copy(this.camEndPos);
    this.camera.lookAt(this.camLookEnd);

    if (input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter") || input.mouse.justDown) {
      if (ui.isTypewriterActive()) {
        ui.skipTypewriter();
      } else {
        ui.hideDialogue();
        this.introPhase = INTRO_PHASES.PROMPT_FLAP;
      }
    }
  }

  updatePromptFlap() {
    const isTouch = state.controlType === 'touch';
    this.showCutscenePrompt(isTouch ? t('promptCutsceneFlap') : "Press Space or TAP to fly");

    this.camera.position.set(0, 795, 258);
    this.camera.lookAt(0, 275, 178);

    if (input.isKeyJustPressed("space") || input.mouse.justDown) {
      this.hideCutscenePrompt();
      audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 90);

      this.introPhase = INTRO_PHASES.FLAP_RISE;
      this.player.currentJumpSpeed = 680;
      state.equippedWings = "WoodenWings";
      this.player.equipWings("WoodenWings");
      this.player.playAnimation("Flap", true);
      this.phaseTimer = 0;
    }
  }

  updateFlapRise(delta) {
    const playerObj = this.player.Object3D;
    playerObj.position.z += this.player.currentJumpSpeed * delta;
    this.player.currentJumpSpeed -= 280 * delta;

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, playerObj.position.z + 180, 5 * delta);
    this.camera.lookAt(0, 275, playerObj.position.z + 100);

    if (this.player.currentJumpSpeed <= 0) {
      this.introPhase = INTRO_PHASES.COYOTE_PAUSE;
      this.player.currentJumpSpeed = 0;
      this.player.playAnimation("Glide", true);
      this.phaseTimer = 0;
    }
  }

  updateCoyotePause(delta) {
    this.phaseTimer += delta;

    const playerObj = this.player.Object3D;
    const swayTilt = Math.sin(this.phaseTimer * 10) * 0.02;
    this.player.setLean(swayTilt);

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, playerObj.position.z + 180, 5 * delta);
    this.camera.lookAt(0, 275, playerObj.position.z + 100);

    if (this.phaseTimer >= 0.55) {
      audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 100);

      const playerPos = playerObj.position;
      state.equippedWings = "";
      this.player.equipWings("");
      this.spawnShatteredFragments(playerPos);

      this.introPhase = INTRO_PHASES.FALLING;
      this.player.currentJumpSpeed = -140;
      this.player.playAnimation("Fall");
    }
  }

  spawnShatteredFragments(pos) {
    const icons = ["items/wood1.png", "items/wood1.png", "items/fabric1.png", "items/wood1.png"];

    for (let i = 0; i < 4; i++) {
      const sprite = new BillboardSprite({ Idle: { files: [icons[i]] } }, 42, 42);
      sprite.mesh.castShadow = false;
      sprite.mesh.receiveShadow = false;
      sprite.playAnimation("Idle");

      const mesh = sprite.Object3D;
      mesh.position.set(pos.x, pos.y, pos.z + 10);

      const dirX = (i % 2 === 0 ? 1 : -1) * (140 + Math.random() * 80);
      const velocity = new THREE.Vector3(
        dirX,
        (Math.random() - 0.5) * 60,
        220 + Math.random() * 120
      );

      this.scene.add(mesh);
      this.fragments.push({
        sprite,
        mesh,
        velocity,
        landed: false
      });
    }
  }

  updateFalling(delta) {
    const playerObj = this.player.Object3D;
    this.player.currentJumpSpeed -= 420 * delta;
    playerObj.position.z += this.player.currentJumpSpeed * delta;

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, playerObj.position.z + 180, 5 * delta);
    this.camera.lookAt(0, 275, playerObj.position.z + 100);

    for (const frag of this.fragments) {
      if (!frag.landed) {
        frag.mesh.position.addScaledVector(frag.velocity, delta);
        frag.velocity.z -= 650 * delta;

        if (frag.mesh.position.z <= 60) {
          frag.mesh.position.z = 60;
          frag.landed = true;
          audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 25);
        }
      }
      frag.sprite.update(delta, this.camera);
    }

    if (playerObj.position.z <= 78) {
      playerObj.position.z = 78;
      this.player.currentJumpSpeed = 0;
      this.player.playAnimation("StandUp");
      audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 30);

      this.introPhase = INTRO_PHASES.LANDING_STANDING;
      this.phaseTimer = 0;
    }
  }

  updateLandingStanding(delta) {
    this.phaseTimer += delta;

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, 258, 5 * delta);
    this.camera.lookAt(0, 275, 178);

    if (this.phaseTimer >= 1.2) {
      this.showBlackScreenText();
    }
  }

  showBlackScreenText() {
    this.introPhase = INTRO_PHASES.BLACK_SCREEN_TEXT;
    this.phaseTimer = 0;

    const viewport = document.getElementById("game-viewport") || document.body;

    this.blackTextOverlay = document.createElement("div");
    this.blackTextOverlay.style.cssText = `
      position: absolute;
      top: 0; left: 0;
      width: 640px; height: 480px;
      background: #000000;
      z-index: 28000;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      box-sizing: border-box;
      opacity: 0;
      transition: opacity 0.6s ease;
    `;

    const textSpan = document.createElement("div");
    textSpan.id = "black-text-span";
    textSpan.style.cssText = `
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 24px;
      font-weight: bold;
      color: #dfc888;
      text-align: center;
      line-height: 1.4;
      letter-spacing: 1px;
    `;

    this.blackTextArrow = document.createElement("div");
    this.blackTextArrow.style.cssText = `
      font-size: 18px;
      color: #ffd54f;
      text-shadow: 1px 1px 2px #000;
      margin-top: 14px;
      animation: bounceArrow 0.8s infinite ease-in-out;
      display: none;
    `;
    this.blackTextArrow.innerText = "▼";

    this.blackTextOverlay.appendChild(textSpan);
    this.blackTextOverlay.appendChild(this.blackTextArrow);
    viewport.appendChild(this.blackTextOverlay);

    setTimeout(() => {
      if (this.blackTextOverlay) {
        this.blackTextOverlay.style.opacity = "1";
      }
    }, 50);

    const fullMsg = t('cutsceneWingsText') || "Мне нужны крылья сильнее...";
    let cIdx = 0;
    const interval = setInterval(() => {
      cIdx++;
      if (textSpan) {
        textSpan.innerText = fullMsg.substring(0, cIdx);
      }
      if (cIdx >= fullMsg.length) {
        clearInterval(interval);
        if (this.blackTextArrow) this.blackTextArrow.style.display = "block";
      }
    }, 42);
  }

  updateBlackScreenText(delta) {
    this.phaseTimer += delta;

    this.camera.position.set(0, 795, 258);
    this.camera.lookAt(0, 275, 178);

    if (this.phaseTimer >= 3.2 || input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter") || input.mouse.justDown) {
      if (this.blackTextOverlay) {
        this.blackTextOverlay.style.opacity = "0";
        setTimeout(() => {
          if (this.blackTextOverlay) {
            this.blackTextOverlay.remove();
            this.blackTextOverlay = null;
          }
        }, 600);
      }

      this.player.playAnimation("Rest");
      this.player.Object3D.position.z = 52;

      for (const frag of this.fragments) {
        this.scene.remove(frag.mesh);
      }
      this.fragments = [];

      const lootIcons = ["items/fabric1.png", "items/steel1.png", "items/wood1.png", "items/fabric1.png"];
      for (let i = 0; i < 4; i++) {
        const sprite = new BillboardSprite({ Idle: { files: [lootIcons[i]] } }, 42, 42);
        sprite.mesh.castShadow = false;
        sprite.mesh.receiveShadow = false;
        sprite.playAnimation("Idle");

        const mesh = sprite.Object3D;
        const offsetX = (i % 2 === 0 ? 1 : -1) * (45 + i * 12);
        const offsetY = (i - 1.5) * 15;

        mesh.position.set(offsetX, 275 + offsetY, 650);
        mesh.visible = false;

        this.scene.add(mesh);
        this.fragments.push({
          sprite,
          mesh,
          velocity: new THREE.Vector3(0, 0, -600),
          landed: false,
          dropDelay: 0.3 + i * 0.4,
          started: false
        });
      }

      this.introPhase = INTRO_PHASES.REST_ITEMS_FALL;
      this.phaseTimer = 0;
    }
  }

  updateRestItemsFall(delta) {
    this.phaseTimer += delta;

    this.player.Object3D.position.z = 52;
    this.camera.position.set(0, 795, 258);
    this.camera.lookAt(0, 275, 178);

    for (const frag of this.fragments) {
      if (this.phaseTimer >= frag.dropDelay) {
        if (!frag.started) {
          frag.started = true;
          frag.mesh.visible = true;
        }
        if (!frag.landed) {
          frag.mesh.position.addScaledVector(frag.velocity, delta);
          frag.velocity.z -= 1100 * delta;

          if (frag.mesh.position.z <= 60) {
            frag.mesh.position.z = 60;
            frag.landed = true;
            audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 30);
          }
        }
      }
      frag.sprite.update(delta, this.camera);
    }

    if (this.phaseTimer >= 3.4) {
      state.inventory.fabric1 = (state.inventory.fabric1 || 0) + 2;
      state.inventory.steel1 = (state.inventory.steel1 || 0) + 1;
      state.inventory.wood1 = (state.inventory.wood1 || 0) + 1;
      saveState();

      this.startTitleZoomPhase();
    }
  }

  startTitleZoomPhase() {
    this.introPhase = INTRO_PHASES.CAMERA_ZOOM_TITLE;
    this.phaseTimer = 0;
    this.camRiseVelocity = 0;
    this.isFadingOut = false;

    const viewport = document.getElementById("game-viewport") || document.body;
    this.titleElement = document.createElement("div");
    this.titleElement.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: 'MainFont', monospace, sans-serif;
      font-size: 38px;
      font-weight: bold;
      color: #dfc888;
      text-transform: uppercase;
      letter-spacing: 2px;
      text-shadow: 3px 3px 0px #180e1c, -2px -2px 0px #523a1a, 2px -2px 0px #523a1a;
      text-align: center;
      z-index: 30000;
      opacity: 0;
      transition: opacity 1.8s ease;
      pointer-events: none;
      filter: drop-shadow(0 0 12px rgba(184, 152, 85, 0.8));
    `;
    this.titleElement.innerHTML = `
      ${t('gameTitle') || "Closer to the sun ☼"}
      <div style="font-size: 18px; font-weight: normal; margin-top: 10px; color: #e2c89b; text-transform: none; letter-spacing: 1px; text-shadow: 2px 2px 0px #180e1c;">
        by Dahaton & Coyz
      </div>
    `;
    viewport.appendChild(this.titleElement);
  }

  updateCameraZoomTitle(delta) {
    this.phaseTimer += delta;

    this.camRiseVelocity += 220 * delta;
    this.camera.position.z += this.camRiseVelocity * delta;

    this.camera.position.x = 0;
    this.camera.position.y = 795;
    this.camera.lookAt(0, 275, this.camera.position.z - 80);

    if (this.phaseTimer >= 3.0 && this.titleElement && this.titleElement.style.opacity === "0") {
      this.titleElement.style.opacity = "1";
    }

    if (this.phaseTimer >= 6.8 && !this.isFadingOut) {
      this.isFadingOut = true;
      ui.fadeInBlackScreen(1600, () => {
        this.introPhase = INTRO_PHASES.COMPLETED;
        this.manager.switchScene("City");
      });
    }
  }

  destroy() {
    super.destroy();
    audio.stopAll();
    ui.hidePrompt();
    ui.hideDialogue();
    this.hideLoreText();
    this.hideCutscenePrompt();

    this.clearCutsceneTimeouts();

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    if (this.loreElement) {
      this.loreElement.remove();
      this.loreElement = null;
    }

    if (this.skipHintElement) {
      this.skipHintElement.remove();
      this.skipHintElement = null;
    }

    if (this.blackTextOverlay) {
      this.blackTextOverlay.remove();
      this.blackTextOverlay = null;
    }

    if (this.titleElement) {
      this.titleElement.remove();
      this.titleElement = null;
    }

    if (this.cutscenePromptElem) {
      this.cutscenePromptElem.remove();
      this.cutscenePromptElem = null;
    }

    if (this.endingTextOverlay) {
      this.endingTextOverlay.remove();
      this.endingTextOverlay = null;
    }

    if (this.endingBlackBgOverlay) {
      this.endingBlackBgOverlay.remove();
      this.endingBlackBgOverlay = null;
    }

    if (this.endingCreditsOverlay) {
      this.endingCreditsOverlay.remove();
      this.endingCreditsOverlay = null;
    }

    if (this.bonusOverlay) {
      this.bonusOverlay.remove();
      this.bonusOverlay = null;
    }

    if (this.overlayElement) {
      this.overlayElement.style.display = "none";
      this.overlayElement.style.backgroundImage = "none";
    }

    for (const frag of this.fragments) {
      this.scene.remove(frag.mesh);
    }
    this.fragments = [];

    if (this.endingFireLight) {
      this.scene.remove(this.endingFireLight);
      this.endingFireLight.dispose();
      this.endingFireLight = null;
    }

    for (const p of this.fireParticles) {
      this.scene.remove(p.mesh);
      if (p.mat) p.mat.dispose();
      if (p.mesh && p.mesh.geometry) p.mesh.geometry.dispose();
    }
    this.fireParticles = [];
  }
}