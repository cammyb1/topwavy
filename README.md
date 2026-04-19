# TopWavy
![topwavy](https://github.com/user-attachments/assets/060cee3f-6a17-4323-96a4-b9700c7b3eef)
**TopWavy** is a demonstration project that explores the capabilities of the **Jael** entity system as the core engine for a game. This repository serves as a proof of concept to evaluate how Jael can integrate with external rendering and physics libraries.

## Technologies Used

| Category | Technology |
|----------|------------|
| Entity System | [@jael-ecs/core](https://github.com/cammyb1/jael) |
| 3D Rendering | [Three.js](https://threejs.org/) |
| Physics | [@dimforge/rapier3d](https://rapier.rs/) |
| Global State | [Zustand](https://github.com/pmndrs/zustand) |
| Build Tool | [Vite](https://vitejs.dev/) |
| Language | TypeScript |

## Purpose

The main goal of this project is to demonstrate that **Jael** can work as a robust entity system capable of:

- Managing game entities (players, enemies, projectiles)
- Handling systems (movement, collisions, camera, enemy AI)
- Integrating seamlessly with Three.js for rendering
- Using Rapier for accurate physics simulations
- Coordinating multiple systems simultaneously in a game loop

## Project Structure

```
src/
├── entities/          # Entity definitions (Player, Enemy, etc.)
├── systems/           # Game systems (physics, AI, camera, etc.)
├── ui/                # UI screen logic
├── helpers/           # Utilities (file loading, Rapier, state)
├── game.ts            # Main experience mounting
└── main.ts            # Entry point
```

## How to Run Locally

```bash
# Install dependencies
bun install

# Start development server
bun run dev
```

Then open `http://localhost:5173` in your browser.

## Acknowledgments

### 3D Models and Animations

The GLB models and animations used in this example were created by **[kaylousberg](https://kaylousberg.com/)**.

- Character models: Ranger, Skeleton Warrior, Skeleton Minion
- Animations: Basic movement, advanced movement, melee combat, ranged combat

### Open Source Libraries

- **Three.js** - For the excellent 3D rendering library
- **Rapier** - For the high-performance physics engine
- **Jael** - For the entity system used in this project
- **Zustand** - For simple and effective state management
- **Vite** - For the modern development experience

---

**Note:** This README was AI-assisted. All project code (systems, entities, game logic, Three.js and Rapier integrations) was written from scratch. This doesn't mean the code is perfect by any means—mistakes were likely made along the way, and lessons were learned too.

*This project is a technical demonstration and does not represent a final product.*

## License

Licensed under the [MIT License](LICENSE).
