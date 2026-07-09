// Shared vocabulary for trip stops

export const STOP_TYPES = [
  { value: 'experience', label: 'Experience', emoji: '🎡' },
  { value: 'dining', label: 'Dining', emoji: '🍽️' },
  { value: 'hotel', label: 'Hotel', emoji: '🏨' },
  { value: 'transportation', label: 'Transportation', emoji: '🚉' },
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

export const transportEmoji = (mode) =>
  TRANSPORT_MODES.find((m) => m.value === mode)?.emoji || '✈️';

export const typeEmoji = (type) =>
  STOP_TYPES.find((t) => t.value === type)?.emoji || '📍';
