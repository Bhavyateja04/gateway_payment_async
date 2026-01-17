import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { setAuthHeaders } from '../api';
import './Login.css';

function Login() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();

    if (email === 'test@example.com') {
      // For this deliverable, password is not validated
      localStorage.setItem('apiKey', 'key_test_abc123');
      localStorage.setItem('apiSecret', 'secret_test_xyz789');
      localStorage.setItem('merchantEmail', email);

      setAuthHeaders('key_test_abc123', 'secret_test_xyz789');
      navigate('/dashboard', { replace: true });
    } else {
      alert('Use test@example.com for login');
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1 className="login-title">Merchant Login</h1>
        <p className="login-subtitle">
          Sign in with the test merchant account to view the dashboard.
        </p>

        <form data-test-id="login-form" onSubmit={handleSubmit}>
          <div className="login-field">
            <input
              data-test-id="email-input"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="login-field">
            <input
              data-test-id="password-input"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            data-test-id="login-button"
            type="submit"
            className="login-button"
          >
            Login
          </button>
        </form>

        <p className="login-hint">
          This is a sandbox environment for demo purposes only.
        </p>
      </div>
    </div>
  );
}

export default Login;
