import { type World, type System, type Entity, Time } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import { AnimationMixer, type Object3D, type Group } from "three";
import {
  destroyEntityWithCollider,
  PRIORITY_LIST,
  randomIn3DCircle,
} from "../utils";
import { FiniteState } from "../helpers/state";
import { Collider, RigidBody } from "@dimforge/rapier3d";
import ArrowBundle from "../entities/ArrowBundle";

export default function GameEngine(world: World): System {
  const renderables = world.include("transform");
  const lifeTimers = world.include("lifetime");
  const movables = world.include("transform", "rigidbody", "velocity");
  const healthEs = world.include("health");
  const mixers = world.include("mixer");
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");
  const hiddenBundles = world.include("isBundle", "hidden");

  const bundlePool: Entity[] = [];
  const maxBundles = 4;
  const bundleSpawnRate = 2;
  let activeBundles = 0;
  let bundleSpawnTimer = 0;

  function spawnBundle() {
    if (playerQuery.size() <= 0) return;

    activeBundles += 1;
    const player = playerQuery.entities[0];
    const playerPos = player.get<Group>("transform").position;
    const startPos = randomIn3DCircle({
      radius: 10,
      center: [playerPos.x, playerPos.z],
    });
    let bundle: Entity;

    if (bundlePool.length < maxBundles) {
      bundle = ArrowBundle(world, startPos);
    } else {
      bundle = bundlePool.splice(0, 1)[0] as Entity;
      const transform = bundle.get<Group>("transform");
      const rb = bundle.get<RigidBody>("rigidbody");
      const col = bundle.get<Collider>("collider");
      col.setEnabled(true);
      rb.setTranslation(startPos, true);
      transform.position.copy(startPos);
      transform.visible = true;
      bundle.remove("hidden");
    }

    bundlePool.push(bundle);
  }

  playerQuery.on("removed", () => {
    engine.get<FiniteState>("state").setActiveState("finish");
  });

  const state = engine.get<GLState>("gl");

  // Rendering
  renderables.entities.forEach((entity: Entity) => {
    state.scene.add(entity.get("transform"));
  });

  renderables.on("added", (entityId) => {
    const transform = world.getComponent<Object3D>(entityId, "transform");
    state.scene.add(transform);
  });

  renderables.on("removed", (entityId) => {
    const transform = world.getComponent<Object3D>(entityId, "transform");
    state.scene.remove(transform);
  });

  return {
    priority: PRIORITY_LIST.RENDER,
    update() {
      if (activeBundles < maxBundles) {
        bundleSpawnTimer += Time.delta;
        if (bundleSpawnTimer > bundleSpawnRate) {
          bundleSpawnTimer = 0;
          spawnBundle();
        }
      }

      if (hiddenBundles.size() === maxBundles) {
        activeBundles = 0;
      }

      // Lifetime entities
      lifeTimers.entities.forEach((entity: Entity) => {
        const lifetime = entity.get("lifetime");
        lifetime.current -= lifetime.decreaseSpeed * Time.delta;
        if (lifetime.current < 0) {
          destroyEntityWithCollider(entity.id, world);
        }
      });

      // Health
      healthEs.entities.forEach((entity: Entity) => {
        const health = entity.get("health");
        if (health.current <= 0) {
          destroyEntityWithCollider(entity.id, world);
        }
      });

      mixers.entities.forEach((entity: Entity) => {
        const mixer = entity.get<AnimationMixer>("mixer");
        mixer.update(Time.delta);
      });

      // Movement sync with mesh and physics
      movables.entities.forEach((entity: Entity) => {
        const transform = entity.get("transform");
        const rb = entity.get<RigidBody>("rigidbody");
        const velocity = entity.get("velocity");
        rb.setRotation(transform.quaternion, true);
        rb.setLinvel(velocity, true);
        transform.position.copy(rb.translation());
      });
    },
  };
}
