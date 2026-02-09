import type { World, Entity } from "@jael-ecs/core";
import { Group, Vector3 } from "three";
import { createDynamicBox } from "../utils";
import { type LoadedModels } from "../game";

export default function Player(world: World): Entity {
  const engine = world.include("isEngine").entities[0];
  const prefab = world.getPrefab("player");
  if (!prefab) {
    const gunPoint = new Vector3();
    const model = engine.get<LoadedModels>("assets").Character_Soldier;

    const indexFinger = model.scene.getObjectByProperty("name", "Index1R");

    // Hide weapons but leave knife model
    indexFinger?.children.forEach((child) => {
      if (child.isObject3D && child.name !== "Pistol") {
        child.visible = false;
      }
      if (child.name === "Pistol") {
        child.getWorldPosition(gunPoint);
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
      gunPoint: gunPoint,
      velocity: new Vector3(),
      health: { current: 100 },
      isPlayer: true,
    };

    world.createPrefab("player", playerSchema);
  }

  const playerId = world.instantiate("player") as number;
  const player = world.getEntity(playerId) as Entity;
  const phyInfo = createDynamicBox(new Vector3(1, 1, 1));
  player.get<Group>("transform").position.set(0, 0.5, 0);
  phyInfo.rb.lockRotations(true, true);
  phyInfo.rb.setEnabledRotations(false, true, false, true);
  player.add("rigidbody", phyInfo.rb);
  player.add("collider", phyInfo.col);

  return player;
}
