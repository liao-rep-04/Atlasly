import express from 'express';
import fs from 'fs';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';
import { imageUpload as upload, removeUpload } from '../utils/imageUpload.js';

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
 * POST /api/photos/:tripItemId
 * Upload a photo for a trip item (multipart field: "photo")
 */
router.post('/:tripItemId', (req, res) => {
  upload.single('photo')(req, res, async (err) => {
    if (err) {
      console.log('[Photos Route] ✗ Upload rejected:', err.message);
      return res.status(400).json({ error: err.message });
    }
    try {
      const item = await loadOwnedItem(req.params.tripItemId, req.user.id, res);
      if (!item) {
        if (req.file) fs.unlink(req.file.path, () => {});
        return;
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No photo file provided' });
      }

      const id = randomUUID();
      const url = `/uploads/${req.file.filename}`;
      const orderResult = await query(
        'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM photos WHERE trip_item_id = $1',
        [item.id]
      );
      const result = await query(
        `INSERT INTO photos (id, trip_item_id, url, caption, order_index)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [id, item.id, url, req.body.caption || null, orderResult.rows[0].next]
      );
      console.log(`[Photos Route] ✓ Photo uploaded: ${id}`);
      res.status(201).json({ photo: result.rows[0] });
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
