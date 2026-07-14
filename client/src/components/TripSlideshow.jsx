import { useState, useEffect, useRef, useCallback } from 'react';
import {
  X, Pause, Play, ChevronLeft, ChevronRight, Volume2, VolumeX,
} from 'lucide-react';

const SLIDE_MS = 4000;

/**
 * Full-screen photo slideshow — every photo in the trip in stop order,
 * no map. Auto-advances; arrows/keys navigate; same ambience track.
 */
const TripSlideshow = ({ trip, photos, onClose }) => {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef(null);

  const step = useCallback(
    (delta) => setIndex((i) => (i + delta + photos.length) % photos.length),
    [photos.length]
  );

  // Ambience (same rules as playback: user gesture opened us)
  useEffect(() => {
    const audio = new Audio('/audio/adventure-ambience.mp3');
    audio.loop = true;
    audio.volume = 0.35;
    audioRef.current = audio;
    let disposed = false;
    audio.play().catch(() => {
      if (!disposed) setMuted(true);
    });
    return () => {
      disposed = true;
      audio.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.muted = muted;
    if (!muted && audio.paused) audio.play().catch(() => {});
  }, [muted]);

  // Auto-advance
  useEffect(() => {
    if (paused || photos.length < 2) return;
    const timer = setInterval(() => step(1), SLIDE_MS);
    return () => clearInterval(timer);
  }, [paused, step, photos.length]);

  // Keys: Esc close, arrows navigate, space pauses
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === ' ') {
        e.preventDefault();
        setPaused((p) => !p);
      }
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose, step]);

  const current = photos[index];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 text-white/90 bg-gradient-to-b from-black/60 to-transparent absolute top-0 inset-x-0 z-10">
        <div className="min-w-0">
          <p className="font-semibold truncate">{trip.name}</p>
          <p className="text-xs text-white/60">
            {index + 1} / {photos.length} · {current.item_name}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            className="p-2 rounded-full hover:bg-white/10"
            onClick={() => setPaused(!paused)}
            title={paused ? 'Resume' : 'Pause'}
          >
            {paused ? <Play className="w-5 h-5" /> : <Pause className="w-5 h-5" />}
          </button>
          <button
            className="p-2 rounded-full hover:bg-white/10"
            onClick={() => setMuted(!muted)}
            title={muted ? 'Unmute music' : 'Mute music'}
          >
            {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </button>
          <button
            className="p-2 rounded-full hover:bg-white/10"
            onClick={onClose}
            title="Exit slideshow"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Photo (cross-fade) */}
      <div className="flex-1 relative min-h-0">
        {photos.map((photo, i) => (
          <img
            key={photo.id}
            src={photo.url}
            alt={photo.caption || photo.item_name}
            className="absolute inset-0 w-full h-full object-contain transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0 }}
          />
        ))}
        {photos.length > 1 && (
          <>
            <button
              className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center z-10"
              onClick={() => step(-1)}
              title="Previous photo"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center z-10"
              onClick={() => step(1)}
              title="Next photo"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Caption + credit */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent px-4 pt-10 pb-3 text-center">
        {current.caption && <p className="text-white text-sm mb-1">{current.caption}</p>}
        <p className="text-white/40 text-[10px]">
          Music: "Call to Adventure" — Kevin MacLeod (incompetech.com), CC BY 4.0
        </p>
      </div>
    </div>
  );
};

export default TripSlideshow;
