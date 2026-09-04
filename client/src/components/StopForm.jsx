import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, MapPin, Sparkles, Loader2 } from 'lucide-react';
import PlaceSearch from './PlaceSearch';
import { getPlaceFunFact } from '../lib/api';
import { STOP_TYPES, TRANSPORT_MODES, DYNAMIC_EVENT_ICONS } from '../lib/tripConstants';

const toFormState = (item) => ({
  type: item?.type || 'experience',
  name: item?.name || '',
  description: item?.description || '',
  location_name: item?.location_name || '',
  latitude: item?.latitude ?? '',
  longitude: item?.longitude ?? '',
  cost: item?.cost ?? '',
  date: item?.date ? String(item.date).slice(0, 10) : '',
  time: item?.time ? String(item.time).slice(0, 5) : '',
  notes: item?.notes || '',
  fun_facts: item?.fun_facts || '',
  transport_mode: item?.transport_mode || '',
  icon: item?.icon || DYNAMIC_EVENT_ICONS[0],
  custom_label: item?.custom_label || '',
  group_id: item?.group_id || '',
});

/**
 * Add/edit form for a trip stop.
 * Fast path: search a place (fills name + coords) and hit save.
 * Power path: expand "More details" for type, fun facts, transport, cost, etc.
 * `pendingPin` ({lat, lng}) flows in when the user clicks the map.
 * `groups` (trip sub-groups) lets the stop be assigned to one, if any exist.
 */
const StopForm = ({ item, pendingPin, isFirstStop, groups = [], onSubmit, onCancel }) => {
  const [form, setForm] = useState(() => toFormState(item));
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [factState, setFactState] = useState(null); // 'loading' | 'added' | 'empty' | null
  const factRequestId = useRef(0);
  const selectedPlace = useRef(null); // last search pick — carries the article hint

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
    selectedPlace.current = place;
    setFactState(null);
    setForm((f) => ({
      ...f,
      name: f.name || place.name,
      location_name: place.display_name,
      latitude: place.latitude,
      longitude: place.longitude,
    }));
  };

  // "Wow me": dig up something delightful about this spot and fill the field
  const handleWowMe = () => {
    const requestId = ++factRequestId.current;
    setFactState('loading');
    setShowDetails(true);
    const place = selectedPlace.current;
    getPlaceFunFact({
      wikipedia: place?.wikipedia || undefined,
      name: form.name || place?.name || undefined,
      lat: form.latitude,
      lon: form.longitude,
    })
      .then((res) => {
        if (requestId !== factRequestId.current) return; // a newer click won
        const fact = res.data.fact;
        if (fact) {
          setForm((f) => ({ ...f, fun_facts: fact.fun_fact }));
          setFactState('added');
        } else {
          setFactState('empty');
        }
      })
      .catch(() => {
        if (requestId === factRequestId.current) setFactState('empty');
      });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        latitude: form.latitude === '' ? null : parseFloat(form.latitude),
        longitude: form.longitude === '' ? null : parseFloat(form.longitude),
        cost: form.cost === '' ? null : parseFloat(form.cost),
        date: form.date || null,
        time: form.time || null,
        transport_mode: form.transport_mode || null,
        // Dynamic-event fields only apply (and only get saved) for that type
        icon: form.type === 'dynamic' ? form.icon : null,
        custom_label: form.type === 'dynamic' ? form.custom_label.trim() || null : null,
        group_id: form.group_id || null,
      });
    } finally {
      setSaving(false);
    }
  };

  const hasCoords = form.latitude !== '' && form.longitude !== '';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Find a place
        </label>
        <PlaceSearch
          onSelect={handlePlaceSelect}
          placeholder="e.g., Eiffel Tower, Kyoto Station..."
        />
        <div className="flex items-center justify-between gap-2 mt-1">
          <p className="text-xs text-neutral-500 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {hasCoords
              ? `Pinned at ${parseFloat(form.latitude).toFixed(4)}, ${parseFloat(form.longitude).toFixed(4)}`
              : 'or click anywhere on the map to drop a pin'}
          </p>
          {hasCoords && (
            <button
              type="button"
              className="text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full px-3 py-1 flex items-center gap-1.5 transition-colors disabled:opacity-60"
              onClick={handleWowMe}
              disabled={factState === 'loading'}
              title="Dig up something delightful about this spot"
            >
              {factState === 'loading' ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Scouting the area...
                </>
              ) : (
                <>
                  <Sparkles className="w-3 h-3" />
                  Wow me
                </>
              )}
            </button>
          )}
        </div>
        {factState === 'added' && (
          <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Found something good — review or edit it below
          </p>
        )}
        {factState === 'empty' && (
          <p className="text-xs text-neutral-500 mt-1">
            This spot is keeping its secrets — try adding your own!
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">
          Stop Name *
        </label>
        <input
          type="text"
          className="input"
          placeholder="What do you call this stop?"
          value={form.name}
          onChange={set('name')}
          required
        />
      </div>

      <button
        type="button"
        className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
        onClick={() => setShowDetails(!showDetails)}
      >
        {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        {showDetails ? 'Hide details' : 'More details (agenda, fun facts, travel...)'}
      </button>

      {showDetails && (
        <div className="space-y-4 pt-1">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Type
              </label>
              <select className="input" value={form.type} onChange={set('type')}>
                {STOP_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.emoji} {t.label}
                  </option>
                ))}
              </select>
            </div>
            {!isFirstStop && (
              <div>
                <label className="block text-sm font-medium text-neutral-700 mb-1">
                  Getting here from the last stop
                </label>
                <select
                  className="input"
                  value={form.transport_mode}
                  onChange={set('transport_mode')}
                >
                  <option value="">Not specified</option>
                  {TRANSPORT_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.emoji} {m.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                  onChange={set('custom_label')}
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

          {groups.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Part of a group's own itinerary?
              </label>
              <select className="input" value={form.group_id} onChange={set('group_id')}>
                <option value="">Shared trip (everyone)</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              What's the plan here?
            </label>
            <textarea
              className="input"
              rows="2"
              placeholder="Agenda, things to see, reservations..."
              value={form.description}
              onChange={set('description')}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Fun Facts
            </label>
            <textarea
              className="input"
              rows="2"
              placeholder="Cool trivia to share during the trip replay ✨"
              value={form.fun_facts}
              onChange={set('fun_facts')}
            />
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.cost}
                onChange={set('cost')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Date
              </label>
              <input type="date" className="input" value={form.date} onChange={set('date')} />
            </div>
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                Time
              </label>
              <input type="time" className="input" value={form.time} onChange={set('time')} />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-1">
              Private Notes
            </label>
            <textarea
              className="input"
              rows="2"
              placeholder="Anything else to remember"
              value={form.notes}
              onChange={set('notes')}
            />
          </div>
        </div>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving...' : item ? 'Save Changes' : 'Add Stop'}
        </button>
        <button type="button" className="btn-outline" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  );
};

export default StopForm;
