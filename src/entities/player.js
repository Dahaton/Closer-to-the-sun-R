import * as THREE from 'three';
import { BillboardSprite } from './billboardSprite.js';
import { state } from '../state.js';

const _tempCamDir = new THREE.Vector3();

const PLAYER_ANIMATIONS = {
  Fly: {
    files: [
      "player/idle_anim5.png",
      "player/idle_anim6.png",
      "player/idle_anim7.png",
      "player/idle_anim8.png"
    ],
    frameDuration: 0.08,
    loop: true
  },
  Flap: {
    files: [
      "player/flop_anim1.png",
      "player/flop_anim2.png",
      "player/flop_anim3.png"
    ],
    frameDuration: 0.12,
    loop: false
  },
  Glide: {
    files: ["player/flop_anim1.png"],
    frameDuration: 0.1,
    loop: true
  },
  Fall: {
    files: ["player/falling_anim.png"],
    frameDuration: 0.08,
    loop: true
  },
  Idle_Stand: {
    files: [
      "player/Sprite-0007.png",
      "player/Sprite-0008.png",
      "player/Sprite-0009.png",
      "player/Sprite-0010.png"
    ],
    frameDuration: 0.25,
    loop: true
  },
  WalkCycle: {
    files: [
      "player/walk_anim9.png",
      "player/walk_anim10.png",
      "player/walk_anim11.png",
      "player/walk_anim12.png",
      "player/walk_anim13.png",
      "player/walk_anim14.png",
      "player/walk_anim15.png",
      "player/walk_anim16.png"
    ],
    frameDuration: 0.16,
    loop: true
  },
  SpinSwing: {
    files: ["player/spinning_anim1.png"],
    frameDuration: 0.1,
    loop: true
  },
  SpinLaunch: {
    files: ["player/spinning_anim2.png"],
    frameDuration: 0.1,
    loop: true
  },
  FlagPole: {
    files: ["player/spinning_anim1.png"],
    frameDuration: 0.1,
    loop: true
  },
  Damage: {
    files: ["player/damage_anim.png"],
    frameDuration: 0.08,
    loop: true
  },
  StandUp: {
    files: ["player/standing_up_anim.png"],
    frameDuration: 0.08,
    loop: false
  },
  Rest: {
    files: [
      "player/rest_anim1.png",
      "player/rest_anim2.png",
      "player/rest_anim3.png",
      "player/rest_anim4.png"
    ],
    frameDuration: 0.28,
    loop: true
  }
};

export const WINGS_FILES = {
  WoodenWings: ["wings/wooden_wings1.png", "wings/wooden_wings2.png", "wings/wooden_wings3.png", "wings/wooden_wings4.png"],
  SteelWings: ["wings/steel_wings1.png", "wings/steel_wings2.png", "wings/steel_wings3.png", "wings/steel_wings4.png"],
  DurableSteelWings: ["wings/durable_steel_wings1.png", "wings/durable_steel_wings2.png", "wings/durable_steel_wings3.png", "wings/durable_steel_wings4.png"],
  SuperSteelWings: ["wings/super_steel_wings1.png", "wings/super_steel_wings2.png", "wings/super_steel_wings3.png", "wings/super_steel_wings4.png"],
  SuperDurableSteelWings: ["wings/super_durable_steel_wings1.png", "wings/super_durable_steel_wings2.png", "wings/super_durable_steel_wings3.png", "wings/super_durable_steel_wings4.png"],
  EnchantedWings: ["wings/fast_tier2_wings1.png", "wings/fast_tier2_wings2.png", "wings/fast_tier2_wings3.png", "wings/fast_tier2_wings4.png"],
  DurableEnchantedWings: ["wings/heavy_tier2_wings1.png", "wings/heavy_tier2_wings2.png", "wings/heavy_tier2_wings3.png", "wings/heavy_tier2_wings4.png"],
  SuperEnchantedWings: ["wings/fast_tier2.5_wings1.png", "wings/fast_tier2.5_wings2.png", "wings/fast_tier2.5_wings3.png", "wings/fast_tier2.5_wings4.png"],
  SuperDurableEnchantedWings: ["wings/heavy_tier2.5_wings1.png", "wings/heavy_tier2.5_wings2.png", "wings/heavy_tier2.5_wings3.png", "wings/heavy_tier2.5_wings4.png"],
  MythrilWings: ["wings/fast_tier3_wings1.png", "wings/fast_tier3_wings2.png", "wings/fast_tier3_wings3.png", "wings/fast_tier3_wings4.png"],
  DurableMythrilWings: ["wings/heavy_tier3_wings1.png", "wings/heavy_tier3_wings2.png", "wings/heavy_tier3_wings3.png", "wings/heavy_tier3_wings4.png"],
  WaxWings: ["wings/wax_wings1.png", "wings/wax_wings2.png", "wings/wax_wings3.png", "wings/wax_wings4.png"]
};

