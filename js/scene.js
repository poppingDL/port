// ========== 港口三维场景构建 ==========
// 坐标约定：x 沿码头方向，z 由陆侧（+z）指向海侧（-z），y 向上
import * as THREE from 'three';

const COLOR = {
  crane: 0xe0952f,
  craneDark: 0x8a5a12,
  accent: 0x00d4ff,
  hullA: 0x27476e,
  hullB: 0x2f3f5e,
  hullC: 0x1f3b5c,
  deck: 0x8f9aa6,
  concrete: 0x243444,
  container: [0x00a7c4, 0x1e6fff, 0x00c98a, 0xe0952f, 0xc4465f, 0x9fb3c8]
};

/** 构建完整港口场景 */
export function buildPortScene(scene) {
  // ---------- 灯光 ----------
  scene.add(new THREE.HemisphereLight(0x8fc3ff, 0x0a1830, 0.75));

  const sun = new THREE.DirectionalLight(0xffffff, 1.25);
  sun.position.set(55, 75, 40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -95;
  sun.shadow.camera.right = 95;
  sun.shadow.camera.top = 95;
  sun.shadow.camera.bottom = -95;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 220;
  sun.shadow.bias = -0.0008;
  scene.add(sun);

  const fill = new THREE.PointLight(0x2f8bff, 0.7, 180);
  fill.position.set(0, 34, 6);
  scene.add(fill);

  // 雾效：增强纵深，配合 DOF
  scene.fog = new THREE.FogExp2(0x04101f, 0.004);

  // ---------- 共享材质 ----------
  const mats = {
    concrete: new THREE.MeshStandardMaterial({ color: COLOR.concrete, metalness: 0.25, roughness: 0.85 }),
    crane: new THREE.MeshStandardMaterial({ color: COLOR.crane, metalness: 0.45, roughness: 0.45 }),
    craneDark: new THREE.MeshStandardMaterial({ color: COLOR.craneDark, metalness: 0.4, roughness: 0.6 }),
    accent: new THREE.MeshStandardMaterial({ color: COLOR.accent, emissive: 0x007a99, emissiveIntensity: 0.9, metalness: 0.4, roughness: 0.3 }),
    deck: new THREE.MeshStandardMaterial({ color: COLOR.deck, metalness: 0.3, roughness: 0.7 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x6b7c8f, metalness: 0.7, roughness: 0.35 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdde7f2, metalness: 0.2, roughness: 0.5 }),
    glass: new THREE.MeshStandardMaterial({ color: 0x0d2436, emissive: 0x1f6f9c, emissiveIntensity: 0.7, metalness: 0.6, roughness: 0.2 }),
    container: COLOR.container.map(c => new THREE.MeshStandardMaterial({ color: c, metalness: 0.35, roughness: 0.62 })),
    truckCab: new THREE.MeshStandardMaterial({ color: 0xe8eef5, metalness: 0.4, roughness: 0.4 }),
    red: new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x7a1020, emissiveIntensity: 1.0 })
  };
  scene.userData.mats = mats;

  // ---------- 海面 ----------
  const seaGeo = new THREE.PlaneGeometry(420, 420, 48, 48);
  const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({
    color: 0x07203a, metalness: 0.88, roughness: 0.22
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.set(0, -0.6, -60);
  sea.receiveShadow = true;
  scene.add(sea);
  sea.userData.baseZ = Float32Array.from(seaGeo.attributes.position.array);
  scene.userData.sea = sea;

  // ---------- 码头平台 ----------
  const dock = new THREE.Mesh(new THREE.BoxGeometry(150, 4, 46), mats.concrete);
  dock.position.set(0, 2, 10);
  dock.receiveShadow = true;
  dock.castShadow = true;
  scene.add(dock);

  // 码头护舷 + 系缆桩
  for (let x = -70; x <= 70; x += 10) {
    const fender = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 2.2, 10), mats.steel);
    fender.rotation.z = Math.PI / 2;
    fender.position.set(x, 2, -12.6);
    scene.add(fender);

    const bollard = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.7, 1.6, 10), mats.craneDark);
    bollard.position.set(x + 4, 4.8, -10.5);
    bollard.castShadow = true;
    scene.add(bollard);
  }

  // 码头面标线 + 岸桥轨道
  const laneMat = new THREE.MeshBasicMaterial({ color: 0x2f7fa8, transparent: true, opacity: 0.55 });
  [-8, 2, 16, 26].forEach(z => {
    const lane = new THREE.Mesh(new THREE.BoxGeometry(146, 0.08, 0.35), laneMat);
    lane.position.set(0, 4.05, z);
    scene.add(lane);
  });
  [0, 22].forEach(z => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(150, 0.22, 0.5), mats.steel);
    rail.position.set(0, 4.1, z);
    scene.add(rail);
  });

  // ---------- 集装箱堆场 ----------
  const yard = new THREE.Group();
  scene.add(yard);
  scene.userData.yard = yard;

  const blockXs = [-46, -18, 12, 42];
  const blockZs = [8, 22];
  const containerGeo = new THREE.BoxGeometry(6.0, 2.4, 2.4);
  const containerEdgeGeo = new THREE.EdgesGeometry(containerGeo);
  const edgeMat = new THREE.LineBasicMaterial({ color: 0x0b1a28, transparent: true, opacity: 0.6 });

  blockXs.forEach((bx, bi) => {
    blockZs.forEach((bz, bj) => {
      // 堆场箱区地坪
      const pad = new THREE.Mesh(new THREE.BoxGeometry(42, 0.12, 9), new THREE.MeshStandardMaterial({
        color: 0x1b2c3d, metalness: 0.2, roughness: 0.9
      }));
      pad.position.set(bx, 4.06, bz);
      yard.add(pad);

      for (let bay = 0; bay < 6; bay++) {
        for (let row = 0; row < 3; row++) {
          const tiers = 1 + ((bay + row + bi + bj) % 4);
          for (let t = 0; t < tiers; t++) {
            const mat = mats.container[(bay + row + t + bi) % mats.container.length];
            const box = new THREE.Mesh(containerGeo, mat);
            box.position.set(bx - 17 + bay * 6.4, 5.3 + t * 2.42, bz - 2.7 + row * 2.6);
            box.castShadow = t === tiers - 1;
            box.receiveShadow = true;
            yard.add(box);
            if (t === tiers - 1) {
              const edge = new THREE.LineSegments(containerEdgeGeo, edgeMat);
              edge.position.copy(box.position);
              yard.add(edge);
            }
          }
        }
      }
    });
  });

  // ---------- 轮胎吊 RTG（覆盖箱区） ----------
  [[-46, 8], [-18, 22], [12, 8], [42, 22]].forEach(([x, z]) => {
    const rtg = createRTG(mats);
    rtg.position.set(x, 4, z);
    scene.add(rtg);
  });

  // ---------- 岸桥（5 台） ----------
  const cranes = [];
  [-44, -22, 0, 22, 44].forEach((x, i) => {
    const crane = createSTS(mats);
    crane.position.set(x, 4, 12);
    crane.userData.trolleyPhase = i * 1.3;
    crane.userData.trolleySpeed = 0.55 + i * 0.06;
    scene.add(crane);
    cranes.push(crane);
  });
  scene.userData.cranes = cranes;

  // ---------- 船舶 ----------
  const ships = [];
  const shipConf = [
    { x: -24, len: 34, beam: 9, draft: 4.2, color: COLOR.hullA, tiers: 3 },
    { x: 10, len: 30, beam: 8.4, draft: 3.8, color: COLOR.hullB, tiers: 2 },
    { x: 40, len: 24, beam: 7.2, draft: 3.4, color: COLOR.hullC, tiers: 2 }
  ];
  shipConf.forEach((c, i) => {
    const ship = createShip(c, mats);
    ship.position.set(c.x, -2.2, -18 - i * 0.6);
    ship.userData.phase = i * 1.7;
    ship.userData.baseY = -2.2;
    scene.add(ship);
    ships.push(ship);
  });

  // 远处航行中的船
  const sailing = createShip({ len: 20, beam: 6.2, draft: 3, color: 0x1b3552, tiers: 1 }, mats);
  sailing.position.set(70, -2.2, -78);
  sailing.userData.sailing = true;
  scene.add(sailing);
  ships.push(sailing);
  scene.userData.ships = ships;

  // ---------- 集卡 ----------
  const trucks = [];
  const truckLanes = [
    { z: 1, dir: 1, speed: 0.55 },
    { z: 1, dir: 1, speed: 0.4 },
    { z: 15, dir: -1, speed: 0.5 },
    { z: 15, dir: -1, speed: 0.35 },
    { z: 30, dir: 1, speed: 0.45 }
  ];
  truckLanes.forEach((lane, i) => {
    const truck = createTruck(mats);
    truck.position.set(-60 + i * 26, 4.1, lane.z);
    truck.rotation.y = lane.dir > 0 ? 0 : Math.PI;
    truck.userData.dir = lane.dir;
    truck.userData.speed = lane.speed;
    scene.add(truck);
    trucks.push(truck);
  });
  scene.userData.trucks = trucks;

  // ---------- 仓库 / 办公楼 ----------
  const warehouse = new THREE.Mesh(new THREE.BoxGeometry(34, 11, 16), new THREE.MeshStandardMaterial({
    color: 0x2b3f55, metalness: 0.3, roughness: 0.7
  }));
  warehouse.position.set(-58, 9.5, 36);
  warehouse.castShadow = true;
  scene.add(warehouse);

  const roof = new THREE.Mesh(new THREE.BoxGeometry(35, 0.6, 17), mats.steel);
  roof.position.set(-58, 15.2, 36);
  scene.add(roof);

  const office = new THREE.Mesh(new THREE.BoxGeometry(16, 30, 14), new THREE.MeshStandardMaterial({
    color: 0x1f3348, metalness: 0.4, roughness: 0.5
  }));
  office.position.set(62, 19, 38);
  office.castShadow = true;
  scene.add(office);

  // 办公楼发光窗格
  const winMat = new THREE.MeshBasicMaterial({ color: 0x4fd8ff, transparent: true, opacity: 0.75 });
  for (let f = 0; f < 8; f++) {
    for (let c = 0; c < 5; c++) {
      if ((f + c) % 3 === 0) continue;
      const win = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 0.2), winMat);
      win.position.set(55.5 + c * 3.2, 7 + f * 3.4, 31.05);
      scene.add(win);
    }
  }

  // ---------- 防波堤 + 灯塔 + 浮标 ----------
  const breakwater = new THREE.Mesh(new THREE.BoxGeometry(240, 5, 12), new THREE.MeshStandardMaterial({
    color: 0x2a3a48, metalness: 0.2, roughness: 0.95
  }));
  breakwater.position.set(0, 1.5, -110);
  scene.add(breakwater);

  const lighthouse = createLighthouse(mats);
  lighthouse.position.set(-84, 4, -110);
  scene.add(lighthouse);
  scene.userData.lighthouse = lighthouse;

  const buoyMatRed = new THREE.MeshStandardMaterial({ color: 0xff4d6d, emissive: 0x7a1020, emissiveIntensity: 0.8 });
  const buoyMatGreen = new THREE.MeshStandardMaterial({ color: 0x00ffa3, emissive: 0x0a7a4e, emissiveIntensity: 0.8 });
  const buoys = [];
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 2.6, 10), i % 2 ? buoyMatGreen : buoyMatRed);
    b.position.set(-90 + i * 26, 0.9, -62 - (i % 3) * 6);
    b.userData.baseY = 0.9;
    b.userData.phase = i * 0.8;
    scene.add(b);
    buoys.push(b);
  }
  scene.userData.buoys = buoys;

  // ---------- 泊位 / 箱区标牌 ----------
  [-44, -22, 0, 22, 44].forEach((x, i) => {
    const label = createLabel(`${i + 1}# 泊位`, '#7fe4ff');
    label.position.set(x, 40, 6);
    label.scale.set(11, 3.2, 1);
    scene.add(label);
  });
  ['A 区', 'B 区', 'C 区', 'D 区'].forEach((t, i) => {
    const label = createLabel(t, '#8fffd2');
    label.position.set(-46 + i * 30, 17, 26);
    label.scale.set(8, 2.4, 1);
    scene.add(label);
  });

  return scene;
}

