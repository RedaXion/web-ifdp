CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'student',
    nivel VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS classes (
    id VARCHAR(50) PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    nivel VARCHAR(100) NOT NULL,
    youtube_id VARCHAR(50),
    ppt_url TEXT,
    apunte_url TEXT,
    descripcion TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS evaluations (
    id VARCHAR(50) PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    nivel VARCHAR(100) NOT NULL,
    puntaje_total NUMERIC(5, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grades (
    id VARCHAR(50) PRIMARY KEY,
    student_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    evaluation_id VARCHAR(50) REFERENCES evaluations(id) ON DELETE CASCADE,
    puntaje_obtenido NUMERIC(5, 2) NOT NULL,
    nota NUMERIC(3, 1) NOT NULL,
    porcentaje INTEGER NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, evaluation_id)
);

CREATE TABLE IF NOT EXISTS attendance (
    id VARCHAR(50) PRIMARY KEY,
    class_id VARCHAR(50) REFERENCES classes(id) ON DELETE CASCADE,
    student_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'presente',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, class_id)
);

-- Inserción de usuario administrador por defecto si no existe
INSERT INTO users (id, nombre, username, password_hash, role, nivel)
VALUES ('u_admin_1', 'Pastor Christopher Rodríguez', 'admin', '$2a$10$eDMfTFgVUa33odqN2SGvnusyAsfdl47uVGB88f2nK9FkaL8JBn3S6', 'admin', 'Admin')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash;

-- Inserción de un paidagogo por defecto si no existe
INSERT INTO users (id, nombre, username, password_hash, role, nivel)
VALUES ('u_paidagogo_1', 'Paidagogo Juan Pérez', 'paidagogo1', '$2a$10$kF.UDTrmiK6Bu2PLhs1XAunqAy.QUMyrIfI4DOLpQcGbrLY34u8sa', 'paidagogo', 'Nivel 1: Corderitos')
ON CONFLICT (username) DO UPDATE SET password_hash = EXCLUDED.password_hash, nivel = EXCLUDED.nivel;

CREATE TABLE IF NOT EXISTS nota_noa (
    id SERIAL PRIMARY KEY,
    pedagogo_id VARCHAR(50) REFERENCES users(id) ON DELETE CASCADE,
    evaluacion_id VARCHAR(50) REFERENCES evaluations(id) ON DELETE CASCADE,
    archivo_url TEXT NOT NULL,
    fecha_subida TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
