import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";

const LETTER_NAME = "Invitation Letter";

export class GraveyardScene extends Phaser.Scene {
  constructor() {
    super("GraveyardScene");
    this.ghostSeen = false;
    this.visionSeen = false;
    this.letterInspected = false;
    this.doorsOpened = false;
    this.inventoryOpen = false;
    this.canEnter = false;
    this.ghostVisible = false;
    this.inventoryNeedsAttention = false;
    this.inventoryPulseSpeed = 0.003;
    this.inventoryGlowColor = 0x8fb7e8;
    this.doorNeedsAttention = false;
    this.doorHovering = false;
    this.ghostVanishing = false;
  }

  create() {
    this.resetState();
    this.cameras.main.setBackgroundColor("#020304");
    this.cameras.main.fadeIn(1400, 0, 0, 0);

    this.audio = new SceneAudio(this, { piano: false, wind: true, thunder: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createBackground();
    this.createGhost();
    this.createGuidanceGlows();
    this.createDoorHotspot();
    this.createInventory();
    this.createObjective();

    this.flash = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xe8e3d8, 0)
      .setOrigin(0)
      .setDepth(70);

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    this.input.keyboard.on("keydown-I", () => this.toggleInventory());
    this.input.keyboard.on("keydown-ENTER", () => {
      if (this.canEnter) this.endScene();
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.audio) this.audio.destroy();
    });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.dialogue) this.dialogue.update(delta);
    this.updateGhostGlow();
    this.updateManorGlow();
    this.updateDoorGlow();
    this.updateInventoryPulse();
  }

  resetState() {
    this.ghostSeen = false;
    this.visionSeen = false;
    this.letterInspected = false;
    this.doorsOpened = false;
    this.inventoryOpen = false;
    this.canEnter = false;
    this.ghostVisible = false;
    this.inventoryNeedsAttention = false;
    this.inventoryPulseSpeed = 0.003;
    this.inventoryGlowColor = 0x8fb7e8;
    this.doorNeedsAttention = false;
    this.doorHovering = false;
    this.ghostVanishing = false;
  }

  createBackground() {
    this.background = this.add.image(0, 0, "graveyardBackground")
      .setOrigin(0.5)
      .setDepth(0);
    this.coverImage(this.background);
  }

  createGuidanceGlows() {
    this.manorGlow = this.add.graphics().setDepth(9);
    this.gateGlow = this.add.graphics().setDepth(10);
    this.doorGlow = this.add.graphics().setDepth(31);
    this.inventoryGlow = this.add.graphics().setDepth(54);
  }

  coverImage(image) {
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / image.width, height / image.height));
  }

  createObjective() {
    const { width } = this.scale;
    this.objectivePanel = this.add.graphics().setDepth(60);
    this.objectiveText = this.add.text(28, 28, "FIND HER", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(15, Math.floor(width / 78))}px`,
      color: "#e5c08a",
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setDepth(61).setAlpha(0);

    this.drawObjectivePanel();

    this.tweens.add({
      targets: [this.objectivePanel, this.objectiveText],
      alpha: 1,
      duration: 600
    });
  }

  drawObjectivePanel() {
    this.objectivePanel.clear();
    this.objectivePanel.fillStyle(0x050406, 0.78);
    this.objectivePanel.fillRect(18, 18, 210, 54);
    this.objectivePanel.lineStyle(2, 0x7a583f, 0.9);
    this.objectivePanel.strokeRect(18, 18, 210, 54);
    this.objectivePanel.lineStyle(1, 0xc3a06f, 0.45);
    this.objectivePanel.strokeRect(24, 24, 198, 42);
  }

  updateObjective(label) {
    if (!this.objectiveText) return;
    this.tweens.add({
      targets: [this.objectivePanel, this.objectiveText],
      alpha: 0,
      duration: 260,
      onComplete: () => {
        this.objectiveText.setText(label);
        this.tweens.add({
          targets: [this.objectivePanel, this.objectiveText],
          alpha: 1,
          duration: 360
        });
      }
    });
  }

  createGhost() {
    const { width, height } = this.scale;
    this.ghostVisible = true;
    this.ghost = this.add.image(width * 0.5, height * 0.66, "ghostGirlBack")
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setAlpha(0);
    this.ghost.setScale(this.getGhostScale());

    this.ghostGlow = this.add.image(this.ghost.x, this.ghost.y, "ghostGirlBack")
      .setOrigin(0.5, 1)
      .setDepth(11)
      .setAlpha(0)
      .setTint(0xaec7e8);
    this.ghostGlow.setScale(this.ghost.scaleX * 1.28);

    this.tweens.add({ targets: this.ghost, alpha: 0.78, duration: 1200, ease: "Sine.easeOut" });
    this.tweens.add({ targets: this.ghostGlow, alpha: 0.28, duration: 1200, ease: "Sine.easeOut" });

    this.ghostHotspot = this.add.rectangle(this.ghost.x, this.ghost.y - this.ghost.displayHeight * 0.5, this.ghost.displayWidth * 1.8, this.ghost.displayHeight * 1.15, 0xffffff, 0)
      .setDepth(40)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.setGhostHover(true))
      .on("pointerout", () => this.setGhostHover(false))
      .on("pointerdown", () => this.startGhostEvent());
  }

  getGhostScale() {
    const { width, height } = this.scale;
    return Math.max(0.15, Math.min(width / 6200, height / 4200));
  }

  setGhostHover(hovering) {
    if (!this.ghostVisible || !this.ghost) return;
    this.ghostHovering = hovering;
    this.ghost.setAlpha(hovering ? 0.94 : 0.78);
    this.ghostGlow.setAlpha(hovering ? 0.5 : 0.28);
  }

  updateGhostGlow() {
    if (!this.ghostVisible || this.ghostVanishing || !this.ghostGlow) return;
    const pulse = 0.5 + Math.sin(this.time.now * 0.00314) * 0.5;
    const hoverBoost = this.ghostHovering ? 0.22 : 0;
    this.ghostGlow.setAlpha(0.22 + pulse * 0.2 + hoverBoost);
    this.ghostGlow.setScale(this.ghost.scaleX * (1.22 + pulse * 0.1));
  }

  startGhostEvent() {
    if (this.ghostSeen) return;
    this.ghostSeen = true;
    this.updateObjective("FOLLOW HER");
    this.ghostHotspot.disableInteractive();
    this.playDialogueSequence(["...", "Wh...", "What?"], () => this.turnGhost());
  }

  turnGhost() {
    this.time.delayedCall(300, () => this.setGhostTexture("ghostGirlSide"));
    this.time.delayedCall(760, () => this.setGhostTexture("ghostGirlFront"));
    this.time.delayedCall(1120, () => this.vanishGhost());
  }

  setGhostTexture(key) {
    this.ghost.setTexture(key);
    this.ghostGlow.setTexture(key);
    this.ghost.setScale(this.getGhostScale());
    this.ghostGlow.setScale(this.ghost.scaleX * 1.28);
  }

  vanishGhost() {
    this.ghostVanishing = true;
    this.lightningFlash();
    this.setGhostTexture("ghostGirlDisappear");
    this.tweens.add({
      targets: [this.ghost, this.ghostGlow],
      alpha: 0,
      duration: 900,
      ease: "Sine.easeOut",
      onComplete: () => {
        this.destroyGhostObjects();
        this.updateObjective("INVESTIGATE THE MANOR");
        this.startManorVision();
      }
    });
  }

  destroyGhostObjects() {
    this.ghostVisible = false;
    if (this.ghostHotspot) {
      this.ghostHotspot.disableInteractive();
      this.ghostHotspot.destroy();
      this.ghostHotspot = null;
    }
    if (this.ghost) {
      this.ghost.destroy();
      this.ghost = null;
    }
    if (this.ghostGlow) {
      this.ghostGlow.destroy();
      this.ghostGlow = null;
    }
  }

  lightningFlash() {
    this.flash.setAlpha(0.26);
    this.tweens.add({
      targets: this.flash,
      alpha: 0,
      duration: 520,
      ease: "Sine.easeOut"
    });
  }

  startManorVision() {
    this.bloom = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0xf3eee5, 0)
      .setOrigin(0)
      .setDepth(71);
    this.vision = this.add.image(0, 0, "manorVision")
      .setOrigin(0.5)
      .setDepth(20)
      .setAlpha(0);
    this.coverImage(this.vision);

    this.tweens.add({
      targets: this.bloom,
      alpha: 1,
      duration: 520,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.vision.setDepth(72);
        this.vision.setAlpha(1);
        this.playPianoChord();
        this.tweens.add({
          targets: this.bloom,
          alpha: 0,
          duration: 900,
          ease: "Sine.easeOut",
          onComplete: () => {
            this.playDialogueSequence(["...", "What is this place?"], () => {
              this.time.delayedCall(1300, () => this.endManorVision());
            });
          }
        });
      }
    });
  }

  endManorVision() {
    this.tweens.add({
      targets: this.vision,
      alpha: 0,
      duration: 1400,
      ease: "Sine.easeInOut",
      onComplete: () => {
        this.vision.destroy();
        if (this.bloom) this.bloom.destroy();
        this.visionSeen = true;
        this.playDialogueSequence(["The letter...", "The seal feels warm."], () => {
          this.startInventoryPulse(true);
        });
      }
    });
  }

  playPianoChord() {
    if (!window.__houseAudioContext) return;
    const context = window.__houseAudioContext;
    const gain = context.createGain();
    gain.gain.value = 0.04;
    gain.connect(context.destination);

    [196, 246.94, 293.66].forEach((frequency) => {
      const osc = context.createOscillator();
      const noteGain = context.createGain();
      osc.type = "triangle";
      osc.frequency.value = frequency;
      noteGain.gain.setValueAtTime(0, context.currentTime);
      noteGain.gain.linearRampToValueAtTime(0.32, context.currentTime + 0.06);
      noteGain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 2.2);
      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start();
      osc.stop(context.currentTime + 2.3);
    });
  }

  createInventory() {
    const { width, height } = this.scale;
    this.inventoryButton = this.add.text(width - 30, 24, "[I] Inventory", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 70))}px`,
      color: "#e5c08a",
      backgroundColor: "#080607",
      padding: { x: 16, y: 12 }
    }).setOrigin(1, 0).setDepth(55).setInteractive({ useHandCursor: true });
    this.inventoryButton
      .on("pointerover", () => this.setInventoryHover(true))
      .on("pointerout", () => this.setInventoryHover(false))
      .on("pointerdown", () => this.toggleInventory());

    this.inventoryPanel = this.add.container(width - 310, 86).setDepth(56).setVisible(false);
    const panel = this.add.graphics();
    panel.fillStyle(0x050406, 0.88);
    panel.fillRect(0, 0, 280, 160);
    panel.lineStyle(2, 0x7a583f, 0.9);
    panel.strokeRect(0, 0, 280, 160);
    panel.lineStyle(1, 0xc3a06f, 0.45);
    panel.strokeRect(7, 7, 266, 146);

    const title = this.add.text(20, 16, "Inventory", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: "20px",
      color: "#d8b28d"
    });
    const item = this.add.text(22, 64, LETTER_NAME, {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: "20px",
      color: "#f1d9bb"
    }).setInteractive({ useHandCursor: true });
    item.on("pointerdown", () => this.inspectLetter());

    this.inventoryPanel.add([panel, title, item]);
  }

  setInventoryHover(hovering) {
    this.inventoryHovering = hovering;
    this.inventoryButton.setColor(hovering ? "#ffe0a3" : "#e5c08a");
  }

  startInventoryPulse(urgent = false) {
    this.inventoryNeedsAttention = true;
    this.inventoryPulseSpeed = urgent ? 0.012 : 0.006;
    this.inventoryGlowColor = urgent ? 0xe5c08a : 0x8fb7e8;
  }

  updateInventoryPulse() {
    if (!this.inventoryButton || !this.inventoryGlow) return;

    const bounds = this.inventoryButton.getBounds();
    const active = this.inventoryNeedsAttention || this.inventoryHovering;
    const speed = this.inventoryNeedsAttention ? this.inventoryPulseSpeed : 0.0035;
    const pulse = 0.5 + Math.sin(this.time.now * speed) * 0.5;
    const alpha = active ? 0.18 + pulse * 0.28 : 0.06 + pulse * 0.05;

    this.inventoryGlow.clear();
    this.inventoryGlow.fillStyle(this.inventoryGlowColor, alpha);
    this.inventoryGlow.fillRect(bounds.x - 8, bounds.y - 6, bounds.width + 16, bounds.height + 12);

    if (this.inventoryNeedsAttention) {
      this.inventoryButton.setAlpha(0.78 + pulse * 0.22);
    } else {
      this.inventoryButton.setAlpha(1);
    }
  }

  toggleInventory() {
    this.inventoryOpen = !this.inventoryOpen;
    this.inventoryPanel.setVisible(this.inventoryOpen);
    if (this.inventoryOpen) {
      this.inventoryNeedsAttention = false;
      this.inventoryButton.setAlpha(1);
      this.inventoryGlowColor = 0x8fb7e8;
    }
  }

  inspectLetter() {
    if (!this.visionSeen) return;
    this.inventoryPanel.setVisible(false);
    this.inventoryOpen = false;
    this.playDialogueSequence(["The seal is warm.", "The door reacted to it.", "The doors...", "They reacted."], () => {
      this.letterInspected = true;
      this.updateObjective("OPEN THE DOOR");
      this.doorNeedsAttention = true;
      this.inventoryNeedsAttention = false;
      this.inventoryButton.setAlpha(1);
    });
  }

  createDoorHotspot() {
    const { width, height } = this.scale;
    this.manorHotspot = this.add.rectangle(width * 0.55, height * 0.31, width * 0.28, height * 0.22, 0xffffff, 0)
      .setDepth(39)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.setDoorHover(true))
      .on("pointerout", () => this.setDoorHover(false))
      .on("pointerdown", () => this.interactDoor());

    this.doorHotspot = this.add.rectangle(width * 0.51, height * 0.52, width * 0.26, height * 0.24, 0xffffff, 0)
      .setDepth(39)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.setDoorHover(true))
      .on("pointerout", () => this.setDoorHover(false))
      .on("pointerdown", () => this.interactDoor());
  }

  setDoorHover(hovering) {
    this.doorHovering = hovering;
  }

  updateManorGlow() {
    if (!this.manorGlow) return;
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0022) * 0.5;
    const alpha = this.doorHovering ? 0.18 : 0.045 + pulse * 0.035;
    this.manorGlow.clear();
    this.manorGlow.fillStyle(0xaec7e8, alpha);
    this.manorGlow.fillEllipse(width * 0.55, height * 0.28, width * 0.28, height * 0.17);
  }

  updateDoorGlow() {
    if (!this.gateGlow || !this.doorGlow) return;
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    const baseAlpha = this.doorNeedsAttention ? 0.16 + pulse * 0.26 : 0.055 + pulse * 0.055;
    const hoverBoost = this.doorHovering ? 0.18 : 0;

    this.gateGlow.clear();
    this.gateGlow.fillStyle(this.doorNeedsAttention ? 0xe5c08a : 0xaec7e8, baseAlpha + hoverBoost);
    this.gateGlow.fillEllipse(width * 0.5, height * 0.53, width * 0.26, height * 0.16);

    this.doorGlow.clear();
    if (this.doorNeedsAttention || this.doorHovering) {
      this.doorGlow.fillStyle(0xe5c08a, 0.1 + pulse * 0.18 + hoverBoost);
      this.doorGlow.fillEllipse(width * 0.5, height * 0.5, width * 0.22, height * 0.2);
    }
  }

  interactDoor() {
    if (this.doorsOpened) return;
    if (!this.letterInspected) {
      this.playDialogueSequence(["It's sealed shut."]);
      return;
    }

    this.showDoorScene();
  }

  showDoorScene() {
    this.doorsOpened = true;
    this.doorHotspot.disableInteractive();
    if (this.manorHotspot) this.manorHotspot.disableInteractive();
    this.doorNeedsAttention = false;
    this.doorHovering = false;
    this.gateGlow.clear();
    this.doorGlow.clear();
    this.doorImage = this.add.image(0, 0, "doorsClosed")
      .setOrigin(0.5)
      .setDepth(30)
      .setAlpha(0);
    this.coverImage(this.doorImage);

    this.tweens.add({
      targets: this.doorImage,
      alpha: 1,
      duration: 900,
      onComplete: () => {
        this.playDialogueSequence(["The player raises the letter.", "A deep groan echoes through the old wood.", "Chains rattle in the dark."], () => {
          this.time.delayedCall(2000, () => this.openDoors());
        });
      }
    });
  }

  openDoors() {
    this.doorImage.setTexture("doorsOpen");
    this.coverImage(this.doorImage);
    this.playDialogueSequence(["The doors slowly swing open.", "Warm light spills outward.", "Dust drifts through the doorway."], () => {
      this.canEnter = true;
      this.showEnterPrompt();
    });
  }

  showEnterPrompt() {
    const { width, height } = this.scale;
    this.enterPrompt = this.add.text(width / 2, height * 0.9, "Press ENTER", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 58))}px`,
      color: "#e5c08a",
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(75);
  }

  endScene() {
    this.canEnter = false;
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.time.delayedCall(1100, () => {
      const { width, height } = this.scale;
      this.cameras.main.fadeIn(400, 0, 0, 0);
      this.add.text(width / 2, height * 0.44, "CHAPTER ONE", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(24, Math.floor(width / 36))}px`,
        color: "#d8b28d"
      }).setOrigin(0.5).setDepth(100);
      this.add.text(width / 2, height * 0.54, "THE GRAND HALL", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(22, Math.floor(width / 42))}px`,
        color: "#f1d9bb"
      }).setOrigin(0.5).setDepth(100);
      this.time.delayedCall(2000, () => this.scene.start("GrandHallScene"));
    });
  }

  playDialogueSequence(lines, onComplete = null) {
    const queue = [...lines];
    const next = () => {
      if (queue.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.dialogue.show(queue.shift(), () => {
        this.time.delayedCall(450, next);
      });
    };
    next();
  }
}
