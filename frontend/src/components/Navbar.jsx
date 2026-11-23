// The blue bar at the top of every page.
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { LANGUAGES, useLanguage } from '../context/LanguageContext';

function Navbar() {
  const { user, logout } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationError, setNotificationError] = useState('');

  useEffect(() => {
    if (!user) return undefined;

    let active = true;
    const loadNotifications = async () => {
      try {
        const response = await api.get('/notifications');
        if (active) {
          setNotifications(response.data.notifications);
          setUnreadCount(response.data.unread_count);
          setNotificationError('');
        }
      } catch {
        if (active) setNotificationError('Notifications could not be loaded');
      }
    };

    loadNotifications();
    const timer = setInterval(loadNotifications, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [user]);

  const handleLogout = () => {
    setNotifications([]);
    setUnreadCount(0);
    setNotificationsOpen(false);
    setNotificationError('');
    logout();
    navigate('/login');
  };

  const markAsRead = async (id) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((current) =>
        current.map((notification) =>
          notification.id === id
            ? { ...notification, read_at: notification.read_at || new Date().toISOString() }
            : notification
        )
      );
      setUnreadCount((count) =>
        count - Number(notifications.some(
          (notification) => notification.id === id && !notification.read_at
        ))
      );
    } catch {
      setNotificationError('Could not mark notification as read');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      const readAt = new Date().toISOString();
      setNotifications((current) =>
        current.map((notification) => ({ ...notification, read_at: notification.read_at || readAt }))
      );
      setUnreadCount(0);
      setNotificationError('');
    } catch {
      setNotificationError('Could not mark notifications as read');
    }
  };

  const notificationPath = user?.role === 'citizen'
    ? '/my-incidents'
    : user?.role === 'responder'
      ? '/responder'
      : user?.role === 'dispatcher'
        ? '/dispatcher'
        : '/admin';

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🚨 RERCS
      </Link>

      <div className="navbar-links">
        <label className="language-selector" aria-label={t('language')}>
          <span>{t('language')}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value)}
            aria-label={t('language')}
          >
            {Object.entries(LANGUAGES).map(([code, option]) => (
              <option key={code} value={code}>{option.label}</option>
            ))}
          </select>
        </label>
        {user ? (
          <>
            {user.role === 'citizen' && (
              <>
                <Link to="/report">{t('report')}</Link>
                <Link to="/my-incidents">{t('myIncidents')}</Link>
              </>
            )}
            {user.role === 'dispatcher' && (
              <Link to="/dispatcher">{t('incidents')}</Link>
            )}
            {user.role === 'responder' && (
              <Link to="/responder">{t('myAssignments')}</Link>
            )}
            {user.role === 'admin' && <Link to="/admin">{t('admin')}</Link>}
            <div className="notification-menu">
              <button
                className="navbar-btn notification-toggle"
                type="button"
                aria-expanded={notificationsOpen}
                aria-label={`${t('notifications')}, ${unreadCount}`}
                onClick={() => setNotificationsOpen((open) => !open)}
              >
                {t('notifications')}
                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
              {notificationsOpen && (
                <div className="notification-panel">
                  <div className="notification-header">
                    <strong>{t('notifications')}</strong>
                    {unreadCount > 0 && (
                      <button type="button" onClick={markAllAsRead}>
                        {t('markAllRead')}
                      </button>
                    )}
                  </div>
                  {notificationError && (
                    <p className="error notification-error">{notificationError}</p>
                  )}
                  {notifications.length === 0 ? (
                    <p className="muted notification-empty">{t('noNotifications')}</p>
                  ) : (
                    <ul className="notification-list">
                      {notifications.map((notification) => (
                        <li key={notification.id}>
                          <Link
                            className={notification.read_at ? '' : 'unread'}
                            to={notificationPath}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <span>{notification.message}</span>
                            <time dateTime={notification.created_at}>
                              {new Date(notification.created_at).toLocaleString()}
                            </time>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
            <span>
              {user.name} ({user.role})
            </span>
            <button className="navbar-btn" onClick={handleLogout}>
              {t('logout')}
            </button>
          </>
        ) : (
          <>
            <Link to="/login">{t('login')}</Link>
            <Link to="/register">{t('register')}</Link>
          </>
        )}
      </div>
    </nav>
  );
}

export default Navbar;