// ========== 岸桥（STS） ==========
function createSTS(mats) {
  const g = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(1.7, 20, 1.7);

  // 四条腿 + 门框
  [[-7, -9], [7, -9], [-7, 10], [7, 10]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, mats.crane);
    leg.position.set(x, 10, z);
    leg.castShadow = true;
    g.add(leg);
  });
  [-9, 10].forEach(z => {
    const sill = new THREE.Mesh(new THREE.BoxGeometry(16, 1.6, 1.6), mats.crane);
    sill.position.set(0, 1.2, z);
    sill.castShadow = true;
    g.add(sill);
  });

  // 侧向斜撑
  [[-7, 1], [7, 1]].forEach(([x, z]) => {
    const brace = new THREE.Mesh(new THREE.BoxGeometry(0.9, 12, 0.9), mats.craneDark);
    brace.position.set(x, 8, z);
    brace.rotation.x = 0.5;
    g.add(brace);
  });

  // 上部 A 型架
  [-1, 1].forEach(sign => {
    const slope = new THREE.Mesh(new THREE.BoxGeometry(0.9, 13, 0.9), mats.crane);
    slope.position.set(sign * 3.6, 26, 0);
    slope.rotation.z = sign * 0.5;
    g.add(slope);
  });
  const apex = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 12), mats.crane);
  apex.position.set(0, 31.5, 2);
  apex.castShadow = true;
  g.add(apex);

  // 大梁（伸向海侧）+ 后伸臂
  const boom = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 42), mats.crane);
  boom.position.set(0, 21.5, -11);
  boom.castShadow = true;
  g.add(boom);
  const backReach = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.4, 12), mats.crane);
  backReach.position.set(0, 21.5, 16);
  g.add(backReach);

  // 大梁发光条
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.25, 40), mats.accent);
  glow.position.set(0, 22.4, -11);
  g.add(glow);

  // 机房 + 拉杆
  const house = new THREE.Mesh(new THREE.BoxGeometry(6, 3.4, 6), mats.craneDark);
  house.position.set(0, 24, 17);
  house.castShadow = true;
  g.add(house);

  // 小车 + 吊缆 + 吊具
  const trolley = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 2.6), mats.accent);
  body.position.y = 0;
  trolley.add(body);

  const cableGeo = new THREE.CylinderGeometry(0.09, 0.09, 1, 5);
  const cableMat = new THREE.MeshBasicMaterial({ color: 0x9fb3c8 });
  const cableL = new THREE.Mesh(cableGeo, cableMat);
  const cableR = new THREE.Mesh(cableGeo, cableMat);
  cableL.position.x = -1.1;
  cableR.position.x = 1.1;
  trolley.add(cableL, cableR);

  const spreader = new THREE.Group();
  const frame = new THREE.Mesh(new THREE.BoxGeometry(6, 0.5, 2.6), mats.crane);
  frame.castShadow = true;
  spreader.add(frame);
  const hangingBox = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.3, 2.3), mats.container[0]);
  hangingBox.position.y = -1.5;
  hangingBox.castShadow = true;
  spreader.add(hangingBox);
  trolley.add(spreader);

  trolley.position.set(0, 20.4, -6);
  g.add(trolley);

  // 航空障碍灯
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 8), mats.red);
  beacon.position.set(0, 32.6, 2);
  g.add(beacon);

  g.userData.trolley = trolley;
  g.userData.spreader = spreader;
  g.userData.cableL = cableL;
  g.userData.cableR = cableR;
  g.userData.beacon = beacon;
  return g;
}

