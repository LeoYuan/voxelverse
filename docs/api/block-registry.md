# Block Registry API 设计

方块注册表是 VoxelVerse 的核心配置系统，所有方块类型在此集中定义。

---

## 1. 方块定义接口

```typescript
interface BlockDefinition {
  /** 唯一数字 ID */
  id: number;
  /** 唯一字符串标识 */
  key: string;
  /** 显示名称 */
  name: string;
  /** 纹理配置 */
  textures: BlockTextures;
  /** 硬度（挖掘时间 = hardness / toolSpeed） */
  hardness: number;
  /** 是否透明（影响渲染和光照） */
  transparent: boolean;
  /** 是否固体（影响碰撞） */
  solid: boolean;
  /** 碰撞箱，默认 [0,0,0,1,1,1] */
  collision?: [number, number, number, number, number, number];
  /** 需要特定工具才能掉落物品 */
  toolRequired?: ToolType;
  /** 破坏后掉落物（默认掉落自身） */
  drops?: DropConfig[];
  /** 是否可以被红石充能 */
  conductRedstone?: boolean;
  /** 红石行为（如果有） */
  redstoneBehavior?: RedstoneBehaviorType;
  /** 光照等级（光源方块） */
  lightLevel?: number;
}

interface BlockTextures {
  /** 各面纹理，可统一或分别指定 */
  all?: string;           // 六面统一
  top?: string;           // 顶面
  bottom?: string;        // 底面
  side?: string;          // 四面统一
  north?: string;
  south?: string;
  east?: string;
  west?: string;
}

interface DropConfig {
  item: string;           // 掉落物 key
  count: number;          // 数量
  chance?: number;        // 概率（默认 1.0）
}

type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'hoe' | 'sword';
```

---

## 2. 注册表 API

```typescript
class BlockRegistry {
  /** 注册一个方块定义 */
  register(def: BlockDefinition): void;

  /** 通过 ID 获取方块定义 */
  getById(id: number): BlockDefinition | undefined;

  /** 通过 key 获取方块定义 */
  getByKey(key: string): BlockDefinition | undefined;

  /** 获取所有注册方块 */
  getAll(): BlockDefinition[];

  /** 检查 ID 是否已注册 */
  hasId(id: number): boolean;
}
```

---

## 3. 使用示例

```typescript
import { BlockRegistry } from './BlockRegistry';

const registry = new BlockRegistry();

registry.register({
  id: 1,
  key: 'grass',
  name: '草方块',
  textures: { top: 'grass_top', bottom: 'dirt', side: 'grass_side' },
  hardness: 0.6,
  transparent: false,
  solid: true,
  drops: [{ item: 'dirt', count: 1 }],
});

registry.register({
  id: 2,
  key: 'stone',
  name: '石头',
  textures: { all: 'stone' },
  hardness: 1.5,
  transparent: false,
  solid: true,
  toolRequired: 'pickaxe',
  drops: [{ item: 'cobblestone', count: 1 }],
});

registry.register({
  id: 3,
  key: 'glass',
  name: '玻璃',
  textures: { all: 'glass' },
  hardness: 0.3,
  transparent: true,
  solid: true,
});
```

---

## 4. 方块 ID 分配（预留）

| ID 范围 | 用途 |
|---|---|
| 0 | 空气（Air）|
| 1-99 | 自然方块 |
| 100-199 | 木质/建筑方块 |
| 200-299 | 矿石/矿物 |
| 300-399 | 功能方块 |
| 400-499 | 红石元件 |
| 500-599 | 工具/物品（非方块）|
| 600+ | 动态/预留 |
