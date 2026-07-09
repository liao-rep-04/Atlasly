import { useState, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2 } from 'lucide-react';
import { searchPlaces } from '../lib/api';

/**
 * Debounced place-name search box backed by the server's geocoding proxy.
 * Calls onSelect({ name, display_name, latitude, longitude }) when a result is picked.
 */
const PlaceSearch = ({ onSelect, placeholder = 'Search for a place...' }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await searchPlaces(query.trim());
        setResults(res.data.results);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const handleSelect = (place) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    onSelect(place);
  };

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {searching && (
          <Loader2 className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 animate-spin" />
        )}
      </div>
      {open && results.length > 0 && (
        <ul className="absolute z-30 mt-1 w-full bg-white border border-neutral-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          {results.map((place) => (
            <li key={place.place_id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-primary-50 flex items-start gap-2"
                onClick={() => handleSelect(place)}
              >
                <MapPin className="w-4 h-4 text-primary-500 mt-0.5 flex-shrink-0" />
                <span>
                  <span className="block text-sm font-medium text-neutral-900">
                    {place.name}
                  </span>
                  <span className="block text-xs text-neutral-500 line-clamp-1">
                    {place.display_name}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default PlaceSearch;
