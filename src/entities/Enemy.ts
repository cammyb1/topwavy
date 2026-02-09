import type { World, Entity } from "@jael-ecs/core";
import { Group, Vector3 } from "three";
import { createDynamicBox } from "../utils";
import type { LoadedModels } from "../game";
const enemySize = new Vector3(1.5, 1.5, 1.5);

export default function Enemy(world: World, startingPos?: Vector3): Entity {
  const player = world.include("isPlayer").entities[0];
  const prefab = world.getPrefab("enemy");

  if (!prefab) {
    const engine = world.include("isEngine").entities[0];
    const model = engine.get<LoadedModels>("assets").Character_Enemy;

    const indexFinger = model.scene.getObjectByProperty("name", "Index1R");

    // Hide weapons but leave knife model
    indexFinger?.children.forEach((child) => {
      if (child.isObject3D && child.name !== "Knife_1") {
        child.visible = false;
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
  const enemyProxy = world.getEntity(enemyId);
  const phyInfo = createDynamicBox(enemySize);

  if (startingPos) {
    enemyProxy?.get<Group>("transform").position.copy(startingPos);
    phyInfo.rb.setTranslation(startingPos, true);
  }

  enemyProxy?.add("target", player);
  enemyProxy?.add("rigidbody", phyInfo.rb);
  enemyProxy?.add("collider", phyInfo.col);

  return world.getEntity(enemyId) as Entity;
}
