require('dotenv').config()

const express = require('express')
const cors = require('cors')

const app = express()
const port = process.env.PORT || 3000

app.use(cors())

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
