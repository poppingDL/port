// ========== 港口三维场景构建 ==========
import * as THREE from 'three';

/**
 * 创建完整港口场景：海面、码头平台、岸桥、船舶、集装箱堆场
 */
export function buildPortScene(scene) {
  // ---------- 灯光 ----------
  const hemi = new THREE.HemisphereLight(0x88bbff, 0x0a1830, 0.7);
  scene.add(hemi);

  const dir = new THREE.DirectionalLight(0xffffff, 1.2);
  dir.position.set(40, 60, 30);
  dir.castShadow = true;
  dir.shadow.mapSize.set(2048, 2048);
  dir.shadow.camera.left = -80;
  dir.shadow.camera.right = 80;
  dir.shadow.camera.top = 80;
  dir.shadow.camera.bottom = -80;
  scene.add(dir);

  const fill = new THREE.PointLight(0x00d4ff, 0.6, 120);
  fill.position.set(0, 20, -10);
  scene.add(fill);

  // ---------- 雾效（配合 DOF 增强纵深） ----------
  scene.fog = new THREE.FogExp2(0x04101f, 0.008);

  // ---------- 海面 ----------
  const seaGeo = new THREE.PlaneGeometry(300, 300, 80, 80);
  const seaMat = new THREE.MeshStandardMaterial({
    color: 0x0a2540,
    metalness: 0.6,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85
  });
  const sea = new THREE.Mesh(seaGeo, seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -0.5;
  sea.receiveShadow = true;
  scene.add(sea);
  scene.userData.sea = sea;

  // ---------- 码头平台 ----------
  const dockGeo = new THREE.BoxGeometry(120, 2, 40);
  const dockMat = new THREE.MeshStandardMaterial({
    color: 0x1a2a3a,
    metalness: 0.3,
    roughness: 0.8
  });
  const dock = new THREE.Mesh(dockGeo, dockMat);
  dock.position.set(0, 1, 10);
  dock.receiveShadow = true;
  scene.add(dock);

  // 码头边线发光
  const dockEdgeMat = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.6 });
  const dockEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(dockGeo),
    dockEdgeMat
  );
  dockEdge.position.copy(dock.position);
  scene.add(dockEdge);

  // ---------- 集装箱堆场（多排） ----------
  const containerColors = [0x00d4ff, 0x1e6fff, 0x00ffa3, 0xffb020, 0xff4d6d, 0x88aabb];
  const yardGroup = new THREE.Group();
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 12; col++) {
      for (let layer = 0; layer < (row < 3 ? 3 : 2); layer++) {
        const w = 6.5, h = 2.6, d = 2.6;
        const geo = new THREE.BoxGeometry(w, h, d);
        const color = containerColors[(row + col) % containerColors.length];
        const mat = new THREE.MeshStandardMaterial({
          color,
          metalness: 0.4,
          roughness: 0.6
        });
        const box = new THREE.Mesh(geo, mat);
        box.position.set(
          -38 + col * 6.5,
          2 + layer * 2.6,
          22 + row * 3.2
        );
        box.castShadow = true;
        box.receiveShadow = true;
        yardGroup.add(box);
      }
    }
  }
  scene.add(yardGroup);
  scene.userData.yard = yardGroup;

  // ---------- 岸桥（Gantry Crane） ----------
  const cranes = [];
  const cranePositions = [-40, -20, 0, 20, 40];
  cranePositions.forEach((x, i) => {
    const crane = createCrane();
    crane.position.set(x, 2, 12);
    crane.userData.baseX = x;
    crane.userData.trolleyOffset = 0;
    crane.userData.trolleySpeed = 0.02 + Math.random() * 0.02;
    crane.userData.trolleyDir = 1;
    scene.add(crane);
    cranes.push(crane);
  });
  scene.userData.cranes = cranes;

  // ---------- 船舶 ----------
  const ships = []
  // 在泊位作业的大船
  const ship1 = createShip(0x2a3a5a, 30, 8, 4);
  ship1.position.set(-15, 1.5, -2);
  ship1.userData.baseX = -15;
  scene.add(ship1);
  ships.push(ship1);

  const ship2 = createShip(0x1a2a4a, 24, 7, 3.5);
  ship2.position.set(25, 1.2, -4);
  ship2.userData.baseX = 25;
  scene.add(ship2);
  ships.push(ship2);

  // 远处航行中的船
  const ship3 = createShip(0x1a2a3a, 18, 6, 3);
  ship3.position.set(60, 1, -20);
  ship3.userData.baseX = 60;
  ship3.userData.sailing = true;
  scene.add(ship3);
  ships.push(ship3);

  scene.userData.ships = ships;

  // ---------- 灯塔 ----------
  const lighthouse = createLighthouse();
  lighthouse.position.set(-60, 2, 28);
  scene.add(lighthouse);

  return scene;
}

