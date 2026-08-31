import * as THREE from 'three';
import { BillboardSprite } from './billboardSprite.js';
import { audio } from '../audio.js';

const DRONE_ANIMATIONS = {
  Fly: {
    files: [
      "Drone/Drone1.png",
      "Drone/Drone2.png",
      "Drone/Drone3.png"
    ],
    frameDuration: 0.1,
    loop: true
  },
  Charge: {
    files: [
      "Drone/Charging1.png",
      "Drone/Charging2.png",
      "Drone/Charging3.png"
    ],
    frameDuration: 0.07,
    loop: true
  }
};

const textureLoader = new THREE.TextureLoader();

export class Drone {
  constructor(scene, initialPosition) {
    this.scene = scene;
    this.group = new THREE.Group();

    if (initialPosition) {
      this.group.position.copy(initialPosition);
    }

    this.sprite = new BillboardSprite(DRONE_ANIMATIONS, 128, 64);
    this.sprite.playAnimation("Fly");
    this.sprite.mesh.renderOrder = 15;
    this.sprite.mesh.frustumCulled = false;
    this.group.add(this.sprite.Object3D);

    this.light = new THREE.PointLight(0x4adfd9, 45.0, 900);
    this.light.decay = 1.0;
    this.light.position.set(0, 0, 20);
    this.group.add(this.light);

    const laserTexture = textureLoader.load("assets/Drone/laser.png");
    laserTexture.magFilter = THREE.NearestFilter;
    laserTexture.minFilter = THREE.NearestFilter;
    laserTexture.colorSpace = THREE.SRGBColorSpace;

    const laserGeo = new THREE.PlaneGeometry(52, 3500);
    laserGeo.translate(0, 1750, 0);

    this.laserMat = new THREE.MeshBasicMaterial({
      map: laserTexture,
      transparent: true,
      alphaTest: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false,
      depthTest: true
    });

    this.laserMesh = new THREE.Mesh(laserGeo, this.laserMat);
    this.laserMesh.renderOrder = 14;
    this.laserMesh.frustumCulled = false;
    this.laserMesh.visible = false;
    this.group.add(this.laserMesh);

    this.group.frustumCulled = false;
    this.scene.add(this.group);

    this.state = 'APPROACH';
    this.stateTimer = 0;
    this.chargeDuration = 0.9;
    this.lockOnTime = 0.65;
    this.fireDuration = 0.45;
    this.followDuration = 2.2;

    this.lockedX = 0;
    this.lockedY = 0;
    this.isLockedOn = false;
    this.isDead = false;
    this.hasDealtDamage = false;
  }

  update(delta, player, camera, activeCollectibles = [], isSkipping = false) {
    if (this.isDead || !player) return;

    const playerObj = player.Object3D;
    const playerPos = playerObj.position;

    this.sprite.update(delta, camera);

    if (camera && this.laserMesh.visible) {
      this.laserMesh.quaternion.copy(camera.quaternion);
    }

    if (isSkipping && (this.state === 'FOLLOW' || this.state === 'CHARGING')) {
      this.state = 'APPROACH';
      this.stateTimer = 0;
      this.laserMesh.visible = false;
      this.sprite.playAnimation("Fly");
    }

    this.stateTimer += delta;

    const targetZ = playerPos.z - 150;
    this.group.position.z = THREE.MathUtils.lerp(this.group.position.z, targetZ, 25.0 * delta);

    switch (this.state) {
      case 'APPROACH': {
        this.sprite.playAnimation("Fly");
        this.laserMesh.visible = false;

        this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, playerPos.x, 4.5 * delta);
        this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, playerPos.y, 4.5 * delta);

        const distXY = Math.hypot(playerPos.x - this.group.position.x, playerPos.y - this.group.position.y);
        if (distXY < 50 || this.stateTimer >= 2.5) {
          this.state = 'FOLLOW';
          this.stateTimer = 0;
        }
        break;
      }

