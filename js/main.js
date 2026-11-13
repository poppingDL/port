// ========== 主入口：自适应布局 + Three.js 场景 + DOF 后期处理 + 面板联动 ==========
import * as THREE from 'three';
import { buildPortScene, animateScene } from './scene.js';
import { createComposer } from './postprocessing.js';
import { startCounters, initPanels } from './panels.js';
import { dataStore } from './data.js';

// ---------- 自适应：1920x1080 舞台等比缩放 ----------
const DESIGN_W = 1920;
const DESIGN_H = 1080;
const stage = document.getElementById('stage');

function fitStage() {
  const scale = Math.min(window.innerWidth / DESIGN_W, window.innerHeight / DESIGN_H);
  const offsetX = (window.innerWidth - DESIGN_W * scale) / 2;
  const offsetY = (window.innerHeight - DESIGN_H * scale) / 2;
  stage.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
}
fitStage();

// ---------- 场景 / 相机 / 渲染器 ----------
const container = document.getElementById('scene-container');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04101f);

const camera = new THREE.PerspectiveCamera(48, 1, 0.5, 800);
const target = new THREE.Vector3(0, 7, -2);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
container.appendChild(renderer.domElement);

// ---------- 构建港口场景 ----------
buildPortScene(scene);

// ---------- DOF + Bloom 后期处理 ----------
let composer = null;

function currentSize() {
  return {
    w: Math.max(320, container.clientWidth),
    h: Math.max(240, container.clientHeight)
  };
}

function resizeRenderer() {
  const { w, h } = currentSize();
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (composer) composer.setSize(w, h);
}

const { w: initW, h: initH } = currentSize();
camera.aspect = initW / initH;
camera.updateProjectionMatrix();
renderer.setSize(initW, initH);
composer = createComposer(renderer, scene, camera, initW, initH);

// ---------- 面板 ----------
startCounters();
initPanels(dataStore);

// ---------- 顶部时钟 ----------
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const week = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
  document.getElementById('currentDate').textContent =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${week}`;
  document.getElementById('currentClock').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

// ---------- 相机环绕 ----------
const orbitRadius = 152;
const orbitHeight = 62;
const lookAt = new THREE.Vector3();

// ---------- 帧率监控 ----------
const fpsEl = document.getElementById('fpsMeter');
let frames = 0;
let fpsTimer = performance.now();

// ---------- 渲染循环 ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // 小幅环绕（避免转到背面看到空旷区域），同时为 DOF 提供纵深变化
  const angle = 0.78 + Math.sin(elapsed * 0.055) * 0.28;
  camera.position.set(
    Math.cos(angle) * orbitRadius,
    orbitHeight + Math.sin(elapsed * 0.22) * 2.5,
    Math.sin(angle) * orbitRadius - 16
  );
  lookAt.copy(target);
  camera.lookAt(lookAt);

  // 关键：景深对焦距离跟随相机到主体的距离，避免全屏虚化
  if (composer) composer.updateFocus(camera.position.distanceTo(target));

  animateScene(scene, elapsed);
  composer ? composer.render() : renderer.render(scene, camera);

  // FPS
  frames++;
  const now = performance.now();
  if (now - fpsTimer > 1000) {
    if (fpsEl) fpsEl.textContent = `${Math.round((frames * 1000) / (now - fpsTimer))} FPS`;
    frames = 0;
    fpsTimer = now;
  }
}

// ---------- 尺寸变化 ----------
let resizeTimer = null;
window.addEventListener('resize', () => {
  fitStage();
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(resizeRenderer, 120);
});

// 启动
resizeRenderer();
window.__PORT_BOOTED__ = true;
document.getElementById('boot-error').hidden = true;
animate();
