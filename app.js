const jsonInput = document.getElementById("jsonInput");
const renderBtn = document.getElementById("renderBtn");
const exportBtn = document.getElementById("exportBtn");
const exportScale = document.getElementById("exportScale");
const statusEl = document.getElementById("status");

const SAMPLE = [
  { lat: 10.7626, lng: 106.6601, title: "出发地 (胡志明港)", desc: "AIS 历史数据显示，涉案远洋渔船 'Sea Hunter' 于 3 月 5 日离开港口，申报目的地为北太平洋。" },
  { lat: 0.1, lng: 120.5, title: "AIS 信号消失点 (苏拉威西海)", desc: "3 月 12 日，该船在穿越印尼群岛时故意关闭了自动识别系统 (AIS)，进入'黑暗航行'模式以躲避监管。" },
  { lat: -5.4, lng: 104.2, title: "VIIRS 卫星灯光异常捕获", desc: "3 月 18 日，通过调用 VIIRS 夜间灯光卫星数据，调查人员在巽他海峡外侧发现一艘亮度极高的不明渔船，轨迹与丢失的 'Sea Hunter' 吻合。" },
  { lat: -12.3, lng: 85.1, title: "公海非法转运 (Vessel Spoofing)", desc: "4 月 2 日，Planet Labs 高分辨率卫星影像清晰拍到该船正与一艘冷藏运输船进行海上非法转运 (Transshipment)。" },
  { lat: 1.3521, lng: 103.8198, title: "终点渔获卸货 (新加坡港)", desc: "4 月 20 日，冷藏运输船抵达港口。调查记者通过卧底采访供应链，最终核实这批非法捕捞的海产品流入了国际市场。" }
];
jsonInput.value = JSON.stringify(SAMPLE, null, 2);

const mapEl = document.getElementById("map");
let map = null;
let markerLayer = null;
let polyline = null;
let tileLayer = null;

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

function tileXYToLatLng(x, y, z) {
  const scale = 2 ** z;
  const lng = (x / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * y) / scale;
  const lat = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return { lat, lng };
}

function formatAxisLabel(value, positive, negative) {
  if (!Number.isFinite(value)) return "?";
  return `${Math.abs(value).toFixed(1)}°${value >= 0 ? positive : negative}`;
}

