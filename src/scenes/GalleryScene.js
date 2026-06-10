import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";

const DEBUG_HOTSPOTS = true;

const FRAME_HOTSPOTS = { 
  1: { x: 0.14, y: 0.34, w: 0.15, h: 0.2 },
  2: { x: 0.32, y: 0.26, w: 0.13, h: 0.17 },
  3: { x: 0.5, y: 0.3, w: 0.13, h: 0.17 },
  4: { x: 0.68, y: 0.26, w: 0.13, h: 0.17 },
  5: { x: 0.84, y: 0.36, w: 0.13, h: 0.18 },
  6: { x: 0.5, y: 0.58, w: 0.18, h: 0.22 }
};

const FRAGMENT_HOTSPOTS = {
  0: { x: 0.14, y: 0.34, w: 0.12, h: 0.14, label: "Restored frame" },
  1: { x: 0.38, y: 0.62, w: 0.11, h: 0.12, label: "Loose photograph" },
  2: { x: 0.58, y: 0.18, w: 0.1, h: 0.1, label: "Wall plaque" },
  3: { x: 0.68, y: 0.26, w: 0.1, h: 0.1, label: "Sketch room memory" }
};

const PHOTO_PIECES = ["Upper left", "Upper right", "Lower left", "Lower right"];
const PHOTO_SOLUTION = [0, 1, 2, 3];
const PHOTO_START = [2, 0, 3, 1];

const MEMORY_ORDER = [
  "Dumpling dinner",
  "Swan by the lake",
  "Lions at the zoo",
  "Ghost nun escape"
];
const MEMORY_START = ["Ghost nun escape", "Dumpling dinner", "Lions at the zoo", "Swan by the lake"];

const TITLE_OPTIONS = ["Funny", "Sweet", "Embarrassing", "Meaningful"];

const SKETCH_SPOTS = [
  { id: 0, x: 0.22, y: 0.42, w: 0.14, h: 0.16, line: "A swan drawn in hurried pencil strokes." },
  { id: 1, x: 0.42, y: 0.38, w: 0.14, h: 0.16, line: "A lion with a mane far too large." },
  { id: 2, x: 0.62, y: 0.44, w: 0.14, h: 0.16, line: "A ghost nun fleeing down a hallway." },
  { id: 3, x: 0.78, y: 0.4, w: 0.14, h: 0.16, line: "An unfinished portrait â€” never signed." }
];

export class GalleryScene extends Phaser.Scene {
  constructor() {
    super("GalleryScene");
    this.stage = "intro";
    this.hoveredFrame = null;
    this.hoveredInteract = null;
    this.puzzleControls = [];
  }

