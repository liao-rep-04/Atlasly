import exifr from 'exifr';

/**
 * Best-effort EXIF read for an uploaded photo: GPS coordinates and capture
 * time, if present. Never throws — a stripped, corrupt, or unsupported
 * file (screenshots, some messaging-app re-encodes) just yields nulls so
 * the upload itself always succeeds.
 */
export const readPhotoMetadata = async (filePath) => {
  try {
    const data = await exifr.parse(filePath, { gps: true });
    return {
      latitude: typeof data?.latitude === 'number' ? data.latitude : null,
      longitude: typeof data?.longitude === 'number' ? data.longitude : null,
      takenAt: data?.DateTimeOriginal instanceof Date ? data.DateTimeOriginal : null,
    };
  } catch {
    return { latitude: null, longitude: null, takenAt: null };
  }
};
