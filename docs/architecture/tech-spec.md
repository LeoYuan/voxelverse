# VoxelVerse 技术架构文档

> 对应 PRD 第 5 章技术架构建议，随开发迭代更新。

---

## 1. 技术栈

| 层级 | 技术选型 | 说明 |
|---|---|---|
| 渲染 | Three.js + React Three Fiber | InstancedMesh 批量体素渲染 |
| 状态管理 | Zustand | 轻量全局状态 |
| 游戏循环 | 自定义 Tick 循环 (20 TPS) | 独立于渲染帧率 |
| 构建 | Vite | 热更新、快速构建 |
| 测试 | Vitest | 红石逻辑单元测试 |
| 存档 | IndexedDB | 浏览器本地持久化 |
| 部署 | Vercel | 单页应用托管 |

---

## 2. 模块架构

```
voxelverse/
├── src/
│   ├── main.tsx              # 入口
│   ├── App.tsx               # 主应用
│   ├── engine/
│   │   ├── GameLoop.ts       # 主游戏循环 (20 TPS)
│   │   ├── ChunkManager.ts   # Chunk 加载/卸载/生成
│   │   ├── WorldGenerator.ts # Perlin 噪声地形生成
│   │   └── PhysicsEngine.ts  # AABB 碰撞、重力
│   ├── rendering/
│   │   ├── VoxelRenderer.tsx # R3F 体素渲染组件
│   │   ├── ChunkMesh.tsx     # 单个 Chunk 的 InstancedMesh
│   │   └── Sky.tsx           # 天空盒/光照
│   ├── player/
│   │   ├── PlayerController.ts  # 输入处理、移动
│   │   ├── PlayerState.ts    # 生命、饥饿、位置
│   │   └── Inventory.ts      # 背包系统
│   ├── blocks/
│   │   ├── BlockRegistry.ts  # 方块配置注册表
│   │   ├── BlockTypes.ts     # 方块类型定义
│   │   └── BlockInteractions.ts  # 放置/破坏逻辑
│   ├── redstone/
│   │   ├── RedstoneEngine.ts # 红石图引擎
│   │   ├── RedstoneNode.ts   # 节点定义
│   │   ├── RedstoneTypes.ts  # 红石元件类型
│   │   └── RedstoneSerializer.ts # 序列化
│   ├── crafting/
│   │   ├── CraftingRegistry.ts # 合成配方
│   │   └── CraftingGrid.ts   # 合成网格逻辑
│   ├── mobs/
│   │   ├── MobManager.ts     # 生物管理
│   │   ├── MobAI.ts          # AI 行为树/状态机
│   │   └── MobTypes.ts       # 生物类型定义
│   ├── ui/
│   │   ├── HUD.tsx           # 游戏内 HUD
│   │   ├── InventoryUI.tsx   # 背包界面
│   │   ├── CraftingUI.tsx    # 合成界面
│   │   ├── PauseMenu.tsx     # 暂停菜单
│   │   └── MainMenu.tsx      # 主菜单
│   ├── save/
│   │   ├── SaveManager.ts    # 存档管理
│   │   ├── IndexedDB.ts      # IndexedDB 封装
│   │   └── Serializer.ts     # 世界序列化/反序列化
│   └── utils/
│       ├── PerlinNoise.ts    # Perlin 噪声实现
│       ├── Vec3.ts           # 三维向量
│       ├── AABB.ts           # 轴对齐包围盒
│       └── RLE.ts            # 游程编码
├── tests/
│   ├── redstone/             # 红石逻辑测试
│   ├── crafting/             # 合成系统测试
│   └── physics/              # 物理测试
└── public/
    └── textures/             # 方块纹理
```

---

## 3. 核心循环时序

```
每帧（60 FPS）:
  1. 处理输入事件（鼠标/键盘）
  2. 更新相机位置
  3. 渲染场景

每 Tick（20 TPS，即每 50ms）:
  1. 玩家系统：更新生命/饥饿、应用移动
  2. 物理系统：实体重力、碰撞检测
  3. 生物系统：AI 更新、寻路、攻击
  4. 红石系统：信号传播、活塞事件
  5. 熔炉系统：烹饪进度
  6. 方块系统：水流动、沙子下落
  7. 世界系统：Chunk 加载/卸载
```

---

## 4. 性能策略

| 策略 | 实现 | 目标 |
|---|---|---|
| InstancedMesh | 每个 Chunk 一个 InstancedMesh | 减少 draw call |
| 面剔除 | 只渲染暴露在外部的方块面 | 减少三角面数 |
| Chunk 流式 | 只加载玩家周围 Chunks | 控制内存 |
| 脏标记 | 只更新变化的 Chunk mesh | 减少重建 |
| 视锥体剔除 | 不渲染视野外的 Chunk | 减少 GPU 负载 |
| LOD | 远距离 Chunk 降低细节 | 减少三角面数 |
| 红石休眠 | 无信号区域不计算 | 减少 CPU 负载 |
