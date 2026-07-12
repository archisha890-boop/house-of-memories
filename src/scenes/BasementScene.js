import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";

const TEXTURES = {
  door: "basementDoor",
  unrestored: "basementUnrestored",
  restored: "basementRestored",
  brokenMirror: "brokenMirrorRoom",
  restoredMirror: "restoredMirror",
  storage: "storageRoom",
  flooded: "floodedChamber",
  fragment: "mirrorFragment",
  crest: "crestEndurance",
  rosePetal: "rosePetal"
};

const HOTSPOTS = {
  storage: { x: 0.18, y: 0.58, w: 0.22, h: 0.22, fragment: 0 },
  debris: { x: 0.36, y: 0.66, w: 0.22, h: 0.18, fragment: 1 },
  chest: { x: 0.69, y: 0.64, w: 0.2, h: 0.18, fragment: 2 },
  flooded: { x: 0.84, y: 0.48, w: 0.2, h: 0.24, fragment: 3 },
  hidden: { x: 0.53, y: 0.57, w: 0.2, h: 0.18, fragment: 4 },
  mirror: { x: 0.5, y: 0.42, w: 0.3, h: 0.32 },
  exit: { x: 0.08, y: 0.44, w: 0.14, h: 0.28 }
};

export class BasementScene extends Phaser.Scene {
  constructor() {
    super("BasementScene");
    this.stage = "door";
    this.busy = false;
    this.hoveredHotspot = null;
  }

  create() {
    this.progress = getHouseProgress();
    this.ensureBasementState();
    this.basementState = this.progress.basement;
    this.rosePetalCount = this.progress.rosePetals || 0;
    this.memoryCrestCount = this.progress.memoryCrests || 0;
    this.hoveredHotspot = null;
    this.busy = false;

    logProgressEvent("SCENE START", { scene: "BasementScene", progress: this.progress });

    this.cameras.main.setBackgroundColor("#020202");
    this.cameras.main.fadeIn(1100, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: true, piano: true, wind: true, thunder: true, creaks: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createBaseVisuals();
    this.createOverlays();
    this.createInventory();
    this.createVignette();
    this.createHotspots();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    if (this.basementState.basementComplete || this.progress.basementComplete) {
      this.setupCompletedBasement();
    } else if (this.basementState.entered) {
      this.showMainBasement();
    } else {
      this.showDoorIntro();
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "BasementScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.autosave();
      if (this.audio) this.audio.destroy();
      this.scale.off("resize", this.resizeScene, this);
    });
  }

  update(_, deltaMs) {
    if (this.dialogue) this.dialogue.update(deltaMs / 1000);
    this.updateGlow();
    this.updateDust();
  }

  ensureBasementState() {
    const defaults = {
      entered: false,
      fragments: [false, false, false, false, false],
      mirrorRestored: false,
      basementComplete: false,
      crestCollected: false,
      petalThirteenCollected: false,
      petalFourteenCollected: false,
      petalFifteenCollected: false
    };
    const current = this.progress.basement || {};
    this.progress.basement = {
      ...defaults,
      ...current,
      basementComplete: Boolean(current.basementComplete || this.progress.basementComplete),
      fragments: defaults.fragments.map((value, index) => Boolean((current.fragments || [])[index] ?? value))
    };
  }

  createBaseVisuals() {
    this.background = this.add.image(0, 0, TEXTURES.door).setOrigin(0.5).setDepth(0);
    this.coverImage(this.background);
    this.scale.on("resize", this.resizeScene, this);
  }

