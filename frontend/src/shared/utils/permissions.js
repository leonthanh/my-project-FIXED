export const getCurrentUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    return null;
  }
};

export const isAdmin = (user) => !!(user && user.role === 'admin');
export const isTeacher = (user) => !!(user && user.role === 'teacher');

const normalizePhone = (s) => (s ? String(s).replace(/\D/g, '').replace(/^0+/, '') : '');
const PRIVILEGED_PHONE = process.env.REACT_APP_PRIVILEGED_TEACHER_PHONE || '0784611179';

export const isPrivilegedTeacher = (user) => {
  if (!isTeacher(user)) return false;
  const up = normalizePhone(user.phone || '');
  const allowed = normalizePhone(PRIVILEGED_PHONE);
  return up && allowed && up === allowed;
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
    // default deny
    return false;
  }
  return false;
};
