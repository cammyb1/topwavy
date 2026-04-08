import { initWebGL, type GLState } from "./mount3";
import { mountExperience } from "./game";
const canvas: HTMLCanvasElement = document.getElementsByTagName("canvas")[0];

const state: GLState = initWebGL(canvas);
mountExperience(state);
