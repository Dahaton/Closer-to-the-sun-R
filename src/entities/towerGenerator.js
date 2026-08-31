import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BillboardSprite } from './billboardSprite.js';
import { loadAndFitGLTF } from '../utils/modelLoader.js';
import { state } from '../state.js';

const loader = new GLTFLoader();

const LAYOUT_ZONES = [
  { minZ: 0, maxZ: 25000, layouts: ["Tier1Variant1", "Tier1Variant2", "Tier1Variant3", "Tier1Variant4", "Tier1Variant5"] },
  { minZ: 25001, maxZ: 50000, layouts: ["Tier15Variant1", "Tier15Variant2", "Tier15Variant3", "Tier15Variant4", "Tier15Variant5"] },
  { minZ: 50001, maxZ: 80000, layouts: ["Tier2Variant1", "Tier2Variant2", "Tier2Variant3", "Tier2Variant4", "Tier2Variant5"] },
  { minZ: 80001, maxZ: 110000, layouts: ["Tier25Variant1", "Tier25Variant2", "Tier25Variant3", "Tier25Variant4", "Tier25Variant5"] },
  { minZ: 110001, maxZ: 145000, layouts: ["Tier3Variant1", "Tier3Variant2", "Tier3Variant3", "Tier3Variant4", "Tier3Variant5"] },
  { minZ: 145001, maxZ: 220000, layouts: ["Tier4Variant1", "Tier4Variant2", "Tier4Variant3", "Tier4Variant4", "Tier4Variant5"] }
];

const LAYOUT_TEMPLATES = {
  Tier1Variant1: {
    depth: 5000,
    instances: [
      { name: "Brick1", x: 18, y: 260, z: 2261, angle: 90 },
      { name: "Brick2", x: 240, y: 1, z: 3152, angle: 0 },
      { name: "Brick3", x: 17, y: -273, z: 2270, angle: 280 },
      { name: "ItemResource", x: 192, y: 182, z: 2333 },
      { name: "ItemResource", x: -195, y: 182, z: 2336 },
      { name: "Brick3", x: 251, y: -36, z: 2271, angle: 355 },
      { name: "Brick3", x: -194, y: -163, z: 2270, angle: 222 },
      { name: "Brick3", x: -253, y: 36, z: 2271, angle: 172 },
      { name: "Brick3", x: 193, y: -193, z: 2271, angle: 322 },
      { name: "Brick3", x: 193, y: -163, z: 1933, angle: 320 },
      { name: "Brick1", x: 82, y: 247, z: 1914, angle: 71 },
      { name: "Brick3", x: -240, y: 106, z: 1933, angle: 159 },
      { name: "Coins", x: -243, y: 130, z: 3492 },
      { name: "Coins", x: 235, y: -153, z: 3492 }
    ]
  },
  Tier1Variant2: {
    depth: 5000,
    instances: [
      { name: "Brick3", x: 185, y: -188, z: 4599, angle: 322 },
      { name: "Brick1", x: 88, y: 252, z: 4599, angle: 71 },
      { name: "Flag", x: -256, y: -40, z: 3659, angle: 291 },
      { name: "Flag", x: 275, y: 142, z: 3642, angle: 105 },
      { name: "ItemResource", x: 99, y: 266, z: 4571 },
      { name: "Coins", x: -243, y: 130, z: 3492 }
    ]
  },
  Tier1Variant3: {
    depth: 5000,
    instances: [
      { name: "Brick3", x: 185, y: -188, z: 4649, angle: 322 },
      { name: "Brick1", x: 88, y: 252, z: 4630, angle: 71 },
      { name: "Coins", x: -56, y: 247, z: 3672 },
      { name: "Coins", x: -53, y: -254, z: 3672 }
    ]
  },
  Tier1Variant4: {
    depth: 5000,
    instances: [
      { name: "Brick1", x: 88, y: 252, z: 4587, angle: 71 },
      { name: "Brick3", x: -253, y: 36, z: 4606, angle: 172 },
      { name: "ItemResource", x: 255, y: 60, z: 4686 },
      { name: "Coins", x: -246, y: -87, z: 4666 }
    ]
  },
  Tier1Variant5: {
    depth: 5000,
    instances: [
      { name: "Brick3", x: 185, y: -188, z: 4639, angle: 322 },
      { name: "Brick1", x: 88, y: 252, z: 3631, angle: 71 },
      { name: "ItemResource", x: -27, y: 257, z: 4719 }
    ]
  }
};

["Tier15", "Tier2", "Tier25", "Tier3", "Tier4"].forEach((tierPrefix, idx) => {
  for (let i = 1; i <= 5; i++) {
    const key = `${tierPrefix}Variant${i}`;
    if (!LAYOUT_TEMPLATES[key]) {
      LAYOUT_TEMPLATES[key] = {
        depth: 6000 + idx * 200,
        instances: [
          { name: "Brick1", x: 88, y: 252, z: 2000, angle: 71 },
          { name: "Brick3", x: -253, y: 36, z: 3200, angle: 172 },
          { name: "Gear", x: 0, y: 0, z: 3800, angle: 0 },
          { name: "Coins", x: 180, y: 180, z: 2500 },
          { name: "ItemResource", x: -180, y: -180, z: 4200 }
        ]
      };
    }
  }
});

