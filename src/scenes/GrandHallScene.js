import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";

export class GrandHallScene extends Phaser.Scene {
  constructor() {
    super("GrandHallScene");
    this.petalCount = 0;
    this.memoryCrestCount = 0;
    this.stage = "intro";
    this.hubUnlocked = false;
    this.libraryComplete = false;
    this.galleryComplete = false;
    this.chapterFourUnlocked = false;
  }

  create(data = {}) {
    const progress = getHouseProgress();
    logProgressEvent("SCENE START", { scene: "GrandHallScene", data, progress });
    if (data.fromLibrary || data.fromGallery || progress.libraryComplete || progress.galleryComplete || progress.grandHall?.hubUnlocked) {
      this.createReturnedHub(progress, data);
      return;
    }

    this.petalCount = progress.rosePetals || 0;
    this.memoryCrestCount = 0;
    this.stage = "intro";
    this.hubUnlocked = false;
    this.libraryComplete = false;
    this.galleryComplete = false;
    this.chapterFourUnlocked = false;

    this.cameras.main.setBackgroundColor("#030202");
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: false, piano: true, wind: true, thunder: true, creaks: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createHall();
    this.createInventory();
    this.createOverlays();
    this.createGhost();
    this.createPedestalHotspot();
    this.createGateHotspot();
    this.createRoomHotspots();
    this.createVignette();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    this.time.delayedCall(500, () => {
      this.playDialogueSequence([
        "The doors slam shut behind you.",
        "The sound echoes through the manor.",
        "Silence follows."
      ], () => this.enableGhost());
    });

    this.bindShutdown();
  }