export class Player {
  constructor() {
    this.group = new THREE.Group();

    this.bodySprite = new BillboardSprite(PLAYER_ANIMATIONS, 160, 128);
    this.bodySprite.mesh.castShadow = true;
    this.bodySprite.mesh.receiveShadow = false;
    this.bodySprite.mesh.renderOrder = 10;
    this.group.add(this.bodySprite.Object3D);

    this.wingsSprite = null;
    this.currentWingsCodeName = "";

    this.currentJumpSpeed = 0;
    this.currentFallSpeed = 0;
    this.isJumping = false;
    this.canJump = true;

    this.isFlapping = false;
    this.flapTimer = 0;

    this.isDamaged = false;
    this.damageTimer = 0;
    this.damageShakeStep = 0;
    this.currentDamageShakeX = 0;
    this.currentDamageShakeZ = 0;

    this.targetTilt = 0;
    this.currentTilt = 0;
    this.customRotation = null;

    this.playAnimation("Idle_Stand");
    this.syncEquippedWings();
  }

  takeDamage(duration = 0.45) {
    this.isDamaged = true;
    this.damageTimer = duration;
    this.damageShakeStep = 0;
    this.playAnimation("Damage", true);
  }

  setCustomRotation(rad) {
    this.customRotation = rad;
    this.bodySprite.setCustomRotation(rad);
    if (this.wingsSprite) {
      this.wingsSprite.setCustomRotation(rad);
    }
  }

  setLean(dir) {
    this.targetTilt = dir * -0.07;
    if (this.customRotation === null) {
      this.bodySprite.setCustomRotation(this.currentTilt);
      if (this.wingsSprite) {
        this.wingsSprite.setCustomRotation(this.currentTilt);
      }
    }
  }

  playAnimation(animName, restart = false) {
    if (this.isDamaged && animName !== "Damage" && animName !== "Fall") {
      return;
    }

    if (animName === "Flap") {
      this.isFlapping = true;
      this.flapTimer = 0.32;
    }

    this.bodySprite.playAnimation(animName, restart);

    if (this.wingsSprite) {
      if (animName === "Flap") {
        this.wingsSprite.playAnimation("Flop", true);
      } else {
        this.wingsSprite.playAnimation("Idle", restart);
      }
    }
  }

  setFlipX(flip) {
    this.bodySprite.setFlipX(flip);
    if (this.wingsSprite) {
      this.wingsSprite.setFlipX(flip);
    }
  }

  equipWings(codeName) {
    if (!codeName || !WINGS_FILES[codeName]) {
      if (this.wingsSprite) {
        this.group.remove(this.wingsSprite.Object3D);
        this.wingsSprite = null;
      }
      this.currentWingsCodeName = "";
      return;
    }

    if (this.currentWingsCodeName === codeName && this.wingsSprite) return;

    if (this.wingsSprite) {
      this.group.remove(this.wingsSprite.Object3D);
    }

    const wingAnimConfig = {
      Flop: {
        files: WINGS_FILES[codeName],
        frameDuration: 0.08,
        loop: false
      },
      Idle: {
        files: [WINGS_FILES[codeName][0]],
        frameDuration: 0.08,
        loop: true
      }
    };

    this.wingsSprite = new BillboardSprite(wingAnimConfig, 160, 128);
    this.wingsSprite.mesh.castShadow = true;
    this.wingsSprite.mesh.receiveShadow = false;
    this.wingsSprite.mesh.renderOrder = 1;

    this.group.add(this.wingsSprite.Object3D);
    this.wingsSprite.playAnimation("Idle");

    this.currentWingsCodeName = codeName;
  }