// ========== 集装箱船 ==========
function createShip({ len, beam, draft, color, tiers }, mats) {
  const g = new THREE.Group();
  const L = len / 2;
  const B = beam / 2;

  // 船体：尖艏 + 方艉（拉伸 2D 型线）
  const shape = new THREE.Shape();
  shape.moveTo(-L, -B);
  shape.lineTo(L * 0.52, -B);
  shape.quadraticCurveTo(L, -B * 0.62, L, 0);
  shape.quadraticCurveTo(L, B * 0.62, L * 0.52, B);
  shape.lineTo(-L, B);
  shape.lineTo(-L, -B);
  const hullGeo = new THREE.ExtrudeGeometry(shape, { depth: draft, bevelEnabled: false, curveSegments: 8 });
  hullGeo.rotateX(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, new THREE.MeshStandardMaterial({
    color, metalness: 0.45, roughness: 0.55
  }));
  hull.castShadow = true;
  hull.receiveShadow = true;
  g.add(hull);

  // 水线红色带
  const waterline = new THREE.Mesh(new THREE.BoxGeometry(len * 0.96, 0.5, beam * 0.99), new THREE.MeshStandardMaterial({
    color: 0x8c2530, metalness: 0.4, roughness: 0.6
  }));
  waterline.position.y = 1.6;
  g.add(waterline);

  // 甲板
  const deck = new THREE.Mesh(new THREE.BoxGeometry(len * 0.95, 0.35, beam * 0.96), mats.deck);
  deck.position.y = draft + 0.1;
  deck.receiveShadow = true;
  g.add(deck);

  // 甲板集装箱（按贝位堆叠）
  const boxGeo = new THREE.BoxGeometry(3.6, 2.3, 2.3);
  const bays = Math.max(3, Math.floor((len * 0.78) / 4));
  const rows = Math.max(2, Math.floor((beam * 0.82) / 2.5));
  for (let b = 0; b < bays; b++) {
    for (let r = 0; r < rows; r++) {
      const t = 1 + ((b + r) % tiers);
      for (let k = 0; k < t; k++) {
        const box = new THREE.Mesh(boxGeo, mats.container[(b + r + k) % mats.container.length]);
        box.position.set(
          -L * 0.86 + b * 4,
          draft + 1.4 + k * 2.35,
          -B * 0.78 + r * 2.5
        );
        box.castShadow = true;
        g.add(box);
      }
    }
  }

  // 艉部上层建筑（驾驶室）
  const superH = 7;
  const bridge = new THREE.Mesh(new THREE.BoxGeometry(5.2, superH, beam * 0.82), mats.white);
  bridge.position.set(-L + 4, draft + superH / 2 + 0.4, 0);
  bridge.castShadow = true;
  g.add(bridge);

  // 驾驶室窗带
  const winBand = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, beam * 0.84), mats.glass);
  winBand.position.set(-L + 4, draft + superH - 0.8, 0);
  g.add(winBand);

  // 烟囱
  const funnel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, 4, 10), new THREE.MeshStandardMaterial({
    color: 0xd44030, metalness: 0.3, roughness: 0.6
  }));
  funnel.position.set(-L + 1.6, draft + superH + 2.2, 0);
  funnel.castShadow = true;
  g.add(funnel);

  // 艏桅 + 航行灯
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 8, 6), mats.steel);
  mast.position.set(L * 0.72, draft + 4.4, 0);
  g.add(mast);
  const navLight = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff }));
  navLight.position.set(L * 0.72, draft + 8.4, 0);
  g.add(navLight);

  g.userData.navLight = navLight;
  return g;
}

