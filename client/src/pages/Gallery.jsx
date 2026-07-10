import { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  ArrowLeft, Map as MapIcon, LayoutGrid, X, ChevronLeft, ChevronRight, Camera,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { getAllPhotos } from '../lib/api';

// Cluster bubble: photo count across the merged stops
const clusterIcon = (cluster) => {
  const count = cluster
    .getAllChildMarkers()
    .reduce((n, m) => n + (m.options.photoCount || 1), 0);
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        width: 48px; height: 48px; border-radius: 50%;
        background: #ef4444; border: 3px solid white;
        box-shadow: 0 3px 10px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700; font-size: 14px;
        font-family: system-ui, sans-serif;
      ">${count}</div>
    `,
    iconSize: [48, 48],
    iconAnchor: [24, 24],
  });
};

// Circular photo-thumbnail marker with a count badge
const photoMarkerIcon = (url, count) =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="position: relative; width: 52px; height: 52px;">
        <div style="
          width: 52px; height: 52px; border-radius: 50%;
          border: 3px solid white; box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          background-image: url('${url}'); background-size: cover; background-position: center;
        "></div>
        ${
          count > 1
            ? `<div style="
                position: absolute; top: -4px; right: -4px;
                background: #ef4444; color: white; border-radius: 999px;
                min-width: 20px; height: 20px; padding: 0 5px;
                display: flex; align-items: center; justify-content: center;
                font-size: 11px; font-weight: 700; font-family: system-ui, sans-serif;
                border: 2px solid white;
              ">${count}</div>`
            : ''
        }
      </div>
    `,
    iconSize: [52, 52],
    iconAnchor: [26, 26],
  });

const FitToMarkers = ({ groups }) => {
  const map = useMap();
  useEffect(() => {
    if (groups.length === 0) return;
    const bounds = L.latLngBounds(groups.map((g) => [g.latitude, g.longitude]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 12 });
  }, [groups, map]);
  return null;
};

const Gallery = () => {
  const { id: tripId } = useParams(); // present on /trip/:id/gallery
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('map'); // 'map' | 'grid'
  const [lightbox, setLightbox] = useState(null); // { list, index }
  const [tripFilter, setTripFilter] = useState('all');
  const [collapsed, setCollapsed] = useState(() => new Set());

  useEffect(() => {
    getAllPhotos(tripId)
      .then((res) => setPhotos(res.data.photos))
      .finally(() => setLoading(false));
  }, [tripId]);

  // Trips represented in the photo set (for the filter chips)
  const tripsInSet = useMemo(() => {
    const seen = new Map();
    for (const p of photos) {
      if (!seen.has(p.trip_id)) seen.set(p.trip_id, { id: p.trip_id, name: p.trip_name, count: 0 });
      seen.get(p.trip_id).count += 1;
    }
    return [...seen.values()];
  }, [photos]);

  const visiblePhotos = useMemo(
    () => (tripFilter === 'all' ? photos : photos.filter((p) => p.trip_id === tripFilter)),
    [photos, tripFilter]
  );

  // Grid sections: photos bucketed per trip, newest trip first
  const tripSections = useMemo(() => {
    const byTrip = new Map();
    for (const p of visiblePhotos) {
      if (!byTrip.has(p.trip_id)) byTrip.set(p.trip_id, { id: p.trip_id, name: p.trip_name, photos: [] });
      byTrip.get(p.trip_id).photos.push(p);
    }
    return [...byTrip.values()];
  }, [visiblePhotos]);

  const toggleSection = (id) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Group photos by stop for map markers (stops without coords: grid-only)
  const groups = useMemo(() => {
    const byItem = new Map();
    for (const photo of visiblePhotos) {
      if (photo.latitude == null || photo.longitude == null) continue;
      if (!byItem.has(photo.item_id)) {
        byItem.set(photo.item_id, {
          item_id: photo.item_id,
          item_name: photo.item_name,
          trip_name: photo.trip_name,
          latitude: parseFloat(photo.latitude),
          longitude: parseFloat(photo.longitude),
          photos: [],
        });
      }
      byItem.get(photo.item_id).photos.push(photo);
    }
    return [...byItem.values()];
  }, [visiblePhotos]);

  const openLightbox = useCallback((list, index) => setLightbox({ list, index }), []);
  const step = (delta) =>
    setLightbox((lb) => ({
      ...lb,
      index: (lb.index + delta + lb.list.length) % lb.list.length,
    }));

  // Keyboard: Esc closes, arrows navigate
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setLightbox(null);
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  const current = lightbox?.list[lightbox.index];

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="container-page !py-3">
          <div className="flex items-center justify-between gap-3">
            <Link
              to={tripId ? `/trip/${tripId}` : '/dashboard'}
              className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 min-w-0"
            >
              <ArrowLeft className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">
                {tripId ? 'Back to Trip' : 'Back to Dashboard'}
              </span>
              <span className="sm:hidden">Back</span>
            </Link>
            <h1 className="text-lg sm:text-xl font-display font-bold text-neutral-900 truncate">
              {tripId ? `${photos[0]?.trip_name || 'Trip'} Memories` : 'All Memories'}
              <span className="ml-2 text-sm font-normal text-neutral-500">
                {visiblePhotos.length} photo{visiblePhotos.length !== 1 ? 's' : ''}
              </span>
            </h1>
            <div className="flex items-center gap-1 bg-neutral-100 rounded-lg p-0.5 flex-shrink-0">
              <button
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                  view === 'map' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'
                }`}
                onClick={() => setView('map')}
              >
                <MapIcon className="w-4 h-4" />
                <span className="hidden sm:inline">Map</span>
              </button>
              <button
                className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                  view === 'grid' ? 'bg-white shadow-sm text-neutral-900' : 'text-neutral-500'
                }`}
                onClick={() => setView('grid')}
              >
                <LayoutGrid className="w-4 h-4" />
                <span className="hidden sm:inline">Photos</span>
              </button>
            </div>
          </div>
          {/* Trip filter chips (universal view with 2+ trips) */}
          {!tripId && tripsInSet.length > 1 && (
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1 scrollbar-thin">
              <button
                className={`badge flex-shrink-0 ${
                  tripFilter === 'all'
                    ? 'bg-primary-500 text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                }`}
                onClick={() => setTripFilter('all')}
              >
                All trips
              </button>
              {tripsInSet.map((t) => (
                <button
                  key={t.id}
                  className={`badge flex-shrink-0 ${
                    tripFilter === t.id
                      ? 'bg-primary-500 text-white'
                      : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
                  }`}
                  onClick={() => setTripFilter(tripFilter === t.id ? 'all' : t.id)}
                >
                  {t.name} · {t.count}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center text-neutral-500">
          Loading memories...
        </div>
      ) : photos.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center p-8">
            <Camera className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-neutral-900 mb-1">No photos yet</h3>
            <p className="text-neutral-600 text-sm">
              Add photos to your trip stops and they'll show up here
            </p>
          </div>
        </div>
      ) : view === 'map' ? (
        <div className="flex-1 relative">
          <MapContainer
            center={[20, 0]}
            zoom={2}
            scrollWheelZoom
            style={{ position: 'absolute', inset: 0 }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
            />
            <FitToMarkers groups={groups} />
            <MarkerClusterGroup
              iconCreateFunction={clusterIcon}
              maxClusterRadius={44}
              showCoverageOnHover={false}
            >
              {groups.map((group) => (
                <Marker
                  key={group.item_id}
                  position={[group.latitude, group.longitude]}
                  icon={photoMarkerIcon(group.photos[0].url, group.photos.length)}
                  photoCount={group.photos.length}
                  eventHandlers={{ click: () => openLightbox(group.photos, 0) }}
                />
              ))}
            </MarkerClusterGroup>
          </MapContainer>
          {(() => {
            const unpinned =
              visiblePhotos.length - groups.reduce((n, g) => n + g.photos.length, 0);
            return unpinned > 0 ? (
              <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur rounded-lg shadow px-3 py-2 text-xs text-neutral-600">
                {unpinned} photo{unpinned !== 1 ? 's' : ''} from stops without a pin —
                see the Photos view
              </div>
            ) : null;
          })()}
        </div>
      ) : (
        <div className="container-page space-y-6">
          {tripSections.map((section) => (
            <section key={section.id}>
              {/* Section header — collapsible; hidden redundantly on per-trip view */}
              {!tripId && (
                <button
                  className="w-full flex items-center justify-between mb-2 group"
                  onClick={() => toggleSection(section.id)}
                >
                  <h2 className="text-base sm:text-lg font-semibold text-neutral-900">
                    {section.name}
                    <span className="ml-2 text-sm font-normal text-neutral-500">
                      {section.photos.length} photo{section.photos.length !== 1 ? 's' : ''}
                    </span>
                  </h2>
                  {collapsed.has(section.id) ? (
                    <ChevronDown className="w-5 h-5 text-neutral-400 group-hover:text-neutral-700" />
                  ) : (
                    <ChevronUp className="w-5 h-5 text-neutral-400 group-hover:text-neutral-700" />
                  )}
                </button>
              )}
              {!collapsed.has(section.id) && (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                  {section.photos.map((photo, i) => (
                    <button
                      key={photo.id}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      onClick={() => openLightbox(section.photos, i)}
                    >
                      <img
                        src={photo.url}
                        alt={photo.caption || photo.item_name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-left opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="text-white text-xs font-medium truncate">
                          {photo.item_name}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && current && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex flex-col"
          onClick={() => setLightbox(null)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white/90">
            <p className="text-sm min-w-0 truncate">
              <span className="font-semibold">{current.item_name}</span>
              <span className="text-white/60"> · {current.trip_name}</span>
            </p>
            <button className="p-2 hover:bg-white/10 rounded-full flex-shrink-0" title="Close">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 flex items-center justify-center px-4 pb-4 min-h-0">
            {lightbox.list.length > 1 && (
              <button
                className="p-3 text-white/70 hover:text-white flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                title="Previous photo"
              >
                <ChevronLeft className="w-7 h-7" />
              </button>
            )}
            <img
              src={current.url}
              alt={current.caption || current.item_name}
              className="max-h-full max-w-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            {lightbox.list.length > 1 && (
              <button
                className="p-3 text-white/70 hover:text-white flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                title="Next photo"
              >
                <ChevronRight className="w-7 h-7" />
              </button>
            )}
          </div>
          <div className="px-4 pb-4 text-center text-white/80 text-sm">
            {current.caption && <p className="mb-1">{current.caption}</p>}
            {lightbox.list.length > 1 && (
              <p className="text-white/50 text-xs">
                {lightbox.index + 1} / {lightbox.list.length}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;
