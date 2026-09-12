const NEXTCLOUD_URL = process.env.NEXTCLOUD_URL || 'http://192.168.1.3:8090'
const NEXTCLOUD_USER = process.env.NEXTCLOUD_USER || 'Photoexpress'
const NEXTCLOUD_PASS = process.env.NEXTCLOUD_PASS || 'w2Gp2-gmFTN-cGyGp-HYXZE-BEj2i'
const NEXTCLOUD_FOLDER = 'comprobantes'

const subirComprobante = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió archivo' })

    const ext = req.file.originalname.split('.').pop()
    const filename = `comprobante_${Date.now()}.${ext}`
    const webdavUrl = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${NEXTCLOUD_FOLDER}/${filename}`

    const auth = Buffer.from(`${NEXTCLOUD_USER}:${NEXTCLOUD_PASS}`).toString('base64')

    const response = await fetch(webdavUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': req.file.mimetype,
      },
      body: req.file.buffer,
    })

    if (!response.ok) {
      return res.status(500).json({ error: 'Error al subir a Nextcloud: ' + response.status })
    }

    const url = `${NEXTCLOUD_URL}/remote.php/dav/files/${NEXTCLOUD_USER}/${NEXTCLOUD_FOLDER}/${filename}`
    res.json({ url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al subir comprobante' })
  }
}

module.exports = { subirComprobante }