/** 创建岸桥模型 */
function createCrane() {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xd4882a,
    metalness: 0.5,
    roughness: 0.5
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x00d4ff,
    emissive: 0x004466,
    emissiveIntensity: 0.5
  });

  // 两侧腿
  const legGeo = new THREE.BoxGeometry(1, 18, 1);
  const legL = new THREE.Mesh(legGeo, mat);
  legL.position.set(-6, 9, 0);
  legL.castShadow = true;
  const legR = new THREE.Mesh(legGeo, mat);
  legR.position.set(6, 9, 0);
  legR.castShadow = true;
  group.add(legL, legR);

  // 横梁
  const beamGeo = new THREE.BoxGeometry(14, 1.5, 2);
  const beam = new THREE.Mesh(beamGeo, mat);
  beam.position.set(0, 18, 0);
  beam.castShadow = true;
  group.add(beam);

  // 横梁发光边
  const beamEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(beamGeo),
    new THREE.LineBasicMaterial({ color: 0x00d4ff })
  );
  beamEdge.position.copy(beam.position);
  group.add(beamEdge);

  // 小车 + 吊具
  const trolley = new THREE.Group();
  const trolleyBody = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 1.5), accentMat);
  trolleyBody.position.y = 17;
  trolley.add(trolleyBody);

  // 吊缆
  const cableGeo = new THREE.CylinderGeometry(0.08, 0.08, 10, 6);
  const cableMat = new THREE.MeshBasicMaterial({ color: 0xaaaaaa });
  const cable = new THREE.Mesh(cableGeo, cableMat);
  cable.position.y = 11;
  trolley.add(cable);

  // 吊具（spreader）
  const spreader = new THREE.Mesh(new THREE.BoxGeometry(4, 0.4, 1.2), accentMat);
  spreader.position.y = 6;
  spreader.castShadow = true;
  trolley.add(spreader);
  trolley.userData.spreader = spreader;
  trolley.userData.cable = cable;

  group.add(trolley);
  group.userData.trolley = trolley;

  return group;
}

/** 创建船舶模型 */
function createShip(color, length, beam, draft) {
  const group = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color,
    metalness: 0.4,
    roughness: 0.6
  });

  // 船体（梯形截面用简单 Box 模拟）
  const hullGeo = new THREE.BoxGeometry(length, draft, beam);
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = draft / 2;
  hull.castShadow = true;
  hull.receiveShadow = true;
  group.add(hull);

  // 甲板上的集装箱
  const containerColors = [0x00d4ff, 0xffb020, 0x1e6fff, 0x00ffa3];
  const rows = Math.floor(length / 4);
  const cols = Math.floor(beam / 2.5);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (Math.random() > 0.3) {
        const cl = containerColors[Math.floor(Math.random() * containerColors.length)];
        const boxMat = new THREE.MeshStandardMaterial({ color: cl, metalness: 0.3, roughness: 0.7 });
        const box = new THREE.Mesh(new THREE.BoxGeometry(3.5, 2.2, 2.2), boxMat);
        box.position.set(
          -length / 2 + 2 + r * 4,
          draft + 1.1,
          -beam / 2 + 1.2 + c * 2.5
        );
        box.castShadow = true;
        group.add(box);
      }
    }
  }

  // 船桥（驾驶舱）
  const bridgeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.2, roughness: 0.5 });
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(5, 4, beam * 0.7), bridgeMat);
  bridge.position.set(length / 2 - 3, draft + 2, 0);
  bridge.castShadow = true;
  group.add(bridge);

  // 烟囱
  const funnelMat = new THREE.MeshStandardMaterial({ color: 0xd44030, metalness: 0.3, roughness: 0.6 });
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.2, 3, 8), funnelMat);
  funnel.position.set(length / 2 - 5, draft + 4.5, 0);
  group.add(funnel);

  return group;
}

/** 创建灯塔 */
function createLighthouse() {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, roughness: 0.7 });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 14, 8), baseMat);
  tower.position.y = 7;
  tower.castShadow = true;
  group.add(tower);

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xffb020 });
  const light = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 12), lightMat);
  light.position.y = 15;
  group.add(light);
  group.userData.light = light;

  return group;
}

/** 每帧动画更新：岸桥小车横移、船舶轻微摇摆、海面波动 */
export function animateScene(scene, elapsed) {
  // 海面波动
  const sea = scene.userData.sea;
  if (sea) {
    const pos = sea.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = Math.sin((x + elapsed * 2) * 0.15) * 0.3 + Math.cos((y + elapsed) * 0.12) * 0.2;
      pos.setZ(i, z);
    }
    pos.needsUpdate = true;
  }

  // 岸桥小车往返 + 吊具升降
  scene.userData.cranes?.forEach(crane => {
    const t = crane.userData.trolley;
    if (!t) return;
    t.position.x += crane.userData.trolleySpeed * crane.userData.trolleyDir;
    if (Math.abs(t.position.x) > 5) {
      crane.userData.trolleyDir *= -1;
    }
    // 吊具升降
    const spreader = t.userData.spreader;
    const cable = t.userData.cable;
    if (spreader && cable) {
      const y = 6 + Math.sin(elapsed * 1.5 + crane.userData.baseX) * 3;
      spreader.position.y = y;
      cable.scale.y = (11 - y) / 10;
      cable.position.y = y + (10 * cable.scale.y) / 2;
    }
  });

  // 船舶轻微摇摆
  scene.userData.ships?.forEach((ship, i) => {
    ship.rotation.z = Math.sin(elapsed * 0.5 + i) * 0.01;
    ship.position.y = 1.5 + Math.sin(elapsed * 0.3 + i) * 0.15;
    // 远处船缓慢航行
    if (ship.userData.sailing) {
      ship.position.x -= 0.02;
      if (ship.position.x < -70) ship.position.x = 70;
    }
  });

  // 灯塔闪烁
  scene.traverse(obj => {
    if (obj.userData?.light) {
      obj.userData.light.material.opacity = 0.5 + Math.abs(Math.sin(elapsed * 2)) * 0.5;
      obj.userData.light.material.transparent = true;
    }
  });
}
