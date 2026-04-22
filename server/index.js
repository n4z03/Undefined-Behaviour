// Nazifa Ahmed (261112966)
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')

const authenticationRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owners');
const ownerSlotsRoutes = require('./routes/ownerSlots'); // added by sophia
const recurringSlotRoutes = require('./routes/recurringSlots'); // added by Bonita

const app = express()
const port = process.env.PORT || 3000

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true
}))
app.use(express.json())
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret',
  resave: false,
  saveUninitialized: false
})) // added by sophia
app.use('/api/auth', authenticationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/ownerSlots', ownerSlotsRoutes); // added by sophia
app.use('/api/recurringSlots', recurringSlotRoutes); // added by Bonita

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
