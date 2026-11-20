import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMeetlyEvents, createMeetlyEvent } from '../lib/api';
import EventsMap from '../components/EventsMap';
import EventForm from '../components/EventForm';
import EventPanel from '../components/EventPanel';

// Same fallback center TripMap.jsx uses when there's nothing better to go on
const DEFAULT_CENTER = [48.8566, 2.3522];

/**
 * Meetly: a real-world events/meetups board, deliberately unlinked from the
 * rest of the app — reachable only at /meetly for someone who knows the URL.
 */
const Meetly = () => {
  const { user } = useAuth();
  const [mapCenter, setMapCenter] = useState(null);
  const [events, setEvents] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setMapCenter(DEFAULT_CENTER);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setMapCenter([pos.coords.latitude, pos.coords.longitude]),
      () => setMapCenter(DEFAULT_CENTER),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    getMeetlyEvents().then((res) => setEvents(res.data.events));
  }, []);

  const handleMapClick = (latlng) => {
    setPendingPin(latlng);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setPendingPin(null);
  };

  const handleCreate = async (data) => {
    const res = await createMeetlyEvent(data);
    setEvents((prev) => [...prev, res.data.event]);
    closeForm();
  };

  const handleDeleted = (eventId) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const handleRsvpChange = (eventId, going) => {
    setEvents((prev) =>
      prev.map((e) =>
        e.id === eventId
          ? { ...e, rsvp_count: Number(e.rsvp_count) + (going ? 1 : -1), going }
          : e
      )
    );
  };

  if (!mapCenter) {
    return (
      <div className="h-screen flex items-center justify-center bg-neutral-50">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <EventsMap
        events={events}
        center={mapCenter}
        onMarkerClick={(event) => setSelectedEventId(event.id)}
        onMapClick={handleMapClick}
        draftPin={pendingPin}
      />

      <Link
        to="/dashboard"
        className="absolute top-4 left-4 z-[1000] bg-white shadow-lg rounded-full p-2.5 text-neutral-600 hover:text-neutral-900"
        title="Back to Atlasly"
      >
        <ArrowLeft className="w-5 h-5" />
      </Link>

      {!showForm && (
        <button
          className="btn-primary absolute bottom-6 right-6 z-[1000] shadow-xl"
          onClick={() => setShowForm(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Post Event
        </button>
      )}

      {showForm && (
        <div className="absolute left-4 right-4 bottom-4 sm:left-auto sm:bottom-auto sm:top-4 sm:right-4 sm:w-96 max-h-[80vh] overflow-y-auto z-[1000]">
          <EventForm pendingPin={pendingPin} onSubmit={handleCreate} onCancel={closeForm} />
        </div>
      )}

      {selectedEventId && (
        <EventPanel
          eventId={selectedEventId}
          currentUser={user}
          onClose={() => setSelectedEventId(null)}
          onDeleted={handleDeleted}
          onRsvpChange={handleRsvpChange}
        />
      )}
    </div>
  );
};

export default Meetly;
