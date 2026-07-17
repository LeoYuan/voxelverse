import {
  BLOCK_ALU_CONTROLLER,
  BLOCK_ALU_INPUT_OFF,
  BLOCK_ALU_INPUT_ON,
  BLOCK_ALU_OUTPUT_OFF,
  BLOCK_ALU_OUTPUT_ON,
  BLOCK_ALU_SELECTOR,
  BLOCK_REDSTONE_DUST,
  BLOCK_REDSTONE_LAMP,
  BLOCK_REDSTONE_LAMP_LIT,
} from '../blocks/BlockRegistry';
import { toBinary8, type ArithmeticOperation, type ArithmeticTrace } from './ArithmeticVisualizer';

export interface ArithmeticComponentBlock {
  x: number;
  y: number;
  z: number;
  blockId: number;
}

export interface ArithmeticComponentLayout {
  origin: { x: number; y: number; z: number };
  blocks: ArithmeticComponentBlock[];
  labels: Array<{ label: string; x: number; y: number; z: number }>;
}

export function buildArithmeticComponentLayout(
  trace: ArithmeticTrace,
  operation: ArithmeticOperation,
  origin: { x: number; y: number; z: number },
): ArithmeticComponentLayout {
  const blocks: ArithmeticComponentBlock[] = [];
  const labels: ArithmeticComponentLayout['labels'] = [];
  const rows = [
    { label: 'A', z: 0, value: trace.a, on: BLOCK_ALU_INPUT_ON, off: BLOCK_ALU_INPUT_OFF },
    { label: 'B', z: 2, value: trace.b, on: BLOCK_ALU_INPUT_ON, off: BLOCK_ALU_INPUT_OFF },
    { label: 'R', z: 6, value: trace.result, on: BLOCK_ALU_OUTPUT_ON, off: BLOCK_ALU_OUTPUT_OFF },
  ];

  for (const row of rows) {
    labels.push({ label: row.label, x: origin.x - 1, y: origin.y, z: origin.z + row.z });
    const bits = toBinary8(row.value);
    for (let index = 0; index < bits.length; index++) {
      blocks.push({
        x: origin.x + index,
        y: origin.y,
        z: origin.z + row.z,
        blockId: bits[index] === '1' ? row.on : row.off,
      });
    }
  }

  for (let bit = 0; bit < 8; bit++) {
    blocks.push({ x: origin.x + bit, y: origin.y, z: origin.z + 1, blockId: BLOCK_REDSTONE_DUST });
    blocks.push({ x: origin.x + bit, y: origin.y, z: origin.z + 3, blockId: BLOCK_REDSTONE_DUST });
    blocks.push({
      x: origin.x + bit,
      y: origin.y,
      z: origin.z + 5,
      blockId: ((trace.result >> (7 - bit)) & 1) === 1 ? BLOCK_REDSTONE_LAMP_LIT : BLOCK_REDSTONE_LAMP,
    });
  }

  const opIndex = operationIndex(operation);
  for (let index = 0; index < 4; index++) {
    blocks.push({
      x: origin.x + index * 2,
      y: origin.y,
      z: origin.z + 4,
      blockId: index === opIndex ? BLOCK_ALU_SELECTOR : BLOCK_ALU_CONTROLLER,
    });
  }
  labels.push({ label: operationSymbol(operation), x: origin.x + opIndex * 2, y: origin.y + 1, z: origin.z + 4 });

  return { origin, blocks, labels };
}

function operationIndex(operation: ArithmeticOperation): number {
  return { add: 0, sub: 1, mul: 2, div: 3 }[operation];
}

function operationSymbol(operation: ArithmeticOperation): string {
  return { add: '+', sub: '-', mul: 'x', div: '/' }[operation];
}
