# Undefined Behaviour — COMP 307

# Team
Nazifa
Rupneet Shahriar (261096653)
Sophia
Bonita Baladi (261097353)

# All teammember contributions:

__Files Edited or Created by Nazifa__
AI: index.js, server/scripts/populating-script.js, server/scripts/seed-demo.js
__Files Edited or Created by Rupneet__

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

Out of all of the files above, 30% is created by AI, mainly used for debugging and adding helper functions to connect diiferent endpoints across the dashboard. 


__Files Edited or Created by Sophia__


__Files Edited or Created by Bonita__
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
