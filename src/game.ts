import { Time, World } from "@jael-ecs/core";
import type { GLState } from "./mount3";
import RapierEngine from "./helpers/rapier";
import { Engine } from "./entities/Engine";
import GameEngine from "./systems/engineSystem";
import EnemyAI from "./systems/enemySystem";
import PlayerController from "./systems/playerController";
import WaveSystem from "./systems/waveSystem";
import { FiniteState, type State } from "./helpers/state";
import {
  GLTFLoader,
  SkeletonUtils,
  type GLTF,
} from "three/examples/jsm/Addons.js";
import Player from "./entities/Player";
import { DefaultLoadingManager } from "three";
import FileLoader from "./helpers/FileLoader";

const gltfLoader = new GLTFLoader();
const fileLoader = new FileLoader<Document>();

const getModelPath = (model: string) => `./models/${model}.gltf`;
const getUIPath = (ui: string) => `./ui/${ui}.html`;

export type LoadedModels = { [k: string]: GLTF };
export type LoadedUIElements = { [k: string]: string };

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
  const screens = ["StartScreen", "PauseScreen", "FinishScreen"];
  let loaded_screens: LoadedUIElements = {};

  for (let ui of screens) {
    const data = await loadUI(ui);
    loaded_screens[ui] = data.body.innerHTML;
  }

  return loaded_screens;
}

export function mountExperience(state: GLState) {
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
      ${Math.floor((loaded / total) * 100)}%
    <div>`;
  };

  promise.then(([assets, screens]: [LoadedModels, LoadedUIElements]) => {
    engine.add("assets", assets);
    engine.add("screens", screens);

    uiContainer.innerHTML = screens.StartScreen;

    const machine = engine.get<FiniteState>("state");

    machine.on("change", (prev: State | undefined) => {
      if (prev) {
        if (["idle", "paused"].includes(prev.name)) {
          uiContainer.innerHTML = "";
        }
        if (prev.name === "start") {
          if (machine.active?.name === "paused") {
            uiContainer.innerHTML = screens.PauseScreen;
          } else {
            uiContainer.innerHTML = screens.FinishScreen;
          }
        }
      }
    });

    // Create Player Entity
    Player(world);
    world.addSystem(GameEngine(world));
    world.addSystem(PlayerController(world));
    world.addSystem(EnemyAI(world));
    world.addSystem(WaveSystem(world));

    Time.on("update", () => {
      if (engine.get<FiniteState>("state").active?.name !== "start") return;
      RapierEngine.step();
      world.update();
    });
  });
}
