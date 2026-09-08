import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { stopLabel } from '../lib/tripConstants';

// Fix for default marker icons in React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Component to auto-fit map bounds to markers
const MapBounds = ({ locations }) => {
  const map = useMap();

  useEffect(() => {
    if (locations && locations.length > 0) {
      const validLocations = locations.filter(
        (loc) => loc.latitude && loc.longitude
      );

      if (validLocations.length > 0) {
        const bounds = L.latLngBounds(
          validLocations.map((loc) => [loc.latitude, loc.longitude])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [locations, map]);

  return null;
};

// Forwards map clicks to the parent (used for drop-a-pin adding)
const MapClickHandler = ({ onMapClick }) => {
  useMapEvents({
    click: (e) => onMapClick && onMapClick(e.latlng),
  });
  return null;
};

const TYPE_COLORS = {
  experience: '#ef4444', // primary red
  dining: '#0ea5e9', // secondary blue
  hotel: '#8b5cf6', // purple
  transportation: '#10b981', // green
  dynamic: '#f59e0b', // amber, when not part of a colored group
};

// Custom marker icon for a trip item. A group assignment's color wins over
// the type color, since it marks the stop as part of a breakout itinerary.
// Dynamic-event stops show their chosen emoji instead of the plain dot.
const createCustomIcon = (item, groupsById) => {
  const group = item.group_id ? groupsById?.[item.group_id] : null;
  const color = group?.color || TYPE_COLORS[item.type?.toLowerCase()] || TYPE_COLORS.experience;
  const emoji = item.type === 'dynamic' && item.icon ? item.icon : null;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.3);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        ${
          emoji
            ? `<span style="transform: rotate(45deg); font-size: 14px; line-height: 1;">${emoji}</span>`
            : `<div style="
                width: 12px;
                height: 12px;
                background: white;
                border-radius: 50%;
              "></div>`
        }
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
  });
};

// A pulsing marker for the in-progress "drop a pin" position
const draftPinIcon = L.divIcon({
  className: 'custom-marker',
  html: `
    <div style="
      background: #f59e0b;
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

const TripMap = ({ tripItems = [], onItemClick, onMapClick, draftPin, groups = [] }) => {
  const groupsById = Object.fromEntries(groups.map((g) => [g.id, g]));

  // Filter items that have valid coordinates (pg returns decimals as strings)
  const locationsWithCoords = tripItems
    .filter((item) => item.latitude != null && item.longitude != null)
    .map((item) => ({
      ...item,
      latitude: parseFloat(item.latitude),
      longitude: parseFloat(item.longitude),
    }));

  // Ordered stops, for the route line and group-colored sub-segments
  const orderedStops = [...locationsWithCoords].sort(
    (a, b) => (a.order_index || 0) - (b.order_index || 0)
  );

  // One polyline per consecutive pair; segments where both stops share a
  // group are colored and solid, everything else stays the default dashed
  // red "shared trip" route
  const routeSegments = orderedStops.slice(0, -1).map((stop, i) => {
    const next = orderedStops[i + 1];
    const sameGroup = stop.group_id && stop.group_id === next.group_id;
    const group = sameGroup ? groupsById[stop.group_id] : null;
    return {
      key: `${stop.id}-${next.id}`,
      positions: [[stop.latitude, stop.longitude], [next.latitude, next.longitude]],
      color: group?.color || '#ef4444',
      dashed: !group,
    };
  });

  // Calculate total cost
  const totalCost = tripItems.reduce((sum, item) => {
    return sum + (parseFloat(item.cost) || 0);
  }, 0);

  // Default center if no items
  const defaultCenter = [48.8566, 2.3522]; // Paris
  const center =
    locationsWithCoords.length > 0
      ? [locationsWithCoords[0].latitude, locationsWithCoords[0].longitude]
      : defaultCenter;

  // Without a click handler there's nothing to do on an empty map
  if (locationsWithCoords.length === 0 && !onMapClick) {
    return (
      <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-neutral-200 flex items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="text-center p-8">
          <div className="text-6xl mb-4">🗺️</div>
          <h3 className="text-xl font-semibold text-neutral-900 mb-2">
            No locations yet
          </h3>
          <p className="text-neutral-600">
            Add trip items with locations to see them on the map
          </p>
        </div>
      </div>
    );
  }

  // Only show group swatches for groups that actually have stops on the map
  const groupsInUse = groups.filter((g) =>
    locationsWithCoords.some((item) => item.group_id === g.id)
  );

  return (
    <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-neutral-200 relative">
      <MapContainer
        center={center}
        zoom={locationsWithCoords.length > 0 ? 13 : 2}
        scrollWheelZoom={true}
        style={{ height: '100%', width: '100%' }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto-fit bounds to show all markers */}
        <MapBounds locations={locationsWithCoords} />

        {/* Drop-a-pin support */}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        {draftPin && (
          <Marker position={[draftPin.lat, draftPin.lng]} icon={draftPinIcon} />
        )}

        {/* Route line — group legs solid in their color, shared legs dashed red */}
        {routeSegments.map((segment) => (
          <Polyline
            key={segment.key}
            positions={segment.positions}
            pathOptions={{
              color: segment.color,
              weight: segment.dashed ? 3 : 4,
              opacity: segment.dashed ? 0.7 : 0.85,
              dashArray: segment.dashed ? '10, 10' : null,
            }}
          />
        ))}

        {/* Location markers */}
        {locationsWithCoords.map((item, index) => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={createCustomIcon(item, groupsById)}
            eventHandlers={{
              click: () => onItemClick && onItemClick(item),
            }}
          >
            <Popup>
              <div className="min-w-[200px]">
                <div className="mb-2">
                  <p className="font-semibold text-neutral-900 text-sm">
                    {index + 1}. {item.name}
                  </p>
                  <p className="text-xs text-neutral-600 mt-1">
                    {stopLabel(item)}
                    {item.group_id && groupsById[item.group_id] && (
                      <span
                        className="ml-1.5 font-medium"
                        style={{ color: groupsById[item.group_id].color }}
                      >
                        · {groupsById[item.group_id].name}
                      </span>
                    )}
                  </p>
                </div>
                {item.location_name && (
                  <p className="text-xs text-neutral-500 mb-2">
                    📍 {item.location_name}
                  </p>
                )}
                {item.description && (
                  <p className="text-xs text-neutral-600 mb-2 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-neutral-200">
                  {item.date && (
                    <span className="text-xs text-neutral-600">
                      📅 {new Date(item.date).toLocaleDateString()}
                    </span>
                  )}
                  {item.cost && (
                    <span className="text-xs font-semibold text-primary-600">
                      💰 ${parseFloat(item.cost).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      {locationsWithCoords.length > 0 && (
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 z-[1000] max-w-[220px]">
          <p className="text-xs font-semibold text-neutral-900 mb-2">
            📍 {locationsWithCoords.length} Location
            {locationsWithCoords.length !== 1 ? 's' : ''}
          </p>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-primary-500"></div>
              <span className="text-xs text-neutral-600">Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-secondary-500"></div>
              <span className="text-xs text-neutral-600">Dining</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <span className="text-xs text-neutral-600">Hotel</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-xs text-neutral-600">Transportation</span>
            </div>
            {routeSegments.some((s) => s.dashed) && (
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-0.5 bg-primary-500"
                  style={{ width: '12px' }}
                ></div>
                <span className="text-xs text-neutral-600">Shared route</span>
              </div>
            )}
            {groupsInUse.map((g) => (
              <div key={g.id} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: g.color }}
                ></div>
                <span className="text-xs text-neutral-600">{g.name}</span>
              </div>
            ))}
          </div>
          {totalCost > 0 && (
            <div className="mt-2 pt-2 border-t border-neutral-200">
              <p className="text-xs text-neutral-500">
                💰 Total:{' '}
                <span className="font-semibold text-neutral-900">
                  ${totalCost.toFixed(2)}
                </span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TripMap;
