import * as THREE from 'three';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

export class PosterizePass {
  constructor(levels = 50.0) {
    this.uniforms = {
      tDiffuse: { value: null },
      levels: { value: levels }
    };

    const material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        uniform sampler2D tDiffuse;
        uniform float levels;

        void main() {
            vec4 color = texture2D(tDiffuse, vUv);

            float grayscale = max(color.r, max(color.g, color.b));
            
            float lower = floor(grayscale * levels) / levels;
            float higher = ceil(grayscale * levels) / levels;
            float lower_diff = abs(lower - grayscale);
            float higher_diff = abs(higher - grayscale);
            
            float level = (lower_diff < higher_diff) ? lower : higher;
            
            float adjustment = level / max(grayscale, 0.001);
            color.rgb *= adjustment;

            gl_FragColor = color;
        }
      `
    });

    this.pass = new ShaderPass(material);

    const originalRender = this.pass.render.bind(this.pass);
    this.pass.render = function (renderer, writeBuffer, readBuffer, deltaTime, maskActive) {
      if (readBuffer && readBuffer.texture) {
        if (readBuffer.texture.minFilter !== THREE.NearestFilter) {
          readBuffer.texture.minFilter = THREE.NearestFilter;
          readBuffer.texture.magFilter = THREE.NearestFilter;
          readBuffer.texture.needsUpdate = true;
        }
      }
      originalRender(renderer, writeBuffer, readBuffer, deltaTime, maskActive);
    };
  }

  getPass() {
    return this.pass;
  }

  setLevels(levels) {
    this.uniforms.levels.value = levels;
  }
}