// ========== 模拟实时数据源 ==========
// 大屏展示用模拟数据，每秒刷新一次，模拟港口生产实时指标

const SHIP_NAMES = [
  '中远海运·太平洋', '招商轮船·远鉴', '东方海外·海耀',
  '马士基·阿尔忒', '达飞·安特卫普', '赫伯罗特·柏林'
];

const ALERT_TEMPLATES = [
  { level: 'high', text: '3号岸桥液压压力异常' },
  { level: 'mid', text: 'B堆场冷藏箱温度偏高' },
  { level: 'low', text: '5号泊位作业正常完成' },
  { level: 'mid', text: '集卡排队时长超阈值' },
  { level: 'high', text: '船舶靠泊距离告警' },
  { level: 'low', text: '夜间巡检正常' }
];

const CARGO_TYPES = [
  { name: '普通干箱', value: 58, color: '#00d4ff' },
  { name: '冷藏箱', value: 14, color: '#00ffa3' },
  { name: '危险品箱', value: 8, color: '#ff4d6d' },
  { name: '框架箱', value: 12, color: '#ffb020' },
  { name: '罐式箱', value: 8, color: '#1e6fff' }
];

const YARD_ZONES = [
  { name: 'A区', rate: 78 },
  { name: 'B区', rate: 65 },
  { name: 'C区', rate: 89 },
  { name: 'D区', rate: 52 },
  { name: 'E区', rate: 71 },
  { name: 'F区', rate: 83 }
];

const BERTH_EFF = [
  { name: '1号', value: 32 },
  { name: '2号', value: 28 },
  { name: '3号', value: 35 },
  { name: '4号', value: 26 },
  { name: '5号', value: 30 }
];

// 12 小时吞吐趋势（基线 + 随机波动）
function genThroughputHistory() {
  const arr = [];
  for (let i = 0; i < 12; i++) {
    arr.push(1200 + Math.round(Math.sin(i / 2) * 300 + Math.random() * 200));
  }
  return arr;
}

export const dataStore = {
  throughput: 18650,      // 今日吞吐量 TEU
  efficiency: 31,         // 作业效率 move/h
  shipsInPort: 6,         // 船舶在港
  yardRate: 74,           // 堆场利用率 %
  craneActive: 8,         // 岸桥作业台数
  throughputHistory: genThroughputHistory(),
  berthEff: BERTH_EFF,
  yardZones: YARD_ZONES,
  cargoTypes: CARGO_TYPES,
  ships: [],
  alerts: []
};

// 初始化船舶列表
for (let i = 0; i < 5; i++) {
  dataStore.ships.push({
    name: SHIP_NAMES[i],
    status: i < 3 ? '作业中' : '待泊',
    eta: `${10 + i * 2}h`
  });
}

// 初始化告警
for (let i = 0; i < 4; i++) {
  const t = ALERT_TEMPLATES[i];
  dataStore.alerts.push({
    time: `0${8 + i}:${10 + i * 7}`.replace(/(\d{2})\d/, '$1'),
    level: t.level,
    text: t.text
  });
}

// 实时更新：每 3 秒微调核心指标，每 10 秒刷新趋势/船舶/告警
let tickCount = 0;
const listeners = [];

export function onDataChange(cb) {
  listeners.push(cb);
}

function notify(scope) {
  listeners.forEach(fn => fn(dataStore, scope));
}

function randDelta(base, min, max, step) {
  const v = base + (Math.random() - 0.5) * step;
  return Math.round(Math.max(min, Math.min(max, v)));
}

function tick() {
  tickCount++;

  // 核心指标小幅波动
  dataStore.throughput += Math.round(Math.random() * 15 + 5);
  dataStore.efficiency = randDelta(dataStore.efficiency, 26, 38, 2);
  dataStore.yardRate = randDelta(dataStore.yardRate, 65, 88, 3);
  dataStore.craneActive = randDelta(dataStore.craneActive, 6, 10, 1);
  dataStore.shipsInPort = randDelta(dataStore.shipsInPort, 4, 8, 1);
  notify('kpi');

  // 每 3 个 tick（约 9 秒）刷新趋势
  if (tickCount % 3 === 0) {
    dataStore.throughputHistory.shift();
    dataStore.throughputHistory.push(
      1200 + Math.round(Math.sin(tickCount / 3) * 300 + Math.random() * 250)
    );
    // 泊位效率波动
    dataStore.berthEff.forEach(b => {
      b.value = randDelta(b.value, 22, 38, 4);
    });
    // 堆场分区波动
    dataStore.yardZones.forEach(z => {
      z.rate = randDelta(z.rate, 45, 95, 5);
    });
    notify('charts');
  }

  // 每 5 个 tick（约 15 秒）轮换船舶和告警
  if (tickCount % 5 === 0) {
    const idx = Math.floor(Math.random() * SHIP_NAMES.length);
    dataStore.ships.shift();
    dataStore.ships.push({
      name: SHIP_NAMES[idx],
      status: Math.random() > 0.4 ? '作业中' : '待泊',
      eta: `${8 + Math.floor(Math.random() * 8)}h`
    });

    const a = ALERT_TEMPLATES[Math.floor(Math.random() * ALERT_TEMPLATES.length)];
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    dataStore.alerts.unshift({ time: `${hh}:${mm}`, level: a.level, text: a.text });
    if (dataStore.alerts.length > 5) dataStore.alerts.pop();
    notify('lists');
  }
}

// 启动实时更新
setInterval(tick, 3000);
