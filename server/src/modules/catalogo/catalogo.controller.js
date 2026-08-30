const db = require('../../config/database')

const getCategorias = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM categorias WHERE activo = true ORDER BY nombre'
    )
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener categorias' })
  }
}

const getServicios = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT s.*, c.nombre as categoria_nombre 
      FROM servicios s
      LEFT JOIN categorias c ON s.categoria_id = c.id
      WHERE s.activo = true
      ORDER BY c.nombre, s.nombre
    `)
    res.json(result.rows)
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener servicios' })
  }
}

const crearCategoria = async (req, res) => {
  try {
    const { nombre, descripcion } = req.body
    const result = await db.query(
      'INSERT INTO categorias (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre, descripcion]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al crear categoria' })
  }
}

const crearServicio = async (req, res) => {
  try {
    const { categoria_id, nombre, descripcion, precio } = req.body
    const result = await db.query(
      'INSERT INTO servicios (categoria_id, nombre, descripcion, precio) VALUES ($1, $2, $3, $4) RETURNING *',
      [categoria_id, nombre, descripcion, precio]
    )
    res.status(201).json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al crear servicio' })
  }
}

const actualizarServicio = async (req, res) => {
  try {
    const { id } = req.params
    const { nombre, descripcion, precio, activo } = req.body
    const result = await db.query(
      'UPDATE servicios SET nombre=$1, descripcion=$2, precio=$3, activo=$4 WHERE id=$5 RETURNING *',
      [nombre, descripcion, precio, activo, id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' })
    }
    res.json(result.rows[0])
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar servicio' })
  }
}

module.exports = { getCategorias, getServicios, crearCategoria, crearServicio, actualizarServicio }