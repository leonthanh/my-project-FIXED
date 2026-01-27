const User = require('../models/User');

// Phone number that has privileged rights for non-writing tests
const PRIVILEGED_TEACHER_PHONE = process.env.PRIVILEGED_TEACHER_PHONE || '0784611179';

function normalizePhone(s) {
  if (!s) return '';
  return String(s).replace(/\D/g, '').replace(/^\+?0*/, '');
}

// category: 'reading' | 'listening' | 'writing' | 'cambridge'
function requireTestPermission(category) {
  return async (req, res, next) => {
    try {
      const userCtx = req.user;
      if (!userCtx || !userCtx.id) return res.status(401).json({ message: 'Unauthorized' });

      const user = await User.findByPk(userCtx.id);
      if (!user) return res.status(401).json({ message: 'Unauthorized' });

      if (user.role === 'admin') return next();

      if (user.role !== 'teacher') return res.status(403).json({ message: 'Insufficient permissions' });

      const cat = String(category || '').toLowerCase();

      // Teachers are allowed to create/edit writing tests
      if (cat === 'writing') return next();

      // For reading/listening/cambridge only privileged teacher (phone match) may proceed
      const userPhone = normalizePhone(user.phone);
      const allowedPhone = normalizePhone(PRIVILEGED_TEACHER_PHONE);
      if (['reading', 'listening', 'cambridge'].includes(cat)) {
        if (userPhone && userPhone === allowedPhone) return next();
        return res.status(403).json({ message: 'Only a privileged teacher may create/edit this type of test' });
      }

      // deny by default
      return res.status(403).json({ message: 'Insufficient permissions' });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireTestPermission, PRIVILEGED_TEACHER_PHONE };
