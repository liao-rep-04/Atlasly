import { useState } from 'react';
import { Plus, X, Trash2, Pin } from 'lucide-react';

/**
 * Micro tags: named sub-locations nested inside one stop (e.g. "that
 * rooftop cafe" within a "Paris" stop). Lighter than a full stop — just a
 * name plus a point — and never shown on the main trip map, only here and
 * on this stop's own mini map.
 */
const StopMicroTags = ({ pois = [], onCreate, onDelete }) => {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onCreate({ name: name.trim() });
      setName('');
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-neutral-100">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide flex items-center gap-1">
          <Pin className="w-3.5 h-3.5" />
          Micro Tags
          {pois.length > 0 && <span className="normal-case font-normal">({pois.length})</span>}
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

      {pois.length > 0 && (
        <ul className="flex flex-wrap gap-1.5 mb-2">
          {pois.map((poi) => (
            <li
              key={poi.id}
              className="flex items-center gap-1.5 text-sm bg-neutral-50 rounded-full pl-2.5 pr-1.5 py-1"
            >
              <Pin className="w-3 h-3 text-primary-500 flex-shrink-0" />
              <span className="text-neutral-800">{poi.name}</span>
              <button
                type="button"
                className="p-0.5 text-neutral-300 hover:text-red-600 flex-shrink-0"
                onClick={() => onDelete(poi)}
                title="Remove micro tag"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="flex gap-2 bg-neutral-50 rounded-lg p-3">
          <input
            type="text"
            className="input text-sm py-1.5 flex-1"
            placeholder="e.g. The rooftop cafe on the east side"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <button type="submit" className="btn-primary text-sm py-1.5 px-3 flex-shrink-0" disabled={saving}>
            {saving ? 'Adding...' : 'Add'}
          </button>
        </form>
      )}
    </div>
  );
};

export default StopMicroTags;
