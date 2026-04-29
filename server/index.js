// Nazifa Ahmed (261112966)
// Note: Claude was used to help with disable secure session cookie for class-server deployment
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const session = require('express-session')
const path = require('path')
const SQLiteStore = require('connect-sqlite3')(session)

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

app.set('trust proxy', 1)

const DEPLOYED_FRONTEND_ORIGIN =
  process.env.FRONTEND_ORIGIN || 'https://winter2026-comp307-group39.cs.mcgill.ca'

function isAllowedFrontendOrigin(origin) {
  if (!origin) return true
  if (origin === DEPLOYED_FRONTEND_ORIGIN) return true
  return (
    /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
    /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin)
  )
}

app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedFrontendOrigin(origin)) return callback(null, true)
    return callback(new Error('CORS blocked: unapproved origin'))
  },
  credentials: true
}))
app.use(express.json())
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: false,
    name: 'connect.sid',
    store: new SQLiteStore({
      db: 'sessions.db',
      dir: path.join(__dirname, '..', 'data'),
      table: 'sessions',
    }),
    cookie: {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      // secure must stay false: the class-server nginx terminates TLS and
      // proxies to Express over plain HTTP without forwarding X-Forwarded-Proto.
      // With secure:true, Express would refuse to set the cookie at all,
      // and login would silently break (no Set-Cookie header on the response).
      secure: false,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
)

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


const FRONTEND_DIST = path.join(__dirname, '..', 'frontend', 'dist')
app.use(express.static(FRONTEND_DIST))

app.get('*', (req, res) => {
  res.sendFile(path.join(FRONTEND_DIST, 'index.html'))
})

app.listen(port, () => {
  console.log(`Server listening on port ${port}`)
})
