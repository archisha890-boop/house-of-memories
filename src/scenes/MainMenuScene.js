import { Atmosphere } from "../systems/Atmosphere.js";

const MENU_ITEMS = [
  { label: "New Game", sceneLabel: "IntroDriveScene" },
  { label: "Continue", sceneLabel: "Continue" },
  { label: "Credits", sceneLabel: "Credits" }
];

export class MainMenuScene extends Phaser.Scene {
  constructor() {
    super("MainMenuScene");
    this.menuText = [];
    this.markerTime = 0;
  }

  create() {
    this.menuText = [];
    this.selectedIndex = 0;
    this.createBackground();
    this.createVignette();
    this.createTitle();
    this.createMenu();
    this.createActiveMarker();

    this.atmosphere = new Atmosphere(this);
    this.atmosphere.create();

    this.input.keyboard.on("keydown-UP", () => this.moveSelection(-1));
    this.input.keyboard.on("keydown-DOWN", () => this.moveSelection(1));
    this.input.keyboard.on("keydown-ENTER", () => this.chooseSelection());
    this.input.keyboard.on("keydown-SPACE", () => this.chooseSelection());

    this.scale.on("resize", this.handleResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off("resize", this.handleResize, this);
    });

    this.updateSelection();
  }

  update(_, deltaMs) {
    this.markerTime += deltaMs / 1000;
    this.updateMarkerPulse();
    this.atmosphere.update(deltaMs / 1000);
  }

  createBackground() {
    const { width, height } = this.scale;

    if (this.textures.exists("menuBackground")) {
      this.backgroundImage = this.add.image(width / 2, height / 2, "menuBackground")
        .setDepth(0)
        .setOrigin(0.5);
      this.coverBackground();
    } else {
      this.createFallbackManor(width, height);
    }

    this.add.rectangle(width / 2, height / 2, width, height, 0x08050a, 0.2).setDepth(2);
    this.add.rectangle(width * 0.26, height / 2, width * 0.52, height, 0x050407, 0.42).setDepth(3);
    this.add.rectangle(width * 0.5, height * 0.06, width, height * 0.22, 0x12050a, 0.22).setDepth(4);
  }

  coverBackground() {
    const { width, height } = this.scale;
    if (!this.backgroundImage) return;

    const scale = Math.max(width / this.backgroundImage.width, height / this.backgroundImage.height);
    this.backgroundImage
      .setPosition(width / 2, height / 2)
      .setScale(scale);
  }

  createFallbackManor(width, height) {
    const g = this.add.graphics().setDepth(0);
    g.fillGradientStyle(0x0b0b13, 0x171624, 0x21151d, 0x08080d, 1);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0x31202a, 0.9);
    g.fillRect(0, height * 0.68, width, height * 0.32);

    g.fillStyle(0x07070a, 1);
    g.fillRect(width * 0.12, height * 0.53, width * 0.055, height * 0.42);
    g.fillRect(width * 0.82, height * 0.52, width * 0.055, height * 0.43);

    g.fillStyle(0x0c0b0f, 1);
    g.fillRect(width * 0.49, height * 0.3, width * 0.29, height * 0.42);
    g.fillRect(width * 0.55, height * 0.19, width * 0.08, height * 0.22);
    g.fillRect(width * 0.69, height * 0.13, width * 0.07, height * 0.3);
    g.fillTriangle(width * 0.49, height * 0.3, width * 0.565, height * 0.17, width * 0.64, height * 0.3);
    g.fillTriangle(width * 0.66, height * 0.19, width * 0.725, height * 0.045, width * 0.79, height * 0.19);
    g.fillTriangle(width * 0.54, height * 0.19, width * 0.59, height * 0.045, width * 0.64, height * 0.19);

    g.fillStyle(0xb83445, 0.85);
    const windows = [
      [0.55, 0.35], [0.62, 0.35], [0.72, 0.28], [0.58, 0.5],
      [0.68, 0.52], [0.74, 0.47], [0.52, 0.58], [0.63, 0.61]
    ];
    for (const [x, y] of windows) {
      g.fillRect(width * x, height * y, width * 0.018, height * 0.06);
    }

    g.fillStyle(0x0a080b, 1);
    g.fillRect(0, 0, width * 0.14, height);
    for (let i = 0; i < 18; i += 1) {
      g.fillRect(width * Phaser.Math.FloatBetween(0.02, 0.19), height * Phaser.Math.FloatBetween(0.0, 0.35), width * 0.12, 4);
    }
  }

  createVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(30);
    g.fillStyle(0x000000, 0.18);
    g.fillRect(0, 0, width, height);
    g.fillStyle(0x000000, 0.45);
    g.fillRect(0, 0, width, height * 0.08);
    g.fillRect(0, height * 0.9, width, height * 0.1);
    g.fillRect(0, 0, width * 0.055, height);
    g.fillRect(width * 0.945, 0, width * 0.055, height);
  }

  createTitle() {
    const { width, height } = this.scale;

    const titleX = width * 0.085;
    const titleY = height * 0.1;
    const titleSize = Math.max(36, Math.floor(width / 17));
    const subtitleSize = Math.max(15, Math.floor(width / 70));

    this.add.text(titleX, titleY - 16, "Have you heard of the...", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${subtitleSize}px`,
      color: "#a9867c"
    }).setDepth(35);

    this.add.text(titleX + 2, titleY + 2, "The House", {
      fontFamily: "UnifrakturCook, Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${titleSize}px`,
      color: "#33080f",
      letterSpacing: 0,
      shadow: { offsetX: 5, offsetY: 5, color: "#020102", blur: 0, fill: true }
    }).setDepth(35);

    this.add.text(titleX, titleY, "The House", {
      fontFamily: "UnifrakturCook, Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${titleSize}px`,
      color: "#f2d8ba",
      letterSpacing: 0,
      shadow: { offsetX: 3, offsetY: 4, color: "#17070a", blur: 0, fill: true }
    }).setDepth(36);

    this.add.text(titleX + 14, titleY + titleSize * 0.82, "of Memories", {
      fontFamily: "Cinzel Decorative, IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(28, Math.floor(titleSize * 0.68))}px`,
      color: "#d2a875",
      letterSpacing: 0,
      shadow: { offsetX: 3, offsetY: 4, color: "#17070a", blur: 0, fill: true }
    }).setDepth(36);

    const ruleY = titleY + titleSize * 1.72;
    const rule = this.add.graphics().setDepth(35);
    rule.lineStyle(1, 0x9d6f54, 0.85);
    rule.beginPath();
    rule.moveTo(titleX + 6, ruleY);
    rule.lineTo(titleX + width * 0.34, ruleY);
    rule.strokePath();
    rule.fillStyle(0x9f1d2c, 0.9);
    rule.fillCircle(titleX + width * 0.17, ruleY, 4);

    this.add.text(titleX + 6, ruleY + 15, "The house remembers everything.", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${subtitleSize}px`,
      color: "#c19a86"
    }).setDepth(35);
  }

  createMenu() {
    const { width, height } = this.scale;
    const startY = height * 0.55;

    MENU_ITEMS.forEach((item, index) => {
      const text = this.add.text(width * 0.1, startY + index * 52, item.label, {
        fontFamily: "Cinzel Decorative, IM Fell English SC, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(18, Math.floor(width / 54))}px`,
        color: "#bca195",
        letterSpacing: 0
      })
        .setDepth(35)
        .setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.selectedIndex = index;
          this.updateSelection();
        })
        .on("pointerdown", () => {
          this.selectedIndex = index;
          this.chooseSelection();
        });

      this.menuText.push(text);
    });
  }

  createActiveMarker() {
    this.activeMarker = this.add.graphics().setDepth(36);
  }

  moveSelection(direction) {
    this.selectedIndex = Phaser.Math.Wrap(this.selectedIndex + direction, 0, MENU_ITEMS.length);
    this.updateSelection();
  }

  updateSelection() {
    this.menuText.forEach((text, index) => {
      const selected = index === this.selectedIndex;
      text.setText(MENU_ITEMS[index].label);
      text.setColor(selected ? "#f4d7b7" : "#b99a8d");
      text.setShadow(selected ? 3 : 1, selected ? 3 : 1, selected ? "#5b101a" : "#120608", 0, true);
      text.setAlpha(selected ? 1 : 0.78);
    });

    this.drawActiveMarker();
  }

  updateMarkerPulse() {
    if (!this.activeMarker) return;
    this.drawActiveMarker();
  }

  drawActiveMarker() {
    if (!this.activeMarker || !this.menuText[this.selectedIndex]) return;

    const selectedText = this.menuText[this.selectedIndex];
    const pulse = 0.65 + Math.sin(this.markerTime * 4.2) * 0.18;
    const x = selectedText.x - 24;
    const y = selectedText.y + selectedText.displayHeight * 0.48;

    this.activeMarker.clear();
    this.activeMarker.fillStyle(0x5b101a, 0.48);
    this.activeMarker.fillEllipse(x, y + 9, 14, 8);
    this.activeMarker.fillStyle(0xc98b55, 0.75 + pulse * 0.2);
    this.activeMarker.fillTriangle(x, y - 12, x - 5, y + 3, x + 5, y + 3);
    this.activeMarker.fillStyle(0xf4d7b7, pulse);
    this.activeMarker.fillTriangle(x, y - 8, x - 2, y + 2, x + 2, y + 2);
    this.activeMarker.lineStyle(1, 0x8c4c3a, 0.55);
    this.activeMarker.beginPath();
    this.activeMarker.moveTo(x + 12, y);
    this.activeMarker.lineTo(x + 30, y);
    this.activeMarker.strokePath();
  }

  async chooseSelection() {
    if (MENU_ITEMS[this.selectedIndex].sceneLabel === "IntroDriveScene") {
      this.input.enabled = false;
      const { resetProgress } = await import("../systems/HouseProgress.js");
      resetProgress();
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      window.__houseIntroAudioArmed = true;
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext && !window.__houseAudioContext) {
        window.__houseAudioContext = new AudioContext();
      }
      if (window.__houseAudioContext && window.__houseAudioContext.resume) {
        window.__houseAudioContext.resume();
      }
      this.time.delayedCall(1400, () => this.scene.start("IntroDriveScene"));
      return;
    }

    this.scene.start("PlaceholderScene", {
      label: MENU_ITEMS[this.selectedIndex].sceneLabel
    });
  }

  handleResize() {
    this.scene.restart();
  }
}
