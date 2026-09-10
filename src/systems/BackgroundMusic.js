const THEME_KEY = "finaleTheme";
const REGISTRY_KEY = "houseBackgroundTheme";
const DEFAULT_VOLUME = 0.13;

function getRegistry(scene) {
  return scene?.game?.registry;
}

function getTheme(scene) {
  return getRegistry(scene)?.get(REGISTRY_KEY) || null;
}

export async function resumeGameAudio(scene) {
  const context = scene?.sound?.context || scene?.game?.sound?.context;
  if (context?.state === "suspended") {
    try {
      await context.resume();
    } catch (error) {
      console.warn("[HOUSE] Background audio could not resume.", error);
    }
  }

  const ambientContext = window.__houseAudioContext;
  if (ambientContext?.state === "suspended") {
    try {
      await ambientContext.resume();
    } catch (error) {
      console.warn("[HOUSE] Ambient audio could not resume.", error);
    }
  }
}

export function startBackgroundMusic(scene, volume = DEFAULT_VOLUME) {
  if (!scene?.cache?.audio?.exists(THEME_KEY)) {
    console.warn("[HOUSE] Background theme is unavailable.");
    return null;
  }

  const registry = getRegistry(scene);
  let theme = getTheme(scene);
  if (!theme || theme.pendingRemove || !theme.manager) {
    try {
      theme = scene.sound.add(THEME_KEY, { loop: true, volume });
      registry?.set(REGISTRY_KEY, theme);
      theme.once("destroy", () => {
        if (registry?.get(REGISTRY_KEY) === theme) registry.remove(REGISTRY_KEY);
      });
    } catch (error) {
      console.warn("[HOUSE] Background theme could not be created.", error);
      return null;
    }
  }

  theme.setLoop(true);
  theme.setVolume(volume);
  if (!theme.isPlaying) {
    try {
      theme.play();
    } catch (error) {
      console.warn("[HOUSE] Background theme could not start.", error);
      return null;
    }
  }
  return theme;
}

export function fadeBackgroundMusic(scene, volume, duration = 900) {
  const theme = getTheme(scene);
  if (!theme?.isPlaying) return;
  scene.tweens.killTweensOf(theme);
  scene.tweens.add({
    targets: theme,
    volume,
    duration,
    ease: "Sine.easeInOut"
  });
}

export function getBackgroundMusic(scene) {
  return getTheme(scene);
}
