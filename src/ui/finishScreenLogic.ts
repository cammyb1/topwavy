import type { Entity } from "@jael-ecs/core";
import type { FiniteState } from "../helpers/state";
import { Input } from "@jael-ecs/core";

export default function (engine: Entity) {
  const machine = engine.getComponent<FiniteState>("state");

  if (!machine || !engine) return;

  Input.keyboard.on("down", ({ code }) => {
    if (code === "Space") {
      machine.setActiveState("idle");
    }
  });
}
