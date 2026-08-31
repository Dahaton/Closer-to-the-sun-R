import * as THREE from 'three';

export class BaseScene {
  constructor(renderer, manager) {
    this.renderer = renderer;
    this.manager = manager;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, 640 / 480, 5, 300000);
    this.camera.up.set(0, 0, 1);
  }

  init() {}

  update(delta) {}

  onResize(width, height) {}

  destroy() {
    this.scene.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });
  }
}