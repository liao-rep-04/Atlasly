import { Calendar, MapPin, Users } from 'lucide-react';

const EventRow = ({ event, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(event.id)}
    className="w-full text-left bg-white/5 hover:bg-white/10 rounded-lg p-3 flex items-center justify-between gap-3 transition-colors"
  >
    <div className="min-w-0">
      <p className="font-semibold text-white truncate">{event.title}</p>
      <div className="flex items-center gap-3 text-xs text-white/60 mt-1">
        {event.event_date && (
          <span className="flex items-center gap-1 flex-shrink-0">
            <Calendar className="w-3 h-3" />
            {new Date(event.event_date).toLocaleDateString()}
          </span>
        )}
        {event.location_name && (
          <span className="flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{event.location_name}</span>
          </span>
        )}
      </div>
    </div>
    <span className="flex items-center gap-1 text-xs font-medium text-primary-300 flex-shrink-0">
      <Users className="w-3 h-3" />
      {event.rsvp_count}
    </span>
  </button>
);

/**
 * The "My Events" tab: events you're hosting, and events you've RSVP'd to.
 * Clicking a row opens the same EventPanel used from the map.
 */
const MyEventsList = ({ hosting = [], going = [], onSelect }) => (
  <div className="h-full overflow-y-auto bg-neutral-900 p-5 space-y-6">
    <section>
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2">
        Hosting ({hosting.length})
      </h3>
      {hosting.length === 0 ? (
        <p className="text-sm text-white/40">You haven't posted any events yet.</p>
      ) : (
        <div className="space-y-2">
          {hosting.map((e) => (
            <EventRow key={e.id} event={e} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>

    <section>
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wide mb-2">
        Going ({going.length})
      </h3>
      {going.length === 0 ? (
        <p className="text-sm text-white/40">You haven't RSVP'd to anything yet.</p>
      ) : (
        <div className="space-y-2">
          {going.map((e) => (
            <EventRow key={e.id} event={e} onSelect={onSelect} />
          ))}
        </div>
      )}
    </section>
  </div>
);

export default MyEventsList;