export class TowerGenerator {
  constructor(scene) {
    this.scene = scene;
    this.modelsMap = {};
    this.rawTowerScene = null;
    this.rawTowerSize = new THREE.Vector3();

    this.highestZ = 0;
    this.preloadDistance = 15000;
    this.cleanupDistance = 3000;

    this.spawnedChunks = [];
    this.activeObstacles = [];
    this.activeCollectibles = [];
    this.activeFlags = [];

    this.isLoaded = false;
  }

  async loadModels() {
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
    this.rawTowerScene = towerGltf.scene;
    this.rawTowerScene.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = true;
      }
    });

    const box = new THREE.Box3().setFromObject(this.rawTowerScene);
    box.getSize(this.rawTowerSize);

    const [brick1, brick2, brick3, gear, flag] = await Promise.all([
      loadAndFitGLTF('assets/models/Brick1.glb', 110, 150, 130, 90, 0, 180, true),
      loadAndFitGLTF('assets/models/Brick2.glb', 95, 130, 115, 90, 0, 180, true),
      loadAndFitGLTF('assets/models/Brick3.glb', 90, 125, 110, 90, 0, 180, true),
      loadAndFitGLTF('assets/models/CTSGear3.glb', 680, 680, 120, 90, 0, 180, true),
      loadAndFitGLTF('assets/models/Flag2.glb', 120, 380, 120, 0, 0, -90, true)
    ]);

    this.modelsMap = { brick1, brick2, brick3, gear, flag };
    this.isLoaded = true;
  }

  getLayoutsForHeight(z) {
    for (const zone of LAYOUT_ZONES) {
      if (z >= zone.minZ && z < zone.maxZ) {
        return zone.layouts;
      }
    }
    return LAYOUT_ZONES[LAYOUT_ZONES.length - 1].layouts;
  }

  getLootItemTypeForHeight(z) {
    if (z < 25000) {
      const items = ["fabric1", "steel1", "wood1"];
      return items[Math.floor(Math.random() * items.length)];
    } else if (z < 50000) {
      const items = ["fabric2", "steel2", "wood2"];
      return items[Math.floor(Math.random() * items.length)];
    } else if (z < 145000) {
      const items = ["fabric3", "steel3", "wood3"];
      return items[Math.floor(Math.random() * items.length)];
    } else {
      return "wax";
    }
  }

  update(playerZ) {
    if (!this.isLoaded) return;

    const targetHeight = playerZ + this.preloadDistance;

    while (this.highestZ < targetHeight) {
      const availableLayouts = this.getLayoutsForHeight(this.highestZ);
      const layoutName = availableLayouts[Math.floor(Math.random() * availableLayouts.length)];
      const template = LAYOUT_TEMPLATES[layoutName] || LAYOUT_TEMPLATES.Tier1Variant1;
      const chunkDepth = template.depth || 5000;

      const chunkObjects = [];

      if (this.rawTowerScene) {
        const towerMesh = this.rawTowerScene.clone();

        const scaleX = 455 / this.rawTowerSize.x;
        const scaleY = chunkDepth / this.rawTowerSize.y;
        const scaleZ = 455 / this.rawTowerSize.z;

        towerMesh.scale.set(scaleX, scaleY, scaleZ);
        towerMesh.rotation.order = 'ZYX';
        towerMesh.rotation.set(Math.PI / 2, 0, Math.PI);
        towerMesh.position.set(0, 0, this.highestZ);

        this.scene.add(towerMesh);
        chunkObjects.push(towerMesh);
      }

      for (const inst of template.instances) {
        const worldZ = inst.z + this.highestZ;
        let spawnedObj = null;

        let posX = inst.x;
        let posY = inst.y;
        const distXY = Math.hypot(posX, posY);

        if (distXY > 10 && (inst.name === "Coins" || inst.name === "ItemResource")) {
          const scale = 265 / distXY;
          posX *= scale;
          posY *= scale;
        } else if (distXY > 10 && inst.name !== "Gear") {
          const scale = 250 / distXY;
          posX *= scale;
          posY *= scale;
        }

        if (inst.name === "Brick1" || inst.name === "Brick2" || inst.name === "Brick3" || inst.name === "Brick4") {
          const modelKey = inst.name === "Brick2" ? "brick2" : (inst.name === "Brick1" ? "brick1" : "brick3");
          if (this.modelsMap[modelKey]) {
            spawnedObj = this.modelsMap[modelKey].clone();
            spawnedObj.position.set(posX, posY, worldZ);
            spawnedObj.rotation.z = THREE.MathUtils.degToRad(inst.angle || 0);
            spawnedObj.userData = { type: "obstacle", name: inst.name };
            this.activeObstacles.push(spawnedObj);
          }
        } else if (inst.name === "Gear") {
          if (this.modelsMap.gear) {
            const gearGroup = new THREE.Group();
            gearGroup.position.set(0, 0, worldZ);
            const rotSpeed = (Math.random() < 0.5 ? 1 : -1) * (0.7 + Math.random() * 0.4);
            gearGroup.userData = { type: "gearGroup", rotSpeed };

            const gearMesh = this.modelsMap.gear.clone();
            gearGroup.add(gearMesh);

            const numTeeth = 6;
            const toothRadius = 275;
            for (let i = 0; i < numTeeth; i++) {
              const angle = (i * Math.PI * 2) / numTeeth;
              const toothObj = new THREE.Object3D();
              toothObj.position.set(
                Math.cos(angle) * toothRadius,
                Math.sin(angle) * toothRadius,
                0
              );
              toothObj.userData = { type: "gearTooth", parentGroup: gearGroup };
              gearGroup.add(toothObj);
              this.activeObstacles.push(toothObj);
            }

            spawnedObj = gearGroup;
          }
        } else if (inst.name === "Flag") {
          if (this.modelsMap.flag) {
            const flagGroup = new THREE.Group();
            const flagMesh = this.modelsMap.flag.clone();
            flagMesh.rotation.y = THREE.MathUtils.degToRad(-12);
            flagGroup.add(flagMesh);

            const radialAngle = Math.atan2(posY, posX);
            flagGroup.position.set(posX, posY, worldZ);
            flagGroup.rotation.order = 'ZYX';
            flagGroup.rotation.z = radialAngle;

            flagGroup.userData = { type: "flag", name: "Flag" };
            this.activeFlags.push(flagGroup);
            spawnedObj = flagGroup;
          }
        } else if (inst.name === "Coins") {
          const coinSprite = new BillboardSprite({ Idle: { files: ["items/coin.png"] } }, 56, 56);
          coinSprite.playAnimation("Idle");
          spawnedObj = coinSprite.Object3D;
          spawnedObj.position.set(posX, posY, worldZ);
          spawnedObj.userData = { type: "coin", sprite: coinSprite };
          this.activeCollectibles.push(spawnedObj);
        } else if (inst.name === "ItemResource") {
          const isRune = state.endlessUnlocked && Math.random() < 0.35;
          if (isRune) {
            const runeSprite = new BillboardSprite({ Idle: { files: ["ui/Rune.png"] } }, 58, 58);
            runeSprite.playAnimation("Idle");
            spawnedObj = runeSprite.Object3D;

            const randomAngle = Math.random() * Math.PI * 2;
            const randomRadius = 250 + Math.random() * 25;
            const runeX = Math.cos(randomAngle) * randomRadius;
            const runeY = Math.sin(randomAngle) * randomRadius;
            const runeZ = worldZ + (Math.random() - 0.5) * 1200;

            spawnedObj.position.set(runeX, runeY, runeZ);
            spawnedObj.userData = { type: "rune", sprite: runeSprite };
            this.activeCollectibles.push(spawnedObj);
          } else {
            const itemType = this.getLootItemTypeForHeight(worldZ);
            const resSprite = new BillboardSprite({ Idle: { files: ["items/bag.png"] } }, 58, 58);
            resSprite.playAnimation("Idle");
            spawnedObj = resSprite.Object3D;
            spawnedObj.position.set(posX, posY, worldZ);
            spawnedObj.userData = { type: "resource", itemType, sprite: resSprite };
            this.activeCollectibles.push(spawnedObj);
          }
        }

        if (spawnedObj) {
          this.scene.add(spawnedObj);
          chunkObjects.push(spawnedObj);
        }
      }

      if (state.endlessUnlocked && Math.random() < 0.45) {
        const extraRuneSprite = new BillboardSprite({ Idle: { files: ["ui/Rune.png"] } }, 58, 58);
        extraRuneSprite.playAnimation("Idle");
        const extraRuneObj = extraRuneSprite.Object3D;

        const angle = Math.random() * Math.PI * 2;
        const radius = 255 + Math.random() * 20;
        const runeZ = this.highestZ + Math.random() * chunkDepth;

        extraRuneObj.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, runeZ);
        extraRuneObj.userData = { type: "rune", sprite: extraRuneSprite };

        this.scene.add(extraRuneObj);
        chunkObjects.push(extraRuneObj);
        this.activeCollectibles.push(extraRuneObj);
      }

      this.spawnedChunks.push({
        objects: chunkObjects,
        topZ: this.highestZ + chunkDepth
      });

      this.highestZ += chunkDepth;
    }

    const destroyHeight = playerZ - this.cleanupDistance;
    for (let i = this.spawnedChunks.length - 1; i >= 0; i--) {
      const chunk = this.spawnedChunks[i];
      if (chunk.topZ < destroyHeight) {
        for (const obj of chunk.objects) {
          this.scene.remove(obj);
          this.activeObstacles = this.activeObstacles.filter(o => o !== obj);
          this.activeCollectibles = this.activeCollectibles.filter(o => o !== obj);
          this.activeFlags = this.activeFlags.filter(o => o !== obj);
        }
        this.spawnedChunks.splice(i, 1);
      }
    }
  }
}