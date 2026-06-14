import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";

const KEEPSAKE_HOTSPOTS = {
  bed: { x: 0.5, y: 0.45, w: 0.3, h: 0.25, keepsake: "book" },
  chair: { x: 0.25, y: 0.55, w: 0.2, h: 0.2, keepsake: "plushie" },
  desk: { x: 0.75, y: 0.5, w: 0.2, h: 0.2, keepsake: "sketchbook" },
  mirror: { x: 0.5, y: 0.35, w: 0.15, h: 0.2, keepsake: "dreamList" },
  wardrobe: { x: 0.85, y: 0.45, w: 0.15, h: 0.3, keepsake: "letter" }
};

const CHEST_HOTSPOT = { x: 0.5, y: 0.65, w: 0.15, h: 0.15 };

export class BedroomScene extends Phaser.Scene {
  constructor() {
    super("BedroomScene");
    this.stage = "intro";
    this.hoveredHotspot = null;
    this.keepsakesCollected = {
      book: false,
      plushie: false,
      sketchbook: false,
      dreamList: false,
      letter: false
    };
  }

  create() {
    const progress = getHouseProgress();
    logProgressEvent("SCENE START", { scene: "BedroomScene", progress });
    this.progress = progress;
    this.bedroomState = progress.bedroom || {
      keepsakesCollected: {
        book: false,
        plushie: false,
        sketchbook: false,
        dreamList: false,
        letter: false
      },
      chestUnlocked: false,
      bedroomComplete: false
    };
    this.keepsakesCollected = this.bedroomState.keepsakesCollected;
    this.rosePetalCount = progress.rosePetals || 0;
    this.memoryCrestCount = progress.memoryCrests || 0;
    this.stage = this.bedroomState.bedroomComplete ? "complete-view" : "intro";
    this.hoveredHotspot = null;

    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: false, piano: true, wind: true, thunder: false, creaks: true, musicBox: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createBackground();
    this.createEnvironmentLayer();
    this.createOverlays();
    this.createChest();
    this.createKeepsakeHotspots();
    this.createInventory();
    this.createVignette();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    if (this.bedroomState.bedroomComplete) {
      this.stage = "complete-view";
      this.setupCompleteView();
    } else {
      this.time.delayedCall(1200, () => this.playIntro());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "BedroomScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.autosave();
      if (this.audio) this.audio.destroy();
      if (this.dialogue) this.dialogue.hide();
      if (this.inventoryText) this.inventoryText.destroy();
      if (this.chestGlow) this.chestGlow.clear();
      if (this.hotspotGlow) this.hotspotGlow.clear();
      if (this.warmOverlay) this.warmOverlay.destroy();
      this.scale.off("resize", this.resizeWarmOverlay, this);
    });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.dialogue) this.dialogue.update(delta);
    this.updateChestGlow();
    this.updateHotspotGlow();
  }

  getKeepsakesCollected() {
    return Object.values(this.keepsakesCollected).filter(Boolean).length;
  }

  playIntro() {
    this.playDialogueSequence([
      "...",
      "This was hers.",
      "A soft laugh is heard somewhere in the room.",
      "The room feels untouched.",
      "Not ruined.",
      "Not abandoned.",
      "Preserved."
    ], () => {
      this.stage = "explore";
      this.enableHotspots();
    });
  }

  createBackground() {
    const key = this.bedroomState.bedroomComplete ? "bedroom_restored" : "bedroom";
    this.background = this.add.image(0, 0, key).setOrigin(0.5).setDepth(0);
    this.coverImage(this.background);
  }

  createEnvironmentLayer() {
    this.envLayer = this.add.container(0, 0).setDepth(6);
  }

  coverImage(image) {
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / image.width, height / image.height));
  }

  createOverlays() {
    this.chestGlow = this.add.graphics().setDepth(8);
    this.hotspotGlow = this.add.graphics().setDepth(8);
    this.warmOverlay = this.add.rectangle(0, 0, 1, 1, 0xffd8a8, 0).setOrigin(0).setDepth(4);
    this.resizeWarmOverlay();
    this.scale.on("resize", this.resizeWarmOverlay, this);
  }

  resizeWarmOverlay() {
    const { width, height } = this.scale;
    this.warmOverlay.setSize(width, height);
    this.warmOverlay.setPosition(0, 0);
  }

  createChest() {
    const { width, height } = this.scale;
    const chestKey = this.bedroomState.chestUnlocked ? "chest_opened" : "chest";
    this.chest = this.add.image(
      width * CHEST_HOTSPOT.x,
      height * CHEST_HOTSPOT.y,
      chestKey
    ).setOrigin(0.5).setDepth(10);
    this.chest.setScale(this.imageScale(this.chest, 0.12, 0.14));

    this.chestHotspot = this.add.rectangle(
      width * CHEST_HOTSPOT.x,
      height * CHEST_HOTSPOT.y,
      width * CHEST_HOTSPOT.w,
      height * CHEST_HOTSPOT.h,
      0xffffff,
      0
    ).setDepth(39);
  }

  createKeepsakeHotspots() {
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
      ).setDepth(39);

      hotspot.setInteractive({ useHandCursor: true })
        .on("pointerover", () => {
          this.hoveredHotspot = id;
        })
        .on("pointerout", () => {
          if (this.hoveredHotspot === id) this.hoveredHotspot = null;
        })
        .on("pointerdown", () => this.collectKeepsake(spot.keepsake));

      this.keepsakeHotspots[id] = hotspot;
    });
  }

  createInventory() {
    const { width, height } = this.scale;
    this.inventoryText = this.add.text(
      width * 0.02,
      height * 0.02,
      "",
      {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(12, Math.floor(width / 96))}px`,
        color: "#d4a574",
        backgroundColor: "#0a0808",
        padding: { x: 8, y: 4 }
      }
    ).setOrigin(0).setDepth(50);
    this.updateInventoryHUD();
  }

  createVignette() {
    const { width, height } = this.scale;
    const g = this.add.graphics().setDepth(50);

    g.fillStyle(0x000000, 0.28);
    g.fillRect(0, 0, width, height);

    g.fillStyle(0x000000, 0.58);
    g.fillRect(0, 0, width, height * 0.1);
    g.fillRect(0, height * 0.9, width, height * 0.1);
    g.fillRect(0, 0, width * 0.06, height);
    g.fillRect(width * 0.94, 0, width * 0.06, height);

    g.fillStyle(0x1a0a12, 0.14);
    g.fillRect(0, 0, width, height);
  }

  imageScale(image, targetWidth, targetHeight) {
    const { width, height } = this.scale;
    const scaleX = (width * targetWidth) / image.width;
    const scaleY = (height * targetHeight) / image.height;
    return Math.min(scaleX, scaleY);
  }

  enableHotspots() {
    this.chestHotspot.setInteractive({ useHandCursor: true })
      .on("pointerover", () => {
        this.hoveredHotspot = "chest";
      })
      .on("pointerout", () => {
        if (this.hoveredHotspot === "chest") this.hoveredHotspot = null;
      })
      .on("pointerdown", () => this.interactChest());

    Object.values(this.keepsakeHotspots).forEach(hotspot => {
      hotspot.setInteractive({ useHandCursor: true });
    });
  }

  updateChestGlow() {
    if (!this.chestGlow) return;
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0025) * 0.5;
    const alpha = this.hoveredHotspot === "chest" ? 0.18 : 0.045 + pulse * 0.035;
    this.chestGlow.clear();
    this.chestGlow.fillStyle(0xffd56a, alpha);
    this.chestGlow.fillEllipse(
      width * CHEST_HOTSPOT.x,
      height * CHEST_HOTSPOT.y,
      width * CHEST_HOTSPOT.w * 1.1,
      height * CHEST_HOTSPOT.h * 0.75
    );
  }

  updateHotspotGlow() {
    if (!this.hotspotGlow || !this.hoveredHotspot || this.hoveredHotspot === "chest") {
      if (this.hotspotGlow) this.hotspotGlow.clear();
      return;
    }

    const spot = KEEPSAKE_HOTSPOTS[this.hoveredHotspot];
    if (!spot) return;

    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.003) * 0.5;
    this.hotspotGlow.clear();
    this.hotspotGlow.fillStyle(0xffd56a, 0.14 + pulse * 0.14);
    this.hotspotGlow.fillEllipse(
      width * spot.x,
      height * spot.y,
      width * spot.w * 1.1,
      height * spot.h * 0.75
    );
  }

  updateInventoryHUD() {
    let text = `Keepsakes: ${this.getKeepsakesCollected()} / 5`;
    text += `\nRose Petals: ${this.rosePetalCount} / 20`;
    if (this.memoryCrestCount > 0) {
      text += `\nMemory Crests: ${this.memoryCrestCount} / 6`;
    }
    this.inventoryText.setText(text);
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
  }

  autosave() {
    this.progress.bedroom = this.bedroomState;
    saveProgress();
  }

  interactChest() {
    if (this.bedroomState.chestUnlocked) {
      this.playFinalChestDialogue();
      return;
    }

    const collected = this.getKeepsakesCollected();
    this.playDialogueSequence([
      "To know me,",
      "Find the things I loved.",
      "",
      `${collected} / 5 Keepsakes Found`
    ]);
  }

  collectKeepsake(keepsake) {
    if (this.keepsakesCollected[keepsake]) return;

    switch (keepsake) {
      case "book":
        this.collectBook();
        break;
      case "plushie":
        this.collectPlushie();
        break;
      case "sketchbook":
        this.collectSketchbook();
        break;
      case "dreamList":
        this.collectDreamList();
        break;
      case "letter":
        this.collectLetter();
        break;
    }
  }

  collectBook() {
    this.playDialogueSequence([
      "I reread this far too many times.",
      "And I'll do it again."
    ], () => {
      this.keepsakesCollected.book = true;
      this.markKeepsakeCollected("bed");
      this.autosave();
      this.updateInventoryHUD();
      this.checkChestUnlock();
    });
  }

  collectPlushie() {
    const { width, height } = this.scale;
    const plushie = this.add.image(width / 2, height * 0.4, "plushie").setOrigin(0.5).setDepth(60).setAlpha(0);
    plushie.setScale(this.imageScale(plushie, 0.25, 0.3));
    this.tweens.add({ targets: plushie, alpha: 1, duration: 800 });

    this.playDialogueSequence([
      "This little creature has witnessed",
      "an unreasonable amount of emotional support."
    ], () => {
      this.keepsakesCollected.plushie = true;
      this.rosePetalCount = Math.max(this.rosePetalCount, 7);
      this.markKeepsakeCollected("chair");
      this.autosave();
      this.updateInventoryHUD();

      this.time.delayedCall(1000, () => {
        this.playDialogueSequence(["You were jealous of the plushie."], () => {
          this.tweens.add({ targets: plushie, alpha: 0, duration: 600, onComplete: () => plushie.destroy() });
          this.checkChestUnlock();
        });
      });
    });
  }

  collectSketchbook() {
    const { width, height } = this.scale;
    const sketchbook = this.add.image(width / 2, height * 0.4, "sketchbook").setOrigin(0.5).setDepth(60).setAlpha(0);
    sketchbook.setScale(this.imageScale(sketchbook, 0.25, 0.3));
    this.tweens.add({ targets: sketchbook, alpha: 1, duration: 800 });

    this.playDialogueSequence([
      "Some pages are beautiful.",
      "Others are unfinished.",
      "Others are complete nonsense.",
      "Not every masterpiece needs to be finished."
    ], () => {
      this.keepsakesCollected.sketchbook = true;
      this.markKeepsakeCollected("desk");
      this.autosave();
      this.updateInventoryHUD();

      this.lightCandle();
      this.time.delayedCall(1000, () => {
        this.tweens.add({ targets: sketchbook, alpha: 0, duration: 600, onComplete: () => sketchbook.destroy() });
        this.checkChestUnlock();
      });
    });
  }

  lightCandle() {
    const { width, height } = this.scale;
    const candle = this.add.circle(width * 0.75, height * 0.5, 8, 0xffd56a, 0).setDepth(15);
    this.tweens.add({ targets: candle, alpha: 0.8, duration: 500 });
    this.tweens.add({
      targets: candle,
      scale: { from: 1, to: 1.3 },
      alpha: { from: 0.8, to: 0.4 },
      duration: 800,
      yoyo: true,
      repeat: -1
    });
  }

  collectDreamList() {
    const { width, height } = this.scale;
    const dreamList = this.add.image(width / 2, height * 0.4, "dream_list").setOrigin(0.5).setDepth(60).setAlpha(0);
    dreamList.setScale(this.imageScale(dreamList, 0.3, 0.35));
    this.tweens.add({ targets: dreamList, alpha: 1, duration: 800 });

    this.playDialogueSequence([
      "Places to visit.",
      "Things to learn.",
      "Dreams for the future.",
      "Tiny goals.",
      "Big goals.",
      "Impossible goals.",
      "",
      "Hopefully with him."
    ], () => {
      this.keepsakesCollected.dreamList = true;
      this.rosePetalCount = Math.max(this.rosePetalCount, 8);
      this.markKeepsakeCollected("mirror");
      this.autosave();
      this.updateInventoryHUD();

      this.time.delayedCall(1000, () => {
        this.playDialogueSequence(["I always wanted you there."], () => {
          this.tweens.add({ targets: dreamList, alpha: 0, duration: 600, onComplete: () => dreamList.destroy() });
          this.checkChestUnlock();
        });
      });
    });
  }

  collectLetter() {
    const { width, height } = this.scale;
    const letter = this.add.image(width / 2, height * 0.4, "letter").setOrigin(0.5).setDepth(60).setAlpha(0);
    letter.setScale(this.imageScale(letter, 0.25, 0.3));
    this.tweens.add({ targets: letter, alpha: 1, duration: 800 });

    this.playDialogueSequence([
      "If you've made it this far...",
      "Then you've been looking very carefully.",
      "Good.",
      "I wanted you to.",
      "Because this room isn't really about things.",
      "It's about being known.",
      "And you always made me feel seen."
    ], () => {
      this.keepsakesCollected.letter = true;
      this.markKeepsakeCollected("wardrobe");
      this.autosave();
      this.updateInventoryHUD();

      this.time.delayedCall(1000, () => {
        this.tweens.add({ targets: letter, alpha: 0, duration: 600, onComplete: () => letter.destroy() });
        this.checkChestUnlock();
      });
    });
  }

  markKeepsakeCollected(hotspotId) {
    if (this.keepsakeHotspots[hotspotId]) {
      this.keepsakeHotspots[hotspotId].destroy();
      delete this.keepsakeHotspots[hotspotId];
    }
  }

  checkChestUnlock() {
    if (this.getKeepsakesCollected() === 5 && !this.bedroomState.chestUnlocked) {
      this.bedroomState.chestUnlocked = true;
      this.autosave();
      this.unlockChest();
    }
  }

  unlockChest() {
    const { width, height } = this.scale;
    this.chest.setTexture("chest_opened");
    this.chest.setScale(this.imageScale(this.chest, 0.12, 0.14));

    this.playDialogueSequence([
      "Inside rests no treasure.",
      "No artifact.",
      "No mystery.",
      "Only photographs.",
      "Letters.",
      "Little objects.",
      "Small memories.",
      "A life."
    ], () => {
      this.playFinalChestDialogue();
    });
  }

  playFinalChestDialogue() {
    this.playDialogueSequence([
      "People spend their whole lives hoping someone will understand them.",
      "Thank you for trying.",
      "Thank you for staying.",
      "",
      "You found everything."
    ], () => {
      this.showPlayerResponse();
    });
  }

  showPlayerResponse() {
    this.playDialogueSequence(["I think so."], () => {
      this.time.delayedCall(1500, () => {
        this.playDialogueSequence(["No."], () => {
          this.time.delayedCall(1500, () => {
            this.playDialogueSequence(["You found me."], () => {
              this.completeBedroom();
            });
          });
        });
      });
    });
  }

  completeBedroom() {
    this.bedroomState.bedroomComplete = true;
    this.autosave();

    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.time.delayedCall(1600, () => {
      this.background.setTexture("bedroom_restored");
      this.coverImage(this.background);
      this.cameras.main.fadeIn(2000, 0, 0, 0);

      this.time.delayedCall(2200, () => {
        this.warmOverlay.setAlpha(0.15);
        this.revealCrest();
      });
    });
  }

  revealCrest() {
    const { width, height } = this.scale;
    const crest = this.add.image(width / 2, height * 0.4, "crest_of_understanding").setOrigin(0.5);
    crest.setScale(this.imageScale(crest, 0.28, 0.34)).setAlpha(0);
    crest.setDepth(60);
    this.tweens.add({ targets: crest, alpha: 1, duration: 900 });

    this.time.delayedCall(1200, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF UNDERSTANDING", () => {
        this.memoryCrestCount = (this.memoryCrestCount || 0) + 1;
        this.rosePetalCount = Math.max(this.rosePetalCount, 9);
        logProgressEvent("CREST COLLECTED", { scene: "BedroomScene", crest: "Crest of Understanding" });
        logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
        this.progress.bedroomComplete = true;
        this.progress.chapterFiveUnlocked = true;
        logProgressEvent("BEDROOM COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });
        logProgressEvent("CHAPTER UNLOCKED", { chapter: 5 });
        this.progress.memoryCrests = this.memoryCrestCount;
        this.progress.rosePetals = this.rosePetalCount;
        this.autosave();
        this.updateInventoryHUD();

        this.time.delayedCall(1000, () => {
          this.tweens.add({ targets: crest, alpha: 0, duration: 600, onComplete: () => crest.destroy() });
          this.showFinalPetal();
        });
      });
    });
  }

  showFinalPetal() {
    const { width, height } = this.scale;
    const petal = this.add.image(width * 0.5, height * 0.45, "rosePetal").setOrigin(0.5).setDepth(60).setAlpha(0);
    petal.setScale(0.3);
    this.tweens.add({ targets: petal, alpha: 1, duration: 800 });

    this.playDialogueSequence([
      "You really were jealous of the plushie.",
      "Don't deny it."
    ], () => {
      this.time.delayedCall(1500, () => {
        this.tweens.add({ targets: petal, alpha: 0, duration: 600, onComplete: () => petal.destroy() });
        this.returnToGrandHall();
      });
    });
  }

  showQuestBanner(text, onComplete) {
    const { width, height } = this.scale;
    const banner = this.add.container(0, 0).setDepth(70).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.72).setOrigin(0);
    const bannerText = this.add.text(width / 2, height / 2, text, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 48))}px`,
      color: "#f4d7b7",
      align: "center",
      backgroundColor: "#0a0808",
      padding: { x: 16, y: 12 }
    }).setOrigin(0.5);
    banner.add([shade, bannerText]);
    this.tweens.add({ targets: banner, alpha: 1, duration: 600 });

    this.input.once("pointerdown", () => {
      this.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 500,
        onComplete: () => {
          banner.destroy();
          if (onComplete) onComplete();
        }
      });
    });
  }

  setupCompleteView() {
    this.warmOverlay.setAlpha(0.15);
    this.enableHotspots();
  }

  returnToGrandHall() {
    this.autosave();
    this.playDialogueSequence(["The house remembers."], () => {
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.time.delayedCall(1500, () => {
        this.scene.start("GrandHallScene", { fromBedroom: true });
      });
    }, [800]);
  }

  playDialogueSequence(lines, onComplete = null, extraDelays = []) {
    const queue = [...lines];
    let delayIndex = 0;

    const playNext = () => {
      if (queue.length === 0) {
        if (onComplete) onComplete();
        return;
      }

      const line = queue.shift();
      const extraDelay = extraDelays[delayIndex] || 0;
      delayIndex++;

      this.dialogue.show(line, () => {
        this.time.delayedCall(500 + extraDelay, playNext);
      });
    };

    playNext();
  }
}
