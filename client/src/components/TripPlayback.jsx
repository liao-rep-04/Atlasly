import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  X, Pause, Play, SkipBack, SkipForward, Sparkles, RotateCcw, MapPin,
} from 'lucide-react';
import { transportEmoji } from '../lib/tripConstants';

const STOP_DWELL_MS = 6000; // how long we linger at each stop
const PHOTO_CYCLE_MS = 2500;
const TRAVEL_BASE_MS = 3000;

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

// Quadratic bezier arc between two points, bowed perpendicular to the leg —
// straight lines read as "drawn with a ruler"; arcs read as "a journey"
const arcPoints = (from, to, samples = 120) => {
  const [lat1, lng1] = from;
  const [lat2, lng2] = to;
  const mx = (lat1 + lat2) / 2;
  const my = (lng1 + lng2) / 2;
  const dx = lat2 - lat1;
  const dy = lng2 - lng1;
  const curve = 0.18;
  const cx = mx - dy * curve;
  const cy = my + dx * curve;
  const pts = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const a = (1 - t) * (1 - t);
    const b = 2 * (1 - t) * t;
    const c = t * t;
    pts.push([a * lat1 + b * cx + c * lat2, a * lng1 + b * cy + c * lng2]);
  }
  return pts;
};

const numberedIcon = (n, active) =>
  L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${active ? '#ef4444' : '#94a3b8'};
        width: ${active ? 30 : 24}px;
        height: ${active ? 30 : 24}px;
        border-radius: 50%;
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        color: white; font-weight: 700; font-size: ${active ? 13 : 11}px;
        font-family: system-ui, sans-serif;
        transition: all .3s;
      ">${n}</div>
    `,
    iconSize: [active ? 30 : 24, active ? 30 : 24],
    iconAnchor: [active ? 15 : 12, active ? 15 : 12],
  });

// Outfit colors cycle so travelers are distinguishable
const OUTFITS = ['#0ea5e9', '#ef4444', '#8b5cf6', '#10b981'];
const PANTS = '#334155';
const SKIN = '#e8b88a';

// Cartoon body SVG by avatar style; the selfie sits on top as the head
const bodySvg = (gender, outfit) => {
  if (gender === 'female') {
    // dress silhouette
    return `
      <svg width="34" height="36" viewBox="0 0 34 36" xmlns="http://www.w3.org/2000/svg">
        <path d="M17 0 C21 0 23 3 23 6 L28 24 L6 24 L11 6 C11 3 13 0 17 0 Z" fill="${outfit}"/>
        <rect x="3" y="4" width="7" height="4" rx="2" fill="${outfit}" transform="rotate(30 6 6)"/>
        <rect x="24" y="4" width="7" height="4" rx="2" fill="${outfit}" transform="rotate(-30 28 6)"/>
        <rect x="11" y="24" width="4.5" height="10" rx="2" fill="${SKIN}"/>
        <rect x="18.5" y="24" width="4.5" height="10" rx="2" fill="${SKIN}"/>
      </svg>`;
  }
  if (gender === 'male') {
    // shirt + pants
    return `
      <svg width="34" height="36" viewBox="0 0 34 36" xmlns="http://www.w3.org/2000/svg">
        <rect x="9" y="0" width="16" height="17" rx="5" fill="${outfit}"/>
        <rect x="2" y="3" width="8" height="4.5" rx="2.2" fill="${outfit}" transform="rotate(25 6 5)"/>
        <rect x="24" y="3" width="8" height="4.5" rx="2.2" fill="${outfit}" transform="rotate(-25 28 5)"/>
        <rect x="10" y="16" width="6.5" height="18" rx="2.5" fill="${PANTS}"/>
        <rect x="17.5" y="16" width="6.5" height="18" rx="2.5" fill="${PANTS}"/>
      </svg>`;
  }
  // neutral jumpsuit
  return `
    <svg width="34" height="36" viewBox="0 0 34 36" xmlns="http://www.w3.org/2000/svg">
      <path d="M17 0 C22 0 24 3 24 7 L24 20 L23 34 A2.5 2.5 0 0 1 18 34 L17.5 24 L16.5 24 L16 34 A2.5 2.5 0 0 1 11 34 L10 20 L10 7 C10 3 12 0 17 0 Z" fill="${outfit}"/>
      <rect x="3" y="4" width="7.5" height="4.5" rx="2.2" fill="${outfit}" transform="rotate(28 6 6)"/>
      <rect x="23.5" y="4" width="7.5" height="4.5" rx="2.2" fill="${outfit}" transform="rotate(-28 28 6)"/>
    </svg>`;
};

// One traveler: selfie head on a cartoon body
const travelerFigure = (member, index) => {
  const outfit = OUTFITS[index % OUTFITS.length];
  const head = member.selfie_url
    ? `<img src="${member.selfie_url}" style="
        width: 30px; height: 30px; border-radius: 50%;
        border: 2px solid white; object-fit: cover;
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        position: relative; z-index: 2;
      " />`
    : `<div style="
        width: 30px; height: 30px; border-radius: 50%;
        border: 2px solid white; background: ${outfit};
        color: white; font-weight: 700; font-size: 14px;
        display: flex; align-items: center; justify-content: center;
        font-family: system-ui, sans-serif; position: relative; z-index: 2;
      ">${(member.username || '?')[0].toUpperCase()}</div>`;

  return `
    <div style="display: flex; flex-direction: column; align-items: center; width: 36px;">
      ${head}
      <div style="margin-top: -5px;">${bodySvg(member.gender, outfit)}</div>
    </div>`;
};

