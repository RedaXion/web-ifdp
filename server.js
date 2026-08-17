const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const multer = require('multer'); // added for file uploads
const fs = require('fs'); // file system utilities
const { pool, initDB } = require('./db/pg');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: 'ifdp_secret_key_discipulado_2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 } // 24 horas
}));

// Persistent upload directory (Railway) and Multer config
const uploadDir = path.join(__dirname, 'persistent', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });
// Serve uploaded files via /uploads URL
app.use('/uploads', express.static(uploadDir));

// Super admin email constant
const SUPERADMIN_EMAIL = 'chris.rodval@gmail.com';

// Servir la web principal de la iglesia
app.use(express.static(path.join(__dirname)));

// Helper helper para extract youtube ID
function getYoutubeId(url) {
  if (!url) return '';
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : url;
}

// --------------------------------------------------------------------------
// RUTAS DE AUTENTICACIÓN
// --------------------------------------------------------------------------
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const userRes = await pool.query('SELECT * FROM users WHERE LOWER(username) = LOWER($1) OR LOWER(email) = LOWER($1)', [username || '']);
    if (userRes.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }
    const user = userRes.rows[0];

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      email: user.email,
      role: user.role,
      nivel: user.nivel_id || null
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user: req.session.user });
});

// Middleware de protección por rol
function authRole(roles = []) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.status(401).json({ error: 'No autorizado. Debe iniciar sesión.' });
    }
    // Super‑admin bypass
    const isSuper = req.session.user.email && req.session.user.email.toLowerCase() === SUPERADMIN_EMAIL.toLowerCase();
    if (isSuper) {
      req.session.user.isSuperAdmin = true;
      return next();
    }
    if (roles.length && !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
    }
    next();
  };
}

