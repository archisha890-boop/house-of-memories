import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";
import { canEnterFinale, getHouseProgress, logProgressEvent, saveProgress } from "../systems/HouseProgress.js";
import { fadeBackgroundMusic, startBackgroundMusic } from "../systems/BackgroundMusic.js";
import { fadeSwap, fadeToScene, revealScene, resetCameraFX } from "../systems/SceneTransition.js";

const TEXTURES = {
  greenhouse: "greenhouseFinalInterior",
  realBedroom: "realWorldBedroom",
  photo: "finalPhoto",
  realGreenhouse: "greenhouseFinal",
  rose: "crimsonRose",
  girl: "ghostGirlFront"
};

export class FinaleScene extends Phaser.Scene {
  constructor() {
    super("FinaleScene");
    this.state = "BOOT";
    this.stateToken = 0;
    this.sceneActive = false;
    this.transitioning = false;
    this.pendingEvents = new Set();
    this.motes = [];
  }

  create() {
    this.progress = getHouseProgress();
    this.sceneActive = true;
    logProgressEvent("SCENE START", { scene: "FinaleScene", complete: this.progress.gameComplete });
    this.cameras.main.setBackgroundColor("#050507");
    revealScene(this, 1200);

    // The supplied theme begins only once the truth starts to surface.
    this.ambience = new SceneAudio(this, { rain: true, piano: false, wind: true, thunder: false, creaks: false });
    this.ambience.start();
    this.ambience.fadeIn();

    this.createVisuals();
    this.dialogue = new DialogueBox(this);
    this.dialogue.create();
    this.scale.on("resize", this.resizeScene, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.cleanup());

    if (this.progress.gameComplete) {
      this.showCompletedState();
      return;
    }

    if (!canEnterFinale(this.progress)) {
      this.showUnavailableState();
      return;
    }

    this.progress.finaleStarted = true;
    saveProgress();
    this.beginState("ENTER", (token) => this.safeDelay(2600, token, () => this.beginReunion()));
  }

  createVisuals() {
    const { width, height } = this.scale;
    this.background = this.add.image(width / 2, height / 2, TEXTURES.greenhouse).setOrigin(0.5).setDepth(0);
    this.coverImage(this.background);
    this.shade = this.add.rectangle(0, 0, width, height, 0x03050b, 0.18).setOrigin(0).setDepth(4);
    this.memoryShade = this.add.rectangle(0, 0, width, height, 0x000000, 0).setOrigin(0).setDepth(60);
    this.lightOverlay = this.add.rectangle(0, 0, width, height, 0xc9dcff, 0).setOrigin(0).setDepth(5);
    this.girlGlow = this.add.image(width * 0.63, height * 0.68, TEXTURES.girl).setOrigin(0.5, 1).setDepth(17).setTint(0xc9dcff).setAlpha(0);
    this.girl = this.add.image(width * 0.63, height * 0.68, TEXTURES.girl).setOrigin(0.5, 1).setDepth(18).setAlpha(0);
    this.rose = this.add.image(width * 0.39, height * 0.73, TEXTURES.rose).setOrigin(0.5, 1).setDepth(20).setAlpha(0);
    this.positionCharacters();

    for (let index = 0; index < 24; index += 1) {
      this.motes.push(this.add.circle(Math.random() * width, Math.random() * height, 1 + Math.random() * 1.6, 0xe6eeff, 0.08 + Math.random() * 0.12).setDepth(8));
    }
  }

  resizeScene() {
    const { width, height } = this.scale;
    this.coverImage(this.background);
    this.shade?.setSize(width, height);
    this.memoryShade?.setSize(width, height);
    this.lightOverlay?.setSize(width, height);
    this.positionCharacters();
    if (this.photo?.active) {
      this.photo.setPosition(width / 2, height * 0.45).setScale(this.fitImage(this.photo, 0.64, 0.55));
    }
    if (this.learningTitle?.active) this.layoutLearningScreen();
  }

