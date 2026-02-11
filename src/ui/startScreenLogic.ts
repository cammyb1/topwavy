import type { Entity } from "@jael-ecs/core";
import { FiniteState } from "../helpers/state";

export default function (engine: Entity) {
  const machine = engine.get<FiniteState>("state");

  if (!machine || !engine) return;

  const playButton: HTMLElement | null = document.getElementById("playAction");

  const optionButton: HTMLElement | null =
    document.getElementById("optionsAction");

  if (playButton) {
    playButton.onclick = () => {
      machine.setActiveState("start");
    };
  }

  if (optionButton) {
    optionButton.onclick = () => {
      machine.setActiveState("options");
    };
  }
}
