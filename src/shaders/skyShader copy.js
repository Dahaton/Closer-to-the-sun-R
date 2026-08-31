import * as THREE from 'three';

const RENDER_WIDTH = 640;
const RENDER_HEIGHT = 480;

export class VolumetricSky {
  constructor(scene) {
    this.scene = scene;
    this.skyTime = 0;

    this.settings = {
      bottom: 14600,
      top: 28000,
      cloudBase: 14600,
      cloudHeight: 1200,
      sunDirection: new THREE.Vector3(0.7, 0.3, 0.2).normalize(),
      sunColor: new THREE.Color("rgb(255, 245, 230)"),
      sunCoreColor: new THREE.Color("rgb(255, 255, 255)"),
      sunHaloColor: new THREE.Color("rgb(255, 170, 80)"),
      sunIntensity: 1.2,
      cloudColor: new THREE.Color("rgb(255, 255, 255)"),
      zenithColor: new THREE.Color("rgb(30, 90, 180)"),
      horizonColor: new THREE.Color("rgb(160, 200, 230)"),
      fogColor: new THREE.Color("rgb(180, 210, 240)"),
      speed: 25,
      cloudCoverage: 0.52,
      cloudScale: 0.00018,
      cloudBrightness: 1.15,
      drawDistance: 200000.0,
      pixelArtHeight: 264.0,
      colorSteps: 125.0
    };

    this.colorConfig = {
      minZ: 0,
      maxZ: 50000,
      stages: [
        { pct: 0.0, skyBottom: { r: 110, g: 159, b: 218 }, skyTop: { r: 41, g: 80, b: 155 } },
        { pct: 0.3, skyBottom: { r: 29, g: 59, b: 141 }, skyTop: { r: 41, g: 80, b: 155 } },
        { pct: 0.6, skyBottom: { r: 20, g: 40, b: 110 }, skyTop: { r: 29, g: 59, b: 141 } },
        { pct: 0.85, skyBottom: { r: 12, g: 20, b: 60 }, skyTop: { r: 18, g: 32, b: 90 } },
        { pct: 1.0, skyBottom: { r: 5, g: 6, b: 18 }, skyTop: { r: 8, g: 12, b: 35 } }
      ]
    };

    this.cloudGeo = null;
    this.skyMat = null;
    this.cloudMat = null;
    this.skyBox = null;
    this.cloudBox = null;

    this.initShaders();
  }

