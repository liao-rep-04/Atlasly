import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const REMEMBERED_USERNAME_KEY = 'atlasly_remembered_username';

const Login = () => {
  const [username, setUsername] = useState(
    () => localStorage.getItem(REMEMBERED_USERNAME_KEY) || ''
  );
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(
    () => Boolean(localStorage.getItem(REMEMBERED_USERNAME_KEY))
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await login(username, password, remember);

    if (result.success) {
      if (remember) {
        localStorage.setItem(REMEMBERED_USERNAME_KEY, username);
      } else {
        localStorage.removeItem(REMEMBERED_USERNAME_KEY);
      }
      navigate('/dashboard');
    } else {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 via-secondary-50 to-accent-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-display font-bold text-primary-600 mb-2">
            Atlasly
          </h1>
          <p className="text-neutral-600">Plan your perfect trip</p>
        </div>

        <div className="card-soft">
          <h2 className="text-2xl font-semibold text-center mb-6">Welcome Back</h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
            <div>
              <label htmlFor="username" className="label">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input"
                placeholder="Enter your username"
                required
                autoFocus
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                placeholder="Enter your password"
                required
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-neutral-600 cursor-pointer">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              Remember me
            </label>

            <div className="flex items-center justify-center gap-3 text-sm">
              <Link
                to="/forgot-username"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot username?
              </Link>
              <span className="text-neutral-300">|</span>
              <Link
                to="/forgot-password"
                className="text-primary-600 hover:text-primary-700 font-medium"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-neutral-600">
            Don't have an account?{' '}
            <Link
              to="/register"
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
