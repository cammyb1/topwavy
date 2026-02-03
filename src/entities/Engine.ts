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
import RapierEngine from "../Rapier";
import type { Entity } from "@jael-ecs/core";

export interface WaveConfig {
  current: number;
  maxWave: number;
  enemiesPerWave: number;
  sleepTime: number;
}

export function Engine(state: GLState, world: World): Entity {
  const engineId = world.create();
  const engineProxy: Entity = world.getEntity(engineId) as Entity;

  // Ground shadow;
  const planeGeo = new PlaneGeometry(10, 10, 10);
  const shadowMaterial = new ShadowMaterial();

  // GroundCollider
  const groundCollider = RapierEngine.collider.box({ x: 100, y: 0, z: 100 });
  groundCollider.setTranslation(0, -1, 0);
  RapierEngine.world.createCollider(groundCollider);

  const ground = new Mesh(planeGeo, shadowMaterial);
  ground.scale.addScalar(10);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.setY(-0.5);
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

  state.camera.position.set(0, 50, 20);
  state.camera.lookAt(new Vector3(0, 0, 0));
  state.scene.add(ground);
  state.scene.add(ambient);
  state.scene.add(directional);
  state.scene.add(RapierEngine.debugMesh);

  engineProxy.add("isEngine", true);
  engineProxy.add("gl", state);
  engineProxy.add("waveConfig", {
    current: 1,
    maxWave: 2,
    enemiesPerWave: 2,
    sleepTime: 0.5,
  } as WaveConfig);

  return engineProxy;
}