  positionCharacters() {
    const { width, height } = this.scale;
    if (this.girl?.active) {
      this.girl.setPosition(width * 0.63, height * 0.68).setScale(this.fitImage(this.girl, 0.16, 0.36));
    }
    if (this.girlGlow?.active) {
      this.girlGlow.setPosition(width * 0.63, height * 0.68).setScale(this.girl.scaleX * 1.12, this.girl.scaleY * 1.12);
    }
    if (this.rose?.active && this.state !== "ROSE_GIVEN") {
      this.rose.setPosition(width * 0.39, height * 0.73).setScale(this.fitImage(this.rose, 0.13, 0.2));
    }
  }

  coverImage(image) {
    if (!image?.active) return;
    const { width, height } = this.scale;
    image.setPosition(width / 2, height / 2).setScale(Math.max(width / image.width, height / image.height));
  }

  fitImage(image, maxWidth, maxHeight) {
    const { width, height } = this.scale;
    return Math.min((width * maxWidth) / image.width, (height * maxHeight) / image.height);
  }

  beginState(nextState, runner) {
    if (!this.sceneActive || this.transitioning) return null;
    this.state = nextState;
    this.stateToken += 1;
    const token = this.stateToken;
    runner(token);
    return token;
  }

  isCurrent(token, expectedState = this.state) {
    return this.sceneActive && !this.transitioning && token === this.stateToken && this.state === expectedState;
  }

  safeDelay(delay, token, callback) {
    const event = this.time.delayedCall(delay, () => {
      this.pendingEvents.delete(event);
      if (this.isCurrent(token)) callback();
    });
    this.pendingEvents.add(event);
    return event;
  }

  playLines(lines, token, onComplete) {
    const queue = [...lines];
    const next = () => {
      if (!this.isCurrent(token)) return;
      if (!queue.length) {
        onComplete?.();
        return;
      }
      this.dialogue.show(queue.shift(), () => this.safeDelay(280, token, next));
    };
    next();
  }

  beginReunion() {
    this.beginState("FIRST_REUNION", (token) => {
      this.tweens.add({ targets: [this.girl, this.girlGlow], alpha: { from: 0, to: 0.78 }, duration: 1500 });
      this.cameras.main.zoomTo(1.025, 2200, "Sine.easeInOut");
      this.safeDelay(1450, token, () => this.playLines([
        "Girl: You came.",
        "Player: I was looking for you.",
        "Girl: I know.",
        "Player: After all this time...",
        "Girl: You took so long."
      ], token, () => this.revealRose()));
    });
  }

