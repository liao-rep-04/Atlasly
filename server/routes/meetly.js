import express from 'express';
import { randomUUID } from 'crypto';
import { query } from '../db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

/**
 * GET /api/meetly/events
 * Every event on the board, with each one's RSVP count and whether the
 * requesting user has RSVP'd. Scheduled events sort soonest-first;
 * open-ended ones (no date) trail at the end.
 */
router.get('/events', async (req, res) => {
  try {
    const result = await query(
      `SELECT e.*,
              COUNT(r.id) AS rsvp_count,
              EXISTS(
                SELECT 1 FROM meetly_rsvps mr
                WHERE mr.event_id = e.id AND mr.user_id = $1
              ) AS going
       FROM meetly_events e
       LEFT JOIN meetly_rsvps r ON r.event_id = e.id
       GROUP BY e.id
       ORDER BY COALESCE(e.event_date, 'infinity') ASC, e.created_at DESC`,
      [req.user.id]
    );
    res.json({ events: result.rows });
  } catch (error) {
    console.error('[Meetly Route] ❌ List error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/meetly/events/:eventId
 * One event plus its full RSVP list, for the "who's going" panel.
 */
router.get('/events/:eventId', async (req, res) => {
  try {
    const event = await query('SELECT * FROM meetly_events WHERE id = $1', [req.params.eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const rsvps = await query(
      `SELECT u.id AS user_id, u.username, u.selfie_url
       FROM meetly_rsvps r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = $1
       ORDER BY r.created_at`,
      [req.params.eventId]
    );

    res.json({ event: event.rows[0], rsvps: rsvps.rows });
  } catch (error) {
    console.error('[Meetly Route] ❌ Get error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/meetly/events
 * Post a new event. Only title + coordinates are required — description,
 * location name, and date/time are all optional.
 */
router.post('/events', async (req, res) => {
  try {
    const { title, description, location_name, latitude, longitude, event_date, event_time } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (latitude == null || longitude == null) {
      return res.status(400).json({ error: 'A location is required' });
    }

    const id = randomUUID();
    const result = await query(
      `INSERT INTO meetly_events
         (id, created_by, title, description, location_name, latitude, longitude, event_date, event_time)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        id, req.user.id, title.trim(), description || null, location_name || null,
        latitude, longitude, event_date || null, event_time || null,
      ]
    );
    console.log(`[Meetly Route] ✓ Event created: ${id}`);
    res.status(201).json({ event: { ...result.rows[0], rsvp_count: 0, going: false } });
  } catch (error) {
    console.error('[Meetly Route] ❌ Create error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/meetly/events/:eventId
 * Only the event's creator can take it down.
 */
router.delete('/events/:eventId', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM meetly_events WHERE id = $1 AND created_by = $2 RETURNING id',
      [req.params.eventId, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ success: true });
  } catch (error) {
    console.error('[Meetly Route] ❌ Delete error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/meetly/events/:eventId/rsvp — I'm going
 */
router.post('/events/:eventId/rsvp', async (req, res) => {
  try {
    const event = await query('SELECT id FROM meetly_events WHERE id = $1', [req.params.eventId]);
    if (event.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    await query(
      `INSERT INTO meetly_rsvps (id, event_id, user_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (event_id, user_id) DO NOTHING`,
      [randomUUID(), req.params.eventId, req.user.id]
    );
    res.status(201).json({ success: true });
  } catch (error) {
    console.error('[Meetly Route] ❌ RSVP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/meetly/events/:eventId/rsvp — cancel my RSVP
 */
router.delete('/events/:eventId/rsvp', async (req, res) => {
  try {
    await query('DELETE FROM meetly_rsvps WHERE event_id = $1 AND user_id = $2', [
      req.params.eventId, req.user.id,
    ]);
    res.json({ success: true });
  } catch (error) {
    console.error('[Meetly Route] ❌ RSVP cancel error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
