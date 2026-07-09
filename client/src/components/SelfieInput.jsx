import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';

/**
 * Circular avatar picker. Opens the standard file chooser, so phones offer
 * both camera and photo library. Calls onChange(file).
 */
const SelfieInput = ({ onChange, initialUrl = null }) => {
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(initialUrl);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onChange(file);
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={`w-28 h-28 rounded-full overflow-hidden flex items-center justify-center transition-colors ${
          preview
            ? 'ring-4 ring-primary-200'
            : 'border-2 border-dashed border-neutral-300 hover:border-primary-400 hover:bg-primary-50 text-neutral-400 hover:text-primary-500'
        }`}
        title="Take a photo or choose from your library"
      >
        {preview ? (
          <img src={preview} alt="Your avatar" className="w-full h-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs">
            <Camera className="w-7 h-7" />
            Photo
          </span>
        )}
      </button>
      <p className="text-xs text-neutral-500 text-center">
        Take a photo or pick one from your library — head and
        <br />
        shoulders works best as your travel avatar ✨
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
};

export default SelfieInput;
