// Nazifa Ahmed (261112966)
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')

const authenticationRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owners');
const ownerSlotsRoutes = require('./routes/ownerSlots'); // added by sophia

const app = express()
const port = process.env.PORT || 3000

function isAllowedFrontendOrigin(origin) {
  // Allow local frontend dev servers on any localhost port.
  if (!origin) return true
  return /^http:\/\/localhost:\d+$/.test(origin)
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedFrontendOrigin(origin)) return callback(null, true)
    return callback(new Error('CORS blocked: unapproved origin'))
  },
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

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
