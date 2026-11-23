// The page shown after login. Each role gets buttons to its own pages.
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function Dashboard() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="container">
      <div className="card">
        <h2>{t('welcome')}, {user.name} 👋</h2>
        <p>
          {t('loggedInAs')} <strong>{user.role}</strong>.
        </p>

        {user.role === 'citizen' && (
          <>
            <Link to="/report">
              <button className="btn btn-danger">🚨 {t('reportEmergency')}</button>
            </Link>{' '}
            <Link to="/my-incidents">
              <button className="btn btn-primary">{t('myIncidents')}</button>
            </Link>
          </>
        )}

        {user.role === 'dispatcher' && (
          <Link to="/dispatcher">
            <button className="btn btn-primary">{t('manageIncidents')}</button>
          </Link>
        )}

        {user.role === 'responder' && (
          <Link to="/responder">
            <button className="btn btn-primary">{t('myAssignments')}</button>
          </Link>
        )}

        {user.role === 'admin' && (
          <Link to="/admin">
            <button className="btn btn-primary">{t('openAdmin')}</button>
          </Link>
        )}
      </div>
    </div>
  );
}

export default Dashboard;