const User = require('../models/User');

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

      // All teachers may create/edit writing tests
      if (cat === 'writing') return next();

      // For reading/listening/cambridge: check the canManageTests flag on the user record
      if (['reading', 'listening', 'cambridge'].includes(cat)) {
        if (user.canManageTests) return next();
        return res.status(403).json({ message: 'Only a privileged teacher may create/edit this type of test' });
      }

      // deny by default
      return res.status(403).json({ message: 'Insufficient permissions' });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = { requireTestPermission };
