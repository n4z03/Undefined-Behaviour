// Nazifa Ahmed (261112966)
require('dotenv').config()

const express = require('express')
const cors = require('cors')

const authenticationRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owners');
const ownerSlotsRoutes = require('./routes/ownerSlots'); // added by sophia

const app = express()
const port = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use('/api/auth', authenticationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/ownerSlots', ownerSlotsRoutes); // added by sophia

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
