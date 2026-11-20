import { useEffect, useState } from 'react';
import { MapPin, X } from 'lucide-react';
import PlaceSearch from './PlaceSearch';

const emptyForm = {
  title: '', description: '', location_name: '', latitude: '', longitude: '',
  event_date: '', event_time: '',
};

/**
 * Post-an-event form: search a place (fills name + coords) or click
 * anywhere on the map instead (`pendingPin` flows in when that happens).
 * Date/time are both optional — an event can be a scheduled meetup or
 * just an open-ended pin.
 */
const EventForm = ({ pendingPin, onSubmit, onCancel }) => {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (pendingPin) {
      setForm((f) => ({
        ...f,
        latitude: pendingPin.lat.toFixed(6),
        longitude: pendingPin.lng.toFixed(6),
      }));
    }
  }, [pendingPin]);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePlaceSelect = (place) => {
    setForm((f) => ({
      ...f,
      title: f.title || place.name,
      location_name: place.display_name,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        latitude: form.latitude === '' ? null : parseFloat(form.latitude),
        longitude: form.longitude === '' ? null : parseFloat(form.longitude),
        event_date: form.event_date || null,
        event_time: form.event_time || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = form.latitude !== '' && form.longitude !== '';

  return (
    <form onSubmit={handleSubmit} className="card-soft space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Post an event</h3>
        <button type="button" onClick={onCancel} className="p-1 text-neutral-400 hover:text-neutral-700">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div>
        <label className="label">Find a place</label>
        <PlaceSearch onSelect={handlePlaceSelect} placeholder="e.g., Central Park, a coffee shop..." />
        <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
          <MapPin className="w-3 h-3" />
          {hasCoords
            ? `Pinned at ${parseFloat(form.latitude).toFixed(4)}, ${parseFloat(form.longitude).toFixed(4)}`
            : 'or click anywhere on the map to drop a pin'}
        </p>
      </div>

      <div>
        <label className="label">Title *</label>
        <input
          type="text"
          className="input"
          placeholder="What's happening?"
          value={form.title}
          onChange={set('title')}
          required
          autoFocus
        />
      </div>

      <div>
        <label className="label">Description</label>
        <textarea
          className="input"
          rows="3"
          placeholder="Details for people thinking about coming"
          value={form.description}
          onChange={set('description')}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Date (optional)</label>
          <input type="date" className="input" value={form.event_date} onChange={set('event_date')} />
        </div>
        <div>
          <label className="label">Time (optional)</label>
          <input type="time" className="input" value={form.event_time} onChange={set('event_time')} />
        </div>
      </div>

      <div className="flex gap-2">
        <button type="submit" className="btn-primary flex-1" disabled={saving || !hasCoords}>
          {saving ? 'Posting...' : 'Post Event'}
        </button>
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default EventForm;