  initShaders() {
    this.cloudGeo = new THREE.BoxGeometry(200000, 200000, 200000);

    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: false,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        cameraPos: { value: new THREE.Vector3() },
        sunDirection: { value: this.settings.sunDirection },
        sunColor: { value: this.settings.sunColor },
        sunCoreColor: { value: this.settings.sunCoreColor },
        sunHaloColor: { value: this.settings.sunHaloColor },
        sunIntensity: { value: this.settings.sunIntensity },
        zenithColor: { value: this.settings.zenithColor },
        horizonColor: { value: this.settings.horizonColor },
        fogColor: { value: this.settings.fogColor },
        resolution: { value: new THREE.Vector2(RENDER_WIDTH, RENDER_HEIGHT) },
        pixelRatio: { value: 1.0 },
        pixelArtHeight: { value: this.settings.pixelArtHeight },
        colorSteps: { value: this.settings.colorSteps },
        invProj: { value: new THREE.Matrix4() },
        invView: { value: new THREE.Matrix4() }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec2 resolution;
        uniform float pixelRatio;
        uniform float pixelArtHeight;
        uniform float colorSteps;
        uniform mat4 invProj;
        uniform mat4 invView;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform vec3 sunCoreColor;
        uniform vec3 sunHaloColor;
        uniform float sunIntensity;
        uniform vec3 zenithColor;
        uniform vec3 horizonColor;
        uniform vec3 fogColor;

        void main() {
            float aspect = resolution.x / resolution.y;
            vec2 virtRes = vec2(pixelArtHeight * aspect, pixelArtHeight);
            
            vec2 uv = (gl_FragCoord.xy / pixelRatio) / resolution;
            vec2 pUV = floor(uv * virtRes) / virtRes;
            vec2 ndc = pUV * 2.0 - 1.0;
            
            vec4 viewDir = invProj * vec4(ndc, 1.0, 1.0);
            vec3 camRay = vec3(viewDir.x, viewDir.y, -1.0);
            vec3 rd = normalize((invView * vec4(camRay, 0.0)).xyz);

            float sunDot = max(dot(rd, sunDirection), 0.0);
            float skyGlow = pow(1.0 - max(abs(rd.z), 0.0), 3.0);
            vec3 skyBase = mix(zenithColor, horizonColor, skyGlow);
            float horizonHaze = pow(1.0 - abs(rd.z), 12.0);
            vec3 hazeCol = mix(fogColor, sunColor, pow(sunDot, 6.0) * 0.4);
            vec3 background = mix(skyBase, hazeCol, horizonHaze);

            vec3 sunRender = sunHaloColor * pow(sunDot, 45.0) * 1.5 + sunCoreColor * pow(sunDot, 150.0);
            sunRender = mix(sunRender, sunCoreColor * 2.0, step(0.999, sunDot));

            vec3 finalColor = background + sunRender * sunIntensity;
            finalColor = floor(finalColor * colorSteps + 0.5) / colorSteps;
            gl_FragColor = vec4(finalColor, 1.0);
        }
      `
    });

    this.cloudMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      transparent: true,
      premultipliedAlpha: true,
      depthWrite: false,
      depthTest: true,
      extensions: { fragDepth: true },
      uniforms: {
        time: { value: 0 },
        cameraPos: { value: new THREE.Vector3() },
        projMatrix: { value: new THREE.Matrix4() },
        viewMat: { value: new THREE.Matrix4() },
        sunDirection: { value: this.settings.sunDirection },
        sunColor: { value: this.settings.sunColor },
        cloudColor: { value: this.settings.cloudColor },
        zenithColor: { value: this.settings.zenithColor },
        sunHaloColor: { value: this.settings.sunHaloColor },
        fogColor: { value: this.settings.fogColor },
        cloudMin: { value: this.settings.bottom },
        cloudMax: { value: this.settings.top },
        cloudCoverage: { value: this.settings.cloudCoverage },
        cloudScale: { value: this.settings.cloudScale },
        cloudBrightness: { value: this.settings.cloudBrightness },
        drawDistance: { value: this.settings.drawDistance },
        resolution: { value: new THREE.Vector2(RENDER_WIDTH, RENDER_HEIGHT) },
        pixelRatio: { value: 1.0 },
        pixelArtHeight: { value: this.settings.pixelArtHeight },
        colorSteps: { value: this.settings.colorSteps },
        invProj: { value: new THREE.Matrix4() },
        invView: { value: new THREE.Matrix4() }
      },
      vertexShader: `
        varying vec3 vWorldPos;
        #include <logdepthbuf_pars_vertex>
        void main() {
            vec4 worldPos = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPos.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPos;
            #include <logdepthbuf_vertex>
        }
      `,
      fragmentShader: `
        uniform vec2 resolution;
        uniform float pixelRatio;
        uniform float pixelArtHeight;
        uniform float colorSteps;
        uniform mat4 invProj, invView, projMatrix, viewMat;
        uniform vec3 cameraPos, sunDirection, sunColor, cloudColor, zenithColor, sunHaloColor, fogColor;
        uniform float time, cloudMin, cloudMax, cloudCoverage, cloudScale, cloudBrightness, drawDistance;

        #include <logdepthbuf_pars_fragment>

        float hash(vec3 p) {
            return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453123);
        }

        float noise(vec3 x) {
            vec3 i = floor(x); vec3 f = fract(x);
            f = f * f * (3.0 - 2.0 * f);
            return mix(mix(mix(hash(i + vec3(0,0,0)), hash(i + vec3(1,0,0)), f.x),
                           mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                       mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x),
                           mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
        }

        float fbm(vec3 p) {
            float v = 0.0; float a = 0.5;
            for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.0; a *= 0.5; }
            return v;
        }

        float cloudDensity(vec3 p) {
            float alt = p.z;
            float center = (cloudMin + cloudMax) * 0.5;
            float thick = (cloudMax - cloudMin) * 0.5;
            float heightFade = 1.0 - pow(abs(alt - center) / thick, 2.0);
            if(heightFade < 0.0) return 0.0;

            vec3 scroll = vec3(time * 15.0, time * 10.0, 0.0);
            float d = fbm((p + scroll) * cloudScale);
            return max(0.0, d - (1.0 - cloudCoverage * heightFade));
        }

