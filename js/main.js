// ========== 主入口：Three.js 场景 + DOF 后期处理 + 面板联动 ==========
import * as THREE from 'three';
import { buildPortScene, animateScene } from './scene.js';
import { createComposer } from './postprocessing.js';
import { startCounters, initPanels } from './panels.js';
import { dataStore } from './data.js';

// ---------- 场景 / 相机 / 渲染器 ----------
const container = document.getElementById('scene-container');
const W = container.clientWidth;
const H = container.clientHeight;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x04101f);

const camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 500);
camera.position.set(55, 38, 55);
camera.lookAt(0, 5, 10);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(W, H);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
container.appendChild(renderer.domElement);

// ---------- 构建港口场景 ----------
buildPortScene(scene);

// ---------- DOF 后期处理 ----------
const composer = createComposer(renderer, scene, camera);

// ---------- 面板初始化 ----------
startCounters();
initPanels(dataStore);

// ---------- 顶部时钟 ----------
function updateClock() {
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const week = ['星期日','星期一','星期二','星期三','星期四','星期五','星期六'][now.getDay()];
  document.getElementById('currentDate').textContent =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${week}`;
  document.getElementById('currentClock').textContent =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}
updateClock();
setInterval(updateClock, 1000);

// ---------- 相机缓慢环绕（增强 DOF 纵深感） ----------
let angle = 0;
const orbitRadius = 62;
const orbitHeight = 36;

// ---------- 渲染循环 ----------
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // 相机缓慢环绕
  angle += 0.0015;
  camera.position.x = Math.cos(angle) * orbitRadius;
  camera.position.z = Math.sin(angle) * orbitRadius + 10;
  camera.position.y = orbitHeight + Math.sin(elapsed * 0.2) * 3;
  camera.lookAt(0, 6, 12);

  // 场景动画
  animateScene(scene, elapsed);

  // 使用 DOF composer 渲染
  composer.render();
}
animate();

// ---------- 窗口缩放适配（大屏场景下一般不变，但保留） ----------
window.addEventListener('resize', () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