  create() {
    const progress = getHouseProgress();
    logProgressEvent("SCENE START", { scene: "GalleryScene", progress });
    this.progress = progress;
    this.galleryState = progress.gallery;
    this.rosePetalCount = progress.rosePetals || 0;
    this.memoryCrestCount = progress.memoryCrests || 0;
    this.stage = progress.galleryComplete ? "complete-view" : "intro";
    this.hoveredFrame = null;
    this.hoveredInteract = null;

    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: false, piano: true, wind: true, thunder: true, creaks: true, musicBox: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createBackground();
    this.createEnvironmentLayer();
    this.createOverlays();
    this.createFrameHotspots();
    this.createInventory();
    this.createClockDisplay();
    this.createVignette();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    this.applyProgressVisuals();

    if (progress.galleryComplete) {
      this.time.delayedCall(800, () => {
        this.playDialogueSequence(["The gallery remembers everything now.", "Its moments have been restored."]);
      });
      this.stage = "complete-view";
    } else if (this.getFramesComplete() > 0) {
      this.stage = "explore";
      this.refreshActiveHotspots();
    } else {
      this.time.delayedCall(1200, () => this.playIntro());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "GalleryScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.autosave();
      if (this.audio) this.audio.destroy();
      if (this.dialogue) this.dialogue.hide();
      if (this.inventoryText) this.inventoryText.destroy();
      if (this.clockText) this.clockText.destroy();
      if (this.frameGlow) this.frameGlow.clear();
      if (this.interactGlow) this.interactGlow.clear();
      if (this.warmOverlay) this.warmOverlay.destroy();
      if (this.particles) this.particles.destroy();
      this.scale.off("resize", this.resizeWarmOverlay, this);
    });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.dialogue) this.dialogue.update(delta);
    this.updateFrameGlow();
    this.updateInteractGlow();
    this.updateParticles();
  }

  getFramesComplete() {
    return this.galleryState.frames.filter(Boolean).length;
  }

  getActiveFrameNumber() {
    const idx = this.galleryState.frames.findIndex((done) => !done);
    return idx === -1 ? null : idx + 1;
  }

  playIntro() {
    this.playDialogueSequence([
      "Time has scattered the moments.",
      "Restore them.",
      "Remember."
    ], () => {
      this.showQuestBanner("RESTORE THE SIX MEMORY FRAMES\n\n0 / 6", () => {
        this.stage = "explore";
        this.refreshActiveHotspots();
      });
    });
  }

  createBackground() {
    const key = this.progress.galleryComplete ? "galleryRestored" : "gallery";
    this.background = this.add.image(0, 0, key).setOrigin(0.5).setDepth(0);
    this.coverImage(this.background);
  }

  createEnvironmentLayer() {
    this.envLayer = this.add.container(0, 0).setDepth(6);
    this.particleLayer = this.add.container(0, 0).setDepth(7);
    this.frameOverlays = {};
  }

  coverImage(image) {
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2);
    image.setScale(Math.max(width / image.width, height / image.height));
  }

  createOverlays() {
    this.frameGlow = this.add.graphics().setDepth(8);
    this.interactGlow = this.add.graphics().setDepth(8);
    this.warmOverlay = this.add.rectangle(0, 0, 1, 1, 0xffd8a8, 0).setOrigin(0).setDepth(4);
    this.resizeWarmOverlay();
    this.scale.on("resize", this.resizeWarmOverlay, this);
  }

  resizeWarmOverlay() {
    const { width, height } = this.scale;
    this.warmOverlay.setSize(width, height);
    this.warmOverlay.setPosition(0, 0);
  }

  createFrameHotspots() {
    const { width, height } = this.scale;
    this.frameHotspots = {};
    this.frameLabels = {};
    Object.entries(FRAME_HOTSPOTS).forEach(([id, slot]) => {
      const hotspot = this.add.rectangle(
        width * slot.x,
        height * slot.y,
        width * slot.w,
        height * slot.h,
        0xffffff,
        0
      ).setDepth(39);
      
      let label = null;
      if (DEBUG_HOTSPOTS) {
        hotspot.setStrokeStyle(2, 0xffff00);
        hotspot.setFillStyle(0xffff00, 0.18);
        label = this.add.text(
          width * slot.x,
          height * slot.y,
          `Frame ${id}`,
          {
            fontFamily: "Georgia, Times New Roman, serif",
            fontSize: "14px",
            color: "#ffff00",
            backgroundColor: "#000000",
            padding: { x: 4, y: 2 }
          }
        ).setOrigin(0.5).setDepth(40);
      }
      
      this.frameHotspots[id] = hotspot;
      this.frameLabels[id] = label;
    });
    this.fragmentHotspots = [];
  }

  createInventory() {
    const { width } = this.scale;
    this.inventoryText = this.add.text(width - 26, 24, "", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(12, Math.floor(width / 96))}px`,
      color: "#d8b28d",
      backgroundColor: "#070506",
      padding: { x: 14, y: 10 },
      align: "right",
      lineSpacing: 5
    }).setOrigin(1, 0).setDepth(55).setAlpha(0.86);
    this.updateInventoryHUD();
  }

  createClockDisplay() {
    const { width } = this.scale;
    this.clockText = this.add.text(width / 2, 22, this.getClockLabel(), {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 88))}px`,
      color: "#c9a87a",
      align: "center",
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5, 0).setDepth(55);
  }

  getClockLabel() {
    return `MEMORY FRAMES  ${this.getFramesComplete()} / 6`;
  }

  updateClockDisplay() {
    if (this.clockText) this.clockText.setText(this.getClockLabel());
  }

  updateInventoryHUD() {
    let text = `Frames: ${this.getFramesComplete()} / 6`;
    text += `\nRose Petals: ${this.rosePetalCount} / 20`;
    if (this.memoryCrestCount > 0) {
      text += `\nMemory Crests: ${this.memoryCrestCount} / 6`;
    }
    this.inventoryText.setText(text);
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
  }

  autosave() {
    this.progress.gallery = this.galleryState;
    saveProgress();
  }

  applyProgressVisuals() {
    const count = this.getFramesComplete();
    this.warmOverlay.setAlpha(count * 0.025);
    this.updateClockDisplay();
    this.addCandlesForProgress(count);

    if (this.galleryState.frames[0]) this.showFrameOverlay(1, "frame1Restored");
    if (this.galleryState.frames[4]) this.showFrameOverlay(5, "forgottenFrameRestored");
  }

  showFrameOverlay(frameNum, textureKey) {
    if (this.frameOverlays[frameNum]) return;
    const slot = FRAME_HOTSPOTS[frameNum];
    const { width, height } = this.scale;
    const img = this.add.image(width * slot.x, height * slot.y, textureKey).setOrigin(0.5);
    img.setScale(this.imageScale(img, slot.w * 0.9, slot.h * 0.9));
    this.envLayer.add(img);
    this.frameOverlays[frameNum] = img;
  }

  addCandlesForProgress(count) {
    if (this.candlesAdded >= count) return;
    const { width, height } = this.scale;
    const positions = [
      [0.1, 0.55], [0.25, 0.42], [0.45, 0.38], [0.65, 0.42], [0.8, 0.55], [0.5, 0.72]
    ];
    this.candlesAdded = this.candlesAdded || 0;
    for (let i = this.candlesAdded; i < count; i += 1) {
      const [x, y] = positions[i % positions.length];
      const flame = this.add.circle(width * x, height * y, Math.max(8, width * 0.01), 0xffb86a, 0).setDepth(1);
      this.envLayer.add(flame);
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.15, to: 0.4 },
        duration: 900,
        yoyo: true,
        repeat: -1
      });
    }
    this.candlesAdded = count;
  }

  addAmbientParticles() {
    const { width, height } = this.scale;
    if (this.ambientParticles) return;
    this.ambientParticles = [];
    for (let i = 0; i < 8; i += 1) {
      const dot = this.add.circle(
        Phaser.Math.Between(width * 0.1, width * 0.9),
        Phaser.Math.Between(height * 0.2, height * 0.8),
        2,
        0xfff2c8,
        0.15
      ).setDepth(1);
      this.particleLayer.add(dot);
      this.ambientParticles.push({ dot, speed: Phaser.Math.FloatBetween(0.02, 0.06) });
    }
  }

  updateParticles() {
    if (!this.ambientParticles || this.getFramesComplete() < 1) return;
    const { height } = this.scale;
    this.ambientParticles.forEach(({ dot, speed }) => {
      dot.y -= speed;
      if (dot.y < height * 0.1) dot.y = height * 0.85;
    });
  }

  refreshActiveHotspots() {
    Object.values(this.frameHotspots).forEach((h) => {
      h.removeAllListeners();
      h.disableInteractive();
    });
    this.clearFragmentHotspots();

    if (this.stage !== "explore" && this.stage !== "fragments") return;

    const active = this.getActiveFrameNumber();
    if (active === 5 && this.galleryState.frames[3] && !this.galleryState.frames[4]) {
      this.stage = "fragments";
      this.createFragmentHotspots();
      return;
    }

    if (!active || active > 6) return;

    const hotspot = this.frameHotspots[active];
    const slot = FRAME_HOTSPOTS[active];
    logProgressEvent("FRAME HOTSPOT ACTIVE", { frame: active, slot });

    const { width, height } = this.scale;
    if (this.objectiveMarker) this.objectiveMarker.destroy();
    this.objectiveMarker = this.add.text(
      width * slot.x,
      height * slot.y - height * 0.08,
      "Click the glowing frame",
      {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(14, Math.floor(width / 80))}px`,
        color: "#ffb2a8",
        backgroundColor: "#000000",
        padding: { x: 8, y: 4 },
        align: "center",
        shadow: { offsetX: 2, offsetY: 2, color: "#ff3b32", blur: 4, fill: true }
      }
    ).setOrigin(0.5).setDepth(41).setAlpha(0);
    this.tweens.add({
      targets: this.objectiveMarker,
      alpha: { from: 0, to: 1 },
      y: { from: height * slot.y - height * 0.12, to: height * slot.y - height * 0.08 },
      duration: 800,
      ease: "Back.easeOut"
    });

    hotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.hoveredFrame = active; })
      .on("pointerout", () => { if (this.hoveredFrame === active) this.hoveredFrame = null; })
      .on("pointerdown", () => this.interactFrame(active));
  }
  clearFragmentHotspots() {
    this.fragmentHotspots.forEach((h) => h.destroy());
    this.fragmentHotspots = [];
  }

  createFragmentHotspots() {
    const { width, height } = this.scale;
    Object.entries(FRAGMENT_HOTSPOTS).forEach(([id, spot]) => {
      if (this.galleryState.fragments[Number(id)]) return;
      const rect = this.add.rectangle(
        width * spot.x,
        height * spot.y,
        width * spot.w,
        height * spot.h,
        0xffffff,
        0
      ).setDepth(38).setInteractive({ useHandCursor: true });
      if (DEBUG_HOTSPOTS) {
        rect.setStrokeStyle(2, 0x66ccff);
        rect.setFillStyle(0x66ccff, 0.16);
      }
      rect.on("pointerover", () => { this.hoveredInteract = `frag-${id}`; })
        .on("pointerout", () => { if (this.hoveredInteract === `frag-${id}`) this.hoveredInteract = null; })
        .on("pointerdown", () => this.collectFragment(Number(id)));
      this.fragmentHotspots.push(rect);
    });
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

  updateFrameGlow() {
    if (!this.frameGlow) return;
    if (this.stage !== "explore" || !this.hoveredFrame) {
      this.frameGlow.clear();
      return;
    }
    const slot = FRAME_HOTSPOTS[this.hoveredFrame];
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    this.frameGlow.clear();
    this.frameGlow.fillStyle(0xffd56a, 0.14 + pulse * 0.14);
    this.frameGlow.fillEllipse(width * slot.x, height * slot.y, width * slot.w * 1.1, height * slot.h * 0.75);
  }

  updateInteractGlow() {
    if (!this.interactGlow) return;
    if (this.stage !== "fragments" || !this.hoveredInteract) {
      this.interactGlow.clear();
      return;
    }
    const id = Number(this.hoveredInteract.replace("frag-", ""));
    const spot = FRAGMENT_HOTSPOTS[id];
    if (!spot) return;
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0045) * 0.5;
    this.interactGlow.clear();
    this.interactGlow.fillStyle(0xbfd7ff, 0.12 + pulse * 0.14);
    this.interactGlow.fillEllipse(width * spot.x, height * spot.y, width * spot.w * 1.2, height * spot.h);
  }

  interactFrame(frameNum) {
    if (this.dialogue && this.dialogue.visible) return;
    if (frameNum !== this.getActiveFrameNumber()) return;

    logProgressEvent("FRAME CLICKED", { frame: frameNum });
    if (frameNum === 1) this.openFrameOnePuzzle();
    else if (frameNum === 2) this.openFrameTwoPuzzle();
    else if (frameNum === 3) this.openFrameThreePuzzle();
    else if (frameNum === 4) this.enterSketchRoom();
    else if (frameNum === 5) this.openForgottenFrame();
    else if (frameNum === 6) this.startMirrorSequence();
  }
  openCloseupView() {
    const { width, height } = this.scale;
    const view = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.78).setOrigin(0);
    view.add(shade);
    this.puzzleControls = [];
    this.tweens.add({ targets: view, alpha: 1, duration: 500 });
    return view;
  }

  closeView(view, onComplete) {
    this.clearPuzzleControls();
    this.tweens.add({
      targets: view,
      alpha: 0,
      duration: 650,
      onComplete: () => {
        view.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  clearPuzzleControls() {
    if (!this.puzzleControls) return;
    this.puzzleControls.forEach((c) => c.destroy());
    this.puzzleControls = [];
  }

  makePuzzleButton(x, y, label, onClick, fontSize = 16) {
    const { width } = this.scale;
    const btn = this.add.text(x, y, label, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(fontSize, Math.floor(width / 76))}px`,
      color: "#d8b28d",
      backgroundColor: "#1a120f",
      padding: { x: 14, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on("pointerdown", (p, lx, ly, e) => {
      if (e && e.stopPropagation) e.stopPropagation();
      onClick();
    });
    btn.setDepth(70);
    this.puzzleControls.push(btn);
    return btn;
  }

  imageScale(image, maxWidthRatio = 0.3, maxHeightRatio = 0.4) {
    const { width, height } = this.scale;
    return Math.min((width * maxWidthRatio) / image.width, (height * maxHeightRatio) / image.height);
  }

  showQuestBanner(message, onComplete = null) {
    const { width, height } = this.scale;
    const banner = this.add.text(width / 2, height * 0.32, message, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 52))}px`,
      color: "#e5c08a",
      align: "center",
      lineSpacing: 10
    }).setOrigin(0.5).setDepth(82).setAlpha(0);
    this.tweens.add({ targets: banner, alpha: 1, duration: 500 });
    this.tweens.add({
      targets: banner,
      alpha: 0,
      duration: 600,
      delay: 2400,
      onComplete: () => {
        banner.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  completeFrame(index) {
    this.galleryState.frames[index] = true;
    logProgressEvent("FRAME COMPLETED", { frame: index + 1 });
    this.autosave();
    this.updateClockDisplay();
    this.updateInventoryHUD();
    this.warmOverlay.setAlpha(this.getFramesComplete() * 0.025);
    this.addCandlesForProgress(this.getFramesComplete());
    if (this.getFramesComplete() >= 1) this.addAmbientParticles();
  }

  // --- Frame One: photo assembly ---

  openFrameOnePuzzle() {
    this.stage = "puzzle-frame-one";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.frameGlow.clear();

    const { width, height } = this.scale;
    this.frameOneView = this.openCloseupView();
    const frame = this.add.image(width / 2, height * 0.38, "frame1").setOrigin(0.5);
    frame.setScale(this.imageScale(frame, 0.38, 0.42));
    this.frameOneView.add(frame);

    this.add.text(width / 2, height * 0.1, "THE BROKEN PHOTOGRAPH", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(17, Math.floor(width / 54))}px`,
      color: "#d8b28d"
    }).setOrigin(0.5).setDepth(63);

    this.photoOrder = [...PHOTO_START];
    this.photoSolved = false;
    this.renderPhotoPieces();
  }

  renderPhotoPieces() {
    if (!this.frameOneView) return;
    this.clearPuzzleControls();
    this.frameOneView.getAll().forEach((child) => {
      if (child.type === "Text" && child.text !== "THE BROKEN PHOTOGRAPH") child.destroy();
    });

    const { width, height } = this.scale;
    const startY = height * 0.58;
    const gap = height * 0.09;

    this.photoOrder.forEach((pieceId, index) => {
      const y = startY + index * gap;
      const label = this.add.text(width * 0.35, y, PHOTO_PIECES[pieceId], {
        fontFamily: "IM Fell English SC, Georgia, serif",
        fontSize: `${Math.max(14, Math.floor(width / 72))}px`,
        color: "#f1d9bb",
        backgroundColor: "#1a120f",
        padding: { x: 12, y: 8 }
      }).setOrigin(0.5).setDepth(63);
      this.frameOneView.add(label);
      this.makePuzzleButton(width * 0.58, y, "â–²", () => this.movePhotoPiece(index, -1), 14);
      this.makePuzzleButton(width * 0.68, y, "â–¼", () => this.movePhotoPiece(index, 1), 14);
    });

    this.checkPhotoSolution();
  }

  movePhotoPiece(index, direction) {
    if (this.photoSolved) return;
    const target = index + direction;
    if (target < 0 || target >= this.photoOrder.length) return;
    const next = [...this.photoOrder];
    [next[index], next[target]] = [next[target], next[index]];
    this.photoOrder = next;
    this.renderPhotoPieces();
  }

  checkPhotoSolution() {
    if (this.photoSolved) return;
    const solved = PHOTO_SOLUTION.every((v, i) => this.photoOrder[i] === v);
    if (!solved) return;
    this.photoSolved = true;
    this.time.delayedCall(400, () => this.finishFrameOne());
  }

  finishFrameOne() {
    this.closeView(this.frameOneView, () => {
      this.frameOneView = null;
      const { width, height } = this.scale;
      const view = this.openCloseupView();
      const restored = this.add.image(width / 2, height * 0.42, "frame1Restored").setOrigin(0.5);
      restored.setScale(this.imageScale(restored, 0.38, 0.42));
      view.add(restored);

      this.playDialogueSequence([
        "I still laugh when I think about this day.",
        "Even now."
      ], () => {
        this.closeView(view, () => this.offerRosePetal(4, "You were being dramatic.", "Again.", () => {
          this.completeFrame(0);
          this.showFrameOverlay(1, "frame1Restored");
          this.applyFrameWarmth(1);
          this.stage = "explore";
          this.refreshActiveHotspots();
        }));
      });
    });
  }

  offerRosePetal(count, line1, line2, onComplete) {
    const { width, height } = this.scale;
    const view = this.openCloseupView();
    const petal = this.add.image(width / 2, height * 0.48, "rosePetal").setOrigin(0.5);
    petal.setScale(this.imageScale(petal, 0.16, 0.2));
    this.addPuzzleControl(petal);
    petal.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: petal, alpha: { from: 0.7, to: 1 }, duration: 800, yoyo: true, repeat: -1 });

    petal.once("pointerdown", () => {
      petal.disableInteractive();
      this.rosePetalCount = Math.max(count, this.rosePetalCount + 1);
      logProgressEvent("ROSE PETAL COLLECTED", { scene: "GalleryScene", total: this.rosePetalCount });
      logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
      this.updateInventoryHUD();
      this.autosave();

      const found = this.add.text(width / 2, height * 0.22, `ROSE PETAL FOUND\n${this.rosePetalCount} / 20`, {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(18, Math.floor(width / 48))}px`,
        color: "#ffb2a8",
        align: "center"
      }).setOrigin(0.5).setDepth(71);
      this.puzzleControls.push(found);

      this.playDialogueSequence([line1, line2], () => {
        this.tweens.add({
          targets: petal,
          alpha: 0,
          duration: 500,
          onComplete: () => this.closeView(view, onComplete)
        });
      });
    });
  }

  addPuzzleControl(obj) {
    obj.setDepth(70);
    this.puzzleControls.push(obj);
    return obj;
  }

  applyFrameWarmth(frameNum) {
    const slot = FRAME_HOTSPOTS[frameNum];
    const { width, height } = this.scale;
    const glow = this.add.circle(width * slot.x, height * slot.y, width * slot.w * 0.5, 0xffd56a, 0).setDepth(5);
    this.envLayer.add(glow);
    this.tweens.add({ targets: glow, alpha: 0.2, duration: 1000, yoyo: true, repeat: 2 });
  }

  // --- Frame Two: order of moments ---

  openFrameTwoPuzzle() {
    this.stage = "puzzle-frame-two";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.frameGlow.clear();

    const { width, height } = this.scale;
    this.frameTwoView = this.openCloseupView();
    const frame = this.add.image(width / 2, height * 0.32, "frame2").setOrigin(0.5);
    frame.setScale(this.imageScale(frame, 0.34, 0.38));
    this.frameTwoView.add(frame);

    this.add.text(width / 2, height * 0.1, "THE ORDER OF MOMENTS", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(17, Math.floor(width / 54))}px`,
      color: "#d8b28d"
    }).setOrigin(0.5).setDepth(63);

    this.memoryOrder = [...MEMORY_START];
    this.memorySolved = false;
    this.renderMemoryOrder();
  }

  renderMemoryOrder() {
    this.clearPuzzleControls();
    const { width, height } = this.scale;
    const startY = height * 0.52;
    const gap = height * 0.085;

    this.memoryOrder.forEach((label, index) => {
      const y = startY + index * gap;
      this.add.text(width * 0.32, y, `${index + 1}. ${label}`, {
        fontFamily: "IM Fell English SC, Georgia, serif",
        fontSize: `${Math.max(13, Math.floor(width / 78))}px`,
        color: "#f1d9bb",
        backgroundColor: "#1a120f",
        padding: { x: 10, y: 6 }
      }).setOrigin(0, 0.5).setDepth(63);
      this.makePuzzleButton(width * 0.72, y, "â–²", () => this.moveMemory(index, -1), 14);
      this.makePuzzleButton(width * 0.82, y, "â–¼", () => this.moveMemory(index, 1), 14);
    });

    if (MEMORY_ORDER.every((m, i) => this.memoryOrder[i] === m)) {
      this.memorySolved = true;
      this.time.delayedCall(400, () => this.finishFrameTwo());
    }
  }

  moveMemory(index, direction) {
    if (this.memorySolved) return;
    const target = index + direction;
    if (target < 0 || target >= this.memoryOrder.length) return;
    const next = [...this.memoryOrder];
    [next[index], next[target]] = [next[target], next[index]];
    this.memoryOrder = next;
    this.renderMemoryOrder();
  }

  finishFrameTwo() {
    this.closeView(this.frameTwoView, () => {
      this.frameTwoView = null;
      this.playDialogueSequence([
        "Some moments seemed ordinary.",
        "Until they became my favorites."
      ], () => {
        this.completeFrame(1);
        this.warmOverlay.setAlpha(this.getFramesComplete() * 0.03);
        this.stage = "explore";
        this.refreshActiveHotspots();
      });
    });
  }

  // --- Frame Three: missing title ---

  openFrameThreePuzzle() {
    this.stage = "puzzle-frame-three";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.frameGlow.clear();

    const { width, height } = this.scale;
    this.frameThreeView = this.openCloseupView();
    const frame = this.add.image(width / 2, height * 0.34, "frame3").setOrigin(0.5);
    frame.setScale(this.imageScale(frame, 0.34, 0.38));
    this.frameThreeView.add(frame);

    this.add.text(width / 2, height * 0.1, "THE MISSING TITLE", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(17, Math.floor(width / 54))}px`,
      color: "#d8b28d"
    }).setOrigin(0.5).setDepth(63);

    const startX = width * 0.28;
    const gap = width * 0.24;
    TITLE_OPTIONS.forEach((title, i) => {
      this.makePuzzleButton(startX + gap * i, height * 0.72, title.toUpperCase(), () => this.pickTitle(title));
    });
  }

  pickTitle(title) {
    if (title !== "Funny") {
      this.playDialogueSequence(["Not quite."]);
      return;
    }
    this.finishFrameThree();
  }

  finishFrameThree() {
    this.closeView(this.frameThreeView, () => {
      this.frameThreeView = null;
      this.playDialogueSequence(["I absolutely won that argument."], () => {
        this.offerRosePetal(5, "I absolutely won that argument.", "I absolutely won that argument.", () => {
          this.completeFrame(2);
          this.stage = "explore";
          this.refreshActiveHotspots();
        });
      });
    });
  }

  // --- Frame Four: sketch room ---

  enterSketchRoom() {
    this.stage = "sketch-room";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.frameGlow.clear();

    this.cameras.main.fadeOut(600, 0, 0, 0);
    this.time.delayedCall(650, () => {
      this.cameras.main.fadeIn(800, 0, 0, 0);
      const { width, height } = this.scale;
      this.sketchView = this.add.container(0, 0).setDepth(60);
      const room = this.add.image(width / 2, height / 2, "gallerySketchRoom").setOrigin(0.5);
      room.setScale(Math.max(width / room.width, height / room.height));
      this.sketchView.add(room);

      this.sketchHotspots = [];
      SKETCH_SPOTS.forEach((spot) => {
        if (this.galleryState.sketchesExamined[spot.id]) return;
        const rect = this.add.rectangle(
          width * spot.x,
          height * spot.y,
          width * spot.w,
          height * spot.h,
          0xffffff,
          0
        ).setDepth(61).setInteractive({ useHandCursor: true });
        rect.on("pointerdown", () => this.examineSketch(spot));
        this.sketchView.add(rect);
        this.sketchHotspots.push(rect);
      });

      this.makePuzzleButton(width * 0.5, height * 0.92, "Leave room", () => this.exitSketchRoom());
    });
  }

  examineSketch(spot) {
    if (this.galleryState.sketchesExamined[spot.id]) return;
    this.galleryState.sketchesExamined[spot.id] = true;
    this.autosave();
    this.playDialogueSequence([spot.line], () => {
      if (this.galleryState.sketchesExamined.every(Boolean)) {
        this.finishFrameFour();
      }
    });
  }

  finishFrameFour() {
    this.playDialogueSequence([
      "You made even the boring days feel special."
    ], () => {
      this.playDialogueSequence(["A soft laugh echoes briefly."], () => {
        this.completeFrame(3);
        this.exitSketchRoom(true);
      });
    });
  }

  exitSketchRoom(fromComplete = false) {
    if (this.sketchView) {
      this.sketchView.destroy();
      this.sketchView = null;
    }
    this.stage = "explore";
    if (fromComplete) {
      this.warmOverlay.setAlpha(this.getFramesComplete() * 0.03);
    }
    this.refreshActiveHotspots();
  }

  // --- Frame Five: forgotten ---

  openForgottenFrame() {
    if (!this.galleryState.frames[3]) return;
    this.stage = "fragments";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.playDialogueSequence([
      "Memory fragments linger throughout the gallery.",
      "Find them all to restore what was forgotten."
    ], () => this.refreshActiveHotspots());
  }

  collectFragment(id) {
    if (this.galleryState.fragments[id]) return;
    this.galleryState.fragments[id] = true;
    this.autosave();
    this.refreshActiveHotspots();

    const remaining = this.galleryState.fragments.filter((f) => !f).length;
    if (remaining > 0) {
      this.playDialogueSequence([`Fragment recovered. ${4 - remaining} / 4.`]);
      return;
    }

    this.finishFrameFive();
  }

  finishFrameFive() {
    this.stage = "frame-five-reveal";
    this.cameras.main.fadeOut(700, 0, 0, 0);
    this.time.delayedCall(750, () => {
      this.cameras.main.fadeIn(900, 0, 0, 0);
      const { width, height } = this.scale;
      const view = this.openCloseupView();
      const frame = this.add.image(width / 2, height * 0.42, "forgottenFrameRestored").setOrigin(0.5);
      frame.setScale(this.imageScale(frame, 0.4, 0.45));
      view.add(frame);

      this.playDialogueSequence(["I hope you never forget this one."], () => {
        this.closeView(view, () => {
          this.showFrameOverlay(5, "forgottenFrameRestored");
          this.offerRosePetal(6, "You looked ridiculously handsome.", "...", () => {
            this.completeFrame(4);
            this.stage = "explore";
            this.refreshActiveHotspots();
          });
        });
      });
    });
  }

  // --- Frame Six: mirror sequence ---

  startMirrorSequence() {
    this.stage = "mirror";
    Object.values(this.frameHotspots).forEach((h) => h.disableInteractive());
    this.frameGlow.clear();
    if (this.audio) this.audio.fadeOut();
    this.mirrorStep = 1;
    this.showMirrorStep();
  }

  showMirrorStep() {
    const { width, height } = this.scale;

    if (this.mirrorView) {
      this.closeView(this.mirrorView, () => this.showMirrorStep());
      return;
    }

    this.mirrorView = this.openCloseupView();
    const step = this.mirrorStep;

    if (step === 1) {
      const img = this.add.image(width / 2, height / 2, "mirrorFrame").setOrigin(0.5);
      img.setScale(this.imageScale(img, 0.55, 0.65));
      this.mirrorView.add(img);
      this.playDialogueSequence(["You..."], () => {
        this.mirrorStep = 2;
        this.mirrorView = null;
        this.time.delayedCall(900, () => this.showMirrorStep());
      }, [800]);
      return;
    }

    if (step === 2) {
      const img = this.add.image(width / 2, height / 2, "mirrorFrameWoman").setOrigin(0.5);
      img.setScale(this.imageScale(img, 0.55, 0.65));
      this.mirrorView.add(img);
      this.time.delayedCall(3200, () => {
        const view = this.mirrorView;
        this.mirrorView = null;
        this.closeView(view, () => {
          this.mirrorStep = 3;
          this.showMirrorStep();
        });
      });
      return;
    }

    if (step === 3) {
      const img = this.add.image(width / 2, height / 2, "mirrorFrameWomanDisappear").setOrigin(0.5);
      img.setScale(this.imageScale(img, 0.55, 0.65));
      this.mirrorView.add(img);
      this.time.delayedCall(1800, () => {
        const view = this.mirrorView;
        this.mirrorView = null;
        this.closeView(view, () => {
          this.mirrorStep = 4;
          this.showMirrorStep();
        });
      });
      return;
    }

    this.playDialogueSequence([
      "Some moments are not behind us.",
      "Some are still waiting."
    ], () => {
      this.showQuestBanner("CLOCK STRIKES MIDNIGHT\n\n6 / 6", () => {
        this.completeFrame(5);
        this.startGalleryCompletion();
      });
    });
  }

  // --- Gallery completion ---

  startGalleryCompletion() {
    this.stage = "gallery-complete";
    this.cameras.main.fadeOut(1200, 0, 0, 0);
    this.time.delayedCall(1300, () => {
      const { width, height } = this.scale;
      const restored = this.add.image(width / 2, height / 2, "galleryRestored").setOrigin(0.5).setAlpha(0).setDepth(0);
      this.coverImage(restored);
      this.tweens.add({ targets: this.background, alpha: 0, duration: 1600 });
      this.tweens.add({
        targets: restored,
        alpha: 1,
        duration: 1600,
        onComplete: () => {
          this.background.destroy();
          this.background = restored;
          this.addCandlesForProgress(6);
          this.warmOverlay.setAlpha(0.18);
          this.revealCrest();
        }
      });
      this.cameras.main.fadeIn(1000, 0, 0, 0);
    });
  }

  revealCrest() {
    const { width, height } = this.scale;
    const view = this.openCloseupView();
    const crest = this.add.image(width / 2, height * 0.4, "crest of memories").setOrigin(0.5);
    crest.setScale(this.imageScale(crest, 0.28, 0.34)).setAlpha(0);
    view.add(crest);
    this.tweens.add({ targets: crest, alpha: 1, duration: 900 });

    this.time.delayedCall(1200, () => {
      const acquired = this.add.image(width / 2, height * 0.58, "crest acquired").setOrigin(0.5);
      acquired.setScale(this.imageScale(acquired, 0.26, 0.32)).setAlpha(0);
      view.add(acquired);
      this.tweens.add({ targets: acquired, alpha: 1, duration: 700 });
    });

    this.time.delayedCall(2000, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF MOMENTS", () => {
        this.memoryCrestCount = (this.memoryCrestCount || 0) + 1;
        this.rosePetalCount = Math.max(this.rosePetalCount, 6);
        logProgressEvent("CREST COLLECTED", { scene: "GalleryScene", crest: "Crest of Moments" });
        logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
        this.progress.galleryComplete = true;
        this.progress.chapterFourUnlocked = true;
        logProgressEvent("GALLERY COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });
        logProgressEvent("CHAPTER UNLOCKED", { chapter: 4 });
        this.progress.memoryCrests = this.memoryCrestCount;
        this.progress.rosePetals = this.rosePetalCount;
        this.autosave();
        this.updateInventoryHUD();
        this.closeView(view, () => this.playFinalScene());
      });
    });
  }

  playFinalScene() {
    this.playDialogueSequence([
      "You've always been good at finding ways to make memories."
    ], () => {
      this.playDialogueSequence(["But can you find me?"], () => {
        this.showGhostGirlFarewell();
      }, [1000]);
    }, [600]);

    if (this.audio) {
      this.audio.start();
      this.audio.fadeIn();
    }
  }

  showGhostGirlFarewell() {
    const { width, height } = this.scale;
    const ghost = this.add.image(width * 0.82, height * 0.45, "ghostGirlFront")
      .setOrigin(0.5, 1)
      .setScale(this.imageScale(ghost, 0.2, 0.32))
      .setAlpha(0)
      .setDepth(20);
    this.tweens.add({ targets: ghost, alpha: 0.75, duration: 1400, hold: 2200 });
    this.tweens.add({
      targets: ghost,
      alpha: 0,
      delay: 3600,
      duration: 1800,
      onComplete: () => {
        ghost.destroy();
        this.returnToGrandHall();
      }
    });

    for (let i = 0; i < 6; i += 1) {
      const petal = this.add.image(
        Phaser.Math.Between(width * 0.2, width * 0.9),
        Phaser.Math.Between(height * 0.3, height * 0.7),
        "rosePetal"
      ).setOrigin(0.5).setScale(0.04).setAlpha(0.5).setDepth(19);
      this.tweens.add({
        targets: petal,
        x: petal.x + Phaser.Math.Between(-40, 40),
        y: petal.y + 80,
        alpha: 0,
        duration: Phaser.Math.Between(2000, 3500),
        delay: i * 200
      });
    }
  }

  returnToGrandHall() {
    this.autosave();
    this.playDialogueSequence(["The house remembers."], () => {
      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.time.delayedCall(1500, () => {
        this.scene.start("GrandHallScene", { fromGallery: true });
      });
    }, [800]);
  }

  playDialogueSequence(lines, onComplete = null, extraDelays = []) {
    const queue = [...lines];
    let index = 0;
    const next = () => {
      if (index >= queue.length) {
        if (onComplete) onComplete();
        return;
      }
      const line = queue[index];
      const delay = extraDelays[index] || 0;
      index += 1;
      this.time.delayedCall(delay, () => {
        this.dialogue.show(line, () => {
          this.time.delayedCall(420, next);
        });
      });
    };
    next();
  }
}

