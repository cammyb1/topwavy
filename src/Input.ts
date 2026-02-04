import { EventRegistry } from "@jael-ecs/core";
import { Vector2 } from "three";

export interface InputConfig {
  mandatory: boolean;
  states: {
    down: boolean;
    up: boolean;
    pressed: boolean;
  };
  values: Record<string, boolean>;
}

export const KeyDirection = Object.freeze({
  UP: 1,
  DOWN: 2,
});

export type Direction = (typeof KeyDirection)[keyof typeof KeyDirection];

export interface PointerEvents {
  down: PointerEvent;
  up: PointerEvent;
}

export interface InputEvents {
  down: { code: string; repeated: boolean };
  up: { code: string; repeated: boolean };
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

class Input extends EventRegistry<InputEvents> {
  keys: Map<string, InputConfig>;
  pointer: Pointer;

  constructor() {
    super();
    this.keys = new Map();
    this.pointer = new Pointer();

    window.addEventListener("keydown", (e) =>
      this.checkKeys(e, KeyDirection.DOWN),
    );
    window.addEventListener("keyup", (e) => this.checkKeys(e, KeyDirection.UP));
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

  register(
    name: string,
    keys: string[],
    config: { mandatory: boolean } = { mandatory: false },
  ) {
    // add or override
    this.keys.set(name, {
      values: keys.reduce<Record<string, boolean>>((acc, k: string) => {
        acc[k.trim()] = false;
        return acc;
      }, {}),
      states: {
        down: false,
        up: false,
        pressed: false,
      },
      mandatory: config.mandatory,
    });
  }

  _clearSets() {
    this.keys.forEach((set: InputConfig) => {
      Object.keys(set.values).forEach((key: string) => {
        set.values[key] = false;
      });
    });
  }

  private _configPressed(config: InputConfig): boolean {
    return config.mandatory
      ? Object.keys(config.values).every((k) => config.values[k])
      : Object.keys(config.values).some((k) => config.values[k]);
  }

  isDown(name: string): boolean {
    if (!this.keys.has(name)) return false;

    const config = this.keys.get(name)!;
    return config.states.down;
  }

  isUp(name: string): boolean {
    if (!this.keys.has(name)) return false;

    const config = this.keys.get(name)!;
    return config.states.up;
  }

  isPressed(name: string): boolean {
    if (!this.keys.has(name)) return false;
    const config = this.keys.get(name)!;
    return config.states.pressed;
  }

  checkKeys(keyEvent: KeyboardEvent, direction: Direction) {
    if (direction === KeyDirection.UP) {
      this.emit("up", { code: keyEvent.code, repeated: keyEvent.repeat });
    } else if (direction === KeyDirection.DOWN) {
      this.emit("down", { code: keyEvent.code, repeated: keyEvent.repeat });
    }

    this.keys.forEach((keyConfig: InputConfig) => {
      const keyCode = keyEvent.code;
      const values = keyConfig.values;

      const existInConfig = values[keyCode] !== undefined;
      let pressed = this._configPressed(keyConfig);

      if (
        direction === KeyDirection.UP &&
        !keyEvent.repeat &&
        pressed &&
        existInConfig
      ) {
        keyConfig.states.up = true;
        let id = requestAnimationFrame(() => {
          keyConfig.states.up = false;
          cancelAnimationFrame(id);
        });
      }

      if (existInConfig) {
        values[keyCode] = direction === KeyDirection.DOWN;
      }

      pressed = this._configPressed(keyConfig);

      if (
        direction === KeyDirection.DOWN &&
        !keyEvent.repeat &&
        pressed &&
        existInConfig
      ) {
        keyConfig.states.down = true;
        let id = requestAnimationFrame(() => {
          keyConfig.states.down = false;
          cancelAnimationFrame(id);
        });
      }

      keyConfig.states.pressed = pressed;
    });
  }
}

// Singleton
const input = new Input();

export { input as Input, type Input as InputType };
