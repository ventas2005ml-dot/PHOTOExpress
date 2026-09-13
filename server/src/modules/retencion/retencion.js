const db = require('../../config/database')

const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.3:8090'
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || 'Photoexpress'
const NEXTCLOUD_PASS = process.env.NEXTCLOUD_PASS || 'w2Gp2-gmFTN-cGyGp-HYXZE-BEj2i'
const DIAS_RETENCION = parseInt(process.env.DIAS_RETENCION) || 10

const auth = Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASS}`).toString('base64')

const borrarArchivoNextcloud = async (url) => {
  try {
    // Extraer el path relativo del archivo desde la URL
    const path = url.replace(`${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}`, '')
    const deleteUrl = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}${path}`
    await fetch(deleteUrl, { method: 'DELETE', headers: { Authorization: `Basic ${auth}` } })
  } catch (e) {
    console.error('Error borrando archivo de Nextcloud:', e.message)
  }
}

const borrarMaterialPedido = async (pedidoId) => {
  const result = await db.query('SELECT archivos_urls FROM pedidos WHERE id = $1', [pedidoId])
  if (!result.rows.length || !result.rows[0].archivos_urls?.length) return 0

  const urls = result.rows[0].archivos_urls
  for (const url of urls) {
    await borrarArchivoNextcloud(url)
  }

  await db.query(
    'UPDATE pedidos SET archivos_urls = $1, material_borrado_en = NOW() WHERE id = $2',
    ['{}', pedidoId]
  )

  return urls.length
}

const limpiezaAutomatica = async () => {
  const result = await db.query(`
    SELECT id FROM pedidos
    WHERE estado = 'finalizado'
    AND finalizado_en < NOW() - INTERVAL '${DIAS_RETENCION} days'
    AND material_borrado_en IS NULL
    AND archivos_urls != '{}'
  `)

  let total = 0
  for (const row of result.rows) {
    const cantidad = await borrarMaterialPedido(row.id)
    total += cantidad
    console.log(`Material borrado del pedido ${row.id}: ${cantidad} archivo(s)`)
  }
  console.log(`Limpieza automática completada: ${total} archivo(s) borrado(s) de ${result.rows.length} pedido(s)`)
  return { pedidos: result.rows.length, archivos: total }
}

module.exports = { borrarMaterialPedido, limpiezaAutomatica }
