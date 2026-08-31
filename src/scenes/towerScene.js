import * as THREE from 'three';
import { BaseScene } from './baseScene.js';
import { Player } from '../entities/player.js';
import { TowerGenerator } from '../entities/towerGenerator.js';
import { Drone } from '../entities/drone.js';
import { VolumetricSky } from '../shaders/skyShader.js';
import { input } from '../input.js';
import { audio } from '../audio.js';
import { state, RECIPES, debugUnlockAll, saveState } from '../state.js';
import { ui } from '../ui.js';
import { t } from '../localization.js';

const _tempVecRight = new THREE.Vector3();
const _tempVecUp = new THREE.Vector3();
const _tempVecForward = new THREE.Vector3();
const _tempOffsetWorld = new THREE.Vector3();
const _tempObstaclePos = new THREE.Vector3();
const _tempFlagWorldPos = new THREE.Vector3();
const _tempScreenVec = new THREE.Vector3();

export class TowerScene extends BaseScene {
  constructor(renderer, manager) {
    super(renderer, manager);

    this.player = null;
    this.sky = null;
    this.generator = null;

    this.activeDrone = null;
    this.hasSpawnedDroneThisRun = false;
    this.hasShownDroneEscapedText = false;

    this.ambientLight = null;
    this.hemiLight = null;
    this.dirLight = null;
    this.dirLightTarget = null;
    this.lightOffset = new THREE.Vector3(250, 450, 650);

    this.lastLightZStep = 0;

    this.isLockedOnFlag = false;
    this.flagLockPosition = null;
    this.flagState = null;
    this.shakeTimer = 0;
    this.cameraBoostTimer = 0;
    this.hasTakenOff = false;

    this.isCharging = false;
    this.chargeTimer = 0;
    this.maxChargeTime = 2.8;
    this.chargedFeathersCount = 0;

    this.flapBoostTimer = 0;

    this.isSkipLaunching = false;
    this.skipStartZ = 0;
    this.skipTargetZ = 0;
    this.skipTimer = 0;
    this.skipDuration = 1.0;

    this.isPostSkipGliding = false;

    this.glideTimeMax = 3.0;
    this.glideTimeRemaining = 3.0;
    this.isGliding = false;
    this.isFullFall = false;
    this.fullFallTimer = 0;
    this.hasTriggeredDefeat = false;
    this.hasReachedEnding = false;
    this.isDefeatPaused = false;
    this.defeatCamZOffset = 0;

    this.currentCamDistZ = 180;
    this.currentLookAheadZ = 100;

    this.runCoins = 0;
    this.runResources = {};
    this.runTotalItems = 0;
    this.runTime = 0;
    this.maxRunDistance = 0;

    this.animatingPickups = [];
    this.playedHeroMusic = false;
  }

  setupTowerLighting() {
    this.ambientLight = new THREE.AmbientLight(0xffe8d6, 1.5);
    this.scene.add(this.ambientLight);

    this.hemiLight = new THREE.HemisphereLight(0xfff4e0, 0x4a3b52, 1.0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfffaed, 2.0);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 1024;
    this.dirLight.shadow.mapSize.height = 1024;

    const d = 500;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 2500;
    this.dirLight.shadow.bias = -0.0003;
    this.dirLight.shadow.normalBias = 0.02;

    this.dirLightTarget = new THREE.Object3D();
    this.dirLightTarget.position.set(0, 275, 0);
    this.scene.add(this.dirLightTarget);

    this.dirLight.position.set(250, 725, 650);
    this.dirLight.target = this.dirLightTarget;

    this.scene.add(this.dirLight);
    this.scene.fog = new THREE.FogExp2(0xb1d1ef, 0.000015);
  }

