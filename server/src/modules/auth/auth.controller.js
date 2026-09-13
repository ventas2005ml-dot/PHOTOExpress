const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const db = require('../../config/database')

const registro = async (req, res) => {
  try {
    const { nombre, email, password, rol = 'cliente' } = req.body

    const usuarioExiste = await db.query(
      'SELECT id FROM usuarios WHERE email = $1',
      [email]
    )

    if (usuarioExiste.rows.length > 0) {
      return res.status(400).json({ error: 'El email ya está registrado' })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const result = await db.query(
      'INSERT INTO usuarios (nombre, email, password, rol, activo) VALUES ($1, $2, $3, $4, $5) RETURNING id, nombre, email, rol, activo',
      [nombre, email, passwordHash, rol, rol !== 'cliente']
    )

    const usuario = result.rows[0]

    if (rol === 'cliente') {
      return res.status(201).json({ mensaje: 'Registro exitoso. Tu cuenta será activada por el administrador.' })
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.status(201).json({ usuario, token })
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar usuario' })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    const result = await db.query(
      'SELECT * FROM usuarios WHERE email = $1 AND activo = true',
      [email]
    )

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const usuario = result.rows[0]
    const passwordValido = await bcrypt.compare(password, usuario.password)

    if (!passwordValido) {
      return res.status(401).json({ error: 'Credenciales incorrectas' })
    }

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    )

    res.json({
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
      token
    })
  } catch (error) {
    res.status(500).json({ error: 'Error al iniciar sesión' })
  }
}

const actualizarPerfil = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre } = req.body
    const result = await db.query(
      'UPDATE usuarios SET nombre = $1 WHERE id = $2 RETURNING id, nombre, email, rol',
      [nombre, id]
    )
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar perfil' })
  }
}

const cambiarPassword = async (req, res) => {
  try {
    const { id } = req.params
    const { password_actual, password_nueva } = req.body
    const result = await db.query('SELECT password FROM usuarios WHERE id = $1', [id])
    if (result.rows.length === 0) return res.status(404).json({ error: 'Usuario no encontrado' })
    const valido = await bcrypt.compare(password_actual, result.rows[0].password)
    if (!valido) return res.status(400).json({ error: 'La contraseña actual es incorrecta' })
    const hash = await bcrypt.hash(password_nueva, 10)
    await db.query('UPDATE usuarios SET password = $1 WHERE id = $2', [hash, id])
    res.json({ mensaje: 'Contraseña actualizada' })
  } catch (error) {
    res.status(500).json({ error: 'Error al cambiar contraseña' })
  }
}

module.exports = { registro, login, actualizarPerfil, cambiarPassword }