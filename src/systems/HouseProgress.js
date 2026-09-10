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
    bedroomComplete: false,
    kitchenComplete: false,
    basementComplete: false,
    observatoryComplete: false,
    finaleUnlocked: false,
    crimsonRoseAcquired: false,
    chapterFourUnlocked: false,
    chapterFiveUnlocked: false,
    chapterSixUnlocked: false,
    chapterSevenUnlocked: false,
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
    },
    bedroom: {
      keepsakesCollected: {
        book: false,
        plushie: false,
        sketchbook: false,
        dreamList: false,
        letter: false
      },
      plushiePetalCollected: false,
      dreamListPetalCollected: false,
      finalPetalCollected: false,
      chestUnlocked: false,
      crestCollected: false,
      bedroomComplete: false
    },
    kitchen: {
      ingredients: {
        spices: false,
        recipe: false,
        meat: false,
        coriander: false
      },
      spicePuzzleComplete: false,
      recipeFound: false,
      pantryUnlocked: false,
      pantryPuzzleComplete: false,
      secretIngredientFound: false,
      cookingComplete: false,
      crestCollected: false,
      kitchenComplete: false,
      petalTenCollected: false,
      petalElevenCollected: false,
      petalTwelveCollected: false
    },
    basement: {
      entered: false,
      fragments: [false, false, false, false, false],
      mirrorRestored: false,
      basementComplete: false,
      crestCollected: false,
      petalThirteenCollected: false,
      petalFourteenCollected: false,
      petalFifteenCollected: false
    },
    observatory: {
      entered: false,
      constellations: [false, false, false, false, false],
      staircaseClimbed: false,
      telescopeSolved: false,
      orrerySolved: false,
      starChartSolved: false,
      crimsonRoseAssembled: false,
      crestCollected: false,
      observatoryComplete: false,
      petalSixteenCollected: false,
      petalSeventeenCollected: false,
      petalEighteenCollected: false,
      petalNineteenCollected: false,
      petalTwentyCollected: false
    }
  };
}

function normalizeProgress(saved = {}) {
  const defaults = defaultProgress();
  const savedBedroom = saved.bedroom || {};
  const savedKeepsakes = savedBedroom.keepsakesCollected || savedBedroom.keepsakes || {};
  const savedKitchen = saved.kitchen || {};
  const savedBasement = saved.basement || {};
  const savedObservatory = saved.observatory || {};
  return {
    ...defaults,
    ...saved,
    gallery: { ...defaults.gallery, ...(saved.gallery || {}) },
    library: { ...defaults.library, ...(saved.library || {}) },
    grandHall: { ...defaults.grandHall, ...(saved.grandHall || {}) },
    bedroom: {
      ...defaults.bedroom,
      ...savedBedroom,
      bedroomComplete: Boolean(savedBedroom.bedroomComplete || saved.bedroomComplete),
      keepsakesCollected: {
        ...defaults.bedroom.keepsakesCollected,
        ...savedKeepsakes
      }
    },
    kitchen: {
      ...defaults.kitchen,
      ...savedKitchen,
      kitchenComplete: Boolean(savedKitchen.kitchenComplete || saved.kitchenComplete),
      ingredients: {
        ...defaults.kitchen.ingredients,
        ...(savedKitchen.ingredients || {})
      }
    },
    basement: {
      ...defaults.basement,
      ...savedBasement,
      basementComplete: Boolean(savedBasement.basementComplete || saved.basementComplete),
      fragments: [...defaults.basement.fragments].map((value, index) => Boolean((savedBasement.fragments || [])[index] ?? value))
    },
    observatory: {
      ...defaults.observatory,
      ...savedObservatory,
      observatoryComplete: Boolean(savedObservatory.observatoryComplete || saved.observatoryComplete),
      crimsonRoseAssembled: Boolean(savedObservatory.crimsonRoseAssembled || saved.crimsonRoseAcquired),
      constellations: [...defaults.observatory.constellations].map((value, index) => Boolean((savedObservatory.constellations || [])[index] ?? value))
    }
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
