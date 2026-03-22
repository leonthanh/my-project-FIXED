export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
};

export const isAdmin = (user) => !!(user && user.role === 'admin');
export const isTeacher = (user) => !!(user && user.role === 'teacher');

// A teacher is "privileged" if the DB field canManageTests is true
export const isPrivilegedTeacher = (user) => {
  if (!isTeacher(user)) return false;
  return user.canManageTests === true;
};

// category: 'writing' | 'reading' | 'listening' | 'cambridge'
export const canManageCategory = (user, category) => {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (isTeacher(user)) {
    const cat = String(category || '').toLowerCase();
    if (cat === 'writing') return true; // all teachers may manage writing
    if (['reading', 'listening', 'cambridge'].includes(cat)) {
      return isPrivilegedTeacher(user);
    }
    return false;
  }
  return false;
};
