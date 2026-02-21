// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";

const PRESET = {
  m1: 5,
  n11: 10,
  n12: 2,
  n13: 7,
  m2: 5,
  n21: 10,
  n22: 10,
  n23: 10,
};

const THEME = {
  colors: ["#FF416C", "#FF6B6B", "#6C5CE7", "#46CAF2"],
  burstColor: "#ffffff",
};

class SuperformulaBackgroundRenderer {
  constructor(container) {
    this.container = container;
    this.clock = new THREE.Clock();
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 0, 2.75);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      premultipliedAlpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.setClearAlpha(0);
    Object.assign(this.renderer.domElement.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      zIndex: "0",
    });
    this.container.appendChild(this.renderer.domElement);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.85,
      0.4,
      0.25
    );
    this.composer.addPass(this.bloomPass);

    this.burstActive = 0;
    this.burstStartTime = -1;
    this.lastBurstTime = 0;

    this.createWireframe();

    this.handleResize = this.handleResize.bind(this);

    window.addEventListener("resize", this.handleResize);

    this.animate();
    this.triggerBurst();
  }

  superformula(angle, m, n1, n2, n3, a = 1, b = 1) {
    const term1 = Math.pow(Math.abs(Math.cos((m * angle) / 4) / a), n2);
    const term2 = Math.pow(Math.abs(Math.sin((m * angle) / 4) / b), n3);
    const sum = term1 + term2;
    if (sum === 0) return 0;
    return Math.pow(sum, -1 / n1);
  }

  createWireframe() {
    const resolutionTheta = 100;
    const resolutionPhi = 100;
    const vertexCount = (resolutionTheta + 1) * (resolutionPhi + 1);

    const positions = new Float32Array(vertexCount * 3);
    const colors = new Float32Array(vertexCount * 3);
    const indices = [];

    const themeColors = THEME.colors.map((hex) => new THREE.Color(hex));

    let vertexIndex = 0;
    for (let i = 0; i <= resolutionTheta; i++) {
      const theta = THREE.MathUtils.mapLinear(i, 0, resolutionTheta, -Math.PI / 2, Math.PI / 2);
      const r1 = this.superformula(theta, PRESET.m1, PRESET.n11, PRESET.n12, PRESET.n13);

      for (let j = 0; j <= resolutionPhi; j++) {
        const phi = THREE.MathUtils.mapLinear(j, 0, resolutionPhi, -Math.PI, Math.PI);
        const r2 = this.superformula(phi, PRESET.m2, PRESET.n21, PRESET.n22, PRESET.n23);

        const x = r1 * Math.cos(theta) * r2 * Math.cos(phi);
        const y = r1 * Math.sin(theta);
        const z = r1 * Math.cos(theta) * r2 * Math.sin(phi);

        positions[vertexIndex * 3 + 0] = x;
        positions[vertexIndex * 3 + 1] = y;
        positions[vertexIndex * 3 + 2] = z;

        const gradientPosition =
          THREE.MathUtils.clamp((y + 1.75) / 3.5, 0, 1) * (themeColors.length - 1);
        const colorIndex = Math.floor(gradientPosition);
        const nextColorIndex = Math.min(colorIndex + 1, themeColors.length - 1);
        const mix = gradientPosition - colorIndex;
        const color = themeColors[colorIndex].clone().lerp(themeColors[nextColorIndex], mix);

        colors[vertexIndex * 3 + 0] = color.r;
        colors[vertexIndex * 3 + 1] = color.g;
        colors[vertexIndex * 3 + 2] = color.b;

        vertexIndex++;
      }
    }

    for (let i = 0; i < resolutionTheta; i++) {
      for (let j = 0; j < resolutionPhi; j++) {
        const current = i * (resolutionPhi + 1) + j;
        const nextTheta = (i + 1) * (resolutionPhi + 1) + j;
        const nextPhi = current + 1;
        indices.push(current, nextTheta, current, nextPhi);
      }
      indices.push(
        i * (resolutionPhi + 1) + resolutionPhi,
        (i + 1) * (resolutionPhi + 1) + resolutionPhi
      );
    }
    const lastRowStart = resolutionTheta * (resolutionPhi + 1);
    for (let j = 0; j < resolutionPhi; j++) {
      indices.push(lastRowStart + j, lastRowStart + j + 1);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    geometry.setIndex(indices);
    geometry.computeBoundingSphere();

    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pulseSpeed: { value: 1 },
        pulseIntensity: { value: 0.2 },
        microAnimationIntensity: { value: 0.15 },
        dashSize: { value: 0.1 },
        dashRatio: { value: 0.5 },
        burstActive: { value: 0 },
        burstStartTime: { value: -1 },
        burstSpeed: { value: 0.8 },
        burstDuration: { value: 6 },
        burstColor: { value: new THREE.Color(THEME.burstColor) },
        multiWave: { value: 1 },
      },
      vertexShader: `
        uniform float time;
        uniform float pulseSpeed;
        uniform float pulseIntensity;
        uniform float microAnimationIntensity;

        varying vec3 vColor;
        varying vec3 vPos;
        varying float vLineDistance;

        void main() {
          vColor = color;
          vPos = position;
          vLineDistance = length(position);

          float pulse = sin(length(position) * 2.0 - time * pulseSpeed) * pulseIntensity;
          vec3 pulseOffset = normalize(position) * pulse;

          vec3 microOffset = vec3(
            sin(position.x * 8.0 + time * 3.0),
            cos(position.y * 9.0 + time * 2.7),
            sin(position.z * 7.0 + time * 3.3)
          ) * microAnimationIntensity;

          vec3 animatedPos = position + pulseOffset + microOffset;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(animatedPos, 1.0);
        }
      `,
      fragmentShader: `
        uniform float time;
        uniform float dashSize;
        uniform float dashRatio;
        uniform float burstActive;
        uniform float burstStartTime;
        uniform float burstSpeed;
        uniform float burstDuration;
        uniform vec3 burstColor;
        uniform float multiWave;

        varying vec3 vColor;
        varying vec3 vPos;
        varying float vLineDistance;

        void main() {
          vec3 finalColor = vColor;
          float finalIntensity = 1.0;

          float totalSize = dashSize * (1.0 + dashRatio);
          float patternPos = mod(vLineDistance + time * 0.2, totalSize);
          float dashPart = step(patternPos, dashSize);

          if (dashPart < 0.1) {
            discard;
          }

          finalIntensity *= (1.0 + dashPart * 0.5);

          if (burstActive > 0.5) {
            float burstElapsed = max(0.0, time - burstStartTime);
            if (burstElapsed < burstDuration) {
              float distOrigin = length(vPos);
              float progress = burstElapsed / burstDuration;

              float mainRadius = burstElapsed * burstSpeed;
              float mainThickness = 0.4 * (1.0 - 0.5 * progress);
              float mainDist = abs(distOrigin - mainRadius);
              float mainWave = 1.0 - smoothstep(0.0, mainThickness, mainDist);

              float secondaryWave = 0.0;
              float tertiaryWave = 0.0;
              if (multiWave > 0.5) {
                float secondaryRadius = burstElapsed * (burstSpeed * 1.5);
                float secondaryThickness = 0.3 * (1.0 - 0.6 * progress);
                float secondaryDist = abs(distOrigin - secondaryRadius);
                secondaryWave = (1.0 - smoothstep(0.0, secondaryThickness, secondaryDist)) * (1.0 - progress * 0.7);

                float tertiaryRadius = burstElapsed * (burstSpeed * 0.7);
                float tertiaryThickness = 0.25 * (1.0 - 0.4 * progress);
                float tertiaryDist = abs(distOrigin - tertiaryRadius);
                tertiaryWave = (1.0 - smoothstep(0.0, tertiaryThickness, tertiaryDist)) * (1.0 - progress * 0.5);
              }

              vec3 waveColorShift = burstColor;
              if (secondaryWave > 0.01) {
                waveColorShift = mix(burstColor, vec3(0.5, 0.8, 1.0), 0.3);
              }
              if (tertiaryWave > 0.01) {
                waveColorShift = mix(burstColor, vec3(0.8, 0.5, 1.0), 0.3);
              }

              float combinedWave = max(max(mainWave, secondaryWave * 0.8), tertiaryWave * 0.6);
              combinedWave = max(combinedWave, smoothstep(0.0, mainRadius, distOrigin) * 0.4);
              combinedWave *= 1.0 - smoothstep(burstDuration * 0.6, burstDuration, burstElapsed);

              finalColor = mix(finalColor, waveColorShift, combinedWave * 0.8);
              finalIntensity += combinedWave * 3.0;

              float rippleFactor = sin(distOrigin * 10.0 - burstElapsed * 5.0) * 0.5 + 0.5;
              rippleFactor *= smoothstep(0.0, mainRadius * 0.8, distOrigin) * (1.0 - smoothstep(mainRadius * 0.8, mainRadius, distOrigin));
              rippleFactor *= 0.15;
              finalIntensity += rippleFactor;
            }
          }

          gl_FragColor = vec4(finalColor * finalIntensity, 1.0);
        }
      `,
      vertexColors: true,
    });

    this.wireframeMesh = new THREE.LineSegments(geometry, material);
    this.scene.add(this.wireframeMesh);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    if (this.wireframeMesh) {
      this.wireframeMesh.rotation.y += delta * 0.25;
      this.wireframeMesh.rotation.x += delta * 0.05;

      const uniforms = this.wireframeMesh.material.uniforms;
      uniforms.time.value = elapsed;
      uniforms.burstActive.value = this.burstActive;
      uniforms.burstStartTime.value = this.burstStartTime;

      if (this.burstActive > 0.5 && elapsed - this.burstStartTime >= uniforms.burstDuration.value) {
        this.burstActive = 0;
        uniforms.burstActive.value = 0;
      }
    }

    if (elapsed - this.lastBurstTime > 8) {
      this.triggerBurst();
    }

    this.composer.render();
  }

  triggerBurst() {
    const elapsed = this.clock.getElapsedTime();
    if (elapsed - this.lastBurstTime < 0.6) return;

    this.burstActive = 1;
    this.burstStartTime = elapsed;
    this.lastBurstTime = elapsed;

    if (this.wireframeMesh) {
      const uniforms = this.wireframeMesh.material.uniforms;
      uniforms.burstActive.value = 1;
      uniforms.burstStartTime.value = this.burstStartTime;
    }
  }

  handleResize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer.setSize(width, height);
  }

  dispose() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    window.removeEventListener("resize", this.handleResize);

    if (this.wireframeMesh) {
      this.scene.remove(this.wireframeMesh);
      this.wireframeMesh.geometry.dispose();
      this.wireframeMesh.material.dispose();
      this.wireframeMesh = null;
    }

    this.composer.renderTarget1?.dispose?.();
    this.composer.renderTarget2?.dispose?.();
    this.renderer.dispose();
    this.renderer.forceContextLoss();

    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

export function SuperformulaBackground() {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const renderer = new SuperformulaBackgroundRenderer(containerRef.current);
    return () => renderer.dispose();
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
}
