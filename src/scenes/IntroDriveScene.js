import { DialogueBox } from "../ui/DialogueBox.js";
import { SceneAudio } from "../systems/SceneAudio.js";

const LETTER_TEXT = `To the One I Have Been Waiting For,

If this letter has found you,
then perhaps the house is finally ready.

Follow the road beyond the hills.

Come to the House of Memories.

Crimson Peak.

I shall be waiting.

-A`;

export class IntroDriveScene extends Phaser.Scene {
 constructor() {
super("IntroDriveScene");

this.driveTime = 0;
this.phase = 0;

this.lightningTimer = 10;
this.lightningAlpha = 0;

this.focusMode = "road";

this.letterOpen = false;
}


  create() {
this.driveTime = 0;
this.phase = 0;
this.letterOpen = false;

this.cameras.main.setBackgroundColor("#030405");
this.cameras.main.fadeIn(2200, 0, 0, 0);

this.audio = new SceneAudio(this);

if (window.__houseIntroAudioArmed) {
window.__houseIntroAudioArmed = false;
this.audio.start();
this.audio.fadeIn();
} else {
this.input.once("pointerdown", () => {
this.audio.start();
this.audio.fadeIn();
});
}

this.createLayers();
this.createInteractables();

this.dialogue = new DialogueBox(this);
this.dialogue.create();

this.input.keyboard.on("keydown-L", () => this.openLetter());
this.input.keyboard.on("keydown-M", () => this.inspectMirror());
this.input.keyboard.on("keydown-W", () => this.inspectWindshield());

this.input.keyboard.on("keydown-ESC", () => {
this.closeLetter();
});



this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
if (this.audio) this.audio.destroy();
});
}

  createLayers() {
const { width, height } = this.scale;

if (this.textures.exists("introDriveReference")) {
const bg = this.add.image(
width / 2,
height / 2,
"introDriveReference"
);


const scale = Math.max(
  width / bg.width,
  height / bg.height
);

bg.setScale(scale);
bg.setDepth(0);

this.backgroundImage = bg;


}

this.lightningLayer = this.add.graphics().setDepth(90);

this.letterOverlay = this.add.group();
}
createInteractables() {
const { width, height } = this.scale;

this.windshieldHotspot = this.add.rectangle(
width * 0.5,
height * 0.31,
width * 0.72,
height * 0.36,
0xffffff,
0
)
.setDepth(45)
.setInteractive({ useHandCursor: true })
.on("pointerdown", () => this.inspectWindshield());

this.mirrorHotspot = this.add.rectangle(
width * 0.48,
height * 0.15,
width * 0.18,
height * 0.08,
0xffffff,
0
)
.setDepth(46)
.setInteractive({ useHandCursor: true })
.on("pointerdown", () => this.inspectMirror());

this.letterHotspot = this.add.rectangle(
width * 0.69,
height * 0.77,
width * 0.22,
height * 0.17,
0xffffff,
0
)
.setDepth(46)
.setInteractive({ useHandCursor: true })
.on("pointerdown", () => this.openLetter());

this.hint = this.add.text(
width * 0.03,
height * 0.92,
"[L] Letter    [M] Mirror    [W] Windshield",
{
fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
fontSize: `${Math.max(16, Math.floor(width / 80))}px`,
color: "#e0c7a0"
}
).setDepth(60);

this.tweens.add({
targets: this.hint,
alpha: 0.4,
duration: 1500,
yoyo: true,
repeat: -1
});

this.letterIndicator = this.add.text(
width * 0.69,
height * 0.67,
"[L]",
{
fontSize: "18px",
color: "#f6d8a8"
}
)
.setOrigin(0.5)
.setDepth(60);

this.mirrorIndicator = this.add.text(
width * 0.48,
height * 0.09,
"[M]",
{
fontSize: "16px",
color: "#d5d8de"
}
)
.setOrigin(0.5)
.setDepth(60);

this.windshieldIndicator = this.add.text(
width * 0.5,
height * 0.22,
"[W]",
{
fontSize: "16px",
color: "#d5d8de"
}
)
.setOrigin(0.5)
.setDepth(60);

this.tweens.add({
targets: [
this.letterIndicator,
this.mirrorIndicator,
this.windshieldIndicator
],
alpha: 0.25,
duration: 900,
yoyo: true,
repeat: -1
});
}

  update(_, deltaMs) {
    const delta = deltaMs / 1000;
    this.driveTime += delta;

    //this.drawDynamicScene(delta);
    //this.updateRain(delta);
    //this.updateFog(delta);
    this.updateLightning(delta);
    this.dialogue.update(delta);

    if (this.driveTime > 30 && this.phase < 1) {
      this.phase = 1;
      this.showArrivalTitle();
    }
  }

  drawStaticScene() {
    const { width, height } = this.scale;
    this.carInterior.clear();

    this.carInterior.fillStyle(0x050404, 1);
    this.carInterior.fillRect(0, 0, width, height * 0.08);
    this.carInterior.fillRect(0, height * 0.58, width, height * 0.42);
    this.carInterior.fillStyle(0x0c0908, 1);
    this.carInterior.fillRect(width * 0.04, height * 0.06, width * 0.92, height * 0.06);
    this.carInterior.lineStyle(8, 0x090706, 1);
    this.carInterior.strokeRoundedRect(width * 0.06, height * 0.08, width * 0.75, height * 0.45, 18);

    this.carInterior.fillStyle(0x080706, 1);
    this.carInterior.fillEllipse(width * 0.24, height * 0.69, width * 0.23, height * 0.28);
    this.carInterior.lineStyle(5, 0x17120d, 1);
    this.carInterior.strokeEllipse(width * 0.24, height * 0.69, width * 0.23, height * 0.28);
    this.carInterior.fillStyle(0x120d0a, 1);
    this.carInterior.fillRect(width * 0.42, height * 0.61, width * 0.36, height * 0.15);

    this.carInterior.fillStyle(0x0d0b0a, 1);
    this.carInterior.fillRoundedRect(width * 0.39, height * 0.08, width * 0.2, height * 0.07, 8);
    this.carInterior.lineStyle(2, 0x2a2118, 1);
    this.carInterior.strokeRoundedRect(width * 0.39, height * 0.08, width * 0.2, height * 0.07, 8);

    this.drawLetterOnSeat(false);
  }

  drawDynamicScene(delta) {
    const { width, height } = this.scale;
    const climb = Math.min(1, this.driveTime / 56);
    const scroll = (this.driveTime * 90) % 80;

    this.sky.clear();
    this.sky.fillGradientStyle(0x06080d, 0x101625, 0x161a24, 0x050607, 1);
    this.sky.fillRect(0, 0, width, height);

    this.background.clear();
    this.background.fillStyle(0x070b0d, 1);
    this.drawMountain(width * 0.12, height * 0.44, width * 0.28, height * 0.22);
    this.drawMountain(width * 0.5, height * 0.38, width * 0.36, height * 0.28);
    this.drawMountain(width * 0.82, height * 0.43, width * 0.32, height * 0.2);
    this.drawForest(width, height, 0.48);

    if (this.lightningAlpha > 0.015 || climb > 0.58) {
      this.drawManorSilhouette(width * 0.62, height * (0.31 - climb * 0.05), 0.48 + climb * 0.32, this.lightningAlpha + Math.max(0, climb - 0.58) * 0.28);
    }

    if (climb > 0.76) {
      this.drawApproachGates(width, height, (climb - 0.76) / 0.24);
    }

    this.road.clear();
    this.road.fillStyle(0x151516, 1);
    this.road.fillTriangle(width * 0.45, height * 0.49, width * 0.55, height * 0.49, width * 0.82, height);
    this.road.fillTriangle(width * 0.45, height * 0.49, width * 0.18, height, width * 0.55, height * 0.49);
    this.road.lineStyle(2, 0x7e745f, 0.45);
    for (let y = height * 0.52 + scroll; y < height; y += 80) {
      const t = (y - height * 0.5) / (height * 0.5);
      this.road.beginPath();
      this.road.moveTo(width * (0.5 - 0.02 * t), y);
      this.road.lineTo(width * (0.5 + 0.02 * t), y + 20);
      this.road.strokePath();
    }

    this.headlights.clear();
    this.headlights.fillStyle(0xe8d4a3, 0.09);
    this.headlights.fillTriangle(width * 0.38, height * 0.62, width * 0.5, height * 0.46, width * 0.62, height * 0.62);
    this.headlights.fillStyle(0xf4dca8, 0.12);
    this.headlights.fillEllipse(width * 0.5, height * 0.53, width * 0.24, height * 0.08);
  }

  drawMountain(x, y, w, h) {
    this.background.fillTriangle(x - w * 0.5, y, x, y - h, x + w * 0.5, y);
  }

  drawForest(width, height, base) {
    this.background.fillStyle(0x070b0a, 1);
    for (let i = 0; i < 42; i += 1) {
      const x = (i / 41) * width;
      const h = Phaser.Math.Between(height * 0.08, height * 0.21);
      this.background.fillTriangle(x - 18, height * base, x, height * base - h, x + 18, height * base);
    }
  }

  drawManorSilhouette(x, y, scale, alpha) {
    this.background.fillStyle(0x0a0a0d, Math.min(1, 0.65 + alpha));
    this.background.fillRect(x - 72 * scale, y, 144 * scale, 70 * scale);
    this.background.fillRect(x - 42 * scale, y - 42 * scale, 34 * scale, 48 * scale);
    this.background.fillRect(x + 22 * scale, y - 58 * scale, 38 * scale, 64 * scale);
    this.background.fillTriangle(x - 52 * scale, y - 42 * scale, x - 25 * scale, y - 92 * scale, x + 0 * scale, y - 42 * scale);
    this.background.fillTriangle(x + 12 * scale, y - 58 * scale, x + 42 * scale, y - 118 * scale, x + 72 * scale, y - 58 * scale);
    this.background.fillStyle(0xc79a55, Math.min(0.55, alpha * 0.55));
    this.background.fillRect(x - 22 * scale, y + 18 * scale, 8 * scale, 16 * scale);
    this.background.fillRect(x + 38 * scale, y - 26 * scale, 8 * scale, 16 * scale);
  }

  drawApproachGates(width, height, progress) {
    const gateScale = Phaser.Math.Clamp(progress, 0, 1);
    const open = Math.max(0, 1 - gateScale * 1.2);
    const leftX = width * (0.28 - open * 0.08);
    const rightX = width * (0.72 + open * 0.08);
    const baseY = height * 0.62;
    const gateH = height * (0.18 + gateScale * 0.24);

    this.background.fillStyle(0x0a0808, 0.95);
    this.background.fillRect(leftX - 18, baseY - gateH, 34, gateH);
    this.background.fillRect(rightX - 16, baseY - gateH, 34, gateH);
    this.background.fillStyle(0xd6ac69, 0.25 + gateScale * 0.25);
    this.background.fillRect(leftX - 7, baseY - gateH * 0.72, 8, 18);
    this.background.fillRect(rightX - 3, baseY - gateH * 0.72, 8, 18);

    this.background.lineStyle(2, 0x050405, 0.95);
    for (let i = 0; i < 9; i += 1) {
      const t = i / 8;
      const lx = Phaser.Math.Linear(leftX + 10, width * 0.5 - 10, t);
      const rx = Phaser.Math.Linear(width * 0.5 + 10, rightX - 10, t);
      this.background.beginPath();
      this.background.moveTo(lx - open * 80, baseY);
      this.background.lineTo(lx - open * 80, baseY - gateH * 0.78);
      this.background.moveTo(rx + open * 80, baseY);
      this.background.lineTo(rx + open * 80, baseY - gateH * 0.78);
      this.background.strokePath();
    }
  }

  drawLetterOnSeat(glow) {
    const { width, height } = this.scale;
    this.carInterior.fillStyle(glow ? 0xd0a96f : 0xa98657, glow ? 0.9 : 0.75);
    this.carInterior.fillRect(width * 0.6, height * 0.7, width * 0.2, height * 0.12);
    this.carInterior.lineStyle(2, 0x3b1a12, 0.9);
    this.carInterior.strokeRect(width * 0.6, height * 0.7, width * 0.2, height * 0.12);
    this.carInterior.fillStyle(0x4e1119, 0.9);
    this.carInterior.fillCircle(width * 0.71, height * 0.76, 13);
  }

  setLetterGlow(glow) {
    this.drawStaticScene();
    this.drawLetterOnSeat(glow);
  }

  updateRain(delta) {
    const { width, height } = this.scale;
    this.rainLayer.clear();
    for (const drop of this.rain) {
      drop.x += drop.slant * 3 * delta;
      drop.y += drop.speed * delta;
      if (drop.y > height + 30) {
        drop.y = Phaser.Math.Between(-height * 0.25, -10);
        drop.x = Phaser.Math.Between(-width * 0.15, width * 1.15);
      }
      this.rainLayer.lineStyle(1, 0x9da6b5, drop.alpha);
      this.rainLayer.beginPath();
      this.rainLayer.moveTo(drop.x, drop.y);
      this.rainLayer.lineTo(drop.x + drop.slant, drop.y + drop.len);
      this.rainLayer.strokePath();
    }
  }

  updateFog(delta) {
    const { width } = this.scale;
    this.fogBackLayer.clear();
    this.fogFrontLayer.clear();
    for (const cloud of this.fog) {
      cloud.x += cloud.speed * delta;
      if (cloud.x > width + cloud.w) cloud.x = -cloud.w;
      const layer = cloud.front ? this.fogFrontLayer : this.fogBackLayer;
      layer.fillStyle(0xb9bdc3, cloud.alpha + Math.min(0.06, this.driveTime / 900));
      layer.fillRect(cloud.x, cloud.y, cloud.w, cloud.h);
    }
  }

  updateLightning(delta) {
    const { width, height } = this.scale;
    this.lightningTimer -= delta;
    if (this.lightningTimer <= 0) {
      this.lightningAlpha = Phaser.Math.FloatBetween(0.12, 0.22);
      this.lightningTimer = Phaser.Math.Between(20000, 40000) / 1000;
    }
    this.lightningAlpha = Math.max(0, this.lightningAlpha - delta * 0.7);
    this.lightningLayer.clear();
    if (this.lightningAlpha > 0.002) {
      this.lightningLayer.fillStyle(0xd7dbe7, this.lightningAlpha);
      this.lightningLayer.fillRect(0, 0, width, height * 0.62);
    }
  }

  inspectWindshield() {
    this.focusMode = "windshield";
    this.cameras.main.zoomTo(1.045, 700);
    this.dialogue.show("The road climbs into the fog.\nFor a heartbeat, lightning shapes the hills into something like a house.");
    this.lightningAlpha = 0.2;
    this.time.delayedCall(1400, () => this.cameras.main.zoomTo(1, 900));
  }

  inspectMirror() {
    this.focusMode = "mirror";
    this.cameras.main.zoomTo(1.035, 600);
    this.dialogue.show("The rearview mirror shows only rain, darkness, and the road vanishing behind you.");
    this.time.delayedCall(1300, () => this.cameras.main.zoomTo(1, 900));
  }

  openLetter() {
if (this.letterOpen) return;

this.letterOpen = true;

const { width, height } = this.scale;

this.closeLetter();

const paper = this.add.graphics().setDepth(70);

paper.fillStyle(0xc8a878, 0.96);
paper.fillRect(
width * 0.28,
height * 0.12,
width * 0.44,
height * 0.76
);

paper.lineStyle(3, 0x6b3f26, 0.9);
paper.strokeRect(
width * 0.28,
height * 0.12,
width * 0.44,
height * 0.76
);

this.letterText = this.add.text(
width * 0.33,
height * 0.18,
LETTER_TEXT,
{
fontFamily: "IM Fell English SC, Georgia, serif",
fontSize: `${Math.max(16, Math.floor(width / 62))}px`,
color: "#2f170f",
lineSpacing: 8,
wordWrap: { width: width * 0.34 }
}
).setDepth(71);

this.closeButton = this.add.text(
width * 0.5,
height * 0.82,
"[ESC] Close",
{
fontFamily: "Georgia",
fontSize: "16px",
color: "#5b2c1d"
}
)
.setOrigin(0.5)
.setDepth(71);

this.letterOverlay.add(paper);
this.letterOverlay.add(this.letterText);
this.letterOverlay.add(this.closeButton);
}


 closeLetter() {
if (this.letterText) {
this.letterText.destroy();
this.letterText = null;
}

if (this.closeButton) {
this.closeButton.destroy();
this.closeButton = null;
}

if (this.letterOverlay) {
this.letterOverlay.getChildren().forEach((child) => child.destroy());
this.letterOverlay.clear();
}

this.letterOpen = false;
}



  openFocusedInteraction() {
    if (this.focusMode === "mirror") this.inspectMirror();
    else this.inspectWindshield();
  }

  showArrivalTitle() {
    this.input.enabled = false;
    this.audio.fadeOut();
    this.cameras.main.fadeOut(2800, 0, 0, 0);
    this.time.delayedCall(3000, () => {
      this.cameras.main.fadeIn(700, 0, 0, 0);
      const { width, height } = this.scale;
      this.add.text(width / 2, height / 2, "THE ARRIVAL", {
        fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
        fontSize: `${Math.max(28, Math.floor(width / 30))}px`,
        color: "#d8b28d"
      }).setOrigin(0.5).setDepth(100);
      this.time.delayedCall(2200, () => this.finishScene());
    });
  }

  finishScene() {
    this.scene.start("GraveyardScene");
  }
}
