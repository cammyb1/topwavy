import { World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./helpers/rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import WaveSystem from "./systems/waveSystem";
import { FiniteState } from "./helpers/state";
import { GLTFLoader, type GLTF } from "three/examples/jsm/Addons.js";
import { AnimationClip, Color, DefaultLoadingManager } from "three";
import FileLoader from "./helpers/FileLoader";
import CollisionSystem from "./systems/collisionSystem";
import { isGameActive, Time } from "./utils";
import CameraSystem from "./systems/cameraSystem";
import { Input } from "@jael-ecs/core";

const gltfLoader = new GLTFLoader();
const fileLoader = new FileLoader<Document>();

const getPublicPath = (folder: string, file: string) => {
  const splittedFile = file.split(".");
  const fileName: string = splittedFile[0];
  const extension: string = splittedFile[1];
  return `./${folder}/${fileName}.${extension}`;
};

export type LoadedModels = { [k: string]: GLTF };
export type LoadedAnimations = { [k: string]: AnimationClip[] };
export type LoadedUIElements = {
  [k: string]: HTMLDivElement;
};

export type LoadedAssets = {
  loaded_models: LoadedModels;
  loaded_animations: LoadedAnimations;
};

const loadUI = async (path: string) =>
  await fileLoader
    .setResponseType("document")
    .setMimeType("text/html")
    .loadAsync(getPublicPath("ui", path));

const loadModel = async (model: string) =>
  await gltfLoader.loadAsync(getPublicPath("models", model));

const loadAnimation = async (animation: string) =>
  await gltfLoader.loadAsync(getPublicPath("animations", animation));

async function preloadAssets(): Promise<LoadedAssets> {
  const models: { [k: string]: string } = {
    ranger: "Ranger.glb",
    arrow: "arrow_bow.glb",
    bow: "bow_withString.glb",
    arrow_bundle: "arrow_bow_bundle.glb",
    skeleton_minion: "Skeleton_Minion.glb",
    skeleton_warrior: "Skeleton_Warrior.glb",
    skeleton_blade: "Skeleton_Blade.gltf",
  };
  const animations: { [k: string]: string } = {
    general: "Rig_Medium_General.glb",
    basic: "Rig_Medium_MovementBasic.glb",
    advanced: "Rig_Medium_MovementAdvanced.glb",
    melee: "Rig_Medium_CombatMelee.glb",
    ranged: "Rig_Medium_CombatRanged.glb",
  };

  const loaded_models: LoadedModels = {};
  const loaded_animations: LoadedAnimations = {};

  for (let model in models) {
    const data = await loadModel(models[model]);
    loaded_models[model] = data;
  }

  for (let animation in animations) {
    const data = await loadAnimation(animations[animation]);
    loaded_animations[animation] = data.animations;
  }

  return { loaded_models, loaded_animations };
}

async function preloadUI(): Promise<LoadedUIElements> {
  const screens: { [k: string]: string } = {
    idle: "IdleScreen.html",
    playing: "PlayingScreen.html",
    pause: "PauseScreen.html",
    finish: "FinishScreen.html",
    options: "OptionsScreen.html",
  };
  let loaded_screens: LoadedUIElements = {};

  for (let ui in screens) {
    const data = await loadUI(screens[ui]);

    const dom = document.createElement("div");
    if (screens[ui].includes("Screen")) {
      dom.classList.add("full-screen");

      if (ui === "playing") {
        dom.classList.add("translucent");
      }
    }

    dom.innerHTML = data.body.innerHTML;

    loaded_screens[ui] = dom;
  }

  return loaded_screens;
}

export function mountExperience(state: GLState) {
  // Default bg color
  state.scene.background = new Color("#423525");

  const world = new World();

  let systems: Function[] = [];
  const engine = Engine(state, world);
  const uiContainer: HTMLElement = document.getElementById("ui") as HTMLElement;
  const loader: HTMLElement = document.getElementById("loader") as HTMLElement;

  const promise = Promise.all([preloadAssets(), preloadUI()]);

  DefaultLoadingManager.onProgress = (_url, loaded, total) => {
    loader.innerHTML = `<div>
      Loading....${Math.floor((loaded / total) * 100)}%
    <div>`;
  };

  promise.then(([assets, screens]: [LoadedAssets, LoadedUIElements]) => {
    uiContainer.removeChild(loader);

    engine.addComponent("assets", assets);
    engine.addComponent("screens", screens);
    const machine = engine.getComponent<FiniteState>("state");

    machine?.setActiveState("idle");

    systems = [
      GameEngine(world),
      CollisionSystem(world),
      PlayerController(world),
      CameraSystem(world),
      EnemyAI(world),
      WaveSystem(world),
    ];

    Input.connect();

    Time.on("update", () => {
      if (!isGameActive(engine)) return;
      systems.forEach((system) => system());
      RapierEngine.step();
    });
  });
}
