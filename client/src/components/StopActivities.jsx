import { useState } from 'react';
import { Plus, X, Trash2, MapPin, CalendarCheck } from 'lucide-react';
import { ACTIVITY_STATUSES } from '../lib/tripConstants';

const emptyForm = { name: '', location_name: '', cost: '', status: 'planned' };

/**
 * Sub-activities tied to one stop — a lighter agenda nested inside it
 * (e.g. onboard events for a cruise, or port excursions). Each has its own
 * price/location and is marked planned or optional; click the status pill
 * to flip it.
 */
const StopActivities = ({ activities = [], onCreate, onToggleStatus, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onCreate({
        ...form,
        cost: form.cost === '' ? null : parseFloat(form.cost),
      });
      setForm(emptyForm);
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
          <CalendarCheck className="w-3.5 h-3.5" />
          Activities
          {activities.length > 0 && <span className="normal-case font-normal">({activities.length})</span>}
        </p>
        <button
          type="button"
          className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-0.5"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add'}
        </button>
      </div>

      {activities.length > 0 && (
        <ul className="space-y-1.5 mb-2">
          {activities.map((activity) => (
            <li
              key={activity.id}
              className="flex items-center gap-2 text-sm bg-neutral-50 rounded-lg px-2.5 py-1.5"
            >
              <button
                type="button"
                className={`flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                  activity.status === 'optional'
                    ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                    : 'bg-green-100 text-green-700 hover:bg-green-200'
                }`}
                onClick={() => onToggleStatus(activity)}
                title="Click to toggle planned / optional"
              >
                {activity.status === 'optional' ? 'Optional' : 'Planned'}
              </button>
              <span className="flex-1 min-w-0 truncate text-neutral-800">{activity.name}</span>
              {activity.location_name && (
                <span
                  className="hidden sm:flex items-center gap-0.5 text-xs text-neutral-500 flex-shrink-0 max-w-[140px] truncate"
                  title={activity.location_name}
                >
                  <MapPin className="w-3 h-3" />
                  {activity.location_name}
                </span>
              )}
              {parseFloat(activity.cost) > 0 && (
                <span className="text-xs font-semibold text-primary-600 flex-shrink-0">
                  ${parseFloat(activity.cost).toFixed(0)}
                </span>
              )}
              <button
                type="button"
                className="p-0.5 text-neutral-300 hover:text-red-600 flex-shrink-0"
                onClick={() => onDelete(activity)}
                title="Remove activity"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-2 bg-neutral-50 rounded-lg p-3">
          <input
            type="text"
            className="input text-sm py-1.5"
            placeholder="Activity name (e.g. Snorkeling excursion)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
            autoFocus
          />
          <div className="grid grid-cols-3 gap-2">
            <input
              type="text"
              className="input text-sm py-1.5 col-span-1"
              placeholder="Location"
              value={form.location_name}
              onChange={(e) => setForm({ ...form, location_name: e.target.value })}
            />
            <input
              type="number"
              step="0.01"
              min="0"
              className="input text-sm py-1.5 col-span-1"
              placeholder="Cost ($)"
              value={form.cost}
              onChange={(e) => setForm({ ...form, cost: e.target.value })}
            />
            <select
              className="input text-sm py-1.5 col-span-1"
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
            >
              {ACTIVITY_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn-primary text-sm py-1.5 px-3" disabled={saving}>
            {saving ? 'Adding...' : 'Add Activity'}
          </button>
        </form>
      )}
    </div>
  );
};

export default StopActivities;
