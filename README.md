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

## Bonus features (non-competitive)
- Calendar export as .ics
- Edit meeting times (not just book & cancel)
- Deactivate slots

## 30% Non-Coded Portion
### Rupneet's Portion
Approximately 30% of my contributions involved the use of AI tools (primarily ChatGPT and Claude). AI was used to support development rather than to generate core app logic.

My primary use of AI was for:

- Writing and refining adapter and helper functions that transform backend data into frontend-friendly formats (e.g., calendar slot mapping and normalization).
- Assisting with frontend–backend integration, particularly in connecting API endpoints to React components and ensuring correct data flow across dashboards
- Debugging issues, such as resolving state inconsistencies, API response handling, and integration bugs between components.

All core application logic, UI structure, and system design decisions were implemented and validated manually. 

### Sophia's Portion
AI tools (ChatGPT and Claude) were used for connecting some of the backend and frontend components, particularly for the owner-to-owner booking feature which was implemented later in the project after the first demo. Also used to help with the invite URL generation for individual slots, an additional non-required feature. Also used for debugging. AI use totalling about 20%. 

### Bonita's Portion
Claude and Gemini were used to debug! Minor edits and debugs across the entire project, ~5%

Resolved a SQLite self-deadlock where acquiring the global lock twice within the same transaction caused the server to hang indefinitely. Added a 10-second timeout to the lock queue so blocked requests fail gracefully instead of freezing the server, ~5%

But mainly used for group meetings logic and solving the problems below, ~15%:

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
We annotate authorship **as comments near the top of a source file**, we followed the following:

1. **The first line names the main contributor** — the teammate who created or owns most of the file 
2. **The next lines (when present)** name teammates who added or integrated **meaningful subsequent work**

If only one teammate is listed there, treat that person as the primary contributor for that file. If the block is missing altogether, overlaps are spelled out instead in **each teammate’s file lists** below.

---

### Rupneet's Contributions
*Contribution Statement*

I developed of the entire frontend of the application and was responsible for designing and implementing the user-facing experience end-to-end. This included building the landing page, authentication flow, and both the owner and user dashboards, ensuring a consistent and intuitive interface across all parts of the application.

Furthermore, I implemented the full dashboard architecture, including calendar-based interactions, request handling UI, booking flows, and action panels. I built reusable React components such as the weekly calendar, slot cards, request cards, forms (login, signup, meeting request, slot creation), navigation components, and dashboard layout (sidebar, hero section, feature grid, and footer). I also developed all associated styling using CSS to maintain a consistent visual system across the application.

A major part of my work involved integrating the frontend with backend APIs. I created adapter and helper functions to map backend data into UI-friendly formats (e.g., calendar slot normalization, authentication helpers), and ensured that booking, meeting request, and dashboard data flows worked correctly across both user and owner views.

On the backend, I contributed to the implementation and integration of core routes such as meeting requests and bookings, ensuring they aligned with the frontend requirements and supported the full user flow (request → accept/decline → booking → dashboard updates). I also implemented the owner-owner meeting requests pipeline, and edited the frontend accordingly.

I also handled debugging and system integration across the project, particularly ensuring that different components (calendar, requests, dashboards, and backend endpoints) worked together correctly. This is mostly where I used the help of AI. This included refining UI interactions, fixing inconsistencies in state updates, and improving overall usability.

Overall, my contributions focused on:

* Full frontend architecture and UI/UX design
* Dashboard and calendar system implementation
* Integration of booking and request workflows
* Reusable component design and styling
* Frontend–backend data mapping and debugging

Files I have created and edited: 

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

I designed the database schema and implemented the owner slot management system, including creating, editing, deleting, and toggling slot visibility, viewing participants, and generating unique invite URLs. I built the owner-to-owner booking feature, allowing professors to book each other's slots and ensuring the flow replicates a user's booking abilities (message, cancel, mailto, export). I added the Browse Slots tab from the user dashboard to the owner dashboard, allowing them to book slots with other owners/professors. I also added the Upcoming Meetings tab to the owner dashboard, with a filter view of all confirmed bookings for student or professor bookings. I also implemented the Share All Availabilities link with login redirect handling. 

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

List of all files with some edits made: 
db/schema.sql

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

I designed and implemented all three booking type backends from scratch: recurring office hours (Type 3), meeting requests (Type 1), and group meetings (Type 2). I built the calendar export bonus feature, generating .ics files compatible with Google Calendar, Outlook, and Apple Calendar. I wired all mailto notification logic across booking, cancellation, meeting request submission, acceptance, decline, vote submission, and group meeting confirmation. I resolved several SQLite compatibility issues including syntax differences, boolean representation, and a self-deadlock bug in the database connection layer, and added a timeout mechanism to prevent the server from hanging after aborted requests. On the frontend, I wired the recurring office hours form, calendar export panel, owner accept/decline handlers, and group meeting vote notifications to their backend endpoints. I fixed a recurring slot color bug, added a persistent invite link to the group meeting manager, and ensured all professors appear in the student meeting request dropdown regardless of whether they have published slots.

