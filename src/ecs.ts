import { type Entity, Time, World, type System } from "@jael-ecs/core";
import {
  AmbientLight,
  BoxGeometry,
  DirectionalLight,
  Mesh,
  MeshLambertMaterial,
  PlaneGeometry,
  ShadowMaterial,
  Vector3,
} from "three";
import type { GLState } from "./mount3";

export function mountWorldECS(state: GLState) {
  const world = new World();

  // Re-use Geometries
  const boxGeometry = new BoxGeometry(1, 1, 1);
  const whiteBasicMaterial = new MeshLambertMaterial({ color: "white" });

  // Ground shadow;
  const planeGeo = new PlaneGeometry(10, 10, 10);
  const shadowMaterial = new ShadowMaterial();
  shadowMaterial.transparent = true;

  const ground = new Mesh(planeGeo, shadowMaterial);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  ground.position.setY(-0.5);

  // Lightset
  const ambient = new AmbientLight("white", 1);
  const directional = new DirectionalLight("white", 1);

  directional.position.set(10, 20, 2);
  directional.castShadow = true;

  // Set default scene

  state.camera.position.set(0, 50, 20);
  state.camera.lookAt(new Vector3(0, 0, 0));
  state.scene.add(ground);
  state.scene.add(ambient);
  state.scene.add(directional);

  // PlayerEntity
  const player: Entity = world.create();
  player.add("transform", new Mesh(boxGeometry, whiteBasicMaterial));
  player.add("isPlayer", true);
  player.get("transform").castShadow = true;

  function PlayerController(): System {
    const player = world.include("isPlayer");

    return {
      priority: 1,
      update() {},
    };
  }

  function RenderSystem(): System {
    const renderables = world.include("transform");

    return {
      priority: 0,
      init() {
        renderables.entities.forEach((entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        renderables.on("added", (entity: Entity) => {
          state.scene.add(entity.get("transform"));
        });
        renderables.on("removed", (entity: Entity) => {
          state.scene.remove(entity.get("transform"));
        });
      },
      update() {},
    };
  }

  world.addSystem(RenderSystem());

  Time.on("update", () => {
    world.update();
  });
}
