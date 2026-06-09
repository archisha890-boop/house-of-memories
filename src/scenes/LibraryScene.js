import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";

const PAGE_HOTSPOTS = {
  1: { x: 0.22, y: 0.48, w: 0.16, h: 0.18 },
  2: { x: 0.38, y: 0.35, w: 0.15, h: 0.17 },
  3: { x: 0.62, y: 0.42, w: 0.15, h: 0.17 },
  4: { x: 0.78, y: 0.55, w: 0.15, h: 0.17 },
  5: { x: 0.5, y: 0.72, w: 0.16, h: 0.16 }
};

const PAGE_FOUR_SEASONS = ["SPRING", "SUMMER", "AUTUMN", "WINTER"];
const PAGE_FOUR_START = ["AUTUMN", "WINTER", "SPRING", "SUMMER"];

const BOOK_HOTSPOT = { x: 0.5, y: 0.58, w: 0.16, h: 0.18 };

const PAGE_ONE_SOLUTION = [0, 1, 2];
const PAGE_ONE_START = [2, 0, 1];
const PAGE_TWO_PAGE_SHELF = 2;
const PAGE_THREE_SEQUENCE = ["Rose", "Book", "Moon"];

const PAGE_TWO_FLAVOUR = [
  "Dusty ledgers and nothing more.",
  "Old maps curled at the edges.",
  "A row of empty bindings.",
  "Nothing but silence up here."
];

export class LibraryScene extends Phaser.Scene {
  constructor() {
    super("LibraryScene");
    this.stage = "intro";
    this.pagesRecovered = 0;
    this.rosePetalCount = 0;
    this.bookHovering = false;
    this.hoveredPage = null;
    this.pageOneComplete = false;
    this.pageTwoComplete = false;
    this.pageThreeComplete = false;
    this.pageFourComplete = false;
    this.pageFiveComplete = false;
    this.memoryCrestCount = 0;
  }

  getHouseProgress() {
    return getHouseProgress();
  }

  autosaveLibrary() {
    saveProgress();
  }

