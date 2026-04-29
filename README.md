# Undefined Behaviour — COMP 307

## Links

- **Deployed URL:** <https://winter2026-comp307-group39.cs.mcgill.ca/>
- **GitHub repository:** <https://github.com/n4z03/Undefined-Behaviour> 

## Changes since Demo 1 (Demo 2)

The app **runs reliably on the class server** now (session, build, and refresh issues from Demo 1 are addressed). Below is how we responded to TA feedback from the first demo.

| Demo 1 issue | What we improved for Demo 2 |
| --- | --- |
| Dashboard / landing **image** not loading | Fixed so images and assets load correctly in dev and on the deployed site. |
| **Selected calendar slot** hard to see | The active 30-minute block is **highlighted** using colors consistent with the rest of the calendar design. |
| **Type 1 — Accepting requests** not working | Accept / decline for meeting requests works end-to-end. |
| **Type 1 — After accept:** new booking slots + **email to user** | Post-accept flows and **mailto** notifications to the user behave as intended. |
| **Type 1 — Booking** on **both** student and owner dashboards | Confirmed appointments show consistently for both parties. |
| **Type 2 — Refresh** / behavior on the **server** | Deployment and session behavior fixed; the site works on the production URL without the Demo 1 refresh breakage. |
| **Type 2 — Email to owner** | Owners receive the intended **mailto** notifications where applicable. |
| **Type 3 — Booking** a slot **weeks later** (e.g. 4th week) | **Recurring** office hours treat “number of weeks” as **total occurrences including the first week**, so far-future weeks in range can be booked; UI and API were aligned. |
| **Per-owner invite URL** (logged-in user sees **that owner’s activated slots** only) | Invite / share flows take users to the right dashboard context after login so they see the intended owner’s bookable slots. |
| **Group / multi-professor** meetings unclear | **Group meetings** are supported; voting, confirm, and calendar behavior are consistent, and the experience is easier to understand. |

## How to run our project

**Prerequisites:** Node.js and npm installed. From the repository root (`Undefined-Behaviour/`).

### Development (recommended)

The API runs on **port 3000**. The Vite dev server runs on **port 5173** and proxies `/api` to `http://localhost:3000` (see `frontend/vite.config.js`). **Start the backend before or with the frontend** so login and data load correctly.

1. **Terminal 1 — backend**

   ```bash
   cd server
   npm install
   ```

   **First time** (or when you want a clean database with demo seed data):

   ```bash
   npm run demo
   ```

   This runs `init-db` (creates `data/` and applies the schema if needed), then `clear`, then `seed`. **It wipes existing DB data.**

   **Later runs** (keep your existing database): skip `npm run demo` and only run:

   ```bash
   npm run dev
   ```

   If you have never initialized the DB and skipped `demo`, run once: `npm run init-db` (then optionally `npm run seed`).

