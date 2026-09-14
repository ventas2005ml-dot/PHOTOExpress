const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.3:8090'
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || 'Photoexpress'
const NEXTCLOUD_PASS = process.env.NEXTCLOUD_PASS || 'w2Gp2-gmFTN-cGyGp-HYXZE-BEj2i'
const BASE_FOLDER = 'comprobantes'

const auth = Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASS}`).toString('base64')

const crearCarpeta = async (path) => {
  const url = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${path}`
  await fetch(url, { method: 'MKCOL', headers: { Authorization: `Basic ${auth}` } })
}

const subirComprobante = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibio archivo' })

    const codigo = req.body.codigo || null
    const filename = req.file.originalname

    let folder = BASE_FOLDER
    if (codigo) {
      folder = `${BASE_FOLDER}/${codigo}`
      await crearCarpeta(folder)
    }

    const webdavUrl = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${folder}/${filename}`

    const response = await fetch(webdavUrl, {
      method: 'PUT',
      headers: { Authorization: `Basic ${auth}`, 'Content-Type': req.file.mimetype },
      body: req.file.buffer,
    })

    if (!response.ok) {
      return res.status(500).json({ error: 'Error al subir a Nextcloud: ' + response.status })
    }

    res.json({ url: webdavUrl })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al subir comprobante' })
  }
}

module.exports = { subirComprobante }
