const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'mail.photoexpress.com.ar',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || 'info@photoexpress.com.ar',
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false }
})

const enviarMailPedidoRecibido = async ({ nombre, email, codigo, total }) => {
  await transporter.sendMail({
    from: `"PHOTOExpress" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `✅ Pedido ${codigo} recibido — PHOTOExpress`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px 24px;">
          <h1 style="color: white; margin: 0; font-size: 18px;">📷 PHOTOExpress</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="color: #374151; font-size: 15px;">Hola <strong>${nombre}</strong>,</p>
          <p style="color: #374151;">Tu pedido fue recibido y está siendo procesado.</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">Código de pedido</p>
            <p style="margin: 4px 0 0; color: #1d4ed8; font-size: 20px; font-weight: bold;">${codigo}</p>
            ${total ? `<p style="margin: 8px 0 0; color: #374151; font-size: 14px;">Total: <strong>$${parseFloat(total).toLocaleString()}</strong></p>` : ''}
          </div>
          <p style="color: #6b7280; font-size: 13px;">El tiempo de confección es de 48 a 72 horas hábiles. Te avisaremos cuando esté listo.</p>
          <p style="color: #6b7280; font-size: 13px;">Podés seguir el estado de tu pedido desde tu panel en <a href="https://photoexpress.com.ar" style="color: #2563eb;">photoexpress.com.ar</a></p>
        </div>
        <div style="padding: 12px 24px; background: #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">PHOTOExpress — Laboratorio fotográfico digital</p>
        </div>
      </div>
    `
  })
}

const enviarMailPedidoListo = async ({ nombre, email, codigo }) => {
  await transporter.sendMail({
    from: `"PHOTOExpress" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `🎉 Tu pedido ${codigo} está listo para retirar — PHOTOExpress`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #2563eb; padding: 20px 24px;">
          <h1 style="color: white; margin: 0; font-size: 18px;">📷 PHOTOExpress</h1>
        </div>
        <div style="padding: 24px; background: #f9fafb;">
          <p style="color: #374151; font-size: 15px;">Hola <strong>${nombre}</strong>,</p>
          <p style="color: #374151; font-size: 15px;">¡Tu pedido está listo para retirar! 🎉</p>
          <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0; color: #6b7280; font-size: 13px;">Código de pedido</p>
            <p style="margin: 4px 0 0; color: #16a34a; font-size: 20px; font-weight: bold;">${codigo}</p>
          </div>
          <p style="color: #6b7280; font-size: 13px;">Podés pasar a retirarlo en nuestro laboratorio en el horario de atención habitual.</p>
          <p style="color: #6b7280; font-size: 13px;">Ante cualquier consulta podés contactarnos por WhatsApp.</p>
        </div>
        <div style="padding: 12px 24px; background: #e5e7eb; text-align: center;">
          <p style="margin: 0; color: #9ca3af; font-size: 12px;">PHOTOExpress — Laboratorio fotográfico digital</p>
        </div>
      </div>
    `
  })
}

const enviarMailComprobante = async ({ nombre, email, nro, pdfBuffer }) => {
  await transporter.sendMail({
    from: `"PHOTOExpress" <${process.env.SMTP_USER}>`,
    to: email,
    subject: `Comprobante N° ${nro} — PHOTOExpress`,
    html: `<p>Hola <strong>${nombre}</strong>,</p><p>Adjuntamos el comprobante de pago N° ${nro}. Muchas gracias.</p><p>PHOTOExpress</p>`,
    attachments: [{ filename: `comprobante-${nro}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
  })
}

module.exports = { enviarMailPedidoRecibido, enviarMailPedidoListo, enviarMailComprobante }
