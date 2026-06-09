export class DialogueBox {
  constructor(scene) {
    this.scene = scene;
    this.visible = false;
    this.fullText = "";
    this.currentText = "";
    this.charIndex = 0;
    this.elapsed = 0;
    this.speed = 26;
    this.onClose = null;
    this.blockAdvanceUntil = 0;
  }

  create() {
    const { width, height } = this.scene.scale;
    this.group = this.scene.add.group();
    this.panel = this.scene.add.graphics().setDepth(80);
    this.text = this.scene.add.text(width * 0.08, height * 0.7, "", {
      fontFamily: "IM Fell English SC, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(16, Math.floor(width / 58))}px`,
      color: "#f1d9bb",
      lineSpacing: 8,
      wordWrap: { width: width * 0.82 }
    }).setDepth(81);
    this.prompt = this.scene.add.text(width * 0.88, height * 0.88, "click", {
      fontFamily: "Cinzel Decorative, Georgia, Times New Roman, serif",
      fontSize: `${Math.max(11, Math.floor(width / 105))}px`,
      color: "#a78164"
    }).setDepth(81).setOrigin(1, 1);

    this.group.addMultiple([this.text, this.prompt]);
    this.hide();

    this.scene.input.on("pointerdown", () => this.advance());
    this.scene.input.keyboard.on("keydown-SPACE", () => this.advance());
    this.scene.input.keyboard.on("keydown-ENTER", () => this.advance());
  }

  show(message, onClose = null) {
    this.visible = true;
    this.fullText = message;
    this.currentText = "";
    this.charIndex = 0;
    this.elapsed = 0;
    this.onClose = onClose;
    this.blockAdvanceUntil = this.scene.time.now + 120;
    this.text.setText("");
    this.panel.setVisible(true);
    this.text.setVisible(true);
    this.prompt.setVisible(true);
    this.drawPanel();
  }

  hide() {
    this.visible = false;
    if (this.panel) this.panel.setVisible(false);
    if (this.text) this.text.setVisible(false);
    if (this.prompt) this.prompt.setVisible(false);
  }

  advance() {
    if (!this.visible) return false;
    if (this.scene.time.now < this.blockAdvanceUntil) return true;
    if (this.charIndex < this.fullText.length) {
      this.charIndex = this.fullText.length;
      this.currentText = this.fullText;
      this.text.setText(this.currentText);
      return true;
    }

    this.hide();
    if (this.onClose) this.onClose();
    return true;
  }

  update(delta) {
    if (!this.visible || this.charIndex >= this.fullText.length) return;

    this.elapsed += delta;
    const charsToAdd = Math.floor(this.elapsed * this.speed);
    if (charsToAdd <= 0) return;

    this.elapsed = 0;
    this.charIndex = Math.min(this.fullText.length, this.charIndex + charsToAdd);
    this.currentText = this.fullText.slice(0, this.charIndex);
    this.text.setText(this.currentText);
  }

  drawPanel() {
    const { width, height } = this.scene.scale;
    const x = width * 0.055;
    const y = height * 0.66;
    const w = width * 0.89;
    const h = height * 0.24;

    this.panel.clear();
    this.panel.fillStyle(0x050406, 0.88);
    this.panel.fillRect(x, y, w, h);
    this.panel.lineStyle(2, 0x7a583f, 0.92);
    this.panel.strokeRect(x, y, w, h);
    this.panel.lineStyle(1, 0xc3a06f, 0.45);
    this.panel.strokeRect(x + 6, y + 6, w - 12, h - 12);
  }
}
