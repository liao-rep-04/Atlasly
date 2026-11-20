import { useRef, useState } from 'react';
import {
  Edit, Trash2, ChevronUp, ChevronDown, Camera, X, Loader2, Sparkles, GripVertical, MapPinned,
} from 'lucide-react';
import {
  stopIcon, stopLabel, transportEmoji, TRANSPORT_MODES, MICRO_TAG_SUGGEST_THRESHOLD_KM,
} from '../lib/tripConstants';
import { haversineKm } from '../lib/routeOptimizer';
import StopActivities from './StopActivities';
import StopMicroTags from './StopMicroTags';
import StopMiniMap from './StopMiniMap';

/**
 * One stop in the itinerary list: details, photo strip with upload,
 * edit/delete/reorder controls, and (for dynamic events) its own nested
 * activities. The transport badge above the card shows how you get here
 * from the previous stop. `dragHandleProps` (from dnd-kit) is spread onto
 * the grip icon for pointer/touch drag-reorder; the up/down buttons remain
 * as a keyboard/no-drag fallback. When `group` is set, the card is framed
 * in that group's color to mark it as part of a breakout sub-itinerary.
 */
const StopCard = ({
  item, index, isFirst, isLast, group,
  onEdit, onDelete, onMove, onUploadPhotos, onDeletePhoto, onHover, dragHandleProps,
  onCreateActivity, onToggleActivityStatus, onDeleteActivity,
  onCreatePoi, onDeletePoi,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  // Photos whose EXIF GPS landed meaningfully away from this stop — a
  // one-time nudge to turn them into a micro tag, not a standing notice.
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionNames, setSuggestionNames] = useState({});

  const uploadFiles = async (files) => {
    if (files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await onUploadPhotos(item.id, files);
      if (item.latitude && item.longitude) {
        const stopPoint = { latitude: parseFloat(item.latitude), longitude: parseFloat(item.longitude) };
        const newSuggestions = (uploaded || []).filter((photo) => {
          if (!photo.latitude || !photo.longitude) return false;
          const distanceKm = haversineKm(stopPoint, {
            latitude: parseFloat(photo.latitude),
            longitude: parseFloat(photo.longitude),
          });
          return distanceKm > MICRO_TAG_SUGGEST_THRESHOLD_KM;
        }).map((photo) => ({ ...photo, distanceKm: haversineKm(stopPoint, {
          latitude: parseFloat(photo.latitude), longitude: parseFloat(photo.longitude),
        }) }));
        if (newSuggestions.length > 0) {
          setSuggestions((prev) => [...prev, ...newSuggestions]);
        }
      }
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    await uploadFiles(files);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith('image/'));
    await uploadFiles(files);
  };

  const formatDistance = (km) => (km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`);

  const dismissSuggestion = (photoId) => {
    setSuggestions((prev) => prev.filter((p) => p.id !== photoId));
  };

  const acceptSuggestion = async (photo) => {
    const name = (suggestionNames[photo.id] || '').trim();
    if (!name) return;
    await onCreatePoi(item.id, {
      name, latitude: photo.latitude, longitude: photo.longitude, photo_id: photo.id,
    });
    dismissSuggestion(photo.id);
  };

  const untaggedGeoPhotos = (item.photos || []).filter(
    (p) => p.latitude && p.longitude && !p.poi_id
  );

  const transportLabel = TRANSPORT_MODES.find((m) => m.value === item.transport_mode)?.label;
  const isDynamic = item.type === 'dynamic';

  return (
    <div>
      {/* Travel-leg badge (how you get TO this stop) */}
      {!isFirst && item.transport_mode && (
        <div className="flex items-center gap-2 py-1 pl-5 text-sm text-neutral-500">
          <span className="text-base">{transportEmoji(item.transport_mode)}</span>
          <span>{transportLabel} from previous stop</span>
        </div>
      )}

      <div
        className="card hover:shadow-lg transition-shadow"
        style={
          group
            ? { borderLeft: `4px solid ${group.color}`, backgroundColor: `${group.color}0d` }
            : undefined
        }
        onMouseEnter={() => onHover?.(item)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
            {dragHandleProps && (
              <button
                className="p-0.5 -mt-1 text-neutral-300 hover:text-neutral-600 cursor-grab active:cursor-grabbing touch-none"
                title="Drag to reorder"
                {...dragHandleProps}
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center text-white font-semibold">
              {index + 1}
            </div>
            <div className="flex flex-col">
              <button
                className="p-0.5 text-neutral-300 hover:text-neutral-700 disabled:opacity-30"
                disabled={isFirst}
                onClick={() => onMove(item, -1)}
                title="Move up"
              >
                <ChevronUp className="w-4 h-4" />
              </button>
              <button
                className="p-0.5 text-neutral-300 hover:text-neutral-700 disabled:opacity-30"
                disabled={isLast}
                onClick={() => onMove(item, 1)}
                title="Move down"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h3 className="font-semibold text-neutral-900">
                  {stopIcon(item)} {item.name}
                </h3>
                <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                  {isDynamic && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 rounded-full px-2 py-0.5">
                      {stopLabel(item)}
                    </span>
                  )}
                  {group && (
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide text-white rounded-full px-2 py-0.5"
                      style={{ backgroundColor: group.color }}
                    >
                      {group.name}
                    </span>
                  )}
                </div>
                {item.location_name && (
                  <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">
                    📍 {item.location_name}
                  </p>
                )}
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <button
                  className="p-2 text-neutral-400 hover:text-primary-600"
                  onClick={() => onEdit(item)}
                  title="Edit stop"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  className="p-2 text-neutral-400 hover:text-red-600"
                  onClick={() => onDelete(item)}
                  title="Delete stop"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {item.description && (
              <p className="text-sm text-neutral-600 mb-2">{item.description}</p>
            )}

            {item.fun_facts && (
              <p className="text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 mb-2 flex items-start gap-1.5">
                <Sparkles className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{item.fun_facts}</span>
              </p>
            )}

            <div className="flex items-center gap-4 text-sm text-neutral-600 mb-3">
              {item.date && (
                <span>📅 {new Date(item.date).toLocaleDateString()}</span>
              )}
              {item.time && <span>⏰ {String(item.time).slice(0, 5)}</span>}
              {parseFloat(item.cost) > 0 && (
                <span className="font-semibold text-primary-600">
                  💰 ${parseFloat(item.cost).toFixed(2)}
                </span>
              )}
            </div>

            {/* Photo strip — click or drag-and-drop to upload, any number at once */}
            <div
              className={`flex items-center gap-2 flex-wrap rounded-lg transition-colors ${
                dragOver ? 'bg-primary-50 ring-2 ring-primary-300' : ''
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              {(item.photos || []).map((photo) => (
                <div key={photo.id} className="relative group/photo">
                  <img
                    src={photo.url}
                    alt={photo.caption || item.name}
                    className="w-16 h-16 object-cover rounded-lg border border-neutral-200"
                  />
                  <button
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full items-center justify-center hidden group-hover/photo:flex"
                    onClick={() => onDeletePhoto(item.id, photo.id)}
                    title="Remove photo"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              <button
                className="w-16 h-16 rounded-lg border-2 border-dashed border-neutral-300 hover:border-primary-400 hover:bg-primary-50 flex flex-col items-center justify-center text-neutral-400 hover:text-primary-500 transition-colors"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                title="Add photos (or drag and drop)"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Camera className="w-5 h-5" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFiles}
              />
            </div>

            {/* A photo's EXIF GPS landed away from this stop — offer to tag that spot */}
            {suggestions.map((photo) => (
              <div
                key={photo.id}
                className="mt-2 flex items-center gap-2 text-sm bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              >
                <MapPinned className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span className="text-amber-800 flex-shrink-0">
                  Taken ~{formatDistance(photo.distanceKm)} from here —
                </span>
                <input
                  type="text"
                  className="input text-sm py-1 flex-1 min-w-0"
                  placeholder="Name this spot"
                  value={suggestionNames[photo.id] || ''}
                  onChange={(e) =>
                    setSuggestionNames((prev) => ({ ...prev, [photo.id]: e.target.value }))
                  }
                />
                <button
                  type="button"
                  className="btn-primary text-sm py-1 px-2.5 flex-shrink-0"
                  onClick={() => acceptSuggestion(photo)}
                  disabled={!suggestionNames[photo.id]?.trim()}
                >
                  Tag it
                </button>
                <button
                  type="button"
                  className="p-1 text-amber-400 hover:text-amber-700 flex-shrink-0"
                  onClick={() => dismissSuggestion(photo.id)}
                  title="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}

            <StopMicroTags
              pois={item.pois || []}
              onCreate={(data) => onCreatePoi(item.id, data)}
              onDelete={(poi) => onDeletePoi(item.id, poi.id)}
            />
            <StopMiniMap item={item} pois={item.pois || []} untaggedPhotos={untaggedGeoPhotos} />

            {/* Dynamic events get their own nested agenda of sub-activities */}
            {isDynamic && (
              <StopActivities
                activities={item.activities || []}
                onCreate={(data) => onCreateActivity(item.id, data)}
                onToggleStatus={(activity) => onToggleActivityStatus(item.id, activity)}
                onDelete={(activity) => onDeleteActivity(item.id, activity)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopCard;
