const db = require('../../config/database')
const bcrypt = require('bcryptjs')

const getUsuarios = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, nombre, email, rol, activo, creado_en FROM usuarios ORDER BY creado_en DESC'
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' })
  }
}

const crearEmpleado = async (req, res) => {
  try {
    const { nombre, email, password } = req.body
    const existe = await db.query('SELECT id FROM usuarios WHERE email = $1', [email])
    if (existe.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya esta registrado' })
    }
    const passwordHash = await bcrypt.hash(password, 10)
    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, passwordHash, 'empleado']
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al crear empleado' })
  }
}

module.exports = { getUsuarios, crearEmpleado }