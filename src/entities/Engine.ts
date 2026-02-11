import type { World } from "@jael-ecs/core";
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
import type { Entity } from "@jael-ecs/core";
import { FiniteState, type State } from "../helpers/state";
import Player from "./Player";
import { Input } from "../helpers/Input";
import { type LoadedUIElements } from "../game";
import startScreenLogic from "../ui/startScreenLogic";
import optionsScreenLogic from "../ui/optionsScreenLogic";

export const showWaveEvent = new Event("show");

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

  // Register inputs
  Input.registerMultiple({
    forward: { keys: ["KeyW", "ArrowUp"] },
    backward: { keys: ["KeyS", "ArrowDown"] },
    left: { keys: ["KeyA", "ArrowLeft"] },
    right: { keys: ["KeyD", "ArrowRight"] },
    run: { keys: ["ShiftLeft"] },
  });

  // Basic finite state machine
  const IDLE_STATE: State = {
    name: "idle",
    enter() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.appendChild(screens.StartScreen);
      startScreenLogic(proxy);
    },
    exit() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.removeChild(screens.StartScreen);
    },
  };
  const OPTIONS_STATE: State = {
    name: "options",
    enter() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.appendChild(screens.OptionsScreen);
      optionsScreenLogic(proxy);
    },
    exit() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.removeChild(screens.OptionsScreen);
    },
  };
  const PAUSED_STATE: State = {
    name: "paused",
    enter() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.appendChild(screens.OptionsScreen);
    },
    exit() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.removeChild(screens.PauseScreen);
    },
  };
  const START_STATE: State = {
    name: "start",
    enter(_prev) {
      uiContainer.innerHTML = "";

      if (_prev && _prev.name === "idle") {
        const info = proxy.get<LoadedUIElements>("screens").WaveInfo;
        uiContainer.appendChild(info);
        info.dispatchEvent(showWaveEvent);
      }

      // Enter/restart game
      state.camera.position.set(0, 50, 20);
      state.camera.lookAt(zeroVector);
      Player(world);
    },
    exit() {
      const info = proxy.get<LoadedUIElements>("screens").WaveInfo;
      uiContainer.removeChild(info);
    },
  };
  const FINISHED_STATE: State = {
    name: "finish",
    enter() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.appendChild(screens.FinishScreen);
    },
    exit() {
      const screens = proxy.get<LoadedUIElements>("screens");
      uiContainer.removeChild(screens.FinishScreen);
    },
  };

  const stateMachine = new FiniteState();
  stateMachine.register(IDLE_STATE);
  stateMachine.register(OPTIONS_STATE);
  stateMachine.register(PAUSED_STATE);
  stateMachine.register(START_STATE);
  stateMachine.register(FINISHED_STATE);

  proxy.add("isEngine", true);
  proxy.add("gl", state);
  proxy.add("state", stateMachine);

  return proxy;
}
