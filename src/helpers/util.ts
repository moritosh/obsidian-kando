const { compare } = new Intl.Collator(undefined, {
  usage: 'sort',
  sensitivity: 'base',
  numeric: true,
});

export const defaultSort = compare;

export interface ClassObject {
  [key: string]: unknown;
}

export type ClassValue = string | number | null | undefined | ClassObject | ClassValue[];

export function classcat(names: ClassValue): string {
  if (typeof names === 'string' || typeof names === 'number') return '' + names;

  let out = '';

  if (Array.isArray(names)) {
    for (let i = 0; i < names.length; i++) {
      const tmp = classcat(names[i]);
      if (tmp !== '') out += (out && ' ') + tmp;
    }
  } else {
    for (const k in names) {
      if (names[k]) out += (out && ' ') + k;
    }
  }

  return out;
}

export function isPlainObject(o: unknown): o is Record<string, unknown> {
  if (Object.prototype.toString.call(o) !== '[object Object]') return false;

  const ctor = (o as object).constructor;
  if (ctor === undefined) return true;

  const prot = ctor.prototype;
  if (Object.prototype.toString.call(prot) !== '[object Object]') return false;

  return Object.prototype.hasOwnProperty.call(prot, 'isPrototypeOf');
}

export function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) return false;
    }
    return true;
  }

  if (isPlainObject(a) && isPlainObject(b)) {
    const aKeys = Object.keys(a);
    const bKeys = Object.keys(b);
    if (aKeys.length !== bKeys.length) return false;
    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
      if (!isEqual(a[key], b[key])) return false;
    }
    return true;
  }

  return a !== a && b !== b;
}

export class PromiseCapability<T = void> {
  promise: Promise<T>;

  // Assigned synchronously inside the Promise executor below.
  resolve!: (data: T) => void;
  reject!: (reason?: any) => void;

  settled = false;

  constructor() {
    this.promise = new Promise((resolve, reject) => {
      this.resolve = (data) => {
        this.settled = true;
        resolve(data);
      };

      this.reject = (reason) => {
        this.settled = true;
        reject(reason);
      };
    });
  }
}

type QAble = () => Promise<any>;

export class PromiseQueue {
  queue: Array<QAble> = [];
  isRunning: boolean = false;

  constructor(public onComplete: () => void) {}

  clear() {
    this.queue.length = 0;
    this.isRunning = false;
  }

  add(item: QAble) {
    this.queue.push(item);

    if (!this.isRunning) {
      this.run();
    }
  }

  async run() {
    this.isRunning = true;

    const { queue } = this;
    let intervalStart = performance.now();

    while (queue.length) {
      const item = queue.splice(0, 5);

      try {
        await Promise.all(item.map((item) => item()));
      } catch (e) {
        console.error(e);
      }

      if (!this.isRunning) return;

      const now = performance.now();
      if (now - intervalStart > 50) {
        await new Promise((res) => activeWindow.setTimeout(res));
        intervalStart = now;
      }
    }

    this.isRunning = false;
    this.onComplete();
  }
}
