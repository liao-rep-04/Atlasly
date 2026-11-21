import { useEffect, useState } from 'react';
import { Plus, LocateFixed, Loader2, Map as MapIcon, CalendarCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getMeetlyEvents, createMeetlyEvent } from '../lib/api';
import EventsMap from '../components/EventsMap';
import EventForm from '../components/EventForm';
import EventPanel from '../components/EventPanel';
import SuiteNav from '../components/SuiteNav';
import MyEventsList from '../components/MyEventsList';

// Same fallback center TripMap.jsx uses when there's nothing better to go on
const DEFAULT_CENTER = [48.8566, 2.3522];

/**
 * Meetly: a real-world events/meetups board. Styled as a sister product
 * rather than another page of Atlasly — same suite lockup, reversed
 * (dark/light) color scheme, its own badge.
 */
const Meetly = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'mine'
  const [events, setEvents] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [flyTo, setFlyTo] = useState(null);
  const [locating, setLocating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [pendingPin, setPendingPin] = useState(null);
  const [selectedEventId, setSelectedEventId] = useState(null);

  // Map mounts immediately at a world-ish default; once location access is
  // granted, we zoom in to the user just once rather than blocking on it.
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ ...loc, zoom: 14 });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  }, []);

  useEffect(() => {
    getMeetlyEvents().then((res) => setEvents(res.data.events));
  }, []);

  const handleRecenter = () => {
    if (userLocation) {
      setFlyTo({ ...userLocation, zoom: 14 });
      return;
    }
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
        setFlyTo({ ...loc, zoom: 14 });
        setLocating(false);
      },
      () => setLocating(false),
      { timeout: 8000 }
    );
  };

  const handleMapClick = (latlng) => {
    setPendingPin(latlng);
    setShowForm(true);
  };

  const openForm = () => {
    setActiveTab('browse'); // posting needs the map visible for drop-a-pin
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

  const hostingEvents = events.filter((e) => e.created_by === user.id);
  const goingEvents = events.filter((e) => e.going);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-900 via-neutral-900 to-primary-900">
      {/* Sister-product header: shared suite lockup, reversed (dark) scheme */}
      <header className="flex items-center px-4 sm:px-6 py-4">
        <SuiteNav theme="dark" active="meetly" />
      </header>

      {/* Tabs */}
      <div className="px-4 sm:px-6 pb-3 flex items-center gap-2">
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'browse'
              ? 'bg-white text-primary-600'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('browse')}
        >
          <MapIcon className="w-4 h-4" />
          Browse
        </button>
        <button
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
            activeTab === 'mine'
              ? 'bg-white text-primary-600'
              : 'text-white/70 hover:text-white hover:bg-white/10'
          }`}
          onClick={() => setActiveTab('mine')}
        >
          <CalendarCheck className="w-4 h-4" />
          My Events
        </button>
      </div>

      {/* Contained content area — not full-screen */}
      <main className="px-4 sm:px-6 pb-4 sm:pb-6">
        <div
          className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
          style={{ height: 'calc(100vh - 140px)' }}
        >
          {activeTab === 'browse' ? (
            <>
              <EventsMap
                events={events}
                center={DEFAULT_CENTER}
                zoom={3}
                flyTo={flyTo}
                onMarkerClick={(event) => setSelectedEventId(event.id)}
                onMapClick={handleMapClick}
                draftPin={pendingPin}
              />

              <button
                className="absolute bottom-6 left-6 z-[1000] bg-white text-primary-600 rounded-full p-3.5 shadow-xl hover:bg-neutral-50 transition-colors disabled:opacity-60"
                onClick={handleRecenter}
                disabled={locating}
                title="Back to my location"
              >
                {locating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <LocateFixed className="w-5 h-5" />
                )}
              </button>
            </>
          ) : (
            <MyEventsList
              hosting={hostingEvents}
              going={goingEvents}
              onSelect={(id) => setSelectedEventId(id)}
            />
          )}

          {!showForm && (
            <button
              className="absolute bottom-6 right-6 z-[1000] bg-white text-primary-600 font-semibold rounded-full px-5 py-3.5 shadow-xl hover:bg-neutral-50 transition-colors flex items-center gap-2"
              onClick={openForm}
            >
              <Plus className="w-4 h-4" />
              Post Event
            </button>
          )}

          {showForm && (
            <div className="absolute left-4 right-4 bottom-4 sm:left-auto sm:bottom-auto sm:top-4 sm:right-4 sm:w-96 max-h-[80%] overflow-y-auto z-[1000]">
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
      </main>
    </div>
  );
};

export default Meetly;
