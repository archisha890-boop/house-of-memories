function getCamera(scene) {
  return scene?.cameras?.main || null;
}

export function resetCameraFX(scene, zoom = 1) {
  const camera = getCamera(scene);
  if (!camera) return null;

  camera.fadeEffect?.reset?.();
  camera.flashEffect?.reset?.();
  camera.panEffect?.reset?.();
  camera.shakeEffect?.reset?.();
  camera.zoomEffect?.reset?.();
  if (typeof camera.resetFX === "function") camera.resetFX();

  const { width, height } = scene.scale;
  camera.setBounds(0, 0, width, height);
  camera.setScroll(0, 0);
  camera.setZoom(zoom);
  return camera;
}

export function revealScene(scene, duration = 1100) {
  const camera = resetCameraFX(scene, 1);
  if (!camera) return;

  const { width, height } = scene.scale;
  const veil = scene.add.rectangle(0, 0, width, height, 0x000000, 1)
    .setOrigin(0)
    .setDepth(10000)
    .setScrollFactor(0);

  scene.tweens.add({
    targets: veil,
    alpha: 0,
    duration: Math.max(250, duration),
    ease: "Sine.easeInOut",
    onComplete: () => {
      if (veil.active) veil.destroy();
    }
  });
}

export function fadeSwap(scene, onBlack, { fadeOut = 700, fadeIn = 900, zoom = 1 } = {}) {
  const { width, height } = scene.scale;
  const veil = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
    .setOrigin(0)
    .setDepth(10000)
    .setScrollFactor(0);

  scene.tweens.add({
    targets: veil,
    alpha: 1,
    duration: fadeOut,
    ease: "Sine.easeInOut",
    onComplete: () => {
      resetCameraFX(scene, zoom);
      if (typeof onBlack === "function") onBlack();
      scene.tweens.add({
        targets: veil,
        alpha: 0,
        duration: fadeIn,
        ease: "Sine.easeInOut",
        onComplete: () => {
          if (veil.active) veil.destroy();
        }
      });
    }
  });
}

export function fadeToScene(scene, target, data = {}, duration = 1000) {
  if (scene.__houseTransitionStarted) return false;

  scene.__houseTransitionStarted = true;
  if (scene.input) scene.input.enabled = false;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.__houseTransitionStarted = false;
    if (scene.input) scene.input.enabled = true;
  });

  let started = false;
  const startTarget = () => {
    if (started) return;
    started = true;
    resetCameraFX(scene, 1);
    scene.scene.start(target, data);
  };

  const camera = getCamera(scene);
  if (!camera || duration <= 0) {
    startTarget();
    return true;
  }

  camera.zoomEffect?.reset?.();
  camera.panEffect?.reset?.();
  camera.shakeEffect?.reset?.();

  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, startTarget);
  camera.fadeOut(duration, 0, 0, 0);

  const { width, height } = scene.scale;
  const veil = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
    .setOrigin(0)
    .setDepth(10000)
    .setScrollFactor(0);
  scene.tweens.add({
    targets: veil,
    alpha: 1,
    duration,
    ease: "Sine.easeInOut"
  });

  scene.time.delayedCall(duration + 200, startTarget);
  return true;
}
