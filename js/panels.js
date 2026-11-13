// ========== 统计面板：数字滚动 + Canvas 图表（自适应尺寸） ==========
import { onDataChange } from './data.js';

// ---------- 数字滚动动画 ----------
const counterStates = new Map();

function bindCounter(el) {
  const suffix = el.dataset.suffix || '';
  counterStates.set(el, { current: 0, target: 0, suffix });
}

function tickCounters() {
  counterStates.forEach((st, el) => {
    const diff = st.target - st.current;
    if (Math.abs(diff) < 0.05) {
      st.current = st.target;
    } else {
      st.current += diff * 0.12;
    }
    const isFloat = st.target % 1 !== 0;
    el.textContent = (isFloat ? st.current.toFixed(1) : Math.round(st.current)) + st.suffix;
  });
  requestAnimationFrame(tickCounters);
}

export function startCounters() {
  document.querySelectorAll('[data-counter]').forEach(bindCounter);
  requestAnimationFrame(tickCounters);
}

function counterKey(el) {
  return el.closest('[data-key]')?.dataset.key || el.dataset.key;
}

export function updateCountersByData(data) {
  const map = {
    throughput: data.throughput,
    efficiency: data.efficiency,
    shipsInPort: data.shipsInPort,
    yardRate: data.yardRate,
    craneActive: data.craneActive,
    berthRate: data.berthRate
  };
  document.querySelectorAll('[data-counter]').forEach(el => {
    const key = counterKey(el);
    const st = counterStates.get(el);
    if (key && st && map[key] != null) st.target = map[key];
  });

  // 环比趋势
  document.querySelectorAll('[data-trend]').forEach(el => {
    const key = el.dataset.trend;
    const v = data.trends?.[key];
    if (v == null) return;
    const up = v >= 0;
    el.className = `kpi-card__trend kpi-card__trend--${up ? 'up' : 'down'}`;
    el.textContent = `${up ? '▲' : '▼'} ${Math.abs(v).toFixed(1)}%`;
  });
}

// ---------- Canvas 工具：按容器尺寸 + DPR 重建画布 ----------
function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(160, canvas.clientWidth || canvas.parentElement?.clientWidth || 300);
  const h = Math.max(90, canvas.clientHeight || 150);
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  return { ctx, w, h };
}

function drawGrid(ctx, w, h, pad, rows) {
  ctx.strokeStyle = 'rgba(0, 180, 255, 0.12)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= rows; i++) {
    const y = pad.t + ((h - pad.t - pad.b) / rows) * i;
    ctx.beginPath();
    ctx.moveTo(pad.l, y);
    ctx.lineTo(w - pad.r, y);
    ctx.stroke();
  }
}