// ========== 轮胎吊 RTG ==========
function createRTG(mats) {
  const g = new THREE.Group();
  const legGeo = new THREE.BoxGeometry(1.1, 16, 1.1);
  [[-9, -3.2], [9, -3.2], [-9, 3.2], [9, 3.2]].forEach(([x, z]) => {
    const leg = new THREE.Mesh(legGeo, mats.craneDark);
    leg.position.set(x, 8, z);
    leg.castShadow = true;
    g.add(leg);
  });
  [-3.2, 3.2].forEach(z => {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(19, 1.1, 1.1), mats.craneDark);
    beam.position.set(0, 16.4, z);
    g.add(beam);
  });
  const trolley = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.2, 2.4), mats.accent);
  trolley.position.set(0, 15.4, 0);
  g.add(trolley);
  return g;
}

// ========== 集卡 ==========
function createTruck(mats) {
  const g = new THREE.Group();
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(9, 0.6, 2.6), mats.steel);
  chassis.position.y = 0.9;
  g.add(chassis);

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.4, 2.5), mats.truckCab);
  cab.position.set(3.4, 2.1, 0);
  cab.castShadow = true;
  g.add(cab);

  const cabGlass = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.1, 2.2), mats.glass);
  cabGlass.position.set(4.75, 2.4, 0);
  g.add(cabGlass);

  const box = new THREE.Mesh(new THREE.BoxGeometry(5.6, 2.4, 2.4), mats.container[1]);
  box.position.set(-0.9, 2.4, 0);
  box.castShadow = true;
  g.add(box);

  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.45, 10);
  [[2.8, -1.2], [2.8, 1.2], [-2.6, -1.2], [-2.6, 1.2]].forEach(([x, z]) => {
    const w = new THREE.Mesh(wheelGeo, mats.craneDark);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.55, z);
    g.add(w);
  });

  return g;
}

