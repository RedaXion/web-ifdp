const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../db/database.json');

// Initial default database structure
const initialData = {
  users: [
    {
      id: "u_admin_1",
      username: "admin",
      passwordHash: bcrypt.hashSync("admin123", 10),
      nombre: "Pastor Christopher Rodríguez",
      email: "admin@ifdp.cl",
      role: "admin"
    },
    {
      id: "u_paidagogo_1",
      username: "paidagogo1",
      passwordHash: bcrypt.hashSync("profe123", 10),
      nombre: "Paidagogo Juan Pérez",
      email: "juan@ifdp.cl",
      role: "paidagogo"
    },
    {
      id: "u_student_1",
      username: "alumno1",
      passwordHash: bcrypt.hashSync("estudiante123", 10),
      nombre: "María González",
      email: "maria@gmail.com",
      role: "student",
      nivel: "Nivel 1: Cimientos de la Fe"
    }
  ],
  classes: [
    {
      id: "c_1",
      titulo: "Clase 1: La Identidad del Hijo de Dios",
      nivel: "Nivel 1",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      pptUrl: "https://example.com/ppt-clase1.pdf",
      apunteUrl: "https://example.com/apunte-clase1.pdf",
      descripcion: "En esta lección comprendemos el fundamento del nuevo nacimiento y la adopción como hijos.",
      fecha: "2026-08-01"
    },
    {
      id: "c_2",
      titulo: "Clase 2: El Poder de la Oración Diaria",
      nivel: "Nivel 1",
      youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      youtubeId: "dQw4w9WgXcQ",
      pptUrl: "https://example.com/ppt-clase2.pdf",
      apunteUrl: "https://example.com/apunte-clase2.pdf",
      descripcion: "Cómo cultivar una vida íntima de oración y comunión con el Espíritu Santo.",
      fecha: "2026-08-08"
    }
  ],
  grades: [
    {
      id: "g_1",
      studentId: "u_student_1",
      unidad: "Evaluación 1",
      puntajeObtenido: 25,
      puntajeTotal: 30,
      nota: 5.8,
      porcentaje: 83,
      observaciones: "Excelente participación."
    }
  ],
  attendance: [
    {
      id: "a_1",
      classId: "c_1",
      studentId: "u_student_1",
      status: "presente"
    }
  ]
};

function initDB() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(initialData, null, 2));
  }
}

function readDB() {
  initDB();
  const raw = fs.readFileSync(dbPath, 'utf8');
  return JSON.parse(raw);
}

function writeDB(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  readDB,
  writeDB
};
