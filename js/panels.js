// ========== 统计面板：数字滚动 + Canvas 图表 ==========
import { onDataChange } from './data.js';

// ---------- 数字滚动动画 ----------
const counterStates = new Map(); // element -> { current, target }

function initCounter(el) {
  const suffix = el.dataset.suffix || '';
  counterStates.set(el, { current: 0, target: 0, suffix });
  el.textContent = '0' + suffix;
}

function setCounterTarget(el, target) {
  const st = counterStates.get(el);
  if (!st) return;
  st.target = target;
}

function tickCounters() {
  counterStates.forEach((st, el) => {
    const diff = st.target - st.current;
    if (Math.abs(diff) < 0.5) {
      st.current = st.target;
    } else {
      st.current += diff * 0.1; // 缓动
    }
    const display = st.target % 1 !== 0 ? st.current.toFixed(1) : Math.round(st.current);
    el.textContent = display + st.suffix;
  });
  requestAnimationFrame(tickCounters);
}

export function startCounters() {
  document.querySelectorAll('[data-counter]').forEach(el => {
    initCounter(el);
    // 记录每个计数器对应的 data-key，便于按指标更新
    const key = el.closest('[data-key]')?.dataset.key || el.dataset.key;
    if (key) el._dataKey = key;
  });
  requestAnimationFrame(tickCounters);
}

// 按数据 key 更新所有对应计数器
export function updateCountersByData(data) {
  const map = {
    throughput: data.throughput,
    efficiency: data.efficiency,
    shipsInPort: data.shipsInPort,
    yardRate: data.yardRate,
    craneActive: data.craneActive
  };
  document.querySelectorAll('[data-counter]').forEach(el => {
    const key = el.closest('[data-key]')?.dataset.key || el.dataset.key;
    if (key && map[key] != null) {
      setCounterTarget(el, map[key]);
    }
  });
}

// ---------- 通用 Canvas 图表工具 ----------
function setupCanvas(canvas) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.width;
  const h = canvas.height;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  return { ctx, w, h };
}

