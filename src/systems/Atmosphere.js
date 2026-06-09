export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.rain = [];
    this.fog = [];
    this.noise = [];
    this.lightning = {
      alpha: 0,
      timer: Phaser.Math.Between(20000, 40000) / 1000,
      duration: 0
    };
  }

  create() {
    const { width, height } = this.scene.scale;

    this.rainLayer = this.scene.add.graphics().setDepth(20);
    this.fogLayer = this.scene.add.graphics().setDepth(18);
    this.lightningLayer = this.scene.add.graphics().setDepth(25);
    this.noiseLayer = this.scene.add.graphics().setDepth(40);

    for (let i = 0; i < 102; i += 1) {
      this.rain.push({
        x: Phaser.Math.Between(-width, width * 2),
        y: Phaser.Math.Between(-height, height),
        len: Phaser.Math.Between(7, 30),
        speed: Phaser.Math.Between(310, 650),
        drift: Phaser.Math.FloatBetween(-58, -18),
        angle: Phaser.Math.FloatBetween(-5, 7),
        alpha: Phaser.Math.FloatBetween(0.045, 0.18)
      });
    }

    for (let i = 0; i < 16; i += 1) {
      this.fog.push({
        x: Phaser.Math.Between(-width, width),
        y: Phaser.Math.Between(Math.floor(height * 0.66), Math.floor(height * 0.94)),
        width: Phaser.Math.Between(Math.floor(width * 0.18), Math.floor(width * 0.48)),
        height: Phaser.Math.Between(18, 58),
        speed: Phaser.Math.FloatBetween(2.5, 10),
        alpha: Phaser.Math.FloatBetween(0.018, 0.065)
      });
    }

    for (let i = 0; i < 240; i += 1) {
      this.noise.push({
        x: Phaser.Math.Between(0, width),
        y: Phaser.Math.Between(0, height),
        size: Phaser.Math.Between(1, 3),
        alpha: Phaser.Math.FloatBetween(0.025, 0.085)
      });
    }
  }

  update(delta) {
    const { width, height } = this.scene.scale;

    this.rainLayer.clear();
    for (const drop of this.rain) {
      drop.x += drop.drift * delta;
      drop.y += drop.speed * delta;

      if (drop.y > height + drop.len) {
        drop.y = Phaser.Math.Between(-height * 0.35, -10);
        drop.x = Phaser.Math.Between(-width * 0.15, width * 1.18);
      }

      const slant = drop.drift * 0.035 + drop.angle;
      this.rainLayer.lineStyle(1, 0x9ca1ad, drop.alpha);
      this.rainLayer.beginPath();
      this.rainLayer.moveTo(drop.x, drop.y);
      this.rainLayer.lineTo(drop.x + slant, drop.y + drop.len);
      this.rainLayer.strokePath();
    }

    this.fogLayer.clear();
    for (const cloud of this.fog) {
      cloud.x += cloud.speed * delta;
      if (cloud.x > width + cloud.width) {
        cloud.x = -cloud.width;
        cloud.y = Phaser.Math.Between(Math.floor(height * 0.66), Math.floor(height * 0.94));
      }

      this.fogLayer.fillStyle(0xd1c9c3, cloud.alpha);
      this.fogLayer.fillRect(cloud.x, cloud.y, cloud.width, cloud.height);
      this.fogLayer.fillStyle(0xbcc2ca, cloud.alpha * 0.7);
      this.fogLayer.fillRect(cloud.x + cloud.width * 0.18, cloud.y + cloud.height * 0.4, cloud.width * 0.7, cloud.height * 0.5);
    }

    this.updateLightning(delta, width, height);

    this.noiseLayer.clear();
    for (const speck of this.noise) {
      if (Math.random() < 0.18) {
        speck.alpha = Phaser.Math.FloatBetween(0.02, 0.09);
      }
      this.noiseLayer.fillStyle(0xffffff, speck.alpha);
      this.noiseLayer.fillRect(speck.x, speck.y, speck.size, speck.size);
    }
  }

  updateLightning(delta, width, height) {
    this.lightning.timer -= delta;

    if (this.lightning.timer <= 0 && this.lightning.duration <= 0) {
      this.lightning.duration = Phaser.Math.FloatBetween(0.16, 0.28);
      this.lightning.alpha = Phaser.Math.FloatBetween(0.1, 0.18);
      this.lightning.timer = Phaser.Math.Between(20000, 40000) / 1000;
    }

    if (this.lightning.duration > 0) {
      this.lightning.duration -= delta;
      this.lightning.alpha = Math.max(0, this.lightning.alpha - delta * 0.7);
    } else {
      this.lightning.alpha = Math.max(0, this.lightning.alpha - delta * 0.25);
    }

    this.lightningLayer.clear();
    if (this.lightning.alpha > 0.001) {
      this.lightningLayer.fillStyle(0xe8d9ca, this.lightning.alpha);
      this.lightningLayer.fillRect(0, 0, width, height);
      this.lightningLayer.fillStyle(0xffd1b8, this.lightning.alpha * 0.35);
      this.lightningLayer.fillRect(width * 0.48, height * 0.12, width * 0.36, height * 0.56);
    }
  }
}
