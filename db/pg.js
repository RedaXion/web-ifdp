const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Utilizamos DATABASE_URL desde .env o el entorno de Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Función para inicializar la base de datos
async function initDB() {
  if (!process.env.DATABASE_URL) {
    console.warn('⚠️ No se ha provisto DATABASE_URL. El servidor no podrá conectarse a PostgreSQL.');
    return;
  }
  
  try {
    const initSqlPath = path.join(__dirname, 'init.sql');
    const initSql = fs.readFileSync(initSqlPath, 'utf8');
    await pool.query(initSql);
    // Migrations
    try {
      await pool.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS anexos_youtube TEXT');
      await pool.query('ALTER TABLE classes ADD COLUMN IF NOT EXISTS visible BOOLEAN DEFAULT TRUE');
      await pool.query('ALTER TABLE grades ADD COLUMN IF NOT EXISTS evaluation_id VARCHAR(50) REFERENCES evaluations(id) ON DELETE CASCADE');
      await pool.query('UPDATE grades SET evaluation_id = evaluations.id FROM evaluations WHERE grades.evaluation_id IS NULL AND grades.unidad = evaluations.titulo');
      await pool.query(`CREATE TABLE IF NOT EXISTS page_visits (
        id SERIAL PRIMARY KEY,
        visited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        session_id VARCHAR(100)
      )`);
    } catch(e) {
      console.warn('DB Migration notice:', e.message);
    }
    console.log('✅ Base de datos PostgreSQL inicializada correctamente.');
  } catch (err) {
    console.error('❌ Error inicializando base de datos PostgreSQL:', err);
  }
}

module.exports = {
  pool,
  initDB
};
