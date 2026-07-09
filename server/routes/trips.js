import express from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All trip routes require authentication
router.use(authenticate);

/**
 * Verify the trip exists and the requesting user may access it:
 * the owner always can; accepted members can unless ownerOnly is set.
 * Returns the trip row, or null (response already sent).
 */
const loadAccessibleTrip = async (tripId, userId, res, { ownerOnly = false } = {}) => {
  const result = await query('SELECT * FROM trips WHERE id = $1', [tripId]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Trip not found' });
    return null;
  }
  const trip = result.rows[0];
  if (trip.user_id === userId) return trip;

  if (!ownerOnly) {
    const member = await query(
      `SELECT id FROM trip_members WHERE trip_id = $1 AND user_id = $2 AND status = 'accepted'`,
      [tripId, userId]
    );
    if (member.rows.length > 0) return trip;
  }

  res.status(403).json({
    error: ownerOnly
      ? 'Only the trip creator can do this'
      : 'You do not have access to this trip',
  });
  return null;
};

/**
 * GET /api/trips
 * List trips the user owns or has joined, with item/photo counts
 */
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT t.*,
              u.username AS owner_username,
              (t.user_id = $1) AS is_owner,
              COUNT(DISTINCT ti.id)::int AS item_count,
              COUNT(DISTINCT p.id)::int AS photo_count
       FROM trips t
       JOIN users u ON u.id = t.user_id
       LEFT JOIN trip_items ti ON ti.trip_id = t.id
       LEFT JOIN photos p ON p.trip_item_id = ti.id
       WHERE t.user_id = $1
          OR t.id IN (
            SELECT trip_id FROM trip_members
            WHERE user_id = $1 AND status = 'accepted'
          )
       GROUP BY t.id, u.username
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );
    res.json({ trips: result.rows });
  } catch (error) {
    console.error('[Trips Route] ❌ List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/invitations
 * Pending invitations for the current user.
 * (Registered before /:id so "invitations" isn't matched as a trip id)
 */
router.get('/invitations', async (req, res) => {
  try {
    const result = await query(
      `SELECT tm.id, tm.created_at, t.id AS trip_id, t.name AS trip_name,
              t.description AS trip_description, u.username AS invited_by_username
       FROM trip_members tm
       JOIN trips t ON t.id = tm.trip_id
       LEFT JOIN users u ON u.id = tm.invited_by
       WHERE tm.user_id = $1 AND tm.status = 'pending'
       ORDER BY tm.created_at DESC`,
      [req.user.id]
    );
    res.json({ invitations: result.rows });
  } catch (error) {
    console.error('[Trips Route] ❌ Invitations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/invitations/:inviteId/respond
 * Accept or decline an invitation: body { accept: boolean }
 */
router.post('/invitations/:inviteId/respond', async (req, res) => {
  try {
    const { accept } = req.body;
    const invite = await query(
      `SELECT id FROM trip_members WHERE id = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.inviteId, req.user.id]
    );
    if (invite.rows.length === 0) {
      return res.status(404).json({ error: 'Invitation not found' });
    }

    if (accept) {
      await query(`UPDATE trip_members SET status = 'accepted' WHERE id = $1`, [
        req.params.inviteId,
      ]);
    } else {
      await query('DELETE FROM trip_members WHERE id = $1', [req.params.inviteId]);
    }
    console.log(`[Trips Route] ✓ Invitation ${accept ? 'accepted' : 'declined'}: ${req.params.inviteId}`);
    res.json({ success: true, accepted: !!accept });
  } catch (error) {
    console.error('[Trips Route] ❌ Invitation respond error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/:id/invite
 * Invite a user by username or email (trip creator only)
 */
router.post('/:id/invite', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res, { ownerOnly: true });
    if (!trip) return;

    const { username } = req.body;
    if (!username || !username.trim()) {
      return res.status(400).json({ error: 'Username or email is required' });
    }

    const invitee = await query(
      'SELECT id, username FROM users WHERE username = $1 OR email = $1',
      [username.trim()]
    );
    if (invitee.rows.length === 0) {
      return res.status(404).json({ error: 'No user found with that username or email' });
    }
    const inviteeUser = invitee.rows[0];
    if (inviteeUser.id === req.user.id) {
      return res.status(400).json({ error: 'You are already on this trip' });
    }

    const existing = await query(
      'SELECT id, status FROM trip_members WHERE trip_id = $1 AND user_id = $2',
      [trip.id, inviteeUser.id]
    );
    if (existing.rows.length > 0) {
      const status = existing.rows[0].status;
      return res.status(409).json({
        error: status === 'accepted'
          ? `${inviteeUser.username} is already on this trip`
          : `${inviteeUser.username} already has a pending invitation`,
      });
    }

    await query(
      `INSERT INTO trip_members (id, trip_id, user_id, role, status, invited_by)
       VALUES ($1, $2, $3, 'member', 'pending', $4)`,
      [randomUUID(), trip.id, inviteeUser.id, req.user.id]
    );
    console.log(`[Trips Route] ✓ Invited ${inviteeUser.username} to trip ${trip.id}`);
    res.status(201).json({ success: true, invited: inviteeUser.username });
  } catch (error) {
    console.error('[Trips Route] ❌ Invite error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips
 * Create a trip
 */
router.post('/', async (req, res) => {
  try {
    const { name, description, start_date, end_date } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Trip name is required' });
    }

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trips (id, user_id, name, description, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, req.user.id, name.trim(), description || null, start_date || null, end_date || null]
    );
    console.log(`[Trips Route] ✓ Trip created: ${id}`);
    res.status(201).json({ trip: result.rows[0] });
  } catch (error) {
    console.error('[Trips Route] ❌ Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/trips/:id
 * Get a trip with its items and photos
 */
router.get('/:id', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    // Everyone on the trip, owner first — includes avatar fields for playback
    const members = await query(
      `SELECT u.id, u.username, u.full_name, u.selfie_url, u.gender,
              'owner' AS status, true AS is_owner
       FROM trips t JOIN users u ON u.id = t.user_id
       WHERE t.id = $1
       UNION ALL
       SELECT u.id, u.username, u.full_name, u.selfie_url, u.gender,
              tm.status, false AS is_owner
       FROM trip_members tm JOIN users u ON u.id = tm.user_id
       WHERE tm.trip_id = $1
       ORDER BY is_owner DESC, username`,
      [trip.id]
    );

    const items = await query(
      'SELECT * FROM trip_items WHERE trip_id = $1 ORDER BY order_index, created_at',
      [trip.id]
    );

    const photos = await query(
      `SELECT p.* FROM photos p
       JOIN trip_items ti ON ti.id = p.trip_item_id
       WHERE ti.trip_id = $1
       ORDER BY p.order_index, p.created_at`,
      [trip.id]
    );

    const photosByItem = {};
    for (const photo of photos.rows) {
      (photosByItem[photo.trip_item_id] ||= []).push(photo);
    }

    const itemsWithPhotos = items.rows.map((item) => ({
      ...item,
      photos: photosByItem[item.id] || [],
    }));

    res.json({
      trip: { ...trip, is_owner: trip.user_id === req.user.id },
      members: members.rows,
      items: itemsWithPhotos,
    });
  } catch (error) {
    console.error('[Trips Route] ❌ Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id
 * Update a trip
 */
router.put('/:id', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res, { ownerOnly: true });
    if (!trip) return;

    const { name, description, start_date, end_date, status, cover_image } = req.body;
    const result = await query(
      `UPDATE trips SET
         name = COALESCE($2, name),
         description = COALESCE($3, description),
         start_date = COALESCE($4, start_date),
         end_date = COALESCE($5, end_date),
         status = COALESCE($6, status),
         cover_image = COALESCE($7, cover_image),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [trip.id, name, description, start_date, end_date, status, cover_image]
    );
    res.json({ trip: result.rows[0] });
  } catch (error) {
    console.error('[Trips Route] ❌ Update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id
 * Delete a trip (items and photos cascade)
 */
router.delete('/:id', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res, { ownerOnly: true });
    if (!trip) return;

    await query('DELETE FROM trips WHERE id = $1', [trip.id]);
    console.log(`[Trips Route] ✓ Trip deleted: ${trip.id}`);
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/:id/items
 * Add an item (location/stop) to a trip
 */
router.post('/:id/items', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const {
      type, name, description, location_name, latitude, longitude,
      cost, currency, date, time, notes, fun_facts, transport_mode,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const orderResult = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM trip_items WHERE trip_id = $1',
      [trip.id]
    );

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trip_items
         (id, trip_id, type, name, description, location_name, latitude, longitude,
          cost, currency, date, time, notes, fun_facts, transport_mode, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        id, trip.id, type || 'experience', name.trim(), description || null,
        location_name || null, latitude ?? null, longitude ?? null,
        cost ?? null, currency || 'USD', date || null, time || null,
        notes || null, fun_facts || null, transport_mode || null,
        orderResult.rows[0].next,
      ]
    );
    console.log(`[Trips Route] ✓ Item created: ${id}`);
    res.status(201).json({ item: { ...result.rows[0], photos: [] } });
  } catch (error) {
    console.error('[Trips Route] ❌ Item create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/items/reorder
 * Reorder items: body { items: [{ id, order_index }] }
 * (Registered before /items/:itemId so "reorder" isn't matched as an item id)
 */
router.put('/:id/items/reorder', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'items array is required' });
    }

    for (const { id: itemId, order_index } of items) {
      await query(
        'UPDATE trip_items SET order_index = $1, updated_at = NOW() WHERE id = $2 AND trip_id = $3',
        [order_index, itemId, trip.id]
      );
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Reorder error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/items/:itemId
 * Update an item
 */
router.put('/:id/items/:itemId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const allowed = [
      'type', 'name', 'description', 'location_name', 'latitude', 'longitude',
      'cost', 'currency', 'date', 'time', 'notes', 'fun_facts', 'transport_mode',
      'order_index',
    ];
    const updates = [];
    const values = [req.params.itemId, trip.id];
    for (const field of allowed) {
      if (field in req.body) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(
      `UPDATE trip_items SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND trip_id = $2
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ item: result.rows[0] });
  } catch (error) {
    console.error('[Trips Route] ❌ Item update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id/items/:itemId
 * Delete an item (photos cascade)
 */
router.delete('/:id/items/:itemId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const result = await query(
      'DELETE FROM trip_items WHERE id = $1 AND trip_id = $2 RETURNING id',
      [req.params.itemId, trip.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Item delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