  createReturnedHub(progress, data = {}) {
    this.petalCount = progress.rosePetals || 0;
    this.memoryCrestCount = progress.memoryCrests || 0;
    this.libraryComplete = progress.libraryComplete || data.fromLibrary;
    this.galleryComplete = progress.galleryComplete || data.fromGallery;
    this.chapterFourUnlocked = progress.chapterFourUnlocked || false;
    this.stage = "hub";
    this.hubUnlocked = true;

    logProgressEvent("SCENE START", { scene: "GrandHallScene", mode: "returned-hub", petals: this.petalCount, crests: this.memoryCrestCount });

    this.cameras.main.setBackgroundColor("#030202");
    this.cameras.main.fadeIn(1400, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: false, piano: true, wind: true, thunder: true, creaks: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createHall();
    this.createInventory();
    this.createOverlays();
    this.createGateHotspot();
    this.createRoomHotspots();
    this.createVignette();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    this.updateInventoryHUD();
    this.showReturnedHubObjectives();
    this.enableRooms();
    this.createGateCrestLabel();

    if (data.fromGallery && this.chapterFourUnlocked) {
      this.time.delayedCall(1200, () => {
        this.playDialogueSequence(["Chapter Four awaits.", "The manor continues to heal."]);
      });
    }

    this.bindShutdown();
  }

  bindShutdown() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "GrandHallScene", stage: this.stage });
      if (this.audio) this.audio.destroy();
    });
  }

  updateInventoryHUD() {
    const { width } = this.scale;
    let text = `Rose Petals: ${this.petalCount} / 20`;
    if (this.memoryCrestCount > 0) {
      text += `\nMemory Crests: ${this.memoryCrestCount} / 6`;
    }
    this.inventoryText.setText(text);
  }

  showReturnedHubObjectives() {
    const { width, height } = this.scale;
    this.hubObjectives = this.add.text(width * 0.5, height * 0.14, "RECOVER THE SIX MEMORY CRESTS\nRESTORE THE CRIMSON ROSE\nFIND HER", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(15, Math.floor(width / 78))}px`,
      color: "#d8b28d",
      align: "center",
      lineSpacing: 8,
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(55).setAlpha(0);
    this.tweens.add({ targets: this.hubObjectives, alpha: 1, duration: 900 });
  }

  createGateCrestLabel() {
    const { width, height } = this.scale;
    this.gateCrestLabel = this.add.text(width * 0.5, height * 0.62, `Memory Crests\n${this.memoryCrestCount} / 6`, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(14, Math.floor(width / 82))}px`,
      color: "#9fd4a8",
      align: "center",
      shadow: { offsetX: 2, offsetY: 2, color: "#0a1a0c", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(56).setAlpha(0);
    this.tweens.add({ targets: this.gateCrestLabel, alpha: 1, duration: 1000, delay: 600 });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.dialogue) this.dialogue.update(delta);
    this.updatePedestalGlow();
    this.updateGateGlow();
    this.updateLibraryGlow();
    this.updateGalleryGlow();
  }

  createHall() {
    this.hall = this.add.image(0, 0, "grandHall").setOrigin(0.5).setDepth(0);
    this.coverImage(this.hall);
  }

  coverImage(image) {
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / image.width, height / image.height));
  }

  createOverlays() {
    const { width, height } = this.scale;
    this.flash = this.add.rectangle(0, 0, width, height, 0xe9edf8, 0)
      .setOrigin(0)
      .setDepth(70);
    this.pedestalGlow = this.add.graphics().setDepth(8);
    this.gateGlow = this.add.graphics().setDepth(8);
    this.libraryGlow = this.add.graphics().setDepth(8);
    this.galleryGlow = this.add.graphics().setDepth(8);
  }

  createInventory() {
    const { width } = this.scale;
    this.inventoryText = this.add.text(width - 26, 24, "Rose Petals: 0 / 20", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 92))}px`,
      color: "#d8b28d",
      backgroundColor: "#070506",
      padding: { x: 14, y: 10 },
      align: "right",
      lineSpacing: 6
    }).setOrigin(1, 0).setDepth(55).setAlpha(0.86);
  }

  createGhost() {
    const { width, height } = this.scale;
    this.ghost = this.add.image(width * 0.5, height * 0.34, "ghostGirlFront")
      .setOrigin(0.5, 1)
      .setScale(this.getGhostScale())
      .setAlpha(0)
      .setDepth(14);
    this.ghostGlow = this.add.image(this.ghost.x, this.ghost.y, "ghostGirlFront")
      .setOrigin(0.5, 1)
      .setScale(this.ghost.scaleX * 1.22)
      .setTint(0xaec7e8)
      .setAlpha(0)
      .setDepth(13);
    this.ghostHotspot = this.add.rectangle(this.ghost.x, this.ghost.y - this.ghost.displayHeight * 0.48, this.ghost.displayWidth * 1.8, this.ghost.displayHeight, 0xffffff, 0)
      .setDepth(42);
  }

  getGhostScale() {
    const { width, height } = this.scale;
    return Math.max(0.105, Math.min(width / 7600, height / 5200));
  }

  enableGhost() {
    this.stage = "ghost";
    this.tweens.add({ targets: this.ghost, alpha: 0.78, duration: 900 });
    this.tweens.add({
      targets: this.ghostGlow,
      alpha: { from: 0.12, to: 0.34 },
      scaleX: this.ghost.scaleX * 1.34,
      scaleY: this.ghost.scaleY * 1.34,
      duration: 1800,
      yoyo: true,
      repeat: -1
    });
    this.ghostHotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        this.ghost.setAlpha(0.94);
        this.ghostGlow.setAlpha(0.46);
      })
      .on("pointerout", () => {
        this.ghost.setAlpha(0.78);
        this.ghostGlow.setAlpha(0.28);
      })
      .once("pointerdown", () => this.startGhostEvent());
  }

  startGhostEvent() {
    if (this.stage !== "ghost") return;
    this.stage = "ghost-event";
    this.ghostHotspot.disableInteractive();
    this.playDialogueSequence(["You!"], () => {
      this.cameras.main.zoomTo(1.035, 700);
      this.time.delayedCall(600, () => this.vanishGhost());
    });
  }

  vanishGhost() {
    this.flash.setAlpha(0.3);
    this.tweens.add({ targets: this.flash, alpha: 0, duration: 560 });
    this.tweens.add({
      targets: [this.ghost, this.ghostGlow],
      alpha: 0,
      duration: 700,
      onComplete: () => {
        this.cameras.main.zoomTo(1, 700);
        this.destroyGhost();
        this.playDialogueSequence(["...", "Come back!", "No response.", "Only silence."], () => this.enablePedestal());
      }
    });
  }

  destroyGhost() {
    if (this.ghostHotspot) this.ghostHotspot.destroy();
    if (this.ghost) this.ghost.destroy();
    if (this.ghostGlow) this.ghostGlow.destroy();
    this.ghostHotspot = null;
    this.ghost = null;
    this.ghostGlow = null;
  }

  createPedestalHotspot() {
    const { width, height } = this.scale;
    this.pedestalHotspot = this.add.rectangle(width * 0.5, height * 0.76, width * 0.22, height * 0.16, 0xffffff, 0)
      .setDepth(41);
  }

  enablePedestal() {
    this.stage = "pedestal";
    this.pedestalHotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.pedestalHovering = true; })
      .on("pointerout", () => { this.pedestalHovering = false; })
      .once("pointerdown", () => this.openPedestalView());
  }

  updatePedestalGlow() {
    if (this.stage !== "pedestal" || !this.pedestalGlow) {
      if (this.pedestalGlow) this.pedestalGlow.clear();
      return;
    }
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    this.pedestalGlow.clear();
    this.pedestalGlow.fillStyle(0xbfd7ff, (this.pedestalHovering ? 0.22 : 0.1) + pulse * 0.14);
    this.pedestalGlow.fillEllipse(width * 0.5, height * 0.76, width * 0.22, height * 0.09);
  }

  openPedestalView() {
    if (this.stage !== "pedestal") return;
    this.stage = "pedestal-view";
    this.pedestalHotspot.disableInteractive();
    this.pedestalGlow.clear();

    const { width, height } = this.scale;
    this.pedestalView = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.72).setOrigin(0);
    const image = this.add.image(width / 2, height / 2, "stonePedestal").setOrigin(0.5);
    image.setScale(Math.min(width / image.width, height / image.height) * 0.92);
    this.closeupPetal = this.add.image(width / 2, height * 0.42, "rosePetal")
      .setOrigin(0.5)
      .setScale(Math.max(0.16, Math.min(width / 4200, height / 2500)))
      .setAlpha(0.95);
    this.pedestalView.add([shade, image, this.closeupPetal]);
    this.tweens.add({ targets: this.pedestalView, alpha: 1, duration: 650 });

    this.playDialogueSequence(["There is something resting here."], () => {
      this.time.delayedCall(200, () => { // Add a small delay after dialogue finishes
        console.log("Dialogue finished. Setting petal interactive. Current stage:", this.stage);
        this.closeupPetal.setInteractive({ useHandCursor: true }).once("pointerdown", () => this.collectFirstPetal());
        this.tweens.add({
          targets: this.closeupPetal,
          alpha: { from: 0.75, to: 1 },
          duration: 900,
          yoyo: true,
          repeat: -1
        });
      });
    });
  }

  collectFirstPetal() {
    if (this.stage !== "pedestal-view") return;
    this.stage = "petal-found";
    console.log("collectFirstPetal called. Current stage:", this.stage);
    this.closeupPetal.disableInteractive();
    const progress = getHouseProgress();
    if (!progress.grandHall.firstPetalCollected) {
      this.petalCount += 1;
      progress.grandHall.firstPetalCollected = true;
      logProgressEvent("ROSE PETAL COLLECTED", { scene: "GrandHallScene", source: "Grand Hall pedestal" });
    }
    progress.rosePetals = this.petalCount;
    logProgressEvent("ROSE PETAL TOTAL", { total: this.petalCount });
    saveProgress();
    this.updateInventoryHUD();

    const { width, height } = this.scale;
    const found = this.add.text(width / 2, height * 0.26, `ROSE PETAL FOUND\n${this.petalCount} / 20`, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 46))}px`,
      color: "#ffb2a8",
      align: "center",
      shadow: { offsetX: 3, offsetY: 3, color: "#2a0508", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(82).setAlpha(0);

    this.tweens.add({ targets: found, alpha: 1, duration: 450 });
    this.tweens.add({
      targets: this.closeupPetal,
      alpha: 0,
      scaleX: this.closeupPetal.scaleX * 1.5,
      scaleY: this.closeupPetal.scaleY * 1.5,
      tint: 0xff3b32,
      duration: 1100,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.time.delayedCall(800, () => {
          this.tweens.add({ targets: found, alpha: 0, duration: 500, onComplete: () => found.destroy() });
          this.showMemoryText();
        });
      }
    });
  }

  showMemoryText() {
    const { width, height } = this.scale;
    const memory = this.add.text(width / 2, height * 0.5, "\"The first thing I loved was your laugh.\"", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 52))}px`,
      color: "#f1d9bb",
      align: "center",
      wordWrap: { width: width * 0.72 }
    }).setOrigin(0.5).setDepth(82).setAlpha(0);

    this.tweens.add({
      targets: memory,
      alpha: 1,
      duration: 700,
      yoyo: true,
      hold: 1800,
      onComplete: () => {
        memory.destroy();
        this.closePedestalView(() => this.readPedestalInscription());
      }
    });
  }

  closePedestalView(onComplete) {
    this.tweens.add({
      targets: this.pedestalView,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        this.pedestalView.destroy();
        this.pedestalView = null;
        if (onComplete) onComplete();
      }
    });
  }

  readPedestalInscription() {
    this.playDialogueSequence([
      "Six memories restore the house.",
      "Twenty petals restore the rose.",
      "Only then shall the path open."
    ], () => this.enableGate());
  }

  createGateHotspot() {
    const { width, height } = this.scale;
    this.gateHotspot = this.add.rectangle(width * 0.5, height * 0.49, width * 0.22, height * 0.24, 0xffffff, 0)
      .setDepth(41);
  }

  enableGate() {
    this.stage = "gate";
    this.gateHotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.gateHovering = true; })
      .on("pointerout", () => { this.gateHovering = false; })
      .once("pointerdown", () => this.openGateView());
  }

  updateGateGlow() {
    if (this.libraryComplete && this.gateGlow) {
      const { width, height } = this.scale;
      const pulse = 0.5 + Math.sin(this.time.now * 0.0036) * 0.5;
      this.gateGlow.clear();
      this.gateGlow.fillStyle(0x9fd4a8, (this.gateHovering ? 0.2 : 0.1) + pulse * 0.1);
      this.gateGlow.fillEllipse(width * 0.5, height * 0.5, width * 0.26, height * 0.18);
      return;
    }

    if (this.stage !== "gate" || !this.gateGlow) {
      if (this.gateGlow) this.gateGlow.clear();
      return;
    }
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0036) * 0.5;
    this.gateGlow.clear();
    this.gateGlow.fillStyle(0xd8b28d, (this.gateHovering ? 0.22 : 0.09) + pulse * 0.12);
    this.gateGlow.fillEllipse(width * 0.5, height * 0.5, width * 0.26, height * 0.18);
  }

  openGateView() {
    if (this.stage !== "gate") return;
    this.stage = "gate-view";
    this.gateHotspot.disableInteractive();
    this.gateGlow.clear();

    const { width, height } = this.scale;
    this.gateView = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.68).setOrigin(0);
    const image = this.add.image(width / 2, height / 2, "ironGate").setOrigin(0.5);
    image.setScale(Math.max(width / image.width, height / image.height));
    this.gateView.add([shade, image]);
    this.tweens.add({ targets: this.gateView, alpha: 1, duration: 700 });

    this.playDialogueSequence(["It needs six crests."], () => {
      this.tweens.add({
        targets: this.gateView,
        alpha: 0,
        duration: 700,
        onComplete: () => {
          this.gateView.destroy();
          this.gateView = null;
          this.portraitEvent();
        }
      });
    });
  }

  portraitEvent() {
    this.playDialogueSequence([
      "A sudden creak echoes through the hall.",
      "One of the portraits has changed.",
      "Now it depicts the manor.",
      "Alive.",
      "Golden light glows from every window.",
      "...",
      "Was that always there?"
    ], () => this.whisperEvent());
  }

  whisperEvent() {
    this.playWhisperTone();
    this.playDialogueSequence([
      "Find the memories.",
      "Player turns.",
      "No one is there.",
      "Find me."
    ], () => this.unlockHub());
  }

  playWhisperTone() {
    if (!window.__houseAudioContext) return;
    const context = window.__houseAudioContext;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = "sine";
    osc.frequency.value = 392;
    gain.gain.setValueAtTime(0, context.currentTime);
    gain.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 1.7);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start();
    osc.stop(context.currentTime + 1.8);
  }

  unlockHub() {
    this.stage = "hub";
    this.hubUnlocked = true;
    const progress = getHouseProgress();
    progress.grandHall.hubUnlocked = true;
    saveProgress();
    const { width, height } = this.scale;
    this.hubObjectives = this.add.text(width * 0.5, height * 0.14, "RECOVER THE SIX MEMORY CRESTS\nRESTORE THE CRIMSON ROSE\nFIND HER", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(15, Math.floor(width / 78))}px`,
      color: "#d8b28d",
      align: "center",
      lineSpacing: 8,
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(55).setAlpha(0);
    this.tweens.add({ targets: this.hubObjectives, alpha: 1, duration: 900 });
    this.enableRooms();
  }

  createRoomHotspots() {
    const { width, height } = this.scale;
    this.roomHotspots = {
      library: this.add.rectangle(width * 0.17, height * 0.27, width * 0.17, height * 0.17, 0xffffff, 0).setDepth(40),
      gallery: this.add.rectangle(width * 0.83, height * 0.27, width * 0.17, height * 0.17, 0xffffff, 0).setDepth(40),
      kitchen: this.add.rectangle(width * 0.09, height * 0.64, width * 0.14, height * 0.18, 0xffffff, 0).setDepth(40),
      basement: this.add.rectangle(width * 0.23, height * 0.64, width * 0.13, height * 0.18, 0xffffff, 0).setDepth(40),
      observatory: this.add.rectangle(width * 0.77, height * 0.64, width * 0.14, height * 0.18, 0xffffff, 0).setDepth(40),
      bedroom: this.add.rectangle(width * 0.91, height * 0.64, width * 0.14, height * 0.18, 0xffffff, 0).setDepth(40)
    };

    this.roomLabels = {
      library: this.add.text(width * 0.17, height * 0.18, "Library", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(14, Math.floor(width / 72))}px`,
        color: "#d8b28d",
        backgroundColor: "#0a0808",
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0),
      gallery: this.add.text(width * 0.83, height * 0.18, "Gallery", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(14, Math.floor(width / 72))}px`,
        color: "#d8b28d",
        backgroundColor: "#0a0808",
        padding: { x: 8, y: 4 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0),
      kitchen: this.add.text(width * 0.09, height * 0.54, "Kitchen", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(13, Math.floor(width / 78))}px`,
        color: "#a9867c",
        backgroundColor: "#0a0808",
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0),
      basement: this.add.text(width * 0.23, height * 0.54, "Basement", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(13, Math.floor(width / 78))}px`,
        color: "#a9867c",
        backgroundColor: "#0a0808",
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0),
      observatory: this.add.text(width * 0.77, height * 0.54, "Observatory", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(13, Math.floor(width / 78))}px`,
        color: "#a9867c",
        backgroundColor: "#0a0808",
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0),
      bedroom: this.add.text(width * 0.91, height * 0.54, "Bedroom", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(13, Math.floor(width / 78))}px`,
        color: "#a9867c",
        backgroundColor: "#0a0808",
        padding: { x: 6, y: 3 }
      }).setOrigin(0.5).setDepth(41).setAlpha(0)
    };
  }

  createVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(50);

    g.fillStyle(0x000000, 0.3);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0x000000, 0.6);
    g.fillRect(0, 0, width, height * 0.1);
    g.fillRect(0, height * 0.9, width, height * 0.1);
    g.fillRect(0, 0, width * 0.06, height);
    g.fillRect(width * 0.94, 0, width * 0.06, height);

    g.fillStyle(0x1a0a12, 0.13);
    g.fillRect(0, 0, width, height);
  }

  enableRooms() {
    const progress = getHouseProgress();
    Object.entries(this.roomHotspots).forEach(([name, hotspot]) => {
      if (name === "bedroom" && !progress.galleryComplete) return;

      hotspot.setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.hoveredRoom = name;
          if (this.roomLabels[name]) {
            this.tweens.add({
              targets: this.roomLabels[name],
              alpha: 1,
              duration: 200
            });
          }
        })
        .on("pointerout", () => {
          if (this.hoveredRoom === name) this.hoveredRoom = null;
          if (this.roomLabels[name]) {
            this.tweens.add({
              targets: this.roomLabels[name],
              alpha: 0,
              duration: 200
            });
          }
        })
        .on("pointerdown", () => this.enterRoom(name));
    });
  }

  updateLibraryGlow() {
    if (!this.hubUnlocked || !this.libraryGlow) {
      if (this.libraryGlow) this.libraryGlow.clear();
      return;
    }
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0045) * 0.5;
    const gold = this.libraryComplete;
    const baseColor = gold ? 0xffd56a : 0xe5c08a;
    const hoverBoost = this.hoveredRoom === "library" ? 0.24 : (gold ? 0.18 : 0.13);
    this.libraryGlow.clear();
    this.libraryGlow.fillStyle(baseColor, hoverBoost + pulse * 0.15);
    this.libraryGlow.fillEllipse(width * 0.17, height * 0.27, width * 0.18, height * 0.12);
  }

  updateGalleryGlow() {
    if (!this.hubUnlocked || !this.galleryGlow) {
      if (this.galleryGlow) this.galleryGlow.clear();
      return;
    }
    const progress = getHouseProgress();
    if (!progress.libraryComplete) {
      this.galleryGlow.clear();
      return;
    }
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0045) * 0.5;
    const gold = this.galleryComplete;
    const baseColor = gold ? 0xffd56a : 0xe5c08a;
    const hoverBoost = this.hoveredRoom === "gallery" ? 0.24 : (gold ? 0.18 : 0.13);
    this.galleryGlow.clear();
    this.galleryGlow.fillStyle(baseColor, hoverBoost + pulse * 0.15);
    this.galleryGlow.fillEllipse(width * 0.83, height * 0.27, width * 0.18, height * 0.12);
  }

  enterRoom(name) {
    if (!this.hubUnlocked) return;
    const progress = getHouseProgress();

    if (name === "library") {
      if (this.libraryComplete) {
        this.playDialogueSequence(["The library breathes easier now.", "Its first chapter has been restored."]);
        return;
      }
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.time.delayedCall(950, () => this.scene.start("LibraryScene"));
      return;
    }

    if (name === "gallery") {
      if (!progress.libraryComplete) {
        this.playDialogueSequence(["The gallery can wait.", "The library comes first."]);
        return;
      }
      if (this.galleryComplete) {
        this.playDialogueSequence(["The gallery glows with restored memories.", "Every frame tells its story now."]);
        return;
      }
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.time.delayedCall(950, () => this.scene.start("GalleryScene"));
      return;
    }

    if (name === "bedroom") {
      if (!progress.galleryComplete) {
        this.playDialogueSequence(["The bedroom can wait.", "The gallery comes first."]);
        return;
      }
      if (progress.bedroomComplete) {
        this.playDialogueSequence(["The bedroom rests in peace.", "Every memory has been found."]);
        return;
      }
      this.cameras.main.fadeOut(900, 0, 0, 0);
      this.time.delayedCall(950, () => this.scene.start("BedroomScene"));
      return;
    }

    this.playDialogueSequence(["This room can wait."]);
  }

  playDialogueSequence(lines, onComplete = null) {
    const queue = [...lines];
    const next = () => {
      if (queue.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.dialogue.show(queue.shift(), () => {
        this.time.delayedCall(420, next);
      });
    };
    next();
  }
}
