import type { World, System } from "@jael-ecs/core";
import { FiniteState, type State } from "../helpers/state";

const parser = new DOMParser();

function fetchHtml(path: string): Promise<Document> {
  return new Promise((resolve, reject) => {
    fetch(`./ui/${path}.html`)
      .then((r: Response) => r.text())
      .then((r: string) => {
        resolve(parser.parseFromString(r, "text/html"));
      })
      .catch((error) => reject(error));
  });
}

export default function UISystem(world: World): System {
  return {
    priority: -1,
    init() {
      const engine = world.include("isEngine").entities[0];
      if (engine) {
        const states = engine.get<FiniteState>("state");
        const uiContainer = document.getElementById("ui");
        let screens: { [key: string]: string } = {};
        let loadedScreens = false;

        const promises: Promise<Document>[] = [];

        // Move to engine data before system creations
        promises.push(fetchHtml("StartScreen"));
        promises.push(fetchHtml("PauseScreen"));
        promises.push(fetchHtml("FinishScreen"));

        Promise.all(promises).then((docs) => {
          screens.start = docs[0].body.innerHTML;
          screens.pause = docs[1].body.innerHTML;
          screens.finish = docs[2].body.innerHTML;

          if (uiContainer) {
            uiContainer.innerHTML = screens.start;
          }

          loadedScreens = true;
        });

        states.on("change", (prev: State | undefined) => {
          if (!loadedScreens || !uiContainer) return;

          if (prev) {
            if (["idle", "paused"].includes(prev.name)) {
              uiContainer.innerHTML = "";
            }
            if (prev.name === "start") {
              if (states.active?.name === "paused") {
                uiContainer.innerHTML = screens.pause;
              } else {
                uiContainer.innerHTML = screens.finish;
              }
            }
          }
        });
      }
    },
    update() {},
  };
}
