import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";
import { fadeToScene } from "../systems/SceneTransition.js";

const TEXTURES = {
  unrestored: "kitchenUnrestored",
  restored: "kitchenRestored",
  counter: "counterCloseup",
  pantry: "pantryCloseup",
  stove: "stoveCloseup",
  recipe: "recipeNote",
  cookedRoll: "cookedRoll",
  memoryRolls: "memoryRolls",
  rosePetal: "rosePetal",
  crest: "crestAcquired"
};

const HOTSPOTS = {
  spiceShelf: { x: 0.73, y: 0.31, w: 0.22, h: 0.18 },
  recipe: { x: 0.46, y: 0.55, w: 0.16, h: 0.16 },
  pantry: { x: 0.57, y: 0.42, w: 0.12, h: 0.28 },
  stove: { x: 0.79, y: 0.58, w: 0.24, h: 0.22 },
  secret: { x: 0.68, y: 0.45, w: 0.12, h: 0.14 },
  exit: { x: 0.29, y: 0.42, w: 0.12, h: 0.26 }
};

const SPICE_ITEMS = [
  { id: "cumin", label: "CUMIN", jar: "Cumin", targetX: 0.32, startX: 0.28, color: 0xc99a54 },
  { id: "pepper", label: "PEPPER", jar: "Pepper", targetX: 0.5, startX: 0.5, color: 0x6d655f },
  { id: "nutmeg", label: "NUTMEG", jar: "Nutmeg", targetX: 0.68, startX: 0.72, color: 0xb37b48 }
];

const PANTRY_SOLUTION = [5, 5, 5];

export class KitchenScene extends Phaser.Scene {
  constructor() {
    super("KitchenScene");
    this.stage = "intro";
    this.busy = false;
    this.hoveredHotspot = null;
  }

  create() {
    this.progress = getHouseProgress();
    this.ensureKitchenState();
    this.kitchenState = this.progress.kitchen;
    this.rosePetalCount = this.progress.rosePetals || 0;
    this.memoryCrestCount = this.progress.memoryCrests || 0;
    this.busy = false;
    this.hoveredHotspot = null;

    logProgressEvent("SCENE START", { scene: "KitchenScene", progress: this.progress });

    this.cameras.main.setBackgroundColor("#030202");
    this.cameras.main.fadeIn(1200, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: true, piano: true, wind: true, thunder: false, creaks: true });
    this.audio.start();
    this.audio.fadeIn();

