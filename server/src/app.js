require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./config/database')
const authRoutes = require('./modules/auth/auth.routes')
const catalogoRoutes = require('./modules/catalogo/catalogo.routes')
const pedidosRoutes = require('./modules/pedidos/pedidos.routes')
const pagosRoutes = require('./modules/pagos/pagos.routes')
const usuariosRoutes = require('./modules/usuarios/usuarios.routes')
const adminRoutes = require('./modules/admin/admin.routes')
const uploadRoutes = require('./modules/upload/upload.routes')
const comprobantesRoutes = require('./modules/comprobantes/comprobantes.routes')
const { limpiezaAutomatica } = require('./modules/retencion/retencion')

const app = express()

app.use(cors())
app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/catalogo', catalogoRoutes)
app.use('/api/pedidos', pedidosRoutes)
app.use('/api/pagos', pagosRoutes)
app.use('/api/usuarios', usuariosRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/comprobantes', comprobantesRoutes)

// Endpoint manual de limpieza
app.post('/api/admin/limpiar-material', async (req, res) => {
  const { borrarMaterialPedido, limpiezaAutomatica } = require('./modules/retencion/retencion')
  const { pedido_id } = req.body
  if (pedido_id) {
    const cantidad = await borrarMaterialPedido(pedido_id)
    return res.json({ mensaje: `${cantidad} archivo(s) borrado(s)` })
  }
  const resultado = await limpiezaAutomatica()
  res.json(resultado)
})

// Cron job nocturno — todos los días a las 3am
const cron = require('node-cron')
cron.schedule('0 3 * * *', () => {
  console.log('Ejecutando limpieza automática de material...')
  limpiezaAutomatica()
})

app.get('/', (req, res) => {
  res.json({ mensaje: 'PHOTOExpress API funcionando', version: '1.0.0' })
})

module.exports = app