/**
 * Antigravity — порт логики react-bits / R3F на vanilla Three.js для статического сайта.
 * Цвета и плотность подобраны под пастельную тему (роза + сирень).
 */
import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";

const DEFAULTS = {
  count: 260,
  magnetRadius: 6,
  ringRadius: 7,
  waveSpeed: 0.4,
  waveAmplitude: 1,
  particleSize: 1.5,
  lerpSpeed: 0.05,
  color: 0xc49aab,
  autoAnimate: true,
  particleVariance: 1,
  rotationSpeed: 0,
  depthFactor: 1,
  pulseSpeed: 3,
  fieldStrength: 10,
};

function getViewportSize(camera) {
  const dist = Math.abs(camera.position.z);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const height = 2 * Math.tan(vFov / 2) * dist;
  const width = height * camera.aspect;
  return { width, height };
}

export function initAntigravity(container, opts = {}) {
  if (!container) return () => {};

  const p = { ...DEFAULTS, ...opts };
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) {
    container.classList.add("antigravity-root--off");
    return () => {};
  }

  const count =
    window.matchMedia("(max-width: 768px)").matches ? Math.min(140, p.count) : p.count;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "low-power",
    });
  } catch (e) {
    console.warn("Antigravity: WebGL недоступен", e);
    container.classList.add("antigravity-root--off");
    return () => {};
  }

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
  camera.position.set(0, 0, 50);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  container.appendChild(renderer.domElement);

  const geometry = new THREE.CapsuleGeometry(0.1, 0.4, 4, 8);
  const material = new THREE.MeshBasicMaterial({
    color: p.color,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(mesh);

  const dummy = new THREE.Object3D();
  let particles = [];
  let vw = 100;
  let vh = 100;

  function buildParticles() {
    const { width, height } = getViewportSize(camera);
    vw = width;
    vh = height;
    particles = [];
    for (let i = 0; i < count; i++) {
      const t = Math.random() * 100;
      const factor = 20 + Math.random() * 100;
      const speed = 0.01 + Math.random() / 200;
      const xFactor = -50 + Math.random() * 100;
      const yFactor = -50 + Math.random() * 100;
      const zFactor = -50 + Math.random() * 100;
      const x = (Math.random() - 0.5) * width;
      const y = (Math.random() - 0.5) * height;
      const z = (Math.random() - 0.5) * 20;
      const randomRadiusOffset = (Math.random() - 0.5) * 2;
      particles.push({
        t,
        factor,
        speed,
        xFactor,
        yFactor,
        zFactor,
        mx: x,
        my: y,
        mz: z,
        cx: x,
        cy: y,
        cz: z,
        vx: 0,
        vy: 0,
        vz: 0,
        randomRadiusOffset,
      });
    }
  }

  const pointer = { x: 0, y: 0 };
  const lastMousePos = { x: 0, y: 0 };
  let lastMouseMoveTime = 0;
  const virtualMouse = { x: 0, y: 0 };

  function onPointerMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    const d = Math.hypot(pointer.x - lastMousePos.x, pointer.y - lastMousePos.y);
    if (d > 0.001) {
      lastMouseMoveTime = performance.now();
      lastMousePos.x = pointer.x;
      lastMousePos.y = pointer.y;
    }
  }

  window.addEventListener("pointermove", onPointerMove, { passive: true });

  const clock = new THREE.Clock();

  let raf = 0;
  let lastResizeW = 0;
  let lastResizeH = 0;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
    if (Math.abs(w - lastResizeW) > 4 || Math.abs(h - lastResizeH) > 4 || particles.length === 0) {
      lastResizeW = w;
      lastResizeH = h;
      buildParticles();
    }
  }

  const ro = new ResizeObserver(() => {
    window.requestAnimationFrame(resize);
  });
  ro.observe(container);
  resize();

  function animate() {
    raf = requestAnimationFrame(animate);
    const elapsed = clock.getElapsedTime();

    const { width: vWidth, height: vHeight } = getViewportSize(camera);
    vw = vWidth;
    vh = vHeight;

    let destX = (pointer.x * vw) / 2;
    let destY = (pointer.y * vh) / 2;

    if (p.autoAnimate && performance.now() - lastMouseMoveTime > 2000) {
      destX = Math.sin(elapsed * 0.5) * (vw / 4);
      destY = Math.cos(elapsed * 0.5 * 2) * (vh / 4);
    }

    const smoothFactor = 0.05;
    virtualMouse.x += (destX - virtualMouse.x) * smoothFactor;
    virtualMouse.y += (destY - virtualMouse.y) * smoothFactor;

    const targetX = virtualMouse.x;
    const targetY = virtualMouse.y;
    const globalRotation = elapsed * p.rotationSpeed;

    particles.forEach((particle, i) => {
      let { t, speed, mx, my, mz, randomRadiusOffset } = particle;
      t = (particle.t += speed / 2);

      const projectionFactor = 1 - mz / 50;
      const projectedTargetX = targetX * projectionFactor;
      const projectedTargetY = targetY * projectionFactor;

      const dx = mx - projectedTargetX;
      const dy = my - projectedTargetY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      let targetPos = { x: mx, y: my, z: mz * p.depthFactor };

      if (dist < p.magnetRadius) {
        const angle = Math.atan2(dy, dx) + globalRotation;
        const wave = Math.sin(t * p.waveSpeed + angle) * (0.5 * p.waveAmplitude);
        const deviation = randomRadiusOffset * (5 / (p.fieldStrength + 0.1));
        const currentRingRadius = p.ringRadius + wave + deviation;

        targetPos.x = projectedTargetX + currentRingRadius * Math.cos(angle);
        targetPos.y = projectedTargetY + currentRingRadius * Math.sin(angle);
        targetPos.z = mz * p.depthFactor + Math.sin(t) * (1 * p.waveAmplitude * p.depthFactor);
      }

      particle.cx += (targetPos.x - particle.cx) * p.lerpSpeed;
      particle.cy += (targetPos.y - particle.cy) * p.lerpSpeed;
      particle.cz += (targetPos.z - particle.cz) * p.lerpSpeed;

      dummy.position.set(particle.cx, particle.cy, particle.cz);
      dummy.lookAt(projectedTargetX, projectedTargetY, particle.cz);
      dummy.rotateX(Math.PI / 2);

      const currentDistToMouse = Math.hypot(
        particle.cx - projectedTargetX,
        particle.cy - projectedTargetY
      );
      const distFromRing = Math.abs(currentDistToMouse - p.ringRadius);
      let scaleFactor = 1 - distFromRing / 10;
      scaleFactor = Math.max(0, Math.min(1, scaleFactor));

      const finalScale =
        scaleFactor * (0.8 + Math.sin(t * p.pulseSpeed) * 0.2 * p.particleVariance) * p.particleSize;
      dummy.scale.set(finalScale, finalScale, finalScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
    renderer.render(scene, camera);
  }

  animate();

  return function destroy() {
    cancelAnimationFrame(raf);
    window.removeEventListener("pointermove", onPointerMove);
    ro.disconnect();
    geometry.dispose();
    material.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const root = document.getElementById("antigravity-root");
  if (!root) return;
  initAntigravity(root, DEFAULTS);
});
