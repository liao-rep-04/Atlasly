// Shared vocabulary for trip stops

export const STOP_TYPES = [
  { value: 'experience', label: 'Experience', emoji: '🎡' },
  { value: 'dining', label: 'Dining', emoji: '🍽️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'transportation', label: 'Transportation', emoji: '🚉' },
  { value: 'dynamic', label: 'Custom Event', emoji: '✨' },
];

// How you travel TO a stop from the previous one
export const TRANSPORT_MODES = [
  { value: 'plane', label: 'Plane', emoji: '✈️' },
  { value: 'car', label: 'Car', emoji: '🚗' },
  { value: 'train', label: 'Train', emoji: '🚆' },
  { value: 'boat', label: 'Boat', emoji: '⛴️' },
  { value: 'bus', label: 'Bus', emoji: '🚌' },
  { value: 'bike', label: 'Bike', emoji: '🚴' },
  { value: 'walk', label: 'Walk', emoji: '🚶' },
];

// Icon choices for "Custom Event" stops (cruises, festivals, ski trips...) —
// the picked icon becomes the map marker for that stop
export const DYNAMIC_EVENT_ICONS = [
  '🛳️', '⛴️', '🚢', '⛵', '🏕️', '⛺', '🎪', '🎡', '🎢', '🎿',
  '⛷️', '🏂', '🏖️', '🏝️', '🤿', '🎣', '🥾', '🚵', '🏔️', '🎭',
  '🎶', '🎇', '🎆', '🍷', '🍺', '⛳', '🏇', '🚴', '🛶', '🧗',
];

export const ACTIVITY_STATUSES = [
  { value: 'planned', label: 'Planned' },
  { value: 'optional', label: 'Optional' },
];

// Palette for trip sub-groups (breakout itineraries within one trip)
export const GROUP_COLORS = [
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#f59e0b', // amber
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#f43f5e', // rose
  '#14b8a6', // teal
  '#6366f1', // indigo
];

export const transportEmoji = (mode) =>
  TRANSPORT_MODES.find((m) => m.value === mode)?.emoji || '✈️';

export const typeEmoji = (type) =>
  STOP_TYPES.find((t) => t.value === type)?.emoji || '📍';

// A stop's effective marker/badge icon: its own chosen icon when it's a
// dynamic event, otherwise the fixed emoji for its type
export const stopIcon = (item) =>
  item?.type === 'dynamic' && item.icon ? item.icon : typeEmoji(item?.type);

// A stop's effective category label: the user's own title for dynamic
// events, otherwise the fixed type label
export const stopLabel = (item) => {
  if (item?.type === 'dynamic' && item.custom_label) return item.custom_label;
  return STOP_TYPES.find((t) => t.value === item?.type)?.label || 'Experience';
};
