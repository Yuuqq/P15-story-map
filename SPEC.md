# P15 Spec - 地理新闻故事地图

## 1. Summary

- **Project ID**: P15
- **Project Name**: 地理新闻故事地图
- **Goal**: 基于 Leaflet 的 StoryMap，滚动触发视图位移 + 多图层标注
- **User Persona**: 数据记者 / 特稿编辑

## 2. Scope

- **In scope**:
  - 基于 Leaflet 的 StoryMap
  - 滚动触发视图位移 + 多图层标注
- **Out of scope**:
  - 后端代理或服务端逻辑
  - API Key 持久化存储

## 3. UX

- **Core workflow**: 用户输入 → 前端处理 → 结果展示
- **Inputs**: 地理坐标点 JSON + 故事段落
- **Outputs**: 交互式故事地图
- **States**: empty (初始) / loading (处理中) / error (失败) / success (完成)

## 4. Functional Requirements

1. FR-1: 基于 Leaflet 的 StoryMap
2. FR-2: 结果可视化展示
3. FR-3: 错误状态可见提示

## 5. Non-Functional Requirements

- **Performance**: 核心任务 3 分钟内完成
- **Accessibility**: 键盘导航、aria-label、焦点可见、WCAG AA 对比度
- **Privacy**: 本地处理优先，不默认上传数据
- **Browser support**: 现代 Chromium (Chrome 110+)

## 6. Dependencies

- **Libraries/CDNs**: Leaflet.js (CDN)
- **Local data**: 无

## 7. Risks & Mitigations

- **Risk**: 地图瓦片加载依赖网络
- **Mitigation**: 提示需联网加载底图

## 8. Acceptance Criteria

- [ ] 点位 JSON 输入
- [ ] 地图标记与弹窗
- [ ] 路径连线
- [ ] 错误输入提示
- [ ] 纯静态页面可部署 GitHub Pages
- [ ] 移动端可用
- [ ] 隐私提示清晰可见
