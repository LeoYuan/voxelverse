export type ArithmeticOperation = 'add' | 'sub' | 'mul' | 'div';

export interface ArithmeticStep {
  label: string;
  a: number;
  b: number;
  carry?: number;
  partial?: number;
  result: number;
  note: string;
}

export interface ArithmeticTrace {
  operation: ArithmeticOperation;
  a: number;
  b: number;
  result: number;
  overflow: boolean;
  divideByZero: boolean;
  steps: ArithmeticStep[];
}

const BYTE_MASK = 0xff;

export function clampByte(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(BYTE_MASK, Math.trunc(value)));
}

export function toBinary8(value: number): string {
  return (value & BYTE_MASK).toString(2).padStart(8, '0');
}

export function traceArithmetic(operation: ArithmeticOperation, rawA: number, rawB: number): ArithmeticTrace {
  const a = clampByte(rawA);
  const b = clampByte(rawB);

  if (operation === 'add') return traceAdd(a, b);
  if (operation === 'sub') return traceSub(a, b);
  if (operation === 'mul') return traceMul(a, b);
  return traceDiv(a, b);
}

function traceAdd(a: number, b: number): ArithmeticTrace {
  const steps: ArithmeticStep[] = [];
  let carry = 0;
  let result = 0;

  for (let bit = 0; bit < 8; bit++) {
    const abit = (a >> bit) & 1;
    const bbit = (b >> bit) & 1;
    const sum = abit + bbit + carry;
    const out = sum & 1;
    carry = sum > 1 ? 1 : 0;
    result |= out << bit;
    steps.push({
      label: `bit ${bit}`,
      a,
      b,
      carry,
      partial: out << bit,
      result,
      note: `${abit}+${bbit} carry -> ${out}, next carry ${carry}`,
    });
  }

  return {
    operation: 'add',
    a,
    b,
    result: result & BYTE_MASK,
    overflow: carry > 0,
    divideByZero: false,
    steps,
  };
}

function traceSub(a: number, b: number): ArithmeticTrace {
  const inverted = (~b) & BYTE_MASK;
  const addTrace = traceAdd(a, inverted + 1);
  const steps: ArithmeticStep[] = [
    {
      label: 'invert B',
      a,
      b,
      partial: inverted,
      result: a,
      note: `~B = ${toBinary8(inverted)}`,
    },
    {
      label: 'add 1',
      a,
      b,
      partial: (inverted + 1) & BYTE_MASK,
      result: a,
      note: `two's complement = ${toBinary8(inverted + 1)}`,
    },
    ...addTrace.steps.map((step) => ({
      ...step,
      label: `sub ${step.label}`,
      b,
    })),
  ];

  return {
    operation: 'sub',
    a,
    b,
    result: (a - b) & BYTE_MASK,
    overflow: a < b,
    divideByZero: false,
    steps,
  };
}

function traceMul(a: number, b: number): ArithmeticTrace {
  const steps: ArithmeticStep[] = [];
  let accumulator = 0;

  for (let bit = 0; bit < 8; bit++) {
    const bitSet = ((b >> bit) & 1) === 1;
    const partial = bitSet ? a << bit : 0;
    accumulator += partial;
    steps.push({
      label: `bit ${bit}`,
      a,
      b,
      partial,
      result: accumulator & BYTE_MASK,
      note: bitSet
        ? `B${bit}=1, add A << ${bit}`
        : `B${bit}=0, skip`,
    });
  }

  return {
    operation: 'mul',
    a,
    b,
    result: accumulator & BYTE_MASK,
    overflow: accumulator > BYTE_MASK,
    divideByZero: false,
    steps,
  };
}

function traceDiv(a: number, b: number): ArithmeticTrace {
  if (b === 0) {
    return {
      operation: 'div',
      a,
      b,
      result: 0,
      overflow: false,
      divideByZero: true,
      steps: [{
        label: 'divide by zero',
        a,
        b,
        result: 0,
        note: 'division is undefined when B is 0',
      }],
    };
  }

  const steps: ArithmeticStep[] = [];
  let remainder = 0;
  let quotient = 0;

  for (let bit = 7; bit >= 0; bit--) {
    remainder = (remainder << 1) | ((a >> bit) & 1);
    const canSubtract = remainder >= b;
    if (canSubtract) {
      remainder -= b;
      quotient |= 1 << bit;
    }
    steps.push({
      label: `bit ${bit}`,
      a,
      b,
      partial: remainder,
      result: quotient,
      note: canSubtract
        ? `subtract B, set Q${bit}=1`
        : `keep remainder, Q${bit}=0`,
    });
  }

  return {
    operation: 'div',
    a,
    b,
    result: quotient & BYTE_MASK,
    overflow: false,
    divideByZero: false,
    steps,
  };
}
