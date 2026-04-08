import { type World, type Entity } from "@jael-ecs/core";
import type { GLState } from "../mount3";
import { AnimationMixer, type Object3D, type Group, Vector3 } from "three";
import { destroyEntityWithCollider, randomIn3DCircle, Time } from "../utils";
import { FiniteState, type State } from "../helpers/state";
import { Collider, RigidBody } from "@dimforge/rapier3d";
import ArrowBundle from "../entities/ArrowBundle";
import type {
  HealthComponent,
  LifetimeComponent,
  TransformComponent,
} from "../components";

export default function GameEngine(world: World) {
  const renderables = world.include("transform");
  const lifeTimers = world.include("lifetime");
  const movables = world.include("transform", "rigidbody", "velocity");
  const healthEs = world.include("health");
  const mixers = world.include("mixer");
  const engine = world.include("isEngine").entities[0];
  const playerQuery = world.include("isPlayer");
  const hiddenEntities = world.include("hidden", "transform");
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
    const playerPos = player.getComponent<Group>("transform")?.position;

    if (!playerPos) return;

    const startPos = randomIn3DCircle({
      radius: 10,
      center: [playerPos.x, playerPos.z],
    });
    let bundle: Entity;

    if (bundlePool.length < maxBundles) {
      bundle = ArrowBundle(world, startPos);
    } else {
      bundle = bundlePool.splice(0, 1)[0] as Entity;
      const transform = bundle.getComponent<Group>("transform") as Group;
      const rb = bundle.getComponent<RigidBody>("rigidbody");
      rb?.setTranslation(startPos, true);
      transform.position.copy(startPos);
      bundle.removeComponent("hidden");
    }

    bundlePool.push(bundle);
  }

  playerQuery.on("removed", () => {
    engine.getComponent<FiniteState>("state")?.setActiveState("finish");
  });

  const state = engine.getComponent<GLState>("gl") as GLState;

  const gameMachine = engine.getComponent<FiniteState>("state");

  gameMachine?.on("change", (prev: State | undefined) => {
    if (!prev) return;
    if (gameMachine.active?.name === "finish") {
      if (activeBundles > 0) {
        activeBundles = 0;
        bundlePool.forEach((bundle) => {
          bundle.addComponent("hidden", true);
        });
      }
    }
  });

  // Rendering
  renderables.entities.forEach((entity: Entity) => {
    state.scene.add(entity.getComponent("transform") as Object3D);
  });

  hiddenEntities.on("added", (entityId) => {
    const transform = world.getComponent<Object3D>(entityId, "transform");
    const col = world.getComponent<Collider>(entityId, "collider");
    col?.setEnabled(false);
    if (transform) {
      transform.visible = false;
    }
  });

  hiddenEntities.on("removed", (entityId) => {
    const transform = world.getComponent<Object3D>(entityId, "transform");
    const col = world.getComponent<Collider>(entityId, "collider");
    col?.setEnabled(true);
    if (transform) {
      transform.visible = true;
    }
  });

  renderables.on("added", (entityId) => {
    const transform = world.getComponent<Object3D>(
      entityId,
      "transform",
    ) as Object3D;
    state.scene.add(transform);
  });

  renderables.on("removed", (entityId) => {
    const transform = world.getComponent<Object3D>(
      entityId,
      "transform",
    ) as Object3D;
    state.scene.remove(transform);
  });

  return () => {
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
      const lifetime = entity.getComponent<LifetimeComponent>("lifetime")!;
      lifetime.current -= lifetime.decreaseSpeed * Time.delta;
      if (lifetime.current < 0) {
        destroyEntityWithCollider(entity.id, world);
      }
    });

    // Health
    healthEs.entities.forEach((entity: Entity) => {
      const health = entity.getComponent<HealthComponent>("health")!;
      if (health.current <= 0) {
        destroyEntityWithCollider(entity.id, world);
      }
    });

    mixers.entities.forEach((entity: Entity) => {
      const mixer = entity.getComponent<AnimationMixer>(
        "mixer",
      ) as AnimationMixer;
      mixer.update(Time.delta);
    });

    // Movement sync with mesh and physics
    movables.entities.forEach((entity: Entity) => {
      const transform = entity.getComponent<TransformComponent>("transform")!;
      const rb = entity.getComponent<RigidBody>("rigidbody")!;
      const velocity = entity.getComponent<Vector3>("velocity")!;
      rb?.setRotation(transform.quaternion, true);
      rb?.setLinvel(velocity, true);
      transform.position.copy(rb.translation());
    });
  };
}
