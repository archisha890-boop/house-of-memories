import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";
import { fadeSwap, fadeToScene, revealScene } from "../systems/SceneTransition.js";

const TEXTURES = {
  staircase: "observatoryStaircase",
  unrestored: "observatoryUnrestored",
  restored: "observatoryRestored",
  telescope: "telescopeCloseup",
  orrery: "orreryCloseup",
  starChart: "starChartCloseup",
  mechanism: "celestialMechanism",
  rosePetal: "rosePetal",
  crimsonRose: "crimsonRose",
  crest: "crestTomorrow",
  ghost: "ghostGirlFront"
};

const HOTSPOTS = {
  fragments: { x: 0.24, y: 0.55, w: 0.22, h: 0.22, constellation: 0 },
  telescope: { x: 0.78, y: 0.48, w: 0.2, h: 0.24, constellation: 1 },
  orrery: { x: 0.5, y: 0.61, w: 0.2, h: 0.2, constellation: 2 },
  starChart: { x: 0.18, y: 0.34, w: 0.2, h: 0.18, constellation: 3 },
  dome: { x: 0.5, y: 0.2, w: 0.32, h: 0.22, constellation: 4 },
  exit: { x: 0.08, y: 0.58, w: 0.14, h: 0.25 }
};

const STAR_FRAGMENT_POINTS = [
  { x: 0.2, y: 0.42 },
  { x: 0.3, y: 0.33 },
  { x: 0.38, y: 0.52 }
];

export class ObservatoryScene extends Phaser.Scene {
  constructor() {
    super("ObservatoryScene");
    this.stage = "staircase";
    this.busy = false;
    this.hoveredHotspot = null;
  }

  create() {
    this.progress = getHouseProgress();
    this.ensureObservatoryState();
    this.observatoryState = this.progress.observatory;
    this.rosePetalCount = this.progress.rosePetals || 0;
    this.memoryCrestCount = this.progress.memoryCrests || 0;
    this.busy = false;
    this.hoveredHotspot = null;
    this.activePuzzleObjects = [];

    logProgressEvent("SCENE START", { scene: "ObservatoryScene", progress: this.progress });

    this.cameras.main.setBackgroundColor("#020309");
    this.resetCameraFraming();

    this.audio = new SceneAudio(this, { rain: false, piano: true, wind: true, thunder: false, creaks: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createBaseVisuals();
    this.createOverlays();
    this.createInventory();
    this.createVignette();
    this.createHotspots();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();
    revealScene(this, 1100);

    this.time.delayedCall(200, () => {
      if (this.observatoryState.observatoryComplete || this.progress.observatoryComplete) {
        this.setupCompletedObservatory();
      } else if (this.observatoryState.staircaseClimbed) {
        this.showMainObservatory(false);
      } else {
        this.playStaircaseClimb();
      }
    });

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "ObservatoryScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.cleanupPuzzleObjects();
      this.autosave();
      if (this.audio) this.audio.destroy();
      this.scale.off("resize", this.resizeScene, this);
    });
  }

  update(_, deltaMs) {
    if (this.dialogue) this.dialogue.update(deltaMs / 1000);
    this.updateGlow();
    this.updateStarMotes();
    if (this.mechanism && this.stage !== "staircase") this.mechanism.rotation += 0.00035 + this.getConstellationCount() * 0.00025;
  }

  ensureObservatoryState() {
    const defaults = {
      entered: false,
      constellations: [false, false, false, false, false],
      staircaseClimbed: false,
      telescopeSolved: false,
      orrerySolved: false,
      starChartSolved: false,
      crimsonRoseAssembled: false,
      crestCollected: false,
      observatoryComplete: false,
      petalSixteenCollected: false,
      petalSeventeenCollected: false,
      petalEighteenCollected: false,
      petalNineteenCollected: false,
      petalTwentyCollected: false
    };
    // Preserve object reference by mutating existing object instead of creating new one
    if (!this.progress.observatory) {
      this.progress.observatory = { ...defaults };
    } else {
      Object.keys(defaults).forEach(key => {
        if (this.progress.observatory[key] === undefined) {
          this.progress.observatory[key] = defaults[key];
        }
      });
    }
    // Synchronize completion flags
    this.progress.observatory.observatoryComplete = Boolean(this.progress.observatory.observatoryComplete || this.progress.observatoryComplete);
    this.progress.observatory.crimsonRoseAssembled = Boolean(this.progress.observatory.crimsonRoseAssembled || this.progress.crimsonRoseAcquired);
    // Normalize constellations array
    this.progress.observatory.constellations = defaults.constellations.map((value, index) => Boolean((this.progress.observatory.constellations || [])[index] ?? value));
  }

