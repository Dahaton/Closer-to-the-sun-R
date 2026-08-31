import * as THREE from 'three';
import { BaseScene } from './baseScene.js';
import { Player, WINGS_FILES } from '../entities/player.js';
import { BillboardSprite } from '../entities/billboardSprite.js';
import { loadAndFitGLTF } from '../utils/modelLoader.js';
import { VolumetricSky } from '../shaders/skyShader.js';
import { PixelWater } from '../shaders/waterShader.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { state, debugUnlockAll } from '../state.js';
import { ui } from '../ui.js';
import { t } from '../localization.js';

const _tempWorldPos = new THREE.Vector3();
const _tempWorldQuat = new THREE.Quaternion();
const _tempWorldScale = new THREE.Vector3();
const _tempOffsetPos = new THREE.Vector3(0, -47, 37);
const _tempEuler = new THREE.Euler(THREE.MathUtils.degToRad(60), 0, 0, 'XYZ');
const _tempOffsetQuat = new THREE.Quaternion().setFromEuler(_tempEuler);

export class CityScene extends BaseScene {
  constructor(renderer, manager) {
    super(renderer, manager);

    this.player = null;
    this.cityMesh = null;
    this.sky = null;
    this.water = null;
    this.mixer = null;

    this.workshopWingsMesh = null;
    this.workshopWingsSprite = null;
    this.lastEquippedWings = null;
    this.textureLoader = new THREE.TextureLoader();
    this.wingsTextureCache = new Map();

    this.npc1 = null;
    this.npc2 = null;
    this.npc3 = null;

    this.ambientLight = null;
    this.hemiLight = null;
    this.dirLight = null;
    this.dirLightTarget = null;
    this.lightOffset = new THREE.Vector3(-800, -800, 1200);

    this.workshopTriggers = [];
    this.shopTriggers = [];
    this.exitTriggers = [];
    this.invisibleWalls = [];

    this.dummySpawnPos = null;
    this.drunkardSpawnPos = null;
    this.shopkeeperSpawnPos = null;

    this.currentDialogueNpc = null;
    this.dialogueStep = 0;

    this.camYOffset = 660;
    this.camZOffset = 135;
    this.camLookZOffset = 50;

    this.currentCamYOffset = 660;
    this.currentCamZOffset = 135;
  }

  getDialogues() {
    return {
      intro: [
        { portrait: "Daedalus", text: t('dialogueIntro') }
      ],
      noWings: [
        { portrait: "Daedalus", text: t('dialogueNeedWings') }
      ],
      salesman: [
        { portrait: "Salesman", text: t('dialogueNpc1_1') },
        { portrait: "Daedalus", text: t('dialogueNpc1_2') },
        { portrait: "Salesman", text: t('dialogueNpc1_3') },
        { portrait: "SmileMainCharacter", text: t('dialogueNpc1_4') }
      ],
      dummy: [
        { portrait: "Dummy", text: t('dialogueNpc2_1') },
        { portrait: "Dummy", text: t('dialogueNpc2_2') },
        { portrait: "Dummy", text: t('dialogueNpc2_3') }
      ],
      bum: [
        { portrait: "Bum", text: t('dialogueBum_1') },
        { portrait: "Bum", text: t('dialogueBum_2') }
      ]
    };
  }

  setupCityLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffe8d6, 1.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x4a3b52, 1.0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;

    const d = 1500;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 4000;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.02;

    this.dirLightTarget = new THREE.Object3D();
    this.scene.add(this.dirLightTarget);
    this.dirLight.target = this.dirLightTarget;