2. **Terminal 2 — frontend**

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. Open the URL printed in the terminal (usually **http://localhost:5173**). Use that URL in the browser—not port 3000—so `/api` requests are proxied correctly.

4. Optional check: **http://localhost:3000/api/health** should return JSON `{"message":"server running"}`.

**Session / env:** The server reads optional `server/.env` (session secret, etc.). If missing, defaults apply (fine for local dev).

### Production-like build (single process)

Use this if you prefer one server serving the built React app (matches deployment more closely):

```bash
cd frontend && npm install && npm run build
cd ../server && npm install && npm start
```

Then open **http://localhost:3000**. This doesn't require a separate Vite process; the Express server serves `frontend/dist` and the API.

### Troubleshooting
- **Login or API failing in dev:** Ensure the backend is running on port **3000** before using the site on **5173**.
- **Port 3000 already in use:** Stop the other process or set `PORT` in `server/.env`.
- **Database errors:** Ensure `npm run demo` or `npm run init-db` has been run at least once so `data/app.db` exists.

## Team
- Rupneet Shahriar (261096653)
- Sophia Casalme (261149930)
- Bonita Baladi (261097353)
- Nazifa Ahmed (261112966)

**All team members confirm that we contributed equally (25%).**

## 30% Non-Coded Portion
### Rupneet's Portion
Out of all of the code I've written, 30% is created by AI (mainly ChatGPT and Claude), mainly used for debugging and adding helper functions to connect diiferent endpoints across the dashboard. 

### Sophia's Portion
AI tools (ChatGPT and Claude) were used for connecting some of the backend and frontend components, particularly for the owner-to-owner booking feature which was implemented later in the project after the first demo. Also used to help with the invite URL generation for individual slots, an additional non-required feature. Also used for debugging. AI use totalling about 20%. 

### Bonita's Portion
Claude and Gemini were used to debug! Minor edits and debugs across the entire project, ~5%

But mainly used for group meetings logic and solving the problems below, ~15%:

Correct flow:
- owner creates group meeting, sees options as grey box in owner overview
- student pastes invite and votes. this does not update user calendar, only vote count
- prof sees correct vote count, can confirm any time slot they choose
- now this chosen time slot shows us as booked for user and owner. the unchosen time slots disappear from owner too 

Problems:
- if student votes, the slot shows up in owner and user overview calendar as "booked" and red
- when students vote, vote count does not update for owner 
- Prof should not be able to confirm is noone has voted yet (solo group meeting = contradiction)

### Nazifa's Portion
AI tools (ChatGPT and Claude) were used selectively to support specific development tasks rather than to generate core application logic.

- **Server/session deployment debugging:** AI was used to debug for differences between local and deployed behavior (for example: login/session issues related to proxy settings and secure cookie handling). This supported debugging work in `server/index.js`.
- **SQLite adaptation and query validation:** AI was used to help translate database logic into SQLite-compatible patterns and verify SQL edge cases during schema and query development (for example in `db/schema.sqlite.sql`, `server/db.js`, `server/routes/bookings.js`, `server/routes/ownerSlots.js`, and `server/routes/meetingRequests.js`).
- **Database scripts:** AI helped in generating initial versions of setup/reset/seeding scripts, which were then modified and integrated into the project.
- **Estimated AI-assisted contribution:** approximately 15-20%, primarily in debugging support, scripting, and validation.
- **Files with AI support:** `server/index.js`, `server/scripts/populating-script.js`, `server/scripts/seed-demo.js`.

## All Teammember Contributions

### How coding contributions work in the file comments. 

Contribution **percent estimates** combine git history, who led each area, and team agreement—they are approximate when several people touched the same artifact.

Where we annotate authorship **as comments near the top of a source file**, we follow one rule:

1. **The first line names the main contributor** — the teammate who originated or owns most of the file 
2. **The next lines (when present)** name teammates who added or integrated **meaningful subsequent work**

If only one teammate is listed there, treat that person as sole or clearly primary contributor for that file. If the block is missing altogether, overlaps are spelled out instead in **each teammate’s file lists** below.

---

### Rupneet's Contributions
*Contribution Statement*
Worked on implementing the entire front-end, including the landing page, authentication and dashboard. 


server/routes/meetingRequests.js
server/routes/bookings.js
frontend/src/pages/OwnerDashboardPage.jsx
frontend/src/components/OwnerActionPanel.jsx
frontend/src/components/RequestCard.jsx
frontend/src/components/RequestMeetingForm.jsx
frontend/src/components/GroupMeetingManager.jsx
frontend/src/components/CalendarBlock.jsx
frontend/src/components/WeeklyCalendar.jsx
frontend/src/components/ExportPanel.jsx
frontend/src/components/Navbar.jsx
frontend/src/components/LoginForm.jsx
frontend/src/components/SignupForm.jsx
frontend/src/components/FeatureGrid.jsx
frontend/src/components/HowItWorksSection.jsx
frontend/src/components/RecentRequestsPreview.jsx
frontend/src/components/CreateSlotForm.jsx
frontend/src/components/SlotCard.jsx
frontend/src/components/SummaryCards.jsx
frontend/src/components/QuickActions.jsx
frontend/src/components/RecurringCard.jsx
frontend/src/components/GroupMeetingCard.jsx
frontend/src/components/DashboardSidebar.jsx
frontend/src/components/HeroSection.jsx
frontend/src/components/Footer.jsx
frontend/src/components/AuthTabs.jsx
frontend/src/pages/AuthPage.jsx
frontend/src/pages/LandingPage.jsx
frontend/src/main.jsx
frontend/src/App.jsx
frontend/src/utils/ownerSlotAdapters.js
frontend/src/utils/authHelpers.js
frontend/vite.config.js
frontend/src/styles/RequestCard.css
frontend/src/styles/OwnerDashboardPage.css
frontend/src/styles/WeeklyCalendar.css
frontend/src/styles/HowItWorksSection.css
frontend/src/styles/RecurringCard.css
frontend/src/styles/OwnerActionPanel.css
frontend/src/styles/Navbar.css
frontend/src/styles/FeatureGrid.css
frontend/src/styles/LoginForm.css
frontend/src/styles/CalendarBlock.css
frontend/src/styles/AuthPage.css
frontend/src/styles/SummaryCards.css
frontend/src/styles/SlotCard.css
frontend/src/styles/SignupForm.css
frontend/src/styles/QuickActions.css
frontend/src/styles/ExportPanel.css
frontend/src/styles/GroupMeetingCard.css
frontend/src/styles/DashboardSidebar.css
frontend/src/styles/CreateSlotForm.css
frontend/src/styles/App.css
frontend/src/styles/HeroSection.css
frontend/src/styles/Footer.css
frontend/src/styles/AuthTabs.css

### Sophia's Contributions
*Contribution Statement*
db/schema.sql - design database schema in SQL, later adapted to SQLite by Nazifa

server/routes/ownerSlots.js - create main owner feature routes: creating slots, managing slot visibility, delete slots, view participants, create unique slot URLs.

server/routes/calendar.js - edited GET /export/owner to include both owned slots and slots joined as a participant, and fixed GET
/export/:bookingId to use an EXISTS subquery so owners can export both slots they created and slots they booked.

server/routes/invites.js - created the invite URL system (for unique slot URL invitations)

frontend/src/pages/OwnerDashboardPage.jsx - edited the Browse Slots tab, reusing user-facing components so owners can browse and book other
owners' active slots, the Upcoming Meetings tab, unified view of all confirmed bookings, the Share All Availabilities button

frontend/src/pages/UserDashboardPage.jsx - edited so that when a visiting owner follows a shared availabilities link and logs in, they are redirected to the owner dashboard pre-filtered to the correct professor's slots.

frontend/src/components/OwnerActionPanel.jsx - edited and wrote the CreateSlotForm submit logic (wired to POST /api/ownerSlots with validation and error
handling), the Copy Invite Link button (calls POST /api/invites/generate and copies the URL to clipboard), and the joined slot panel (shows a read-only view with a
Cancel Booking button for slots the owner joined via prof-to-prof booking).

List of all files with some edits made: db/schema.sql
frontend/src/App.jsx
frontend/src/components/CalendarBlock.jsx
frontend/src/components/CreateSlotForm.jsx
frontend/src/components/Navbar.jsx
frontend/src/components/OwnerActionPanel.jsx
frontend/src/components/RecentRequestsPreview.jsx
frontend/src/components/RequestCard.jsx
frontend/src/pages/AuthPage.jsx
frontend/src/pages/OwnerDashboardPage.jsx
frontend/src/pages/UserDashboardPage.jsx
frontend/src/utils/ownerSlotAdapters.js
ownerbackend/db/schema.sql
server/db.js
server/index.js
server/routes/auth.js
server/routes/calendar.js
server/routes/invites.js
server/routes/ownerSlots.js

### Bonita's Contributions
*Contribution Statement*
server/routes/recurringSlots.js - bonita created and wrote POST /, GET /, GET /:id/children, PATCH /:id/visibility, DELETE /:id, and POST /:slotId/book. Also fixed SQLite INSERT OR IGNORE syntax and boolean 1/0 compatibility.

server/routes/meetingRequests.js - bonita created and wrote POST /, GET /incoming, GET /outgoing, PATCH /:id/accept, PATCH /:id/decline, DELETE /:id, and added the notify payload logic to trigger owner/user mailto emails.

server/routes/groupMeeting.js - bonita created and wrote POST /, GET /, GET /:groupId, POST /:groupId/vote, DELETE /:groupId/vote/:slotId, and PATCH /:groupId/confirm/:slotId. Also expanded the voters query to email all voters, added fmt12h 12-hour formatting, removed owner vote restrictions for prof-to-prof voting, and resolved SQLite deadlock/syntax issues.

server/routes/calendar.js - bonita edited and wrote GET /api/calendar/export/:bookingId to enable single-appointment .ics exports for users and owners.

server/routes/bookings.js (Previously Missed) - bonita edited and wrote a SQL filter condition AND bs.slot_type != 'group_meeting' to the GET /api/bookings/available-slots endpoint so students wouldn't see unconfirmed voting options in their normal booking list.

server/routes/ownerSlots.js - bonita edited and wrote a SQL filter condition AND NOT (s.slot_type = 'group_meeting' AND s.status = 'private') to hide unconfirmed group meetings from the owner overview calendar.

server/index.js - bonita edited and wrote the route registrations for /api/recurringSlots, /api/meetingRequests, /api/groupMeeting, and /api/calendar.

server/db.js - bonita edited and wrote the 10-second lock timeout mechanism in acquire() and added PRAGMA busy_timeout = 5000 to prevent SQLite transactions from hanging indefinitely.

frontend/src/pages/OwnerDashboardPage.jsx - bonita edited and wrote fetchRequests() with 30-second polling, handleAccept(), and handleDecline() with mailto logic. Also fixed JSX duplicate tag bugs and resolved merge conflicts.

frontend/src/pages/UserDashboardPage.jsx - bonita edited and wrote parseGroupIdFromUrl(), handleGroupLinkSubmit(), the "My Confirmed Group Meetings" display, and mailto notifications for handleBookSlot, handleSubmitRequest, and confirmCancelBooking. Wired the ?group= URL parameter to auto-navigate to the voting UI.

frontend/src/components/ExportPanel.jsx - bonita edited and wrote handleExport() to fetch .ics files, trigger the browser download, open Google/Outlook calendars, and implemented the isOwner prop logic.

frontend/src/components/OwnerActionPanel.jsx - bonita edited and wrote the RecurringForm component (converting it to use controlled state, validation, and wiring it to the backend) and swapped the dummy GroupForm with the real GroupMeetingForm.

frontend/src/components/AppointmentCard.jsx - bonita edited and wrote the Export button onClick handler to generate and download single-appointment .ics files.

frontend/src/components/GroupMeetingVote.jsx - bonita edited and wrote the saved state logic, loadGroup() silent reload to prevent flickering, removed optimistic vote counting to fix double-counting, added voteData.notify mailto triggers, and built the "Meeting confirmed" banner UI.

frontend/src/components/GroupMeetingManager.jsx - bonita edited and wrote the joinLinkInput state, parseGroupIdFromUrl(), and handleJoinLinkSubmit() to allow prof-to-prof voting via pasted invite links.

frontend/src/components/CalendarBlock.jsx - bonita edited and wrote the condition to display the "Recurring" label based on recurringLabel rather than tying it to the slot color category.

frontend/src/utils/ownerSlotAdapters.js - bonita edited and wrote the category mapping logic to ensure recurring slots respect their visibility/booking status (displaying as pink when private, red when public/booked).

frontend/src/styles/GroupMeeting.css - bonita edited and wrote the .groupmeeting-saved-tag CSS class.

frontend/src/components/GroupMeetingForm.jsx: Right at the very beginning of our troubleshooting session, you modified this file in Vim alongside OwnerActionPanel.jsx and committed them both under the message "refresh group meetings".

.gitignore - bonita edited and wrote the exclusion rules for data/app.db and the .nfs* temporary files.

### Nazifa's Contributions
*Contribution Statement*
I aligned the database with the server and SQLite, updating the schema and fixing queries/constraints to match how Express uses the DB. I built the main backend routes for auth, bookings, owner slots, owners, and meeting requests, added the DB connection helper, and wrote setup/reset/seed scripts for testing and demos. On the frontend, I implemented key dashboard flows: login/session handling, browsing and booking slots, cancelling/rescheduling, meeting requests, owner actions, and initial group meeting wiring. I also handled server setup on the class machine, which ended up being more time-consuming than expected due to deployment issues. I debugged problems with sessions, proxies, cookies, and builds, and worked with IT to resolve infrastructure-related blockers.

server/routes/auth.js - created and wired login, session check, and logout flow used by the auth pages.

server/routes/bookings.js - created and wired student booking endpoints (browse available slots, create bookings, load appointments, and cancel bookings).

server/routes/ownerSlots.js - created and wired owner slot management endpoints for the owner dashboard (read, create/edit behavior support, and owner-side booking/cancel actions).

server/routes/owners.js - created and wired owner listing/profile endpoints used by browsing and request flows.

server/routes/meetingRequests.js - created and wired meeting request endpoints (create, incoming/outgoing lists, updates, and deletion), then integrated with team changes.

server/index.js - created and wired the main Express server setup (middleware, sessions, CORS, static serving, and API route registration).

server/db.js - created and wired the SQLite pool/connection helper used by routes and scripts.

db/schema.sqlite.sql - created and wired the base database schema (users, booking slots, bookings, meeting requests, and supporting constraints/indexes).

server/scripts/init-db.js, server/scripts/clear-db.js, server/scripts/populating-script.js, server/scripts/seed-demo.js - created and wired database setup/reset/population scripts used for local testing and demos.

frontend/src/pages/AuthPage.jsx - created and wired frontend auth flow to backend session APIs.

frontend/src/pages/UserDashboardPage.jsx - created and wired the main student dashboard flow (appointments, slot browsing, booking actions, and meeting requests), then continued integrating team updates.

frontend/src/pages/OwnerDashboardPage.jsx - created and wired the owner dashboard flow (slot management, request handling, and dashboard interactions), then continued integrating team updates.

frontend/src/components/CreateSlotForm.jsx, frontend/src/components/RequestMeetingForm.jsx, frontend/src/components/UserRequestCard.jsx - created and wired core form/card components for slot creation and meeting request workflow.

frontend/src/components/AppointmentCard.jsx, frontend/src/components/CancelBookingCard.jsx, frontend/src/components/RescheduleBookingCard.jsx - created and wired appointment action UI for viewing, cancelling, and rescheduling bookings.

frontend/src/components/OwnerActionPanel.jsx, frontend/src/components/CalendarBlock.jsx - created and wired owner calendar interaction UI and slot status display behavior.

frontend/src/components/GroupMeetingForm.jsx, frontend/src/components/GroupMeetingManager.jsx, frontend/src/components/GroupMeetingVote.jsx - created and wired the base group meeting create/manage/vote frontend flow, later refined with team fixes.

frontend/src/styles/OwnerActionPanel.css, frontend/src/styles/CancelBookingCard.css, frontend/src/styles/RescheduleBookingCard.css, frontend/src/styles/CalendarBlock.css, frontend/src/styles/GroupMeeting.css - created and styled these frontend components and their interaction states.
