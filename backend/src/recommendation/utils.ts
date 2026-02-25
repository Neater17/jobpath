export function clamp01(value: number) {
  return Math.max(0, Math.min(1, value));
}

export function sigmoid(value: number) {
  return 1 / (1 + Math.exp(-value));
}

export function softmax(values: number[]) {
  const max = Math.max(...values);
  const exps = values.map((value) => Math.exp(value - max));
  const sum = exps.reduce((acc, value) => acc + value, 0) || 1;
  return exps.map((value) => value / sum);
}

export function mean(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

export function squaredError(values: number[], center: number) {
  return values.reduce((acc, value) => {
    const delta = value - center;
    return acc + delta * delta;
  }, 0);
}

export class SeededRng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  next() {
    this.state = (1664525 * this.state + 1013904223) >>> 0;
    return this.state / 4294967296;
  }

  int(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }

  shuffle<T>(values: T[]) {
    for (let i = values.length - 1; i > 0; i -= 1) {
      const j = this.int(i + 1);
      const temp = values[i];
      values[i] = values[j];
      values[j] = temp;
    }
  }
}
