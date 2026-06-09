# The House of Memories

Browser game prototype using Phaser.js.

## Folder structure

```text
.
|-- index.html
|-- package.json
|-- README.md
|-- server.cjs
|-- vendor
|   `-- phaser.min.js
|-- assets
|   `-- images
|       |-- README.md
|       |-- graveyard-bg.png
|       |-- intro-drive-reference.png
|       `-- main-menu-bg.png
`-- src
    |-- main.js
    |-- scenes
    |   |-- BootScene.js
    |   |-- GraveyardScene.js
    |   |-- IntroDriveScene.js
    |   |-- MainMenuScene.js
    |   `-- PlaceholderScene.js
    `-- ui
    |   `-- DialogueBox.js
    `-- systems
        |-- Atmosphere.js
        `-- SceneAudio.js
```

## Run

```bash
npm run dev
```

Then open:

```text
http://localhost:5173
```
