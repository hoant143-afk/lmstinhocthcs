import { apiClient } from './apiClient';

const STORAGE_KEYS = {
  CLASSES: 'sb_lms_classes_v1',
  LESSONS: 'sb_lms_lessons_v1',
  TASKS: 'sb_lms_tasks_v1',
  TEACHERS: 'sb_lms_teachers_v1',
  LAST_SYNC: 'sb_lms_last_sync_v1'
};

export const syncService = {
  async syncWithServer(): Promise<void> {
    try {
      // 1. Fetch server config (Apps Script URL, Data Provider)
      try {
        const configRes = await fetch('/api/config');
        if (configRes.ok) {
          const config = await configRes.json();
          if (config.appsScriptUrl && !apiClient.getAppsScriptUrl()) {
            apiClient.setAppsScriptUrl(config.appsScriptUrl);
          }
          if (config.dataProvider) {
            apiClient.setDataProvider(config.dataProvider);
          }
        }
      } catch (e) {
        console.warn('[syncService] Config fetch failed:', e);
      }

      // 2. Read local data from localStorage
      let localClasses = [];
      let localLessons = [];
      let localTasks = [];
      let localTeachers = [];

      try {
        const rawClasses = localStorage.getItem(STORAGE_KEYS.CLASSES);
        if (rawClasses) localClasses = JSON.parse(rawClasses);

        const rawLessons = localStorage.getItem(STORAGE_KEYS.LESSONS);
        if (rawLessons) localLessons = JSON.parse(rawLessons);

        const rawTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
        if (rawTasks) localTasks = JSON.parse(rawTasks);

        const rawTeachers = localStorage.getItem(STORAGE_KEYS.TEACHERS);
        if (rawTeachers) localTeachers = JSON.parse(rawTeachers);
      } catch (e) {
        console.warn('[syncService] Error reading localStorage:', e);
      }

      // If we have local classes, push them to server to ensure multi-device availability
      if (Array.isArray(localClasses) && localClasses.length > 0) {
        await fetch('/api/sync/push', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            classes: localClasses,
            lessons: localLessons,
            tasks: localTasks,
            teachers: localTeachers
          })
        });
      }
    } catch (err) {
      console.warn('[syncService] Background sync error:', err);
    }
  }
};
