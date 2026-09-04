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

    // Sub-groups within this trip, each with its member list — client joins
    // these onto items by group_id rather than the server denormalizing
    const groups = await query(
      `SELECT g.id, g.name, g.color, g.created_by,
              COALESCE(
                json_agg(gm.user_id) FILTER (WHERE gm.user_id IS NOT NULL), '[]'
              ) AS member_ids
       FROM trip_groups g
       LEFT JOIN trip_group_members gm ON gm.group_id = g.id
       WHERE g.trip_id = $1
       GROUP BY g.id
       ORDER BY g.created_at`,
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

    const activities = await query(
      `SELECT a.* FROM trip_item_activities a
       JOIN trip_items ti ON ti.id = a.trip_item_id
       WHERE ti.trip_id = $1
       ORDER BY a.order_index, a.created_at`,
      [trip.id]
    );
    const activitiesByItem = {};
    for (const activity of activities.rows) {
      (activitiesByItem[activity.trip_item_id] ||= []).push(activity);
    }

    const itemsWithExtras = items.rows.map((item) => ({
      ...item,
      photos: photosByItem[item.id] || [],
      activities: activitiesByItem[item.id] || [],
    }));

    res.json({
      trip: { ...trip, is_owner: trip.user_id === req.user.id },
      members: members.rows,
      groups: groups.rows,
      items: itemsWithExtras,
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
 * Verify a group_id (if provided) belongs to this trip; returns a clean
 * value to store (the id, or null). Prevents cross-trip group assignment.
 */
const resolveGroupId = async (tripId, groupId) => {
  if (!groupId) return null;
  const result = await query('SELECT id FROM trip_groups WHERE id = $1 AND trip_id = $2', [
    groupId, tripId,
  ]);
  return result.rows.length > 0 ? groupId : null;
};

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
      icon, custom_label, group_id,
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Item name is required' });
    }

    const orderResult = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM trip_items WHERE trip_id = $1',
      [trip.id]
    );
    const resolvedGroupId = await resolveGroupId(trip.id, group_id);

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trip_items
         (id, trip_id, type, name, description, location_name, latitude, longitude,
          cost, currency, date, time, notes, fun_facts, transport_mode, order_index,
          icon, custom_label, group_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
       RETURNING *`,
      [
        id, trip.id, type || 'experience', name.trim(), description || null,
        location_name || null, latitude ?? null, longitude ?? null,
        cost ?? null, currency || 'USD', date || null, time || null,
        notes || null, fun_facts || null, transport_mode || null,
        orderResult.rows[0].next, icon || null, custom_label || null, resolvedGroupId,
      ]
    );
    console.log(`[Trips Route] ✓ Item created: ${id}`);
    res.status(201).json({ item: { ...result.rows[0], photos: [], activities: [] } });
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
      'order_index', 'icon', 'custom_label',
    ];
    const updates = [];
    const values = [req.params.itemId, trip.id];
    for (const field of allowed) {
      if (field in req.body) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }
    // Validated separately: must reference a group on this same trip
    if ('group_id' in req.body) {
      values.push(await resolveGroupId(trip.id, req.body.group_id));
      updates.push(`group_id = $${values.length}`);
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
 * GET /api/trips/:id/ideas
 * List idea-board proposals for a trip, newest first, with proposer info
 */
router.get('/:id/ideas', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const result = await query(
      `SELECT ti.*, u.username AS proposed_by_username, u.selfie_url AS proposed_by_selfie
       FROM trip_ideas ti
       LEFT JOIN users u ON u.id = ti.proposed_by
       WHERE ti.trip_id = $1
       ORDER BY ti.created_at DESC`,
      [trip.id]
    );
    res.json({ ideas: result.rows });
  } catch (error) {
    console.error('[Trips Route] ❌ Ideas list error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/:id/ideas
 * Propose an idea (any accepted member or the owner)
 */
router.post('/:id/ideas', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const {
      type, name, description, location_name, latitude, longitude, cost, currency,
      icon, custom_label,
    } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Idea name is required' });
    }

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trip_ideas
         (id, trip_id, proposed_by, type, name, description, location_name,
          latitude, longitude, cost, currency, icon, custom_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        id, trip.id, req.user.id, type || 'experience', name.trim(),
        description || null, location_name || null, latitude ?? null,
        longitude ?? null, cost ?? null, currency || 'USD',
        icon || null, custom_label || null,
      ]
    );
    console.log(`[Trips Route] ✓ Idea proposed: ${id}`);
    res.status(201).json({
      idea: { ...result.rows[0], proposed_by_username: req.user.username, proposed_by_selfie: null },
    });
  } catch (error) {
    console.error('[Trips Route] ❌ Idea create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/trips/:id/ideas/:ideaId/promote
 * Move an idea into the itinerary as a trip_item (appended to the end),
 * then remove it from the idea board.
 */
router.post('/:id/ideas/:ideaId/promote', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const idea = await query('SELECT * FROM trip_ideas WHERE id = $1 AND trip_id = $2', [
      req.params.ideaId, trip.id,
    ]);
    if (idea.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    const i = idea.rows[0];

    const orderResult = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM trip_items WHERE trip_id = $1',
      [trip.id]
    );

    const itemId = randomUUID();
    const result = await query(
      `INSERT INTO trip_items
         (id, trip_id, type, name, description, location_name, latitude, longitude,
          cost, currency, order_index, icon, custom_label)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
       RETURNING *`,
      [
        itemId, trip.id, i.type, i.name, i.description, i.location_name,
        i.latitude, i.longitude, i.cost, i.currency, orderResult.rows[0].next,
        i.icon, i.custom_label,
      ]
    );

    await query('DELETE FROM trip_ideas WHERE id = $1', [i.id]);
    console.log(`[Trips Route] ✓ Idea promoted to item: ${i.id} -> ${itemId}`);
    res.status(201).json({ item: { ...result.rows[0], photos: [], activities: [] } });
  } catch (error) {
    console.error('[Trips Route] ❌ Idea promote error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id/ideas/:ideaId
 * Remove an idea (its proposer, or the trip owner, can withdraw it)
 */
router.delete('/:id/ideas/:ideaId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const idea = await query('SELECT proposed_by FROM trip_ideas WHERE id = $1 AND trip_id = $2', [
      req.params.ideaId, trip.id,
    ]);
    if (idea.rows.length === 0) {
      return res.status(404).json({ error: 'Idea not found' });
    }
    const canDelete = idea.rows[0].proposed_by === req.user.id || trip.user_id === req.user.id;
    if (!canDelete) {
      return res.status(403).json({ error: 'Only the proposer or trip creator can remove this idea' });
    }

    await query('DELETE FROM trip_ideas WHERE id = $1', [req.params.ideaId]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Idea delete error:', error);
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

/**
 * Verify the item exists on this (already access-checked) trip.
 * Returns the item id, or null (response already sent).
 */
const loadItemOnTrip = async (tripId, itemId, res) => {
  const result = await query('SELECT id FROM trip_items WHERE id = $1 AND trip_id = $2', [
    itemId, tripId,
  ]);
  if (result.rows.length === 0) {
    res.status(404).json({ error: 'Stop not found' });
    return null;
  }
  return result.rows[0].id;
};

const ACTIVITY_STATUSES = ['planned', 'optional'];

/**
 * POST /api/trips/:id/items/:itemId/activities
 * Add a sub-activity tied to a stop (e.g. an onboard event for a cruise)
 */
router.post('/:id/items/:itemId/activities', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;
    const itemId = await loadItemOnTrip(trip.id, req.params.itemId, res);
    if (!itemId) return;

    const { name, description, location_name, cost, currency, status } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Activity name is required' });
    }
    const resolvedStatus = ACTIVITY_STATUSES.includes(status) ? status : 'planned';

    const orderResult = await query(
      'SELECT COALESCE(MAX(order_index), -1) + 1 AS next FROM trip_item_activities WHERE trip_item_id = $1',
      [itemId]
    );

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trip_item_activities
         (id, trip_item_id, name, description, location_name, cost, currency, status, order_index)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id, itemId, name.trim(), description || null, location_name || null,
        cost ?? null, currency || 'USD', resolvedStatus, orderResult.rows[0].next,
      ]
    );
    console.log(`[Trips Route] ✓ Activity created: ${id}`);
    res.status(201).json({ activity: result.rows[0] });
  } catch (error) {
    console.error('[Trips Route] ❌ Activity create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/items/:itemId/activities/:activityId
 * Update a sub-activity (name, price, location, or planned/optional status)
 */
router.put('/:id/items/:itemId/activities/:activityId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;
    const itemId = await loadItemOnTrip(trip.id, req.params.itemId, res);
    if (!itemId) return;

    const allowed = ['name', 'description', 'location_name', 'cost', 'currency'];
    const updates = [];
    const values = [req.params.activityId, itemId];
    for (const field of allowed) {
      if (field in req.body) {
        values.push(req.body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }
    if ('status' in req.body) {
      if (!ACTIVITY_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ error: 'status must be "planned" or "optional"' });
      }
      values.push(req.body.status);
      updates.push(`status = $${values.length}`);
    }
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    const result = await query(
      `UPDATE trip_item_activities SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $1 AND trip_item_id = $2
       RETURNING *`,
      values
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ activity: result.rows[0] });
  } catch (error) {
    console.error('[Trips Route] ❌ Activity update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id/items/:itemId/activities/:activityId
 */
router.delete('/:id/items/:itemId/activities/:activityId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;
    const itemId = await loadItemOnTrip(trip.id, req.params.itemId, res);
    if (!itemId) return;

    const result = await query(
      'DELETE FROM trip_item_activities WHERE id = $1 AND trip_item_id = $2 RETURNING id',
      [req.params.activityId, itemId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Activity not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Activity delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Resolve a list of candidate user ids to only those who actually belong
 * to this trip (owner or accepted member) — silently drops invalid ids
 * rather than erroring, so a stale client-side member list can't break the request.
 */
const resolveTripMemberIds = async (trip, candidateIds) => {
  if (!Array.isArray(candidateIds) || candidateIds.length === 0) return [];
  const accepted = await query(
    `SELECT user_id FROM trip_members WHERE trip_id = $1 AND status = 'accepted'`,
    [trip.id]
  );
  const validIds = new Set([trip.user_id, ...accepted.rows.map((r) => r.user_id)]);
  return [...new Set(candidateIds)].filter((id) => validIds.has(id));
};

/**
 * POST /api/trips/:id/groups
 * Create a sub-group (a person or subset of travelers doing their own thing)
 */
router.post('/:id/groups', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const { name, color, member_ids } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    const id = randomUUID();
    const result = await query(
      `INSERT INTO trip_groups (id, trip_id, name, color, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, trip.id, name.trim(), color || '#8b5cf6', req.user.id]
    );

    const memberIds = await resolveTripMemberIds(trip, member_ids);
    for (const userId of memberIds) {
      await query(
        `INSERT INTO trip_group_members (id, group_id, user_id)
         VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
        [randomUUID(), id, userId]
      );
    }

    console.log(`[Trips Route] ✓ Group created: ${id}`);
    res.status(201).json({ group: { ...result.rows[0], member_ids: memberIds } });
  } catch (error) {
    console.error('[Trips Route] ❌ Group create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/trips/:id/groups/:groupId
 * Update a group's name/color and/or replace its member list
 */
router.put('/:id/groups/:groupId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const { name, color, member_ids } = req.body;
    const result = await query(
      `UPDATE trip_groups SET
         name = COALESCE($3, name),
         color = COALESCE($4, color)
       WHERE id = $1 AND trip_id = $2
       RETURNING *`,
      [req.params.groupId, trip.id, name || null, color || null]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }

    let memberIds;
    if (Array.isArray(member_ids)) {
      memberIds = await resolveTripMemberIds(trip, member_ids);
      await query('DELETE FROM trip_group_members WHERE group_id = $1', [req.params.groupId]);
      for (const userId of memberIds) {
        await query(
          `INSERT INTO trip_group_members (id, group_id, user_id)
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [randomUUID(), req.params.groupId, userId]
        );
      }
    } else {
      const existing = await query(
        'SELECT user_id FROM trip_group_members WHERE group_id = $1',
        [req.params.groupId]
      );
      memberIds = existing.rows.map((r) => r.user_id);
    }

    res.json({ group: { ...result.rows[0], member_ids: memberIds } });
  } catch (error) {
    console.error('[Trips Route] ❌ Group update error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/trips/:id/groups/:groupId
 * Remove a group (its stops fall back to the shared base trip, unassigned)
 */
router.delete('/:id/groups/:groupId', async (req, res) => {
  try {
    const trip = await loadAccessibleTrip(req.params.id, req.user.id, res);
    if (!trip) return;

    const result = await query(
      'DELETE FROM trip_groups WHERE id = $1 AND trip_id = $2 RETURNING id',
      [req.params.groupId, trip.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Group not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Trips Route] ❌ Group delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
