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
import { Color, DefaultLoadingManager } from "three";
import FileLoader from "./helpers/FileLoader";
import CollisionSystem from "./systems/collisionSystem";
import { isGameActive, sleep } from "./utils";

const gltfLoader = new GLTFLoader();
const fileLoader = new FileLoader<Document>();

const getModelPath = (model: string) => `./models/${model}.gltf`;
const getUIPath = (ui: string) => `./ui/${ui}.html`;

export type LoadedModels = { [k: string]: GLTF };
export type LoadedUIElements = { [k: string]: HTMLDivElement };

const loadUI = async (path: string) =>
  await fileLoader
    .setResponseType("document")
    .setMimeType("text/html")
    .loadAsync(getUIPath(path));

const loadModel = async (model: string) =>
  await gltfLoader.loadAsync(getModelPath(model));

async function preloadModels(): Promise<LoadedModels> {
  const models = ["Character_Soldier", "Character_Enemy", "Character_Hazmat"];
  let loaded_models: LoadedModels = {};

  for (let model of models) {
    const data = await loadModel(model);
    loaded_models[model] = data;
  }

  return loaded_models;
}

async function preloadUI(): Promise<LoadedUIElements> {
  const screens = [
    "StartScreen",
    "PauseScreen",
    "FinishScreen",
    "OptionsScreen",
    "WaveInfo",
  ];
  let loaded_screens: LoadedUIElements = {};

  for (let ui of screens) {
    const data = await loadUI(ui);

    const dom = document.createElement("div");
    if (ui.includes("Screen")) {
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

  const promise = Promise.all([preloadModels(), preloadUI()]);

  DefaultLoadingManager.onProgress = (_url, loaded, total) => {
    loader.innerHTML = `<div>
      Loading....${Math.floor((loaded / total) * 100)}%
    <div>`;
  };

  promise.then(([assets, screens]: [LoadedModels, LoadedUIElements]) => {
    uiContainer.removeChild(loader);
    engine.add("assets", assets);
    engine.add("screens", screens);
    const machine = engine.get<FiniteState>("state");

    screens.WaveInfo.addEventListener("show", () => {
      const waveInfo = screens.WaveInfo.getElementsByTagName("div")[0];

      waveInfo.classList.remove("slide-down");
      waveInfo.classList.remove("slide-up");

      // First sleep to make sure classList is removed
      sleep(100).then(() => {
        waveInfo.classList.add("slide-down");
        sleep(4000).then(() => {
          if (waveInfo.classList.contains("slide-up")) return;
          waveInfo.classList.remove("slide-down");
          waveInfo.classList.add("slide-up");
        });
      });
    });

    machine.setActiveState("idle");

    world.addSystem(GameEngine(world));
    world.addSystem(CollisionSystem(world));
    world.addSystem(PlayerController(world));
    world.addSystem(EnemyAI(world));
    world.addSystem(WaveSystem(world));

    Time.on("update", () => {
      if (!isGameActive(engine)) return;
      RapierEngine.step();
      world.update();
    });
  });
}
