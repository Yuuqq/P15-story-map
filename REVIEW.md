# P15-story-map Code Review

## Executive Summary
The codebase is a lightweight, zero-dependency mapping tool using Leaflet. The architecture is clean, and the deliberate constraint to run purely on the client-side removes many traditional backend security and privacy risks. The custom offline grid layer is a smart fallback.

## CRITICAL
*None discovered.* The application being purely client-side without sensitive data handling mitigates most critical risks.

## HIGH

### 1. Destructive Demo Feature Logic
**File**: `app.js` (lines 325-344)
**Impact**: The "🗺️ 加载示例新闻地图" (Load Demo News Map) button injects points using broad element selectors (`input[id*="name"]`, `input[type="text"]`, `button[1]`, etc.). In the production environment, which loads `../shared/releases/v2.6/loader.js`, these selectors inadvertently target global navigation and command palette elements. Specifically, `nameInput` hits the global command palette input, `descInput` overwrites the actual `#jsonInput` area with description strings, and `addBtn` targets `#exportBtn`, resulting in a destructive mis-trigger of 5 consecutive map exports instead of silently dropping points.
**Fix Suggestion**: Refactor the demo button IIFE in `app.js` to avoid DOM selectors completely. Instead, map the demo `points` array to the `[{lat, lng, title, desc}]` schema expected by the application (mapping `name` to `title`), stringify the mapped array, assign it directly to `jsonInput.value`, and then trigger `renderBtn.click()`.

## MEDIUM

### 1. Accessibility (a11y) Anti-Pattern
**File**: `index.html` (lines 42, 51)
**Impact**: Buttons contain both visible Chinese text and an English `aria-label` (e.g., `<button id="renderBtn" type="button" aria-label="render">渲染地图</button>`). Screen readers will announce "render" and ignore the visible "渲染地图", creating a confusing experience for native Chinese screen-reader users, violating WCAG 2.5.3 / 4.1.2.
**Fix Suggestion**: Remove the `aria-label` entirely if the visible text is adequately descriptive, or localize the `aria-label` to match the visible language (`aria-label="渲染地图"`).

### 2. Service Worker Caching Mismatch
**File**: `sw.js` (lines 37-41)
**Impact**: The comments explicitly state: "Network-First for external". However, the code skips cross-origin requests entirely: `if (url.origin !== self.location.origin) return;`. This means Leaflet CDN scripts and map tiles (which might be served from external origins) are not cached by the Service Worker, defeating the offline PWA capability for the map interface (falling back to the local grid only).
**Fix Suggestion**: Update the `fetch` event listener to apply a proper Network-First or Stale-While-Revalidate strategy for external CDN resources like Leaflet and map tiles, while taking care not to cache opaque responses aggressively.

## LOW

### 1. Missing Automated Tests
**File**: Repository level
**Impact**: Relying entirely on manual QA increases the risk of regressions, especially for DOM manipulation and HTML-to-Canvas exports.
**Fix Suggestion**: Introduce a lightweight testing framework (like Playwright) to automate the core workflow: entering JSON, rendering the map, and triggering the export.

## General Architecture Notes
*   **Security**: `innerHTML` is only used to clear elements (`mapEl.innerHTML = ""`), which is safe. Fallback rendering uses secure `textContent` and `createElement` methods.
*   **Performance**: `html2canvas` is a heavy dependency for screenshots. Using Leaflet's native tile export might be more performant, but given the offline requirements, this approach is acceptable.
*   **Privacy**: Excellent adherence to privacy requirements. No data is sent over the network, and the privacy banner clearly explains this.
