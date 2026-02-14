import {
  ActiveCollisionTypes,
  ActiveEvents,
  type Collider,
  type RigidBody,
} from "@dimforge/rapier3d";
import type { Entity, World } from "@jael-ecs/core";
import RapierEngine from "./helpers/rapier";
import type { AnimationAction, Vector2 } from "three";
import { FiniteState, type AnimationState } from "./helpers/state";

export const PRIORITY_LIST = Object.freeze({
  RENDER: 0,
  PHYSICS: 1,
  REST: 2,
});

type ReturnedPhy = {
  rb: RigidBody & { onCollisionStart: Function; onCollisionEnd: Function };
  col: Collider;
};

export function onStateEnter(
  actions: { [k: string]: AnimationAction },
  name: keyof typeof actions,
): (_prev: AnimationState | undefined, _machine: FiniteState) => void {
  return (_prev: AnimationState | undefined, _machine: FiniteState) => {
    if (name === "Idle_A") {
      actions.Ranged_Bow_Aiming_Idle?.reset()
        .setEffectiveWeight(1)
        .fadeIn(0.25);
    } else {
      actions.Ranged_Bow_Aiming_Idle?.fadeOut(0.25);
    }

    actions[name]?.reset().setEffectiveWeight(1).fadeIn(0.25);
  };
}

export function onStateExit(_prev: AnimationState) {
  _prev.action.fadeOut(0.25);
}

export function addState(
  actions: { [k: string]: AnimationAction },
  keyName: string,
  actionName: string,
): AnimationState {
  const STATE: AnimationState = {
    name: keyName,
    action: actions[actionName],
    enter: onStateEnter(actions, actionName),
    exit: onStateExit,
  };
  return STATE;
}

export function isGameActive(engine: Entity): boolean {
  if (!engine.get("isEngine")) return false;
  const machine = engine.get<FiniteState>("state");

  return Boolean(
    machine.active?.name &&
    !["idle", "paused", "finish"].includes(machine.active?.name),
  );
}

export function createDynamicBox(size: Vector2): ReturnedPhy {
  const rb = RapierEngine.world.createRigidBody(
    RapierEngine.rigidbody.dynamic(),
  ) as RigidBody & { onCollisionStart: Function; onCollisionEnd: Function };
  const col = RapierEngine.world.createCollider(
    RapierEngine.collider
      .capsule(size.y, size.x)
      .setTranslation(0, size.y * 3, 0),
    rb,
  );
  col.setActiveEvents(ActiveEvents.COLLISION_EVENTS);
  col.setActiveCollisionTypes(ActiveCollisionTypes.ALL);

  return { rb, col };
}

export function destroyEntityWithCollider(
  entityId: number,
  world: World,
): boolean {
  if (world.exist(entityId)) {
    const proxy = world.getEntity(entityId);
    if (proxy) {
      const rb = proxy.get<RigidBody>("rigidbody");
      const col = proxy.get<Collider>("collider");
      if (rb) {
        RapierEngine.world.removeRigidBody(rb);
      }
      if (col) {
        RapierEngine.world.removeCollider(col, true);
      }
      world.destroy(entityId);
    }
    return true;
  }
  return false;
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
