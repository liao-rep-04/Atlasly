import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, UserCircle } from 'lucide-react';
import { forgotUsername } from '../lib/api';

const ForgotUsername = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [revealedUsername, setRevealedUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await forgotUsername(email);
      if (res.data.username) {
        // Email delivery isn't configured yet (pre-launch) — the server
        // hands the username straight back instead of emailing it
        setRevealedUsername(res.data.username);
      }
      // Either way (revealed directly, or the generic "check your email"
      // message in secure mode), the confirmation view covers it
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
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
        </div>

        <div className="card-soft">
          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                {revealedUsername ? (
                  <UserCircle className="w-7 h-7 text-primary-600" />
                ) : (
                  <Mail className="w-7 h-7 text-primary-600" />
                )}
              </div>
              {revealedUsername ? (
                <>
                  <h2 className="text-xl font-semibold mb-2">Found it!</h2>
                  <p className="text-neutral-600 text-sm mb-1">Your username is:</p>
                  <p className="text-2xl font-display font-bold text-primary-600 mb-6">
                    {revealedUsername}
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-2">Check your email</h2>
                  <p className="text-neutral-600 text-sm mb-6">
                    If an account exists for <strong>{email}</strong>, we've
                    sent your username there.
                  </p>
                </>
              )}
              <Link to="/login" className="btn-primary w-full">
                Back to Sign In
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-2xl font-semibold text-center mb-2">
                Forgot your username?
              </h2>
              <p className="text-neutral-600 text-sm text-center mb-6">
                Enter the email on your account and we'll help you find it.
              </p>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="label">
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input"
                    placeholder="you@example.com"
                    required
                    autoFocus
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  {loading ? 'Checking...' : 'Continue'}
                </button>
              </form>

              <div className="mt-4 text-center text-sm">
                <Link to="/forgot-password" className="text-primary-600 hover:text-primary-700 font-medium">
                  Forgot your password instead?
                </Link>
              </div>

              <Link
                to="/login"
                className="mt-6 flex items-center justify-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotUsername;