  revealRose() {
    this.beginState("ROSE_REVEAL", (token) => {
      this.tweens.add({ targets: this.rose, alpha: 1, duration: 800 });
      this.tweens.add({ targets: this.rose, y: this.rose.y - 9, duration: 1400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
      this.rose.setInteractive({ useHandCursor: true }).once("pointerdown", () => {
        if (!this.isCurrent(token, "ROSE_REVEAL")) return;
        this.rose.disableInteractive();
        this.giveRose();
      });
    });
  }

  giveRose() {
    this.beginState("ROSE_GIVEN", (token) => {
      this.tweens.killTweensOf(this.rose);
      this.tweens.add({
        targets: this.rose,
        x: this.girl.x - this.girl.displayWidth * 0.22,
        y: this.girl.y - this.girl.displayHeight * 0.34,
        alpha: 0,
        duration: 900,
        onComplete: () => {
          if (!this.isCurrent(token)) return;
          this.playLines([
            "Girl: You found it.",
            "Player: I found all of them.",
            "Girl: You remembered.",
            "Player: Everything.",
            "Girl: No.",
            "Girl: You remembered the house."
          ], token, () => this.showReflection());
        }
      });
    });
  }

  showReflection() {
    this.beginState("REFLECTION", (token) => {
      this.ambience.fadeOut();
      this.startFinalTheme();
      this.reflection = this.add.image(this.girl.x * 0.7, this.girl.y, TEXTURES.girl).setOrigin(0.5, 1).setDepth(16).setTint(0x7185a3).setAlpha(0.18).setFlipX(true);
      this.reflection.setScale(this.girl.scaleX * 0.9, this.girl.scaleY * 0.9);
      this.cameras.main.pan(this.scale.width * 0.58, this.scale.height * 0.44, 1600, "Sine.easeInOut");
      this.playLines([
        "Girl: Do you remember the night we left?",
        "Player: We never left.",
        "Girl: Exactly.",
        "Girl: You've been here before.",
        "Player: I don't remember.",
        "Girl: You do."
      ], token, () => this.revealTruth());
    });
  }

  revealTruth() {
    this.beginState("TRUTH", (token) => {
      this.reflection?.destroy();
      this.reflection = null;
      this.tweens.add({ targets: this.shade, alpha: 0.36, duration: 1600 });
      this.cameras.main.zoomTo(1.05, 2300, "Sine.easeInOut");
      this.playLines([
        "Girl: There was never a letter.",
        "Player: What?",
        "Girl: You wrote it.",
        "Player: No...",
        "Girl: You couldn't remember why you came here.",
        "Player: I came for you.",
        "Girl: Yes.",
        "Girl: But not because I was waiting.",
        "Player: Then why?",
        "Girl: Because you were.",
        "Girl: You were waiting for me."
      ], token, () => this.playFinalMemory());
    });
  }

  playFinalMemory() {
    this.beginState("FINAL_MEMORY", (token) => {
      this.tweens.add({ targets: this.memoryShade, alpha: 0.92, duration: 1300 });
      this.tweens.add({ targets: [this.girl, this.girlGlow], alpha: 0.2, duration: 900 });
      this.playLines([
        "Girl: Please don't follow me.",
        "Player: I'm not letting you go.",
        "Girl: You have to."
      ], token, () => {
        this.cameras.main.fadeOut(900, 0, 0, 0);
        this.safeDelay(1050, token, () => {
          this.cameras.main.fadeIn(800, 0, 0, 0);
          this.playLines([
            "A door closes somewhere in the rain.",
            "Player: I'll come back tomorrow.",
            "Girl: You promised.",
            "Girl: There wasn't a tomorrow."
          ], token, () => this.showAwakening());
        });
      });
    });
  }

  showAwakening() {
    this.beginState("AWAKENING", (token) => this.crossfade(TEXTURES.realBedroom, 1200, token, () => {
      this.girl.setAlpha(0);
      this.girlGlow.setAlpha(0);
      this.memoryShade.setAlpha(0);
      this.shade.setFillStyle(0x815a37, 0.08);
      this.cameras.main.pan(this.scale.width / 2, this.scale.height / 2, 800);
      this.cameras.main.zoomTo(1, 900);
      this.safeDelay(1800, token, () => this.playLines([
        "Player: How long have I been asleep?",
        "There is no answer.",
        "Years have passed around one ordinary moment.",
        "She went to the greenhouse. She waited.",
        "And you told yourself you would go tomorrow."
      ], token, () => this.showPhotograph()));
    }));
  }

  showPhotograph() {
    this.beginState("PHOTOGRAPH", (token) => {
      const { width, height } = this.scale;
      this.photo = this.add.image(width / 2, height * 0.45, TEXTURES.photo).setOrigin(0.5).setDepth(68).setAlpha(0);
      this.photo.setScale(this.fitImage(this.photo, 0.64, 0.55));
      this.tweens.add({ targets: this.photo, alpha: 1, duration: 900 });
      this.playLines([
        "Player: I remember.",
        "Player: I was angry.",
        "Player: I thought I had more time.",
        "Player: I thought there would always be tomorrow."
      ], token, () => {
        this.tweens.add({ targets: this.photo, alpha: 0, duration: 800, onComplete: () => {
          if (!this.isCurrent(token)) return;
          this.photo.destroy();
          this.photo = null;
          this.beginFarewell();
        } });
      });
    });
  }

  beginFarewell() {
    this.beginState("FAREWELL", (token) => this.crossfade(TEXTURES.greenhouse, 1200, token, () => {
      this.shade.setFillStyle(0x03050b, 0.3);
      this.tweens.add({ targets: [this.girl, this.girlGlow], alpha: 0.76, duration: 1100 });
      this.safeDelay(1000, token, () => this.playLines([
        "Girl: You kept rebuilding the house.",
        "Player: For you.",
        "Girl: No.",
        "Girl: For yourself.",
        "Player: Why didn't you tell me?",
        "Girl: Because if I told you...",
        "Girl: ...you would've stopped.",
        "Player: Stopped what?",
        "Girl: Remembering me.",
        "Girl: You don't have to keep coming back.",
        "Player: But I don't want to forget you.",
        "Girl: You won't.",
        "Player: How do you know?",
        "Girl: Because you loved me.",
        "Girl: And love doesn't disappear just because someone does.",
        "Girl: You can go now.",
        "Player: I don't know how.",
        "Girl: Yes, you do.",
        "Girl: You've been learning how the whole time.",
        "Player: I'm sorry.",
        "Girl: I know.",
        "Player: I should have come.",
        "Girl: I know.",
        "Player: I would have stayed.",
        "Girl: I know.",
        "Player: Then what were you afraid of?",
        "Girl: That you would spend the rest of your life waiting for me.",
        "Girl: Don't."
      ], token, () => this.showRealGreenhouse()));
    }));
  }

  showRealGreenhouse() {
    this.beginState("REAL_GREENHOUSE", (token) => {
      this.tweens.add({ targets: [this.girl, this.girlGlow], alpha: 0, duration: 2600 });
      this.safeDelay(2800, token, () => this.crossfade(TEXTURES.realGreenhouse, 1400, token, () => {
        this.shade.setFillStyle(0xf1d3a1, 0.06);
        this.cameras.main.zoomTo(0.975, 2400, "Sine.easeInOut");
        this.safeDelay(2800, token, () => this.playLines(["Player: Thank you."], token, () => this.showLearningScreen()));
      }));
    });
  }

  showLearningScreen() {
    this.beginState("LEARNING", (token) => {
      this.dialogue.hide();
      this.cameras.main.fadeOut(1300, 0, 0, 0);
      this.safeDelay(1450, token, () => {
        this.clearNarrativeVisuals();
        this.cameras.main.setZoom(1);
        this.cameras.main.fadeIn(900, 0, 0, 0);
        this.fadeFinalTheme(0.035, 4200);
        const { width, height } = this.scale;
        this.learningTitle = this.add.text(width / 2, height * 0.19, "WHAT THE HOUSE TAUGHT US", {
          fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
          fontSize: `${Math.max(20, Math.floor(width / 43))}px`, color: "#d8c3a3", align: "center"
        }).setOrigin(0.5).setAlpha(0);
        this.learningText = this.add.text(width / 2, height * 0.48, "", {
          fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
          fontSize: `${Math.max(18, Math.floor(width / 55))}px`, color: "#e7d8c7", align: "center", lineSpacing: 14,
          wordWrap: { width: width * 0.78 }
        }).setOrigin(0.5).setAlpha(0);
        this.tweens.add({ targets: this.learningTitle, alpha: 1, duration: 1400 });
        this.playLearningLines(token, [
          "Memories can keep us alive.",
          "But they can also keep us standing in the same place.",
          "Love is not forgetting.",
          "It is remembering without refusing to live.",
          "Some goodbyes are not the end of love.",
          "They are the beginning of letting it rest.",
          "Some memories aren't meant to keep us there.\nThey're meant to let us go.",
          "Thank you for remembering.",
          "THE HOUSE OF MEMORIES",
          "THE END"
        ]);
      });
    });
  }

  playLearningLines(token, lines, index = 0) {
    if (!this.isCurrent(token, "LEARNING")) return;
    if (index >= lines.length) {
      this.progress.finaleComplete = true;
      this.progress.gameComplete = true;
      this.progress.finaleUnlocked = true;
      saveProgress();
      logProgressEvent("GAME COMPLETE", { scene: "FinaleScene" });
      this.fadeFinalTheme(0, 7500);
      return;
    }
    const centralLesson = index === 6;
    const finalLine = index === lines.length - 1;
    this.learningText.setText(lines[index]).setAlpha(0);
    this.tweens.add({
      targets: this.learningText,
      alpha: 1,
      duration: 900,
      yoyo: !finalLine,
      hold: centralLesson ? 4400 : (finalLine ? 0 : 2500),
      onComplete: () => this.safeDelay(centralLesson ? 900 : 380, token, () => this.playLearningLines(token, lines, index + 1))
    });
  }

  crossfade(texture, duration, token, onComplete) {
    if (!this.isCurrent(token)) return;
    const incoming = this.add.image(0, 0, texture).setOrigin(0.5).setDepth(1).setAlpha(0);
    this.coverImage(incoming);
    this.tweens.add({ targets: this.background, alpha: 0, duration });
    this.tweens.add({
      targets: incoming,
      alpha: 1,
      duration,
      onComplete: () => {
        if (!this.isCurrent(token)) {
          incoming.destroy();
          return;
        }
        this.background.destroy();
        this.background = incoming;
        onComplete?.();
      }
    });
  }

  startFinalTheme() {
    this.finaleTheme = startBackgroundMusic(this, 0.13);
    if (!this.finaleTheme) return;
    this.fadeFinalTheme(0.2, 2600);
  }

  fadeFinalTheme(volume, duration) {
    fadeBackgroundMusic(this, volume, duration);
  }

  clearNarrativeVisuals() {
    [this.background, this.shade, this.memoryShade, this.lightOverlay, this.girl, this.girlGlow, this.rose, this.reflection, this.photo]
      .forEach((object) => object?.destroy());
    this.motes.forEach((mote) => mote.destroy());
    this.motes = [];
  }

  layoutLearningScreen() {
    const { width, height } = this.scale;
    this.learningTitle.setPosition(width / 2, height * 0.19).setFontSize(Math.max(20, Math.floor(width / 43)));
    this.learningText.setPosition(width / 2, height * 0.48).setFontSize(Math.max(18, Math.floor(width / 55))).setWordWrapWidth(width * 0.78);
  }

  showUnavailableState() {
    this.beginState("UNAVAILABLE", (token) => this.playLines([
      "Something is still missing.",
      "Six memories, twenty petals, and the Crimson Rose must be restored."
    ], token, () => this.safeSceneExit()));
  }

  showCompletedState() {
    this.beginState("COMPLETE", () => {
      this.background.setTexture(TEXTURES.realGreenhouse);
      this.coverImage(this.background);
      this.girl.destroy();
      this.girlGlow.destroy();
      this.rose.destroy();
      this.add.text(this.scale.width / 2, this.scale.height * 0.5, "THE HOUSE OF MEMORIES\n\nTHE END", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(22, Math.floor(this.scale.width / 40))}px`, color: "#ead9c4", align: "center", lineSpacing: 12
      }).setOrigin(0.5).setDepth(70);
    });
  }

  safeSceneExit() {
    if (this.transitioning || !this.sceneActive) return;
    this.transitioning = true;
    this.stateToken += 1;
    this.ambience?.fadeOut();
    this.fadeFinalTheme(0, 800);
    fadeToScene(this, "GrandHallScene", { fromFinale: true }, 800);
  }

  update(_, deltaMs) {
    this.dialogue?.update(deltaMs / 1000);
    if (this.state === "LEARNING") return;
    this.motes.forEach((mote, index) => {
      mote.y -= 0.012 + index * 0.00035;
      mote.x += Math.sin(this.time.now * 0.00055 + index) * 0.018;
      if (mote.y < -6) mote.y = this.scale.height + 6;
    });
  }

  cleanup() {
    if (!this.sceneActive) return;
    this.sceneActive = false;
    this.stateToken += 1;
    this.pendingEvents.forEach((event) => event.remove(false));
    this.pendingEvents.clear();
    this.tweens.killAll();
    this.scale.off("resize", this.resizeScene, this);
    this.dialogue?.destroy();
    this.ambience?.destroy();
    this.finaleTheme = null;
    logProgressEvent("SCENE END", { scene: "FinaleScene", state: this.state, complete: this.progress?.gameComplete });
  }
}
