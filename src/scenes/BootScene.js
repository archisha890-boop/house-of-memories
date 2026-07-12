export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.load.image("menuBackground", "assets/images/main-menu-bg.png");
    this.load.image("introDriveReference", "assets/images/intro-drive-reference.png");
    this.load.image("graveyardBackground", "assets/images/graveyard-bg.png");
    this.load.image("ghostGirlBack", "assets/images/ghost girl back.png");
    this.load.image("ghostGirlSide", "assets/images/ghost girl side.png");
    this.load.image("ghostGirlFront", "assets/images/ghost girl front.png");
    this.load.image("ghostGirlDisappear", "assets/images/ghost girl disappear.png");
    this.load.image("manorVision", "assets/images/manor up close.png");
    this.load.image("doorsClosed", "assets/images/doors closed.png");
    this.load.image("doorsOpen", "assets/images/doors open.png");
    this.load.image("grandHall", "assets/images/grand hall.png");
    this.load.image("ironGate", "assets/images/iron gate.png");
    this.load.image("stonePedestal", "assets/images/stone pedestal.png");
    this.load.image("rosePetal", "assets/images/rose petal.png");
    this.load.image("libraryUnrestored", "assets/images/library unrestored.png");
    this.load.image("bookClosed", "assets/images/book closed.png");
    this.load.image("bookOpen", "assets/images/book open.png");
    this.load.image("lostPage", "assets/images/lost page.png");
    this.load.image("lostPage2", "assets/images/lost page 2.png");
    this.load.image("libraryPassage", "assets/images/library passage.png");
    this.load.image("memoryFirstMeeting", "assets/images/memory first meeting.png");
    this.load.image("archiveRoom", "assets/images/archive room.png");
    this.load.image("hiddenChamber", "assets/images/hidden chamber.png");
    this.load.image("crestOfBeginnings", "assets/images/crest of begginings.png");
    this.load.image("crestAcquired", "assets/images/crest acquired.png");
    this.load.image("libraryRestored", "assets/images/library restored.png");
    this.load.image("gallery", "assets/images/gallery.png");
    this.load.image("galleryRestored", "assets/images/gallery restored.png");
    this.load.image("frame1", "assets/images/frame 1.png");
    this.load.image("frame1Restored", "assets/images/frame 1 restored.png");
    this.load.image("frame2", "assets/images/frame 2.png");
    this.load.image("frame3", "assets/images/frame 3.png");
    this.load.image("gallerySketchRoom", "assets/images/gallery sketch room.png");
    this.load.image("forgottenFrame", "assets/images/forgotten frame.png");
    this.load.image("forgottenFrameRestored", "assets/images/forgotten frame restored.png");
    this.load.image("mirrorFrame", "assets/images/mirror frame.png");
    this.load.image("mirrorFrameWoman", "assets/images/mirror frame woman.png");
    this.load.image("mirrorFrameWomanDisappear", "assets/images/mirror frame woman disappear.png");
    this.load.image("crestOfMoments", "assets/images/crest of memories.png");
    this.load.image("bedroom", "assets/images/bedroom.png");
    this.load.image("bedroomRestored", "assets/images/bedroom restored.png");
    this.load.image("chest", "assets/images/chest.png");
    this.load.image("chestOpened", "assets/images/chest opened.png");
    this.load.image("crestOfUnderstanding", "assets/images/crest of understanding.png");
    this.load.image("dreamList", "assets/images/dream list.png");
    this.load.image("letter", "assets/images/letter.png");
    this.load.image("plushie", "assets/images/plushie.png");
    this.load.image("sketchbook", "assets/images/sketchbook.png");
    this.load.image("kitchenUnrestored", "assets/images/kitchen unrestored.png");
    this.load.image("kitchenRestored", "assets/images/restored kitchen.png");
    this.load.image("counterCloseup", "assets/images/counter closeup.png");
    this.load.image("pantryCloseup", "assets/images/Pantry closeup.png");
    this.load.image("stoveCloseup", "assets/images/stove closeup.png");
    this.load.image("recipeNote", "assets/images/recipe note.png");
    this.load.image("cookedRoll", "assets/images/cooked roll.png");
    this.load.image("memoryRolls", "assets/images/memory rolls.png");
    this.load.image("basementDoor", "assets/images/Basement door.png");
    this.load.image("basementUnrestored", "assets/images/Basement unrestored.png");
    this.load.image("basementRestored", "assets/images/Basement restored.png");
    this.load.image("brokenMirrorRoom", "assets/images/Broken mirror room.png");
    this.load.image("restoredMirror", "assets/images/Mirror restored.png");
    this.load.image("storageRoom", "assets/images/storage room.png");
    this.load.image("floodedChamber", "assets/images/Flooded chamber.png");
    this.load.image("mirrorFragment", "assets/images/Mirror fragment.png");
    this.load.image("crestEndurance", "assets/images/Crest of endurance.png");

  }

  create() {
    if (document.fonts && document.fonts.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise((resolve) => window.setTimeout(resolve, 1200))
      ]).then(() => this.scene.start("MainMenuScene"));
      return;
    }

    this.scene.start("MainMenuScene");
  }
}
