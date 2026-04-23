// Nazifa Ahmed (261112966)
require('dotenv').config()

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

const DEPLOYED_FRONTEND_ORIGIN =
  'https://winter2026-comp307-group39.cs.mcgill.ca'

function isAllowedFrontendOrigin(origin) {
  // Allow local frontend dev servers on any localhost port.
  if (!origin) return true
  if (origin === DEPLOYED_FRONTEND_ORIGIN) return true
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
app.use('/api/recurringSlots', recurringSlotRoutes); // added by Bonita
app.use('/api/meetingRequests', meetingRequestRoutes); // added by Bonita
app.use('/api/groupMeeting', groupMeetingRoutes); // added by Bonita
app.use('/api/invites', inviteRoutes); // added by sophia
app.use('/api/calendar', calendarRoutes); // added by Bonita

app.get('/api/health', (req, res) => {
  res.json({ message: 'server running' })
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
