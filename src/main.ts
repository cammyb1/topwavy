import { Time } from "@jael-ecs/core";
import { initWebGL, type GLState } from "./mount3";
import { Color } from "three";
import { mountExperience } from "./game";
const canvas: HTMLCanvasElement = document.getElementsByTagName("canvas")[0];

const state: GLState = initWebGL(canvas);
Time.start();

// Default bg color
state.scene.background = new Color("grey");

mountExperience(state);
