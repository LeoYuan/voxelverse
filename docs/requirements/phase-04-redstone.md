# Phase 4：地下脉动（The Redstone Age）

**时间**：Week 8-9  
**主题**：引入"电"的概念  
**解锁玩法**：基础电路工程师

---

## 需求清单

| ID | 需求项 | 优先级 | 依赖 |
|---|---|---|---|
| P4-REQ-01 | 红石矿石地下生成（Y<16） | P0 | Phase 3 完成 |
| P4-REQ-02 | 红石粉铺设与连接 | P0 | P4-REQ-01 |
| P4-REQ-03 | 红石信号衰减（每格-1，最大15） | P0 | P4-REQ-02 |
| P4-REQ-04 | 红石火把（非门逻辑） | P0 | P4-REQ-02 |
| P4-REQ-05 | 拉杆 | P0 | P4-REQ-02 |
| P4-REQ-06 | 按钮 | P0 | P4-REQ-02 |
| P4-REQ-07 | 压力板 | P0 | P4-REQ-02 |
| P4-REQ-08 | 红石块（永久电源） | P0 | P4-REQ-02 |
| P4-REQ-09 | 红石灯（信号≥1 时亮起） | P0 | P4-REQ-02 |
| P4-REQ-10 | 红石图引擎：每 Tick BFS 传播 | P0 | P4-REQ-02 |
| P4-REQ-11 | 双缓冲状态机 | P0 | P4-REQ-10 |
| P4-REQ-12 | 红石中继器（1-4 tick 延迟） | P0 | P4-REQ-10 |
| P4-REQ-13 | 红石中继器信号放大（输出恒为15） | P0 | P4-REQ-12 |
| P4-REQ-14 | 铁门 + 红石控制 | P1 | P4-REQ-05 |
| P4-REQ-15 | 红石逻辑门单元测试 | P0 | P4-REQ-04 |

---

## 红石图引擎设计

### 核心设计：双缓冲状态机

```typescript
interface RedstoneNode {
  id: string;           // 唯一标识
  type: RedstoneType;   // 红石粉 / 火把 / 中继器 / 灯 等
  pos: Vec3;            // 世界坐标
  power: number;        // 当前信号强度 0-15
  inputs: string[];     // 输入节点 ID 列表
  outputs: string[];    // 输出节点 ID 列表
}

class RedstoneEngine {
  nodes: Map<string, RedstoneNode>;
  currentState: Map<string, number>;  // 当前 tick 信号值
  nextState: Map<string, number>;     // 下一 tick 信号值

  tick() {
    // 1. 采样所有输入源（拉杆、按钮、红石块等）
    // 2. BFS 传播信号
    // 3. 计算每个节点的输出
    // 4. 写入 nextState
    // 5. swap(currentState, nextState)
  }
}
```

### 节点类型

| 类型 | 输入 | 输出 | 行为 |
|---|---|---|---|
| 红石块 | - | 15 | 永久输出 15 |
| 拉杆 | - | 15/0 | 玩家切换 |
| 按钮 | - | 15（1 tick 后归零） | 玩家按下 |
| 压力板 | - | 15/0 | 实体踩踏检测 |
| 红石粉 | 相邻信号 | max(输入) - 1 | 传导并衰减 |
| 红石火把 | 附着方块 | 15/0 | 附着方块有信号→熄灭(0)，无信号→亮起(15) |
| 中继器 | 后方输入 | 15 | 延迟 1-4 tick 后输出 |
| 红石灯 | 信号输入 | - | 信号≥1 时亮起 |

---

## 验收标准

1. [ ] 能在地下挖到红石矿
2. [ ] 能搭建"拉杆 → 红石线 → 红石灯"电路，拉下拉杆灯亮
3. [ ] 能用红石火把搭建非门，验证输入输出相反
4. [ ] 能做密码拉杆门（3 个拉杆，特定组合开门）
