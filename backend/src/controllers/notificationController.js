const pool = require('../config/db');

// GET /api/notifications
exports.getNotifications = async (req, res) => {
  try {
    const [notifications, unread] = await Promise.all([
      pool.query(
        `SELECT id, incident_id, type, message, read_at, created_at
         FROM notifications
         WHERE user_id = $1
         ORDER BY created_at DESC, id DESC
         LIMIT 50`,
        [req.user.id]
      ),
      pool.query(
        'SELECT COUNT(*)::int AS unread_count FROM notifications WHERE user_id = $1 AND read_at IS NULL',
        [req.user.id]
      ),
    ]);

    res.json({
      notifications: notifications.rows,
      unread_count: unread.rows[0].unread_count,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not load notifications' });
  }
};

// PATCH /api/notifications/:id/read
exports.markAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = COALESCE(read_at, NOW())
       WHERE id = $1 AND user_id = $2
       RETURNING id, read_at`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Notification not found' });
    }
    res.json({ notification: result.rows[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update notification' });
  }
};

// PATCH /api/notifications/read-all
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE notifications
       SET read_at = NOW()
       WHERE user_id = $1 AND read_at IS NULL`,
      [req.user.id]
    );
    res.json({ updated: result.rowCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not update notifications' });
  }
};