    this.scene.add(this.dirLight);
  }

  parseCityTriggersAndSpawns() {
    if (!this.cityMesh) return;

    this.cityMesh.updateMatrixWorld(true);

    this.workshopTriggers = [];
    this.shopTriggers = [];
    this.exitTriggers = [];
    this.invisibleWalls = [];

    this.dummySpawnPos = null;
    this.drunkardSpawnPos = null;
    this.shopkeeperSpawnPos = null;
    this.workshopWingsMesh = null;

    this.cityMesh.traverse((child) => {
      const name = child.name || "";
      const lowerName = name.toLowerCase();

      if (
        lowerName.includes("workshopwing") ||
        lowerName.includes("workshop_wing") ||
        lowerName.includes("wings_workshop") ||
        (lowerName.includes("workshop") && lowerName.includes("wing"))
      ) {
        this.workshopWingsMesh = child;
        this.workshopWingsMesh.traverse((wChild) => {
          if (wChild.isMesh && wChild.material) {
            wChild.userData.originalMaterial = wChild.material;
            if (wChild.material.map) {
              wChild.userData.originalMap = wChild.material.map;
            }
          }
        });
      }

      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;

        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat) => {
              mat.transparent = true;
              mat.side = THREE.DoubleSide;
            });
          } else {
            child.material.transparent = true;
            child.material.side = THREE.DoubleSide;
          }
        }
      }

      const isWorkshop = lowerName.includes("workshoptrigger");
      const isShop = lowerName.includes("shoptrigger");
      const isExit = lowerName.includes("exittrigger");
      const isWall = lowerName.includes("invisiblewall");
      const isDummy = lowerName.includes("dummyspawn");
      const isDrunkard = lowerName.includes("drunkardspawn");
      const isShopkeeper = lowerName.includes("shopkeeperspawn");

      if (isWorkshop || isShop || isExit || isWall || isDummy || isDrunkard || isShopkeeper) {
        child.visible = false;

        const worldPos = new THREE.Vector3();
        child.getWorldPosition(worldPos);

        const box = new THREE.Box3().setFromObject(child);

        if (isWorkshop) {
          this.workshopTriggers.push({ mesh: child, box, pos: worldPos });
        } else if (isShop) {
          this.shopTriggers.push({ mesh: child, box, pos: worldPos });
        } else if (isExit) {
          this.exitTriggers.push({ mesh: child, box, pos: worldPos });
        } else if (isWall) {
          this.invisibleWalls.push({ mesh: child, box, pos: worldPos });
        } else if (isDummy) {
          this.dummySpawnPos = worldPos;
        } else if (isDrunkard) {
          this.drunkardSpawnPos = worldPos;
        } else if (isShopkeeper) {
          this.shopkeeperSpawnPos = worldPos;
        }
      }
    });
  }

  updateWorkshopWingsTexture() {
    if (!this.workshopWingsMesh) return;

    const currentWings = state.equippedWings;
    this.lastEquippedWings = currentWings;

    if (this.workshopWingsSprite) {
      this.scene.remove(this.workshopWingsSprite);
      if (this.workshopWingsSprite.material) {
        this.workshopWingsSprite.material.dispose();
      }
      if (this.workshopWingsSprite.geometry) {
        this.workshopWingsSprite.geometry.dispose();
      }
      this.workshopWingsSprite = null;
    }

    if (!currentWings || !WINGS_FILES[currentWings]) {
      this.workshopWingsMesh.traverse((child) => {
        if (child.isMesh) {
          if (child.userData.originalMaterial) {
            child.material = child.userData.originalMaterial;
          }
          child.visible = true;
        }
      });
      let currentObj = this.workshopWingsMesh;
      while (currentObj) {
        currentObj.visible = true;
        currentObj = currentObj.parent;
      }
      return;
    }

    this.workshopWingsMesh.traverse((child) => {
      if (child.isMesh) {
        child.visible = false;
      }
    });

    this.cityMesh.updateMatrixWorld(true);
    this.workshopWingsMesh.updateMatrixWorld(true);

    this.workshopWingsMesh.matrixWorld.decompose(_tempWorldPos, _tempWorldQuat, _tempWorldScale);

    const frame3Path = WINGS_FILES[currentWings][2] || WINGS_FILES[currentWings][0];
    const texturePath = "assets/" + frame3Path;

    let texture = this.wingsTextureCache.get(texturePath);
    if (!texture) {
      texture = this.textureLoader.load(texturePath);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.magFilter = THREE.NearestFilter;
      texture.minFilter = THREE.NearestFilter;
      this.wingsTextureCache.set(texturePath, texture);
    }

    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
      roughness: 1.0,
      metalness: 0.0,
      depthWrite: true,
      depthTest: true
    });

    const geo = new THREE.PlaneGeometry(160, 128);
    const planeMesh = new THREE.Mesh(geo, mat);
    planeMesh.castShadow = true;
    planeMesh.receiveShadow = false;

    planeMesh.position.copy(_tempWorldPos).add(_tempOffsetPos);
    planeMesh.quaternion.copy(_tempWorldQuat).multiply(_tempOffsetQuat);

    this.workshopWingsSprite = planeMesh;
    this.scene.add(this.workshopWingsSprite);
  }

  calculateCityBoundaries() {
    let minX = -3200;
    let maxX = 2500;

    const cityCenter = 340;
    const leftWalls = this.invisibleWalls.filter(w => w.pos.x < cityCenter);
    const rightWalls = this.invisibleWalls.filter(w => w.pos.x >= cityCenter);

    if (leftWalls.length > 0) {
      minX = Math.max(...leftWalls.map(w => w.pos.x));
    }

    if (rightWalls.length > 0) {
      maxX = Math.min(...rightWalls.map(w => w.pos.x));
    }

    return { minX, maxX };
  }

  async init() {
    state.currentScene = "City";
    state.inDialogue = false;
    state.interactingWithUI = false;
    ui.hideDialogue();
    ui.fadeOutBlackScreen(300);

    this.setupCityLighting();
    this.sky = new VolumetricSky(this.scene);

    audio.playMusicOnChannel("713353__klankbeeld__spring-river-village-9.wav", 1, true, 35);

    this.cityMesh = await loadAndFitGLTF(
      'assets/models/CTSCity.glb',
      6000,
      3130,
      23300,
      90, 0, 180,
      true
    );

    this.cityMesh.position.set(340, 459, -60);
    this.cityMesh.rotation.order = 'ZYX';
    this.cityMesh.rotation.set(
      THREE.MathUtils.degToRad(90),
      THREE.MathUtils.degToRad(0),
      THREE.MathUtils.degToRad(180)
    );
    this.cityMesh.scale.set(305, 305, 305);

    this.scene.add(this.cityMesh);

    this.parseCityTriggersAndSpawns();
    this.updateWorkshopWingsTexture();

    const animations = this.cityMesh.userData.animations || [];
    if (animations.length > 0) {
      this.mixer = new THREE.AnimationMixer(this.cityMesh);
      animations.forEach(clip => {
        const action = this.mixer.clipAction(clip);
        action.setLoop(THREE.LoopRepeat);
        action.play();
      });
    }

    this.water = new PixelWater(14000, 6000);
    this.water.Object3D.position.set(340, 450, -30);
    this.scene.add(this.water.Object3D);

    let playerSpawnX = -2848;
    let playerSpawnY = 420;
    let playerSpawnZ = 78;

    if (this.exitTriggers.length > 0) {
      const leftExit = this.exitTriggers.reduce((prev, curr) => (curr.pos.x < prev.pos.x ? curr : prev), this.exitTriggers[0]);
      playerSpawnX = leftExit.pos.x;
    } else {
      const { minX } = this.calculateCityBoundaries();
      playerSpawnX = minX + 80;
    }

    this.player = new Player();
    this.player.Object3D.position.set(playerSpawnX, playerSpawnY, playerSpawnZ);
    this.player.setFlipX(true);
    this.scene.add(this.player.Object3D);

    this.currentCamYOffset = this.camYOffset;
    this.currentCamZOffset = this.camZOffset;

    this.camera.position.set(playerSpawnX, playerSpawnY - this.camYOffset, playerSpawnZ + this.camZOffset);
    this.camera.lookAt(playerSpawnX, playerSpawnY, playerSpawnZ + this.camLookZOffset);

    this.npc1 = new BillboardSprite({
      Idle: {
        files: ["npcs/Salesman1.png", "npcs/Salesman2.png", "npcs/Salesman3.png", "npcs/Salesman4.png"],
        frameDuration: 0.25,
        loop: true
      }
    }, 150, 120);

    this.npc1.Object3D.position.set(1366, 559, 72);
    this.npc1.playAnimation("Idle");
    this.scene.add(this.npc1.Object3D);

    this.npc2 = new BillboardSprite({
      Idle: {
        files: ["npcs/Dummy1.png", "npcs/Dummy2.png", "npcs/Dummy3.png", "npcs/Dummy4.png"],
        frameDuration: 0.25,
        loop: true
      }
    }, 150, 120);

    this.npc2.Object3D.position.set(-75, 496, 64);
    this.npc2.playAnimation("Idle");
    this.scene.add(this.npc2.Object3D);

    this.npc3 = new BillboardSprite({
      Idle: {
        files: ["npcs/SleepingBum1.png", "npcs/SleepingBum2.png", "npcs/SleepingBum3.png"],
        frameDuration: 0.35,
        loop: true
      }
    }, 140, 110);

    this.npc3.Object3D.position.set(-567, 557, 51);
    this.npc3.playAnimation("Idle");
    this.scene.add(this.npc3.Object3D);

    ui.updateHUD();
    ui.updateReturnHint(true);

    if (state.lastRunSummary) {
      const summary = state.lastRunSummary;
      state.lastRunSummary = null;
      setTimeout(() => {
        ui.showRunSummary(summary);
      }, 350);
    } else if (!state.hasSeenIntroDialogue) {
      state.hasSeenIntroDialogue = true;
      setTimeout(() => {
        this.startDialogue("intro");
      }, 300);
    }
  }

  isPlayerInTrigger(triggerItem, interactionRadius = 85) {
    if (!triggerItem || !this.player) return false;
    const pPos = this.player.Object3D.position;
    const dX = pPos.x - triggerItem.pos.x;
    const dY = pPos.y - triggerItem.pos.y;
    return Math.hypot(dX, dY) <= interactionRadius;
  }

  isPlayerNearObject(targetPos, interactionRadius = 120) {
    if (!targetPos || !this.player) return false;
    const pPos = this.player.Object3D.position;
    const dX = Math.abs(pPos.x - targetPos.x);
    return dX <= interactionRadius;
  }

  update(delta) {
    super.update(delta);

    if (this.lastEquippedWings !== state.equippedWings) {
      this.updateWorkshopWingsTexture();
    }

    if (input.isKeyJustPressed("7")) {
      debugUnlockAll();
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);
      ui.updateHUD();
    }

    if (!this.player) return;

    if (this.mixer) {
      this.mixer.update(delta);
    }

    if (this.dirLightTarget && this.player) {
      this.dirLightTarget.position.copy(this.player.Object3D.position);
      this.dirLight.position.copy(this.player.Object3D.position).add(this.lightOffset);
      this.dirLight.target.updateMatrixWorld();
    }

    if (this.sky) {
      this.sky.update(this.camera, delta, this.player.Object3D.position.z);
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

    if (this.water) {
      const sunDir = this.sky ? this.sky.settings.sunDirection : null;
      const zenithCol = this.sky ? this.sky.settings.zenithColor : null;
      const horizonCol = this.sky ? this.sky.settings.horizonColor : null;

      this.water.update(delta, this.camera, sunDir, zenithCol, horizonCol);
    }

    this.player.update(delta, this.camera);
    if (this.npc1) this.npc1.update(delta, this.camera);
    if (this.npc2) this.npc2.update(delta, this.camera);
    if (this.npc3) this.npc3.update(delta, this.camera);

    const isDialogue = state.inDialogue;
    const targetFov = isDialogue ? 36 : 45;
    const targetYOffset = isDialogue ? this.camYOffset * 0.78 : this.camYOffset;
    const targetZOffset = isDialogue ? this.camZOffset * 0.78 : this.camZOffset;

    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 5.0 * delta);
    this.camera.updateProjectionMatrix();

    this.currentCamYOffset = THREE.MathUtils.lerp(this.currentCamYOffset, targetYOffset, 5.0 * delta);
    this.currentCamZOffset = THREE.MathUtils.lerp(this.currentCamZOffset, targetZOffset, 5.0 * delta);

    this.camera.position.x = this.player.Object3D.position.x;
    this.camera.position.y = this.player.Object3D.position.y - this.currentCamYOffset;
    this.camera.position.z = this.player.Object3D.position.z + this.currentCamZOffset;

    this.camera.lookAt(
      this.player.Object3D.position.x,
      this.player.Object3D.position.y,
      this.player.Object3D.position.z + this.camLookZOffset
    );

    ui.updateHUD(0, delta);

    if (state.interactingWithUI || state.inDialogue) {
      this.player.playAnimation("Idle_Stand");

      if (state.inDialogue) {
        this.handleDialogueInput();
      } else if (input.isKeyJustPressed("e") || input.isKeyJustPressed("escape")) {
        if (ui.panels && ui.panels.shopPanel && ui.panels.shopPanel.style.display === "block") {
          ui.closeShop();
        } else if (ui.panels && ui.panels.workshopPanel && ui.panels.workshopPanel.style.display === "block") {
          ui.closeWorkshop();
        } else if (ui.modals && ui.modals.summaryModal && ui.modals.summaryModal.style.display === "flex") {
          ui.hideRunSummaryModal();
        }
      }
      return;
    }

    const moveSpeed = 360;
    let isMoving = false;
    let targetX = this.player.Object3D.position.x;

    if (input.isKeyDown("a")) {
      targetX -= moveSpeed * delta;
      this.player.setFlipX(false);
      isMoving = true;
    } else if (input.isKeyDown("d")) {
      targetX += moveSpeed * delta;
      this.player.setFlipX(true);
      isMoving = true;
    }
    this.player.setLean(0);

    const { minX, maxX } = this.calculateCityBoundaries();
    this.player.Object3D.position.x = Math.max(minX, Math.min(maxX, targetX));

    if (isMoving) {
      this.player.playAnimation("WalkCycle");
    } else {
      this.player.playAnimation("Idle_Stand");
    }

    const isTouch = state.controlType === 'touch';
    let inTrigger = false;

    let leftExitX = minX + 220;
    let rightExitX = maxX - 220;

    if (this.exitTriggers.length > 0) {
      const sortedExits = [...this.exitTriggers].sort((a, b) => a.pos.x - b.pos.x);
      leftExitX = Math.max(leftExitX, sortedExits[0].pos.x + 80);
      rightExitX = Math.min(rightExitX, sortedExits[sortedExits.length - 1].pos.x - 80);
    }

    const playerX = this.player.Object3D.position.x;
    const nearExit = (playerX <= leftExitX) || (playerX >= rightExitX) || (this.exitTriggers.length > 0 && this.exitTriggers.some(t => this.isPlayerInTrigger(t, 120)));

    const nearWorkshop = this.workshopTriggers.length > 0
      ? this.workshopTriggers.some(t => this.isPlayerInTrigger(t, 85))
      : (playerX >= -50 && playerX <= 250);

    const nearShop = this.shopTriggers.length > 0
      ? this.shopTriggers.some(t => this.isPlayerInTrigger(t, 85))
      : (playerX >= 550 && playerX <= 850);

    const nearSalesman = this.isPlayerNearObject(this.npc1 ? this.npc1.Object3D.position : null, 120);
    const nearDummy = this.isPlayerNearObject(this.npc2 ? this.npc2.Object3D.position : null, 120);
    const nearBum = this.isPlayerNearObject(this.npc3 ? this.npc3.Object3D.position : null, 120);

    if (nearExit) {
      ui.showPrompt(isTouch ? t('promptTowerTouch') : t('promptTower'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        if (!state.equippedWings || state.equippedWings === "") {
          this.startDialogue("noWings");
        } else {
          this.manager.switchScene("Tower");
        }
      }
    } else if (nearWorkshop) {
      ui.showPrompt(isTouch ? t('promptWorkshopTouch') : t('promptWorkshop'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        ui.openWorkshop();
      }
    } else if (nearSalesman) {
      ui.showPrompt(isTouch ? t('promptSalesmanTouch') : t('promptSalesman'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        this.startDialogue("salesman");
      }
    } else if (nearShop) {
      ui.showPrompt(isTouch ? t('promptShopTouch') : t('promptShop'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        ui.openShop();
      }
    } else if (nearDummy) {
      ui.showPrompt(isTouch ? t('promptVillagerTouch') : t('promptVillager'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        this.startDialogue("dummy");
      }
    } else if (nearBum) {
      ui.showPrompt(isTouch ? t('promptBumTouch') : t('promptBum'));
      inTrigger = true;
      if (input.isKeyJustPressed("e")) {
        this.startDialogue("bum");
      }
    }

    if (!inTrigger) {
      ui.hidePrompt();
    }

    if (input.isKeyJustPressed("r") || input.isKeyJustPressed("t")) {
      if (!state.equippedWings || state.equippedWings === "") {
        this.startDialogue("noWings");
      } else {
        this.manager.switchScene("Tower");
      }
    }
  }

  startDialogue(npcKey) {
    this.currentDialogueNpc = npcKey;
    this.dialogueStep = 0;
    state.inDialogue = true;

    const currentLine = this.getDialogues()[npcKey][0];
    ui.showDialogue(currentLine.text, currentLine.portrait);
  }

  handleDialogueInput() {
    if (!state.inDialogue) return;

    if (input.isKeyJustPressed("e") || input.isKeyJustPressed("space") || input.isKeyJustPressed("enter")) {
      this.advanceDialogue();
    }
  }

  advanceDialogue() {
    if (ui.isTypewriterActive()) {
      ui.skipTypewriter();
      return;
    }

    this.dialogueStep++;
    const lines = this.getDialogues()[this.currentDialogueNpc];

    if (lines && this.dialogueStep < lines.length) {
      const line = lines[this.dialogueStep];
      ui.showDialogue(line.text, line.portrait);
    } else {
      const finishedNpc = this.currentDialogueNpc;
      state.inDialogue = false;
      ui.hideDialogue();

      if (finishedNpc === "intro" && !state.hasSeenTutorial) {
        state.hasSeenTutorial = true;
        ui.showTutorialModal();
      }
    }
  }

  destroy() {
    super.destroy();
    audio.stopChannel(1);

    if (this.workshopWingsSprite) {
      this.scene.remove(this.workshopWingsSprite);
      if (this.workshopWingsSprite.material) {
        this.workshopWingsSprite.material.dispose();
      }
      if (this.workshopWingsSprite.geometry) {
        this.workshopWingsSprite.geometry.dispose();
      }
      this.workshopWingsSprite = null;
    }

    if (this.wingsTextureCache) {
      this.wingsTextureCache.forEach((tex) => tex.dispose());
      this.wingsTextureCache.clear();
    }

    if (this.sky) {
      this.sky.destroy();
      this.sky = null;
    }
    if (this.water) {
      this.scene.remove(this.water.Object3D);
      this.water.destroy();
      this.water = null;
    }
    if (this.mixer) {
      this.mixer.stopAllAction();
      this.mixer = null;
    }

    state.inDialogue = false;
    ui.hidePrompt();
    ui.hideDialogue();
    ui.closeWorkshop();
    ui.closeShop();
    ui.hideRunSummaryModal();
    ui.fadeOutBlackScreen(300);
  }
}