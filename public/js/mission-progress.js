/**
 * 任務模式進度、解鎖、成就與雲端同步
 */
(function (global) {
  const STORAGE_KEY = 'droneLab.missionProgress.v1';
  const ACHIEVEMENTS_KEY = 'droneLab.missionAchievements.v1';

  const CONCEPT_LABELS = {
    sequence: '順序執行',
    'sequence-scan': '定點掃描',
    'sequence-events': '事件與記錄',
    loop: '重複與優化',
    'if-sensor': '條件感測',
    composite: '綜合任務',
    'loop-planning': '路線規劃',
    'state-pickup': '狀態：取貨',
    'state-delivery': '狀態：送貨',
    'state-battery': '狀態：電量管理',
    'sequence-collect': '收集任務',
    'repeat-until-done': '重複直到完成',
    'sequence-sample': '採集樣本',
    'sequence-report': '回報數據',
    'if-heat': '高溫感測',
  };

  const THEME_WEATHER = {
    campus: '☀️ 晴朗',
    rescue: '🌫️ 揚塵霾',
    farm: '💨 強風',
    warehouse: '🏭 室內',
    space: '🌌 深空',
    coast: '🌊 海濱',
    volcano: '🌋 火山灰',
    lab: '🔬 實驗室',
  };

  function loadProgress() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (error) {
      console.warn('Failed to load mission progress', error);
      return {};
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    syncToCloud(progress);
  }

  function loadAchievements() {
    try {
      return JSON.parse(localStorage.getItem(ACHIEVEMENTS_KEY) || '{}');
    } catch (error) {
      return {};
    }
  }

  function saveAchievements(achievements) {
    localStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievements));
  }

  function missionKey(chapter, mission) {
    return `${chapter.id}.${mission.id}`;
  }

  function isChapterUnlocked() {
    return true;
  }

  function isMissionUnlocked(chapters, chapterIndex, missionIndex) {
    const chapter = chapters[chapterIndex];
    return Boolean(chapter?.missions?.[missionIndex]);
  }

  function getTotalProgress(chapters, progress) {
    let total = 0;
    let completed = 0;
    chapters.forEach((chapter) => {
      chapter.missions.forEach((mission) => {
        total += 1;
        if (progress[missionKey(chapter, mission)]?.completed) completed += 1;
      });
    });
    return { completed, total, percent: total ? Math.round((completed / total) * 100) : 0 };
  }

  function getChapterProgress(chapter, progress) {
    const done = chapter.missions.filter((mission) => progress[missionKey(chapter, mission)]?.completed).length;
    return { done, total: chapter.missions.length };
  }

  function starCount(stars = '') {
    return String(stars).split('').filter((char) => char === '★').length;
  }

  function recordFail({ chapters, chapterIndex, missionIndex, progress }) {
    const chapter = chapters[chapterIndex];
    const mission = chapter?.missions?.[missionIndex];
    if (!chapter || !mission) return { progress, failCount: 0 };
    const key = missionKey(chapter, mission);
    const previous = progress[key] || {};
    const failCount = (previous.fails || 0) + 1;
    progress[key] = {
      ...previous,
      fails: failCount,
      attempts: (previous.attempts || 0) + 1,
    };
    saveProgress(progress);
    return { progress, failCount };
  }

  function recordComplete({ chapters, chapterIndex, missionIndex, progress, stars, moves, battery, blockCount }) {
    const chapter = chapters[chapterIndex];
    const mission = chapter?.missions?.[missionIndex];
    if (!chapter || !mission) return progress;
    const key = missionKey(chapter, mission);
    const previous = progress[key] || {};
    const next = {
      completed: true,
      stars: starCount(previous.stars) >= starCount(stars) ? previous.stars : stars,
      bestMoves: previous.bestMoves == null ? moves : Math.min(previous.bestMoves, moves),
      bestBattery: previous.bestBattery == null ? battery : Math.max(previous.bestBattery, battery),
      bestBlocks: previous.bestBlocks == null ? blockCount : Math.min(previous.bestBlocks, blockCount),
      completedAt: new Date().toISOString(),
      attempts: (previous.attempts || 0) + 1,
    };
    progress[key] = next;
    saveProgress(progress);
    updateAchievements({ chapters, chapterIndex, missionIndex, progress, stars, blockCount });
    submitLeaderboard({ chapter, mission, stars, moves, battery, blockCount });
    return progress;
  }

  function updateAchievements({ chapters, chapterIndex, missionIndex, progress, stars, blockCount }) {
    const achievements = loadAchievements();
    const chapter = chapters[chapterIndex];
    const mission = chapter.missions[missionIndex];
    const key = missionKey(chapter, mission);
    achievements.firstClear = achievements.firstClear || {};
    if (!achievements.firstClear[key]) achievements.firstClear[key] = new Date().toISOString();

    if (starCount(stars) === 3) {
      achievements.perfect = achievements.perfect || {};
      achievements.perfect[key] = true;
    }

    const cp = getChapterProgress(chapter, progress);
    if (cp.done === cp.total) {
      achievements.chapterBadges = achievements.chapterBadges || {};
      achievements.chapterBadges[chapter.id] = new Date().toISOString();
    }

    const thresholds = mission.stars || {};
    if (starCount(stars) === 3 && blockCount <= Math.max(3, Math.ceil((thresholds.moves || 12) / 4))) {
      achievements.minimalist = achievements.minimalist || {};
      achievements.minimalist[key] = true;
    }

    saveAchievements(achievements);
    return achievements;
  }

  function getAchievementSummary(chapters, progress) {
    const achievements = loadAchievements();
    const firstClear = Object.keys(achievements.firstClear || {}).length;
    const perfect = Object.keys(achievements.perfect || {}).length;
    const chapterBadges = Object.keys(achievements.chapterBadges || {}).length;
    const minimalist = Object.keys(achievements.minimalist || {}).length;
    const concepts = {};
    chapters.forEach((chapter) => {
      chapter.missions.forEach((mission) => {
        if (!progress[missionKey(chapter, mission)]?.completed || !mission.concept) return;
        concepts[mission.concept] = (concepts[mission.concept] || 0) + 1;
      });
    });
    return { firstClear, perfect, chapterBadges, minimalist, concepts, achievements };
  }

  function syncToCloud(progress) {
    if (!global.DroneCloud?.isConfigured) return;
    global.DroneCloud.saveMissionProgress?.(progress).catch((error) => {
      console.warn('Failed to sync mission progress', error);
    });
  }

  function mergeCloudProgress(local, remote) {
    if (!remote || typeof remote !== 'object') return local;
    const merged = { ...local };
    Object.entries(remote).forEach(([key, value]) => {
      const localEntry = merged[key];
      if (!localEntry?.completed) {
        merged[key] = value;
        return;
      }
      if (!value?.completed) return;
      merged[key] = {
        ...localEntry,
        stars: starCount(value.stars) > starCount(localEntry.stars) ? value.stars : localEntry.stars,
        bestMoves: Math.min(localEntry.bestMoves ?? value.bestMoves, value.bestMoves ?? localEntry.bestMoves),
        bestBattery: Math.max(localEntry.bestBattery ?? 0, value.bestBattery ?? 0),
        bestBlocks: Math.min(localEntry.bestBlocks ?? value.bestBlocks, value.bestBlocks ?? localEntry.bestBlocks),
      };
    });
    return merged;
  }

  async function pullFromCloud() {
    if (!global.DroneCloud?.loadMissionProgress) return loadProgress();
    try {
      const remote = await global.DroneCloud.loadMissionProgress();
      const merged = mergeCloudProgress(loadProgress(), remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    } catch (error) {
      console.warn('Failed to pull mission progress', error);
      return loadProgress();
    }
  }

  function submitLeaderboard({ chapter, mission, stars, moves, battery, blockCount }) {
    if (!global.DroneCloud?.saveMissionLeaderboard) return;
    global.DroneCloud.saveMissionLeaderboard({
      missionId: mission.id,
      chapterId: chapter.id,
      missionTitle: mission.title,
      stars,
      moves,
      battery,
      blockCount,
      displayName: global.DroneCloud.currentUser?.displayName || '訪客飛手',
    }).catch((error) => console.warn('Failed to save leaderboard entry', error));
  }

  global.MissionProgress = {
    STORAGE_KEY,
    CONCEPT_LABELS,
    THEME_WEATHER,
    loadProgress,
    saveProgress,
    loadAchievements,
    missionKey,
    isChapterUnlocked,
    isMissionUnlocked,
    getTotalProgress,
    getChapterProgress,
    recordComplete,
    recordFail,
    getAchievementSummary,
    pullFromCloud,
    starCount,
  };
}(window));
