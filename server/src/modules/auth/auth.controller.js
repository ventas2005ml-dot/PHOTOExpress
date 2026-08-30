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
      'INSERT INTO usuarios (nombre, email, password, rol) VALUES ($1, $2, $3, $4) RETURNING id, nombre, email, rol',
      [nombre, email, passwordHash, rol]
    )

    const usuario = result.rows[0]
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

module.exports = { registro, login }