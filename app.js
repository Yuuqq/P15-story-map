const jsonInput = document.getElementById("jsonInput");
const renderBtn = document.getElementById("renderBtn");
const exportBtn = document.getElementById("exportBtn");
const exportScale = document.getElementById("exportScale");
const statusEl = document.getElementById("status");

const SAMPLE = [
  { lat: 31.2304, lng: 121.4737, title: "起点：新闻发布会", desc: "事件首次通报。" },
  { lat: 31.2181, lng: 121.4455, title: "现场：受影响社区", desc: "居民集中反馈诉求。" },
  { lat: 31.2001, lng: 121.4302, title: "终点：应急指挥部", desc: "后续处置部署。" }
];
jsonInput.value = JSON.stringify(SAMPLE, null, 2);

const mapEl = document.getElementById("map");
let map = null;
let markerLayer = null;
let polyline = null;

function setStatus(text) {
  statusEl.textContent = `状态: ${text}`;
}

function ensureMap() {
  if (map && markerLayer) return true;
  if (!window.L || typeof window.L.map !== "function") return false;

  const L = window.L;
  map = L.map("map", { preferCanvas: true });
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 1,
    crossOrigin: true,
    attribution: "&copy; OpenStreetMap contributors"
  }).addTo(map);

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
    const marker = L.marker([lat, lng]).addTo(markerLayer);

    const popup = document.createElement("div");
    const title = document.createElement("strong");
    title.textContent = `${i + 1}. ${String(p.title ?? "")}`;
    const br = document.createElement("br");
    const desc = document.createElement("span");
    desc.textContent = String(p.desc ?? "");
    popup.append(title, br, desc);

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
    if (ensureMap()) setStatus(`渲染完成，共 ${points.length} 个点位`);
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
