// The form where a citizen reports an emergency.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useLanguage } from '../context/LanguageContext';

const TYPES = ['Fire', 'Medical', 'Accident', 'Crime', 'Natural Disaster', 'Other'];

function ReportEmergency() {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    type: 'Fire',
    location: '',
    description: '',
  });
  const [coords, setCoords] = useState(null);
  const [gpsMessage, setGpsMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Asks the browser for the phone/computer GPS position
  const getMyLocation = () => {
    if (!navigator.geolocation) {
      setGpsMessage(t('gpsUnsupported'));
      return;
    }
    setGpsMessage(t('gettingLocation'));
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setGpsMessage(`✅ ${t('gpsCaptured')}`);
      },
      () => setGpsMessage(`❌ ${t('gpsFailed')}`)
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/incidents', {
        ...form,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      });
      navigate('/my-incidents'); // show the list after sending
    } catch (err) {
      setError(err.response?.data?.message || t('cannotReach'));
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560 }}>
      <div className="card">
        <h2>🚨 {t('reportEmergency')}</h2>

        <form onSubmit={handleSubmit}>
          <label>{t('emergencyType')}</label>
          <select name="type" value={form.type} onChange={handleChange}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <label>{t('location')}</label>
          <input
            name="location"
            value={form.location}
            onChange={handleChange}
            placeholder="Example: Kimironko, near the market"
            required
          />

          <button type="button" className="btn btn-primary" onClick={getMyLocation}>
            📍 {t('useGps')}
          </button>
          {gpsMessage && <p className="muted">{gpsMessage}</p>}

          <label>{t('describe')}</label>
          <textarea
            name="description"
            rows="4"
            value={form.description}
            onChange={handleChange}
            placeholder="Example: A house is on fire, two people are inside"
            required
          />

          {error && <p className="error">{error}</p>}

          <button className="btn btn-danger" type="submit" disabled={loading}>
            {loading ? t('sending') : t('sendReport')}
          </button>
        </form>
      </div>
    </div>
  );
}

export default ReportEmergency;