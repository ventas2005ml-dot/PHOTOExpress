const express = require('express')
const router = express.Router()
const multer = require('multer')
const { subirComprobante } = require('./upload.controller')

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })

router.post('/comprobante', upload.single('archivo'), subirComprobante)

module.exports = router