        float bayerDither(vec2 coord) {
            vec2 p = mod(coord, 4.0);
            float d = 0.0;
            if(p.x < 1.0) {
                if(p.y < 1.0) d = 0.0; else if(p.y < 2.0) d = 12.0; else if(p.y < 3.0) d = 3.0; else d = 15.0;
            } else if(p.x < 2.0) {
                if(p.y < 1.0) d = 8.0; else if(p.y < 2.0) d = 4.0; else if(p.y < 3.0) d = 11.0; else d = 7.0;
            } else if(p.x < 3.0) {
                if(p.y < 1.0) d = 2.0; else if(p.y < 2.0) d = 14.0; else if(p.y < 3.0) d = 1.0; else d = 13.0;
            } else {
                if(p.y < 1.0) d = 10.0; else if(p.y < 2.0) d = 6.0; else if(p.y < 3.0) d = 9.0; else d = 5.0;
            }
            return d / 16.0;
        }

        void main() {
            float aspect = resolution.x / resolution.y;
            vec2 virtRes = vec2(pixelArtHeight * aspect, pixelArtHeight);
            
            vec2 uv = (gl_FragCoord.xy / pixelRatio) / resolution;
            vec2 pUV = floor(uv * virtRes) / virtRes;
            vec2 ndc = pUV * 2.0 - 1.0;
            
            vec4 viewDir = invProj * vec4(ndc, 1.0, 1.0);
            vec3 camRay = vec3(viewDir.x, viewDir.y, -1.0);
            vec3 rd = normalize((invView * vec4(camRay, 0.0)).xyz);
            vec3 ro = cameraPos;

            float tStart = 0.0, tEnd = drawDistance;
            if (abs(rd.z) > 0.00001) {
                float t1 = (cloudMin - ro.z) / rd.z;
                float t2 = (cloudMax - ro.z) / rd.z;
                tStart = max(0.0, min(t1, t2));
                tEnd = min(drawDistance, max(t1, t2));
            } else {
                if (ro.z < cloudMin || ro.z > cloudMax) discard;
            }

            if (tEnd <= tStart) discard;

            vec2 pixelCoord = pUV * virtRes;
            float jitter = bayerDither(pixelCoord); 
            
            float rayLen = tEnd - tStart;
            int steps = 85;
            float stepSize = rayLen / float(steps);
            float t = tStart + stepSize * jitter;

            vec4 cloudRes = vec4(0.0);
            float firstHitT = -1.0;

            for (int i = 0; i < 85; i++) {
                vec3 p = ro + rd * t;
                float d = cloudDensity(p);
                if (d > 0.01) {
                    float t0 = t - stepSize, t1 = t;
                    for(int j=0; j<3; j++) {
                        float tm = (t0+t1)*0.5;
                        if(cloudDensity(ro+rd*tm) > 0.01) t1=tm; else t0=tm;
                    }
                    firstHitT = t1;
                    p = ro + rd * firstHitT;

                    float heightRatio = clamp((p.z - cloudMin)/(cloudMax - cloudMin), 0.0, 1.0);
                    vec3 shadowCol = mix(zenithColor, fogColor, 0.7);
                    vec3 finalCol = mix(shadowCol, cloudColor, heightRatio * 1.5);
                    
                    float sunDot = max(dot(rd, sunDirection), 0.0);
                    
                    finalCol += mix(sunHaloColor, sunColor, 0.6) * pow(sunDot, 6.0) * 0.65;
                    finalCol *= cloudBrightness;

                    vec3 sunFogColor = mix(fogColor, sunColor * 1.2, pow(sunDot, 2.5) * 0.75);
                    float fog = clamp(firstHitT / drawDistance, 0.0, 1.0);
                    finalCol = mix(finalCol, sunFogColor, fog);
                    
                    cloudRes = vec4(finalCol, 1.0);
                    break;
                }
                t += stepSize;
            }

            if (cloudRes.a < 0.01) discard;

            cloudRes.rgb = floor(cloudRes.rgb * colorSteps + 0.5) / colorSteps;
            gl_FragColor = cloudRes;

            float finalT = max(firstHitT, 1000.0); 
            vec4 hitClipPos = projMatrix * viewMat * vec4(ro + rd * finalT, 1.0);
            
            #if defined( USE_LOGDEPTHBUF ) && defined( USE_LOGDEPTHBUF_EXT )
                gl_FragDepthEXT = min(log2(1.0 + hitClipPos.w) * logDepthBufFC * 0.5, 0.999999);
            #else
                gl_FragDepth = min((hitClipPos.z / hitClipPos.w) * 0.5 + 0.5, 0.999999);
            #endif
        }
      `
    });

    this.skyBox = new THREE.Mesh(this.cloudGeo, this.skyMat);
    this.cloudBox = new THREE.Mesh(this.cloudGeo, this.cloudMat);
    
    this.skyBox.frustumCulled = false;
    this.cloudBox.frustumCulled = false;

    this.skyBox.renderOrder = -1000;
    this.cloudBox.renderOrder = 999;

    this.scene.add(this.skyBox);
    this.scene.add(this.cloudBox);
  }

  update(camera, delta, playerZ = 0) {
    this.skyTime = (this.skyTime + delta * this.settings.speed) % 10000.0;
    if (this.cloudMat) {
      this.cloudMat.uniforms.time.value = this.skyTime;
    }

    if (camera && this.skyMat && this.cloudMat) {
      camera.updateMatrixWorld();
      camera.updateProjectionMatrix();

      this.cloudMat.uniforms.cameraPos.value.copy(camera.position);
      this.skyMat.uniforms.cameraPos.value.copy(camera.position);

      this.cloudMat.uniforms.projMatrix.value.copy(camera.projectionMatrix);
      this.cloudMat.uniforms.viewMat.value.copy(camera.matrixWorldInverse);

      this.skyMat.uniforms.invProj.value.copy(camera.projectionMatrixInverse);
      this.skyMat.uniforms.invView.value.copy(camera.matrixWorld);

      this.cloudMat.uniforms.invProj.value.copy(camera.projectionMatrixInverse);
      this.cloudMat.uniforms.invView.value.copy(camera.matrixWorld);

      this.skyMat.uniforms.resolution.value.set(RENDER_WIDTH, RENDER_HEIGHT);
      this.cloudMat.uniforms.resolution.value.set(RENDER_WIDTH, RENDER_HEIGHT);

      this.skyMat.uniforms.pixelRatio.value = 1.0;
      this.cloudMat.uniforms.pixelRatio.value = 1.0;

      if (this.skyBox) this.skyBox.position.copy(camera.position);
      if (this.cloudBox) this.cloudBox.position.copy(camera.position);
    }

    let progress = (playerZ - this.colorConfig.minZ) / (this.colorConfig.maxZ - this.colorConfig.minZ);
    progress = Math.max(0, Math.min(1, progress));

    let startStage = this.colorConfig.stages[0];
    let endStage = this.colorConfig.stages[this.colorConfig.stages.length - 1];

    for (let i = 0; i < this.colorConfig.stages.length - 1; i++) {
      if (progress >= this.colorConfig.stages[i].pct && progress <= this.colorConfig.stages[i + 1].pct) {
        startStage = this.colorConfig.stages[i];
        endStage = this.colorConfig.stages[i + 1];
        break;
      }
    }

    const segmentRange = endStage.pct - startStage.pct;
    const segmentProgress = segmentRange === 0 ? 0 : (progress - startStage.pct) / segmentRange;

    const rBottom = Math.round(startStage.skyBottom.r + (endStage.skyBottom.r - startStage.skyBottom.r) * segmentProgress);
    const gBottom = Math.round(startStage.skyBottom.g + (endStage.skyBottom.g - startStage.skyBottom.g) * segmentProgress);
    const bBottom = Math.round(startStage.skyBottom.b + (endStage.skyBottom.b - startStage.skyBottom.b) * segmentProgress);

    const rTop = Math.round(startStage.skyTop.r + (endStage.skyTop.r - startStage.skyTop.r) * segmentProgress);
    const gTop = Math.round(startStage.skyTop.g + (endStage.skyTop.g - startStage.skyTop.g) * segmentProgress);
    const bTop = Math.round(startStage.skyTop.b + (endStage.skyTop.b - startStage.skyTop.b) * segmentProgress);

    this.settings.zenithColor.setRGB(rTop / 255, gTop / 255, bTop / 255);
    this.settings.horizonColor.setRGB(rBottom / 255, gBottom / 255, bBottom / 255);
  }

  destroy() {
    if (this.skyBox) {
      this.scene.remove(this.skyBox);
      this.skyBox = null;
    }
    if (this.cloudBox) {
      this.scene.remove(this.cloudBox);
      this.cloudBox = null;
    }
    if (this.cloudGeo) {
      this.cloudGeo.dispose();
      this.cloudGeo = null;
    }
    if (this.skyMat) {
      this.skyMat.dispose();
      this.skyMat = null;
    }
    if (this.cloudMat) {
      this.cloudMat.dispose();
      this.cloudMat = null;
    }
  }
}