// server.js — Sotracauca Gestión de Buses
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { load, save, nextId } = require('./db');

const app  = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── LOGIN ──────────────────────────────────────────
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  const data = load();
  const user = data.usuarios.find(u => u.username === username && u.password === password);
  if (!user) return res.status(401).json({ error: 'Credenciales incorrectas' });
  res.json({ ok: true, usuario: { id: user.id, nombre: user.nombre, rol: user.rol, username: user.username } });
});

// ── RUTAS ──────────────────────────────────────────
app.get('/api/rutas', (req, res) => {
  const data = load();
  const q = (req.query.q || '').toLowerCase();
  let rutas = data.rutas;
  if (q) rutas = rutas.filter(r => r.codigo.toLowerCase().includes(q) || r.descripcion.toLowerCase().includes(q));
  const result = rutas.map(r => ({
    ...r,
    total_paradas: data.paradas.filter(p => p.ruta_id === r.id).length
  }));
  res.json(result.reverse());
});

app.get('/api/rutas/:id', (req, res) => {
  const data = load();
  const ruta = data.rutas.find(r => r.id === parseInt(req.params.id));
  if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
  const paradas = data.paradas.filter(p => p.ruta_id === ruta.id).sort((a,b) => a.orden - b.orden);
  res.json({ ...ruta, paradas });
});

app.post('/api/rutas', (req, res) => {
  const { codigo, descripcion, tiempo_min, estado = 'activo', paradas = [] } = req.body;
  if (!codigo)      return res.status(400).json({ error: 'El código es obligatorio' });
  if (!descripcion) return res.status(400).json({ error: 'La descripción es obligatoria' });
  if (!tiempo_min || tiempo_min < 1) return res.status(400).json({ error: 'El tiempo debe ser mayor a 0' });

  const data = load();
  const codigoUpper = codigo.toUpperCase();
  if (data.rutas.find(r => r.codigo === codigoUpper))
    return res.status(409).json({ error: `Ya existe una ruta con código ${codigoUpper}` });

  const id = nextId(data, 'rutas');
  const ruta = { id, codigo: codigoUpper, descripcion, tiempo_min, estado, creado_en: new Date().toISOString().split('T')[0] };
  data.rutas.push(ruta);

  const paradasGuardadas = paradas.map((nombre, i) => {
    const pid = nextId(data, 'paradas');
    const p = { id: pid, ruta_id: id, nombre, orden: i + 1 };
    data.paradas.push(p);
    return p;
  });

  save(data);
  res.status(201).json({ ...ruta, paradas: paradasGuardadas, message: `Ruta ${codigoUpper} creada exitosamente` });
});

app.put('/api/rutas/:id', (req, res) => {
  const { descripcion, tiempo_min, estado, paradas = [] } = req.body;
  const id = parseInt(req.params.id);
  if (!descripcion)          return res.status(400).json({ error: 'La descripción es obligatoria' });
  if (!tiempo_min || tiempo_min < 1) return res.status(400).json({ error: 'Tiempo inválido' });

  const data = load();
  const idx = data.rutas.findIndex(r => r.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Ruta no encontrada' });

  data.rutas[idx] = { ...data.rutas[idx], descripcion, tiempo_min, estado: estado || data.rutas[idx].estado };
  data.paradas = data.paradas.filter(p => p.ruta_id !== id);
  paradas.forEach((nombre, i) => {
    data.paradas.push({ id: nextId(data, 'paradas'), ruta_id: id, nombre, orden: i + 1 });
  });

  save(data);
  const paradasActuales = data.paradas.filter(p => p.ruta_id === id).sort((a,b) => a.orden - b.orden);
  res.json({ ...data.rutas[idx], paradas: paradasActuales, message: 'Ruta actualizada correctamente' });
});

app.delete('/api/rutas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  const ruta = data.rutas.find(r => r.id === id);
  if (!ruta) return res.status(404).json({ error: 'Ruta no encontrada' });
  data.rutas   = data.rutas.filter(r => r.id !== id);
  data.paradas = data.paradas.filter(p => p.ruta_id !== id);
  save(data);
  res.json({ ok: true, message: `Ruta ${ruta.codigo} eliminada` });
});

// ── AUTOBUSES ──────────────────────────────────────
app.get('/api/autobuses', (req, res) => {
  const data = load();
  res.json([...data.autobuses].reverse());
});

app.post('/api/autobuses', (req, res) => {
  const { placa, marca, modelo, año, capacidad, estado = 'apto' } = req.body;
  if (!placa || !marca || !modelo || !año || !capacidad)
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  const data = load();
  const placaUpper = placa.toUpperCase();
  if (data.autobuses.find(b => b.placa === placaUpper))
    return res.status(409).json({ error: `Ya existe un bus con placa ${placaUpper}` });
  const id = nextId(data, 'autobuses');
  const bus = { id, placa: placaUpper, marca, modelo, año, capacidad, estado, creado_en: new Date().toISOString().split('T')[0] };
  data.autobuses.push(bus);
  save(data);
  res.status(201).json({ ...bus, message: 'Autobús registrado' });
});

app.delete('/api/autobuses/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  const bus = data.autobuses.find(b => b.id === id);
  if (!bus) return res.status(404).json({ error: 'Bus no encontrado' });
  data.autobuses = data.autobuses.filter(b => b.id !== id);
  save(data);
  res.json({ ok: true, message: `Bus ${bus.placa} eliminado` });
});

// ── CONDUCTORES ────────────────────────────────────
app.get('/api/conductores', (req, res) => {
  res.json([...load().conductores].reverse());
});

app.post('/api/conductores', (req, res) => {
  const { cedula, nombre, telefono, licencia, estado = 'activo' } = req.body;
  if (!cedula || !nombre) return res.status(400).json({ error: 'Cédula y nombre son obligatorios' });
  const data = load();
  if (data.conductores.find(c => c.cedula === cedula))
    return res.status(409).json({ error: `Ya existe un conductor con cédula ${cedula}` });
  const id = nextId(data, 'conductores');
  const c = { id, cedula, nombre, telefono: telefono||'', licencia: licencia||'', estado, creado_en: new Date().toISOString().split('T')[0] };
  data.conductores.push(c);
  save(data);
  res.status(201).json({ ...c, message: 'Conductor registrado' });
});

app.delete('/api/conductores/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  const c = data.conductores.find(x => x.id === id);
  if (!c) return res.status(404).json({ error: 'Conductor no encontrado' });
  data.conductores = data.conductores.filter(x => x.id !== id);
  save(data);
  res.json({ ok: true, message: `${c.nombre} eliminado` });
});

// ── FRONTEND ───────────────────────────────────────
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║  🚌  Sotracauca — Gestión de Buses   ║
║  Servidor en: http://localhost:3000  ║
║  Abre esa URL en tu navegador        ║
╚══════════════════════════════════════╝
  `);
});
