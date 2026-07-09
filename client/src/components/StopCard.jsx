import { useRef, useState } from 'react';
import {
  Edit, Trash2, ChevronUp, ChevronDown, Camera, X, Loader2, Sparkles,
} from 'lucide-react';
import { typeEmoji, transportEmoji, TRANSPORT_MODES } from '../lib/tripConstants';

/**
 * One stop in the itinerary list: details, photo strip with upload,
 * edit/delete/reorder controls. The transport badge above the card shows
 * how you get here from the previous stop.
 */
const StopCard = ({
  item, index, isFirst, isLast,
  onEdit, onDelete, onMove, onUploadPhoto, onDeletePhoto, onHover,
}) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        await onUploadPhoto(item.id, file);
      }
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const transportLabel = TRANSPORT_MODES.find((m) => m.value === item.transport_mode)?.label;

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
        onMouseEnter={() => onHover?.(item)}
        onMouseLeave={() => onHover?.(null)}
      >
        <div className="flex items-start gap-4">
          <div className="flex flex-col items-center gap-1">
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
                  {typeEmoji(item.type)} {item.name}
                </h3>
                {item.location_name && (
                  <p className="text-xs text-neutral-500 line-clamp-1">
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

            {/* Photo strip */}
            <div className="flex items-center gap-2 flex-wrap">
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
                title="Add photos"
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
          </div>
        </div>
      </div>
    </div>
  );
};

export default StopCard;
