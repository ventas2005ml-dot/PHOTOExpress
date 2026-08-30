require('dotenv').config()
const express = require('express')
const cors = require('cors')
const db = require('./config/database')

const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.json({ mensaje: 'PHOTOExpress API funcionando', version: '1.0.0' })
})

module.exports = app