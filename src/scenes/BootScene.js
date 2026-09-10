export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload() {
    this.createLoadingScreen();

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
    this.load.image("observatoryStaircase", "assets/images/Observatory Staircase.png");
    this.load.image("observatoryUnrestored", "assets/images/Observatory unrestored.png");
    this.load.image("observatoryRestored", "assets/images/Observatory Restored.png");
    this.load.image("telescopeCloseup", "assets/images/Telescope closeup.png");
    this.load.image("orreryCloseup", "assets/images/Orerry closeup.png");
    this.load.image("starChartCloseup", "assets/images/Celestial Chart.png");
    this.load.image("celestialMechanism", "assets/images/celestial mechanism.png");
    this.load.image("crimsonRose", "assets/images/crimson rose.png");
    this.load.image("crestTomorrow", "assets/images/crest of tomorrow.png");
    this.load.image("greenhouseFinalInterior", "assets/images/greenhouse_final_interior.png.png");
    this.load.image("realWorldBedroom", "assets/images/real_world_bedroom.png.png");
    this.load.image("finalPhoto", "assets/images/final_photo.png.png");
    this.load.image("greenhouseFinal", "assets/images/greenhouse_final.png.png");
    this.load.audio("finaleTheme", "assets/soundtrack/sonican-ambient-piano-loop-no2-ethereal-mystery-591785.mp3");

  }

  createLoadingScreen() {
    const { width, height } = this.scale;
    const barWidth = Math.min(width * 0.52, 560);
    const barY = height * 0.58;

    this.cameras.main.setBackgroundColor("#050507");

    const title = this.add.text(width / 2, height * 0.41, "THE HOUSE OF MEMORIES", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${Math.max(28, Math.min(52, width * 0.045))}px`,
      color: "#d9c0a0",
      align: "center",
      stroke: "#12090c",
      strokeThickness: 6
    }).setOrigin(0.5);

    title.setShadow(0, 0, "#8f2f35", 14, true, true);

    const subtitle = this.add.text(width / 2, height * 0.49, "Loading memories...", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${Math.max(14, Math.min(21, width * 0.018))}px`,
      color: "#9f8265",
      align: "center"
    }).setOrigin(0.5);

    const barBack = this.add.rectangle(width / 2, barY, barWidth, 10, 0x160d11, 0.96)
      .setStrokeStyle(1, 0x735a44, 0.88);

    const barFill = this.add.rectangle(width / 2 - barWidth / 2, barY, 1, 8, 0xd8b28d, 0.94)
      .setOrigin(0, 0.5);

    const percent = this.add.text(width / 2, height * 0.64, "0%", {
      fontFamily: "Georgia, 'Times New Roman', serif",
      fontSize: `${Math.max(12, Math.min(17, width * 0.014))}px`,
      color: "#6f5945",
      align: "center"
    }).setOrigin(0.5);

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0.55, to: 1 },
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut"
    });

    this.load.on("progress", (value) => {
      barFill.displayWidth = Math.max(1, barWidth * value);
      percent.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on("complete", () => {
      barFill.displayWidth = barWidth;
      percent.setText("Ready");
    });

    this.load.on("loaderror", (file) => {
      console.warn("[HOUSE] Asset failed to load:", file.key, file.src);
    });
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
