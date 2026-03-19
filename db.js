// db.js — Base de datos en archivo JSON (sin compiladores, funciona en cualquier PC)
const fs   = require('fs');
const path = require('path');

const FILE = path.join(__dirname, 'datos.json');

const SEED = {
  usuarios: [
    { id:1, username:'admin',      password:'1234', nombre:'Administrador',    rol:'gestor_operativo' },
    { id:2, username:'operador',   password:'1234', nombre:'Operador Principal',rol:'operador_rutas'   },
    { id:3, username:'conductor1', password:'1234', nombre:'Carlos Muñoz',     rol:'conductor'        }
  ],
  rutas: [
    { id:1, codigo:'RT-001', descripcion:'Ruta Norte — Terminal El Turín hacia Centro Comercial Campanario', tiempo_min:45, estado:'activo',   creado_en:'2026-03-01' },
    { id:2, codigo:'RT-002', descripcion:'Ruta Sur — SENA hacia Hospital Susana López',                       tiempo_min:60, estado:'activo',   creado_en:'2026-03-01' },
    { id:3, codigo:'RT-003', descripcion:'Ruta Universitaria — UniCauca hacia Los Jardines',                  tiempo_min:35, estado:'inactivo', creado_en:'2026-03-01' }
  ],
  paradas: [
    { id:1, ruta_id:1, nombre:'Terminal El Turín',  orden:1 },
    { id:2, ruta_id:1, nombre:'Cra. 6 con Cll. 5',  orden:2 },
    { id:3, ruta_id:1, nombre:'Parque Caldas',       orden:3 },
    { id:4, ruta_id:1, nombre:'Campanario',          orden:4 },
    { id:5, ruta_id:2, nombre:'SENA',                orden:1 },
    { id:6, ruta_id:2, nombre:'Av. Panamericana',    orden:2 },
    { id:7, ruta_id:2, nombre:'Los Arcos',           orden:3 },
    { id:8, ruta_id:2, nombre:'Hospital Susana López',orden:4 },
    { id:9, ruta_id:3, nombre:'UniCauca',            orden:1 },
    {id:10, ruta_id:3, nombre:'La Esmeralda',        orden:2 },
    {id:11, ruta_id:3, nombre:'Los Jardines',        orden:3 }
  ],
  autobuses:   [],
  conductores: [],
  _seq: { rutas:3, paradas:11, autobuses:0, conductores:0 }
};

// Cargar o crear archivo
function load() {
  if (!fs.existsSync(FILE)) {
    fs.writeFileSync(FILE, JSON.stringify(SEED, null, 2));
    console.log('✅ Base de datos creada con datos de ejemplo');
  }
  return JSON.parse(fs.readFileSync(FILE, 'utf8'));
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

function nextId(data, table) {
  data._seq[table] = (data._seq[table] || 0) + 1;
  return data._seq[table];
}

module.exports = { load, save, nextId };
