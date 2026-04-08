import { EventRegistry } from "@jael-ecs/core";
import type { AnimationAction } from "three";

export interface State {
  name: string;
  enter?: (_prev: this | undefined, machine: FiniteState) => void;
  exit?: (self: this, _next: this | undefined) => void;
}

export interface AnimationState extends State {
  action: AnimationAction;
}

export interface FiniteStateEvents {
  change: State | undefined;
}

export class FiniteState<
  S extends State = State,
> extends EventRegistry<FiniteStateEvents> {
  states: S[];
  active: S | undefined;
  isFiniteState: boolean = true;

  constructor() {
    super();
    this.states = [];
  }

  register(state: S) {
    if (!this.states.includes(state)) {
      this.states.push(state);
    }
  }

  setActiveState(name: string) {
    if (name === this.active?.name) return;
    const state = this.states.find((s) => s.name === name);
    if (state) {
      const prev = this.active;
      if (prev) {
        prev.exit?.(prev, state);
      }

      this.active = state;
      state.enter?.(prev, this);
      this.emit("change", prev);
    }
  }
}
