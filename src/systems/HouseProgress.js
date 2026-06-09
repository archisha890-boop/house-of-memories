const STORAGE_KEY = "houseOfMemoriesProgress";

export function logProgressEvent(event, details = {}) {
  console.log(`[HOUSE] ${event}`, details);
}

export function defaultProgress() {
  return {
    rosePetals: 0,
    memoryCrests: 0,
    libraryComplete: false,
    galleryComplete: false,
    chapterFourUnlocked: false,
    gallery: {
      frames: [false, false, false, false, false, false],
      fragments: [false, false, false, false],
      sketchesExamined: [false, false, false, false]
    },
    library: {
      pages: [false, false, false, false, false],
      pageThreePetalCollected: false,
      pageFivePetalCollected: false
    },
    grandHall: {
      firstPetalCollected: false,
      hubUnlocked: false
    }
  };
}

function normalizeProgress(saved = {}) {
  const defaults = defaultProgress();
  return {
    ...defaults,
    ...saved,
    gallery: { ...defaults.gallery, ...(saved.gallery || {}) },
    library: { ...defaults.library, ...(saved.library || {}) },
    grandHall: { ...defaults.grandHall, ...(saved.grandHall || {}) }
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress();
    const saved = JSON.parse(raw);
    return normalizeProgress(saved);
  } catch {
    return defaultProgress();
  }
}

export function getHouseProgress() {
  if (!window.__houseProgress) {
    window.__houseProgress = loadProgress();
    logProgressEvent("SAVE LOADED", window.__houseProgress);
  }
  return window.__houseProgress;
}

export function saveProgress() {
  if (!window.__houseProgress) {
    console.warn("[HOUSE] SAVE WRITTEN skipped: no progress in memory");
    return;
  }
  try {
    logProgressEvent("SAVE WRITTEN", window.__houseProgress);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__houseProgress));
  } catch (e) {
    console.error("[HOUSE] SAVE WRITTEN failed:", e);
  }
}

export function resetProgress() {
  window.__houseProgress = defaultProgress();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(window.__houseProgress));
  } catch (e) {
    console.error("[HOUSE] SAVE WRITTEN failed during reset:", e);
  }
  logProgressEvent("SAVE WRITTEN", { reset: true, progress: window.__houseProgress });
  return window.__houseProgress;
}
