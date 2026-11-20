import { useEffect, useState } from 'react';
import { X, Calendar, MapPin, Trash2, Loader2 } from 'lucide-react';
import { getMeetlyEvent, deleteMeetlyEvent, rsvpMeetlyEvent, cancelMeetlyRsvp } from '../lib/api';

/**
 * Slide-over shown when an event marker is clicked: full description,
 * date/time if set, and who's RSVP'd — plus a join/leave button and, for
 * the event's own creator, a way to take it down.
 */
const EventPanel = ({ eventId, currentUser, onClose, onDeleted, onRsvpChange }) => {
  const [event, setEvent] = useState(null);
  const [rsvps, setRsvps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMeetlyEvent(eventId).then((res) => {
      if (cancelled) return;
      setEvent(res.data.event);
      setRsvps(res.data.rsvps);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [eventId]);

  const going = rsvps.some((r) => r.user_id === currentUser.id);
  const isCreator = event?.created_by === currentUser.id;

  const toggleRsvp = async () => {
    setBusy(true);
    try {
      if (going) {
        await cancelMeetlyRsvp(eventId);
        setRsvps((prev) => prev.filter((r) => r.user_id !== currentUser.id));
        onRsvpChange?.(eventId, false);
      } else {
        await rsvpMeetlyEvent(eventId);
        setRsvps((prev) => [
          ...prev,
          { user_id: currentUser.id, username: currentUser.username, selfie_url: currentUser.selfieUrl },
        ]);
        onRsvpChange?.(eventId, true);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Take this event down? This can\'t be undone.')) return;
    setBusy(true);
    try {
      await deleteMeetlyEvent(eventId);
      onDeleted?.(eventId);
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-[1100] overflow-y-auto">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-semibold pr-4">{event?.title || 'Loading...'}</h2>
          <button onClick={onClose} className="p-1 text-neutral-400 hover:text-neutral-700 flex-shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
          </div>
        ) : (
          <>
            {event.description && (
              <p className="text-sm text-neutral-700 mb-4">{event.description}</p>
            )}

            <div className="space-y-1.5 text-sm text-neutral-600 mb-5">
              {event.event_date && (
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {new Date(event.event_date).toLocaleDateString()}
                  {event.event_time && ` · ${String(event.event_time).slice(0, 5)}`}
                </div>
              )}
              {event.location_name && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {event.location_name}
                </div>
              )}
            </div>

            <button
              className={going ? 'btn-outline w-full mb-5' : 'btn-primary w-full mb-5'}
              onClick={toggleRsvp}
              disabled={busy}
            >
              {going ? "I'm not going anymore" : "I'm going!"}
            </button>

            <div>
              <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wide mb-2">
                Going ({rsvps.length})
              </p>
              {rsvps.length === 0 ? (
                <p className="text-sm text-neutral-400">No one yet — be the first!</p>
              ) : (
                <ul className="space-y-2">
                  {rsvps.map((r) => (
                    <li key={r.user_id} className="flex items-center gap-2">
                      {r.selfie_url ? (
                        <img
                          src={r.selfie_url}
                          alt={r.username}
                          className="w-7 h-7 rounded-full object-cover border border-neutral-200"
                        />
                      ) : (
                        <span className="w-7 h-7 rounded-full bg-neutral-300 flex items-center justify-center text-xs font-semibold text-white">
                          {(r.username || '?')[0].toUpperCase()}
                        </span>
                      )}
                      <span className="text-sm text-neutral-800">{r.username || 'You'}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {isCreator && (
              <button
                className="mt-6 flex items-center gap-1.5 text-sm text-red-600 hover:text-red-700"
                onClick={handleDelete}
                disabled={busy}
              >
                <Trash2 className="w-4 h-4" />
                Delete this event
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default EventPanel;
