// Temporary home page: it only checks that React can reach the backend.
import { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../services/api';
import { useLanguage } from '../context/LanguageContext';

function Home() {
  const { t } = useLanguage();
  const [status, setStatus] = useState('checking');

  useEffect(() => {
    axios
      .get(API_URL)
      .then(() => setStatus('connected'))
      .catch(() => setStatus('error'));
  }, []);

  return (
    <div className="container">
      <div className="card">
        <h1>RERCS</h1>
        <p>Rwanda Emergency Response and Coordination System</p>

        {status === 'checking' && <p>{t('checkingServer')}</p>}
        {status === 'connected' && (
          <p className="ok">✅ {t('serverConnected')}</p>
        )}
        {status === 'error' && (
          <p className="fail">
            ❌ {t('cannotReachServer')} {API_URL}?
          </p>
        )}
      </div>
    </div>
  );
}

export default Home;