  syncEquippedWings() {
    this.equipWings(state.equippedWings);
  }

  applyWingsMeltingEffect(progress) {
    if (!this.wingsSprite || !this.wingsSprite.material) return;

    const mat = this.wingsSprite.material;
    const mesh = this.wingsSprite.mesh;

    const p = Math.max(0, Math.min(1, progress));

    if (mat.color) {
      const r = 1.0;
      const g = THREE.MathUtils.lerp(1.0, 0.45, p);
      const b = THREE.MathUtils.lerp(1.0, 0.1, p);
      mat.color.setRGB(r, g, b);
    }

    if (mat.emissive) {
      mat.emissive.setRGB(p * 0.8, p * 0.25, 0.0);
    }

    const scaleX = 1.0 - p * 0.75;
    const scaleY = 1.0 + p * 0.4;
    mesh.scale.set(this.bodySprite.flipX ? -scaleX : scaleX, scaleY, 1.0);

    mat.opacity = Math.max(0, 1.0 - p * 0.95);
  }

  resetWingsMeltingEffect() {
    if (!this.wingsSprite || !this.wingsSprite.material) return;
    const mat = this.wingsSprite.material;
    if (mat.color) mat.color.setHex(0xffffff);
    if (mat.emissive) mat.emissive.setHex(0x000000);
    mat.opacity = 1.0;
    if (this.wingsSprite.mesh) {
      this.wingsSprite.mesh.scale.set(1, 1, 1);
    }
  }

  playWingFlop() {
    this.playAnimation("Flap", true);
  }

  playWingIdle() {
    if (this.wingsSprite) {
      this.wingsSprite.playAnimation("Idle");
    }
  }

  update(delta, camera = null) {
    if (this.customRotation === null) {
      this.currentTilt = THREE.MathUtils.lerp(this.currentTilt, this.targetTilt, 6 * delta);
      this.bodySprite.setCustomRotation(this.currentTilt);
      if (this.wingsSprite) {
        this.wingsSprite.setCustomRotation(this.currentTilt);
      }
    }

    this.bodySprite.update(delta, camera);

    if (this.isDamaged) {
      this.damageTimer -= delta;
      this.damageShakeStep += delta;

      if (this.damageShakeStep >= 0.05) {
        this.damageShakeStep = 0;
        this.currentDamageShakeX = (Math.random() - 0.5) * 6;
        this.currentDamageShakeZ = (Math.random() - 0.5) * 6;
      }

      this.bodySprite.mesh.position.set(this.currentDamageShakeX, 0, this.currentDamageShakeZ);
      if (this.wingsSprite && this.wingsSprite.mesh) {
        this.wingsSprite.mesh.position.set(this.currentDamageShakeX, 0, this.currentDamageShakeZ);
      }

      if (this.damageTimer <= 0) {
        this.isDamaged = false;
        this.damageShakeStep = 0;
        this.currentDamageShakeX = 0;
        this.currentDamageShakeZ = 0;
        this.bodySprite.mesh.position.set(0, 0, 0);
        if (this.wingsSprite && this.wingsSprite.mesh) {
          this.wingsSprite.mesh.position.set(0, 0, 0);
        }
      }
    }

    if (this.isFlapping) {
      this.flapTimer -= delta;
      if (this.flapTimer <= 0) {
        this.isFlapping = false;
      }
    }

    if (this.wingsSprite) {
      const currentAnimName = this.bodySprite.currentAnim;

      const isFlyingAnim = (
        currentAnimName === "Fly" ||
        currentAnimName === "Flap" ||
        currentAnimName === "Glide" ||
        currentAnimName === "Damage"
      );

      this.wingsSprite.Object3D.visible = isFlyingAnim;

      if (camera) {
        _tempCamDir.subVectors(this.group.position, camera.position);
        if (_tempCamDir.lengthSq() > 0.001) {
          _tempCamDir.normalize().multiplyScalar(2.5);
          this.wingsSprite.Object3D.position.copy(_tempCamDir);
        }
      }

      this.wingsSprite.update(delta, camera);
    }
  }

  get Object3D() {
    return this.group;
  }
}