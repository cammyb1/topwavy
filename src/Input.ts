export default class Input {
  keys: Map<string, Record<string, boolean>>;

  constructor() {
    this.keys = new Map();
  }

  register(name: string, keys: string[]) {
    // add or override
    this.keys.set(
      name,
      keys.reduce<Record<string, boolean>>((acc, k: string) => {
        acc[k] = false;
        return acc;
      }, {}),
    );
  }

  isPressed(name: string): boolean {
    if (!this.keys.has(name)) return false;
    const keys = this.keys.get(name)!;

    return Object.keys(keys).some((k) => keys[k]);
  }

  updateKeys() {
    
  }
}
