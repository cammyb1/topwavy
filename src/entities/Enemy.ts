import type { World, Entity } from "@jael-ecs/core";
import {
  AnimationAction,
  AnimationMixer,
  Group,
  Vector2,
  Vector3,
} from "three";
import { createDynamicBox } from "../utils";
import type { LoadedModels } from "../game";
import { type AnimationState, FiniteState } from "../helpers/state";
const enemySize = new Vector2(0.5, 0.5);

export default function Enemy(world: World, startingPos?: Vector3): Entity {
  const player = world.include("isPlayer").entities[0];
  const engine = world.include("isEngine").entities[0];
  const prefab = world.getPrefab("enemy");
  const model = engine.get<LoadedModels>("assets").Character_Enemy;

  if (!prefab) {
    const indexFinger = model.scene.getObjectByProperty("name", "Index1R");

    // Hide weapons but leave knife model
    indexFinger?.children.forEach((child) => {
      if (child.isObject3D && child.name !== "Knife_1") {
        child.visible = false;
      }
    });

    model.scene.traverse((node) => {
      if (node.isObject3D) {
        node.castShadow = true;
        node.receiveShadow = true;
      }
    });

    const enemySchema = {
      transform: model.scene,
      velocity: new Vector3(),
      health: { current: 100 },
      damage: 10,
      isEnemy: true,
    };

    if (startingPos) {
      enemySchema.transform.position.copy(startingPos);
    }

    world.createPrefab("enemy", enemySchema);
  }

  const enemyId = world.instantiate("enemy") as number;
  const enemyProxy = world.getEntity(enemyId) as Entity;
  const phyInfo = createDynamicBox(enemySize);

  const transform = enemyProxy.get<Group>("transform");

  phyInfo.rb.setTranslation(transform.position, true);
  phyInfo.rb.lockRotations(true, true);
  phyInfo.rb.setLinearDamping(0.25);
  phyInfo.col.setFriction(0.7);

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

  const PUNCH_STATE: AnimationState = {
    name: "punch",
    action: actions.Walk_Shoot,
    enter: onStateEnter("Walk_Shoot"),
  };

  const WALK_STATE: AnimationState = {
    name: "walk",
    action: actions.Walk,
    enter: onStateEnter("Walk"),
  };

  const RUN_STATE: AnimationState = {
    name: "run",
    action: actions.Run,
    enter: onStateEnter("Run"),
  };

  const machine = new FiniteState<AnimationState>();
  machine.register(IDLE_STATE);
  machine.register(PUNCH_STATE);
  machine.register(WALK_STATE);
  machine.register(RUN_STATE);

  machine.setActiveState(defaultAnim);

  if (startingPos) {
    transform.position.copy(startingPos);
    phyInfo.rb.setTranslation(startingPos, true);
  }

  phyInfo.rb.enableCcd(true);

  enemyProxy.add("target", player);
  enemyProxy.add("rigidbody", phyInfo.rb);
  enemyProxy.add("collider", phyInfo.col);
  enemyProxy.add("mixer", mixer);
  enemyProxy.add("machine", machine);

  return world.getEntity(enemyId) as Entity;
}
