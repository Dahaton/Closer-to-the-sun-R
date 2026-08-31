import * as THREE from 'three';

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map();
const _tempAxisZ = new THREE.Vector3(0, 0, 1);
const _tempRollQuat = new THREE.Quaternion();

function loadPixelTexture(path) {
  if (textureCache.has(path)) {
    return textureCache.get(path);
  }
  const texture = textureLoader.load(path);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(path, texture);
  return texture;
}

export class BillboardSprite {
  constructor(animationsConfig = {}, width = 160, height = 128, basePath = "assets/") {
    this.basePath = basePath;
    this.animations = {};
    this.currentAnim = null;
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.flipX = false;
    this.width = width;
    this.height = height;
    this.customRotation = null;

    const geometry = new THREE.PlaneGeometry(width, height);
    
    this.material = new THREE.MeshStandardMaterial({
      transparent: true,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 1.0,
      metalness: 0.0,
      depthWrite: true,
      depthTest: true
    });

    this.mesh = new THREE.Mesh(geometry, this.material);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = false;

    this.group = new THREE.Group();
    this.group.add(this.mesh);

    this.setupAnimations(animationsConfig);
  }

  setupAnimations(config) {
    for (const [animName, animData] of Object.entries(config)) {
      const frames = animData.files.map(file => loadPixelTexture(this.basePath + file));
      this.animations[animName] = {
        frames,
        frameDuration: animData.frameDuration || 0.08,
        loop: animData.loop !== undefined ? animData.loop : true
      };
    }
  }

  playAnimation(name, restart = false) {
    if (!this.animations[name]) return;
    if (this.currentAnim === name && !restart) return;

    this.currentAnim = name;
    this.currentFrameIndex = 0;
    this.frameTimer = 0;
    this.updateMaterialTexture();
  }

  setFlipX(flip) {
    if (this.flipX !== flip) {
      this.flipX = flip;
      this.mesh.scale.x = flip ? -1 : 1;
    }
  }

  setCustomRotation(rad) {
    this.customRotation = rad;
  }

  updateMaterialTexture() {
    if (!this.currentAnim || !this.animations[this.currentAnim]) return;
    const anim = this.animations[this.currentAnim];
    const texture = anim.frames[this.currentFrameIndex];
    if (texture) {
      this.material.map = texture;
      this.material.needsUpdate = true;
    }
  }

  update(delta, camera = null) {
    if (this.currentAnim && this.animations[this.currentAnim]) {
      const anim = this.animations[this.currentAnim];
      if (anim.frames.length > 1) {
        this.frameTimer += delta;
        if (this.frameTimer >= anim.frameDuration) {
          this.frameTimer -= anim.frameDuration;
          if (this.currentFrameIndex < anim.frames.length - 1) {
            this.currentFrameIndex++;
          } else if (anim.loop) {
            this.currentFrameIndex = 0;
          }
          this.updateMaterialTexture();
        }
      }
    }

    if (camera) {
      this.mesh.quaternion.copy(camera.quaternion);

      if (this.customRotation !== null && this.customRotation !== undefined && Math.abs(this.customRotation) > 0.0001) {
        _tempRollQuat.setFromAxisAngle(_tempAxisZ, this.customRotation);
        this.mesh.quaternion.multiply(_tempRollQuat);
      }
    }
  }

  get Object3D() {
    return this.group;
  }
}

export default BillboardSprite;