  resizeScene() {
    if (this.background) this.coverImage(this.background);
    if (this.closeupImage) this.coverImage(this.closeupImage);
    if (this.mirrorImage) this.positionMirror();
    if (this.mirrorCaption) this.mirrorCaption.setPosition(this.scale.width * 0.5, this.scale.height * 0.66);
    if (this.doorHotspot) {
      this.doorHotspot.setPosition(this.scale.width * 0.53, this.scale.height * 0.54);
      this.doorHotspot.setSize(this.scale.width * 0.14, this.scale.height * 0.18);
    }
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
    this.silverOverlay = this.add.rectangle(0, 0, width, height, 0xd9e6ff, 0).setOrigin(0).setDepth(6);
    this.warmOverlay = this.add.rectangle(0, 0, width, height, 0xffc47d, 0).setOrigin(0).setDepth(5);
    this.flash = this.add.rectangle(0, 0, width, height, 0xf4f1ff, 0).setOrigin(0).setDepth(72);
    this.dust = [];
    for (let i = 0; i < 18; i += 1) {
      const mote = this.add.circle(Math.random() * width, Math.random() * height, 1.5 + Math.random() * 2, 0xd9c6a6, 0.08).setDepth(7);
      this.dust.push(mote);
    }
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
    this.vignette.fillStyle(0x000000, 0.28);
    this.vignette.fillRect(0, 0, width, height);
    this.vignette.fillStyle(0x000000, 0.62);
    this.vignette.fillRect(0, 0, width, height * 0.09);
    this.vignette.fillRect(0, height * 0.91, width, height * 0.09);
    this.vignette.fillRect(0, 0, width * 0.05, height);
    this.vignette.fillRect(width * 0.95, 0, width * 0.05, height);
  }

  createHotspots() {
    const { width, height } = this.scale;
    this.hotspots = {};
    Object.entries(HOTSPOTS).forEach(([id, spot]) => {
      const hotspot = this.add.rectangle(width * spot.x, height * spot.y, width * spot.w, height * spot.h, 0xffffff, 0).setDepth(42);
      hotspot.on("pointerover", () => this.hoveredHotspot = id);
      hotspot.on("pointerout", () => {
        if (this.hoveredHotspot === id) this.hoveredHotspot = null;
      });
      hotspot.on("pointerdown", () => this.handleHotspot(id));
      this.hotspots[id] = hotspot;
    });
  }

  showDoorIntro() {
    this.stage = "door";
    this.background.setTexture(TEXTURES.door);
    this.coverImage(this.background);
    this.disableAllHotspots();
    this.createDoorHandleHotspot();
  }

