import express from 'express';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { imageUpload as upload, removeUpload, MAX_FILE_SIZE } from '../utils/imageUpload.js';
import { readPhotoMetadata } from '../utils/exif.js';

const router = express.Router();

router.use(authenticate);

/**
 * Verify the trip item exists and the user is on its trip
 * (owner or accepted member).
 */
const loadOwnedItem = async (itemId, userId, res) => {
  const result = await query(
    `SELECT ti.id FROM trip_items ti
     JOIN trips t ON t.id = ti.trip_id
     WHERE ti.id = $1 AND (
       t.user_id = $2 OR EXISTS (
         SELECT 1 FROM trip_members tm
         WHERE tm.trip_id = t.id AND tm.user_id = $2 AND tm.status = 'accepted'
       )
     )`,
    [itemId, userId]
  );
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Trip item not found' });
    return null;
  }
  return result.rows[0];
};

/**
 * GET /api/photos?trip_id=...
 * Every photo across the user's trips (owned + joined), with the stop and
 * trip it belongs to — powers the gallery map and grid views.
 */
router.get('/', async (req, res) => {
  try {
    const params = [req.user.id];
    let tripFilter = '';
    if (req.query.trip_id) {
      params.push(req.query.trip_id);
      tripFilter = 'AND t.id = $2';
    }
    const result = await query(
      `SELECT p.id, p.url, p.caption, p.created_at,
              ti.id AS item_id, ti.name AS item_name,
              ti.latitude, ti.longitude,
              t.id AS trip_id, t.name AS trip_name
       FROM photos p
       JOIN trip_items ti ON ti.id = p.trip_item_id
       JOIN trips t ON t.id = ti.trip_id
       WHERE (
         t.user_id = $1 OR EXISTS (
           SELECT 1 FROM trip_members tm
           WHERE tm.trip_id = t.id AND tm.user_id = $1 AND tm.status = 'accepted'
         )
       ) ${tripFilter}
       ORDER BY p.created_at DESC`,
      params
    );
    res.json({ photos: result.rows });
  } catch (error) {
    console.error('[Photos Route] ❌ Gallery error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/photos/:tripItemId
 * Upload one or more photos for a trip item in a single request
 * (multipart field: "photos", repeated). GPS/capture-time is read from
 * each file's EXIF automatically, best-effort.
 */
router.post('/:tripItemId', (req, res) => {
  upload.array('photos', 20)(req, res, async (err) => {
    if (err) {
      console.log('[Photos Route] ✗ Upload rejected:', err.message);
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? `One of those photos is over the ${Math.round(MAX_FILE_SIZE / (1024 * 1024))}MB limit — try a smaller photo or lower quality`
        : err.message;
      return res.status(400).json({ error: message });
    }
    try {
      const item = await loadOwnedItem(req.params.tripItemId, req.user.id, res);
      if (!item) {
        (req.files || []).forEach((f) => fs.unlink(f.path, () => {}));
        return;
      }
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No photo files provided' });
      }

      const orderResult = await query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM photos WHERE trip_item_id = $1',
        [item.id]
      );
      let nextOrder = orderResult.rows[0].next;

      const photos = [];
      for (const file of req.files) {
        const id = randomUUID();
        const url = `/uploads/${file.filename}`;
        const { latitude, longitude, takenAt } = await readPhotoMetadata(file.path);
        const result = await query(
          `INSERT INTO photos (id, trip_item_id, url, caption, order_index, latitude, longitude, taken_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
          [id, item.id, url, req.body.caption || null, nextOrder, latitude, longitude, takenAt]
        );
        photos.push(result.rows[0]);
        nextOrder += 1;
      }
      console.log(`[Photos Route] ✓ ${photos.length} photo(s) uploaded for item ${item.id}`);
      res.status(201).json({ photos });
    } catch (error) {
      console.error('[Photos Route] ❌ Upload error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
});

/**
 * GET /api/photos/:tripItemId
 * List photos for a trip item
 */
router.get('/:tripItemId', async (req, res) => {
  try {
    const item = await loadOwnedItem(req.params.tripItemId, req.user.id, res);
    if (!item) return;

    const result = await query(
      'SELECT * FROM photos WHERE trip_item_id = $1 ORDER BY order_index, created_at',
      [item.id]
    );
    res.json({ photos: result.rows });
  } catch (error) {
    console.error('[Photos Route] ❌ List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/photos/:photoId
 * Delete a photo (and its file on disk)
 */
router.delete('/:photoId', async (req, res) => {
  try {
    const result = await query(
      `DELETE FROM photos p
       USING trip_items ti, trips t
       WHERE p.id = $1 AND ti.id = p.trip_item_id AND t.id = ti.trip_id AND t.user_id = $2
       RETURNING p.url`,
      [req.params.photoId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Photo not found' });
    }

    removeUpload(result.rows[0].url);
    res.json({ success: true });
  } catch (error) {
    console.error('[Photos Route] ❌ Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
