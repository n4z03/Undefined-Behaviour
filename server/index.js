// Nazifa Ahmed (261112966)
require('dotenv').config()

const path = require('path')
const fs = require('fs')
const express = require('express')
const cors = require('cors')
const session = require('express-session')

const authenticationRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
const ownerRoutes = require('./routes/owners');
const ownerSlotsRoutes = require('./routes/ownerSlots'); // added by sophia
const inviteRoutes = require('./routes/invites'); // added by sophia
const recurringSlotRoutes = require('./routes/recurringSlots'); // added by Bonita
const meetingRequestRoutes = require('./routes/meetingRequests'); // added by Bonita
const groupMeetingRoutes = require('./routes/groupMeeting'); // added by Bonita
const calendarRoutes = require('./routes/calendar'); // added by Bonita


const app = express()
const port = process.env.PORT || 3000

// Behind nginx with HTTPS: req.ip / secure cookies 
app.set('trust proxy', 1)

const distDir = path.join(__dirname, '../frontend/dist')
const distIndex = path.join(distDir, 'index.html')

const extraCorsOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

function isAllowedFrontendOrigin(origin) {
  // Allow local frontend dev servers on any localhost port.
  if (!origin) return true
  // this block is also AI generated. 
  if (/^http:\/\/localhost:\d+$/.test(origin)) return true
  if (extraCorsOrigins.length && extraCorsOrigins.includes(origin)) return true
  return false
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

  saveUninitialized: false,
  proxy: process.env.NODE_ENV === 'production',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  }
})) // added by sophia
app.use('/api/auth', authenticationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/owners', ownerRoutes);
app.use('/api/ownerSlots', ownerSlotsRoutes); // added by sophia
app.use('/api/recurringSlots', recurringSlotRoutes); // added by Bonita
app.use('/api/meetingRequests', meetingRequestRoutes); // added by Bonita
app.use('/api/groupMeeting', groupMeetingRoutes); // added by Bonita
app.use('/api/invites', inviteRoutes); // added by sophia
app.use('/api/calendar', calendarRoutes); // added by Bonita

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})


// Production: serve Vite build so one process can be nginx upstream (static + /api on same host).
if (fs.existsSync(distIndex)) {
  app.use(express.static(distDir))
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return res.status(404).json({ error: 'Not found' })
    }
    res.sendFile(distIndex, (err) => (err ? next(err) : undefined))
  })
} else {
  console.warn('No built frontend at frontend/dist (run: cd frontend && npm run build). API-only mode.')
}

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
