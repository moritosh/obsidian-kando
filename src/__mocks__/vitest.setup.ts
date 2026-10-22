// Obsidian's real runtime injects these Array/String/Math prototype extensions
// globally (see node_modules/obsidian/obsidian.d.ts) before any plugin code runs.
// The plugin relies on them throughout, so the test environment needs the same
// polyfill or calls like `array.first()` throw.
if (!Array.prototype.first) {
  Object.defineProperties(Array.prototype, {
    first: { value: function () { return this[0]; }, enumerable: false },
    last: { value: function () { return this[this.length - 1]; }, enumerable: false },
    contains: { value: function (target: unknown) { return this.includes(target); }, enumerable: false },
    remove: {
      value: function (target: unknown) {
        const idx = this.indexOf(target);
        if (idx > -1) this.splice(idx, 1);
      },
      enumerable: false,
    },
    unique: { value: function () { return [...new Set(this)]; }, enumerable: false },
    shuffle: {
      value: function () {
        for (let i = this.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [this[i], this[j]] = [this[j], this[i]];
        }
        return this;
      },
      enumerable: false,
    },
    findLastIndex: {
      value: function (predicate: (value: unknown) => boolean) {
        for (let i = this.length - 1; i >= 0; i--) {
          if (predicate(this[i])) return i;
        }
        return -1;
      },
      enumerable: false,
    },
  });
}

if (!String.prototype.contains) {
  Object.defineProperty(String.prototype, 'contains', {
    value: function (target: string) {
      return this.includes(target);
    },
    enumerable: false,
  });
}

if (!(Math as any).clamp) {
  (Math as any).clamp = (value: number, min: number, max: number) =>
    Math.min(Math.max(value, min), max);
  (Math as any).square = (value: number) => value * value;
}

// Obsidian's runtime also exposes a global `app` singleton (see src/types.d.ts:
// `declare const app: import('obsidian').App;`), read directly by several helpers.
import { App } from 'obsidian';
(globalThis as any).app = new App();

// jsdom doesn't reliably provide window.localStorage in this Vitest setup; polyfill
// with a minimal in-memory implementation since src/lang/helpers.ts reads it at import time.
if (typeof window !== 'undefined' && !window.localStorage) {
  const store = new Map<string, string>();
  (window as any).localStorage = {
    getItem: (key: string) => (store.has(key) ? store.get(key)! : null),
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => store.clear(),
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length() {
      return store.size;
    },
  };
}

// Obsidian also extends the DOM prototypes (see obsidian.d.ts) and exposes the
// focused window/document as globals. Components and the dnd layer use these.
if (!('win' in Node.prototype)) {
  Object.defineProperties(Node.prototype, {
    doc: {
      get() {
        return this.ownerDocument ?? this;
      },
      configurable: true,
    },
    win: {
      get() {
        return (this.ownerDocument ?? this).defaultView;
      },
      configurable: true,
    },
    instanceOf: {
      value: function (type: new (...args: any[]) => unknown) {
        return this instanceof type;
      },
      enumerable: false,
    },
    // Obsidian fires this once the node is attached to a document; poll for it
    // with a MutationObserver when it isn't attached yet.
    onNodeInserted: {
      value: function (listener: () => void, once?: boolean) {
        let done = false;
        const fire = () => {
          if (done) return;
          if (once) done = true;
          listener();
        };
        if (this.isConnected) {
          queueMicrotask(fire);
          return () => (done = true);
        }
        const observer = new MutationObserver(() => {
          if (!this.isConnected) return;
          observer.disconnect();
          fire();
        });
        observer.observe(document, { childList: true, subtree: true });
        return () => {
          done = true;
          observer.disconnect();
        };
      },
      enumerable: false,
    },
  });

  Object.defineProperties(Element.prototype, {
    addClass: {
      value: function (...classes: string[]) {
        this.classList.add(...classes);
      },
      enumerable: false,
    },
    removeClass: {
      value: function (...classes: string[]) {
        this.classList.remove(...classes);
      },
      enumerable: false,
    },
    hasClass: {
      value: function (cls: string) {
        return this.classList.contains(cls);
      },
      enumerable: false,
    },
    toggleClass: {
      value: function (cls: string, value: boolean) {
        this.classList.toggle(cls, value);
      },
      enumerable: false,
    },
  });

  Object.defineProperty(Event.prototype, 'targetNode', {
    get() {
      return this.target;
    },
    configurable: true,
  });
}

if (typeof window !== 'undefined') {
  (globalThis as any).activeWindow = window;
  (globalThis as any).activeDocument = document;
}

// jsdom has no layout, so these observers never fire; tests that need geometry
// stub getBoundingClientRect instead.
class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
(globalThis as any).ResizeObserver ??= NoopObserver;
(globalThis as any).IntersectionObserver ??= NoopObserver;
