import { useState, useEffect } from 'react';
import { Lightbulb, Plus, X, Check, Trash2, MapPin, Loader2 } from 'lucide-react';
import PlaceSearch from './PlaceSearch';
import { STOP_TYPES, DYNAMIC_EVENT_ICONS, stopIcon, stopLabel } from '../lib/tripConstants';
import { getIdeas, createIdea, promoteIdea, deleteIdea } from '../lib/api';

const emptyForm = {
  type: 'experience', name: '', description: '',
  location_name: '', latitude: '', longitude: '', cost: '',
  icon: DYNAMIC_EVENT_ICONS[0], custom_label: '',
};

/**
 * Collaborative proposal board: any trip member can pitch a place or
 * experience with a price/description; anyone (proposer or owner) can
 * withdraw it; one click promotes it into the actual itinerary.
 */
const IdeaBoard = ({ tripId, currentUserId, isOwner, onPromoted }) => {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null); // idea currently being promoted/removed

  useEffect(() => {
    getIdeas(tripId)
      .then((res) => setIdeas(res.data.ideas))
      .finally(() => setLoading(false));
  }, [tripId]);

  const handlePlaceSelect = (place) => {
    setForm((f) => ({
      ...f,
      name: f.name || place.name,
      location_name: place.display_name,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await createIdea(tripId, {
        ...form,
        latitude: form.latitude === '' ? null : parseFloat(form.latitude),
        longitude: form.longitude === '' ? null : parseFloat(form.longitude),
        cost: form.cost === '' ? null : parseFloat(form.cost),
        icon: form.type === 'dynamic' ? form.icon : null,
        custom_label: form.type === 'dynamic' ? form.custom_label.trim() || null : null,
      });
      setIdeas((prev) => [res.data.idea, ...prev]);
      setForm(emptyForm);
      setShowForm(false);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to propose idea');
    } finally {
      setSaving(false);
    }
  };

  const handlePromote = async (idea) => {
    setBusyId(idea.id);
    try {
      const res = await promoteIdea(tripId, idea.id);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
      onPromoted(res.data.item);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to add to plan');
    } finally {
      setBusyId(null);
    }
  };

  const handleRemove = async (idea) => {
    setBusyId(idea.id);
    try {
      await deleteIdea(tripId, idea.id);
      setIdeas((prev) => prev.filter((i) => i.id !== idea.id));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove idea');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-500" />
          Idea Board
          {ideas.length > 0 && (
            <span className="text-sm font-normal text-neutral-500">{ideas.length}</span>
          )}
        </h2>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? <X className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showForm ? 'Close' : 'Propose Idea'}
        </button>
      </div>

      {showForm && (
        <div className="card mb-6 border-2 border-amber-200">
          <h3 className="text-sm font-semibold text-neutral-700 mb-3">
            What should we do or see?
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Find a place (optional)
              </label>
              <PlaceSearch onSelect={handlePlaceSelect} placeholder="e.g., a restaurant, a museum..." />
              {form.location_name && (
                <p className="text-xs text-neutral-500 mt-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {form.location_name}
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Idea Name *
              </label>
              <input
                type="text"
                className="input"
                placeholder="What do you want to call this?"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {STOP_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.emoji} {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Estimated Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input"
                  value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })}
                />
              </div>
            </div>
            {form.type === 'dynamic' && (
              <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    What do you call this kind of stop? *
                  </label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Cruise, Music Festival, Ski Trip"
                    value={form.custom_label}
                    onChange={(e) => setForm({ ...form, custom_label: e.target.value })}
                    required={form.type === 'dynamic'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-neutral-700 mb-1">
                    Map icon
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DYNAMIC_EVENT_ICONS.map((icon) => (
                      <button
                        key={icon}
                        type="button"
                        className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-colors ${
                          form.icon === icon
                            ? 'bg-amber-500 ring-2 ring-offset-1 ring-amber-400'
                            : 'bg-white hover:bg-amber-100 border border-neutral-200'
                        }`}
                        onClick={() => setForm({ ...form, icon })}
                        title={icon}
                      >
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Why it's worth it
              </label>
              <textarea
                className="input"
                rows="2"
                placeholder="Sell the group on this one"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Proposing...' : 'Propose to the Group'}
              </button>
              <button type="button" className="btn-outline" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-neutral-500 text-sm">Loading ideas...</p>
      ) : ideas.length === 0 ? (
        <div className="card text-center py-10">
          <Lightbulb className="w-10 h-10 text-amber-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-neutral-900 mb-1">No ideas yet</h3>
          <p className="text-neutral-600 text-sm">
            Anyone on the trip can pitch a place or experience here
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ideas.map((idea) => {
            const canRemove = idea.proposed_by === currentUserId || isOwner;
            const busy = busyId === idea.id;
            return (
              <div key={idea.id} className="card flex flex-col">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-neutral-900 pr-2">
                    {stopIcon(idea)} {idea.name}
                  </h3>
                  {parseFloat(idea.cost) > 0 && (
                    <span className="text-sm font-semibold text-primary-600 flex-shrink-0">
                      ${parseFloat(idea.cost).toFixed(0)}
                    </span>
                  )}
                </div>
                {idea.type === 'dynamic' && (
                  <span className="inline-block text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-2 py-0.5 mb-2">
                    {stopLabel(idea)}
                  </span>
                )}
                {idea.location_name && (
                  <p className="text-xs text-neutral-500 mb-2 line-clamp-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    {idea.location_name}
                  </p>
                )}
                {idea.description && (
                  <p className="text-sm text-neutral-600 mb-3 line-clamp-3 flex-1">
                    {idea.description}
                  </p>
                )}
                <div className="flex items-center gap-2 mb-3 mt-auto pt-2">
                  {idea.proposed_by_selfie ? (
                    <img
                      src={idea.proposed_by_selfie}
                      alt={idea.proposed_by_username}
                      className="w-5 h-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-neutral-300 flex items-center justify-center text-[10px] font-semibold text-white">
                      {(idea.proposed_by_username || '?')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="text-xs text-neutral-500">
                    Proposed by {idea.proposed_by_username || 'someone'}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="btn-primary flex-1 px-3 py-1.5 text-sm"
                    onClick={() => handlePromote(idea)}
                    disabled={busy}
                    title="Add to the itinerary"
                  >
                    {busy ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-1.5" />
                        Add to Plan
                      </>
                    )}
                  </button>
                  {canRemove && (
                    <button
                      className="p-2 text-neutral-400 hover:text-red-600"
                      onClick={() => handleRemove(idea)}
                      disabled={busy}
                      title="Remove idea"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default IdeaBoard;
