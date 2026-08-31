import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

export async function loadAndFitGLTF(
  path,
  targetWidth,
  targetHeight,
  targetDepth,
  rotX = 90,
  rotY = 0,
  rotZ = 180,
  keepAspectRatio = true
) {
  const gltf = await loader.loadAsync(path);
  const model = gltf.scene;

  // Сохраняем массив анимаций в userData объекта
  model.userData.animations = gltf.animations || [];

  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  if (keepAspectRatio) {
    const scaleFactor = size.x > 0 && targetWidth ? targetWidth / size.x : 1;
    model.scale.set(scaleFactor, scaleFactor, scaleFactor);
  } else {
    const scaleX = size.x > 0 && targetWidth ? targetWidth / size.x : 1;
    const scaleY = size.y > 0 && targetDepth ? targetDepth / size.y : 1;
    const scaleZ = size.z > 0 && targetHeight ? targetHeight / size.z : 1;
    model.scale.set(scaleX, scaleY, scaleZ);
  }

  model.rotation.order = 'ZYX';
  model.rotation.set(
    THREE.MathUtils.degToRad(rotX),
    THREE.MathUtils.degToRad(rotY),
    THREE.MathUtils.degToRad(rotZ)
  );

  model.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.FrontSide;
      }
    }
  });

  return model;
}