    this.createRoom();
    this.createOverlays();
    this.createInventory();
    this.createVignette();
    this.createHotspots();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    if (this.kitchenState.kitchenComplete || this.progress.kitchenComplete) {
      this.setupCompletedKitchen();
    } else {
      this.time.delayedCall(700, () => this.playIntro());
    }

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "KitchenScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.autosave();
      this.dialogue?.destroy();
      if (this.audio) this.audio.destroy();
      this.scale.off("resize", this.resizeScene, this);
    });
  }

  update(_, deltaMs) {
    if (this.dialogue) this.dialogue.update(deltaMs / 1000);
    this.updateHotspotGlow();
    this.updateSteam();
  }

  ensureKitchenState() {
    const defaults = {
      ingredients: {
        spices: false,
        recipe: false,
        meat: false,
        coriander: false
      },
      spicePuzzleComplete: false,
      recipeFound: false,
      pantryUnlocked: false,
      pantryPuzzleComplete: false,
      secretIngredientFound: false,
      cookingComplete: false,
      crestCollected: false,
      kitchenComplete: false,
      petalTenCollected: false,
      petalElevenCollected: false,
      petalTwelveCollected: false
    };
    const current = this.progress.kitchen || {};
    this.progress.kitchen = {
      ...defaults,
      ...current,
      kitchenComplete: Boolean(current.kitchenComplete || this.progress.kitchenComplete),
      ingredients: {
        ...defaults.ingredients,
        ...(current.ingredients || {})
      }
    };
  }

  createRoom() {
    const key = this.kitchenState?.kitchenComplete ? TEXTURES.restored : TEXTURES.unrestored;
    this.background = this.add.image(0, 0, key).setOrigin(0.5).setDepth(0).setAlpha(1);
    this.coverImage(this.background);
    this.scale.on("resize", this.resizeScene, this);
  }

  resizeScene() {
    if (this.background) this.coverImage(this.background);
    if (this.closeupImage) this.coverImage(this.closeupImage);
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
    this.fireGlow = this.add.circle(width * 0.78, height * 0.6, width * 0.08, 0xff8f34, 0.08).setDepth(4);
    this.goldenOverlay = this.add.rectangle(0, 0, width, height, 0xffd38a, 0).setOrigin(0).setDepth(5);
    this.flash = this.add.rectangle(0, 0, width, height, 0xffefd0, 0).setOrigin(0).setDepth(70);
    this.tweens.add({
      targets: this.fireGlow,
      alpha: { from: 0.05, to: 0.14 },
      scale: { from: 0.9, to: 1.15 },
      duration: 1300,
      yoyo: true,
      repeat: -1
    });
  }

  createInventory() {
    const { width } = this.scale;
    this.inventoryText = this.add.text(width - 26, 24, "", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 92))}px`,
      color: "#e0b987",
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
    this.vignette.fillStyle(0x000000, 0.18);
    this.vignette.fillRect(0, 0, width, height);
    this.vignette.fillStyle(0x000000, 0.5);
    this.vignette.fillRect(0, 0, width, height * 0.08);
    this.vignette.fillRect(0, height * 0.92, width, height * 0.08);
    this.vignette.fillRect(0, 0, width * 0.045, height);
    this.vignette.fillRect(width * 0.955, 0, width * 0.045, height);
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

  playIntro() {
    this.playDialogueSequence([
      "The kitchen is colder than it should be.",
      "Rain ticks softly against the windows.",
      "Somewhere beneath the dust, warmth remains."
    ], () => this.enableExploration());
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
    if (id === "spiceShelf") return !this.kitchenState.ingredients.spices;
    if (id === "recipe") return !this.kitchenState.ingredients.recipe;
    if (id === "pantry") return !this.kitchenState.ingredients.meat;
    if (id === "secret") return this.kitchenState.ingredients.recipe && !this.kitchenState.ingredients.coriander;
    if (id === "stove") return this.allIngredientsCollected() && !this.kitchenState.cookingComplete;
    if (id === "exit") return true;
    return false;
  }

  disableExploration() {
    this.busy = true;
    Object.values(this.hotspots).forEach((hotspot) => hotspot.disableInteractive());
  }

  handleHotspot(id) {
    if (this.busy || this.stage !== "explore") return;
    if (!this.isHotspotAvailable(id)) return;
    this.disableExploration();

    if (id === "spiceShelf") this.openSpicePuzzle();
    if (id === "recipe") this.inspectRecipe();
    if (id === "pantry") this.openPantry();
    if (id === "secret") this.findSecretIngredient();
    if (id === "stove") this.startCookingMinigame();
    if (id === "exit") this.exitKitchen();
  }

  openCloseup(textureKey, depth = 60) {
    const { width, height } = this.scale;
    this.closeupContainer = this.add.container(0, 0).setDepth(depth).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x050202, 0.72).setOrigin(0);
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

  openSpicePuzzle() {
    this.stage = "spice";
    this.openCloseup(TEXTURES.counter);
    this.time.delayedCall(650, () => this.createSpicePuzzle());
  }

  createSpicePuzzle() {
    const { width, height } = this.scale;
    this.spiceGroup = this.add.container(0, 0).setDepth(66);
    this.spiceAssignments = {};
    this.spiceTargets = {};

    const title = this.add.text(width / 2, height * 0.13, "Sort the spices", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 52))}px`,
      color: "#f4d7b7",
      backgroundColor: "#080504",
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5);
    this.spiceGroup.add(title);

    SPICE_ITEMS.forEach((item) => {
      const target = this.add.rectangle(width * item.targetX, height * 0.72, width * 0.14, height * 0.11, 0x1a1008, 0.72)
        .setStrokeStyle(2, 0xc49a64, 0.8);
      const label = this.add.text(target.x, target.y, item.label, {
        fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(15, Math.floor(width / 76))}px`,
        color: "#e8c99b"
      }).setOrigin(0.5);
      const jar = this.add.container(width * item.startX, height * 0.42);
      const glass = this.add.rectangle(0, 0, width * 0.1, height * 0.14, 0x2a1a0d, 0.78)
        .setStrokeStyle(2, 0xd7b174, 0.78);
      const spice = this.add.rectangle(0, height * 0.025, width * 0.08, height * 0.045, item.color, 0.8);
      const jarText = this.add.text(0, 0, item.jar, {
        fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(12, Math.floor(width / 102))}px`,
        color: "#f0d4ac"
      }).setOrigin(0.5);
      jar.add([glass, spice, jarText]);
      jar.setSize(width * 0.12, height * 0.16);
      jar.setInteractive({ draggable: true, useHandCursor: true });
      jar.itemId = item.id;
      jar.startX = jar.x;
      jar.startY = jar.y;
      this.input.setDraggable(jar);
      this.spiceTargets[item.id] = { x: target.x, y: target.y, w: target.width, h: target.height };
      this.spiceGroup.add([target, label, jar]);
    });

    this.input.on("drag", this.dragSpice, this);
    this.input.on("dragend", this.dropSpice, this);
  }

  dragSpice(pointer, gameObject, dragX, dragY) {
    if (this.stage !== "spice" || !gameObject.itemId) return;
    gameObject.setPosition(dragX, dragY);
  }

  dropSpice(pointer, gameObject) {
    if (this.stage !== "spice" || !gameObject.itemId) return;
    const target = this.spiceTargets[gameObject.itemId];
    const inside = Phaser.Geom.Rectangle.Contains(
      new Phaser.Geom.Rectangle(target.x - target.w / 2, target.y - target.h / 2, target.w, target.h),
      gameObject.x,
      gameObject.y
    );

    if (inside) {
      gameObject.setPosition(target.x, target.y);
      gameObject.disableInteractive();
      this.spiceAssignments[gameObject.itemId] = true;
      if (Object.keys(this.spiceAssignments).length === SPICE_ITEMS.length) this.completeSpicePuzzle();
      return;
    }

    this.tweens.add({ targets: gameObject, x: gameObject.startX, y: gameObject.startY, duration: 260 });
  }

  completeSpicePuzzle() {
    this.stage = "spice-complete";
    this.input.off("drag", this.dragSpice, this);
    this.input.off("dragend", this.dropSpice, this);
    this.kitchenState.spicePuzzleComplete = true;
    this.kitchenState.ingredients.spices = true;
    this.awardRosePetal("petalTenCollected", 10, "Kitchen spice shelf");
    this.autosave();
    this.updateInventoryHUD();

    this.playDialogueSequence(["I can handle my spice."], () => {
      if (this.spiceGroup) {
        this.spiceGroup.destroy();
        this.spiceGroup = null;
      }
      this.closeCloseup(() => this.afterIngredientCollected());
    });
  }

  inspectRecipe() {
    this.stage = "recipe";
    this.openCloseup(TEXTURES.unrestored);
    const { width, height } = this.scale;
    const recipe = this.add.image(width / 2, height * 0.48, TEXTURES.recipe)
      .setOrigin(0.5)
      .setDepth(66)
      .setAlpha(0)
      .setScale(0.1);
    recipe.setScale(this.fitImage(recipe, 0.48, 0.58) * 0.7);
    this.tweens.add({
      targets: recipe,
      alpha: 1,
      scaleX: this.fitImage(recipe, 0.48, 0.58),
      scaleY: this.fitImage(recipe, 0.48, 0.58),
      duration: 700
    });

    this.playDialogueSequence(["A torn recipe page.", "Keema rolls.", "Of course."], () => {
      this.kitchenState.recipeFound = true;
      this.kitchenState.ingredients.recipe = true;
      this.autosave();
      this.updateInventoryHUD();
      this.tweens.add({ targets: recipe, alpha: 0, duration: 400, onComplete: () => recipe.destroy() });
      this.closeCloseup(() => this.afterIngredientCollected());
    });
  }

  openPantry() {
    this.stage = "pantry";
    this.openCloseup(TEXTURES.pantry);
    this.time.delayedCall(650, () => this.createPantryPuzzle());
  }

  createPantryPuzzle() {
    const { width, height } = this.scale;
    this.pantryDigits = [0, 0, 0];
    this.pantryGroup = this.add.container(0, 0).setDepth(66);
    const title = this.add.text(width / 2, height * 0.14, "The pantry safe is locked", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 56))}px`,
      color: "#f4d7b7",
      backgroundColor: "#080504",
      padding: { x: 14, y: 8 }
    }).setOrigin(0.5);
    const hint = this.add.text(width / 2, height * 0.24, "Flour. Keema. Spice.", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(16, Math.floor(width / 70))}px`,
      color: "#d8b28d"
    }).setOrigin(0.5);
    this.pantryGroup.add([title, hint]);

    this.pantryDigitTexts = this.pantryDigits.map((value, index) => {
      const box = this.add.rectangle(width * (0.43 + index * 0.07), height * 0.52, width * 0.052, height * 0.09, 0x140d08, 0.84)
        .setStrokeStyle(2, 0xc49a64, 0.78)
        .setInteractive({ useHandCursor: true })
        .on("pointerdown", () => this.cyclePantryDigit(index));
      const text = this.add.text(box.x, box.y, `${value}`, {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(24, Math.floor(width / 38))}px`,
        color: "#f0d4ac"
      }).setOrigin(0.5);
      this.pantryGroup.add([box, text]);
      return text;
    });
  }

  cyclePantryDigit(index) {
    this.pantryDigits[index] = (this.pantryDigits[index] + 1) % 10;
    this.pantryDigitTexts[index].setText(`${this.pantryDigits[index]}`);
    if (this.pantryDigits.every((digit, i) => digit === PANTRY_SOLUTION[i])) {
      this.completePantryPuzzle();
    }
  }

  completePantryPuzzle() {
    this.stage = "pantry-complete";
    if (this.pantryGroup) this.pantryGroup.destroy();
    this.kitchenState.pantryUnlocked = true;
    this.kitchenState.pantryPuzzleComplete = true;
    this.kitchenState.ingredients.meat = true;
    this.awardRosePetal("petalElevenCollected", 11, "Kitchen pantry");
    this.autosave();
    this.updateInventoryHUD();

    this.playDialogueSequence([
      "Seriously?",
      "You hid the meat in a safe?",
      "Obviously.",
      "Why?",
      "So you wouldn't eat it early.",
      "...fair.",
      "I knew you would try."
    ], () => this.closeCloseup(() => this.afterIngredientCollected()));
  }

  findSecretIngredient() {
    this.stage = "secret";
    this.kitchenState.secretIngredientFound = true;
    this.kitchenState.ingredients.coriander = true;
    this.autosave();
    this.updateInventoryHUD();
    this.playDialogueSequence([
      "The secret ingredient is love.",
      "Just kidding.",
      "It's coriander.",
      "I hate you.",
      "No you don't."
    ], () => this.afterIngredientCollected());
  }

  afterIngredientCollected() {
    if (this.allIngredientsCollected() && !this.kitchenState.cookingComplete) {
      this.time.delayedCall(500, () => this.startCookingMinigame());
      return;
    }
    this.enableExploration();
  }

  startCookingMinigame() {
    this.stage = "cooking";
    this.openCloseup(TEXTURES.counter);
    this.time.delayedCall(650, () => this.createCookingStages());
  }

  createCookingStages() {
    const { width, height } = this.scale;
    this.cookingStep = 0;
    this.cookingGroup = this.add.container(0, 0).setDepth(66);
    this.cookingText = this.add.text(width / 2, height * 0.17, "Mix spices", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 50))}px`,
      color: "#f4d7b7",
      backgroundColor: "#080504",
      padding: { x: 16, y: 10 }
    }).setOrigin(0.5);
    this.cookingButton = this.add.text(width / 2, height * 0.74, "Begin", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(17, Math.floor(width / 64))}px`,
      color: "#f6d39d",
      backgroundColor: "#120907",
      padding: { x: 18, y: 10 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).on("pointerdown", () => this.advanceCookingStage());
    this.cookingGroup.add([this.cookingText, this.cookingButton]);
  }

  advanceCookingStage() {
    const stages = ["Mix spices", "Prepare filling", "Roll dough"];
    this.cookingStep += 1;

    if (this.cookingStep < stages.length) {
      this.cookingText.setText(stages[this.cookingStep]);
      this.cookingButton.setText("Continue");
      this.flash.setAlpha(0.08);
      this.tweens.add({ targets: this.flash, alpha: 0, duration: 350 });
      return;
    }

    if (this.cookingGroup) this.cookingGroup.destroy();
    this.closeCloseup(() => this.startBakingPhase());
  }

  startBakingPhase() {
    this.stage = "baking";
    this.openCloseup(TEXTURES.stove);
    const { width, height } = this.scale;
    this.ovenGlow = this.add.circle(width * 0.53, height * 0.77, width * 0.1, 0xff8a2f, 0).setDepth(66);
    this.tweens.add({ targets: this.ovenGlow, alpha: { from: 0.2, to: 0.55 }, scale: { from: 0.85, to: 1.2 }, duration: 850, yoyo: true, repeat: 5 });
    this.playDialogueSequence(["The oven breathes warm again.", "The room waits."], () => {
      this.time.delayedCall(2600, () => this.showCookedRoll());
    });
  }

  showCookedRoll() {
    if (this.ovenGlow) this.ovenGlow.destroy();
    this.closeCloseup(() => {
      this.stage = "cooked-roll";
      this.openCloseup(TEXTURES.counter);
      const { width, height } = this.scale;
      this.rollImage = this.add.image(width / 2, height * 0.44, TEXTURES.cookedRoll)
        .setOrigin(0.5)
        .setDepth(66)
        .setAlpha(0);
      this.rollImage.setScale(this.fitImage(this.rollImage, 0.42, 0.34));
      this.tweens.add({ targets: this.rollImage, alpha: 1, duration: 800 });
      this.createSteam(width / 2, height * 0.28);
      this.time.delayedCall(1200, () => this.finalMemory());
    });
  }

  createSteam(x, y) {
    this.steam = [];
    for (let i = 0; i < 8; i += 1) {
      const puff = this.add.circle(x + (i - 3.5) * 18, y + (i % 3) * 12, 12, 0xf4ead8, 0.12).setDepth(67);
      this.steam.push(puff);
    }
  }

  updateSteam() {
    if (!this.steam) return;
    this.steam.forEach((puff, index) => {
      puff.y -= 0.08 + index * 0.004;
      puff.alpha = 0.08 + Math.sin(this.time.now * 0.002 + index) * 0.04;
      if (puff.y < this.scale.height * 0.18) puff.y = this.scale.height * 0.34;
    });
  }

  finalMemory() {
    this.playDialogueSequence([
      "The room becomes quiet.",
      "Fire crackles softly."
    ], () => {
      const { width, height } = this.scale;
      const memory = this.add.image(width / 2, height * 0.42, TEXTURES.memoryRolls)
        .setOrigin(0.5)
        .setDepth(68)
        .setAlpha(0);
      memory.setScale(this.fitImage(memory, 0.62, 0.62));
      this.tweens.add({ targets: memory, alpha: 1, duration: 1400 });

      this.playDialogueSequence([
        "You were here.",
        "No response.",
        "Only warmth.",
        "Home isn't a place.",
        "It's the people who make you want to stay.",
        "Thank you for always staying."
      ], () => {
        this.kitchenState.cookingComplete = true;
        this.autosave();
        this.revealCrestAndRestore(memory);
      });
    });
  }

  revealCrestAndRestore(memory) {
    const { width, height } = this.scale;
    const crest = this.add.image(width / 2, height * 0.42, TEXTURES.crest)
      .setOrigin(0.5)
      .setDepth(69)
      .setAlpha(0);
    crest.setScale(this.fitImage(crest, 0.34, 0.34));

    this.tweens.add({ targets: [memory, this.rollImage], alpha: 0, duration: 650 });
    if (this.steam) {
      this.steam.forEach((puff) => puff.destroy());
      this.steam = null;
    }
    this.tweens.add({ targets: crest, alpha: 1, duration: 900 });

    this.time.delayedCall(950, () => {
      this.showQuestBanner("MEMORY CREST ACQUIRED\n\nTHE CREST OF WARMTH", () => {
        if (!this.kitchenState.crestCollected) {
          this.kitchenState.crestCollected = true;
          this.memoryCrestCount += 1;
          this.progress.memoryCrests = this.memoryCrestCount;
          logProgressEvent("CREST COLLECTED", { scene: "KitchenScene", crest: "Crest of Warmth" });
          logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
        }
        this.autosave();
        this.tweens.add({
          targets: crest,
          alpha: 0,
          duration: 500,
          onComplete: () => {
            crest.destroy();
            this.restoreKitchen();
          }
        });
      });
    });
  }

  restoreKitchen() {
    this.stage = "restore";
    const restored = this.add.image(0, 0, TEXTURES.restored).setOrigin(0.5).setDepth(1).setAlpha(0);
    this.coverImage(restored);
    this.tweens.add({ targets: this.goldenOverlay, alpha: 0.28, duration: 900, yoyo: true, hold: 900 });
    this.tweens.add({ targets: restored, alpha: 1, duration: 2600 });
    this.tweens.add({ targets: this.fireGlow, alpha: 0.35, scale: 1.45, duration: 1300, yoyo: true, repeat: 1 });

    this.time.delayedCall(3000, () => {
      this.background.setTexture(TEXTURES.restored);
      this.coverImage(this.background);
      restored.destroy();
      this.kitchenState.kitchenComplete = true;
      this.progress.kitchenComplete = true;
      this.progress.chapterSixUnlocked = true;
      logProgressEvent("KITCHEN COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });
      logProgressEvent("CHAPTER UNLOCKED", { chapter: 6 });
      this.autosave();
      this.updateInventoryHUD();
      this.playDialogueSequence(["The kitchen remembers warmth."], () => this.exitKitchen(true));
    });
  }

  allIngredientsCollected() {
    return Object.values(this.kitchenState.ingredients).every(Boolean);
  }

  getIngredientCount() {
    return Object.values(this.kitchenState.ingredients).filter(Boolean).length;
  }

  awardRosePetal(flag, targetCount, source) {
    if (this.kitchenState[flag]) return;
    this.kitchenState[flag] = true;
    this.rosePetalCount = Math.max(this.rosePetalCount + 1, targetCount);
    this.progress.rosePetals = this.rosePetalCount;
    logProgressEvent("ROSE PETAL COLLECTED", { scene: "KitchenScene", source });
    logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
    this.autosave();
  }

  setupCompletedKitchen() {
    this.stage = "complete";
    this.background.setTexture(TEXTURES.restored);
    this.coverImage(this.background);
    this.goldenOverlay.setAlpha(0.12);
    this.enableExploration();
  }

  exitKitchen(fromCompletion = false) {
    if (!this.kitchenState.kitchenComplete && !fromCompletion) {
      this.playDialogueSequence(["The recipe is not finished yet."], () => this.enableExploration());
      return;
    }

    this.autosave();
    fadeToScene(this, "GrandHallScene", { fromKitchen: true }, 1000);
  }

  updateInventoryHUD() {
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    if (!this.inventoryText) return;
    this.inventoryText.setText(
      `Ingredients: ${this.getIngredientCount()} / 4\nRose Petals: ${this.rosePetalCount} / 20\nMemory Crests: ${this.memoryCrestCount} / 6`
    );
  }

  autosave() {
    this.progress.kitchen = this.kitchenState;
    this.progress.rosePetals = this.rosePetalCount;
    this.progress.memoryCrests = this.memoryCrestCount;
    saveProgress();
  }

  updateHotspotGlow() {
    if (!this.hotspotGlow) return;
    this.hotspotGlow.clear();
    if (this.stage !== "explore" || this.busy) return;

    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    Object.entries(HOTSPOTS).forEach(([id, spot]) => {
      if (!this.isHotspotAvailable(id)) return;
      const color = id === "stove" ? 0xffb15a : id === "exit" ? 0xbfd7ff : 0xffd56a;
      const alpha = (this.hoveredHotspot === id ? 0.24 : 0.09) + pulse * 0.11;
      this.hotspotGlow.fillStyle(color, alpha);
      this.hotspotGlow.fillEllipse(width * spot.x, height * spot.y, width * spot.w, height * spot.h * 0.66);
    });
  }

  showQuestBanner(text, onComplete) {
    const { width, height } = this.scale;
    const banner = this.add.container(0, 0).setDepth(74).setAlpha(0);
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
