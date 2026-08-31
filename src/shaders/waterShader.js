
import * as THREE from 'three';

export class PixelWater {
  constructor(width = 14000, height = 6000) {
    this.geometry = new THREE.PlaneGeometry(width, height, 96, 48);

    this.uniforms = {
      time: { value: 0 },
      cameraPos: { value: new THREE.Vector3() },
      sunDirection: { value: new THREE.Vector3(0.7, 0.3, 0.2).normalize() },
      skyZenithColor: { value: new THREE.Color(0x285ba0) },
      skyHorizonColor: { value: new THREE.Color(0x73a7e2) },
      deepColor: { value: new THREE.Color(0x0b2342) },
      shallowColor: { value: new THREE.Color(0x1b6898) },
      foamColor: { value: new THREE.Color(0xe0f7fc) },
      sunGlowColor: { value: new THREE.Color(0xfffaed) },
      pixelSize: { value: 4.0 },
      foamThreshold: { value: 0.55 }
    };

    this.material = new THREE.ShaderMaterial({
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: true,
      depthTest: true,
      uniforms: this.uniforms,
      vertexShader: `
        uniform float time;
        uniform float pixelSize;
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        void main() {
          vUv = uv;
          vec3 pos = position;

          // Дискретная пиксельная волна
          vec2 waveUv = (modelMatrix * vec4(pos, 1.0)).xy * 0.004;
          float wave = noise(waveUv + vec2(time * 0.7, time * 0.4)) * 8.0;
          pos.z += floor(wave / 2.0) * 2.0;

          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPos.xyz;
          vNormal = normalize(mat3(modelMatrix) * normal);

          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform vec3 cameraPos;
        uniform vec3 sunDirection;
        uniform vec3 skyZenithColor;
        uniform vec3 skyHorizonColor;
        uniform vec3 deepColor;
        uniform vec3 shallowColor;
        uniform vec3 foamColor;
        uniform vec3 sunGlowColor;
        uniform float pixelSize;
        uniform float foamThreshold;

        varying vec3 vWorldPos;
        varying vec3 vNormal;
        varying vec2 vUv;

        float hash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), f.x),
            mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        float fbm(vec2 p) {
          float val = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 3; i++) {
            val += amp * noise(p);
            p *= 2.1;
            amp *= 0.5;
          }
          return val;
        }

        void main() {
     
          vec2 pixCoord = floor(vWorldPos.xy / pixelSize) * pixelSize;

          vec2 flowUv1 = pixCoord * 0.006 + vec2(time * 0.12, time * 0.08);
          vec2 flowUv2 = pixCoord * 0.012 - vec2(time * 0.09, time * 0.15);

          float n1 = fbm(flowUv1);
          float n2 = fbm(flowUv2);
          float combinedNoise = (n1 + n2) * 0.5;

          vec3 viewDir = normalize(cameraPos - vWorldPos);

        
          vec3 waveNormal = normalize(vNormal + vec3((n1 - 0.5) * 0.35, (n2 - 0.5) * 0.35, 0.0));

      
          float fresnel = clamp(1.0 - dot(viewDir, vec3(0.0, 0.0, 1.0)), 0.0, 1.0);
          fresnel = floor(fresnel * 5.0) / 5.0;

        
          vec3 refRay = reflect(-viewDir, waveNormal);
          float skyReflectMix = clamp(refRay.z * 0.5 + 0.5 + n1 * 0.25, 0.0, 1.0);
          vec3 skyReflection = mix(skyHorizonColor, skyZenithColor, skyReflectMix);

       
          vec3 waterBase = mix(deepColor, shallowColor, fresnel * 0.5 + n1 * 0.25);
          vec3 waterWithSky = mix(waterBase, skyReflection, fresnel * 0.65 + 0.2);

      
          vec3 sunRefDir = reflect(-sunDirection, waveNormal);
          float spec = max(dot(viewDir, sunRefDir), 0.0);
          float pixelSpec = step(0.80, pow(spec, 24.0) + n2 * 0.28);
          vec3 specularColor = sunGlowColor * pixelSpec * 0.9;

       
          float foamLine = sin(pixCoord.x * 0.018 + time * 1.4) * 0.12;
          float foamPattern = step(foamThreshold, combinedNoise + foamLine);

          vec3 finalColor = mix(waterWithSky + specularColor, foamColor, foamPattern);
          float alpha = mix(0.92, 0.98, foamPattern);

          gl_FragColor = vec4(finalColor, alpha);
        }
      `
    });

    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
  }

  update(delta, camera, sunDir, zenithCol, horizonCol) {
    this.uniforms.time.value += delta;
    if (camera) {
      this.uniforms.cameraPos.value.copy(camera.position);
    }
    if (sunDir) {
      this.uniforms.sunDirection.value.copy(sunDir);
    }
    if (zenithCol) {
      this.uniforms.skyZenithColor.value.copy(zenithCol);
    }
    if (horizonCol) {
      this.uniforms.skyHorizonColor.value.copy(horizonCol);
    }
  }

  get Object3D() {
    return this.mesh;
  }

  destroy() {
    if (this.geometry) this.geometry.dispose();
    if (this.material) this.material.dispose();
  }
}