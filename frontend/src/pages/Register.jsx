// Citizens create their own account here.
// (Dispatchers and responders are created by the admin.)
import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';

function Register() {
  const { user, register } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  // One function updates whichever field the user is typing in
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError(t('passwordsDoNotMatch'));
      return;
    }

    setLoading(true);
    try {
      await register({
        name: form.name,
        email: form.email,
        phone: form.phone,
        address: form.address,
        password: form.password,
      });
    } catch (err) {
      setError(err.response?.data?.message || t('cannotReach'));
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 420 }}>
      <div className="card">
        <h2>{t('createCitizenAccount')}</h2>

        <form onSubmit={handleSubmit}>
          <label>{t('fullName')}</label>
          <input name="name" value={form.name} onChange={handleChange} required />

          <label>{t('email')}</label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />

          <label>{t('phone')}</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="07..."
          />

          <label>{t('address')}</label>
          <input name="address" value={form.address} onChange={handleChange} />

          <label>{t('password')} (6-72 bytes)</label>
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <label>{t('confirmPassword')}</label>
          <input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            required
          />

          {error && <p className="error">{error}</p>}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('pleaseWait') : t('register')}
          </button>
        </form>

        <p>
          {t('haveAccount')} <Link to="/login">{t('login')}</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;