const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const { readDB, writeDB } = require('./db');

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
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDB();
  
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').toLowerCase() || u.email.toLowerCase() === (username || '').toLowerCase());
  
  if (!user) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  const validPassword = bcrypt.compareSync(password, user.passwordHash);
  if (!validPassword) {
    return res.status(401).json({ error: 'Usuario o contraseña incorrectos' });
  }

  req.session.user = {
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    role: user.role,
    nivel: user.nivel || ''
  };

  res.json({ success: true, user: req.session.user });
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
    if (roles.length && !roles.includes(req.session.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado. Rol insuficiente.' });
    }
    next();
  };
}

// --------------------------------------------------------------------------
// RUTAS API - ESTUDIANTES (/discipulado)
// --------------------------------------------------------------------------
app.get('/api/student/dashboard', authRole(['student', 'paidagogo', 'admin']), (req, res) => {
  const db = readDB();
  const userId = req.query.studentId || req.session.user.id;
  
  const student = db.users.find(u => u.id === userId);
  const classes = db.classes;
  const grades = db.grades.filter(g => g.studentId === userId);

  res.json({
    student: student ? { id: student.id, nombre: student.nombre, nivel: student.nivel } : null,
    classes,
    grades
  });
});

// --------------------------------------------------------------------------
// RUTAS API - PAIDAGOGOS (/discipulado/paidagogos)
// --------------------------------------------------------------------------
app.get('/api/paidagogo/students', authRole(['paidagogo', 'admin']), (req, res) => {
  const db = readDB();
  const students = db.users.filter(u => u.role === 'student');
  const grades = db.grades;

  const studentsWithGrades = students.map(s => ({
    ...s,
    grades: grades.filter(g => g.studentId === s.id)
  }));

  res.json(studentsWithGrades);
});

app.post('/api/paidagogo/grades', authRole(['paidagogo', 'admin']), (req, res) => {
  const { studentId, unidad, nota, asistencia, observaciones } = req.body;
  const db = readDB();

  const newGrade = {
    id: 'g_' + Date.now(),
    studentId,
    unidad,
    nota: parseFloat(nota),
    asistencia: asistencia || '100%',
    observaciones: observaciones || ''
  };

  db.grades.push(newGrade);
  writeDB(db);

  res.json({ success: true, grade: newGrade });
});

app.put('/api/paidagogo/grades/:id', authRole(['paidagogo', 'admin']), (req, res) => {
  const gradeId = req.params.id;
  const { nota, asistencia, observaciones, unidad } = req.body;
  const db = readDB();

  const index = db.grades.findIndex(g => g.id === gradeId);
  if (index === -1) {
    return res.status(404).json({ error: 'Calificación no encontrada' });
  }

  db.grades[index] = {
    ...db.grades[index],
    unidad: unidad || db.grades[index].unidad,
    nota: nota !== undefined ? parseFloat(nota) : db.grades[index].nota,
    asistencia: asistencia !== undefined ? asistencia : db.grades[index].asistencia,
    observaciones: observaciones !== undefined ? observaciones : db.grades[index].observaciones
  };

  writeDB(db);
  res.json({ success: true, grade: db.grades[index] });
});

// --------------------------------------------------------------------------
// RUTAS API - ADMIN (/discipulado/admin)
// --------------------------------------------------------------------------
app.get('/api/admin/overview', authRole(['admin']), (req, res) => {
  const db = readDB();
  res.json({
    users: db.users.map(u => ({ id: u.id, username: u.username, nombre: u.nombre, email: u.email, role: u.role, nivel: u.nivel })),
    classes: db.classes,
    gradesCount: db.grades.length
  });
});

// Crear usuario
app.post('/api/admin/users', authRole(['admin']), (req, res) => {
  const { username, password, nombre, email, role, nivel } = req.body;
  const db = readDB();

  if (db.users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
    return res.status(400).json({ error: 'El nombre de usuario ya existe' });
  }

  const newUser = {
    id: 'u_' + Date.now(),
    username,
    passwordHash: bcrypt.hashSync(password || '123456', 10),
    nombre,
    email,
    role: role || 'student',
    nivel: nivel || 'Nivel 1'
  };

  db.users.push(newUser);
  writeDB(db);

  res.json({ success: true, user: { id: newUser.id, username: newUser.username, role: newUser.role } });
});

// Crear/Subir clase con PPT y Youtube
app.post('/api/admin/classes', authRole(['admin']), (req, res) => {
  const { titulo, nivel, youtubeUrl, pptUrl, descripcion, fecha } = req.body;
  const db = readDB();

  const newClass = {
    id: 'c_' + Date.now(),
    titulo,
    nivel: nivel || 'Nivel 1',
    youtubeUrl,
    youtubeId: getYoutubeId(youtubeUrl),
    pptUrl,
    descripcion,
    fecha: fecha || new Date().toISOString().split('T')[0]
  };

  db.classes.push(newClass);
  writeDB(db);

  res.json({ success: true, classItem: newClass });
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
app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`Servidor Iglesia Familias de Paz ejecutándose`);
  console.log(`Puerto: http://localhost:${PORT}`);
  console.log(`Web Oficial: http://localhost:${PORT}`);
  console.log(`Discipulado Alumnos: http://localhost:${PORT}/discipulado`);
  console.log(`Discipulado Paidagogos: http://localhost:${PORT}/discipulado/paidagogos`);
  console.log(`Discipulado Admin: http://localhost:${PORT}/discipulado/admin`);
  console.log(`====================================================`);
});
