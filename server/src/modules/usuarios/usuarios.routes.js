const express = require('express')
const router = express.Router()
const { getUsuarios, crearEmpleado } = require('./usuarios.controller')

router.get('/', getUsuarios)
router.post('/empleado', crearEmpleado)

module.exports = router