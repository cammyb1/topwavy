import { type World, type System, type Entity, Time } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import { AnimationMixer, type Mesh } from "three";
import * as RAPIER from "@dimforge/rapier3d";
import RapierEngine from "../helpers/rapier";
import { destroyEntityWithCollider, PRIORITY_LIST } from "../utils";
import { FiniteState } from "../helpers/state";

export default function GameEngine(world: World): System {
  const renderables = world.include("transform");
  const lifeTimers = world.include("lifetime");
  const movables = world.include("transform", "rigidbody", "velocity");
  const healthEs = world.include("health");
  const mixers = world.include("mixer");
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");

  // Hide debug mesh
  RapierEngine.debugMesh.visible = false;

  playerQuery.on("removed", () => {
    engine.get<FiniteState>("state").setActiveState("finish");
  });

  const state = engine.get<GLState>("gl");

  // Rendering
  renderables.entities.forEach((entity: Entity) => {
    state.scene.add(entity.get("transform"));
  });

  renderables.on("added", (entityId) => {
    const transform = world.getComponent<Mesh>(entityId, "transform");
    state.scene.add(transform);
  });
  renderables.on("removed", (entityId) => {
    const transform = world.getComponent<Mesh>(entityId, "transform");
    state.scene.remove(transform);
  });

  return {
    priority: PRIORITY_LIST.RENDER,
    update() {
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
        const rb = entity.get<RAPIER.RigidBody>("rigidbody");
        const velocity = entity.get("velocity");
        rb.setRotation(transform.quaternion, true);
        rb.setLinvel(velocity, true);
        transform.position.copy(rb.translation());
      });
    },
  };
}
