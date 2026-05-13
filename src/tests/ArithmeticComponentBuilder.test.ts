import { describe, expect, it } from 'vitest';
import {
  BLOCK_ALU_INPUT_OFF,
  BLOCK_ALU_INPUT_ON,
  BLOCK_ALU_OUTPUT_ON,
  BLOCK_ALU_SELECTOR,
} from '../blocks/BlockRegistry';
import { buildArithmeticComponentLayout } from '../creative/ArithmeticComponentBuilder';
import { traceArithmetic } from '../creative/ArithmeticVisualizer';

describe('ArithmeticComponentBuilder', () => {
  it('maps trace inputs and outputs into 8-bit component rows', () => {
    const trace = traceArithmetic('add', 250, 10);
    const layout = buildArithmeticComponentLayout(trace, 'add', { x: 10, y: 8, z: 12 });

    const inputA = layout.blocks.filter((block) => block.z === 12);
    const inputB = layout.blocks.filter((block) => block.z === 14);
    const output = layout.blocks.filter((block) => block.z === 18);
    const selectedOps = layout.blocks.filter((block) => block.blockId === BLOCK_ALU_SELECTOR);

    expect(inputA).toHaveLength(8);
    expect(inputB).toHaveLength(8);
    expect(output).toHaveLength(8);
    expect(inputA.filter((block) => block.blockId === BLOCK_ALU_INPUT_ON)).toHaveLength(6);
    expect(inputB.filter((block) => block.blockId === BLOCK_ALU_INPUT_OFF)).toHaveLength(6);
    expect(output.filter((block) => block.blockId === BLOCK_ALU_OUTPUT_ON)).toHaveLength(1);
    expect(selectedOps).toHaveLength(1);
    expect(selectedOps[0]).toMatchObject({ x: 10, y: 8, z: 16 });
  });
});
