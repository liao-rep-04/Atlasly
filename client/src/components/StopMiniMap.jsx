import { MapContainer, TileLayer, Marker, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// A small dot for the stop's own position — distinct from the full teardrop
// pins on the main trip map, since this is a zoomed-in, stop-scoped view.
const stopDotIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:14px;height:14px;border-radius:50%;background:#1d4ed8;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const poiIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:10px;height:10px;border-radius:50%;background:#f59e0b;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>`,
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

const photoDotIcon = L.divIcon({
  className: 'custom-marker',
  html: `<div style="width:8px;height:8px;border-radius:50%;background:#10b981;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.35);"></div>`,
  iconSize: [8, 8],
  iconAnchor: [4, 4],
});

/**
 * A small, stop-scoped map: the stop's own position, plus any micro tags
 * (named sub-locations) and geotagged-but-untagged photos as offset points.
 * Deliberately not the main trip map — this is "the map for this stop,"
 * only visible once you've opened the stop's own card.
 */
const StopMiniMap = ({ item, pois = [], untaggedPhotos = [] }) => {
  if (!item?.latitude || !item?.longitude) return null;
  if (pois.length === 0 && untaggedPhotos.length === 0) return null;

  const center = [parseFloat(item.latitude), parseFloat(item.longitude)];

  return (
    <div className="mt-3 rounded-lg overflow-hidden border border-neutral-200" style={{ height: 160 }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <Marker position={center} icon={stopDotIcon}>
          <Tooltip>{item.name}</Tooltip>
        </Marker>
        {pois.map((poi) =>
          poi.latitude && poi.longitude ? (
            <Marker key={poi.id} position={[parseFloat(poi.latitude), parseFloat(poi.longitude)]} icon={poiIcon}>
              <Tooltip>📍 {poi.name}</Tooltip>
            </Marker>
          ) : null
        )}
        {untaggedPhotos.map((photo) => (
          <Marker key={photo.id} position={[parseFloat(photo.latitude), parseFloat(photo.longitude)]} icon={photoDotIcon}>
            <Tooltip>
              <img src={photo.url} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} />
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default StopMiniMap;
