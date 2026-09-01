const db = require("../../config/database")

const getEstadisticas = async (req, res) => {
  try {
    const pedidosHoy = await db.query("SELECT COUNT(*) FROM pedidos WHERE DATE(creado_en) = CURRENT_DATE")
    const pedidosPorEstado = await db.query("SELECT estado, COUNT(*) as cantidad FROM pedidos GROUP BY estado")
    const ingresosTotales = await db.query("SELECT COALESCE(SUM(monto_final),0) as total FROM pagos WHERE estado = 'confirmado'")
    const ingresosHoy = await db.query("SELECT COALESCE(SUM(monto_final),0) as total FROM pagos WHERE estado = 'confirmado' AND DATE(creado_en) = CURRENT_DATE")
    const pendientesPago = await db.query("SELECT COUNT(*) FROM pedidos WHERE estado = 'pendiente'")
    const metodosPago = await db.query("SELECT metodo, COUNT(*) as cantidad, SUM(monto_final) as total FROM pagos WHERE estado = 'confirmado' GROUP BY metodo")
    res.json({
      pedidos_hoy: parseInt(pedidosHoy.rows[0].count),
      pedidos_por_estado: pedidosPorEstado.rows,
      ingresos_totales: parseFloat(ingresosTotales.rows[0].total),
      ingresos_hoy: parseFloat(ingresosHoy.rows[0].total),
      pendientes_pago: parseInt(pendientesPago.rows[0].count),
      metodos_pago: metodosPago.rows
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error al obtener estadisticas" })
  }
}

const getReporteVentas = async (req, res) => {
  try {
    const { desde, hasta } = req.query
    const fechaDesde = desde || new Date(new Date().setDate(1)).toISOString().split("T")[0]
    const fechaHasta = hasta || new Date().toISOString().split("T")[0]
    const ventas = await db.query(
      "SELECT p.codigo, p.creado_en, p.estado, u.nombre as cliente, pg.metodo, pg.monto_final, pg.estado as pago_estado FROM pedidos p LEFT JOIN usuarios u ON p.usuario_id = u.id LEFT JOIN pagos pg ON pg.pedido_id = p.id WHERE DATE(p.creado_en) BETWEEN $1 AND $2 ORDER BY p.creado_en DESC",
      [fechaDesde, fechaHasta]
    )
    const total = ventas.rows.filter(v => v.pago_estado === "confirmado").reduce((s, v) => s + parseFloat(v.monto_final || 0), 0)
    res.json({ desde: fechaDesde, hasta: fechaHasta, total, ventas: ventas.rows })
  } catch (error) {
    res.status(500).json({ error: "Error al obtener reporte" })
  }
}

module.exports = { getEstadisticas, getReporteVentas }
