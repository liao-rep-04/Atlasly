import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

// SSL on in production by default; DATABASE_SSL=disable|require overrides
const useSSL = process.env.DATABASE_SSL
  ? process.env.DATABASE_SSL !== 'disable'
  : process.env.NODE_ENV === 'production';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: useSSL ? { rejectUnauthorized: false } : false,
});

/**
 * Execute a SQL query
 * @param {string} text - SQL query string
 * @param {Array} params - Query parameters
 * @returns {Promise} - Query result
 */
export const query = (text, params) => {
  console.log(`[DB] Executing query: ${text.substring(0, 100)}${text.length > 100 ? '...' : ''}`);
  return pool.query(text, params);
};

/**
 * Initialize database tables
 */
export const initializeDatabase = async () => {
  console.log('[DB] Initializing database schema...');

  try {
    // Users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Users table created/verified');

    // Profile fields for playback avatars (safe to re-run)
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS selfie_url TEXT`);
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS gender VARCHAR(20)`);
    console.log('[DB] ✓ Users columns migrated');

    // Trips table
    await query(`
      CREATE TABLE IF NOT EXISTS trips (
        id VARCHAR(255) PRIMARY KEY,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        start_date DATE,
        end_date DATE,
        status VARCHAR(50) DEFAULT 'planning',
        cover_image TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Trips table created/verified');

    // Trip membership: owners create rows with role 'owner'; invitations
    // create 'member' rows that start as status 'pending'.
    // Must come after both users and trips (foreign keys).
    await query(`
      CREATE TABLE IF NOT EXISTS trip_members (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) REFERENCES trips(id) ON DELETE CASCADE,
        user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL DEFAULT 'member',
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        invited_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE (trip_id, user_id)
      )
    `);
    console.log('[DB] ✓ Trip members table created/verified');

    // Trip items table (experiences, dining, hotels, transportation)
    await query(`
      CREATE TABLE IF NOT EXISTS trip_items (
        id VARCHAR(255) PRIMARY KEY,
        trip_id VARCHAR(255) REFERENCES trips(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        location_name VARCHAR(255),
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        google_place_id VARCHAR(255),
        cost DECIMAL(10, 2),
        currency VARCHAR(10) DEFAULT 'USD',
        date DATE,
        time TIME,
        notes TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Trip items table created/verified');

    // Columns added after initial release (safe to re-run)
    await query(`ALTER TABLE trip_items ADD COLUMN IF NOT EXISTS fun_facts TEXT`);
    await query(`ALTER TABLE trip_items ADD COLUMN IF NOT EXISTS transport_mode VARCHAR(50)`);
    console.log('[DB] ✓ Trip items columns migrated');

    // Photos table
    await query(`
      CREATE TABLE IF NOT EXISTS photos (
        id VARCHAR(255) PRIMARY KEY,
        trip_item_id VARCHAR(255) REFERENCES trip_items(id) ON DELETE CASCADE,
        url TEXT NOT NULL,
        caption TEXT,
        order_index INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('[DB] ✓ Photos table created/verified');

    // Create indexes for better performance
    await query('CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips(user_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_trip_items_trip_id ON trip_items(trip_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_trip_items_order ON trip_items(trip_id, order_index)');
    await query('CREATE INDEX IF NOT EXISTS idx_photos_trip_item_id ON photos(trip_item_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_trip_members_user ON trip_members(user_id, status)');
    await query('CREATE INDEX IF NOT EXISTS idx_trip_members_trip ON trip_members(trip_id, status)');
    console.log('[DB] ✓ Indexes created/verified');

    console.log('[DB] ✅ Database initialization complete');
    return true;
  } catch (error) {
    console.error('[DB] ❌ Database initialization failed:', error);
    throw error;
  }
};

/**
 * Test database connection
 */
export const testConnection = async () => {
  try {
    const result = await query('SELECT NOW()');
    console.log('[DB] ✅ Database connection successful:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('[DB] ❌ Database connection failed:', error);
    throw error;
  }
};

export default {
  query,
  initializeDatabase,
  testConnection,
};