// ========== 灯塔 ==========
function createLighthouse(mats) {
  const g = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.9, 16, 12), mats.white);
  tower.position.y = 8;
  tower.castShadow = true;
  g.add(tower);

  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 1.4, 12), mats.red);
  top.position.y = 16.6;
  g.add(top);

  const lamp = new THREE.Mesh(new THREE.SphereGeometry(1.0, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffd27a }));
  lamp.position.y = 17.6;
  g.add(lamp);

  // 旋转光柱
  const beam = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 40, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true, opacity: 0.16, side: THREE.DoubleSide })
  );
  beam.rotation.z = Math.PI / 2;
  beam.position.set(20, 17.6, 0);
  g.add(beam);

  g.userData.lamp = lamp;
  g.userData.beam = beam;
  return g;
}

// ========== 文字标牌（Canvas Sprite） ==========
function createLabel(text, color) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 72;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(5, 16, 30, 0.72)';
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(4, 4, 248, 64, 10) : ctx.rect(4, 4, 248, 64);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = 'bold 36px "Microsoft YaHei", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 38);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  return sprite;
}

// ========== 每帧动画 ==========
export function animateScene(scene, elapsed) {
  // 海面波动
  const sea = scene.userData.sea;
  if (sea) {
    const pos = sea.geometry.attributes.position;
    const base = sea.userData.baseZ;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const y = base[i * 3 + 1];
      pos.setZ(i, Math.sin((x + elapsed * 3) * 0.08) * 0.42 + Math.cos((y + elapsed * 1.6) * 0.07) * 0.3);
    }
    pos.needsUpdate = true;
    sea.geometry.computeVertexNormals();
  }

  // 岸桥小车往返 + 吊具升降
  scene.userData.cranes?.forEach((crane, i) => {
    const trolley = crane.userData.trolley;
    const phase = elapsed * crane.userData.trolleySpeed + crane.userData.trolleyPhase;
    const z = -12 + Math.sin(phase) * 16;
    trolley.position.z = z;

    const dropY = 9.2 + Math.abs(Math.sin(phase * 0.6)) * 4.2;
    const spreader = crane.userData.spreader;
    spreader.position.y = dropY - 20.4;

    const cableLen = Math.max(0.5, 20.4 - dropY);
    [crane.userData.cableL, crane.userData.cableR].forEach(cable => {
      cable.scale.y = cableLen;
      cable.position.y = -cableLen / 2;
    });

    // 障碍灯闪烁
    const beacon = crane.userData.beacon;
    if (beacon) beacon.material.emissiveIntensity = 0.4 + Math.abs(Math.sin(elapsed * 2 + i)) * 1.4;
  });

  // 船舶轻微摇摆 + 航行灯闪烁
  scene.userData.ships?.forEach((ship, i) => {
    ship.rotation.z = Math.sin(elapsed * 0.45 + i) * 0.008;
    ship.rotation.x = Math.sin(elapsed * 0.3 + i * 0.7) * 0.004;
    ship.position.y = (ship.userData.baseY || 0) + Math.sin(elapsed * 0.6 + i) * 0.12;
    if (ship.userData.sailing) {
      ship.position.x += 0.055;
      if (ship.position.x > 110) ship.position.x = -110;
    }
    if (ship.userData.navLight) {
      ship.userData.navLight.visible = Math.sin(elapsed * 2.4 + i) > -0.3;
    }
  });

  // 集卡行驶（到达尽头后循环）
  scene.userData.trucks?.forEach(truck => {
    truck.position.x += truck.userData.dir * truck.userData.speed;
    if (truck.position.x > 74) truck.position.x = -74;
    if (truck.position.x < -74) truck.position.x = 74;
  });

  // 浮标起伏
  scene.userData.buoys?.forEach(b => {
    b.position.y = b.userData.baseY + Math.sin(elapsed * 1.4 + b.userData.phase) * 0.35;
    b.rotation.z = Math.sin(elapsed * 1.1 + b.userData.phase) * 0.06;
  });

  // 灯塔旋转 + 闪烁
  const lh = scene.userData.lighthouse;
  if (lh) {
    lh.userData.beam.rotation.y = elapsed * 0.9;
    lh.userData.lamp.material.color.setHSL(0.11, 1, 0.55 + Math.abs(Math.sin(elapsed * 2)) * 0.25);
  }
}
