import type { World, Entity } from "@jael-ecs/core";
import {
  AnimationAction,
  AnimationMixer,
  Group,
  Vector3,
  Vector2,
} from "three";
import { createDynamicBox } from "../utils";
import { type LoadedModels } from "../game";
import { FiniteState, type AnimationState } from "../helpers/state";

export default function Player(world: World): Entity {
  const engine = world.include("isEngine").entities[0];
  const model = engine.get<LoadedModels>("assets").Character_Soldier;
  const prefab = world.getPrefab("player");

  if (!prefab) {
    const indexFinger = model.scene.getObjectByProperty("name", "Index1R");

    // Hide weapons but leave knife model
    indexFinger?.children.forEach((child) => {
      if (child.isObject3D && child.name !== "Pistol") {
        child.visible = false;
      }
    });

    model.scene.traverse((node) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const playerSchema = {
      transform: model.scene,
      velocity: new Vector3(),
      health: { current: 100 },
      isPlayer: true,
    };

    world.createPrefab("player", playerSchema);
  }

  const playerId = world.instantiate("player") as number;
  const player: Entity = world.getEntity(playerId) as Entity;
  const phyInfo = createDynamicBox(new Vector2(0.5, 0.5));
  const transform: Group = player.get<Group>("transform");
  transform.position.set(0, 0, 0);
  phyInfo.rb.setTranslation(transform.position, true);
  phyInfo.rb.lockRotations(true, true);
  phyInfo.rb.setLinearDamping(0.25);
  phyInfo.col.setFriction(0.7);

  // Animation States
  const defaultAnim = "idle";
  const mixer = new AnimationMixer(transform);
  const actions: { [k: string]: AnimationAction } = {};

  model.animations.forEach((clip) => {
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;
    action.setEffectiveWeight(0);
    action.play();
  });

  function onStateEnter(
    name: keyof typeof actions,
  ): (_prev: AnimationState | undefined, _machine: FiniteState) => void {
    return (_prev: AnimationState | undefined, _machine: FiniteState) => {
      if (_prev && _prev.action !== actions[name]) {
        _prev.action.fadeOut(0.25);
      }

      actions[name].reset().setEffectiveWeight(1).fadeIn(0.25);
    };
  }

  const IDLE_STATE: AnimationState = {
    name: "idle",
    action: actions.Idle,
    enter: onStateEnter("Idle"),
  };

  const IDLE_SHOOT_STATE: AnimationState = {
    name: "idle-shoot",
    action: actions.Idle_Shoot,
    enter: onStateEnter("Idle_Shoot"),
  };

  const HIT_STATE: AnimationState = {
    name: "hit",
    action: actions.HitReact,
    enter: onStateEnter("HitReact"),
  };

  const WALK_STATE: AnimationState = {
    name: "walk",
    action: actions.Walk,
    enter: onStateEnter("Walk"),
  };

  const WALK_SHOOT_STATE: AnimationState = {
    name: "walk-shoot",
    action: actions.Walk_Shoot,
    enter: onStateEnter("Walk_Shoot"),
  };

  const RUN_STATE: AnimationState = {
    name: "run",
    action: actions.Run_Gun,
    enter: onStateEnter("Run"),
  };

  const RUN_SHOOT_STATE: AnimationState = {
    name: "run-shoot",
    action: actions.Run_Shoot,
    enter: onStateEnter("Run_Shoot"),
  };

  const machine = new FiniteState<AnimationState>();
  machine.register(IDLE_STATE);
  machine.register(IDLE_SHOOT_STATE);
  machine.register(HIT_STATE);
  machine.register(WALK_STATE);
  machine.register(WALK_SHOOT_STATE);
  machine.register(RUN_STATE);
  machine.register(RUN_SHOOT_STATE);

  machine.setActiveState(defaultAnim);

  player.add("rigidbody", phyInfo.rb);
  player.add("collider", phyInfo.col);
  player.add("mixer", mixer);
  player.add("machine", machine);

  return player;
}
