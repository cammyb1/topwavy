import { EventRegistry } from "@jael-ecs/core";
import { Vector2 } from "three";

export interface InputConfig {
  mandatory: boolean;
  values: Record<string, boolean>;
}

export const KeyDirection = Object.freeze({
  UP: 1,
  DOWN: 2,
});

export type Direction = (typeof KeyDirection)[keyof typeof KeyDirection];

export interface PointerEvents {
  down: PointerEvent;
  up: PointerEvents;
}

class Pointer extends EventRegistry<PointerEvents> {
  position: Vector2;
  constructor() {
    super();
    this.position = new Vector2();

    window.addEventListener("pointermove", (e: MouseEvent) => {
      const { clientX, clientY } = e;
      this.position.setX((clientX / window.innerWidth) * 2 - 1);
      this.position.setY(-(clientY / window.innerHeight) * 2 + 1);
    });
    window.addEventListener("pointerdown", (e: PointerEvent) => {
      this.emit("down", e);
    });
    window.addEventListener("pointerup", (e: PointerEvent) => {
      this.emit("up", e);
    });
  }
}

class Input {
  keys: Map<string, InputConfig>;
  pointer: Pointer;

  constructor() {
    this.keys = new Map();
    this.pointer = new Pointer();

    window.addEventListener("keydown", (e) =>
      this.updateKeys(e, KeyDirection.DOWN),
    );
    window.addEventListener("keyup", (e) =>
      this.updateKeys(e, KeyDirection.UP),
    );
    window.addEventListener("visibilitychanged", () => {
      if (document.hidden) {
        this._clearSets();
      }
    });
    window.addEventListener("blur", () => {
      if (!document.hasFocus()) {
        this._clearSets();
      }
    });
  }

  register(name: string, keys: string[], isMandatory = false) {
    // add or override
    this.keys.set(name, {
      values: keys.reduce<Record<string, boolean>>((acc, k: string) => {
        acc[k.trim()] = false;
        return acc;
      }, {}),
      mandatory: isMandatory,
    });
  }

  _clearSets() {
    this.keys.forEach((set: InputConfig) => {
      Object.keys(set.values).forEach((key: string) => {
        set.values[key] = false;
      });
    });
  }

  isPressed(name: string): boolean {
    if (!this.keys.has(name)) return false;
    const config = this.keys.get(name)!;
    const keys = Object.keys(config.values);

    return config.mandatory
      ? keys.every((k) => config.values[k])
      : keys.some((k) => config.values[k]);
  }

  updateKeys(keyEvent: KeyboardEvent, direction: Direction) {
    this.keys.forEach((keySet: InputConfig) => {
      const key = keyEvent.code;

      if (keySet.values[key] !== undefined) {
        keySet.values[key] = direction === KeyDirection.DOWN;
      }
    });
  }
}

// Singleton
const input = new Input();

export { input as Input };
