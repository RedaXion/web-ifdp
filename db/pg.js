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
    console.log('✅ Base de datos PostgreSQL inicializada correctamente.');
  } catch (err) {
    console.error('❌ Error inicializando base de datos PostgreSQL:', err);
  }
}

module.exports = {
  pool,
  initDB
};
