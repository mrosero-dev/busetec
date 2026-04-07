// server.js — Sotracauca · Gestión de Rutas
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const { load, save, nextId } = require('./db');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ══════════════════════════════════════════════════
//  LOGIN
// ══════════════════════════════════════════════════
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

  const data = load();
  const user = data.usuarios.find(u => u.username === username && u.password === password);
  if (!user)
    return res.status(401).json({ error: 'Credenciales incorrectas. Verifica tu usuario y contraseña.' });

  res.json({
    ok: true,
    usuario: { id: user.id, nombre: user.nombre, rol: user.rol, username: user.username }
  });
});

// ══════════════════════════════════════════════════
//  RUTAS — HU-1, HU-2, HU-3
// ══════════════════════════════════════════════════

// HU-3 E1/E2: Listar y buscar rutas
app.get('/api/rutas', (req, res) => {
  const data = load();
  const q = (req.query.q || '').toLowerCase().trim();
  let rutas = data.rutas;

  if (q) {
    rutas = rutas.filter(r =>
      r.codigo.toLowerCase().includes(q) ||
      r.descripcion.toLowerCase().includes(q)
    );
  }

  const result = rutas.map(r => ({
    ...r,
    total_paradas: data.paradas.filter(p => p.ruta_id === r.id).length
  }));

  res.json(result.reverse());
});

// HU-3 E1: Ver detalle de ruta por ID
app.get('/api/rutas/:id', (req, res) => {
  const data = load();
  const ruta = data.rutas.find(r => r.id === parseInt(req.params.id));

  // HU-3 E4: Ruta no encontrada
  if (!ruta)
    return res.status(404).json({ error: 'Ruta no encontrada en el sistema.' });

  const paradas = data.paradas
    .filter(p => p.ruta_id === ruta.id)
    .sort((a, b) => a.orden - b.orden);

  res.json({ ...ruta, paradas });
});

// HU-1 E1/E2/E3: Crear ruta
app.post('/api/rutas', (req, res) => {
  const { codigo, descripcion, tiempo_min, estado = 'activo', paradas = [] } = req.body;

  // HU-1 E3: Validar campos obligatorios
  if (!codigo)
    return res.status(400).json({ error: 'El código de la ruta es obligatorio.' });
  if (!descripcion)
    return res.status(400).json({ error: 'La descripción de la ruta es obligatoria.' });
  if (!tiempo_min || Number(tiempo_min) < 1)
    return res.status(400).json({ error: 'El tiempo estimado debe ser mayor a 0 minutos.' });

  const data = load();
  const codigoUpper = codigo.trim().toUpperCase();

  // HU-1 E2: Verificar duplicados
  const existe = data.rutas.find(r => r.codigo === codigoUpper);
  if (existe)
    return res.status(409).json({
      error: `Ya existe una ruta con el código ${codigoUpper}. Por favor usa un identificador diferente.`
    });

  // Verificar similaridad (mismo inicio de descripción)
  const descNorm = descripcion.trim().toLowerCase().slice(0, 30);
  const similar = data.rutas.find(r =>
    r.descripcion.toLowerCase().slice(0, 30) === descNorm
  );
  if (similar)
    return res.status(409).json({
      error: `Existe una ruta muy similar (${similar.codigo}). Verifica que no sea un duplicado o cambia el identificador.`
    });

  const id = nextId(data, 'rutas');
  const ruta = {
    id,
    codigo: codigoUpper,
    descripcion: descripcion.trim(),
    tiempo_min: Number(tiempo_min),
    estado,
    creado_en: new Date().toISOString().split('T')[0]
  };
  data.rutas.push(ruta);

  const paradasGuardadas = paradas.map((nombre, i) => {
    const pid = nextId(data, 'paradas');
    const p = { id: pid, ruta_id: id, nombre: nombre.trim(), orden: i + 1 };
    data.paradas.push(p);
    return p;
  });

  save(data);
  res.status(201).json({
    ...ruta,
    paradas: paradasGuardadas,
    message: `✓ Ruta ${codigoUpper} creada exitosamente. Se ha registrado el recorrido en el sistema.`
  });
});

// HU-2 E1/E2/E3/E4: Actualizar ruta
app.put('/api/rutas/:id', (req, res) => {
  const { descripcion, tiempo_min, estado, paradas = [] } = req.body;
  const id = parseInt(req.params.id);

  // HU-2 E2: Validar datos
  if (!descripcion)
    return res.status(400).json({ error: 'La descripción es obligatoria. No se pueden guardar los cambios.' });
  if (!tiempo_min || Number(tiempo_min) < 1)
    return res.status(400).json({ error: 'El tiempo estimado no es válido. Debe ser mayor a 0.' });

  const data = load();
  const idx = data.rutas.findIndex(r => r.id === id);

  // HU-2 E4: Ruta no encontrada
  if (idx === -1)
    return res.status(404).json({ error: 'La ruta no fue encontrada en el sistema.' });

  data.rutas[idx] = {
    ...data.rutas[idx],
    descripcion: descripcion.trim(),
    tiempo_min: Number(tiempo_min),
    estado: estado || data.rutas[idx].estado
  };

  // Reemplazar paradas
  data.paradas = data.paradas.filter(p => p.ruta_id !== id);
  paradas.forEach((nombre, i) => {
    data.paradas.push({
      id: nextId(data, 'paradas'),
      ruta_id: id,
      nombre: nombre.trim(),
      orden: i + 1
    });
  });

  save(data);
  const paradasActuales = data.paradas
    .filter(p => p.ruta_id === id)
    .sort((a, b) => a.orden - b.orden);

  res.json({
    ...data.rutas[idx],
    paradas: paradasActuales,
    message: `✓ Ruta ${data.rutas[idx].codigo} actualizada correctamente. Los cambios han sido guardados.`
  });
});

// Eliminar ruta
app.delete('/api/rutas/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const data = load();
  const ruta = data.rutas.find(r => r.id === id);
  if (!ruta)
    return res.status(404).json({ error: 'Ruta no encontrada.' });

  data.rutas   = data.rutas.filter(r => r.id !== id);
  data.paradas = data.paradas.filter(p => p.ruta_id !== id);
  save(data);
  res.json({ ok: true, message: `Ruta ${ruta.codigo} eliminada del sistema.` });
});

// ══════════════════════════════════════════════════
//  FRONTEND CATCH-ALL
// ══════════════════════════════════════════════════
app.get('*', (req, res) =>
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
);

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║   🚌  Sotracauca — Gestión de Rutas  ║
║   Servidor: http://localhost:${PORT}   ║
╚══════════════════════════════════════╝
  `);
});