  createDoorHandleHotspot() {
    const { width, height } = this.scale;
    if (this.doorHotspot) this.doorHotspot.destroy();
    this.doorHotspot = this.add.rectangle(width * 0.53, height * 0.54, width * 0.14, height * 0.18, 0xffffff, 0)
      .setDepth(42)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => this.hoveredHotspot = "door")
      .on("pointerout", () => {
        if (this.hoveredHotspot === "door") this.hoveredHotspot = null;
      })
      .once("pointerdown", () => {
        this.doorHotspot.disableInteractive();
        this.openBasementDoor();
      });
  }

  openBasementDoor() {
    this.busy = true;
    this.time.delayedCall(120, () => {
      this.playDialogueSequence(["The handle is cold."], () => {
        this.cameras.main.zoomTo(1.04, 900);
        this.cameras.main.fadeOut(1200, 0, 0, 0);
        this.time.delayedCall(1250, () => {
          if (this.doorHotspot) {
            this.doorHotspot.destroy();
            this.doorHotspot = null;
          }
          this.basementState.entered = true;
          this.autosave();
          this.cameras.main.setZoom(1);
          this.showMainBasement(true);
        });
      });
    });
  }

  showMainBasement(fromDoor = false) {
    this.stage = "basement";
    this.background.setTexture(this.basementState.basementComplete ? TEXTURES.restored : TEXTURES.unrestored);
    this.coverImage(this.background);
    this.createMirrorDisplay();
    this.updateRoomWarmth();
    this.updateInventoryHUD();
    this.cameras.main.fadeIn(fromDoor ? 1400 : 900, 0, 0, 0);
    this.time.delayedCall(fromDoor ? 900 : 300, () => this.enableExploration());
  }

  createMirrorDisplay() {
    if (this.mirrorImage) this.mirrorImage.destroy();
    if (this.mirrorCaption) this.mirrorCaption.destroy();

    const { width, height } = this.scale;
    const key = this.basementState.mirrorRestored ? TEXTURES.restoredMirror : TEXTURES.brokenMirror;
    this.mirrorImage = this.add.image(width * 0.5, height * 0.42, key)
      .setOrigin(0.5)
      .setDepth(9)
      .setAlpha(this.basementState.mirrorRestored ? 0.9 : 0.66);
    this.positionMirror();

    this.mirrorCaption = this.add.text(width * 0.5, height * 0.66, "Nothing beautiful survives unchanged.\nRestore the reflection.", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(14, Math.floor(width / 82))}px`,
      color: "#d8c3a9",
      align: "center",
      lineSpacing: 4,
      backgroundColor: "#070506",
      padding: { x: 12, y: 8 }
    }).setOrigin(0.5).setDepth(45).setAlpha(this.basementState.mirrorRestored ? 0 : 0.8);
  }

  positionMirror() {
    const { width, height } = this.scale;
    this.mirrorImage.setPosition(width * 0.5, height * 0.42);
    this.mirrorImage.setScale(this.fitImage(this.mirrorImage, 0.34, 0.32));
  }

  enableExploration() {
    this.stage = "explore";
    this.busy = false;
    Object.entries(this.hotspots).forEach(([id, hotspot]) => {
      if (!this.isHotspotAvailable(id)) {
        hotspot.disableInteractive();
        return;
      }
      hotspot.setInteractive({ useHandCursor: true });
    });
  }

  isHotspotAvailable(id) {
    if (id === "exit") return true;
    if (id === "mirror") return this.basementState.mirrorRestored && !this.basementState.crestCollected;
    const next = this.nextFragmentIndex();
    const spot = HOTSPOTS[id];
    return spot && spot.fragment === next;
  }

  nextFragmentIndex() {
    return this.basementState.fragments.findIndex((fragment) => !fragment);
  }

  disableAllHotspots() {
    Object.values(this.hotspots).forEach((hotspot) => hotspot.disableInteractive());
  }

  handleHotspot(id) {
    if (this.busy || this.stage !== "explore") return;
    if (!this.isHotspotAvailable(id)) return;
    this.disableAllHotspots();
    this.busy = true;

    if (id === "storage") this.fragmentOne();
    if (id === "debris") this.fragmentTwo();
    if (id === "chest") this.fragmentThree();
    if (id === "flooded") this.fragmentFour();
    if (id === "hidden") this.fragmentFive();
    if (id === "mirror") this.finalMirrorDialogue();
    if (id === "exit") this.exitBasement();
  }

  openCloseup(textureKey) {
    const { width, height } = this.scale;
    this.closeupContainer = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x030202, 0.72).setOrigin(0);
    this.closeupImage = this.add.image(width / 2, height / 2, textureKey).setOrigin(0.5);
    this.coverImage(this.closeupImage);
    this.closeupContainer.add([shade, this.closeupImage]);
    this.tweens.add({ targets: this.closeupContainer, alpha: 1, duration: 650 });
  }

  closeCloseup(onComplete = null) {
    if (!this.closeupContainer) {
      if (onComplete) onComplete();
      return;
    }
    this.tweens.add({
      targets: this.closeupContainer,
      alpha: 0,
      duration: 550,
      onComplete: () => {
        this.closeupContainer.destroy();
        this.closeupContainer = null;
        this.closeupImage = null;
        if (onComplete) onComplete();
      }
    });
  }

  fragmentOne() {
    this.stage = "fragment-one";
    this.openCloseup(TEXTURES.storage);
    this.playDialogueSequence(["Forgotten furniture waits beneath white sheets.", "Something catches the lantern light."], () => {
      this.showFragmentInCloseup(() => {
        this.closeCloseup(() => this.returnFragment(0, [
          "Not every day was easy.",
          "But you stayed anyway."
        ]));
      });
    });
  }

  fragmentTwo() {
    this.stage = "fragment-two";
    this.playDialogueSequence(["You clear the collapsed wall piece by piece.", "A shard waits beneath the dust."], () => {
      this.returnFragment(1, [
        "Sometimes I worried I wasn't enough.",
        "You always thought you were enough."
      ], () => this.awardRosePetal("petalThirteenCollected", 13, "Basement collapsed wall"));
    });
  }

  fragmentThree() {
    this.stage = "fragment-three";
    this.playDialogueSequence([
      "Old letters spill from a broken drawer.",
      "A hidden key falls between them.",
      "The locked chest opens with a tired click."
    ], () => {
      this.returnFragment(2, [
        "Sometimes we misunderstood each other.",
        "Sometimes we got things wrong.",
        "And then we tried again."
      ]);
    });
  }

  fragmentFour() {
    this.stage = "fragment-four";
    this.openCloseup(TEXTURES.flooded);
    this.playDialogueSequence(["Broken boards creak over black water.", "You step carefully."], () => {
      this.showFragmentInCloseup(() => {
        this.closeCloseup(() => this.returnFragment(3, [
          "Love isn't the absence of storms.",
          "It's finding someone worth weathering them with.",
          "Thank you for staying during the storms."
        ], () => this.awardRosePetal("petalFourteenCollected", 14, "Basement flooded chamber")));
      });
    });
  }

  fragmentFive() {
    this.stage = "fragment-five";
    this.playDialogueSequence([
      "A sealed section of the basement gives way.",
      "The final shard rests in the dark."
    ], () => {
      this.returnFragment(4, [
        "I was afraid sometimes.",
        "Afraid of losing memories.",
        "Afraid of losing people.",
        "Afraid of being forgotten.",
        "Then I remembered something.",
        "You were still here."
      ], null, () => this.restoreMirror());
    });
  }

  showFragmentInCloseup(onComplete) {
    const { width, height } = this.scale;
    const fragment = this.add.image(width / 2, height * 0.5, TEXTURES.fragment)
      .setOrigin(0.5)
      .setDepth(68)
      .setAlpha(0);
    fragment.setScale(this.fitImage(fragment, 0.22, 0.24));
    this.tweens.add({ targets: fragment, alpha: 1, duration: 600 });
    this.time.delayedCall(900, () => {
      this.tweens.add({
        targets: fragment,
        alpha: 0,
        duration: 350,
        onComplete: () => {
          fragment.destroy();
          if (onComplete) onComplete();
        }
      });
    });
  }

  returnFragment(index, dialogueLines, beforeDialogue = null, afterDialogue = null) {
    const { width, height } = this.scale;
    const from = HOTSPOTS[Object.keys(HOTSPOTS).find((key) => HOTSPOTS[key].fragment === index)];
    const fragment = this.add.image(width * from.x, height * from.y, TEXTURES.fragment)
      .setOrigin(0.5)
      .setDepth(66)
      .setAlpha(0);
    fragment.setScale(this.fitImage(fragment, 0.1, 0.12));

    this.tweens.add({ targets: fragment, alpha: 1, duration: 350 });
    this.tweens.add({
      targets: fragment,
      x: this.mirrorImage.x,
      y: this.mirrorImage.y,
      scaleX: fragment.scaleX * 0.35,
      scaleY: fragment.scaleY * 0.35,
      alpha: 0.2,
      duration: 1050,
      ease: "Sine.easeInOut",
      onComplete: () => {
        fragment.destroy();
        this.basementState.fragments[index] = true;
        this.autosave();
        this.updateMirrorProgress();
        if (beforeDialogue) beforeDialogue();
        this.playDialogueSequence(dialogueLines, () => {
          this.updateInventoryHUD();
          if (afterDialogue) {
            afterDialogue();
            return;
          }
          this.enableExploration();
        });
      }
    });
  }

  updateMirrorProgress() {
    const count = this.getFragmentCount();
    this.updateRoomWarmth();
    if (!this.mirrorImage || this.basementState.mirrorRestored) return;
    this.tweens.add({
      targets: this.mirrorImage,
      alpha: 0.62 + count * 0.055,
      duration: 500,
      yoyo: true,
      hold: 250
    });
    this.cameras.main.shake(180, 0.0015);
  }

  restoreMirror() {
    this.stage = "mirror-restoring";
    this.disableAllHotspots();
    this.basementState.mirrorRestored = true;
    this.autosave();

    this.cameras.main.shake(650, 0.002);
    this.tweens.add({ targets: this.silverOverlay, alpha: 0.34, duration: 700, yoyo: true, repeat: 1 });
    this.time.delayedCall(600, () => {
      this.mirrorImage.setTexture(TEXTURES.restoredMirror);
      this.positionMirror();
      this.mirrorImage.setAlpha(0);
      if (this.mirrorCaption) this.mirrorCaption.setAlpha(0);
      this.tweens.add({ targets: this.mirrorImage, alpha: 0.92, duration: 1200 });
      this.createSilverParticles();
    });

    this.time.delayedCall(1900, () => this.restoreRoom());
  }

  restoreRoom() {
    const restored = this.add.image(0, 0, TEXTURES.restored).setOrigin(0.5).setDepth(1).setAlpha(0);
    this.coverImage(restored);
    this.tweens.add({ targets: this.warmOverlay, alpha: 0.24, duration: 1200, yoyo: true, hold: 600 });
    this.tweens.add({
      targets: restored,
      alpha: 1,
      duration: 2400,
      onComplete: () => {
        this.background.setTexture(TEXTURES.restored);
        this.coverImage(this.background);
        restored.destroy();
        this.playDialogueSequence(["The basement breathes again."], () => this.enableExploration());
      }
    });
  }

  createSilverParticles() {
    const { width, height } = this.scale;
    for (let i = 0; i < 14; i += 1) {
      const particle = this.add.circle(width * (0.38 + Math.random() * 0.24), height * (0.25 + Math.random() * 0.28), 2 + Math.random() * 3, 0xdfe8ff, 0.5).setDepth(67);
      this.tweens.add({
        targets: particle,
        y: particle.y - height * 0.16,
        alpha: 0,
        duration: 1200 + Math.random() * 700,
        onComplete: () => particle.destroy()
      });
    }
  }

  finalMirrorDialogue() {
    this.stage = "final-mirror";
    this.playDialogueSequence([
      "Were you really afraid?",
      "Sometimes.",
      "Me too.",
      "I know.",
      "The player turns.",
      "Only rose petals remain."
    ], () => this.showFinalPetal());
  }

  showFinalPetal() {
    const { width, height } = this.scale;
    this.stage = "final-petal";
    this.finalPetal = this.add.image(width * 0.5, height * 0.55, TEXTURES.rosePetal)
      .setOrigin(0.5)
      .setDepth(68)
      .setAlpha(0);
    this.finalPetal.setScale(this.fitImage(this.finalPetal, 0.08, 0.08));
    this.tweens.add({ targets: this.finalPetal, alpha: 1, duration: 650 });
    this.tweens.add({ targets: this.finalPetal, scaleX: this.finalPetal.scaleX * 1.12, scaleY: this.finalPetal.scaleY * 1.12, duration: 900, yoyo: true, repeat: -1 });
    this.finalPetal.setInteractive({ useHandCursor: true }).once("pointerdown", () => this.collectFinalPetal());
  }

  collectFinalPetal() {
    this.finalPetal.disableInteractive();
    this.awardRosePetal("petalFifteenCollected", 15, "Basement restored mirror");
    this.playDialogueSequence(["Thank you for finding me."], () => {
      this.tweens.add({
        targets: this.finalPetal,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          this.finalPetal.destroy();
          this.revealCrest();
        }
      });
    });
  }

  revealCrest() {
    const { width, height } = this.scale;
    const crest = this.add.image(width / 2, height * 0.42, TEXTURES.crest)
      .setOrigin(0.5)
      .setDepth(69)
      .setAlpha(0);
    crest.setScale(this.fitImage(crest, 0.34, 0.36));
    this.tweens.add({ targets: crest, alpha: 1, duration: 900 });

    this.time.delayedCall(950, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF ENDURANCE", () => {
        if (!this.basementState.crestCollected) {
          this.basementState.crestCollected = true;
          this.basementState.basementComplete = true;
          this.progress.basementComplete = true;
          this.progress.chapterSevenUnlocked = true;
          this.memoryCrestCount = Math.max(this.memoryCrestCount + 1, 5);
          this.progress.memoryCrests = this.memoryCrestCount;
          logProgressEvent("CREST COLLECTED", { scene: "BasementScene", crest: "Crest of Endurance" });
          logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
          logProgressEvent("BASEMENT COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });
        }
        this.autosave();
        this.updateInventoryHUD();
        this.tweens.add({
          targets: crest,
          alpha: 0,
          duration: 550,
          onComplete: () => {
            crest.destroy();
            this.exitBasement(true);
          }
        });
      });
    });
  }

  awardRosePetal(flag, targetCount, source) {
    if (this.basementState[flag]) return;
    this.basementState[flag] = true;
    this.rosePetalCount = Math.max(this.rosePetalCount + 1, targetCount);
    this.progress.rosePetals = this.rosePetalCount;
    logProgressEvent("ROSE PETAL COLLECTED", { scene: "BasementScene", source });
    logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
    this.autosave();
    this.updateInventoryHUD();
  }

  setupCompletedBasement() {
    this.stage = "complete";
    this.background.setTexture(TEXTURES.restored);
    this.coverImage(this.background);
    this.basementState.mirrorRestored = true;
    this.createMirrorDisplay();
    this.updateInventoryHUD();
    this.enableExploration();
  }

  exitBasement(fromCompletion = false) {
    if (!this.basementState.basementComplete && !fromCompletion) {
      this.playDialogueSequence(["The mirror is still broken."], () => this.enableExploration());
      return;
    }
    this.autosave();
    this.cameras.main.fadeOut(1000, 0, 0, 0);
    this.time.delayedCall(1050, () => this.scene.start("GrandHallScene", { fromBasement: true }));
  }

  updateRoomWarmth() {
    const count = this.getFragmentCount();
    if (this.warmOverlay) this.warmOverlay.setAlpha(Math.min(0.16, count * 0.03));
  }

  updateInventoryHUD() {
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    if (!this.inventoryText) return;
    this.inventoryText.setText(
      `Mirror Fragments: ${this.getFragmentCount()} / 5\nRose Petals: ${this.rosePetalCount} / 20\nMemory Crests: ${this.memoryCrestCount} / 6`
    );
  }

  getFragmentCount() {
    return this.basementState.fragments.filter(Boolean).length;
  }

  autosave() {
    this.progress.basement = this.basementState;
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    saveProgress();
  }

  updateGlow() {
    if (!this.hotspotGlow) return;
    this.hotspotGlow.clear();
    if (this.stage === "door" && this.doorHotspot && !this.busy) {
      const { width, height } = this.scale;
      const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
      this.hotspotGlow.fillStyle(0xcbdcff, (this.hoveredHotspot === "door" ? 0.24 : 0.09) + pulse * 0.11);
      this.hotspotGlow.fillEllipse(width * 0.53, height * 0.54, width * 0.14, height * 0.1);
      return;
    }
    if (this.stage !== "explore" || this.busy) return;

    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    Object.entries(HOTSPOTS).forEach(([id, spot]) => {
      if (!this.isHotspotAvailable(id)) return;
      const color = id === "mirror" ? 0xcbdcff : id === "exit" ? 0xbfd7ff : 0xd8b28d;
      const alpha = (this.hoveredHotspot === id ? 0.24 : 0.09) + pulse * 0.11;
      this.hotspotGlow.fillStyle(color, alpha);
      this.hotspotGlow.fillEllipse(width * spot.x, height * spot.y, width * spot.w, height * spot.h * 0.65);
    });
  }

  updateDust() {
    if (!this.dust || this.stage === "door") return;
    this.dust.forEach((mote, index) => {
      mote.y -= 0.025 + index * 0.001;
      mote.x += Math.sin(this.time.now * 0.0008 + index) * 0.015;
      if (mote.y < -6) mote.y = this.scale.height + 6;
    });
  }

  showQuestBanner(text, onComplete) {
    const { width, height } = this.scale;
    const banner = this.add.container(0, 0).setDepth(74).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.76).setOrigin(0);
    const bannerText = this.add.text(width / 2, height / 2, text, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 48))}px`,
      color: "#f4d7b7",
      align: "center",
      lineSpacing: 10,
      backgroundColor: "#0a0808",
      padding: { x: 18, y: 14 }
    }).setOrigin(0.5);
    banner.add([shade, bannerText]);
    this.tweens.add({ targets: banner, alpha: 1, duration: 500 });
    this.input.once("pointerdown", () => {
      this.tweens.add({
        targets: banner,
        alpha: 0,
        duration: 450,
        onComplete: () => {
          banner.destroy();
          if (onComplete) onComplete();
        }
      });
    });
  }

  playDialogueSequence(lines, onComplete = null) {
    const queue = [...lines];
    const next = () => {
      if (queue.length === 0) {
        if (onComplete) onComplete();
        return;
      }
      this.dialogue.show(queue.shift(), () => this.time.delayedCall(420, next));
    };
    next();
  }
}
