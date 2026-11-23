// Prepara una base de datos NUEVA (p. ej. en Neon o Render) para publicar el sistema. Es idempotente: se puede repetir.
//   1) Si no existe la tabla `usuarios`, aplica database/schema.sql (incluye PostGIS y todas las tablas).
//   2) Crea los 4 usuarios internos (uno por rol) con la clave de USUARIOS_PASSWORD. No toca los que ya existen.
// No siembra ofertas de ejemplo. Uso:
//   DATABASE_URL=postgres://... USUARIOS_PASSWORD='una clave larga' node scripts/inicializar-bd.js
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const pool = require('../src/config/db');

const USUARIOS = [
  ['Área Técnica', 'tecnica'],
  ['Área Legal', 'legal'],
  ['Área Administrativa', 'administrativa'],
  ['Gerencia', 'gerencia'],
];

(async () => {
  const clave = process.env.USUARIOS_PASSWORD || '';
  if (clave.length < 10) throw new Error('Defina USUARIOS_PASSWORD con al menos 10 caracteres (es la clave de los 4 usuarios internos).');
  if (clave === 'leones123') throw new Error('USUARIOS_PASSWORD no puede ser la clave de pruebas (leones123).');
  const dominio = process.env.CORREO_DOMINIO || 'leones.test';

  const { rows: [{ existe }] } = await pool.query("SELECT to_regclass('public.usuarios') IS NOT NULL AS existe");
  if (existe) {
    console.log('El esquema ya existe: no se vuelve a aplicar.');
  } else {
    await pool.query(fs.readFileSync(path.join(__dirname, '../../database/schema.sql'), 'utf8'));
    console.log('Esquema aplicado (PostGIS y tablas).');
  }

  const hash = await bcrypt.hash(clave, 10);
  for (const [nombre, rol] of USUARIOS) {
    const { rowCount } = await pool.query(
      'INSERT INTO usuarios (nombre, correo, rol, password_hash) VALUES ($1,$2,$3,$4) ON CONFLICT (correo) DO NOTHING',
      [nombre, `${rol}@${dominio}`, rol, hash]);
    console.log(`${rol}@${dominio}: ${rowCount ? 'creado' : 'ya existía (no se cambió su clave)'}`);
  }
  await pool.end();
})().catch((err) => { console.error(err.message); process.exit(1); });