// ---------- 折线图：吞吐趋势 ----------
export function drawThroughputChart(canvas, data) {
  const { ctx, w, h } = setupCanvas(canvas);
  const pts = data.throughputHistory;
  if (!pts || !pts.length) return;
  const pad = { l: 38, r: 12, t: 16, b: 22 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;

  const values = pts.map(p => p.value);
  const rawMax = Math.max(...values);
  const rawMin = Math.min(...values);
  const span = Math.max(200, rawMax - rawMin);
  const max = rawMax + span * 0.25;
  const min = Math.max(0, rawMin - span * 0.25);
  const scaleY = v => pad.t + ch - ((v - min) / (max - min)) * ch;

  drawGrid(ctx, w, h, pad, 4);

  // Y 轴刻度
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    const v = Math.round(max - ((max - min) / 4) * i);
    ctx.fillText(String(v), pad.l - 6, pad.t + (ch / 4) * i);
  }

  // 面积
  const grad = ctx.createLinearGradient(0, pad.t, 0, pad.t + ch);
  grad.addColorStop(0, 'rgba(0, 212, 255, 0.38)');
  grad.addColorStop(1, 'rgba(0, 212, 255, 0.02)');
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = pad.l + (cw / (pts.length - 1)) * i;
    const y = scaleY(p.value);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.lineTo(pad.l + cw, pad.t + ch);
  ctx.lineTo(pad.l, pad.t + ch);
  ctx.closePath();
  ctx.fillStyle = grad;
  ctx.fill();

  // 折线
  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = pad.l + (cw / (pts.length - 1)) * i;
    const y = scaleY(p.value);
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
  });
  ctx.strokeStyle = '#00d4ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = 'rgba(0, 212, 255, 0.8)';
  ctx.shadowBlur = 8;
  ctx.stroke();
  ctx.shadowBlur = 0;

  // 数据点 + 最新值标注
  const lastIdx = pts.length - 1;
  pts.forEach((p, i) => {
    if (i % 2 !== 0 && i !== lastIdx) return;
    const x = pad.l + (cw / (pts.length - 1)) * i;
    const y = scaleY(p.value);
    ctx.beginPath();
    ctx.arc(x, y, i === lastIdx ? 3.6 : 2.2, 0, Math.PI * 2);
    ctx.fillStyle = i === lastIdx ? '#ffffff' : '#00d4ff';
    ctx.fill();
  });
  const lastX = pad.l + cw;
  const lastY = scaleY(pts[lastIdx].value);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillText(String(pts[lastIdx].value), lastX, lastY - 6);

  // X 轴时间标签
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  pts.forEach((p, i) => {
    if (i % 2 !== 0 && i !== lastIdx) return;
    const x = pad.l + (cw / (pts.length - 1)) * i;
    ctx.fillText(p.label, x, pad.t + ch + 6);
  });
}

