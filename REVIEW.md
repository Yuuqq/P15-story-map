# P15-story-map Code Review

## Executive Summary
The codebase is a lightweight, zero-dependency mapping tool using Leaflet. The architecture is clean, and the deliberate constraint to run purely on the client-side removes many traditional backend security and privacy risks. The custom offline grid layer is a smart fallback. However, there are significant issues regarding feature parity between the UI and JS logic, accessibility violations, and caching strategies.

## CRITICAL
*None discovered.* The application being purely client-side without sensitive data handling mitigates most critical risks.

## HIGH

### 1. Broken Demo Feature Logic
**File**: `app.js` (lines 325-344)
**Impact**: The "🗺️ 加载示例新闻地图" (Load Demo News Map) button injects points by trying to find `input[id*="name"]`, `input[id*="lat"]`, etc. However, the DOM (`index.html`) only contains a single `<textarea id="jsonInput">` for point data. When the user clicks the demo button, the points are silently dropped because the selector fails (`if (!nameInput || !addBtn) return;`).
**Fix Suggestion**: Refactor the demo button IIFE in `app.js` to stringify the demo `points` array and assign it directly to `jsonInput.value`, then trigger the `renderBtn.click()`.

### 2. Accessibility (a11y) Anti-Pattern
**File**: `index.html` (lines 42, 51)
**Impact**: Buttons contain both visible Chinese text and an English `aria-label` (e.g., `<button id="renderBtn" type="button" aria-label="render">渲染地图</button>`). Screen readers will announce "render" and ignore the visible "渲染地图", creating a confusing experience for native Chinese screen-reader users.
**Fix Suggestion**: Remove the `aria-label` entirely if the visible text is adequately descriptive, or localize the `aria-label` to match the visible language (`aria-label="渲染地图"`).

## MEDIUM

### 1. Service Worker Caching Mismatch
**File**: `sw.js` (lines 37-41)
**Impact**: The comments explicitly state: "Network-First for external". However, the code skips cross-origin requests entirely: `if (url.origin !== self.location.origin) return;`. This means Leaflet CDN scripts and map tiles (which might be served from external origins) are not cached by the Service Worker, defeating the offline PWA capability for the map interface (falling back to the local grid only).
**Fix Suggestion**: Update the `fetch` event listener to apply a proper Network-First or Stale-While-Revalidate strategy for external CDN resources like Leaflet and map tiles, while taking care not to cache opaque responses aggressively.

## LOW

### 1. Missing Automated Tests
**File**: Repository level
**Impact**: Relying entirely on manual QA (as seen in `QA.md`) increases the risk of regressions, especially for DOM manipulation and HTML-to-Canvas exports.
**Fix Suggestion**: Introduce a lightweight testing framework (like Playwright) to automate the core workflow: entering JSON, rendering the map, and triggering the export.

### 2. `localStorage` Growth unbounded
**File**: `pm-metrics.js` (lines 31, 51)
**Impact**: The telemetry script writes arrays of up to 500 events to `localStorage` per project. Over time, across many tools on the same domain, this could lead to `localStorage` quota limits being hit.
**Fix Suggestion**: Implement a time-to-live (TTL) check or a smaller cap (e.g., 50 events) when saving the `STORAGE_KEY`.

## General Architecture Notes
*   **Security**: `innerHTML` is only used to clear elements (`mapEl.innerHTML = ""`), which is safe. Fallback rendering uses secure `textContent` and `createElement` methods.
*   **Performance**: `html2canvas` is a heavy dependency for screenshots. Using Leaflet's native tile export might be more performant, but given the offline requirements, this approach is acceptable.
*   **Privacy**: Excellent adherence to privacy requirements. No data is sent over the network, and the privacy banner clearly explains this.
