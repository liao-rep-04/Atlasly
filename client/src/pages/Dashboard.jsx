import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Plus, MapPin, Calendar, Camera, Trash2, X, Users, Mail } from 'lucide-react';
import { getTrips, createTrip, deleteTrip, getInvitations, respondToInvitation } from '../lib/api';
import CompleteProfileModal from '../components/CompleteProfileModal';

const emptyForm = { name: '', description: '', start_date: '', end_date: '' };

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [creating, setCreating] = useState(false);

  const profileIncomplete = user && (!user.selfieUrl || !user.gender);

  const loadData = async () => {
    try {
      const [tripsRes, invitesRes] = await Promise.all([getTrips(), getInvitations()]);
      setTrips(tripsRes.data.trips);
      setInvitations(invitesRes.data.invitations);
    } catch (err) {
      setError('Failed to load trips. Is the server running?');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInviteResponse = async (inviteId, accept) => {
    try {
      await respondToInvitation(inviteId, accept);
      setInvitations(invitations.filter((inv) => inv.id !== inviteId));
      if (accept) {
        const res = await getTrips();
        setTrips(res.data.trips);
      }
    } catch (err) {
      setError('Failed to respond to invitation');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const res = await createTrip({
        name: form.name,
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
      });
      navigate(`/trip/${res.data.trip.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create trip');
      setCreating(false);
    }
  };

  const handleDelete = async (e, trip) => {
    e.preventDefault(); // don't follow the card link
    if (!window.confirm(`Delete "${trip.name}" and everything in it?`)) return;
    try {
      await deleteTrip(trip.id);
      setTrips(trips.filter((t) => t.id !== trip.id));
    } catch (err) {
      setError('Failed to delete trip');
    }
  };

  const formatDateRange = (trip) => {
    if (!trip.start_date) return 'No dates set';
    const start = new Date(trip.start_date).toLocaleDateString();
    if (!trip.end_date) return start;
    return `${start} – ${new Date(trip.end_date).toLocaleDateString()}`;
  };

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Legacy accounts must add a selfie + avatar style before continuing */}
      {profileIncomplete && <CompleteProfileModal />}

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-neutral-200">
        <div className="container-page">
          <div className="flex items-center justify-between py-4">
            <h1 className="text-2xl font-display font-bold text-primary-600">
              Atlasly
            </h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-600">
                Welcome, {user?.fullName || user?.username}!
              </span>
              <button onClick={handleLogout} className="btn-outline">
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container-page">
        <div className="py-8">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-display font-bold text-neutral-900 mb-2">
                My Trips
              </h2>
              <p className="text-neutral-600">
                Start planning your next adventure
              </p>
            </div>
            {trips.length > 0 && (
              <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Trip
              </button>
            )}
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Pending invitations */}
          {invitations.length > 0 && (
            <div className="mb-8 space-y-3">
              {invitations.map((inv) => (
                <div
                  key={inv.id}
                  className="card border-2 border-primary-200 bg-primary-50/50 flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Mail className="w-5 h-5 text-primary-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-neutral-900">
                        <span className="font-semibold">{inv.invited_by_username}</span>{' '}
                        invited you to <span className="font-semibold">"{inv.trip_name}"</span>
                      </p>
                      {inv.trip_description && (
                        <p className="text-xs text-neutral-500 line-clamp-1">
                          {inv.trip_description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      className="btn-primary px-4 py-1.5 text-sm"
                      onClick={() => handleInviteResponse(inv.id, true)}
                    >
                      Join Trip
                    </button>
                    <button
                      className="btn-outline px-4 py-1.5 text-sm"
                      onClick={() => handleInviteResponse(inv.id, false)}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {loading ? (
            <div className="card text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-neutral-600">Loading your trips...</p>
            </div>
          ) : trips.length === 0 ? (
            <div className="card text-center py-12">
              <div className="max-w-md mx-auto">
                <div className="text-6xl mb-4">✈️</div>
                <h3 className="text-xl font-semibold text-neutral-900 mb-2">
                  No trips yet
                </h3>
                <p className="text-neutral-600 mb-6">
                  Create your first trip and start planning your perfect getaway!
                </p>
                <button className="btn-primary" onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Trip
                </button>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trip/${trip.id}`}
                  className="card hover:shadow-lg transition-shadow group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0">
                      <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                        {trip.name}
                      </h3>
                      {!trip.is_owner && (
                        <span className="inline-flex items-center gap-1 text-xs text-secondary-700 bg-secondary-50 rounded-full px-2 py-0.5 mt-1">
                          <Users className="w-3 h-3" />
                          Shared by {trip.owner_username}
                        </span>
                      )}
                    </div>
                    {trip.is_owner && (
                      <button
                        className="p-1.5 text-neutral-300 hover:text-red-600 transition-colors"
                        onClick={(e) => handleDelete(e, trip)}
                        title="Delete trip"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  {trip.description && (
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                      {trip.description}
                    </p>
                  )}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-neutral-500">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {formatDateRange(trip)}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {trip.item_count} stop{trip.item_count !== 1 ? 's' : ''}
                    </span>
                    <span className="flex items-center gap-1">
                      <Camera className="w-4 h-4" />
                      {trip.photo_count}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Create trip modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Create a Trip</h3>
              <button
                className="p-1 text-neutral-400 hover:text-neutral-700"
                onClick={() => setShowCreateForm(false)}
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Trip Name *
                </label>
                <input
                  type="text"
                  className="input"
                  placeholder="e.g., Summer in Japan"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  className="input"
                  rows="2"
                  placeholder="What's this adventure about?"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    className="input"
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1" disabled={creating}>
                  {creating ? 'Creating...' : 'Create Trip'}
                </button>
                <button
                  type="button"
                  className="btn-outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