// ---------- 柱状图：泊位效率 / 堆场分区 ----------
export function drawBarChart(canvas, items, opts = {}) {
  const { ctx, w, h } = setupCanvas(canvas);
  if (!items || !items.length) return;
  const pad = { l: 34, r: 10, t: 18, b: 22 };
  const cw = w - pad.l - pad.r;
  const ch = h - pad.t - pad.b;
  const key = opts.valueKey || 'value';
  const values = items.map(i => i[key]);
  const max = opts.max || Math.max(...values) * 1.25;
  const slot = cw / items.length;
  const barW = Math.min(28, slot * 0.52);

  drawGrid(ctx, w, h, pad, 4);
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (let i = 0; i <= 4; i++) {
    ctx.fillText(String(Math.round(max - (max / 4) * i)), pad.l - 6, pad.t + (ch / 4) * i);
  }

  items.forEach((item, i) => {
    const v = item[key];
    const barH = Math.max(2, (v / max) * ch);
    const x = pad.l + slot * i + (slot - barW) / 2;
    const y = pad.t + ch - barH;

    const grad = ctx.createLinearGradient(0, y, 0, pad.t + ch);
    const hot = v >= (opts.warnAt || 85);
    grad.addColorStop(0, hot ? '#ffb020' : (opts.colorTop || '#00d4ff'));
    grad.addColorStop(1, hot ? 'rgba(255, 176, 32, 0.08)' : 'rgba(0, 212, 255, 0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(x, y, barW, barH);

    // 顶部高亮
    ctx.fillStyle = hot ? '#ffb020' : '#00d4ff';
    ctx.fillRect(x, y - 2, barW, 2);

    // 数值
    ctx.fillStyle = '#cfe9ff';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(v + (opts.suffix || ''), x + barW / 2, y - 4);

    // 类目
    ctx.fillStyle = '#5d7ea8';
    ctx.font = '11px sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText(item.name, x + barW / 2, pad.t + ch + 6);
  });
}

// ---------- 环形图：货物类型占比 ----------
export function drawDonutChart(canvas, items) {
  const { ctx, w, h } = setupCanvas(canvas);
  if (!items || !items.length) return;
  const total = items.reduce((s, i) => s + i.value, 0) || 1;

  const legendW = Math.min(112, w * 0.42);
  const chartW = w - legendW;
  const cx = chartW / 2;
  const cy = h / 2;
  const outerR = Math.max(28, Math.min(chartW, h) / 2 - 14);
  const innerR = outerR * 0.62;

  let start = -Math.PI / 2;
  items.forEach(item => {
    const angle = (item.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, outerR, start, start + angle);
    ctx.arc(cx, cy, innerR, start + angle, start, true);
    ctx.closePath();
    ctx.fillStyle = item.color;
    ctx.globalAlpha = 0.92;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(5, 11, 24, 0.9)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    start += angle;
  });

  // 中心数值
  ctx.fillStyle = '#ffffff';
  ctx.font = `bold ${Math.max(15, outerR * 0.36)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(total.toLocaleString(), cx, cy - 6);
  ctx.fillStyle = '#5d7ea8';
  ctx.font = '10px sans-serif';
  ctx.fillText('TEU 合计', cx, cy + 12);

  // 右侧图例
  const rowH = Math.min(20, (h - 8) / items.length);
  const startY = cy - (rowH * items.length) / 2 + rowH / 2;
  items.forEach((item, i) => {
    const ly = startY + i * rowH;
    const lx = chartW + 6;
    ctx.fillStyle = item.color;
    ctx.fillRect(lx, ly - 4, 8, 8);
    ctx.fillStyle = '#cfe9ff';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, lx + 13, ly);
    ctx.fillStyle = '#5d7ea8';
    ctx.textAlign = 'right';
    ctx.fillText(Math.round((item.value / total) * 100) + '%', w - 2, ly);
  });
}

// ---------- 列表 ----------
export function updateShipList(data) {
  const ul = document.getElementById('shipList');
  if (!ul) return;
  ul.innerHTML = data.ships.map(s => {
    const waiting = s.status === '待泊';
    const tail = waiting ? `待泊 · ${s.berth}` : `${s.berth} · ${s.progress}%`;
    return `<li><span class="ship-name">${s.name}</span>` +
      `<span class="ship-status ${waiting ? 'ship-status--wait' : ''}">${tail}</span></li>`;
  }).join('');

  const tag = document.getElementById('shipCountTag');
  if (tag) tag.textContent = `${data.ships.length} 艘`;
}

export function updateAlertList(data) {
  const ul = document.getElementById('alertList');
  if (!ul) return;
  ul.innerHTML = data.alerts.map(a =>
    `<li><span class="alert-time">${a.time}</span>` +
    `<span class="alert-text alert-level--${a.level}">${a.text}</span></li>`
  ).join('');

  const tag = document.getElementById('alertCountTag');
  if (tag) tag.textContent = `${data.alerts.length} 条`;
}

// ---------- 图表总渲染 ----------
let chartRefs = null;

export function renderCharts(data) {
  if (!chartRefs) {
    chartRefs = {
      throughput: document.getElementById('chartThroughput'),
      berthEff: document.getElementById('chartBerthEff'),
      yardZone: document.getElementById('chartYardZone'),
      cargoType: document.getElementById('chartCargoType')
    };
  }
  if (chartRefs.throughput) drawThroughputChart(chartRefs.throughput, data);
  if (chartRefs.berthEff) drawBarChart(chartRefs.berthEff, data.berthEff, { suffix: '' });
  if (chartRefs.yardZone) drawBarChart(chartRefs.yardZone, data.yardZones, { valueKey: 'rate', suffix: '%', warnAt: 88 });
  if (chartRefs.cargoType) drawDonutChart(chartRefs.cargoType, data.cargoTypes);
}

// ---------- 初始化 ----------
export function initPanels(data) {
  const renderAll = scope => {
    if (!scope || scope === 'kpi') updateCountersByData(data);
    if (!scope || scope === 'charts') renderCharts(data);
    if (!scope || scope === 'lists') {
      updateShipList(data);
      updateAlertList(data);
    }
  };

  renderAll();
  onDataChange((store, scope) => renderAll(scope));

  // 尺寸变化时重绘图表（自适应布局切换屏幕后）
  window.addEventListener('resize', () => renderCharts(data));
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(() => renderCharts(data));
    document.querySelectorAll('.chart-card').forEach(c => ro.observe(c));
  }
}
