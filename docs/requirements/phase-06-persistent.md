# Phase 6：世界之心（The Persistent World）

**时间**：Week 12+  
**主题**：让它成为一个"真正的游戏"  
**解锁玩法**：完整的独立游戏体验

---

## 需求清单

| ID | 需求项 | 优先级 | 依赖 |
|---|---|---|---|
| P6-REQ-01 | Chunk 压缩序列化（RLE，只存非空气） | P0 | 全部前期完成 |
| P6-REQ-02 | IndexedDB 多存档槽位（≥3） | P0 | P6-REQ-01 |
| P6-REQ-03 | 存档管理 UI：新建/加载/删除 | P0 | P6-REQ-02 |
| P6-REQ-04 | 存档缩略图（截图）和游玩时间显示 | P0 | P6-REQ-03 |
| P6-REQ-05 | 视锥体剔除 | P0 | Phase 1 完成 |
| P6-REQ-06 | Chunk LOD（远距离降低细节） | P0 | Phase 1 完成 |
| P6-REQ-07 | 纹理图集 | P0 | Phase 2 完成 |
| P6-REQ-08 | 环境音效 + 生物音效 + 背景音乐 | P1 | - |
| P6-REQ-09 | 设置菜单：音量、鼠标灵敏度、渲染距离、键位 | P1 | - |
| P6-REQ-10 | 成就/进度系统（5-10 个） | P2 | - |
| P6-REQ-11 | 导出存档文件（JSON/Binary） | P2 | P6-REQ-01 |
| P6-REQ-12 | Vercel 部署 | P0 | 全部完成 |
| P6-REQ-13 | PWA 支持（可离线游玩） | P2 | P6-REQ-12 |

---

## 存档数据结构

```typescript
interface WorldSave {
  version: number;        // 存档格式版本
  name: string;           // 世界名称
  createdAt: string;      // ISO 时间
  updatedAt: string;      // ISO 时间
  playTime: number;       // 累计游玩时间（秒）
  thumbnail: string;      // base64 缩略图
  player: PlayerState;    // 玩家状态
  chunks: ChunkData[];    // Chunk 数据（压缩后）
  redstone: RedstoneState; // 红石引擎状态
}

interface ChunkData {
  cx: number;
  cz: number;
  blocks: Uint16Array;    // RLE 压缩后的方块数据
}
```

---

## 验收标准

1. [ ] 玩家可以保存世界，关闭浏览器，第二天打开继续玩
2. [ ] 渲染距离 8 Chunks 时，中配笔记本稳定 60 FPS
3. [ ] 游戏可通过 URL 访问，无需安装