  create() {
    const progress = getHouseProgress();
    logProgressEvent("SCENE START", { scene: "LibraryScene", progress });
    this.stage = "intro";
    this.pagesRecovered = 0;
    this.rosePetalCount = progress.rosePetals || 0;
    this.memoryCrestCount = progress.memoryCrests || 0;
    this.bookHovering = false;
    this.hoveredPage = null;
    this.pageOneComplete = false;
    this.pageTwoComplete = false;
    this.pageThreeComplete = false;
    this.pageFourComplete = false;
    this.pageFiveComplete = false;

    this.cameras.main.setBackgroundColor("#000000");
    this.cameras.main.fadeIn(1500, 0, 0, 0);

    this.audio = new SceneAudio(this, { rain: true, piano: true, wind: false, thunder: true, creaks: false });
    this.audio.start();
    this.audio.fadeIn();

    this.createBackground();
    this.createEnvironmentLayer();
    this.createOverlays();
    this.createBookHotspot();
    this.createPageHotspots();
    this.createInventory();

    this.dialogue = new DialogueBox(this);
    this.dialogue.create();

    this.time.delayedCall(1200, () => this.playIntroDialogue());

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      logProgressEvent("SCENE END", { scene: "LibraryScene", stage: this.stage, petals: this.rosePetalCount, crests: this.memoryCrestCount });
      if (this.audio) this.audio.destroy();
    });
  }

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    if (this.dialogue) this.dialogue.update(delta);
    this.updateBookGlow();
    this.updateActivePageGlow();
  }

  createBackground() {
    this.background = this.add.image(0, 0, "libraryUnrestored")
      .setOrigin(0.5)
      .setDepth(0);
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
    this.bookGlow = this.add.graphics().setDepth(8);
    this.pageGlow = this.add.graphics().setDepth(8);
  }

  createBookHotspot() {
    const { width, height } = this.scale;
    this.bookHotspot = this.add.rectangle(
      width * BOOK_HOTSPOT.x,
      height * BOOK_HOTSPOT.y,
      width * BOOK_HOTSPOT.w,
      height * BOOK_HOTSPOT.h,
      0xffffff,
      0
    ).setDepth(40);
  }

  createPageHotspots() {
    const { width, height } = this.scale;
    this.pageHotspots = {};

    Object.entries(PAGE_HOTSPOTS).forEach(([id, slot]) => {
      this.pageHotspots[id] = this.add.rectangle(
        width * slot.x,
        height * slot.y,
        width * slot.w,
        height * slot.h,
        0xffffff,
        0
      ).setDepth(39);
    });
  }

  createInventory() {
    const { width } = this.scale;
    this.inventoryText = this.add.text(width - 26, 24, "Lost Pages: 0 / 5", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 92))}px`,
      color: "#d8b28d",
      backgroundColor: "#070506",
      padding: { x: 14, y: 10 },
      align: "right",
      lineSpacing: 6
    }).setOrigin(1, 0).setDepth(55).setAlpha(0);
  }

  updateInventoryHUD() {
    let text = `Lost Pages: ${this.pagesRecovered} / 5`;
    if (this.rosePetalCount > 0) {
      text += `\nRose Petals: ${this.rosePetalCount} / 20`;
    }
    if (this.memoryCrestCount > 0) {
      text += `\nMemory Crests: ${this.memoryCrestCount} / 6`;
    }
    this.inventoryText.setText(text);

    const progress = this.getHouseProgress();
    progress.rosePetals = this.rosePetalCount;
    progress.memoryCrests = this.memoryCrestCount;
  }

  playIntroDialogue() {
    this.playDialogueSequence(["..."], () => {
      this.playDialogueSequence(["That's not possible."], () => {
        this.time.delayedCall(1100, () => this.showWhisperLine());
      });
    });
  }

  showWhisperLine() {
    const text = this.dialogue.text;
    text.setColor("#b8aac8");
    text.setFontStyle("italic");
    text.setAlpha(0.9);

    this.dialogue.show("Nothing here is.", () => {
      text.setColor("#f1d9bb");
      text.setFontStyle("");
      text.setAlpha(1);
      this.time.delayedCall(420, () => this.enableBook());
    });
  }

  enableBook() {
    this.stage = "book";
    this.bookHotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.bookHovering = true; })
      .on("pointerout", () => { this.bookHovering = false; })
      .once("pointerdown", () => this.openBookView());
  }

  updateBookGlow() {
    if (this.stage !== "book" || !this.bookGlow) {
      if (this.bookGlow) this.bookGlow.clear();
      return;
    }

    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.004) * 0.5;
    this.bookGlow.clear();
    this.bookGlow.fillStyle(0xe5c08a, (this.bookHovering ? 0.22 : 0.1) + pulse * 0.14);
    this.bookGlow.fillEllipse(
      width * BOOK_HOTSPOT.x,
      height * BOOK_HOTSPOT.y,
      width * BOOK_HOTSPOT.w * 1.1,
      height * BOOK_HOTSPOT.h * 0.75
    );
  }

  openBookView() {
    if (this.stage !== "book") return;
    this.stage = "book-closed";
    this.bookHotspot.disableInteractive();
    this.bookGlow.clear();

    const { width, height } = this.scale;
    this.bookView = this.add.container(0, 0).setDepth(62).setAlpha(0);
    const shade = this.add.rectangle(0, 0, width, height, 0x020202, 0.72).setOrigin(0);
    this.bookImage = this.add.image(width / 2, height / 2, "bookClosed").setOrigin(0.5);
    this.bookImage.setScale(Math.min(width / this.bookImage.width, height / this.bookImage.height) * 0.88);
    this.bookTitle = this.add.text(width / 2, height * 0.18, "THE BEGINNING", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(22, Math.floor(width / 42))}px`,
      color: "#d8b28d",
      align: "center",
      shadow: { offsetX: 2, offsetY: 2, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5);
    this.bookView.add([shade, this.bookImage, this.bookTitle]);
    this.tweens.add({ targets: this.bookView, alpha: 1, duration: 650 });

    this.bookImage
      .setInteractive({ useHandCursor: true })
      .once("pointerdown", () => this.openBook());
  }

  openBook() {
    if (this.stage !== "book-closed") return;
    this.stage = "book-open";
    this.bookImage.disableInteractive();
    this.bookImage.setTexture("bookOpen");
    this.bookTitle.setVisible(false);

    this.playDialogueSequence([
      "Every story begins somewhere.",
      "Mine began when I met you.",
      "The remaining pages have been scattered throughout the library.",
      "Find them.",
      "Restore the chapter.",
      "Remember."
    ], () => this.closeBookView());
  }

  closeBookView() {
    this.tweens.add({
      targets: this.bookView,
      alpha: 0,
      duration: 700,
      onComplete: () => {
        this.bookView.destroy();
        this.bookView = null;
        this.bookImage = null;
        this.bookTitle = null;
        this.showQuestUpdate();
      }
    });
  }

  showQuestUpdate() {
    this.stage = "quest";
    this.pagesRecovered = 0;

    const { width, height } = this.scale;
    const quest = this.add.text(width / 2, height * 0.34, "QUEST UPDATED\n\nRECOVER THE FIVE LOST PAGES\n\n0 / 5", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 48))}px`,
      color: "#e5c08a",
      align: "center",
      lineSpacing: 10,
      shadow: { offsetX: 3, offsetY: 3, color: "#120608", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(82).setAlpha(0);

    this.tweens.add({ targets: quest, alpha: 1, duration: 500 });
    this.tweens.add({
      targets: quest,
      alpha: 0,
      duration: 600,
      delay: 2600,
      onComplete: () => {
        quest.destroy();
        this.enableExploration();
      }
    });
  }

  enableExploration() {
    this.stage = "explore";
    this.updateInventoryHUD();
    this.tweens.add({ targets: this.inventoryText, alpha: 0.86, duration: 700 });
    this.refreshActivePageHotspot();
  }

  getActivePageNumber() {
    if (!this.pageOneComplete) return 1;
    if (!this.pageTwoComplete) return 2;
    if (!this.pageThreeComplete) return 3;
    if (!this.pageFourComplete) return 4;
    if (!this.pageFiveComplete) return 5;
    return null;
  }

  refreshActivePageHotspot() {
    Object.values(this.pageHotspots).forEach((hotspot) => {
      hotspot.removeAllListeners();
      hotspot.disableInteractive();
    });

    const active = this.getActivePageNumber();
    if (!active || active > 5) return;

    const hotspot = this.pageHotspots[active];
    if (!hotspot) return;

    hotspot
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => { this.hoveredPage = active; })
      .on("pointerout", () => { if (this.hoveredPage === active) this.hoveredPage = null; })
      .on("pointerdown", () => this.interactPage(active));
  }

  updateActivePageGlow() {
    if (this.stage !== "explore" || !this.pageGlow) {
      if (this.pageGlow) this.pageGlow.clear();
      return;
    }

    const active = this.getActivePageNumber();
    if (!active || active > 5) {
      this.pageGlow.clear();
      return;
    }

    const slot = PAGE_HOTSPOTS[active];
    const { width, height } = this.scale;
    const pulse = 0.5 + Math.sin(this.time.now * 0.0042) * 0.5;
    const hovering = this.hoveredPage === active;
    this.pageGlow.clear();
    this.pageGlow.fillStyle(0xbfd7ff, (hovering ? 0.22 : 0.11) + pulse * 0.14);
    this.pageGlow.fillEllipse(
      width * slot.x,
      height * slot.y,
      width * slot.w * 1.05,
      height * slot.h * 0.72
    );
  }

  interactPage(pageNumber) {
    if (this.stage !== "explore") return;
    if (this.dialogue && this.dialogue.visible) return;
    if (pageNumber === 1 && !this.pageOneComplete) this.openPageOnePuzzle();
    else if (pageNumber === 2 && this.pageOneComplete && !this.pageTwoComplete) this.openPageTwoPuzzle();
    else if (pageNumber === 3 && this.pageTwoComplete && !this.pageThreeComplete) this.openPageThreePuzzle();
    else if (pageNumber === 4 && this.pageThreeComplete && !this.pageFourComplete) this.openPageFourPuzzle();
    else if (pageNumber === 5 && this.pageFourComplete && !this.pageFiveComplete) this.enterHiddenChamber();
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

  addPuzzleControl(gameObject) {
    gameObject.setDepth(70);
    this.puzzleControls.push(gameObject);
    return gameObject;
  }

  clearPuzzleControls() {
    if (!this.puzzleControls) return;
    this.puzzleControls.forEach((control) => control.destroy());
    this.puzzleControls = [];
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

  makePuzzleButton(x, y, label, onClick, fontSize = 18) {
    const { width } = this.scale;
    const button = this.add.text(x, y, label, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(fontSize, Math.floor(width / 72))}px`,
      color: "#d8b28d",
      backgroundColor: "#1a120f",
      padding: { x: 18, y: 12 }
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    button.on("pointerdown", (pointer, localX, localY, event) => {
      if (event && event.stopPropagation) event.stopPropagation();
      onClick();
    });

    return this.addPuzzleControl(button);
  }

  imageScale(image, maxWidthRatio = 0.35, maxHeightRatio = 0.45) {
    const { width, height } = this.scale;
    return Math.min(
      (width * maxWidthRatio) / image.width,
      (height * maxHeightRatio) / image.height
    );
  }

  puzzleTitle(view, label) {
    const { width } = this.scale;
    const title = this.add.text(width / 2, this.scale.height * 0.1, label, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 52))}px`,
      color: "#d8b28d",
      align: "center"
    }).setOrigin(0.5);
    view.add(title);
    return title;
  }

  puzzleHint(view, message) {
    const { width, height } = this.scale;
    const hint = this.add.text(width / 2, height * 0.88, message, {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(14, Math.floor(width / 72))}px`,
      color: "#a9867c",
      align: "center",
      wordWrap: { width: width * 0.7 }
    }).setOrigin(0.5);
    view.add(hint);
    return hint;
  }

  // --- Page One: sliding bookshelf ---

  openPageOnePuzzle() {
    this.stage = "puzzle-page-one";
    Object.values(this.pageHotspots).forEach((hotspot) => hotspot.disableInteractive());
    this.pageGlow.clear();

    const { width, height } = this.scale;
    this.pageOneView = this.openCloseupView();
    this.puzzleTitle(this.pageOneView, "THE MOVING SHELVES");
    this.puzzleHint(this.pageOneView, "Use the arrows to slide each shelf. Line them up left to right.");

    const bg = this.add.image(width / 2, height * 0.52, "libraryUnrestored").setOrigin(0.5);
    bg.setScale(Math.max(width / bg.width, height / bg.height) * 1.1);
    this.pageOneView.add(bg);

    this.pageOnePositions = [...PAGE_ONE_START];
    this.pageOneSolved = false;
    this.pageOneSlots = [width * 0.28, width * 0.5, width * 0.72];
    this.pageOneShelfY = height * 0.46;
    this.pageOneShelves = [];

    this.pageOneCompartment = this.add.image(width / 2, height * 0.6, "lostPage").setOrigin(0.5);
    this.pageOneCompartment.setScale(this.imageScale(this.pageOneCompartment, 0.22, 0.28));
    this.pageOneCompartment.setAlpha(0).setDepth(63);
    this.pageOneView.add(this.pageOneCompartment);

    for (let i = 0; i < 3; i += 1) {
      this.createPageOneShelf(i);
    }

    this.renderPageOneShelves(false);
    this.bindPageOneKeyboard();
  }

  bindPageOneKeyboard() {
    this.pageOneKeyLeft = this.input.keyboard.on("keydown-LEFT", () => this.shiftPageOneShelf(this.pageOneFocus || 0, -1));
    this.pageOneKeyRight = this.input.keyboard.on("keydown-RIGHT", () => this.shiftPageOneShelf(this.pageOneFocus || 0, 1));
    this.pageOneKeyOne = this.input.keyboard.on("keydown-ONE", () => { this.pageOneFocus = 0; });
    this.pageOneKeyTwo = this.input.keyboard.on("keydown-TWO", () => { this.pageOneFocus = 1; });
    this.pageOneKeyThree = this.input.keyboard.on("keydown-THREE", () => { this.pageOneFocus = 2; });
    this.pageOneFocus = 0;
  }

  unbindPageOneKeyboard() {
    if (!this.input.keyboard) return;
    this.input.keyboard.off("keydown-LEFT", this.pageOneKeyLeft);
    this.input.keyboard.off("keydown-RIGHT", this.pageOneKeyRight);
    this.input.keyboard.off("keydown-ONE", this.pageOneKeyOne);
    this.input.keyboard.off("keydown-TWO", this.pageOneKeyTwo);
    this.input.keyboard.off("keydown-THREE", this.pageOneKeyThree);
  }

  createPageOneShelf(index) {
    const { width, height } = this.scale;
    const x = this.pageOneSlots[this.pageOnePositions[index]];
    const shelf = this.add.container(x, this.pageOneShelfY).setDepth(64);
    const panel = this.add.image(0, 0, "bookClosed").setOrigin(0.5);
    panel.setScale(this.imageScale(panel, 0.16, 0.22));
    const label = this.add.text(0, panel.displayHeight * 0.62, `Shelf ${index + 1}`, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 88))}px`,
      color: "#d8b28d"
    }).setOrigin(0.5);

    shelf.add([panel, label]);
    this.pageOneView.add(shelf);
    this.pageOneShelves.push(shelf);

    const btnY = height * 0.72;
    this.makePuzzleButton(
      x - width * 0.07,
      btnY,
      `◀ ${index + 1}`,
      () => this.shiftPageOneShelf(index, -1)
    );
    this.makePuzzleButton(
      x + width * 0.07,
      btnY,
      `${index + 1} ▶`,
      () => this.shiftPageOneShelf(index, 1)
    );
  }

  shiftPageOneShelf(index, direction) {
    if (this.stage !== "puzzle-page-one" || this.pageOneSolved) return;

    const current = this.pageOnePositions[index];
    const next = Phaser.Math.Clamp(current + direction, 0, 2);
    if (next === current) return;

    const otherIndex = this.pageOnePositions.indexOf(next);
    if (otherIndex !== -1) {
      this.pageOnePositions[otherIndex] = current;
    }
    this.pageOnePositions[index] = next;
    this.renderPageOneShelves(true);
    this.checkPageOneSolution();
  }

  renderPageOneShelves(animate) {
    this.pageOneShelves.forEach((shelf, index) => {
      const targetX = this.pageOneSlots[this.pageOnePositions[index]];
      if (animate) {
        this.tweens.add({
          targets: shelf,
          x: targetX,
          duration: 220,
          ease: "Sine.easeOut"
        });
      } else {
        shelf.x = targetX;
      }
    });
  }

  checkPageOneSolution() {
    if (this.pageOneSolved) return;
    const solved = PAGE_ONE_SOLUTION.every((slot, index) => this.pageOnePositions[index] === slot);
    if (!solved) {
      this.pageOneCompartment.setAlpha(0);
      return;
    }

    this.pageOneSolved = true;
    this.pageOneCompartment.setAlpha(0.95);
    this.time.delayedCall(600, () => this.completePageOne());
  }

  completePageOne() {
    if (this.stage === "page-one-reward") return;
    this.stage = "page-one-reward";
    this.unbindPageOneKeyboard();
    this.pagesRecovered = 1;
    this.pageOneComplete = true;
    this.updateInventoryHUD();

    this.closeView(this.pageOneView, () => {
      this.pageOneView = null;
      this.showLostPageReward("lostPage", [
        "I did not know then that you would become my favorite person."
      ], () => {
        this.showMemoryImage("memoryFirstMeeting", () => {
          this.applyBookshelfRestored();
          this.stage = "explore";
          this.refreshActivePageHotspot();
        });
      });
    });
  }

  showLostPageReward(textureKey, lines, onComplete) {
    const { width, height } = this.scale;
    const view = this.openCloseupView();
    const page = this.add.image(width / 2, height * 0.42, textureKey).setOrigin(0.5);
    page.setScale(this.imageScale(page, 0.24, 0.32));
    view.add(page);

    this.playDialogueSequence(lines, () => {
      this.closeView(view, onComplete);
    });
  }

  showMemoryImage(textureKey, onComplete) {
    const { width, height } = this.scale;
    const view = this.openCloseupView();
    const memory = this.add.image(width / 2, height / 2, textureKey).setOrigin(0.5);
    memory.setScale(Math.min(width / memory.width, height / memory.height) * 0.82);
    view.add(memory);

    this.time.delayedCall(2200, () => {
      this.closeView(view, onComplete);
    });
  }

  applyBookshelfRestored() {
    const slot = PAGE_HOTSPOTS[1];
    const { width, height } = this.scale;
    const restored = this.add.rectangle(
      width * slot.x,
      height * slot.y,
      width * slot.w * 1.6,
      height * slot.h * 1.4,
      0xffd8a8,
      0
    ).setDepth(0);
    this.envLayer.add(restored);
    this.tweens.add({ targets: restored, alpha: 0.24, duration: 1200 });
  }

  // --- Page Two: rolling ladder ---

  openPageTwoPuzzle() {
    this.stage = "puzzle-page-two";
    Object.values(this.pageHotspots).forEach((hotspot) => hotspot.disableInteractive());
    this.pageGlow.clear();

    const { width, height } = this.scale;
    this.pageTwoView = this.openCloseupView();
    this.puzzleTitle(this.pageTwoView, "THE ROLLING LADDER");
    this.puzzleHint(this.pageTwoView, "Move the ladder, then press Search. The page is on one of the upper shelves.");

    this.pageTwoLadderIndex = 0;
    this.pageTwoShelfCount = 4;
    this.pageTwoLadderX = [width * 0.2, width * 0.38, width * 0.56, width * 0.74];
    this.pageTwoShelfY = height * 0.34;
    this.pageTwoLadderY = height * 0.54;

    for (let i = 0; i < this.pageTwoShelfCount; i += 1) {
      const shelf = this.add.text(this.pageTwoLadderX[i], this.pageTwoShelfY, `Shelf ${i + 1}`, {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(14, Math.floor(width / 78))}px`,
        color: "#c9a87a",
        backgroundColor: "#120f0d",
        padding: { x: 12, y: 8 }
      }).setOrigin(0.5).setDepth(63);
      this.pageTwoView.add(shelf);
    }

    this.pageTwoLadder = this.add.text(this.pageTwoLadderX[0], this.pageTwoLadderY, "▲\nLADDER\n▼", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(13, Math.floor(width / 82))}px`,
      color: "#e5c08a",
      align: "center",
      lineSpacing: 4
    }).setOrigin(0.5).setDepth(63);
    this.pageTwoView.add(this.pageTwoLadder);

    const controlsY = height * 0.76;
    this.makePuzzleButton(width * 0.3, controlsY, "◀ Move", () => this.movePageTwoLadder(-1));
    this.makePuzzleButton(width * 0.5, controlsY, "Move ▶", () => this.movePageTwoLadder(1));
    this.makePuzzleButton(width * 0.7, controlsY, "Search", () => this.searchPageTwoShelf());

    this.pageTwoKeyLeft = this.input.keyboard.on("keydown-LEFT", () => this.movePageTwoLadder(-1));
    this.pageTwoKeyRight = this.input.keyboard.on("keydown-RIGHT", () => this.movePageTwoLadder(1));
    this.pageTwoKeyEnter = this.input.keyboard.on("keydown-ENTER", () => this.searchPageTwoShelf());
  }

  unbindPageTwoKeyboard() {
    if (!this.input.keyboard) return;
    this.input.keyboard.off("keydown-LEFT", this.pageTwoKeyLeft);
    this.input.keyboard.off("keydown-RIGHT", this.pageTwoKeyRight);
    this.input.keyboard.off("keydown-ENTER", this.pageTwoKeyEnter);
  }

  movePageTwoLadder(direction) {
    if (this.stage !== "puzzle-page-two") return;
    this.pageTwoLadderIndex = Phaser.Math.Clamp(this.pageTwoLadderIndex + direction, 0, this.pageTwoShelfCount - 1);
    this.tweens.add({
      targets: this.pageTwoLadder,
      x: this.pageTwoLadderX[this.pageTwoLadderIndex],
      duration: 260,
      ease: "Sine.easeOut"
    });
  }

  searchPageTwoShelf() {
    if (this.stage !== "puzzle-page-two") return;
    if (this.pageTwoLadderIndex === PAGE_TWO_PAGE_SHELF) {
      this.completePageTwo();
      return;
    }

    const line = PAGE_TWO_FLAVOUR[this.pageTwoLadderIndex] || "Nothing here.";
    this.playDialogueSequence([line]);
  }

  completePageTwo() {
    this.stage = "page-two-reward";
    this.unbindPageTwoKeyboard();
    this.pagesRecovered = 2;
    this.pageTwoComplete = true;
    this.updateInventoryHUD();

    this.closeView(this.pageTwoView, () => {
      this.pageTwoView = null;
      this.showLostPageReward("lostPage2", [
        "You arrived quietly.",
        "Then somehow became impossible to ignore."
      ], () => {
        this.applyWindowMoonlight();
        this.stage = "explore";
        this.refreshActivePageHotspot();
      });
    });
  }

  applyWindowMoonlight() {
    const slot = PAGE_HOTSPOTS[2];
    const { width, height } = this.scale;
    const moon = this.add.rectangle(width * slot.x, height * slot.y, width * slot.w * 2.2, height * slot.h * 2.4, 0xaec7e8, 0)
      .setDepth(0);
    this.envLayer.add(moon);
    this.tweens.add({ targets: moon, alpha: 0.28, duration: 1400 });
  }

  // --- Page Three: secret bookshelf ---

  openPageThreePuzzle() {
    this.stage = "puzzle-page-three";
    Object.values(this.pageHotspots).forEach((hotspot) => hotspot.disableInteractive());
    this.pageGlow.clear();

    const { width, height } = this.scale;
    this.pageThreeView = this.openCloseupView();
    this.puzzleTitle(this.pageThreeView, "THE SECRET SHELF");
    this.puzzleHint(this.pageThreeView, "Pull the books in order: Rose, then Book, then Moon.");

    this.pageThreeInput = [];
    this.pageThreeBooks = {};

    const bookNames = PAGE_THREE_SEQUENCE;
    const startX = width * 0.28;
    const gap = width * 0.22;
    const bookY = height * 0.48;

    bookNames.forEach((name) => {
      const book = this.makePuzzleButton(
        startX + gap * bookNames.indexOf(name),
        bookY,
        name.toUpperCase(),
        () => this.selectPageThreeBook(name),
        16
      );
      this.pageThreeBooks[name] = book;
    });
  }

  resetPageThreeBooks() {
    this.pageThreeInput = [];
    Object.values(this.pageThreeBooks).forEach((book) => book.setColor("#d8b28d"));
  }

  selectPageThreeBook(name) {
    if (this.stage !== "puzzle-page-three") return;
    if (this.pageThreeInput.includes(name)) return;

    this.pageThreeInput.push(name);
    this.pageThreeBooks[name].setColor("#f4d7b7");

    const step = this.pageThreeInput.length - 1;
    if (PAGE_THREE_SEQUENCE[step] !== name) {
      this.playDialogueSequence(["Nothing happens."], () => this.resetPageThreeBooks());
      return;
    }

    if (this.pageThreeInput.length === PAGE_THREE_SEQUENCE.length) {
      this.time.delayedCall(400, () => this.openPageThreePassage());
    }
  }

  openPageThreePassage() {
    this.stage = "page-three-passage";
    this.closeView(this.pageThreeView, () => {
      this.pageThreeView = null;

      const { width, height } = this.scale;
      this.passageView = this.openCloseupView();
      const passage = this.add.image(width / 2, height / 2, "libraryPassage").setOrigin(0.5);
      passage.setScale(Math.max(width / passage.width, height / passage.height));
      this.passageView.add(passage);

      this.time.delayedCall(900, () => this.collectPageThreePetal());
    });
  }

  collectPageThreePetal() {
    const { width, height } = this.scale;
    const petal = this.add.image(width / 2, height * 0.46, "rosePetal").setOrigin(0.5);
    petal.setScale(this.imageScale(petal, 0.18, 0.24));
    this.addPuzzleControl(petal);
    petal.setInteractive({ useHandCursor: true });

    this.tweens.add({
      targets: petal,
      alpha: { from: 0.7, to: 1 },
      duration: 900,
      yoyo: true,
      repeat: -1
    });

    petal.once("pointerdown", () => {
      petal.disableInteractive();
      const progress = this.getHouseProgress();
      if (!progress.library.pageThreePetalCollected) {
        this.rosePetalCount += 1;
        progress.library.pageThreePetalCollected = true;
        logProgressEvent("ROSE PETAL COLLECTED", { scene: "LibraryScene", source: "Page 3 passage" });
      }
      this.updateInventoryHUD();
      logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
      this.autosaveLibrary();

      const found = this.add.text(width / 2, height * 0.22, `ROSE PETAL FOUND\n${this.rosePetalCount} / 20`, {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(20, Math.floor(width / 46))}px`,
        color: "#ffb2a8",
        align: "center",
        shadow: { offsetX: 3, offsetY: 3, color: "#2a0508", blur: 0, fill: true }
      }).setOrigin(0.5).setDepth(71);
      this.puzzleControls.push(found);

      this.playDialogueSequence(["You still owe me snacks."], () => {
        this.tweens.add({
          targets: petal,
          alpha: 0,
          duration: 600,
          onComplete: () => this.revealPageThree()
        });
      });
    });
  }

  revealPageThree() {
    this.playDialogueSequence([
      "The strangest thing about meeting you...",
      "Was how quickly you felt familiar."
    ], () => {
      this.pagesRecovered = 3;
      this.pageThreeComplete = true;
      this.updateInventoryHUD();

      this.closeView(this.passageView, () => {
        this.passageView = null;
        this.applyCandleLight();
        this.stage = "explore";
        this.refreshActivePageHotspot();
      });
    });
  }

  applyCandleLight() {
    const { width, height } = this.scale;
    const candles = [
      [0.14, 0.58], [0.32, 0.44], [0.5, 0.38], [0.68, 0.46], [0.86, 0.6]
    ];

    candles.forEach(([x, y], index) => {
      const flame = this.add.circle(width * x, height * y, Math.max(10, width * 0.012), 0xffb86a, 0)
        .setDepth(1);
      this.envLayer.add(flame);
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.15, to: 0.42 },
        duration: 900,
        delay: index * 120,
        yoyo: true,
        repeat: -1
      });
    });
  }

  showQuestBanner(message, onComplete = null) {
    const { width, height } = this.scale;
    const banner = this.add.text(width / 2, height * 0.32, message, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(18, Math.floor(width / 52))}px`,
      color: "#e5c08a",
      align: "center",
      lineSpacing: 10,
      shadow: { offsetX: 3, offsetY: 3, color: "#120608", blur: 0, fill: true }
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

  showCinematicText(message, holdMs = 1800, onComplete = null) {
    const { width, height } = this.scale;
    const text = this.add.text(width / 2, height / 2, message, {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 48))}px`,
      color: "#f1d9bb",
      align: "center",
      wordWrap: { width: width * 0.72 }
    }).setOrigin(0.5).setDepth(83).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 700,
      yoyo: true,
      hold: holdMs,
      onComplete: () => {
        text.destroy();
        if (onComplete) onComplete();
      }
    });
  }

  // --- Page Four: archive room ---

  openPageFourPuzzle() {
    this.stage = "puzzle-page-four";
    Object.values(this.pageHotspots).forEach((hotspot) => hotspot.disableInteractive());
    this.pageGlow.clear();

    const { width, height } = this.scale;
    this.pageFourView = this.openCloseupView();
    this.puzzleTitle(this.pageFourView, "THE ARCHIVE LOCK");
    this.puzzleHint(this.pageFourView, "Use ▲ and ▼ to arrange the seasons: Spring, Summer, Autumn, Winter.");

    this.pageFourOrder = [...PAGE_FOUR_START];
    this.pageFourSolved = false;
    this.pageFourRows = [];
    this.pageFourRowY = height * 0.3;
    this.pageFourRowGap = height * 0.1;

    this.renderPageFourBooks();
  }

  renderPageFourBooks() {
    const { width, height } = this.scale;
    this.clearPuzzleControls();
    this.pageFourRows.forEach((row) => row.destroy());
    this.pageFourRows = [];

    this.pageFourOrder.forEach((season, index) => {
      const y = this.pageFourRowY + index * this.pageFourRowGap;
      const label = this.add.text(width * 0.42, y, season, {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(15, Math.floor(width / 68))}px`,
        color: "#d8b28d",
        backgroundColor: "#1a120f",
        padding: { x: 16, y: 10 }
      }).setOrigin(0.5).setDepth(63);
      this.pageFourView.add(label);
      this.pageFourRows.push(label);

      this.makePuzzleButton(width * 0.62, y, "▲", () => this.movePageFourBook(index, -1), 16);
      this.makePuzzleButton(width * 0.72, y, "▼", () => this.movePageFourBook(index, 1), 16);
    });

    this.checkPageFourSolution();
  }

  movePageFourBook(index, direction) {
    if (this.stage !== "puzzle-page-four") return;
    const target = index + direction;
    if (target < 0 || target >= this.pageFourOrder.length) return;

    const next = [...this.pageFourOrder];
    [next[index], next[target]] = [next[target], next[index]];
    this.pageFourOrder = next;
    this.renderPageFourBooks();
  }

  checkPageFourSolution() {
    if (this.stage !== "puzzle-page-four" || this.pageFourSolved) return;
    const solved = PAGE_FOUR_SEASONS.every((season, index) => this.pageFourOrder[index] === season);
    if (!solved) return;

    this.pageFourSolved = true;
    this.stage = "page-four-unlock";
    this.time.delayedCall(500, () => this.openArchiveRoom());
  }

  openArchiveRoom() {
    this.closeView(this.pageFourView, () => {
      this.pageFourView = null;
      this.stage = "archive-room";

      const { width, height } = this.scale;
      this.archiveView = this.openCloseupView();
      const room = this.add.image(width / 2, height / 2, "archiveRoom").setOrigin(0.5);
      room.setScale(Math.max(width / room.width, height / room.height));
      this.archiveView.add(room);

      const page = this.add.image(width / 2, height * 0.52, "lostPage").setOrigin(0.5);
      page.setScale(this.imageScale(page, 0.2, 0.26));
      this.addPuzzleControl(page);
      page.setInteractive({ useHandCursor: true });
      this.tweens.add({
        targets: page,
        alpha: { from: 0.75, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1
      });
      page.once("pointerdown", () => this.collectPageFour(page));
    });
  }

  collectPageFour(pageImage) {
    if (this.stage !== "archive-room") return;
    pageImage.disableInteractive();
    this.stage = "page-four-reward";

    this.playDialogueSequence([
      "The best stories never announce themselves.",
      "They simply begin."
    ], () => {
      this.pagesRecovered = 4;
      this.pageFourComplete = true;
      this.updateInventoryHUD();

      this.closeView(this.archiveView, () => {
        this.archiveView = null;
        this.showQuestBanner("4 / 5 PAGES RECOVERED", () => {
          this.applyPageFourAtmosphere();
          this.stage = "explore";
          this.refreshActivePageHotspot();
        });
      });
    });
  }

  applyPageFourAtmosphere() {
    const { width, height } = this.scale;
    const warm = this.add.rectangle(width / 2, height / 2, width, height, 0xffd8a8, 0).setDepth(0);
    this.envLayer.add(warm);
    this.tweens.add({ targets: warm, alpha: 0.12, duration: 1400 });

    this.playDialogueSequence(["A brief laugh echoes through the library."]);
    this.addMoreCandles([
      [0.2, 0.5], [0.45, 0.32], [0.72, 0.52], [0.88, 0.38]
    ]);
  }

  addMoreCandles(positions) {
    const { width, height } = this.scale;
    positions.forEach(([x, y], index) => {
      const flame = this.add.circle(width * x, height * y, Math.max(10, width * 0.012), 0xffb86a, 0).setDepth(1);
      this.envLayer.add(flame);
      this.tweens.add({
        targets: flame,
        alpha: { from: 0.18, to: 0.45 },
        duration: 900,
        delay: index * 100,
        yoyo: true,
        repeat: -1
      });
    });
  }

  // --- Page Five: hidden chamber ---

  enterHiddenChamber() {
    this.stage = "hidden-chamber";
    Object.values(this.pageHotspots).forEach((hotspot) => hotspot.disableInteractive());
    this.pageGlow.clear();

    const { width, height } = this.scale;
    this.chamberView = this.openCloseupView();
    const chamber = this.add.image(width / 2, height / 2, "hiddenChamber").setOrigin(0.5);
    chamber.setScale(Math.max(width / chamber.width, height / chamber.height));
    this.chamberView.add(chamber);

    const petal = this.add.image(width * 0.44, height * 0.54, "rosePetal").setOrigin(0.5);
    petal.setScale(this.imageScale(petal, 0.14, 0.18));
    this.addPuzzleControl(petal);
    petal.setInteractive({ useHandCursor: true });
    this.tweens.add({ targets: petal, alpha: { from: 0.7, to: 1 }, duration: 900, yoyo: true, repeat: -1 });

    const finalPage = this.add.image(width * 0.56, height * 0.52, "lostPage").setOrigin(0.5);
    finalPage.setScale(this.imageScale(finalPage, 0.16, 0.2));
    finalPage.setAlpha(0.55);
    this.addPuzzleControl(finalPage);
    this.chamberFinalPage = finalPage;

    petal.once("pointerdown", () => this.collectFinalPetal(petal));
  }

  collectFinalPetal(petal) {
    if (this.stage !== "hidden-chamber") return;
    petal.disableInteractive();
    const progress = this.getHouseProgress();
    if (!progress.library.pageFivePetalCollected) {
      this.rosePetalCount += 1;
      progress.library.pageFivePetalCollected = true;
      logProgressEvent("ROSE PETAL COLLECTED", { scene: "LibraryScene", source: "Page 5 hidden chamber" });
    }
    this.updateInventoryHUD();
    logProgressEvent("ROSE PETAL TOTAL", { total: this.rosePetalCount });
    this.autosaveLibrary();

    const { width, height } = this.scale;
    const found = this.add.text(width / 2, height * 0.2, `ROSE PETAL FOUND\n${this.rosePetalCount} / 20`, {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(20, Math.floor(width / 46))}px`,
      color: "#ffb2a8",
      align: "center",
      shadow: { offsetX: 3, offsetY: 3, color: "#2a0508", blur: 0, fill: true }
    }).setOrigin(0.5).setDepth(71);
    this.puzzleControls.push(found);

    this.playDialogueSequence(["You looked cute that day."], () => {
      this.tweens.add({ targets: petal, alpha: 0, duration: 500, onComplete: () => petal.destroy() });
      this.chamberFinalPage.setAlpha(1);
      this.addPuzzleControl(this.chamberFinalPage);
      this.chamberFinalPage.setInteractive({ useHandCursor: true });
      this.tweens.add({
        targets: this.chamberFinalPage,
        alpha: { from: 0.85, to: 1 },
        duration: 900,
        yoyo: true,
        repeat: -1
      });
      this.chamberFinalPage.once("pointerdown", () => this.collectFinalPage());
    });
  }

  collectFinalPage() {
    if (this.stage !== "hidden-chamber") return;
    this.stage = "final-page";
    this.chamberFinalPage.disableInteractive();
    if (this.audio) this.audio.fadeOut();

    this.playDialogueSequence([
      "If you are reading this...",
      "Then you've already come farther than I expected.",
      "Good.",
      "Keep going.",
      "I'm waiting."
    ], () => this.dissolveFinalPage(), [0, 1100, 1100, 1100, 1400]);
  }

  dissolveFinalPage() {
    this.tweens.add({
      targets: this.chamberFinalPage,
      alpha: 0,
      scaleX: this.chamberFinalPage.scaleX * 1.4,
      scaleY: this.chamberFinalPage.scaleY * 1.4,
      tint: 0xfff2c8,
      duration: 1200,
      ease: "Sine.easeIn",
      onComplete: () => {
        this.pagesRecovered = 5;
        this.pageFiveComplete = true;
        this.updateInventoryHUD();
        this.showQuestBanner("5 / 5 PAGES RECOVERED", () => this.startLibraryCompletion());
      }
    });
  }

  startLibraryCompletion() {
    this.stage = "library-complete";
    this.closeView(this.chamberView, () => {
      this.chamberView = null;
      this.showCompletedChapter();
    });
  }

  showCompletedChapter() {
    const { width, height } = this.scale;
    const view = this.openCloseupView();
    const book = this.add.image(width / 2, height / 2, "bookOpen").setOrigin(0.5);
    book.setScale(Math.min(width / book.width, height / book.height) * 0.82);
    view.add(book);

    this.playDialogueSequence([
      "Images.",
      "Moments.",
      "Fragments of memories.",
      "A life unfolding."
    ], () => {
      const crest = this.add.image(width / 2, height * 0.38, "crestOfBeginnings").setOrigin(0.5);
      crest.setScale(this.imageScale(crest, 0.22, 0.28)).setAlpha(0);
      view.add(crest);
      this.tweens.add({
        targets: crest,
        alpha: 1,
        duration: 900,
        onComplete: () => this.showCrestAcquired(view)
      });
    });
  }

  showCrestAcquired(view) {
    const { width, height } = this.scale;
    const acquired = this.add.image(width / 2, height * 0.55, "crestAcquired").setOrigin(0.5);
    acquired.setScale(this.imageScale(acquired, 0.24, 0.3)).setAlpha(0);
    view.add(acquired);

    this.tweens.add({ targets: acquired, alpha: 1, duration: 800 });
    this.showCinematicText("MEMORY CREST ACQUIRED\n\nTHE CREST OF BEGINNINGS", 2200, () => {
      this.memoryCrestCount += 1;
      logProgressEvent("CREST COLLECTED", { scene: "LibraryScene", crest: "Crest of Beginnings" });
      logProgressEvent("CREST TOTAL", { total: this.memoryCrestCount });
      this.updateInventoryHUD();
      this.closeView(view, () => this.runRestorationEvent());
    });
  }

  runRestorationEvent() {
    this.stage = "restoration";
    const { width, height } = this.scale;

    this.cameras.main.shake(500, 0.002);
    this.showCinematicText("The library trembles.", 1200, () => {
      const restored = this.add.image(width / 2, height / 2, "libraryRestored").setOrigin(0.5).setAlpha(0).setDepth(0);
      this.coverImage(restored);

      this.tweens.add({
        targets: this.background,
        alpha: 0,
        duration: 1800
      });
      this.tweens.add({
        targets: restored,
        alpha: 1,
        duration: 1800,
        onComplete: () => {
          this.background.destroy();
          this.background = restored;
          this.addMoreCandles([
            [0.12, 0.55], [0.28, 0.4], [0.5, 0.35], [0.7, 0.42], [0.88, 0.58], [0.62, 0.62]
          ]);
          const moon = this.add.rectangle(width * 0.35, height * 0.3, width * 0.35, height * 0.3, 0xc8daf5, 0).setDepth(0);
          this.envLayer.add(moon);
          this.tweens.add({ targets: moon, alpha: 0.22, duration: 1600 });
          this.returnToGrandHall();
        }
      });
    });
  }

  returnToGrandHall() {
    this.playDialogueSequence(["The house remembers."], () => {
      const progress = this.getHouseProgress();
      progress.libraryComplete = true;
      progress.rosePetals = this.rosePetalCount;
      progress.memoryCrests = this.memoryCrestCount;
      logProgressEvent("LIBRARY COMPLETE", { petals: this.rosePetalCount, crests: this.memoryCrestCount });
      this.autosaveLibrary();

      this.cameras.main.fadeOut(1400, 0, 0, 0);
      this.time.delayedCall(1500, () => {
        this.scene.start("GrandHallScene", { fromLibrary: true });
      });
    }, [900]);
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