  async init() {
    state.currentScene = "Tower";
    state.staminaCounter = state.wingsDurability;
    state.purpleFeathersCount = 0;
    state.cameraAngle = 0;
    state.distanceOffset = 275;
    this.hasTakenOff = false;

    this.isCharging = false;
    this.chargeTimer = 0;
    this.chargedFeathersCount = 0;
    this.flapBoostTimer = 0;
    this.isSkipLaunching = false;
    this.isPostSkipGliding = false;

    this.glideTimeRemaining = 3.0;
    this.isGliding = false;
    this.isFullFall = false;
    this.fullFallTimer = 0;
    this.hasTriggeredDefeat = false;
    this.hasReachedEnding = false;
    this.isDefeatPaused = false;
    this.defeatCamZOffset = 0;
    this.flagState = null;
    this.cameraBoostTimer = 0;

    this.currentCamDistZ = 180;
    this.currentLookAheadZ = 100;

    if (this.activeDrone) {
      this.activeDrone.dispose();
      this.activeDrone = null;
    }
    this.hasSpawnedDroneThisRun = false;
    this.hasShownDroneEscapedText = false;

    this.runCoins = 0;
    this.runResources = {};
    this.runTotalItems = 0;
    this.runTime = 0;
    this.maxRunDistance = 0;
    this.animatingPickups = [];
    this.playedHeroMusic = false;

    this.setupTowerLighting();

    this.sky = new VolumetricSky(this.scene);

    this.generator = new TowerGenerator(this.scene);
    await this.generator.loadModels();

    this.player = new Player();
    this.player.Object3D.position.set(0, 275, 78);
    this.scene.add(this.player.Object3D);

    this.generator.update(0);

    audio.playMusicOnChannel("444921__nomadape__wind-through-trees-loop.ogg", 7, true, 50);

    ui.updateHUD(0, 0.016);
    ui.hud.updateRunLootCounters(this.runCoins, this.runTotalItems);
    ui.updateReturnHint(this.hasTakenOff);
  }

  useFeather() {
    if (state.purpleFeathersCount > 0) {
      state.purpleFeathersCount -= 1;
    }
    state.staminaCounter -= 1;
  }

  recordRunSummary() {
    const items = {};
    if (this.runCoins > 0) {
      items.coin = this.runCoins;
    }
    for (const [k, v] of Object.entries(this.runResources)) {
      if (v > 0) {
        items[k] = v;
      }
    }

    state.lastRunSummary = {
      distance: Math.round(this.maxRunDistance),
      time: this.runTime,
      items
    };

    saveState();
  }

