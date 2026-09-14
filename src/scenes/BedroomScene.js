import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";
import { fadeToScene } from "../systems/SceneTransition.js";

const TEXTURE_KEYS = {
  background: "bedroom",
  restored: "bedroomRestored",
  chest: "chest",
  chestOpened: "chestOpened",
  crest: "crestOfUnderstanding",
  dreamList: "dreamList",
  letter: "letter",
  plushie: "plushie",
  sketchbook: "sketchbook",
  rosePetal: "rosePetal"
};

const KEEPSAKE_HOTSPOTS = {
  bed: { x: 0.58, y: 0.47, w: 0.28, h: 0.2, keepsake: "book" },
  chair: { x: 0.14, y: 0.53, w: 0.18, h: 0.28, keepsake: "plushie" },
  desk: { x: 0.73, y: 0.44, w: 0.22, h: 0.22, keepsake: "sketchbook" },
  mirror: { x: 0.64, y: 0.3, w: 0.12, h: 0.24, keepsake: "dreamList" },
  wardrobe: { x: 0.9, y: 0.35, w: 0.17, h: 0.42, keepsake: "letter" }
};

const CHEST_HOTSPOT = { x: 0.39, y: 0.72, w: 0.28, h: 0.22 };
const FINAL_PETAL_SPOT = { x: 0.62, y: 0.43 };

export class BedroomScene extends Phaser.Scene {
  constructor() {
    super("BedroomScene");
    this.stage = "intro";
    this.hoveredHotspot = null;
    this.busy = false;
    this.returnStarted = false;
    this.crestRevealStarted = false;
  }

  create() {
    this.progress = getHouseProgress();
    this.ensureBedroomState();
    this.bedroomState = this.progress.bedroom;
    this.keepsakesCollected = this.bedroomState.keepsakesCollected;
    this.rosePetalCount = this.progress.rosePetals || 0;
    this.memoryCrestCount = this.progress.memoryCrests || 0;
    this.hoveredHotspot = null;
    this.busy = false;
    this.returnStarted = false;
    this.crestRevealStarted = false;

    logProgressEvent("SCENE START", { scene: "BedroomScene", progress: this.progress });

    this.cameras.main.setBackgroundColor("#030202");
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    this.audio = new SceneAudio(this, {
      rain: false,
      piano: true,
      wind: true,
      thunder: false,
      creaks: true,
      musicBox: true
    });
    this.audio.start();
    this.audio.fadeIn();

    this.createRoom();
    this.createOverlays();
    this.createChest();
    this.createHotspots();
    this.createInventory();
    this.createVignette();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    if (this.bedroomState.bedroomComplete || this.progress.bedroomComplete) {
      this.setupCompleteView();
    } else {
      this.time.delayedCall(800, () => this.resumeBedroomState());
    }

    this.bindShutdown();
  }

  update(_, deltaMs) {
    if (this.dialogue) this.dialogue.update(deltaMs / 1000);
    this.updateGlow();
  }