server/routes/recurringSlots.js — Created and wrote POST /, GET /, GET /:id/children, PATCH /:id/visibility, DELETE /:id, and POST /:slotId/book. 
Added overlap detection validation before inserting recurring slots. Fixed SQLite INSERT OR IGNORE syntax and boolean 1/0 compatibility throughout.

server/routes/meetingRequests.js — Created and wrote POST /, GET /incoming, GET /outgoing, PATCH /:id/accept, PATCH /:id/decline, and DELETE /:id. Added notify payload logic to trigger owner/user mailto emails on request submission, acceptance, and decline.

server/routes/groupMeeting.js — Created and wrote POST /, GET /, GET /:groupId, POST /:groupId/vote, DELETE /:groupId/vote/:slotId, and PATCH /:groupId/confirm/:slotId. Added voter count query and notify payload to email all voters after each vote and on confirmation. Fixed SQLite INSERT OR IGNORE syntax, IN (?) array placeholder expansion, boolean 1/0 compatibility, and resolved self-deadlock by releasing the connection before post-commit pool.query() calls.

server/routes/calendar.js — Created and wrote GET /export for users and GET /export/owner for owners, generating .ics files compatible with Google Calendar, Outlook, and Apple Calendar.

server/routes/bookings.js — Added a AND bs.slot_type != 'group_meeting' filter to GET /available-slots so students don't see unconfirmed group meeting voting options in their normal booking list. Added formatTime12() and formatDate() helpers and switched notify bodies to use \r\n line breaks for proper Outlook/Gmail formatting with 12-hour times and readable dates.

server/routes/owners.js — Added GET /all endpoint that returns all registered owners regardless of active slots, so students can send meeting requests to any professor including new ones with no published availability yet.

server/routes/ownerSlots.js — Added a SQL filter condition AND NOT (s.slot_type = 'group_meeting' AND s.status = 'private') to hide unconfirmed group meetings from the owner overview calendar.

server/index.js — Added route registrations for /api/recurringSlots, /api/meetingRequests, /api/groupMeeting, and /api/calendar.

server/db.js — Added a 10-second lock timeout mechanism in acquire() and PRAGMA busy_timeout = 5000 to prevent SQLite transactions from hanging indefinitely after aborted requests.

frontend/src/pages/OwnerDashboardPage.jsx — Added fetchRequests() with 30-second polling so new meeting requests appear without a page refresh, and wrote handleAccept() and handleDecline() wired to the backend with mailto notification logic.

frontend/src/pages/UserDashboardPage.jsx — Added mailto notifications in handleBookSlot, handleSubmitRequest, and confirmCancelBooking. Updated loadMeetingOwnerList to call /api/owners/all so the instructor dropdown shows all professors regardless of slot availability. Wired the ?group= URL parameter to auto-navigate to the group meeting voting UI.

frontend/src/components/ExportPanel.jsx — Wrote handleExport() to fetch .ics files from the backend, trigger the browser download, and open the Google Calendar or Outlook import page. Implemented the isOwner prop to route owners to the correct export endpoint.

frontend/src/components/OwnerActionPanel.jsx — Rewrote RecurringForm with controlled state, validation, and a live connection to POST /api/recurringSlots. Replaced the dummy GroupForm with the real GroupMeetingForm component.

frontend/src/components/GroupMeetingVote.jsx — Added saved state logic to replace the Save button with a confirmation tag after successful submission, added voteData.notify mailto triggers, and built the "Meeting confirmed" banner UI for students whose voted slot was confirmed by the owner.

frontend/src/components/GroupMeetingManager.jsx — Added a persistent invite link display with a Copy button in the responses panel so professors can reshare the link without losing it after navigating away.

frontend/src/components/AppointmentCard.jsx — Added the Export button onClick handler to generate and download single-appointment .ics files directly from the appointments list.

frontend/src/components/CalendarBlock.jsx — Updated the oneLineStatus function to display the "Recurring" label based on recurringLabel rather than the slot's color category, decoupling the label from the color logic.

frontend/src/utils/ownerSlotAdapters.js — Updated the category mapping in mapBackendSlotToCalendarSlot so recurring slots respect their visibility and booking status, displaying pink when private and red when active or booked, instead of always showing pink.

frontend/src/components/GroupMeetingForm.jsx — Minor edits alongside OwnerActionPanel.jsx to wire the group meeting refresh flow.

frontend/src/styles/GroupMeeting.css — Added the .groupmeeting-saved-tag CSS class for the availability saved confirmation pill.

.gitignore — Added exclusion rules for data/app.db and .nfs* temporary files to prevent the database and Mimi filesystem artifacts from being tracked by git.

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
