import { createStore } from "zustand/vanilla";

export interface GameStore {
  waveConfig: WaveConfig;
  changeWaveConfig: (data: Partial<WaveConfig>) => void;
}

export interface WaveConfig {
  current: number;
  maxWave: number;
  enemiesPerWave: number;
  sleepTime: number;
}

export const game = createStore<GameStore>((_set, _get) => {
  return {
    waveConfig: {
      current: 1,
      maxWave: 1,
      enemiesPerWave: 2,
      sleepTime: 0.5,
    },
    changeWaveConfig(data: Partial<WaveConfig>) {
      _set({ waveConfig: { ..._get().waveConfig, ...data } });
    },
  };
});
