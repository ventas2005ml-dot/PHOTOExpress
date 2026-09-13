const express = require('express')
const router = express.Router()
const { registro, login, actualizarPerfil, cambiarPassword } = require('./auth.controller')

router.post('/registro', registro)
router.post('/login', login)
router.put('/perfil/:id', actualizarPerfil)
router.put('/password/:id', cambiarPassword)

module.exports = router