// ---------- 折线图（吞吐趋势） ----------
export function drawThroughputChart(canvas, data) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pts = data.throughputHistory;
  const max = Math.max(...pts) * 1.15;
  const min = Math.min(...pts) * 0.85;
  const pad = 30;
  const cw = w - pad * 2;
  const ch = h - pad * 2;

  // 网格
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.1)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i++) {
    const y = pad + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  // 渐变填充
  const grad = ctx.createLinearGradient(0, pad, 0, h - pad);
  grad.addColorStop(0, 'rgba(0, 212, 255, 0.35)');
  grad.addColorStop(1, 'rgba(0, 212, 255, 0)');

  ctx.beginPath();
  pts.forEach((v, i) => {
    const x = pad + (cw / (pts.length - 1)) * i;
    const y = pad + ch - ((v - min) / (max - min)) * ch;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.lineTo(pad + cw, h - pad);
  ctx.lineTo(pad, h - pad);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折线
  ctx.beginPath();
  pts.forEach((v, i) => {
    const x = pad + (cw / (pts.length - 1)) * i;
    const y = pad + ch - ((v - min) / (max - min)) * ch;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00d4ff';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 数据点
  pts.forEach((v, i) => {
    const x = pad + (cw / (pts.length - 1)) * i;
    const y = pad + ch - ((v - min) / (max - min)) * ch;
    ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4ff'; ctx.fill();
  });

  // X 轴标签
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '11px sans-serif';
  ctx.textAlign = 'center';
  for (let i = 0; i < pts.length; i += 2) {
    const x = pad + (cw / (pts.length - 1)) * i;
    ctx.fillText(`${i}h`, x, h - 8);
  }
}

// ---------- 柱状图（泊位效率 / 堆场分区） ----------
export function drawBarChart(canvas, items, opts = {}) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const pad = 30;
  const cw = w - pad * 2;
  const ch = h - pad * 2;
  const max = opts.max || Math.max(...items.map(i => i.value)) * 1.2;
  const barW = cw / items.length * 0.55;
  const gap = cw / items.length;

  ctx.strokeStyle = 'rgba(0, 180, 255, 0.1)';
  for (let i = 0; i <= 4; i++) {
    const y = pad + (ch / 4) * i;
    ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
  }

  items.forEach((item, i) => {
    const barH = (item.value / max) * ch;
    const x = pad + gap * i + (gap - barW) / 2;
    const y = pad + ch - barH;

    const grad = ctx.createLinearGradient(0, y, 0, y + barH);
    grad.addColorStop(0, opts.colorTop || '#00d4ff');
    grad.addColorStop(1, opts.colorBottom || 'rgba(0, 212, 255, 0.1)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);

    // 顶部数值
    ctx.fillStyle = '#cfe9ff';
    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(opts.suffix ? item.value + opts.suffix : item.value, x + barW / 2, y - 5);

    // X 轴标签
    ctx.fillStyle = '#5d7ea8';
    ctx.font = '12px sans-serif';
    ctx.fillText(item.name, x + barW / 2, h - 8);
  });
}

// ---------- 环形图（货物类型占比） ----------
export function drawDonutChart(canvas, items) {
  const { ctx, w, h } = setupCanvas(canvas);
  ctx.clearRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2;
  const outerR = Math.min(w, h) / 2 - 30;
  const innerR = outerR * 0.6;
  const total = items.reduce((s, i) => s + i.value, 0);
  let start = -Math.PI / 2;

  items.forEach(item => {
    const angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, start, start + angle);
    ctx.arc(cx, cy, innerR, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.fill();
    start += angle;
  });

  // 中心文字
  ctx.fillStyle = '#cfe9ff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total + '%', cx, cy - 6);
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '12px sans-serif';
  ctx.fillText('总占比', cx, cy + 14);

  // 图例
  const legendY = h - items.length * 16;
  items.forEach((item, i) => {
    const ly = legendY + i * 18;
    ctx.fillStyle = item.color;
    ctx.fillRect(10, ly, 10, 10);
    ctx.fillStyle = '#cfe9ff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${item.name} ${item.value}%`, 26, ly + 5);
  });
}

// ---------- 列表更新 ----------
export function updateShipList(data) {
  const ul = document.getElementById('shipList');
  if (!ul) return;
  ul.innerHTML = data.ships.map(s =>
    `<li><span class="ship-name">${s.name}</span><span class="ship-status ${s.status === '待泊' ? 'ship-status--wait' : ''}">${s.status} · ${s.eta}</span></li>`
  ).join('');
}

export function updateAlertList(data) {
  const ul = document.getElementById('alertList');
  if (!ul) return;
  ul.innerHTML = data.alerts.map(a =>
    `<li><span class="alert-time">${a.time}</span><span class="alert-level--${a.level}">${a.text}</span></li>`
  ).join('');
}

// ---------- 绑定数据变化 ----------
export function initPanels(data) {
  const chartThroughput = document.getElementById('chartThroughput');
  const chartBerthEff = document.getElementById('chartBerthEff');
  const chartYardZone = document.getElementById('chartYardZone');
  const chartCargoType = document.getElementById('chartCargoType');

  function renderAll(scope) {
    if (!scope || scope === 'kpi') updateCountersByData(data);
    if (!scope || scope === 'charts') {
      drawThroughputChart(chartThroughput, data);
      drawBarChart(chartBerthEff, data.berthEff, { suffix: '' });
      drawBarChart(chartYardZone, data.yardZones, { suffix: '%' });
      drawDonutChart(chartCargoType, data.cargoTypes);
    }
    if (!scope || scope === 'lists') {
      updateShipList(data);
      updateAlertList(data);
    }
  }

  renderAll();
  onDataChange((store, scope) => renderAll(scope));
}
