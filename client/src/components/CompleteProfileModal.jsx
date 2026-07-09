import { useState } from 'react';
import { X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { updateProfile } from '../lib/api';
import SelfieInput from './SelfieInput';

/**
 * Avatar/gender editor. Two modes:
 *  - blocking (no onClose): shown after login until the profile has both —
 *    for accounts that predate the avatar requirement
 *  - dismissible (onClose passed): "edit your avatar" from the dashboard
 */
const CompleteProfileModal = ({ onClose }) => {
  const { user, updateUser } = useAuth();
  const [selfie, setSelfie] = useState(null);
  const [gender, setGender] = useState(user?.gender || '');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const editing = Boolean(onClose);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!user.selfieUrl && !selfie) {
      setError('Please add a photo');
      return;
    }
    if (editing && !selfie && gender === (user?.gender || '')) {
      onClose(); // nothing changed
      return;
    }
    setSaving(true);
    try {
      const res = await updateProfile({ gender, selfie });
      updateUser(res.data.user);
      if (editing) onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save profile');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-lg font-semibold">
            {editing ? 'Edit Your Avatar' : 'One more thing!'}
          </h3>
          {editing && (
            <button
              className="p-1 text-neutral-400 hover:text-neutral-700"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <p className="text-sm text-neutral-600 mb-4">
          {editing
            ? 'Swap your photo or avatar style — it shows up in trip playback.'
            : 'Trips now feature you. Add a photo and pick an avatar style to continue.'}
        </p>
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <SelfieInput onChange={setSelfie} initialUrl={user?.selfieUrl} />
          <div>
            <label className="label">Avatar Style *</label>
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
            {saving ? 'Saving...' : editing ? 'Save Changes' : 'Save & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfileModal;