  update(delta) {
    super.update(delta);

    if (input.isKeyJustPressed("7")) {
      debugUnlockAll();
      audio.playSound("566196__scholzi982__press_button_01.wav", 80);
      ui.updateHUD();
    }

    if (input.isKeyJustPressed("8")) {
      state.showDebug = !state.showDebug;
    }

    if (!this.player) return;

    const playerObj = this.player.Object3D;

    state.distanceOffset = THREE.MathUtils.lerp(state.distanceOffset, 275, 1.5 * delta);

    const currentRecipe = RECIPES.find(r => r.codeName === state.equippedWings);
    const isPlayerSkipping = this.isCharging || this.isSkipLaunching || this.isPostSkipGliding;
    const canChargeSkip = currentRecipe && currentRecipe.tier >= 2 && currentRecipe.skipFeathers && !this.hasTakenOff && (state.staminaCounter > 0 || this.chargedFeathersCount > 0) && !this.isDefeatPaused && !this.isLockedOnFlag;

    if (!this.hasTakenOff) {
      if (canChargeSkip) {
        if (input.isKeyDown("space")) {
          this.chargeTimer += delta;

          if (this.chargeTimer >= 0.65) {
            this.isCharging = true;
            this.player.playAnimation("Glide");

            const skipTargetZ = currentRecipe.skipTargetZ || 25000;
            const maxSkipFeathers = currentRecipe.skipFeathers || 4;
            const currentZ = playerObj.position.z;
            const distToSkip = Math.max(0, skipTargetZ - currentZ);

            const heightPerFeather = distToSkip / maxSkipFeathers;
            const totalAvailableStamina = state.staminaCounter + this.chargedFeathersCount;
            const requiredFeathersForSkip = Math.min(totalAvailableStamina, maxSkipFeathers);

            const chargeProgress = Math.min(1.0, (this.chargeTimer - 0.65) / this.maxChargeTime);
            const targetFeathersToCharge = Math.max(1, Math.min(requiredFeathersForSkip, Math.ceil(chargeProgress * requiredFeathersForSkip)));

            if (targetFeathersToCharge > this.chargedFeathersCount && state.staminaCounter > 0) {
              const needed = targetFeathersToCharge - this.chargedFeathersCount;
              for (let k = 0; k < needed; k++) {
                if (state.staminaCounter > 0) {
                  this.useFeather();
                  this.chargedFeathersCount += 1;
                  ui.hud.triggerSingleSpiralFeather(playerObj, this.camera, this.chargedFeathersCount);
                  audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 45 + this.chargedFeathersCount * 10);
                }
              }
              ui.updateHUD(playerObj.position.z, delta);
            }

            ui.updateChargeBar(playerObj, this.camera, chargeProgress, this.chargedFeathersCount);

            if (chargeProgress >= 1.0) {
              const finalTargetZ = Math.min(skipTargetZ, Math.max(currentZ + 2000, currentZ + (this.chargedFeathersCount * heightPerFeather)));

              this.hasTakenOff = true;
              this.isCharging = false;
              this.chargeTimer = 0;

              this.isSkipLaunching = true;
              this.skipStartZ = currentZ;
              this.skipTargetZ = finalTargetZ;
              this.skipTimer = 0;
              this.skipDuration = Math.max(1.4, (finalTargetZ - currentZ) / 3400);

              state.distanceOffset = 430;
              this.player.playAnimation("Fly");

              ui.showWindEffect(this.skipDuration);
              audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 90);
              ui.hideChargeBar();
              ui.updateHUD(playerObj.position.z, delta);
              ui.updateReturnHint(this.hasTakenOff);
              this.chargedFeathersCount = 0;
            }
          }
        } else {
          if (this.isCharging) {
            if (this.chargedFeathersCount > 0) {
              state.staminaCounter += this.chargedFeathersCount;
              this.chargedFeathersCount = 0;
              ui.updateHUD(playerObj.position.z, delta);
            }

            this.isCharging = false;
            this.chargeTimer = 0;
            ui.hideChargeBar();
          } else if (input.isKeyJustReleased("space") && this.chargeTimer > 0 && this.chargeTimer < 0.65) {
            this.hasTakenOff = true;
            this.useFeather();

            this.flapBoostTimer = 0.16;
            this.player.playAnimation("Flap", true);

            this.isGliding = false;
            this.glideTimeRemaining = this.glideTimeMax;
            ui.hideGlideTimer();
            this.chargeTimer = 0;
            this.chargedFeathersCount = 0;

            audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 50);
            ui.updateHUD(playerObj.position.z, delta);
            ui.updateReturnHint(this.hasTakenOff);
          } else {
            this.chargeTimer = 0;
          }
        }
      } else {
        if (input.isKeyJustPressed("space") && state.staminaCounter > 0 && state.equippedWings !== "" && !this.isDefeatPaused) {
          this.hasTakenOff = true;
          this.useFeather();

          this.flapBoostTimer = 0.16;
          this.player.playAnimation("Flap", true);

          this.isGliding = false;
          this.glideTimeRemaining = this.glideTimeMax;
          ui.hideGlideTimer();

          audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 50);
          ui.updateHUD(playerObj.position.z, delta);
          ui.updateReturnHint(this.hasTakenOff);
        }
      }
    } else {
      if (this.isPostSkipGliding) {
        if ((input.isKeyJustPressed("space") || input.mouse.justDown) && !this.isDefeatPaused) {
          this.isPostSkipGliding = false;
          ui.hidePrompt();

          if (state.staminaCounter > 0) {
            this.useFeather();
            this.flapBoostTimer = 0.16;
            this.player.playAnimation("Flap", true);
            this.isGliding = false;
            this.glideTimeRemaining = this.glideTimeMax;
            ui.hideGlideTimer();
            audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 50);
          } else {
            this.player.currentJumpSpeed = -100;
          }
          ui.updateHUD(playerObj.position.z, delta);
        }
      } else if (input.isKeyJustPressed("space") && state.staminaCounter > 0 && !this.isLockedOnFlag && !this.isFullFall && !this.isDefeatPaused && !isPlayerSkipping) {
        this.useFeather();
        this.flapBoostTimer = 0.16;
        this.player.playAnimation("Flap", true);

        this.isGliding = false;
        this.glideTimeRemaining = this.glideTimeMax;
        ui.hideGlideTimer();

        audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 50);
        ui.updateHUD(playerObj.position.z, delta);
      }
    }

    if (this.isSkipLaunching) {
      this.skipTimer += delta;
      const tProgress = Math.min(1.0, this.skipTimer / this.skipDuration);

      const easeOut = 1.0 - Math.pow(1.0 - tProgress, 2.2);
      playerObj.position.z = this.skipStartZ + (this.skipTargetZ - this.skipStartZ) * easeOut;

      const currentVel = (2.2 * Math.pow(1.0 - tProgress, 1.2) * (this.skipTargetZ - this.skipStartZ)) / this.skipDuration;
      this.player.currentJumpSpeed = Math.max(state.wingsSpeed, currentVel);

      if (tProgress >= 1.0) {
        this.isSkipLaunching = false;
        this.isPostSkipGliding = true;
        this.player.currentJumpSpeed = -35;
        this.player.playAnimation("Glide");
        const promptTxt = state.controlType === 'touch' ? "TAP or Press SPACE to Fly" : "Press SPACE to Fly";
        ui.showPrompt(promptTxt);
      }
    } else if (this.isPostSkipGliding) {
      this.player.currentJumpSpeed = -35;
      this.player.playAnimation("Glide");
      playerObj.position.z += this.player.currentJumpSpeed * delta;
    }

    if (!this.hasTakenOff && !this.isCharging) {
      playerObj.position.set(0, state.distanceOffset, 78);
      this.player.currentJumpSpeed = 0;
      this.player.playAnimation("Idle_Stand");
      this.player.setLean(0);
    } else if (!this.isDefeatPaused) {
      this.runTime += delta;
    }

    const playerZ = playerObj.position.z;
    this.maxRunDistance = Math.max(this.maxRunDistance, playerZ);

    if (playerZ >= 100000 && playerZ < 145000 && !this.activeDrone && !this.hasSpawnedDroneThisRun && !this.isDefeatPaused && !isPlayerSkipping) {
      this.hasSpawnedDroneThisRun = true;
      this.activeDrone = new Drone(
        this.scene,
        new THREE.Vector3(playerObj.position.x, playerObj.position.y, playerObj.position.z - 150)
      );

      if (ui.hud && typeof ui.hud.showCenterNotification === 'function') {
        ui.hud.showCenterNotification(t('droneWarning'));
      }
    }

    if (playerZ >= 150000 && this.hasSpawnedDroneThisRun && !this.hasShownDroneEscapedText && !this.isDefeatPaused) {
      this.hasShownDroneEscapedText = true;
      if (ui.hud && typeof ui.hud.showCenterNotification === 'function') {
        ui.hud.showCenterNotification(t('droneEscaped'));
      }
    }

    if (this.activeDrone) {
      if (this.activeDrone.isDead) {
        this.activeDrone = null;
      } else {
        this.activeDrone.update(
          delta,
          this.player,
          this.camera,
          this.generator ? this.generator.activeCollectibles : [],
          isPlayerSkipping
        );

        const distToDrone = playerObj.position.distanceTo(this.activeDrone.group.position);
        if (distToDrone < 75 && !this.isDefeatPaused) {
          this.shakeTimer = 0.3;
          this.player.takeDamage(0.35);
          this.activeDrone.destroy();
          this.activeDrone = null;
        } else if (this.activeDrone.group.position.z - playerZ > 2000) {
          this.activeDrone.destroy();
          this.activeDrone = null;
        }
      }
    }

    if (this.generator) {
      this.generator.update(playerZ);

      const rotatedGears = new Set();
      for (const obstacle of this.generator.activeObstacles) {
        if (obstacle.userData && obstacle.userData.type === "gearTooth") {
          const parentGroup = obstacle.userData.parentGroup || obstacle.parent;
          if (parentGroup && !rotatedGears.has(parentGroup)) {
            rotatedGears.add(parentGroup);
            const speed = parentGroup.userData.rotSpeed || 0.8;
            parentGroup.rotation.z += speed * delta;
          }
        }
      }
    }

    if (this.sky) {
      this.sky.update(this.camera, delta, playerZ);
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

    if (this.dirLightTarget) {
      const zStep = Math.floor(playerZ / 300) * 300;
      if (zStep !== this.lastLightZStep) {
        this.lastLightZStep = zStep;
        this.dirLightTarget.position.z = zStep;
        this.dirLight.position.z = zStep + 650;
        this.dirLight.target.updateMatrixWorld();
      }
    }

    let cameraShakeX = 0;
    let cameraShakeY = 0;
    let cameraShakeZ = 0;
    if (this.shakeTimer > 0) {
      this.shakeTimer -= delta;
      cameraShakeX = (Math.random() - 0.5) * 6;
      cameraShakeY = (Math.random() - 0.5) * 6;
      cameraShakeZ = (Math.random() - 0.5) * 6;
    }

    if (this.flagState) {
      this.flagState.timer += delta;
      const tProgress = Math.min(1.0, this.flagState.timer / 0.65);

      const flagPos = this.flagState.flagPos;
      const swingAngle = tProgress * Math.PI * 2;

      this.player.setCustomRotation(-swingAngle);

      _tempVecRight.set(1, 0, 0).applyQuaternion(this.camera.quaternion);
      _tempVecUp.set(0, 1, 0).applyQuaternion(this.camera.quaternion);
      _tempVecForward.set(0, 0, -1).applyQuaternion(this.camera.quaternion);

      const handPivotOffset = 47;
      const rotRad = -swingAngle;

      const localX = -Math.sin(rotRad) * handPivotOffset;
      const localY = Math.cos(rotRad) * handPivotOffset;

      _tempOffsetWorld.set(0, 0, 0)
        .addScaledVector(_tempVecRight, localX)
        .addScaledVector(_tempVecUp, localY);

      playerObj.position.copy(flagPos).sub(_tempOffsetWorld).addScaledVector(_tempVecForward, -3);

      if (tProgress < 0.70) {
        if (this.flagState.phase !== "swing") {
          this.flagState.phase = "swing";
          this.player.playAnimation("SpinSwing");
        }
      } else {
        if (this.flagState.phase !== "vault") {
          this.flagState.phase = "vault";
          this.player.playAnimation("SpinLaunch");
        }
      }

      if (this.flagState.timer >= 0.65) {
        this.isLockedOnFlag = false;
        this.flagLockPosition = null;

        this.player.setCustomRotation(null);

        this.player.currentJumpSpeed = state.wingsSpeed * 1.25;
        this.player.playAnimation("Fly");

        this.cameraBoostTimer = 0.35;
        this.shakeTimer = 0.05;

        audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 85);
        ui.showWindEffect(0.5);

        this.flagState = null;
      }
    }

    if (this.hasTakenOff && !this.isLockedOnFlag && !this.isDefeatPaused) {
      playerObj.position.x = Math.cos(state.cameraAngle + Math.PI / 2) * state.distanceOffset;
      playerObj.position.y = Math.sin(state.cameraAngle + Math.PI / 2) * state.distanceOffset;

      const speedFactor = Math.pow(Math.max(100, this.player.currentJumpSpeed), 0.65);
      const deltaAngleRad = THREE.MathUtils.degToRad(speedFactor) * delta;

      if (input.isKeyDown("a")) {
        state.cameraAngle -= deltaAngleRad;
        this.player.setLean(-1);
      } else if (input.isKeyDown("d")) {
        state.cameraAngle += deltaAngleRad;
        this.player.setLean(1);
      } else {
        this.player.setLean(0);
      }
    } else if (this.flagLockPosition && !this.flagState) {
      playerObj.position.copy(this.flagLockPosition);
      this.player.currentJumpSpeed = 0;
    }

    if (this.hasTakenOff && !this.isLockedOnFlag && !this.isSkipLaunching && !this.isPostSkipGliding) {
      if (!this.isDefeatPaused) {
        const dragMult = currentRecipe ? (currentRecipe.dragFactor || 1.0) : 1.0;
        const threshold = 700;

        if (this.flapBoostTimer > 0) {
          this.flapBoostTimer -= delta;
          this.player.currentJumpSpeed = THREE.MathUtils.lerp(this.player.currentJumpSpeed, state.wingsSpeed, 14 * delta);
        } else {
          if (this.player.currentJumpSpeed > threshold) {
            this.player.currentJumpSpeed -= (35 * dragMult + this.player.currentFallSpeed) * delta;
          } else {
            this.player.currentJumpSpeed -= (205 * dragMult + this.player.currentFallSpeed) * delta;
          }
        }

        const isDescending = (this.player.currentJumpSpeed <= 0 && this.flapBoostTimer <= 0);

        if (isDescending && !this.isFullFall) {
          this.player.isFlapping = false;
          this.isGliding = true;

          this.player.currentJumpSpeed = Math.max(-180, this.player.currentJumpSpeed);
          this.player.playAnimation("Glide");

          this.glideTimeRemaining -= delta;
          ui.updateGlideTimer(playerObj, this.camera, this.glideTimeRemaining, this.glideTimeMax);

          if (this.glideTimeRemaining <= 0) {
            this.isGliding = false;
            this.isFullFall = true;
            this.fullFallTimer = 0;
            ui.hideGlideTimer();
          }
        } else if (this.isFullFall) {
          this.player.currentJumpSpeed -= 400 * delta;
          this.player.playAnimation("Fall");
          this.fullFallTimer += delta;
        } else {
          this.isGliding = false;
          ui.hideGlideTimer();
          if (!this.player.isFlapping && this.hasTakenOff && !this.isFullFall) {
            this.player.playAnimation("Fly");
          }
        }

        playerObj.position.z += this.player.currentJumpSpeed * delta;
      }
    }

    if (this.isFullFall) {
      this.defeatCamZOffset = THREE.MathUtils.lerp(this.defeatCamZOffset, -140, 3.2 * delta);
    } else {
      this.defeatCamZOffset = THREE.MathUtils.lerp(this.defeatCamZOffset, 0, 5.0 * delta);
    }

    const speedRatio = Math.max(-0.5, Math.min(1.0, this.player.currentJumpSpeed / (state.wingsSpeed || 1200)));

    const isDroneActive = this.activeDrone && !this.activeDrone.isDead;
    const targetFOV = 42 + speedRatio * 10 + (isDroneActive ? 16 : 0);

    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFOV, 8 * delta);
    this.camera.updateProjectionMatrix();

    let camDistXY = 520;
    if (this.isCharging) {
      const chargePct = Math.min(1.0, (this.chargeTimer - 0.65) / this.maxChargeTime);
      camDistXY = THREE.MathUtils.lerp(520, 400, chargePct);
    } else if (this.isSkipLaunching) {
      const t = Math.min(1.0, this.skipTimer / this.skipDuration);
      if (t < 0.5) {
        camDistXY = THREE.MathUtils.lerp(520, 460, t * 2);
      } else {
        const endZoomT = (t - 0.5) * 2;
        camDistXY = THREE.MathUtils.lerp(460, 310, Math.sin(endZoomT * Math.PI * 0.5));
      }
    } else if (this.isPostSkipGliding) {
      camDistXY = 330;
    }

    const targetCamDistZ = isDroneActive ? 140 : 180;
    const targetLookAheadZ = isDroneActive ? 70 : 100;

    this.currentCamDistZ = THREE.MathUtils.lerp(this.currentCamDistZ, targetCamDistZ, 3.5 * delta);
    this.currentLookAheadZ = THREE.MathUtils.lerp(this.currentLookAheadZ, targetLookAheadZ, 3.5 * delta);

    const camTargetPos = (this.flagState ? this.flagState.flagPos : playerObj.position);

    const angleForCam = state.cameraAngle + Math.PI / 2;
    const targetCamX = camTargetPos.x + Math.cos(angleForCam) * camDistXY + cameraShakeX;
    const targetCamY = camTargetPos.y + Math.sin(angleForCam) * camDistXY + cameraShakeY;
    const targetCamZ = camTargetPos.z + this.currentCamDistZ + cameraShakeZ + this.defeatCamZOffset;

    let followSpeed = 10;
    if (this.cameraBoostTimer > 0) {
      this.cameraBoostTimer -= delta;
      followSpeed = 3.5;
    }

    if (!this.isDefeatPaused) {
      this.camera.position.x = THREE.MathUtils.lerp(this.camera.position.x, targetCamX, followSpeed * delta);
      this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetCamY, followSpeed * delta);
      this.camera.position.z = THREE.MathUtils.lerp(this.camera.position.z, targetCamZ, followSpeed * delta);

      this.camera.lookAt(
        camTargetPos.x,
        camTargetPos.y,
        camTargetPos.z + this.currentLookAheadZ + this.defeatCamZOffset
      );
    }

    if (this.isFullFall && this.fullFallTimer >= 0.65 && !this.hasTriggeredDefeat) {
      this.hasTriggeredDefeat = true;
      this.isDefeatPaused = true;
      this.player.currentJumpSpeed = 0;

      ui.showRetryModal(
        () => {
          this.manager.switchScene("Tower");
        },
        () => {
          this.recordRunSummary();
          this.manager.switchScene("City", t('defeatMessage'), true);
        }
      );
    }

    for (let i = this.animatingPickups.length - 1; i >= 0; i--) {
      const p = this.animatingPickups[i];
      p.timer += delta;
      const progress = Math.min(1.0, p.timer / p.duration);

      if (p.spriteObj) {
        const scalePop = 1.0 + Math.sin(progress * Math.PI) * 0.55;
        p.spriteObj.scale.set(scalePop, scalePop, scalePop);
        p.spriteObj.position.z += 220 * delta;

        if (p.spriteObj.userData && p.spriteObj.userData.sprite) {
          p.spriteObj.userData.sprite.material.opacity = Math.max(0, 1.0 - Math.pow(progress, 1.5));
          p.spriteObj.userData.sprite.update(delta, this.camera);
        }
      }

      if (progress >= 1.0) {
        if (p.spriteObj && p.spriteObj.parent) {
          p.spriteObj.parent.remove(p.spriteObj);
        }
        this.animatingPickups.splice(i, 1);
      }
    }

    if (this.generator) {
      for (const item of this.generator.activeCollectibles) {
        if (item.userData && item.userData.sprite && !item.userData.pickingUp) {
          item.userData.sprite.update(delta, this.camera);
        }
      }
    }

    let calculatedTier = 1;
    if (playerZ >= 145000) calculatedTier = 4;
    else if (playerZ >= 110000) calculatedTier = 3;
    else if (playerZ >= 80000) calculatedTier = 2.5;
    else if (playerZ >= 50000) calculatedTier = 2;
    else if (playerZ >= 25000) calculatedTier = 1.5;
    else calculatedTier = 1;

    if (calculatedTier > state.currentTier) {
      state.currentTier = calculatedTier;
      saveState();
    }

    if (this.generator && !this.isDefeatPaused && !this.isSkipLaunching && !this.isCharging && !this.isPostSkipGliding) {
      for (const obstacle of [...this.generator.activeObstacles]) {
        const pPos = playerObj.position;
        obstacle.getWorldPosition(_tempObstaclePos);

        const dist = pPos.distanceTo(_tempObstaclePos);
        if (dist < 80) {
          this.shakeTimer = 0.25;
          this.player.currentJumpSpeed = 0;
          this.player.takeDamage(0.45);
          audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 40);

          if (obstacle.parent && obstacle.userData.type === "gearTooth") {
            obstacle.parent.remove(obstacle);
          } else {
            this.scene.remove(obstacle);
          }
          this.generator.activeObstacles = this.generator.activeObstacles.filter(o => o !== obstacle);
        }
      }

      for (const item of [...this.generator.activeCollectibles]) {
        if (item.userData && item.userData.pickingUp) continue;

        const dist = playerObj.position.distanceTo(item.position);
        if (dist < 110) {
          item.userData.pickingUp = true;

          _tempScreenVec.copy(item.position).project(this.camera);
          const screenX = (_tempScreenVec.x * 0.5 + 0.5) * 640;
          const screenY = (-_tempScreenVec.y * 0.5 + 0.5) * 480;

          const itemType = item.userData.type;

          if (itemType === "coin") {
            state.inventory.coin += 1;
            this.runCoins += 1;
            audio.playSound("847340__ilyashevelev__coin-010.mp3", 60);
            ui.hud.triggerLootPickupUI("coin", screenX, screenY);
          } else if (itemType === "resource") {
            const resKey = item.userData.itemType;
            state.inventory[resKey] = (state.inventory[resKey] || 0) + 1;
            this.runResources[resKey] = (this.runResources[resKey] || 0) + 1;
            this.runTotalItems += 1;
            audio.playSound("557401__jarhead123__leather-bag-cloth-movement-5.wav", 60);
            ui.hud.triggerLootPickupUI("item", screenX, screenY);
          } else if (itemType === "rune") {
            const maxStam = state.wingsDurability || 4;
            if (state.staminaCounter < maxStam) {
              state.staminaCounter += 1;
            }
            state.purpleFeathersCount = Math.min(state.staminaCounter, (state.purpleFeathersCount || 0) + 1);
            this.runTotalItems += 1;
            audio.playSound("336579__anthousai__coins-in-cloth-05.wav", 80);
            ui.hud.triggerLootPickupUI("rune", screenX, screenY);
          }

          saveState();

          this.animatingPickups.push({
            spriteObj: item,
            timer: 0,
            duration: 0.22
          });

          this.generator.activeCollectibles = this.generator.activeCollectibles.filter(i => i !== item);
          ui.hud.updateRunLootCounters(this.runCoins, this.runTotalItems);
          ui.updateHUD(playerZ, delta);
        }
      }

      for (const flag of [...this.generator.activeFlags]) {
        if (flag.userData && flag.userData.used) continue;

        flag.getWorldPosition(_tempFlagWorldPos);

        const dist = playerObj.position.distanceTo(_tempFlagWorldPos);
        if (dist < 110 && !this.isLockedOnFlag && !this.flagState) {
          this.isLockedOnFlag = true;
          flag.userData.used = true;

          state.staminaCounter = Math.min(state.wingsDurability, state.staminaCounter + 1);

          this.isGliding = false;
          this.isFullFall = false;
          this.glideTimeRemaining = this.glideTimeMax;
          ui.hideGlideTimer();

          this.flagLockPosition = _tempFlagWorldPos.clone();
          playerObj.position.copy(this.flagLockPosition);

          this.player.currentJumpSpeed = 0;

          audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 50);

          this.flagState = {
            timer: 0,
            phase: "swing",
            flagPos: _tempFlagWorldPos.clone(),
            flagObj: flag
          };

          this.player.playAnimation("SpinSwing", true);
          ui.updateHUD(playerZ, delta);
          break;
        }
      }
    }

    if (playerZ > 500 && !this.playedHeroMusic) {
      this.playedHeroMusic = true;
      audio.playMusicOnChannel("Damiano Baldoni - Celtic Warrior.mp3", 18, true, 40);
    }

    if (playerZ >= 220000 && !this.hasReachedEnding && !state.endlessUnlocked) {
      this.hasReachedEnding = true;
      this.recordRunSummary();

      ui.hideAlerts();
      ui.hideGlideTimer();
      ui.hideChargeBar();
      ui.hidePrompt();

      ui.fadeInBlackScreen(600, () => {
        this.manager.switchScene("EndingCutscene", "", false, false);
      });
    }

    if (!this.hasTakenOff && !this.isCharging) {
      if (input.isKeyJustPressed("t")) {
        this.recordRunSummary();
        this.manager.switchScene("City");
      } else if (input.isKeyJustPressed("r")) {
        this.manager.switchScene("Tower");
      }
    }

    this.player.update(delta, this.camera);
    ui.updateHUD(playerZ, delta);
    ui.updateReturnHint(this.hasTakenOff);
    ui.updateTowerProgressBar(playerZ);

    if (this.generator) {
      const obstacles = [...this.generator.activeObstacles];
      if (this.activeDrone && !this.activeDrone.isDead) {
        obstacles.push(this.activeDrone.group);
      }
      ui.updateTowerAlerts(
        playerObj,
        this.camera,
        obstacles,
        this.generator.activeCollectibles,
        this.generator.activeFlags
      );
    }
  }

  destroy() {
    super.destroy();
    audio.stopChannel(7);
    audio.stopChannel(18);
    ui.hideAlerts();
    ui.hideGlideTimer();
    ui.hideChargeBar();
    ui.hidePrompt();
    ui.hideRetryModal();
    ui.updateReturnHint(true);
    ui.updateTowerProgressBar(0);
    this.animatingPickups = [];

    if (this.activeDrone) {
      this.activeDrone.dispose();
      this.activeDrone = null;
    }
  }
}