function createCoordinateGridLayer(L) {
  const layer = L.gridLayer({
    tileSize: 256,
    updateWhenIdle: true,
    keepBuffer: 1
  });

  layer.createTile = function createTile(coords) {
    const tile = document.createElement("canvas");
    const size = this.getTileSize();
    tile.width = size.x;
    tile.height = size.y;
    const ctx = tile.getContext("2d");

    if (!ctx) return tile;

    const nw = tileXYToLatLng(coords.x, coords.y, coords.z);
    const se = tileXYToLatLng(coords.x + 1, coords.y + 1, coords.z);
    const center = tileXYToLatLng(coords.x + 0.5, coords.y + 0.5, coords.z);

    ctx.fillStyle = "#eaf4ff";
    ctx.fillRect(0, 0, size.x, size.y);
    ctx.strokeStyle = "rgba(63, 98, 145, 0.35)";
    ctx.lineWidth = 1;
    ctx.strokeRect(0.5, 0.5, size.x - 1, size.y - 1);

    ctx.strokeStyle = "rgba(63, 98, 145, 0.18)";
    ctx.setLineDash([5, 5]);
    for (let i = 1; i < 4; i += 1) {
      const x = (size.x / 4) * i;
      const y = (size.y / 4) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size.y);
      ctx.moveTo(0, y);
      ctx.lineTo(size.x, y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = "#315985";
    ctx.font = "700 15px sans-serif";
    ctx.fillText(`Z${coords.z} · 本地经纬网`, 12, 24);

    ctx.font = "12px sans-serif";
    ctx.fillStyle = "#466b93";
    ctx.fillText(`${formatAxisLabel(nw.lat, "N", "S")} ~ ${formatAxisLabel(se.lat, "N", "S")}`, 12, 46);
    ctx.fillText(`${formatAxisLabel(nw.lng, "E", "W")} ~ ${formatAxisLabel(se.lng, "E", "W")}`, 12, 64);

    ctx.fillStyle = "rgba(17, 24, 39, 0.7)";
    ctx.font = "600 13px sans-serif";
    ctx.fillText(`中心 ${center.lat.toFixed(2)}, ${center.lng.toFixed(2)}`, 12, size.y - 18);

    return tile;
  };

  return layer;
}

function markerStyle(index, total) {
  if (index === 0) {
    return { radius: 8, color: "#0f766e", fillColor: "#14b8a6", fillOpacity: 0.95, weight: 2 };
  }
  if (index === total - 1) {
    return { radius: 8, color: "#9a3412", fillColor: "#f97316", fillOpacity: 0.95, weight: 2 };
  }
  return { radius: 7, color: "#1d4ed8", fillColor: "#60a5fa", fillOpacity: 0.9, weight: 2 };
}

function ensureMap() {
  if (map && markerLayer) return true;
  if (!window.L || typeof window.L.map !== "function") return false;

  const L = window.L;
  map = L.map("map", { preferCanvas: true, worldCopyJump: true });
  tileLayer = createCoordinateGridLayer(L);
  tileLayer.addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  return true;
}

function renderFallback(points, reason) {
  if (!mapEl) return;
  mapEl.innerHTML = "";

  const box = document.createElement("div");
  box.style.padding = "14px";
  box.style.border = "1px dashed rgba(15,23,42,.2)";
  box.style.borderRadius = "12px";
  box.style.background = "rgba(255,255,255,.7)";
  box.style.color = "#334155";
  box.style.lineHeight = "1.7";

  const title = document.createElement("div");
  title.textContent = "地图降级模式";
  title.style.fontWeight = "800";
  title.style.marginBottom = "6px";

  const desc = document.createElement("div");
  desc.textContent = reason;
  desc.style.color = "rgba(15,23,42,.72)";

  const list = document.createElement("ol");
  list.style.margin = "10px 0 0";
  list.style.paddingLeft = "18px";
  list.style.color = "rgba(15,23,42,.78)";

  points.forEach((p) => {
    const li = document.createElement("li");
    const t = String(p.title ?? "未命名");
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    const d = String(p.desc ?? "");
    li.textContent = `${t}（${Number.isFinite(lat) ? lat : "?"}, ${Number.isFinite(lng) ? lng : "?"}）${d ? `：${d}` : ""}`;
    list.appendChild(li);
  });

  box.append(title, desc, list);
  mapEl.appendChild(box);
}

function renderPoints(points) {
  if (!ensureMap()) {
    renderFallback(points, "地图依赖未加载（Leaflet）。可能网络不可用或 CDN 被拦截；仍可编辑点位 JSON。");
    return;
  }

  const L = window.L;
  markerLayer.clearLayers();
  if (polyline) {
    map.removeLayer(polyline);
    polyline = null;
  }

  const latlngs = [];
  points.forEach((p, i) => {
    const lat = Number(p.lat);
    const lng = Number(p.lng);
    const marker = L.circleMarker([lat, lng], markerStyle(i, points.length)).addTo(markerLayer);

    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${String(p.title ?? "")}`;
    const br = document.createElement("br");
    const desc = document.createElement("span");
    desc.textContent = String(p.desc ?? "");
    const coords = document.createElement("div");
    coords.textContent = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    coords.style.marginTop = "6px";
    coords.style.color = "#47627f";
    coords.style.fontSize = "12px";
    popup.append(title, br, desc, coords);

    marker.bindPopup(popup);
    latlngs.push([lat, lng]);
  });

  if (latlngs.length > 1) {
    polyline = L.polyline(latlngs, { color: "#2f8f63", weight: 4 }).addTo(map);
    map.fitBounds(latlngs, { padding: [20, 20] });
  } else if (latlngs.length === 1) {
    map.setView(latlngs[0], 13);
  }
}

function pad(num) {
  return String(num).padStart(2, "0");
}

function makeExportFilename() {
  const now = new Date();
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  return `story-map-${date}-${time}.png`;
}

function waitForMapTiles(timeoutMs = 9000) {
  const tiles = Array.from(document.querySelectorAll(".leaflet-tile"));
  if (!tiles.length) return Promise.resolve();

  const waitOne = tile => new Promise(resolve => {
    if (tile instanceof HTMLCanvasElement) {
      resolve();
      return;
    }
    if (tile.complete && tile.naturalWidth > 0) {
      resolve();
      return;
    }
    const done = () => resolve();
    tile.addEventListener("load", done, { once: true });
    tile.addEventListener("error", done, { once: true });
  });

  return Promise.race([
    Promise.all(tiles.map(waitOne)).then(() => undefined),
    new Promise(resolve => setTimeout(resolve, timeoutMs))
  ]);
}

async function exportMapAsPng() {
  const scale = Math.max(1, Number(exportScale.value) || 3);
  if (!mapEl) {
    setStatus("导出失败：地图容器不存在");
    return;
  }
  if (!ensureMap()) {
    setStatus("导出失败：地图依赖未加载（Leaflet）");
    return;
  }
  if (typeof window.html2canvas !== "function") {
    setStatus("导出失败：依赖未加载（html2canvas），请检查网络或稍后重试");
    return;
  }

  setStatus(`正在导出 ${scale}x 高清 PNG...`);
  try {
    await waitForMapTiles();
    await new Promise(resolve => setTimeout(resolve, 120));

    const canvas = await window.html2canvas(mapEl, {
      backgroundColor: "#ffffff",
      useCORS: true,
      scale,
      logging: false,
      imageTimeout: 12000
    });

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = makeExportFilename();
    link.click();

    setStatus(`导出成功（${canvas.width} x ${canvas.height}）`);
  } catch (err) {
    setStatus(`导出失败: ${err.message}`);
  }
}

renderBtn.addEventListener("click", () => {
  try {
    const points = JSON.parse(jsonInput.value);
    if (!Array.isArray(points) || !points.length) throw new Error("JSON 需为非空数组");
    const valid = points.every(p => Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    if (!valid) throw new Error("每个点需要有效 lat/lng");
    renderPoints(points);
    if (ensureMap()) setStatus(`渲染完成，共 ${points.length} 个点位（本地经纬网底图）`);
    else setStatus("地图依赖未加载（Leaflet），已输出列表预览");
  } catch (err) {
    setStatus(`渲染失败: ${err.message}`);
  }
});

exportBtn.addEventListener("click", () => {
  exportMapAsPng();
});

renderPoints(SAMPLE);

// === PM Metrics Integration ===
(function() {
  try {
    if (!window.pmMetrics) return;
    // Auto mark task start on first meaningful interaction
    let taskStarted = false;
    document.addEventListener('click', function(e) {
      if (taskStarted) return;
      const btn = e.target.closest('button');
      if (btn) {
        taskStarted = true;
        window.pmMetrics.markTaskStart('map_render_task');
      }
    }, { once: false });
  } catch (_e) {}
})();
