import { BootScene } from "./scenes/BootScene.js";
import { MainMenuScene } from "./scenes/MainMenuScene.js";
import { IntroDriveScene } from "./scenes/IntroDriveScene.js";
import { GraveyardScene } from "./scenes/GraveyardScene.js";
import { GrandHallScene } from "./scenes/GrandHallScene.js";
import { LibraryScene } from "./scenes/LibraryScene.js";
import { GalleryScene } from "./scenes/GalleryScene.js";
import { PlaceholderScene } from "./scenes/PlaceholderScene.js";

const config = {
  type: Phaser.AUTO,
  parent: "game",
  backgroundColor: "#050507",
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight
  },
  render: {
    antialias: false,
    pixelArt: true,
    roundPixels: true
  },
  scene: [BootScene, MainMenuScene, IntroDriveScene, GraveyardScene, GrandHallScene, LibraryScene, GalleryScene, PlaceholderScene]
};

new Phaser.Game(config);
