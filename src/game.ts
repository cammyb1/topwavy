import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./helpers/rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import WaveSystem from "./systems/waveSystem";
import { FiniteState } from "./helpers/state";
import {
  GLTFLoader,
  SkeletonUtils,
  type GLTF,
} from "three/examples/jsm/Addons.js";
import { AnimationClip, Color, DefaultLoadingManager } from "three";
import FileLoader from "./helpers/FileLoader";
import CollisionSystem from "./systems/collisionSystem";
import { isGameActive } from "./utils";
import CameraSystem from "./systems/cameraSystem";

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
export type LoadedUIElements = { [k: string]: HTMLDivElement };
export type LoadedAssets = {
  loaded_models: LoadedModels;
  loaded_animations: LoadedAnimations;
};

const loadUI = async (path: string) =>
  await fileLoader
    .setResponseType("document")
    .setMimeType("text/html")
    .loadAsync(getPublicPath("ui", `${path}.html`));

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
    start: "StartScreen",
    pause: "PauseScreen",
    finish: "FinishScreen",
    options: "OptionsScreen",
    wave_info: "WaveInfo",
  };
  let loaded_screens: LoadedUIElements = {};

  for (let ui in screens) {
    const data = await loadUI(screens[ui]);

    const dom = document.createElement("div");
    if (screens[ui].includes("Screen")) {
      dom.className = "full-screen";
    }

    dom.innerHTML = data.body.innerHTML;

    loaded_screens[ui] = dom;
  }

  return loaded_screens;
}

export function mountExperience(state: GLState) {
  // Default bg color
  state.scene.background = new Color("grey");

  const world = new World();

  world.prefabManager.addDetector((value: any) => {
    if (value.isObject3D && value.getObjectByProperty("isSkinnedMesh", true))
      return "skeletal";
    if (value.clone !== undefined) return "clonable";
    return null;
  });
  world.prefabManager.addCloner("clonable", (v) => v.clone());
  world.prefabManager.addCloner("skeletal", (v) => SkeletonUtils.clone(v));

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
    engine.add("assets", assets);
    engine.add("screens", screens);
    const machine = engine.get<FiniteState>("state");

    let sleepingWave: number | undefined;

    screens.wave_info.addEventListener("show", () => {
      const waveInfo = screens.wave_info.getElementsByTagName("div")[0];

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
    });

    machine.setActiveState("idle");

    world.addSystem(GameEngine(world));
    world.addSystem(CollisionSystem(world));
    world.addSystem(PlayerController(world));
    world.addSystem(CameraSystem(world));
    world.addSystem(EnemyAI(world));
    world.addSystem(WaveSystem(world));

    Time.on("update", () => {
      if (!isGameActive(engine)) return;
      RapierEngine.step();
      world.update();
    });
  });
}
