require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./config/database')
const authRoutes = require('./modules/auth/auth.routes')
const catalogoRoutes = require('./modules/catalogo/catalogo.routes')
const pedidosRoutes = require('./modules/pedidos/pedidos.routes')
const pagosRoutes = require('./modules/pagos/pagos.routes')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/catalogo', catalogoRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/pagos', pagosRoutes)

app.get('/', (req, res) => {
  res.json({ mensaje: 'PHOTOExpress API funcionando', version: '1.0.0' })
})

module.exports = app