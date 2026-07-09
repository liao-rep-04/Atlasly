import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../lib/api';
import SelfieInput from './SelfieInput';

/**
 * Blocking modal for accounts that predate the selfie/gender requirement.
 * Shown after login until the profile has both.
 */
const CompleteProfileModal = () => {
  const { user, updateUser } = useAuth();
  const [selfie, setSelfie] = useState(null);
  const [gender, setGender] = useState(user?.gender || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user.selfieUrl && !selfie) {
      setError('Please add a selfie');
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ gender, selfie });
      updateUser(res.data.user);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <h3 className="text-lg font-semibold mb-1">One more thing!</h3>
        <p className="text-sm text-neutral-600 mb-4">
          Trips now feature you. Add a selfie and pick an avatar style to continue.
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelfieInput onChange={setSelfie} initialUrl={user?.selfieUrl} />
          <div>
            <label className="label">Gender *</label>
            <select
              className="input"
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              required
            >
              <option value="" disabled>
                Choose your travel avatar style
              </option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other / prefer not to say</option>
            </select>
          </div>
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Saving...' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