  bindShutdown() {
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", {
        scene: "BedroomScene",
        petals: this.rosePetalCount,
        crests: this.memoryCrestCount,
        stage: this.stage
      });
      this.autosave();
      this.dialogue?.destroy();
      if (this.audio) this.audio.destroy();
      this.scale.off("resize", this.resizeScene, this);
    });
  }

  createRoom() {
    const key = this.bedroomState.bedroomComplete ? TEXTURE_KEYS.restored : TEXTURE_KEYS.background;
    this.background = this.add.image(0, 0, key)
      .setOrigin(0.5)
      .setDepth(0)
      .setAlpha(1)
      .setVisible(true);
    this.coverImage(this.background);
    this.scale.on("resize", this.resizeScene, this);
  }

  resizeScene() {
    if (this.background) this.coverImage(this.background);
    if (this.restoredBackground) this.coverImage(this.restoredBackground);
    if (this.inventoryText) {
      this.inventoryText.setPosition(this.scale.width - 26, 24);
      this.inventoryText.setFontSize(Math.max(13, Math.floor(this.scale.width / 92)));
    }
  }

  coverImage(image) {
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / image.width, height / image.height));
  }

  fitImage(image, maxWidthRatio, maxHeightRatio) {
    const { width, height } = this.scale;
    return Math.min((width * maxWidthRatio) / image.width, (height * maxHeightRatio) / image.height);
  }

  createOverlays() {
    const { width, height } = this.scale;
    this.hotspotGlow = this.add.graphics().setDepth(8);
    this.flash = this.add.rectangle(0, 0, width, height, 0xf3f1ff, 0)
      .setOrigin(0)
      .setDepth(58);
    this.silverLight = this.add.rectangle(0, 0, width, height, 0xdde8ff, 0)
      .setOrigin(0)
      .setDepth(5);
  }

  createChest() {
    const { width, height } = this.scale;
    const chestKey = this.bedroomState.chestUnlocked ? TEXTURE_KEYS.chestOpened : TEXTURE_KEYS.chest;
    this.chest = this.add.image(width * CHEST_HOTSPOT.x, height * CHEST_HOTSPOT.y, chestKey)
      .setOrigin(0.5)
      .setDepth(11)
      .setAlpha(0.98)
      .setVisible(true);
    this.chest.setScale(this.fitImage(this.chest, 0.26, 0.22));

    this.chestHotspot = this.add.rectangle(
      width * CHEST_HOTSPOT.x,
      height * CHEST_HOTSPOT.y,
      width * CHEST_HOTSPOT.w,
      height * CHEST_HOTSPOT.h,
      0xffffff,
      0
    ).setDepth(42);
  }

  createHotspots() {
    const { width, height } = this.scale;
    this.keepsakeHotspots = {};

    Object.entries(KEEPSAKE_HOTSPOTS).forEach(([id, spot]) => {
      if (this.keepsakesCollected[spot.keepsake]) return;

      const hotspot = this.add.rectangle(
        width * spot.x,
        height * spot.y,
        width * spot.w,
        height * spot.h,
        0xffffff,
        0
      ).setDepth(41);

      hotspot.on("pointerover", () => this.hoveredHotspot = id);
      hotspot.on("pointerout", () => {
        if (this.hoveredHotspot === id) this.hoveredHotspot = null;
      });
      hotspot.on("pointerdown", () => this.collectKeepsake(spot.keepsake));
      this.keepsakeHotspots[id] = hotspot;
    });
  }

  createInventory() {
    const { width } = this.scale;
    this.inventoryText = this.add.text(width - 26, 24, "", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 92))}px`,
      color: "#d8b28d",
      backgroundColor: "#070506",
      padding: { x: 14, y: 10 },
      align: "right",
      lineSpacing: 6
    }).setOrigin(1, 0).setDepth(55).setAlpha(0.9);
    this.updateInventoryHUD();
  }

  createVignette() {
    const { width, height } = this.scale;
    this.vignette = this.add.graphics().setDepth(50);
    this.vignette.fillStyle(0x000000, 0.22);
    this.vignette.fillRect(0, 0, width, height);
    this.vignette.fillStyle(0x000000, 0.54);
    this.vignette.fillRect(0, 0, width, height * 0.09);
    this.vignette.fillRect(0, height * 0.91, width, height * 0.09);
    this.vignette.fillRect(0, 0, width * 0.05, height);
    this.vignette.fillRect(width * 0.95, 0, width * 0.05, height);
  }

  playIntro() {
    this.stage = "intro";
    this.playDialogueSequence([
      "...",
      "This was hers.",
      "A soft laugh is heard somewhere in the room.",
      "The room feels untouched.",
      "Not ruined.",
      "Not abandoned.",
      "Preserved."
    ], () => this.enableExploration());
  }

  resumeBedroomState() {
    if (this.bedroomState.crestCollected && !this.bedroomState.finalPetalCollected) {
      this.background.setTexture(TEXTURE_KEYS.restored);
      this.coverImage(this.background);
      this.playDialogueSequence(["A final petal rests on the bed."], () => this.showFinalPetal());
      return;
    }

    if (this.bedroomState.chestUnlocked || this.getKeepsakesCollected() === 5) {
      this.stage = "explore";
      this.enableExploration();
      this.playDialogueSequence(["The chest is waiting."], () => {});
      return;
    }

    this.playIntro();
  }

  enableExploration() {
    if (this.bedroomState.crestCollected && !this.bedroomState.finalPetalCollected) {
      this.showFinalPetal();
      return;
    }

    this.stage = "explore";
    this.enableChest();
    Object.values(this.keepsakeHotspots).forEach((hotspot) => hotspot.setInteractive({ useHandCursor: true }));
  }

  enableChest() {
    this.chestHotspot.removeAllListeners();
    this.chestHotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.hoveredHotspot = "chest")
      .on("pointerout", () => {
        if (this.hoveredHotspot === "chest") this.hoveredHotspot = null;
      })
      .on("pointerdown", () => this.interactChest());
  }

  ensureBedroomState() {
    const defaults = {
      keepsakesCollected: {
        book: false,
        plushie: false,
        sketchbook: false,
        dreamList: false,
        letter: false
      },
      plushiePetalCollected: false,
      dreamListPetalCollected: false,
      finalPetalCollected: false,
      chestUnlocked: false,
      crestCollected: false,
      bedroomComplete: false
    };
    const current = this.progress.bedroom || {};
    const currentKeepsakes = current.keepsakesCollected || current.keepsakes || {};
    this.progress.bedroom = {
      ...defaults,
      ...current,
      bedroomComplete: Boolean(current.bedroomComplete || this.progress.bedroomComplete),
      keepsakesCollected: {
        ...defaults.keepsakesCollected,
        ...currentKeepsakes
      }
    };
  }

  updateGlow() {
    if (!this.hotspotGlow) return;
    this.hotspotGlow.clear();
    if (this.busy || this.stage === "complete") return;

    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    const draw = (spot, color, alphaBoost = 0) => {
      const hover = this.hoveredHotspot === spot.id;
      this.hotspotGlow.fillStyle(color, (hover ? 0.24 : 0.09) + pulse * 0.11 + alphaBoost);
      this.hotspotGlow.fillEllipse(width * spot.x, height * spot.y, width * spot.w, height * spot.h * 0.65);
    };

    if (this.stage === "explore") {
      draw({ id: "chest", ...CHEST_HOTSPOT }, 0xffd56a, this.getKeepsakesCollected() === 5 ? 0.08 : 0);
      Object.entries(KEEPSAKE_HOTSPOTS).forEach(([id, spot]) => {
        if (!this.keepsakesCollected[spot.keepsake]) draw({ id, ...spot }, 0xaecbff);
      });
    }

    if (this.stage === "final-petal" && this.finalPetal) {
      this.hotspotGlow.fillStyle(0xff3b32, 0.12 + pulse * 0.16);
      this.hotspotGlow.fillEllipse(this.finalPetal.x, this.finalPetal.y, this.finalPetal.displayWidth * 1.3, this.finalPetal.displayHeight * 0.8);
    }
  }

  interactChest() {
    if (this.busy || this.stage !== "explore") return;

    if (this.bedroomState.chestUnlocked) {
      this.disableExploration();
      this.playFinalChestDialogue();
      return;
    }

    this.busy = true;
    const collected = this.getKeepsakesCollected();
    this.playDialogueSequence([
      "To know me,",
      "Find the things I loved.",
      `${collected} / 5 Keepsakes Found`
    ], () => {
      this.busy = false;
      this.stage = "explore";
    });
  }

  collectKeepsake(keepsake) {
    if (this.busy || this.stage !== "explore" || this.keepsakesCollected[keepsake]) return;
    this.disableExploration();

    if (keepsake === "book") this.collectBook();
    if (keepsake === "plushie") this.collectPlushie();
    if (keepsake === "sketchbook") this.collectSketchbook();
    if (keepsake === "dreamList") this.collectDreamList();
    if (keepsake === "letter") this.collectLetter();
  }

  collectBook() {
    this.playDialogueSequence([
      "I reread this far too many times.",
      "And I'll do it again."
    ], () => this.finishKeepsake("book", "bed"));
  }

  collectPlushie() {
    const plushie = this.showItem(TEXTURE_KEYS.plushie, 0.32, 0.42);
    this.playDialogueSequence([
      "This little creature has witnessed",
      "an unreasonable amount of emotional support.",
      "You were jealous of the plushie."
    ], () => {
      this.finishKeepsake("plushie", "chair");
      this.awardRosePetal("plushiePetalCollected", 7, "Bedroom plushie");
      this.hideItem(plushie);
      this.afterKeepsake();
    });
  }

  collectSketchbook() {
    const sketchbook = this.showItem(TEXTURE_KEYS.sketchbook, 0.36, 0.44);
    this.playDialogueSequence([
      "Some pages are beautiful.",
      "Others are unfinished.",
      "Others are complete nonsense.",
      "Not every masterpiece needs to be finished."
    ], () => {
      this.finishKeepsake("sketchbook", "desk");
      this.lightCandle();
      this.hideItem(sketchbook);
      this.afterKeepsake();
    });
  }

  collectDreamList() {
    const dreamList = this.showItem(TEXTURE_KEYS.dreamList, 0.56, 0.62);
    this.playDialogueSequence([
      "Places to visit.",
      "Things to learn.",
      "Dreams for the future.",
      "Tiny goals.",
      "Big goals.",
      "Impossible goals.",
      "Hopefully with him.",
      "I always wanted you there."
    ], () => {
      this.finishKeepsake("dreamList", "mirror");
      this.awardRosePetal("dreamListPetalCollected", 8, "Bedroom dream list");
      this.hideItem(dreamList);
      this.afterKeepsake();
    });
  }

  collectLetter() {
    const letter = this.showItem(TEXTURE_KEYS.letter, 0.46, 0.56);
    this.playDialogueSequence([
      "If you've made it this far...",
      "Then you've been looking very carefully.",
      "Good.",
      "I wanted you to.",
      "Because this room isn't really about things.",
      "It's about being known.",
      "And you always made me feel seen."
    ], () => {
      this.finishKeepsake("letter", "wardrobe");
      this.hideItem(letter);
      this.afterKeepsake();
    });
  }

  showItem(key, widthRatio, heightRatio) {
    const { width, height } = this.scale;
    const item = this.add.image(width / 2, height * 0.38, key)
      .setOrigin(0.5)
      .setDepth(61)
      .setAlpha(0)
      .setVisible(true);
    item.setScale(this.fitImage(item, widthRatio, heightRatio));
    this.tweens.add({ targets: item, alpha: 1, duration: 550 });
    return item;
  }

  hideItem(item) {
    if (!item) return;
    this.tweens.add({
      targets: item,
      alpha: 0,
      duration: 450,
      onComplete: () => item.destroy()
    });
  }

  finishKeepsake(keepsake, hotspotId) {
    this.keepsakesCollected[keepsake] = true;
    if (this.keepsakeHotspots[hotspotId]) {
      this.keepsakeHotspots[hotspotId].destroy();
      delete this.keepsakeHotspots[hotspotId];
    }
    this.autosave();
    this.updateInventoryHUD();
  }

  afterKeepsake() {
    this.time.delayedCall(350, () => {
      if (this.checkChestUnlock()) return;
      this.busy = false;
      this.enableExploration();
    });
  }

  checkChestUnlock() {
    if (this.getKeepsakesCollected() !== 5 || this.bedroomState.chestUnlocked) return false;
    this.bedroomState.chestUnlocked = true;
    this.autosave();
    this.unlockChest();
    return true;
  }

  unlockChest() {
    this.chest.setTexture(TEXTURE_KEYS.chestOpened);
    this.chest.setScale(this.fitImage(this.chest, 0.32, 0.26));
    this.playDialogueSequence([
      "Inside rests no treasure.",
      "No artifact.",
      "No mystery.",
      "Only photographs.",
      "Letters.",
      "Little objects.",
      "Small memories.",
      "A life."
    ], () => this.playFinalChestDialogue());
  }

  playFinalChestDialogue() {
    this.busy = true;
    this.playDialogueSequence([
      "People spend their whole lives hoping someone will understand them.",
      "Thank you for trying.",
      "Thank you for staying.",
      "You found everything."
    ], () => {
      this.playDialogueSequence(["I think so."], () => {
        this.time.delayedCall(900, () => {
          this.playDialogueSequence(["No."], () => {
            this.time.delayedCall(900, () => {
              this.playDialogueSequence(["You found me."], () => this.completeBedroom());
            });
          });
        });
      });
    });
  }

  completeBedroom() {
    if (this.stage === "restoring" || this.crestRevealStarted) return;
    if (this.bedroomState.crestCollected) {
      this.showFinalPetal();
      return;
    }

    this.stage = "restoring";
    this.busy = true;
    this.restoredBackground = this.add.image(0, 0, TEXTURE_KEYS.restored)
      .setOrigin(0.5)
      .setDepth(1)
      .setAlpha(0)
      .setVisible(true);
    this.coverImage(this.restoredBackground);

    this.tweens.add({ targets: this.restoredBackground, alpha: 1, duration: 1600 });
    this.tweens.add({ targets: this.silverLight, alpha: 0.24, duration: 1200, yoyo: true, hold: 700 });

    this.time.delayedCall(1800, () => this.revealCrest());
  }

  revealCrest() {
    if (this.crestRevealStarted || this.bedroomState.crestCollected) return;
    this.crestRevealStarted = true;
    const { width, height } = this.scale;
    const crest = this.add.image(width / 2, height * 0.4, TEXTURE_KEYS.crest)
      .setOrigin(0.5)
      .setDepth(62)
      .setAlpha(0)
      .setVisible(true);
    crest.setScale(this.fitImage(crest, 0.34, 0.38));

    this.tweens.add({ targets: crest, alpha: 1, duration: 900 });
    this.time.delayedCall(1000, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF UNDERSTANDING", () => {
        this.bedroomState.crestCollected = true;
        this.memoryCrestCount += 1;
        this.progress.memoryCrests = this.memoryCrestCount;
        this.progress.chapterFiveUnlocked = true;
        logProgressEvent("CREST COLLECTED", { scene: "BedroomScene", crest: "Crest of Understanding" });
        logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
        logProgressEvent("CHAPTER UNLOCKED", { chapter: 5 });
        this.autosave();
        this.updateInventoryHUD();
        this.tweens.add({
          targets: crest,
          alpha: 0,
          duration: 600,
          onComplete: () => {
            crest.destroy();
            this.showFinalPetal();
          }
        });
      });
    });
  }

  showFinalPetal() {
    if (this.bedroomState.finalPetalCollected) {
      this.returnToGrandHall();
      return;
    }

    const { width, height } = this.scale;
    this.stage = "final-petal";
    this.busy = false;
    this.finalPetal = this.add.image(width * FINAL_PETAL_SPOT.x, height * FINAL_PETAL_SPOT.y, TEXTURE_KEYS.rosePetal)
      .setOrigin(0.5)
      .setDepth(60)
      .setAlpha(0)
      .setVisible(true);
    this.finalPetal.setScale(this.fitImage(this.finalPetal, 0.08, 0.08));
    this.tweens.add({ targets: this.finalPetal, alpha: 1, duration: 700 });
    this.tweens.add({ targets: this.finalPetal, scaleX: this.finalPetal.scaleX * 1.08, scaleY: this.finalPetal.scaleY * 1.08, duration: 950, yoyo: true, repeat: -1 });

    this.finalPetal.setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.collectFinalPetal());
  }

  collectFinalPetal() {
    if (this.stage !== "final-petal" || this.bedroomState.finalPetalCollected) return;
    this.stage = "final-petal-collected";
    this.finalPetal.disableInteractive();
    this.awardRosePetal("finalPetalCollected", 9, "Bedroom final petal");
    this.playDialogueSequence([
      "You really were jealous of the plushie.",
      "Don't deny it."
    ], () => {
      this.tweens.add({
        targets: this.finalPetal,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.finalPetal.destroy();
          this.returnToGrandHall();
        }
      });
    });
  }

  awardRosePetal(flag, targetCount, source) {
    if (this.bedroomState[flag]) return;
    this.bedroomState[flag] = true;
    this.rosePetalCount = Math.max(this.rosePetalCount + 1, targetCount);
    this.progress.rosePetals = this.rosePetalCount;
    logProgressEvent("ROSE PETAL COLLECTED", { scene: "BedroomScene", source });
    logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
    this.autosave();
    this.updateInventoryHUD();
  }

  lightCandle() {
    const { width, height } = this.scale;
    const glow = this.add.circle(width * 0.73, height * 0.43, 22, 0xffd56a, 0.3).setDepth(9);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.18, to: 0.48 },
      scale: { from: 0.75, to: 1.2 },
      duration: 1200,
      yoyo: true,
      repeat: -1
    });
  }

  disableExploration() {
    this.busy = true;
    if (this.chestHotspot) this.chestHotspot.disableInteractive();
    Object.values(this.keepsakeHotspots).forEach((hotspot) => hotspot.disableInteractive());
  }

  setupCompleteView() {
    this.stage = "complete";
    this.chest.setTexture(TEXTURE_KEYS.chestOpened);
    this.background.setTexture(TEXTURE_KEYS.restored);
    this.coverImage(this.background);
    this.silverLight.setAlpha(0.12);
    this.updateInventoryHUD();
    this.time.delayedCall(700, () => this.playDialogueSequence(["The bedroom rests in peace."], () => this.returnToGrandHall()));
  }

  getKeepsakesCollected() {
    return Object.values(this.keepsakesCollected).filter(Boolean).length;
  }

  updateInventoryHUD() {
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    if (!this.inventoryText) return;

    let text = `Keepsakes: ${this.getKeepsakesCollected()} / 5`;
    text += `\nRose Petals: ${this.rosePetalCount} / 20`;
    text += `\nMemory Crests: ${this.memoryCrestCount} / 6`;
    this.inventoryText.setText(text);
  }

  autosave() {
    this.progress.bedroom = this.bedroomState;
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    saveProgress();
  }

  returnToGrandHall() {
    if (this.returnStarted) return;
    this.returnStarted = true;
    this.bedroomState.bedroomComplete = true;
    this.progress.bedroomComplete = true;
    this.progress.chapterFiveUnlocked = true;
    this.autosave();
    logProgressEvent("BEDROOM COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });

    this.playDialogueSequence(["The house remembers."], () => {
      fadeToScene(this, "GrandHallScene", { fromBedroom: true }, 1000);
    });
  }

  showQuestBanner(text, onComplete) {
    const { width, height } = this.scale;
    const banner = this.add.container(0, 0).setDepth(72).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.76).setOrigin(0).setInteractive({ useHandCursor: true });
    const bannerText = this.add.text(width / 2, height / 2, text, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 48))}px`,
      color: "#f4d7b7",
      align: "center",
      lineSpacing: 10,
      backgroundColor: "#0a0808",
      padding: { x: 18, y: 14 }
    }).setOrigin(0.5);
    const prompt = this.add.text(width / 2, height * 0.68, "Click to continue", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(12, Math.floor(width / 92))}px`,
      color: "#c6a27f"
    }).setOrigin(0.5);
    banner.add([shade, bannerText, prompt]);
    this.tweens.add({ targets: banner, alpha: 1, duration: 500 });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      this.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          banner.destroy();
          if (onComplete) onComplete();
        }
      });
    };
    shade.once("pointerdown", dismiss);
    this.input.keyboard.once("keydown-ENTER", dismiss);
  }

  playDialogueSequence(lines, onComplete = null) {
    const queue = lines.filter((line) => line !== "");
    const playNext = () => {
      if (queue.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.dialogue.show(queue.shift(), () => {
        this.time.delayedCall(420, playNext);
      });
    };
    playNext();
  }
}
