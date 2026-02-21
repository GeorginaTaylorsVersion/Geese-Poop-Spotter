const USER_ID_STORAGE_KEY = 'gps_user_id';

export const PROFILE_AVATAR_OPTIONS = ['🦢', '💩', '🪿', '📍', '⚠️', '🧽'];

export function getOrCreateUserId() {
  const existing = localStorage.getItem(USER_ID_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = `user_${Math.random().toString(36).slice(2, 10)}${Date.now()
    .toString(36)
    .slice(-4)}`;
  localStorage.setItem(USER_ID_STORAGE_KEY, generated);
  return generated;
}

export function createDefaultProfile(userId) {
  return {
    id: userId,
    displayName: `Goose Watcher ${userId.slice(-4).toUpperCase()}`,
    bio: '',
    avatarEmoji: '🦢'
  };
}