// A row of travelers, slightly overlapping like a group photo
const partyRow = (travelers) => {
  const figures = travelers
    .slice(0, 3)
    .map((m, i) => `<div style="margin-left: ${i === 0 ? 0 : -14}px;">${travelerFigure(m, i)}</div>`)
    .join('');
  const extra = travelers.length > 3
    ? `<div style="
        background: white; border-radius: 999px; padding: 1px 6px;
        font-size: 11px; font-weight: 700; color: #334155;
        font-family: system-ui, sans-serif; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        margin-left: -6px; align-self: center;
      ">+${travelers.length - 3}</div>`
    : '';
  const width = Math.min(travelers.length, 3) * 26 + 10 + (extra ? 26 : 0);
  return { html: figures + extra, width };
};

// The traveling party: transport emoji leading, travelers trailing behind
const travelIcon = (emoji, travelers) => {
  const party = partyRow(travelers);
  const width = 34 + party.width;

  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="display: flex; align-items: flex-end;">
        <div style="font-size: 30px; filter: drop-shadow(0 3px 5px rgba(0,0,0,0.4)); margin-right: -6px;">
          ${emoji}
        </div>
        ${party.html}
      </div>
    `,
    iconSize: [width, 66],
    iconAnchor: [Math.round(width / 2), 40],
  });
};

// The party hanging out beside the active stop marker while we linger there
const stopPartyIcon = (travelers) => {
  const party = partyRow(travelers);
  return L.divIcon({
    className: 'custom-marker',
    html: `<div style="display: flex; align-items: flex-end;">${party.html}</div>`,
    iconSize: [party.width, 66],
    // Anchor bottom-left so the group stands just up-right of the pin,
    // leaving the numbered marker visible
    iconAnchor: [-8, 70],
  });
};

/**
 * Imperative animation driver living inside the map. Handles camera moves
 * for the current phase and, during travel, moves the party along the arc.
 */
const PlaybackEngine = ({ stops, travelers, index, phase, pausedRef, onTravelEnd }) => {
  const map = useMap();
  const rafRef = useRef(null);

  // Camera: settle on the current stop, with the party standing at the pin
  useEffect(() => {
    if (phase !== 'stop' && phase !== 'done') return;
    const stop = stops[Math.min(index, stops.length - 1)];
    map.flyTo([stop.latitude, stop.longitude], 13, { duration: 1.8 });

    const party = L.marker([stop.latitude, stop.longitude], {
      icon: stopPartyIcon(travelers),
      zIndexOffset: 900,
      interactive: false,
    }).addTo(map);
    return () => party.remove();
  }, [phase, index, map, stops, travelers]);

  // Travel: frame both stops, then run the party along the arc
  useEffect(() => {
    if (phase !== 'travel') return;
    const from = stops[index];
    const to = stops[index + 1];
    if (!to) return;

    const a = [from.latitude, from.longitude];
    const b = [to.latitude, to.longitude];
    map.flyToBounds(L.latLngBounds([a, b]), { padding: [90, 90], duration: 1.2 });

    const path = arcPoints(a, b);
    const emoji = transportEmoji(to.transport_mode);

    const marker = L.marker(a, {
      icon: travelIcon(emoji, travelers),
      zIndexOffset: 1000,
    }).addTo(map);
    const trail = L.polyline([a], {
      color: '#ef4444', weight: 3, opacity: 0.9,
    }).addTo(map);

    // Longer legs travel a bit longer, capped so oceans don't take forever
    const distance = map.distance(a, b);
    const duration = TRAVEL_BASE_MS + Math.min(2500, distance / 2000);

    let elapsed = 0;
    let last = null;
    let done = false;

    const step = (now) => {
      if (last !== null && !pausedRef.current) elapsed += now - last;
      last = now;
      // Hold until the camera framing move has had a moment
      const t = Math.max(0, Math.min(1, (elapsed - 1200) / duration));
      const eased = easeInOut(t);
      const idx = Math.round(eased * (path.length - 1));
      marker.setLatLng(path[idx]);
      trail.setLatLngs(path.slice(0, idx + 1));
      if (t >= 1) {
        if (!done) {
          done = true;
          onTravelEnd();
        }
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(rafRef.current);
      marker.remove();
      trail.remove();
    };
  }, [phase, index, map, stops, travelers, pausedRef, onTravelEnd]);

  return null;
};

/**
 * Full-screen animated replay: a side panel narrates each stop (photos,
 * fun facts) while the map stays unobstructed; between stops the whole
 * traveling party (selfie heads on cartoon bodies) rides to the next pin.
 */
const TripPlayback = ({ trip, stops, travelers = [], onClose }) => {
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState('stop'); // 'stop' | 'travel' | 'done'
  const [paused, setPaused] = useState(false);
  const [photoIdx, setPhotoIdx] = useState(0);
  const pausedRef = useRef(false);
  pausedRef.current = paused;

  const stop = stops[Math.min(index, stops.length - 1)];
  const nextStop = stops[index + 1];
  const photos = stop?.photos || [];

  const fullRoute = useMemo(
    () =>
      stops
        .slice(0, -1)
        .flatMap((s, i) =>
          arcPoints(
            [s.latitude, s.longitude],
            [stops[i + 1].latitude, stops[i + 1].longitude],
            40
          )
        ),
    [stops]
  );

  // Escape closes; lock body scroll while open
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  // Dwell at a stop, then move on (or finish)
  useEffect(() => {
    if (phase !== 'stop' || paused) return;
    const timer = setTimeout(() => {
      if (index >= stops.length - 1) {
        setPhase('done');
      } else {
        setPhase('travel');
      }
    }, STOP_DWELL_MS);
    return () => clearTimeout(timer);
  }, [phase, paused, index, stops.length]);

  // Cycle photos while lingering
  useEffect(() => {
    setPhotoIdx(0);
    if (photos.length < 2) return;
    const timer = setInterval(
      () => !pausedRef.current && setPhotoIdx((i) => (i + 1) % photos.length),
      PHOTO_CYCLE_MS
    );
    return () => clearInterval(timer);
  }, [index, photos.length]);

  // Must be referentially stable: it's a dependency of the travel-animation
  // effect, and an unstable identity restarts the flight on every re-render
  // (the photo carousel re-renders every few seconds mid-travel)
  const handleTravelEnd = useCallback(() => {
    setIndex((i) => i + 1);
    setPhase('stop');
  }, []);

  const goTo = (i) => {
    setIndex(Math.max(0, Math.min(stops.length - 1, i)));
    setPhase('stop');
  };

  const restart = () => {
    setIndex(0);
    setPhase('stop');
    setPaused(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-neutral-900 flex flex-col-reverse md:flex-row">
      {/* Narration side panel — keeps the map/markers unobstructed */}
      <div className="w-full md:w-96 h-[45%] md:h-full bg-white flex flex-col overflow-hidden shadow-2xl z-10">
        {/* Panel header */}
        <div className="px-5 py-4 border-b border-neutral-200 flex items-center justify-between flex-shrink-0">
          <div className="min-w-0">
            <h2 className="font-bold text-neutral-900 truncate">{trip.name}</h2>
            <p className="text-xs text-neutral-500">
              Stop {Math.min(index + 1, stops.length)} of {stops.length}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
              onClick={() => goTo(index - 1)}
              disabled={index === 0}
              title="Previous stop"
            >
              <SkipBack className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100"
              onClick={() => setPaused(!paused)}
              title={paused ? 'Resume' : 'Pause'}
            >
              {paused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
            </button>
            <button
              className="p-2 rounded-full text-neutral-500 hover:bg-neutral-100 disabled:opacity-30"
              onClick={() => goTo(index + 1)}
              disabled={index >= stops.length - 1}
              title="Next stop"
            >
              <SkipForward className="w-4 h-4" />
            </button>
            <button
              className="p-2 rounded-full text-neutral-500 hover:bg-red-50 hover:text-red-600 ml-1"
              onClick={onClose}
              title="Exit playback"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Panel body */}
        <div className="flex-1 overflow-y-auto">
          {phase === 'travel' && nextStop ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6">
              <div className="text-5xl mb-3 animate-bounce">
                {transportEmoji(nextStop.transport_mode)}
              </div>
              <p className="font-semibold text-neutral-900">
                Traveling to {nextStop.name}...
              </p>
              <p className="text-sm text-neutral-500 mt-1">Watch the map! 🗺️</p>
            </div>
          ) : (
            <>
              {photos.length > 0 && (
                <div className="relative h-56 bg-neutral-100 flex-shrink-0">
                  {photos.map((photo, i) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.caption || stop.name}
                      className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
                      style={{ opacity: i === photoIdx ? 1 : 0 }}
                    />
                  ))}
                  {photos[photoIdx]?.caption && (
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent px-4 pt-8 pb-2">
                      <p className="text-white text-sm">{photos[photoIdx].caption}</p>
                    </div>
                  )}
                  {photos.length > 1 && (
                    <div className="absolute top-3 right-3 flex gap-1">
                      {photos.map((_, i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${
                            i === photoIdx ? 'bg-white' : 'bg-white/40'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="p-5">
                <h3 className="text-lg font-bold text-neutral-900">{stop.name}</h3>
                {stop.location_name && (
                  <p className="text-xs text-neutral-500 mb-2 flex items-start gap-1">
                    <MapPin className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                    {stop.location_name}
                  </p>
                )}
                {stop.description && (
                  <p className="text-sm text-neutral-700 mb-3">{stop.description}</p>
                )}
                {stop.fun_facts && (
                  <p className="text-sm text-amber-800 bg-amber-50 rounded-lg px-3 py-2 flex items-start gap-1.5">
                    <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    <span>{stop.fun_facts}</span>
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* Progress dots */}
        <div className="px-5 py-3 border-t border-neutral-200 flex items-center justify-center gap-1.5 flex-shrink-0">
          {stops.map((s, i) => (
            <button
              key={s.id}
              className={`rounded-full transition-all ${
                i === index ? 'w-6 h-2 bg-primary-500' : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
              }`}
              onClick={() => goTo(i)}
              title={s.name}
            />
          ))}
        </div>
      </div>

      {/* Map — unobstructed */}
      <div className="flex-1 relative">
        <MapContainer
          center={[stop.latitude, stop.longitude]}
          zoom={12}
          zoomControl={false}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png"
          />
          <Polyline
            positions={fullRoute}
            pathOptions={{ color: '#94a3b8', weight: 2, opacity: 0.6, dashArray: '6, 8' }}
          />
          {stops.map((s, i) => (
            <Marker
              key={s.id}
              position={[s.latitude, s.longitude]}
              icon={numberedIcon(i + 1, i === index)}
            />
          ))}
          <PlaybackEngine
            stops={stops}
            travelers={travelers}
            index={index}
            phase={phase}
            pausedRef={pausedRef}
            onTravelEnd={handleTravelEnd}
          />
        </MapContainer>
      </div>

      {/* Finale */}
      {phase === 'done' && (
        <div className="absolute inset-0 z-[1001] bg-black/50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm w-full">
            <div className="text-5xl mb-3">🎉</div>
            <h3 className="text-xl font-bold text-neutral-900 mb-1">
              That's the whole trip!
            </h3>
            <p className="text-sm text-neutral-600 mb-6">
              {stops.length} stop{stops.length !== 1 ? 's' : ''} on "{trip.name}"
              {travelers.length > 1 && ` with ${travelers.length} travelers`}
            </p>
            <div className="flex gap-2 justify-center">
              <button className="btn-primary" onClick={restart}>
                <RotateCcw className="w-4 h-4 mr-2" />
                Replay
              </button>
              <button className="btn-outline" onClick={onClose}>
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripPlayback;