      case 'FOLLOW': {
        this.sprite.playAnimation("Fly");
        this.laserMesh.visible = false;
        if (this.light) this.light.intensity = 45.0;

        this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, playerPos.x, 6.0 * delta);
        this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, playerPos.y, 6.0 * delta);

        if (this.stateTimer >= this.followDuration && !isSkipping) {
          this.state = 'CHARGING';
          this.stateTimer = 0;
          this.isLockedOn = false;
          this.sprite.playAnimation("Charge", true);
          audio.playSound("freesound_community-fast-simple-chop-5-6270.mp3", 40, 1.4);
        }
        break;
      }

      case 'CHARGING': {
        if (this.light) {
          this.light.intensity = 45.0 + Math.sin(this.stateTimer * 25) * 20.0;
        }

        if (this.stateTimer < this.lockOnTime) {
          this.group.position.x = THREE.MathUtils.lerp(this.group.position.x, playerPos.x, 8.0 * delta);
          this.group.position.y = THREE.MathUtils.lerp(this.group.position.y, playerPos.y, 8.0 * delta);
        } else {
          if (!this.isLockedOn) {
            this.isLockedOn = true;
            this.lockedX = this.group.position.x;
            this.lockedY = this.group.position.y;
          }

          const shakeX = (Math.random() - 0.5) * 5;
          const shakeY = (Math.random() - 0.5) * 5;

          this.group.position.x = this.lockedX + shakeX;
          this.group.position.y = this.lockedY + shakeY;
        }

        if (this.stateTimer >= this.chargeDuration) {
          this.state = 'FIRING';
          this.stateTimer = 0;
          this.hasDealtDamage = false;
          this.laserMesh.visible = true;
          audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 65, 1.8);
        }
        break;
      }

      case 'FIRING': {
        this.group.position.x = this.lockedX;
        this.group.position.y = this.lockedY;

        if (this.light) this.light.intensity = 70.0;

        if (!this.hasDealtDamage && !player.isDamaged) {
          const dX = playerPos.x - this.group.position.x;
          const dY = playerPos.y - this.group.position.y;
          const distXY = Math.hypot(dX, dY);
          const dZ = playerPos.z - this.group.position.z;

          if (distXY < 46 && dZ >= -20 && dZ <= 3200) {
            this.hasDealtDamage = true;
            player.takeDamage(0.45);
            player.currentJumpSpeed = 0;
            audio.playSound("631485__newlocknew__rockbrk_stone-hitshattering-into-fragments_em_7lrs.wav", 80);
          }
        }

        if (this.stateTimer >= this.fireDuration) {
          this.laserMesh.visible = false;

          if (playerPos.z >= 145000) {
            this.state = 'DEPART';
            this.stateTimer = 0;
          } else {
            this.state = 'APPROACH';
            this.stateTimer = 0;
          }
        }
        break;
      }

      case 'DEPART': {
        this.sprite.playAnimation("Fly");
        this.laserMesh.visible = false;

        this.group.position.z -= 180 * delta;

        if (this.light) {
          this.light.intensity = Math.max(0, 45.0 - this.stateTimer * 20.0);
        }

        if (playerPos.z - this.group.position.z > 800 || this.stateTimer >= 3.0) {
          this.destroy();
        }
        break;
      }
    }
  }

  destroy() {
    if (this.isDead) return;
    this.isDead = true;
    this.dispose();
  }

  dispose() {
    this.scene.remove(this.group);

    if (this.light) {
      this.group.remove(this.light);
      this.light.dispose();
      this.light = null;
    }

    if (this.sprite) {
      if (this.sprite.mesh && this.sprite.mesh.geometry) {
        this.sprite.mesh.geometry.dispose();
      }
      if (this.sprite.material) {
        this.sprite.material.dispose();
      }
    }
    if (this.laserMesh) {
      if (this.laserMesh.geometry) {
        this.laserMesh.geometry.dispose();
      }
      if (this.laserMat) {
        this.laserMat.dispose();
      }
    }
  }
}

export default Drone;