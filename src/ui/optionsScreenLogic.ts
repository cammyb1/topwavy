import type { Entity } from "@jael-ecs/core";
import { game } from "../store";
import type { FiniteState } from "../helpers/state";

export default function (engine: Entity) {
  const machine = engine.getComponent<FiniteState>("state");

  if (!machine || !engine) return;

  const waveConfig = game.getState().waveConfig;

  const form: HTMLFormElement = document.forms[0];
  const saveButton: HTMLButtonElement = document.getElementById(
    "save",
  ) as HTMLButtonElement;
  const backButton: HTMLButtonElement = document.getElementById(
    "back",
  ) as HTMLButtonElement;

  form.max.value = waveConfig.maxWave;
  form.exw.value = waveConfig.enemiesPerWave;
  form.sleep.value = waveConfig.sleepTime;

  backButton.onclick = () => {
    machine.setActiveState("idle");
  };

  saveButton.onclick = () => {
    game.getState().changeWaveConfig({
      maxWave: Number(form.max.value),
      enemiesPerWave: Number(form.exw.value),
      sleepTime: Number(form.sleep.value),
    });
  };

  form.onsubmit = (e: SubmitEvent) => {
    e.preventDefault();
  };
}
