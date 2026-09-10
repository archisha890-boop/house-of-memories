export function fadeToScene(scene, target, data = {}, duration = 1000) {
  if (scene.__houseTransitionStarted) return false;

  scene.__houseTransitionStarted = true;
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.__houseTransitionStarted = false;
  });

  let started = false;
  const startTarget = () => {
    if (started) return;
    started = true;
    scene.scene.start(target, data);
  };

  const camera = scene.cameras?.main;
  if (!camera || duration <= 0) {
    startTarget();
    return true;
  }

  camera.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, startTarget);
  camera.fadeOut(duration, 0, 0, 0);

  // Camera events can be missed while a browser tab is suspended. The timer
  // makes a completed fade recover instead of leaving the player on black.
  scene.time.delayedCall(duration + 350, startTarget);
  return true;
}
