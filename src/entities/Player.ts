import {
  AnimationAction,
  AnimationMixer,
  Group,
  Vector3,
  Vector2,
  AnimationClip,
} from "three";
import { addState, createDynamicBox } from "../utils";
import { type LoadedAssets } from "../game";
import { FiniteState, type AnimationState } from "../helpers/state";
import { Input, World, type Entity } from "@jael-ecs/core";

export default function Player(world: World): Entity {
  const engine = world.include("isEngine").entities[0];
  const assets = engine.getComponent<LoadedAssets>("assets") as LoadedAssets;
  const model = assets.loaded_models.ranger;
  const bow = assets.loaded_models.bow;

  const generalAnims = assets.loaded_animations.general;
  const basicAnims = assets.loaded_animations.basic;
  const rangedAnims = assets.loaded_animations.ranged;
  const prefab = world.getPrefab("player");

  if (!prefab) {
    model.scene.getObjectByName("handslotl")?.add(bow.scene);
    bow.scene.rotateY(-Math.PI);
    bow.scene.rotateX(-Math.PI);

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
  const transform: Group = player.getComponent<Group>("transform") as Group;
  transform.position.set(0, 0, 0);
  phyInfo.rb.setTranslation(transform.position, true);
  phyInfo.rb.lockRotations(true, true);
  phyInfo.rb.setLinearDamping(0.25);
  phyInfo.col.setTranslation(transform.position);
  phyInfo.col.setFriction(0.7);

  // Animation States
  const defaultAnim = "idle";
  const mixer = new AnimationMixer(transform);
  const actions: { [k: string]: AnimationAction } = {};
  const actionsClips: AnimationClip[] = ([] as AnimationClip[]).concat(
    generalAnims,
    basicAnims,
    rangedAnims,
  );

  actionsClips.forEach((clip) => {
    const action = mixer.clipAction(clip);
    actions[clip.name] = action;
    action.setEffectiveWeight(0);
    action.play();
  });

  const IdleAction = "Ranged_Bow_Idle";
  const WalkAction = "Walking_B";
  const RunAction = "Running_A";
  const HitAction = "Hit_A";
  const DrawBowAction = "Ranged_Bow_Draw";
  const ReleaseBowAction = "Ranged_Bow_Release";

  // Register inputs
  Input.keyboard.registerMultiple({
    forward: { keys: ["KeyW", "ArrowUp"] },
    backward: { keys: ["KeyS", "ArrowDown"] },
    left: { keys: ["KeyA", "ArrowLeft"] },
    right: { keys: ["KeyD", "ArrowRight"] },
    run: { keys: ["ShiftLeft"] },
  });

  const machine = new FiniteState<AnimationState>();
  machine.register(addState(actions, "idle", IdleAction));
  machine.register(addState(actions, "walk", WalkAction));
  machine.register(addState(actions, "run", RunAction));
  machine.register(addState(actions, "hit", HitAction));
  machine.register(addState(actions, "draw", DrawBowAction));
  machine.register(addState(actions, "release", ReleaseBowAction));

  machine.setActiveState(defaultAnim);

  player.addComponent("rigidbody", phyInfo.rb);
  player.addComponent("collider", phyInfo.col);
  player.addComponent("mixer", mixer);
  player.addComponent("machine", machine);

  return player;
}
