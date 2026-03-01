import type { GLState } from "../mount3";
import {
  AmbientLight,
  DirectionalLight,
  Mesh,
  PlaneGeometry,
  ShadowMaterial,
  Vector3,
} from "three";
import RapierEngine from "../helpers/rapier";
import { type World, type Entity, Input } from "@jael-ecs/core";
import { FiniteState, type State } from "../helpers/state";
import { type LoadedUIElements } from "../game";
import playingScreenLogic from "../ui/playingScreenLogic";
import optionsScreenLogic from "../ui/optionsScreenLogic";
import finishScreenLogic from "../ui/finishScreenLogic";
import idleScreenLogic from "../ui/idleScreenLogic";

export const showWaveEvent = new Event("show-wave");

export function Engine(state: GLState, world: World): Entity {
  const engineId = world.create();
  const proxy: Entity = world.getEntity(engineId) as Entity;

  // Ground shadow;
  const planeGeo = new PlaneGeometry(10, 10, 10);
  const shadowMaterial = new ShadowMaterial();

  const playgroundSize = 100;

  // Ground + borders
  const groundCollider = RapierEngine.collider.box({
    x: playgroundSize,
    y: 0,
    z: playgroundSize,
  });
  groundCollider.setTranslation(0, 0, 0);
  RapierEngine.world.createCollider(groundCollider);

  const topBorder = RapierEngine.collider.box({
    x: playgroundSize,
    y: 1,
    z: 0.5,
  });
  topBorder.setTranslation(0, 0, -playgroundSize);
  RapierEngine.world.createCollider(topBorder);

  const botBorder = RapierEngine.collider.box({ x: 100, y: 1, z: 0.5 });
  botBorder.setTranslation(0, 0, playgroundSize);
  RapierEngine.world.createCollider(botBorder);

  const leftBorder = RapierEngine.collider.box({ x: 0.5, y: 1, z: 100 });
  leftBorder.setTranslation(playgroundSize, 0, 0);
  RapierEngine.world.createCollider(leftBorder);

  const rightBorder = RapierEngine.collider.box({ x: 0.5, y: 1, z: 100 });
  rightBorder.setTranslation(-playgroundSize, 0, 0);
  RapierEngine.world.createCollider(rightBorder);

  const ground = new Mesh(planeGeo, shadowMaterial);
  ground.scale.addScalar(10);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.setY(0);
  ground.material.transparent = true;
  ground.material.opacity = 0.5;

  // Lightset
  const ambient = new AmbientLight("white", 1);
  const directional = new DirectionalLight("white", 1);

  directional.position.set(10, 20, 2);
  directional.castShadow = true;
  directional.shadow.mapSize.set(1024, 1024);
  directional.shadow.camera.top = 50;
  directional.shadow.camera.bottom = -50;
  directional.shadow.camera.left = -50;
  directional.shadow.camera.right = 50;
  directional.shadow.camera.near = 0.1;
  directional.shadow.camera.far = 400;
  directional.shadow.bias = 0.001;

  // Set default scene

  const zeroVector = new Vector3(0, 0, 0);
  state.camera.position.set(0, 50, 20);
  state.camera.lookAt(zeroVector);
  state.scene.add(ground);
  state.scene.add(ambient);
  state.scene.add(directional);
  state.scene.add(RapierEngine.debugMesh);

  const uiContainer: HTMLElement = document.getElementById("ui") as HTMLElement;
  let sleepingWave: number | undefined;

  const onPause = (e: { code: string; repeated: boolean }) => {
    if (e.code === "Space" && !e.repeated) {
      stateMachine.setActiveState(
        stateMachine.active?.name === "playing" ? "paused" : "playing",
      );
    }
  };

  const onShowWaveEvent = () => {
    const waveInfo = document.getElementById("wave-info");

    if (waveInfo) {
      if (sleepingWave) {
        clearTimeout(sleepingWave);
        waveInfo.classList.remove("slide-down");
        waveInfo.classList.add("slide-up");
        waveInfo.style.animationDuration = "0.2s";
        sleepingWave = undefined;
      } else {
        waveInfo.classList.remove("slide-down");
        waveInfo.classList.remove("slide-up");
      }

      // First sleep to make sure classList is removed
      setTimeout(() => {
        waveInfo.classList.remove("slide-up");
        waveInfo.classList.add("slide-down");
        sleepingWave = setTimeout(() => {
          waveInfo.classList.remove("slide-down");
          waveInfo.classList.add("slide-up");
        }, 4000);
      }, 100);
    }
  };

  // Basic finite state machine
  const IDLE_STATE: State = {
    name: "idle",
    enter() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.appendChild(screens.idle);
      idleScreenLogic(proxy);
    },
    exit() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.removeChild(screens.idle);
    },
  };
  const OPTIONS_STATE: State = {
    name: "options",
    enter() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.appendChild(screens.options);
      optionsScreenLogic(proxy);
    },
    exit() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.removeChild(screens.options);
    },
  };
  const PAUSED_STATE: State = {
    name: "paused",
    enter() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.appendChild(screens.pause);
    },
    exit() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.removeChild(screens.pause);
    },
  };
  const PLAYING_STATE: State = {
    name: "playing",
    enter() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.appendChild(screens.playing);
      playingScreenLogic(proxy, world);

      screens.playing.addEventListener("show-wave", onShowWaveEvent);

      Input.keyboard.on("down", onPause);

      screens.playing.dispatchEvent(showWaveEvent);
    },
    exit() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.removeChild(screens.playing);
      screens.playing.removeEventListener("show-wave", onShowWaveEvent);
    },
  };
  const FINISHED_STATE: State = {
    name: "finish",
    enter() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      Input.keyboard.off("down", onPause);
      uiContainer.appendChild(screens.finish);
      finishScreenLogic(proxy);
    },
    exit() {
      const screens = proxy.getComponent<LoadedUIElements>("screens");
      if (!screens) return;
      uiContainer.removeChild(screens.finish);
    },
  };

  // Hide debug mesh
  RapierEngine.debugMesh.visible = false;

  const stateMachine = new FiniteState();
  stateMachine.register(IDLE_STATE);
  stateMachine.register(OPTIONS_STATE);
  stateMachine.register(PAUSED_STATE);
  stateMachine.register(PLAYING_STATE);
  stateMachine.register(FINISHED_STATE);

  proxy.addComponent("isEngine", true);
  proxy.addComponent("gl", state);
  proxy.addComponent("state", stateMachine);

  return proxy;
}