// --------------------------------------------------------------------------
// RUTAS API - ESTUDIANTES (/discipulado)
// --------------------------------------------------------------------------
app.get('/api/student/dashboard', authRole(['student', 'paidagogo', 'admin']), async (req, res) => {
  const userId = req.query.studentId || req.session.user.id;
  try {
    const studentRes = await pool.query('SELECT id, nombre, nivel FROM users WHERE id = $1', [userId]);
    const classesRes = await pool.query('SELECT id, titulo, nivel, youtube_id as "youtubeId", ppt_url as "pptUrl", apunte_url as "apunteUrl", descripcion FROM classes ORDER BY created_at ASC');
    const gradesRes = await pool.query('SELECT id, student_id as "studentId", unidad, puntaje_obtenido as "puntajeObtenido", puntaje_total as "puntajeTotal", nota, porcentaje, observaciones FROM grades WHERE student_id = $1', [userId]);
    const attRes = await pool.query('SELECT id, class_id as "classId", student_id as "studentId", status FROM attendance WHERE student_id = $1', [userId]);

    res.json({
      student: studentRes.rows.length > 0 ? studentRes.rows[0] : null,
      classes: classesRes.rows,
      grades: gradesRes.rows.map(g => ({...g, nota: parseFloat(g.nota)})),
      attendance: attRes.rows
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// --------------------------------------------------------------------------
// RUTAS API - PAIDAGOGOS (/discipulado/paidagogos)
// --------------------------------------------------------------------------
app.get('/api/paidagogo/students', authRole(['paidagogo', 'admin']), async (req, res) => {
  try {
    const studentsRes = await pool.query('SELECT id, nombre, username, email, role, nivel FROM users WHERE role = $1', ['student']);
    const gradesRes = await pool.query('SELECT id, student_id as "studentId", unidad, puntaje_obtenido as "puntajeObtenido", puntaje_total as "puntajeTotal", nota, porcentaje, observaciones FROM grades');

    const studentsWithGrades = studentsRes.rows.map(s => ({
      ...s,
      grades: gradesRes.rows.filter(g => g.studentId === s.id).map(g => ({...g, nota: parseFloat(g.nota)}))
    }));

    res.json(studentsWithGrades);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/paidagogo/grades', authRole(['paidagogo', 'admin']), async (req, res) => {
  const { studentId, unidad, puntajeObtenido, puntajeTotal, observaciones } = req.body;

  const pTotal = parseFloat(puntajeTotal);
  const pObtenido = parseFloat(puntajeObtenido);
  const exigencia = pTotal * 0.6;
  
  let nota = 1.0;
  if (pObtenido < exigencia) {
    nota = (pObtenido / exigencia) * 3 + 1;
  } else {
    nota = ((pObtenido - exigencia) / (pTotal * 0.4)) * 3 + 4;
  }
  nota = Math.round(nota * 10) / 10;
  if(nota < 1.0) nota = 1.0;
  if(nota > 7.0) nota = 7.0;

  const porcentaje = Math.round((pObtenido / pTotal) * 100);
  const newId = 'g_' + Date.now();

  try {
    await pool.query(
      'INSERT INTO grades (id, student_id, unidad, puntaje_obtenido, puntaje_total, nota, porcentaje, observaciones) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [newId, studentId, unidad, pObtenido, pTotal, nota, porcentaje, observaciones || '']
    );

    res.json({ success: true, grade: { id: newId, studentId, unidad, puntajeObtenido: pObtenido, puntajeTotal: pTotal, nota, porcentaje, observaciones } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error al guardar nota' });
  }
});

app.put('/api/paidagogo/grades/:id', authRole(['paidagogo', 'admin']), async (req, res) => {
  const gradeId = req.params.id;
  const { unidad, puntajeObtenido, puntajeTotal, observaciones } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM grades WHERE id = $1', [gradeId]);
    if(existing.rows.length === 0) return res.status(404).json({ error: 'Calificación no encontrada' });
    const g = existing.rows[0];

    const pTotal = puntajeTotal !== undefined ? parseFloat(puntajeTotal) : parseFloat(g.puntaje_total);
    const pObtenido = puntajeObtenido !== undefined ? parseFloat(puntajeObtenido) : parseFloat(g.puntaje_obtenido);
    const exigencia = pTotal * 0.6;
    
    let nota = 1.0;
    if (pObtenido < exigencia) {
      nota = (pObtenido / exigencia) * 3 + 1;
    } else {
      nota = ((pObtenido - exigencia) / (pTotal * 0.4)) * 3 + 4;
    }
    nota = Math.round(nota * 10) / 10;
    if(nota < 1.0) nota = 1.0;
    if(nota > 7.0) nota = 7.0;

    const porcentaje = Math.round((pObtenido / pTotal) * 100);

    const newUnidad = unidad || g.unidad;
    const newObs = observaciones !== undefined ? observaciones : g.observaciones;

    await pool.query(
      'UPDATE grades SET unidad = $1, puntaje_obtenido = $2, puntaje_total = $3, nota = $4, porcentaje = $5, observaciones = $6 WHERE id = $7',
      [newUnidad, pObtenido, pTotal, nota, porcentaje, newObs, gradeId]
    );

    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

app.post('/api/paidagogo/attendance', authRole(['paidagogo', 'admin']), async (req, res) => {
  const { classId, absentStudentIds } = req.body;
  try {
    // Limpiar previa
    await pool.query('DELETE FROM attendance WHERE class_id = $1', [classId]);
    
    // Obtener estudiantes del mismo nivel que el pedagogo
    const nivelId = req.session.user.nivel; // nivel_id almacenado en sesión
    const studentsRes = await pool.query(
      "SELECT id FROM users WHERE role = 'student' AND nivel_id = $1",
      [nivelId]
    );
    const students = studentsRes.rows;

    for (let student of students) {
      const status = absentStudentIds && absentStudentIds.includes(student.id) ? 'ausente' : 'presente';
      const attId = 'a_' + Date.now() + '_' + student.id;
      await pool.query(
        'INSERT INTO attendance (id, class_id, student_id, status) VALUES ($1, $2, $3, $4)',
        [attId, classId, student.id, status]
      );
    }
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// --------------------------------------------------------------------------
// RUTAS API - ADMIN (/discipulado/admin)
// --------------------------------------------------------------------------
app.get('/api/admin/overview', authRole(['admin']), async (req, res) => {
  try {
    const usersRes = await pool.query('SELECT id, username, nombre, email, role, nivel FROM users');
    const gradesRes = await pool.query('SELECT id, student_id as "studentId", unidad, puntaje_obtenido as "puntajeObtenido", puntaje_total as "puntajeTotal", nota, porcentaje, observaciones FROM grades');
    const attRes = await pool.query('SELECT id, class_id as "classId", student_id as "studentId", status FROM attendance');
    const classesRes = await pool.query('SELECT id, titulo, nivel, youtube_id as "youtubeId", ppt_url as "pptUrl", apunte_url as "apunteUrl", descripcion FROM classes ORDER BY created_at ASC');
    const noaRes = await pool.query('SELECT id, pedagogo_id as "pedagogoId", evaluacion_id as "evaluacionId", archivo_url as "archivoUrl", fecha_subida as "fechaSubida" FROM nota_noa');

    const grades = gradesRes.rows.map(g => ({...g, nota: parseFloat(g.nota)}));
    const attendance = attRes.rows;
    const noas = noaRes.rows;

    const usersWithStats = usersRes.rows.map(u => {
      let uGrades = grades.filter(g => g.studentId === u.id);
      let avgGrade = uGrades.length > 0 ? (uGrades.reduce((acc, g) => acc + g.nota, 0) / uGrades.length).toFixed(1) : 'N/A';
      
      let uAtt = attendance.filter(a => a.studentId === u.id);
      let avgAtt = uAtt.length > 0 ? (uAtt.filter(a => a.status === 'presente').length / uAtt.length * 100).toFixed(0) + '%' : 'N/A';

      return { ...u, avgGrade, avgAttendance: avgAtt };
    });

    res.json({
      users: usersWithStats,
      classes: classesRes.rows,
      grades,
      attendance,
      noas
    });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear usuario
app.post('/api/admin/users', authRole(['admin']), async (req, res) => {
  const { username, password, nombre, email, role, nivel } = req.body;
  try {
    const check = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
    if(check.rows.length > 0) return res.status(400).json({ error: 'El nombre de usuario ya existe' });

    const newId = 'u_' + Date.now();
    const hash = bcrypt.hashSync(password || '123456', 10);
    const uRole = role || 'student';
    const uNivel = nivel || 'Nivel 1: Corderitos';

    await pool.query(
      'INSERT INTO users (id, username, password_hash, nombre, email, role, nivel) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newId, username, hash, nombre, email || '', uRole, uNivel]
    );

    res.json({ success: true, user: { id: newId, username, role: uRole } });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Eliminar usuario
app.delete('/api/admin/users/:id', authRole(['admin']), async (req, res) => {
  try {
    // ON DELETE CASCADE en grades y attendance lo manejará si está configurado
    await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Editar Asistencia
app.put('/api/admin/attendance/:id', authRole(['admin']), async (req, res) => {
  const { status } = req.body;
  try {
    await pool.query('UPDATE attendance SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear/Subir clase con PPT y Youtube
app.post('/api/admin/classes', authRole(['admin']), async (req, res) => {
  const { titulo, nivel, youtubeUrl, pptUrl, apunteUrl, descripcion } = req.body;
  const newId = 'c_' + Date.now();
  const yId = getYoutubeId(youtubeUrl);
  
  try {
    await pool.query(
      'INSERT INTO classes (id, titulo, nivel, youtube_id, ppt_url, apunte_url, descripcion) VALUES ($1, $2, $3, $4, $5, $6, $7)',
      [newId, titulo, nivel || 'Nivel 1: Corderitos', yId, pptUrl || '', apunteUrl || '', descripcion || '']
    );
    res.json({ success: true });
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Rutas de Páginas HTML para Discipulado
app.get('/discipulado', (req, res) => {
  res.sendFile(path.join(__dirname, 'discipulado.html'));
});

app.get('/discipulado/paidagogos', (req, res) => {
  res.sendFile(path.join(__dirname, 'paidagogos.html'));
});

app.get('/discipulado/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'admin.html'));
});

// Arrancar Servidor
initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`====================================================`);
    console.log(`Servidor Iglesia Familias de Paz ejecutándose (Postgres)`);
    console.log(`Puerto: http://localhost:${PORT}`);
    console.log(`Web Oficial: http://localhost:${PORT}`);
    console.log(`Discipulado Alumnos: http://localhost:${PORT}/discipulado`);
    console.log(`Discipulado Paidagogos: http://localhost:${PORT}/discipulado/paidagogos`);
    console.log(`Discipulado Admin: http://localhost:${PORT}/discipulado/admin`);
    console.log(`====================================================`);
  });
});
