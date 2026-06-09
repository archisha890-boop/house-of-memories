export class PlaceholderScene extends Phaser.Scene {
  constructor() {
    super("PlaceholderScene");
  }

  create(data = {}) {
    const { width, height } = this.scale;
    const label = data.label || "Scene";

    this.cameras.main.setBackgroundColor("#07070a");

    this.add.text(width / 2, height / 2 - 18, label, {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: `${Math.max(22, Math.floor(width / 32))}px`,
      color: "#f1dbc0",
      align: "center"
    }).setOrigin(0.5);

    this.add.text(width / 2, height / 2 + 34, "Press Esc to return", {
      fontFamily: "Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 80))}px`,
      color: "#a79187",
      align: "center"
    }).setOrigin(0.5);

    this.input.keyboard.once("keydown-ESC", () => {
      this.scene.start("MainMenuScene");
    });
  }
}
