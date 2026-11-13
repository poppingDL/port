// ========== 港口生产实时数据源 ==========
// 大屏展示用模拟数据，按真实时钟生成，模拟港口生产指标的实时波动

const SHIP_POOL = [
  { name: '中远海运·太平洋', berth: '1# 泊位' },
  { name: '招商轮船·远鉴', berth: '2# 泊位' },
  { name: '东方海外·海耀', berth: '3# 泊位' },
  { name: '马士基·阿尔忒', berth: '4# 泊位' },
  { name: '达飞·安特卫普', berth: '5# 泊位' },
  { name: '赫伯罗特·柏林', berth: '锚地' },
  { name: '长荣·明珠', berth: '6# 泊位' },
  { name: '地中海·索菲亚', berth: '锚地' }
];

const ALERT_TEMPLATES = [
  { level: 'high', text: '3# 岸桥液压系统压力异常' },
  { level: 'mid', text: 'B 堆场冷藏箱温度偏高 2.4℃' },
  { level: 'low', text: '5# 泊位装船作业完成，已结关' },
  { level: 'mid', text: '闸口集卡平均排队 18 分钟' },
  { level: 'high', text: '进港航道船舶间距不足 0.3 海里' },
  { level: 'low', text: 'C 区巡检完成，无异常' },
  { level: 'mid', text: '1# 岸桥小车限位开关报警' },
  { level: 'low', text: 'D 区堆场照明已切换夜间模式' }
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
  { name: '1#', value: 32 },
  { name: '2#', value: 28 },
  { name: '3#', value: 35 },
  { name: '4#', value: 26 },
  { name: '5#', value: 30 },
  { name: '6#', value: 24 }
];

function pad(n) { return String(n).padStart(2, '0'); }
function hhmm(date) { return `${pad(date.getHours())}:${pad(date.getMinutes())}`; }
function rand(min, max) { return min + Math.random() * (max - min); }
function randInt(min, max) { return Math.round(rand(min, max)); }

/** 生成近 12 小时吞吐趋势（带真实时间轴） */
function genThroughputHistory() {
  const now = new Date();
  const arr = [];
  for (let i = 11; i >= 0; i--) {
    const t = new Date(now.getTime() - i * 3600 * 1000);
    const base = 1180 + Math.sin((11 - i) / 2.1) * 260;
    arr.push({ label: hhmm(t), value: Math.round(base + rand(-90, 130)) });
  }
  return arr;
}

export const dataStore = {
  throughput: 18650,       // 今日吞吐量 TEU
  efficiency: 31.4,        // 作业效率 move/h
  shipsInPort: 8,          // 船舶在港
  yardRate: 74,            // 堆场利用率 %
  craneActive: 9,          // 岸桥作业台数
  berthRate: 82,           // 泊位占用率 %
  trends: {                // 环比变化 %
    throughput: 3.2,
    efficiency: 1.8,
    shipsInPort: 0,
    yardRate: 2.1
  },
  throughputHistory: genThroughputHistory(),
  berthEff: BERTH_EFF.map(b => ({ ...b })),
  yardZones: YARD_ZONES.map(z => ({ ...z })),
  cargoTypes: CARGO_TYPES.map(c => ({ ...c })),
  ships: [],
  alerts: []
};

// ---------- 初始化船舶在港列表 ----------
dataStore.ships = SHIP_POOL.slice(0, 5).map((s, i) => ({
  name: s.name,
  berth: s.berth,
  status: i < 3 ? '作业中' : '待泊',
  progress: i < 3 ? randInt(25, 88) : 0
}));

// ---------- 初始化告警 ----------
const now0 = new Date();
dataStore.alerts = [
  { level: 'high', text: ALERT_TEMPLATES[0].text, time: hhmm(new Date(now0.getTime() - 6 * 60000)) },
  { level: 'mid', text: ALERT_TEMPLATES[1].text, time: hhmm(new Date(now0.getTime() - 23 * 60000)) },
  { level: 'low', text: ALERT_TEMPLATES[2].text, time: hhmm(new Date(now0.getTime() - 47 * 60000)) },
  { level: 'mid', text: ALERT_TEMPLATES[3].text, time: hhmm(new Date(now0.getTime() - 72 * 60000)) }
];

// ---------- 订阅 / 分发 ----------
const listeners = [];
let tickCount = 0;

export function onDataChange(cb) {
  listeners.push(cb);
}

function notify(scope) {
  listeners.forEach(fn => fn(dataStore, scope));
}

function drift(base, min, max, step) {
  const v = base + (Math.random() - 0.5) * step;
  return Math.max(min, Math.min(max, v));
}

function tick() {
  tickCount++;

  // ---- 核心指标：每秒小幅波动 ----
  dataStore.throughput += randInt(4, 16);
  dataStore.efficiency = +drift(dataStore.efficiency, 26, 38, 1.4).toFixed(1);
  dataStore.yardRate = Math.round(drift(dataStore.yardRate, 62, 92, 2));
  dataStore.craneActive = Math.round(drift(dataStore.craneActive, 6, 12, 1));
  dataStore.berthRate = Math.round(drift(dataStore.berthRate, 68, 96, 2));
  dataStore.shipsInPort = Math.round(drift(dataStore.shipsInPort, 5, 11, 1));

  dataStore.trends.efficiency = +drift(dataStore.trends.efficiency, -3.5, 5.5, 0.4).toFixed(1);
  dataStore.trends.yardRate = +drift(dataStore.trends.yardRate, -2.5, 4.5, 0.3).toFixed(1);
  notify('kpi');

  // ---- 图表：每 3 tick（约 9 秒）刷新 ----
  if (tickCount % 3 === 0) {
    dataStore.throughputHistory.shift();
    const base = 1180 + Math.sin(tickCount / 6) * 260;
    dataStore.throughputHistory.push({
      label: hhmm(new Date()),
      value: Math.round(base + rand(-90, 150))
    });

    dataStore.berthEff.forEach(b => { b.value = Math.round(drift(b.value, 20, 40, 4)); });
    dataStore.yardZones.forEach(z => { z.rate = Math.round(drift(z.rate, 45, 95, 4)); });

    // 货类占比微调，保持总和 100
    const total = dataStore.cargoTypes.reduce((s, c) => s + c.value, 0);
    dataStore.cargoTypes.forEach(c => {
      c.value = Math.max(3, Math.round(c.value * 100 / total));
    });
    const sum = dataStore.cargoTypes.reduce((s, c) => s + c.value, 0);
    dataStore.cargoTypes[0].value += 100 - sum;
    notify('charts');
  }

  // ---- 列表：每 6 tick（约 18 秒）轮换 ----
  if (tickCount % 6 === 0) {
    dataStore.ships.forEach(s => {
      if (s.status === '作业中') s.progress = Math.min(99, s.progress + randInt(1, 6));
    });
    const finished = dataStore.ships.find(s => s.status === '作业中' && s.progress >= 99);
    if (finished) {
      const next = SHIP_POOL.find(p => !dataStore.ships.some(s => s.name === p.name));
      if (next) {
        finished.name = next.name;
        finished.berth = next.berth;
        finished.status = next.berth === '锚地' ? '待泊' : '作业中';
        finished.progress = 0;
      }
    }

    const tpl = ALERT_TEMPLATES[randInt(0, ALERT_TEMPLATES.length - 1)];
    dataStore.alerts.unshift({ level: tpl.level, text: tpl.text, time: hhmm(new Date()) });
    if (dataStore.alerts.length > 5) dataStore.alerts.pop();
    notify('lists');
  }
}

// 启动实时更新（约 3 秒一轮）
setInterval(tick, 3000);