  createBaseVisuals() {
    this.background = this.add.image(0, 0, TEXTURES.staircase).setOrigin(0.5).setDepth(0);
    this.coverImage(this.background);
    this.scale.on("resize", this.resizeScene, this);
  }

  resizeScene() {
    this.resetCameraFraming(this.cameras.main.zoom);
    if (this.background) this.coverImage(this.background);
    if (this.closeupImage) this.coverImage(this.closeupImage);
    if (this.mechanism) this.positionMechanism();
    if (this.objectiveText) this.objectiveText.setPosition(24, 24);
    if (this.inventoryText) {
      this.inventoryText.setPosition(this.scale.width - 26, 24);
      this.inventoryText.setFontSize(Math.max(13, Math.floor(this.scale.width / 92)));
    }
  }

  coverImage(image) {
    if (!image) return;
    const { width, height } = this.scale;
    const imageWidth = Math.max(1, image.width || image.displayWidth || 1);
    const imageHeight = Math.max(1, image.height || image.displayHeight || 1);
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / imageWidth, height / imageHeight));
  }

  fitImage(image, maxWidthRatio, maxHeightRatio) {
    const { width, height } = this.scale;
    return Math.min((width * maxWidthRatio) / image.width, (height * maxHeightRatio) / image.height);
  }

  resetCameraFraming(zoom = 1) {
    const { width, height } = this.scale;
    const camera = this.cameras.main;
    camera.panEffect?.reset?.();
    camera.setBounds(0, 0, width, height);
    camera.setScroll(0, 0);
    camera.setZoom(zoom);
  }

  createOverlays() {
    const { width, height } = this.scale;
    this.hotspotGlow = this.add.graphics().setDepth(8);
    this.constellationGraphics = this.add.graphics().setDepth(13);
    this.starMotes = [];
    this.silverOverlay = this.add.rectangle(0, 0, width, height, 0xdde8ff, 0).setOrigin(0).setDepth(6);
    this.goldOverlay = this.add.rectangle(0, 0, width, height, 0xffd38a, 0).setOrigin(0).setDepth(7);
    this.flash = this.add.rectangle(0, 0, width, height, 0xf6f1ff, 0).setOrigin(0).setDepth(72);
    for (let i = 0; i < 34; i += 1) {
      const mote = this.add.circle(Math.random() * width, Math.random() * height, 1 + Math.random() * 2.5, 0xdfe8ff, 0.08 + Math.random() * 0.12).setDepth(10);
      this.starMotes.push(mote);
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

    this.objectiveText = this.add.text(24, 24, "", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(12, Math.floor(width / 98))}px`,
      color: "#d9d4ff",
      backgroundColor: "#050509",
      padding: { x: 12, y: 8 },
      lineSpacing: 6
    }).setOrigin(0).setDepth(55).setAlpha(0);
  }

  createVignette() {
    const { width, height } = this.scale;
    this.vignette = this.add.graphics().setDepth(50);
    this.vignette.fillStyle(0x000000, 0.2);
    this.vignette.fillRect(0, 0, width, height);
    this.vignette.fillStyle(0x000000, 0.5);
    this.vignette.fillRect(0, 0, width, height * 0.08);
    this.vignette.fillRect(0, height * 0.92, width, height * 0.08);
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

  playStaircaseClimb() {
    this.stage = "staircase";
    this.disableAllHotspots();
    this.background.setTexture(TEXTURES.staircase);
    this.coverImage(this.background);
    this.playDialogueSequence([
      "The brass plaque reads:",
      "WHAT STILL AWAITS US",
      "The staircase rises into cold starlight.",
      "It feels far longer than the tower could possibly be."
    ], () => {
      this.tweens.add({ targets: this.silverOverlay, alpha: 0.16, duration: 1800, yoyo: true, hold: 800 });
      this.time.delayedCall(900, () => {
        fadeSwap(this, () => {
          this.observatoryState.entered = true;
          this.observatoryState.staircaseClimbed = true;
          this.autosave();
          this.showMainObservatory(true);
        }, { fadeOut: 800, fadeIn: 1100 });
      });
    });
  }

  showMainObservatory(fromStaircase) {
    this.resetCameraFraming();
    this.stage = "observatory";
    this.background.setTexture(this.observatoryState.observatoryComplete ? TEXTURES.restored : TEXTURES.unrestored);
    this.coverImage(this.background);
    this.createMechanism();
    this.drawConstellations();
    this.updateObjective();
    this.time.delayedCall(fromStaircase ? 400 : 150, () => {
      if (this.resumeFinalSequenceIfNeeded()) return;
      if (this.getConstellationCount() === 0) {
        this.playDialogueSequence([
          "The future has lost its shape.",
          "Restore the constellations.",
          "Remember what still remains."
        ], () => this.enableExploration());
      } else {
        this.enableExploration();
      }
    });
  }

  resumeFinalSequenceIfNeeded() {
    if (this.getConstellationCount() < 5 || this.observatoryState.observatoryComplete) return false;
    if (!this.observatoryState.petalTwentyCollected) {
      this.showFinalRosebud();
      return true;
    }
    if (!this.observatoryState.crimsonRoseAssembled && !this.progress.crimsonRoseAcquired) {
      this.assembleCrimsonRose();
      return true;
    }
    if (!this.observatoryState.crestCollected) {
      this.revealTomorrowCrest();
      return true;
    }
    this.restoreObservatory();
    return true;
  }

  createMechanism() {
    if (this.mechanism) this.mechanism.destroy();
    this.mechanism = this.add.image(0, 0, TEXTURES.mechanism).setOrigin(0.5).setDepth(12).setAlpha(0.72);
    this.positionMechanism();
    this.tweens.add({
      targets: this.mechanism,
      alpha: { from: 0.6, to: 0.86 },
      scaleX: this.mechanism.scaleX * 1.03,
      scaleY: this.mechanism.scaleY * 1.03,
      duration: 2200,
      yoyo: true,
      repeat: -1
    });
  }

  positionMechanism() {
    const { width, height } = this.scale;
    this.mechanism.setPosition(width * 0.5, height * 0.56);
    this.mechanism.setScale(this.fitImage(this.mechanism, 0.24, 0.24));
  }

  enableExploration() {
    this.stage = "explore";
    this.busy = false;
    this.updateObjective();
    Object.entries(this.hotspots).forEach(([id, hotspot]) => {
      if (!this.isHotspotAvailable(id)) {
        hotspot.disableInteractive();
        return;
      }
      hotspot.setInteractive({ useHandCursor: true });
    });
  }

  isHotspotAvailable(id) {
    if (id === "exit") return this.observatoryState.observatoryComplete;
    const spot = HOTSPOTS[id];
    if (!spot || spot.constellation === undefined) return false;
    return spot.constellation === this.nextConstellationIndex();
  }

  nextConstellationIndex() {
    return this.observatoryState.constellations.findIndex((done) => !done);
  }

  disableAllHotspots() {
    Object.values(this.hotspots).forEach((hotspot) => hotspot.disableInteractive());
  }

  handleHotspot(id) {
    if (this.busy || this.stage !== "explore") return;
    if (!this.isHotspotAvailable(id)) return;
    this.disableAllHotspots();
    this.busy = true;

    if (id === "fragments") this.startJourneyConstellation();
    if (id === "telescope") this.startTelescopePuzzle();
    if (id === "orrery") this.startOrreryPuzzle();
    if (id === "starChart") this.startStarChartPuzzle();
    if (id === "dome") this.startForeverStar();
    if (id === "exit") this.descendToGrandHall();
  }

  startJourneyConstellation() {
    this.stage = "journey-fragments";
    this.collectedFragments = 0;
    this.fragmentSprites = STAR_FRAGMENT_POINTS.map((point, index) => {
      const { width, height } = this.scale;
      const star = this.add.star(width * point.x, height * point.y, 5, 4, 14, 0xdfe8ff, 0.72).setDepth(65).setAlpha(0);
      star.setInteractive({ useHandCursor: true }).once("pointerdown", () => this.collectStarFragment(star));
      this.tweens.add({ targets: star, alpha: 1, duration: 500 + index * 150 });
      this.tweens.add({ targets: star, rotation: Math.PI * 2, duration: 2600, repeat: -1 });
      return star;
    });
    this.playDialogueSequence(["Scattered star fragments tremble across the floor."], () => {});
  }

  collectStarFragment(star) {
    star.disableInteractive();
    this.collectedFragments += 1;
    this.tweens.add({
      targets: star,
      x: this.mechanism.x,
      y: this.mechanism.y,
      alpha: 0,
      duration: 650,
      onComplete: () => star.destroy()
    });
    if (this.collectedFragments === STAR_FRAGMENT_POINTS.length) {
      this.time.delayedCall(700, () => this.completeConstellation(0, {
        dialogue: ["There are still places I want to see."],
        petalFlag: "petalSixteenCollected",
        petalTarget: 16,
        petalMessage: "We are absolutely getting lost."
      }));
    }
  }

  startTelescopePuzzle() {
    this.stage = "telescope";
    this.openCloseup(TEXTURES.telescope);
    this.time.delayedCall(650, () => this.createTelescopePuzzle());
  }

  createTelescopePuzzle() {
    const { width, height } = this.scale;
    this.puzzleValue = -28;
    this.telescopeScope = this.add.container(width / 2, height * 0.52).setDepth(66);
    const ring = this.add.circle(0, 0, height * 0.14, 0x08101c, 0.5).setStrokeStyle(2, 0xdfe8ff, 0.5);
    const reticle = this.add.line(0, 0, -height * 0.12, 0, height * 0.12, 0, 0xdfe8ff, 0.45);
    const target = this.add.star(0, -height * 0.03, 5, 4, 18, 0xffe5a8, 0.75);
    this.telescopeNeedle = this.add.line(0, 0, 0, 0, 0, -height * 0.13, 0xbfd7ff, 0.86);
    this.telescopeScope.add([ring, reticle, target, this.telescopeNeedle]);
    this.activePuzzleObjects.push(this.telescopeScope);
    this.addPuzzleButton("Rotate Telescope", () => {
      this.puzzleValue += 14;
      this.telescopeNeedle.rotation = Phaser.Math.DegToRad(this.puzzleValue);
      if (this.puzzleValue === 0) this.solveTelescopePuzzle();
    });
  }

  solveTelescopePuzzle() {
    this.cleanupPuzzleObjects();
    this.observatoryState.telescopeSolved = true;
    this.closeCloseup(() => this.completeConstellation(1, {
      dialogue: ["There are still dreams I want to chase."],
      petalFlag: "petalSeventeenCollected",
      petalTarget: 17,
      petalMessage: "Some of them are probably ridiculous."
    }));
  }

  startOrreryPuzzle() {
    this.stage = "orrery";
    this.openCloseup(TEXTURES.orrery);
    this.time.delayedCall(650, () => this.createOrreryPuzzle());
  }

  createOrreryPuzzle() {
    const { width, height } = this.scale;
    this.orreryClicks = 0;
    this.orreryGroup = this.add.container(width / 2, height * 0.5).setDepth(66);
    [0.12, 0.19, 0.26].forEach((radius, index) => {
      const ring = this.add.circle(0, 0, width * radius, 0x000000, 0).setStrokeStyle(2, 0xb8a27f, 0.55);
      const planet = this.add.circle(width * radius, 0, 8 + index * 2, [0x9fc7ff, 0xffd38a, 0xdba0ff][index], 0.8);
      const orbit = this.add.container(0, 0).add([ring, planet]);
      orbit.rotation = index * 0.8;
      this.orreryGroup.add(orbit);
      this.tweens.add({ targets: orbit, rotation: orbit.rotation + Math.PI * 2, duration: 12000 + index * 3000, repeat: -1 });
    });
    this.activePuzzleObjects.push(this.orreryGroup);
    this.addPuzzleButton("Align Planets", () => {
      this.orreryClicks += 1;
      this.flash.setAlpha(0.08);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 320 });
      if (this.orreryClicks >= 3) this.solveOrreryPuzzle();
    });
  }

  solveOrreryPuzzle() {
    this.cleanupPuzzleObjects();
    this.observatoryState.orrerySolved = true;
    this.closeCloseup(() => this.completeConstellation(2, {
      dialogue: ["There are still promises I intend to keep."]
    }));
  }

  startStarChartPuzzle() {
    this.stage = "star-chart";
    this.openCloseup(TEXTURES.starChart);
    this.time.delayedCall(650, () => this.createStarChartPuzzle());
  }

  createStarChartPuzzle() {
    const { width, height } = this.scale;
    this.chartPlaced = 0;
    this.chartTargets = [
      { x: width * 0.38, y: height * 0.5 },
      { x: width * 0.5, y: height * 0.44 },
      { x: width * 0.62, y: height * 0.5 }
    ];
    this.chartTargets.forEach((target, index) => {
      const slot = this.add.rectangle(target.x, target.y, width * 0.1, height * 0.14, 0x111827, 0.5).setStrokeStyle(2, 0xdfe8ff, 0.45).setDepth(66);
      const piece = this.add.rectangle(width * (0.32 + index * 0.18), height * 0.72, width * 0.09, height * 0.12, 0x25314a, 0.82).setStrokeStyle(2, 0xd8b28d, 0.8).setDepth(67);
      piece.target = target;
      piece.homeX = piece.x;
      piece.homeY = piece.y;
      piece.setInteractive({ draggable: true, useHandCursor: true });
      this.input.setDraggable(piece);
      this.activePuzzleObjects.push(slot, piece);
    });
    this.input.on("drag", this.dragChartPiece, this);
    this.input.on("dragend", this.dropChartPiece, this);
  }

  dragChartPiece(pointer, gameObject, dragX, dragY) {
    if (this.stage !== "star-chart" || !gameObject.target) return;
    gameObject.setPosition(dragX, dragY);
  }

  dropChartPiece(pointer, gameObject) {
    if (this.stage !== "star-chart" || !gameObject.target) return;
    const distance = Phaser.Math.Distance.Between(gameObject.x, gameObject.y, gameObject.target.x, gameObject.target.y);
    if (distance < this.scale.width * 0.07) {
      gameObject.setPosition(gameObject.target.x, gameObject.target.y);
      gameObject.disableInteractive();
      this.chartPlaced += 1;
      if (this.chartPlaced >= 3) this.solveStarChartPuzzle();
      return;
    }
    this.tweens.add({ targets: gameObject, x: gameObject.homeX, y: gameObject.homeY, duration: 260 });
  }

  solveStarChartPuzzle() {
    this.input.off("drag", this.dragChartPiece, this);
    this.input.off("dragend", this.dropChartPiece, this);
    this.cleanupPuzzleObjects();
    this.observatoryState.starChartSolved = true;
    this.closeCloseup(() => this.completeConstellation(3, {
      dialogue: ["As long as you're there,", "I don't really care where home is."],
      petalFlag: "petalEighteenCollected",
      petalTarget: 18,
      petalMessage: "Even if you steal all the blankets."
    }));
  }

  startForeverStar() {
    this.stage = "forever-star";
    this.playDialogueSequence(["Look up."], () => {
      this.resetCameraFraming();
      this.cameras.main.zoomTo(1.045, 1500, "Sine.easeInOut");
      this.tweens.add({ targets: this.silverOverlay, alpha: 0.12, duration: 900, yoyo: true, hold: 500 });
      this.time.delayedCall(1600, () => this.revealGirlOnBalcony());
    });
  }

  revealGirlOnBalcony() {
    const { width, height } = this.scale;
    this.ghost = this.add.image(width * 0.5, height * 0.27, TEXTURES.ghost)
      .setOrigin(0.5, 1)
      .setDepth(67)
      .setAlpha(0);
    this.ghost.setScale(this.fitImage(this.ghost, 0.13, 0.24));
    this.tweens.add({ targets: this.ghost, alpha: 0.9, duration: 1200 });
    this.playDialogueSequence([
      "You've done enough.",
      "The last star belongs to you."
    ], () => this.createFinalStar());
  }

  createFinalStar() {
    const { width, height } = this.scale;
    const star = this.add.star(width * 0.5, height * 0.36, 6, 5, 30, 0xdfe8ff, 0.9).setDepth(68);
    this.tweens.add({ targets: star, scaleX: 1.18, scaleY: 1.18, alpha: 0.55, duration: 900, yoyo: true, repeat: -1 });
    star.setInteractive({ useHandCursor: true }).once("pointerdown", () => {
      star.disableInteractive();
      this.tweens.add({
        targets: star,
        x: this.mechanism.x,
        y: this.mechanism.y,
        alpha: 0,
        duration: 950,
        onComplete: () => {
          star.destroy();
          if (this.ghost) this.tweens.add({ targets: this.ghost, alpha: 0, duration: 900, onComplete: () => this.ghost.destroy() });
          this.cameras.main.zoomTo(1, 700, "Sine.easeInOut");
          this.completeConstellation(4, {
            dialogue: [],
            petalFlag: "petalNineteenCollected",
            petalTarget: 19,
            petalMessage: "Almost there.",
            after: () => this.showFinalRosebud()
          });
        }
      });
    });
  }

  completeConstellation(index, options = {}) {
    this.stage = "constellation-complete";
    this.observatoryState.constellations[index] = true;
    this.autosave();
    this.activateMechanism();
    this.drawConstellations();
    this.updateObjective();
    const lines = options.dialogue || [];
    this.playDialogueSequence(lines, () => {
      if (options.petalFlag) {
        this.showPetal(options.petalFlag, options.petalTarget, options.petalMessage, () => {
          if (options.after) options.after();
          else this.enableExploration();
        });
        return;
      }
      if (options.after) options.after();
      else this.enableExploration();
    });
  }

  activateMechanism() {
    this.cameras.main.shake(220, 0.0012);
    this.tweens.add({ targets: this.mechanism, alpha: 1, scaleX: this.mechanism.scaleX * 1.08, scaleY: this.mechanism.scaleY * 1.08, duration: 550, yoyo: true });
    this.tweens.add({ targets: this.silverOverlay, alpha: 0.08 + this.getConstellationCount() * 0.035, duration: 650, yoyo: true });
  }

  drawConstellations() {
    if (!this.constellationGraphics) return;
    const { width, height } = this.scale;
    this.constellationGraphics.clear();
    const patterns = [
      [{ x: 0.33, y: 0.24 }, { x: 0.38, y: 0.2 }, { x: 0.45, y: 0.25 }, { x: 0.5, y: 0.21 }],
      [{ x: 0.59, y: 0.23 }, { x: 0.64, y: 0.18 }, { x: 0.7, y: 0.23 }, { x: 0.67, y: 0.29 }, { x: 0.61, y: 0.29 }],
      [{ x: 0.43, y: 0.34 }, { x: 0.57, y: 0.34 }],
      [{ x: 0.25, y: 0.28 }, { x: 0.31, y: 0.21 }, { x: 0.37, y: 0.28 }, { x: 0.37, y: 0.35 }, { x: 0.25, y: 0.35 }],
      [{ x: 0.5, y: 0.14 }, { x: 0.54, y: 0.2 }, { x: 0.6, y: 0.2 }, { x: 0.55, y: 0.25 }, { x: 0.57, y: 0.31 }, { x: 0.5, y: 0.27 }, { x: 0.43, y: 0.31 }, { x: 0.45, y: 0.25 }, { x: 0.4, y: 0.2 }, { x: 0.46, y: 0.2 }]
    ];
    patterns.forEach((points, index) => {
      if (!this.observatoryState.constellations[index]) return;
      this.constellationGraphics.lineStyle(2, 0xdfe8ff, 0.42 + index * 0.08);
      points.forEach((point, pointIndex) => {
        const x = width * point.x;
        const y = height * point.y;
        this.constellationGraphics.fillStyle(0xf3f6ff, 0.9);
        this.constellationGraphics.fillCircle(x, y, 3.5);
        if (pointIndex > 0) {
          const prev = points[pointIndex - 1];
          this.constellationGraphics.lineBetween(width * prev.x, height * prev.y, x, y);
        }
      });
    });
  }

  showPetal(flag, targetCount, message, onComplete) {
    const { width, height } = this.scale;
    const petal = this.add.image(width * 0.5, height * 0.5, TEXTURES.rosePetal).setOrigin(0.5).setDepth(68).setAlpha(0);
    petal.setScale(this.fitImage(petal, 0.08, 0.08));
    this.tweens.add({ targets: petal, alpha: 1, duration: 650 });
    this.tweens.add({ targets: petal, scaleX: petal.scaleX * 1.12, scaleY: petal.scaleY * 1.12, duration: 900, yoyo: true, repeat: -1 });
    petal.setInteractive({ useHandCursor: true }).once("pointerdown", () => {
      petal.disableInteractive();
      this.awardRosePetal(flag, targetCount, "Observatory constellation");
      this.playDialogueSequence([message], () => {
        this.tweens.add({ targets: petal, alpha: 0, duration: 450, onComplete: () => { petal.destroy(); onComplete(); } });
      });
    });
  }

  showFinalRosebud() {
    this.stage = "rosebud";
    const { width, height } = this.scale;
    this.rosebud = this.add.graphics().setDepth(68);
    let bloom = 0;
    this.tweens.addCounter({
      from: 0,
      to: 1,
      duration: 2200,
      onUpdate: (tween) => {
        bloom = tween.getValue();
        this.rosebud.clear();
        this.rosebud.fillStyle(0xb20e2b, 0.65);
        for (let i = 0; i < 6; i += 1) {
          const angle = (Math.PI * 2 * i) / 6;
          this.rosebud.fillEllipse(width * 0.5 + Math.cos(angle) * 24 * bloom, height * 0.52 + Math.sin(angle) * 13 * bloom, 18 + 20 * bloom, 34 + 18 * bloom);
        }
      },
      onComplete: () => {
        this.showPetal("petalTwentyCollected", 20, "ROSE PETAL FOUND\n20 / 20", () => {
          this.rosebud.destroy();
          this.assembleCrimsonRose();
        });
      }
    });
  }

  assembleCrimsonRose() {
    if (this.observatoryState.crimsonRoseAssembled || this.progress.crimsonRoseAcquired) {
      this.showCrimsonRoseWhisper();
      return;
    }
    this.stage = "crimson-rose";
    const { width, height } = this.scale;
    const petals = [];
    for (let i = 0; i < 20; i += 1) {
      const angle = (Math.PI * 2 * i) / 20;
      const petal = this.add.image(width * (0.15 + (i % 5) * 0.05), height * (0.16 + Math.floor(i / 5) * 0.06), TEXTURES.rosePetal)
        .setOrigin(0.5)
        .setDepth(69)
        .setAlpha(0.8);
      petal.setScale(this.fitImage(petal, 0.035, 0.035));
      petals.push(petal);
      this.tweens.add({
        targets: petal,
        x: width * 0.5 + Math.cos(angle) * width * 0.08,
        y: height * 0.48 + Math.sin(angle) * height * 0.06,
        rotation: angle,
        duration: 1800 + i * 45,
        ease: "Sine.easeInOut"
      });
    }
    this.time.delayedCall(2700, () => {
      petals.forEach((petal) => petal.destroy());
      const rose = this.add.image(width / 2, height * 0.46, TEXTURES.crimsonRose).setOrigin(0.5).setDepth(70).setAlpha(0);
      rose.setScale(this.fitImage(rose, 0.32, 0.38));
      this.tweens.add({ targets: rose, alpha: 1, duration: 900 });
      this.observatoryState.crimsonRoseAssembled = true;
      this.progress.crimsonRoseAcquired = true;
      this.autosave();
      this.showQuestBanner("ITEM ACQUIRED\n\nTHE CRIMSON ROSE", () => {
        this.tweens.add({ targets: rose, alpha: 0, duration: 600, onComplete: () => { rose.destroy(); this.showCrimsonRoseWhisper(); } });
      });
    });
  }

  showCrimsonRoseWhisper() {
    const { width, height } = this.scale;
    const whisper = this.add.text(width / 2, height * 0.48, "", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(24, Math.floor(width / 46))}px`,
      color: "#f7d7e2",
      align: "center",
      wordWrap: { width: width * 0.74 },
      shadow: { offsetX: 0, offsetY: 0, color: "#ff6f9f", blur: 8, fill: true }
    }).setOrigin(0.5).setDepth(73).setAlpha(0);
    const showLine = (text, next) => {
      whisper.setText(text);
      this.tweens.add({ targets: whisper, alpha: 1, duration: 900, yoyo: true, hold: 1700, onComplete: next });
    };
    showLine("I was never waiting for the rose.", () => {
      showLine("I was waiting for you.", () => {
        whisper.destroy();
        this.revealTomorrowCrest();
      });
    });
  }

  revealTomorrowCrest() {
    const { width, height } = this.scale;
    const crest = this.add.image(width / 2, height * 0.42, TEXTURES.crest).setOrigin(0.5).setDepth(69).setAlpha(0);
    crest.setScale(this.fitImage(crest, 0.34, 0.36));
    this.tweens.add({ targets: crest, alpha: 1, y: height * 0.39, duration: 1100, yoyo: true, repeat: -1 });
    this.time.delayedCall(1100, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF TOMORROW\n\nMEMORY CRESTS RECOVERED\n6 / 6", () => {
        if (!this.observatoryState.crestCollected) {
          this.observatoryState.crestCollected = true;
          this.memoryCrestCount = Math.max(this.memoryCrestCount + 1, 6);
          this.progress.memoryCrests = this.memoryCrestCount;
          logProgressEvent("CREST COLLECTED", { scene: "ObservatoryScene", crest: "Crest of Tomorrow" });
          logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
        }
        this.autosave();
        this.updateInventoryHUD();
        this.tweens.add({ targets: crest, alpha: 0, duration: 550, onComplete: () => { crest.destroy(); this.restoreObservatory(); } });
      });
    });
  }

  restoreObservatory() {
    this.stage = "restoration";
    const restored = this.add.image(0, 0, TEXTURES.restored).setOrigin(0.5).setDepth(1).setAlpha(0);
    this.coverImage(restored);
    this.tweens.add({ targets: this.goldOverlay, alpha: 0.26, duration: 1100, yoyo: true, hold: 700 });
    this.tweens.add({ targets: this.silverOverlay, alpha: 0.2, duration: 900, yoyo: true, repeat: 2 });
    this.tweens.add({ targets: restored, alpha: 1, duration: 2800 });
    this.time.delayedCall(3000, () => {
      this.background.setTexture(TEXTURES.restored);
      this.coverImage(this.background);
      restored.destroy();
      this.resetCameraFraming();
      this.observatoryState.observatoryComplete = true;
      this.progress.observatoryComplete = true;
      this.progress.finaleUnlocked = true;
      this.progress.rosePetals = Math.max(this.rosePetalCount, 20);
      this.progress.memoryCrests = Math.max(this.memoryCrestCount, 6);
      logProgressEvent("OBSERVATORY COMPLETE", { petals: this.progress.rosePetals, crests: this.progress.memoryCrests });
      logProgressEvent("CHAPTER UNLOCKED", { chapter: "Finale" });
      this.autosave();
      this.updateInventoryHUD();
      this.time.delayedCall(800, () => this.descendToGrandHall());
    });
  }

  descendToGrandHall() {
    this.stage = "descent";
    this.disableAllHotspots();
    this.background.setTexture(TEXTURES.staircase);
    this.coverImage(this.background);
    if (this.mechanism) this.mechanism.setAlpha(0);
    this.constellationGraphics.clear();
    this.playDialogueSequence(["The descent is shorter.", "The manor rises back into view."], () => {
      fadeToScene(this, "GrandHallScene", { fromObservatory: true }, 1100);
    });
  }

  openCloseup(textureKey) {
    const { width, height } = this.scale;
    this.closeupContainer = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x030309, 0.72).setOrigin(0);
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

  addPuzzleButton(label, callback) {
    const { width, height } = this.scale;
    const button = this.add.text(width / 2, height * 0.77, label, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(16, Math.floor(width / 68))}px`,
      color: "#f4d7b7",
      backgroundColor: "#080509",
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setDepth(68).setInteractive({ useHandCursor: true }).on("pointerdown", callback);
    this.activePuzzleObjects.push(button);
    return button;
  }

  cleanupPuzzleObjects() {
    if (this.activePuzzleObjects) {
      this.activePuzzleObjects.forEach((object) => {
        if (object && object.destroy) object.destroy();
      });
    }
    this.activePuzzleObjects = [];
    this.input.off("drag", this.dragChartPiece, this);
    this.input.off("dragend", this.dropChartPiece, this);
  }

  awardRosePetal(flag, targetCount, source) {
    if (this.observatoryState[flag]) return;
    this.observatoryState[flag] = true;
    this.rosePetalCount = Math.max(this.rosePetalCount + 1, targetCount);
    this.progress.rosePetals = this.rosePetalCount;
    logProgressEvent("ROSE PETAL COLLECTED", { scene: "ObservatoryScene", source });
    logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
    this.autosave();
    this.updateInventoryHUD();
  }

  setupCompletedObservatory() {
    this.stage = "complete";
    this.background.setTexture(TEXTURES.restored);
    this.coverImage(this.background);
    this.createMechanism();
    this.mechanism.setAlpha(1);
    this.drawConstellations();
    this.updateObjective();
    this.enableExploration();
  }

  updateObjective() {
    if (!this.objectiveText) return;
    const count = this.getConstellationCount();
    this.objectiveText.setText(`RESTORE THE FIVE CONSTELLATIONS\n${count} / 5`);
    if (this.objectiveText.alpha === 0) this.tweens.add({ targets: this.objectiveText, alpha: 0.9, duration: 600 });
  }

  updateInventoryHUD() {
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    if (!this.inventoryText) return;
    let text = `Rose Petals: ${this.rosePetalCount} / 20\nMemory Crests: ${this.memoryCrestCount} / 6`;
    if (this.progress.crimsonRoseAcquired) text += "\nThe Crimson Rose";
    this.inventoryText.setText(text);
  }

  getConstellationCount() {
    return this.observatoryState.constellations.filter(Boolean).length;
  }

  autosave() {
    // Synchronize completion flags before saving
    this.progress.observatoryComplete = this.progress.observatoryComplete || this.observatoryState.observatoryComplete;
    this.progress.observatory = this.observatoryState;
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    saveProgress();
  }

  updateGlow() {
    if (!this.hotspotGlow) return;
    this.hotspotGlow.clear();
    if (this.stage !== "explore" || this.busy) return;
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    Object.entries(HOTSPOTS).forEach(([id, spot]) => {
      if (!this.isHotspotAvailable(id)) return;
      const color = id === "dome" ? 0xdfe8ff : id === "exit" ? 0xffd56a : 0xaecbff;
      const alpha = (this.hoveredHotspot === id ? 0.25 : 0.1) + pulse * 0.12;
      this.hotspotGlow.fillStyle(color, alpha);
      this.hotspotGlow.fillEllipse(width * spot.x, height * spot.y, width * spot.w, height * spot.h * 0.65);
    });
  }

  updateStarMotes() {
    if (!this.starMotes) return;
    this.starMotes.forEach((mote, index) => {
      mote.y -= 0.018 + index * 0.0007;
      mote.x += Math.sin(this.time.now * 0.0007 + index) * 0.012;
      if (mote.y < -8) mote.y = this.scale.height + 8;
    });
  }

  showQuestBanner(text, onComplete) {
    const { width, height } = this.scale;
    const banner = this.add.container(0, 0).setDepth(74).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020209, 0.76).setOrigin(0).setInteractive({ useHandCursor: true });
    const bannerText = this.add.text(width / 2, height / 2, text, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 48))}px`,
      color: "#f4d7ff",
      align: "center",
      lineSpacing: 10,
      backgroundColor: "#050509",
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
