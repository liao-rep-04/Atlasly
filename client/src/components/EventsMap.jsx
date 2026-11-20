import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Forwards map clicks to the parent (used while posting a new event)
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
  });
  return null;
};

// Imperatively flies to a new location when `target` changes — used for the
// one-time zoom-to-you once geolocation is granted, and the recenter button
const FlyToController = ({ target }) => {
  const map = useMap();
  useEffect(() => {
    if (target) {
      map.flyTo([target.lat, target.lng], target.zoom ?? 14, { duration: 1.2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);
  return null;
};

const eventIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #8b5cf6;
      width: 28px;
      height: 28px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px solid white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
      display: flex;
      align-items: center;
      justify-content: center;
    ">
      <div style="width: 8px; height: 8px; background: white; border-radius: 50%; transform: rotate(45deg);"></div>
    </div>
  `,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const draftPinIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #8b5cf6;
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 3px dashed white;
      box-shadow: 0 3px 10px rgba(0,0,0,0.3);
    "></div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

/**
 * The Meetly browse map: pan/zoom freely to find events near you, click a
 * marker to open its RSVP panel. While posting mode is on, clicking
 * anywhere on the map drops a draft pin for the new event's location.
 */
const EventsMap = ({ events = [], center, zoom = 13, flyTo, onMarkerClick, onMapClick, draftPin }) => {
  const eventsWithCoords = events
    .filter((e) => e.latitude != null && e.longitude != null)
    .map((e) => ({ ...e, latitude: parseFloat(e.latitude), longitude: parseFloat(e.longitude) }));

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        scrollWheelZoom
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FlyToController target={flyTo} />
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {draftPin && <Marker position={[draftPin.lat, draftPin.lng]} icon={draftPinIcon} />}

        <MarkerClusterGroup chunkedLoading>
          {eventsWithCoords.map((event) => (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={eventIcon}
              eventHandlers={{ click: () => onMarkerClick && onMarkerClick(event) }}
            >
              <Popup>
                <div className="min-w-[160px]">
                  <p className="font-semibold text-neutral-900 text-sm">{event.title}</p>
                  {event.event_date && (
                    <p className="text-xs text-neutral-600 mt-1">
                      📅 {new Date(event.event_date).toLocaleDateString()}
                      {event.event_time && ` · ${String(event.event_time).slice(0, 5)}`}
                    </p>
                  )}
                  <p className="text-xs text-primary-600 font-medium mt-1">
                    {event.rsvp_count} going
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MarkerClusterGroup>
      </MapContainer>
    </div>
  );
};

export default EventsMap;
