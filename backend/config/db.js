const { Pool } = require('pg');
require('dotenv').config();

// Connection string from environment variable (like Supabase)
// Fallback to local default PostgreSQL parameters
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/postgres';

const pool = new Pool({
  connectionString,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

// Verify connection
pool.query('SELECT NOW()')
  .then(() => {
    console.log('Database connected successfully to PostgreSQL/Supabase!');
  })
  .catch(err => {
    console.error('PostgreSQL connection failed:', err.message);
  });

module.exports = {
  query: async (text, params = []) => {
    let pgText = text;
    let index = 1;
    
    // Replace sequential '?' with '$1', '$2', ...
    while (pgText.includes('?')) {
      pgText = pgText.replace('?', `$${index++}`);
    }

    const isInsert = pgText.trim().toUpperCase().startsWith('INSERT');
    const isUpdate = pgText.trim().toUpperCase().startsWith('UPDATE');
    const isDelete = pgText.trim().toUpperCase().startsWith('DELETE');

    // Automatically append RETURNING id for insert statements to fetch insertId
    if (isInsert && !pgText.toUpperCase().includes('RETURNING')) {
      pgText = pgText.trim() + ' RETURNING id';
    }

    const res = await pool.query(pgText, params);

    let rowsOrResultObj;
    if (isInsert) {
      const insertId = res.rows[0] ? res.rows[0].id : null;
      rowsOrResultObj = {
        insertId: insertId,
        affectedRows: res.rowCount
      };
    } else if (isUpdate || isDelete) {
      rowsOrResultObj = {
        affectedRows: res.rowCount
      };
    } else {
      rowsOrResultObj = res.rows;
    }

    return [rowsOrResultObj, res.fields];
  },
  pool
};
