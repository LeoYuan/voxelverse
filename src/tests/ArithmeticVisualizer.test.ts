import { describe, expect, it } from 'vitest';
import { toBinary8, traceArithmetic } from '../creative/ArithmeticVisualizer';

describe('ArithmeticVisualizer', () => {
  it('traces 8-bit addition with overflow', () => {
    const trace = traceArithmetic('add', 250, 10);

    expect(trace.result).toBe(4);
    expect(trace.overflow).toBe(true);
    expect(trace.steps).toHaveLength(8);
  });

  it('traces subtraction using 8-bit wraparound', () => {
    const trace = traceArithmetic('sub', 3, 5);

    expect(trace.result).toBe(254);
    expect(trace.overflow).toBe(true);
    expect(trace.steps[0].label).toBe('invert B');
  });

  it('traces multiplication with partial products', () => {
    const trace = traceArithmetic('mul', 13, 7);

    expect(trace.result).toBe(91);
    expect(trace.overflow).toBe(false);
    expect(trace.steps.filter((step) => step.partial !== 0)).toHaveLength(3);
  });

  it('traces division and divide-by-zero', () => {
    const trace = traceArithmetic('div', 200, 12);
    const divideByZero = traceArithmetic('div', 200, 0);

    expect(trace.result).toBe(16);
    expect(trace.divideByZero).toBe(false);
    expect(divideByZero.divideByZero).toBe(true);
  });

  it('formats values as eight-bit binary', () => {
    expect(toBinary8(5)).toBe('00000101');
    expect(toBinary8(260)).toBe('00000100');
  });
});
