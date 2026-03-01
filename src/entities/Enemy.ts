import type { World, Entity } from "@jael-ecs/core";
import {
  AnimationAction,
  AnimationClip,
  AnimationMixer,
  Group,
  Vector2,
  Vector3,
} from "three";
import { addState, createDynamicBox } from "../utils";
import type { LoadedAssets } from "../game";
import { type AnimationState, FiniteState } from "../helpers/state";
const enemySize = new Vector2(0.5, 0.5);

export default function Enemy(world: World, startingPos?: Vector3): Entity {
  const player = world.include("isPlayer").entities[0];
  const engine = world.include("isEngine").entities[0];
  const prefab = world.getPrefab("enemy");
  const assets = engine.getComponent<LoadedAssets>("assets") as LoadedAssets;

  const model = assets.loaded_models.skeleton_minion;
  const blade = assets.loaded_models.skeleton_blade;

  const generalAnims = assets.loaded_animations.general;
  const basicAnims = assets.loaded_animations.basic;
  const meleeAnims = assets.loaded_animations.melee;

  if (!prefab) {
    model.scene.getObjectByName("handslotr")?.add(blade.scene);

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
      damage: 6,
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

  const transform = enemyProxy.getComponent<Group>("transform") as Group;

  phyInfo.rb.setTranslation(transform.position, true);
  phyInfo.rb.lockRotations(true, true);
  phyInfo.rb.setLinearDamping(0.25);
  phyInfo.col.setFriction(0.7);
  phyInfo.col.setTranslation(transform.position);

  const defaultAnim = "idle";
  const mixer = new AnimationMixer(transform);
  const actions: { [k: string]: AnimationAction } = {};
  const actionsClips: AnimationClip[] = ([] as AnimationClip[]).concat(
    generalAnims,
    basicAnims,
    meleeAnims,
  );

  actionsClips.forEach((clip) => {
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;
    action.setEffectiveWeight(0);
    action.play();
  });

  const machine = new FiniteState<AnimationState>();
  machine.register(addState(actions, "idle", "Idle_A"));
  machine.register(addState(actions, "hit", "Hit_A"));
  machine.register(addState(actions, "walk", "Walking_A"));
  machine.register(addState(actions, "run", "Running_A"));
  machine.register(
    addState(actions, "punch", "Melee_1H_Attack_Slice_Diagonal"),
  );

  machine.setActiveState(defaultAnim);

  if (startingPos) {
    transform.position.copy(startingPos);
    phyInfo.rb.setTranslation(startingPos, true);
  }

  phyInfo.rb.enableCcd(true);

  enemyProxy.addComponent("target", player);
  enemyProxy.addComponent("rigidbody", phyInfo.rb);
  enemyProxy.addComponent("collider", phyInfo.col);
  enemyProxy.addComponent("mixer", mixer);
  enemyProxy.addComponent("machine", machine);

  return world.getEntity(enemyId) as Entity;
}
