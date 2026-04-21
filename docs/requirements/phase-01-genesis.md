# Phase 1：创世（The Genesis）

**时间**：Week 1-2  
**主题**：让世界存在，让玩家能飞  
**解锁玩法**：创造模式（上帝模式）

---

## 需求清单

| ID | 需求项 | 优先级 | 依赖 |
|---|---|---|---|
| P1-REQ-01 | 初始化 Vite + TypeScript 项目 | P0 | - |
| P1-REQ-02 | 安装 Three.js / React Three Fiber | P0 | P1-REQ-01 |
| P1-REQ-03 | Chunk 数据结构：16×16×16 三维数组，存储方块 ID | P0 | - |
| P1-REQ-04 | InstancedMesh 批量渲染：每个 Chunk 一个 InstancedMesh | P0 | P1-REQ-02, P1-REQ-03 |
| P1-REQ-05 | 第一人称控制器：PointerLockControls | P0 | P1-REQ-02 |
| P1-REQ-06 | WASD 移动 + 空格上升 / Shift 下降（创造模式飞行） | P0 | P1-REQ-05 |
| P1-REQ-07 | 3D Perlin 噪声地形：草地表层 + 泥土中层 + 石头底层，高度 64-128 | P0 | P1-REQ-03 |
| P1-REQ-08 | 射线检测：从相机中心发射射线，检测碰撞方块 | P0 | P1-REQ-04 |
| P1-REQ-09 | 左键破坏：射线命中方块 → 设为空气 | P0 | P1-REQ-08 |
| P1-REQ-10 | 右键放置：射线命中面 → 在该面外侧放置新方块 | P0 | P1-REQ-08 |
| P1-REQ-11 | 基础方块：草方块、泥土、石头、原木、玻璃（5 种） | P0 | P1-REQ-03 |
| P1-REQ-12 | 天空盒 + 方向光（模拟太阳）+ 环境光 + 简单阴影 | P1 | P1-REQ-02 |
| P1-REQ-13 | Chunk 流式加载：根据玩家位置加载/卸载周围 Chunk | P0 | P1-REQ-03 |
| P1-REQ-14 | 性能基准：8 Chunks 渲染距离，60 FPS | P0 | P1-REQ-04 |

---

## 技术要点

### Chunk 数据结构
```
Chunk {
  cx: number,    // Chunk X 坐标（世界坐标 / 16）
  cz: number,    // Chunk Z 坐标
  blocks: Uint16Array[16*16*16]  // 每个元素 = 方块 ID
}
```

### 地形生成算法
1. 使用 2D Perlin 噪声生成高度图（heightmap）
2. 对于每个 (x, z)，计算地形高度 h
3. 对于 y < h-3：石头
4. 对于 h-3 ≤ y < h：泥土
5. 对于 y = h：草方块
6. y > h：空气

### InstancedMesh 渲染策略
- 每个 Chunk 创建一个 InstancedMesh
- 只渲染非空气方块
- 实例数量 = Chunk 中非空气方块数
- 当方块变化时，更新该 Chunk 的 InstancedMesh

---

## 验收标准（Definition of Done）

1. [ ] 打开浏览器，生成一个 512×512 格的世界
2. [ ] 玩家可以飞行、行走、破坏和放置 5 种方块
3. [ ] 帧率稳定在 60 FPS（中配笔记本，Chrome）

---

## 已知风险

| 风险 | 应对方案 |
|---|---|
| InstancedMesh 更新性能差 | 采用脏标记，只更新变化的 Chunk；必要时合并相邻 Chunk |
| 射线检测精度问题 | 使用 THREE.Raycaster，设置合适的 far 距离 |
| 飞行穿地 | 简单 AABB 碰撞检测，禁止相机进入固体方块 |
