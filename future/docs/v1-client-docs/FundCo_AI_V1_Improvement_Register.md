# FundCo AI Version 1 Improvement Register

Prepared For: FundCo Capital Managers  
Prepared By: NEG AI Product and Engineering Delivery Team  
Date: 12 May 2026  
Document Purpose: Summary of the post-launch improvements delivered to FundCo AI Version 1 before commencement of Version 2 development.

## 1. Executive Summary

Since the initial launch of FundCo AI Version 1, the platform has gone through a significant post-launch improvement phase focused on stability, management control, execution accountability, AI tooling, collaboration quality, reporting, and user experience.

The work completed during this phase moved Version 1 beyond its original release state in five important ways:

- it strengthened leadership control over users, work, activity, and oversight
- it improved continuity and usability for both admins and standard users
- it introduced stronger accountability layers around meetings, reporting, and execution
- it upgraded the AI tooling layer so it behaves more like a real business utility
- it prepared the business for the transition into the more ambitious Version 2 architecture

This document lists the key Version 1 improvements delivered during that phase.

## 2. Stability, Access, and Session Continuity

### 2.1 Authentication and session stability

- Improved `Remember Me` behaviour across user and admin experiences
- Reduced unnecessary forced logout behaviour caused by brittle `401` handling
- Improved token/session recovery instead of prematurely clearing valid session state
- Corrected local session issues caused by `localhost` and `127.0.0.1` cookie mismatch paths
- Improved session recovery when users return to the application after being away for a short period
- Added resume/recovery handling on visibility change, focus, page show, and network restoration events
- Reduced mobile session drops when the app is backgrounded for a few minutes

### 2.2 Shared-service and cross-app reliability

- Corrected admin-side shared-service request routing so the admin workspace no longer depends on a brittle proxy hop for core shared operations
- Improved direct communication patterns between admin and user-side services where required

### 2.3 Notification routing and continuity

- Improved notification click behaviour so users and admins can move directly from a notification into the relevant page
- Improved route resolution for platform notifications such as reports, projects, meetings, meeting reports, and Deck Prep outputs
- Added stronger support for background processing flows so AI jobs can continue while users leave the active page and return later

## 3. Admin Control, Governance, and Oversight

### 3.1 Admin-specific workspaces and controls

- Added a dedicated `My Goals` page for admins so each admin can see only their own goals, separate from the broader team goals view
- Added a dedicated `Tasks Assigned by Me` page so admins can quickly see work they have personally assigned
- Extended the `Tasks Assigned by Me` page to support the practical admin actions expected in the main tasks view, including task creation, reassignment, approval, rejection, editing, commenting, and deletion

### 3.2 Dashboard and management visibility

- Restored admin visibility into task statistics that had dropped from view, including team member count, total tasks, completed tasks, overdue items, and related execution metrics
- Improved admin performance-detail behaviour so the page no longer waits on slower AI analysis before showing the rest of the performance data
- Restored deeper performance insight for admins so they can see the same style of Super AI performance analysis available on the user side

### 3.3 Governance controls for user administration

- Hardened the permanent user deletion flow so it no longer fails because of one bad related cleanup record
- Changed hard-delete cleanup behaviour so warnings can be returned without blocking the main delete outcome
- Preserved deactivation as the safer default path while keeping hard delete as an explicit management action

### 3.4 Super-admin reporting and auditability

- Added a super-admin `Platform Activity Report` page
- Added backend reporting services to generate cross-platform management reports across all major modules
- Added support for full-history reporting and custom-period reporting
- Added PDF export for management reporting
- Added module-level selection so management can choose exactly which modules to report on
- Added user-level selection so management can report on all users or a selected user list
- Added detailed task-priority reporting, including high, medium, and low priority task visibility
- Changed the detailed activity ledger from one mixed stream into section-by-section reporting by module
- Added a direct Super management review layer that flags control issues, weak adoption, execution pressure, suspicious task-priority behaviour, and under-engaged users

## 4. Work Execution, Goals, Tasks, and Reporting

### 4.1 Task execution controls

- Improved task review, submission, and approval handling across admin workflows
- Added better visibility into task submission and review pressure
- Added stronger management visibility around task priority distribution

### 4.2 Goal management

- Corrected goal scoping so personal admin goals do not unintentionally display wider team goals
- Preserved the separate team-wide goals view for management use

### 4.3 Report writing and submission

- Corrected AI-generated report output so the real logged-in user name is used instead of placeholder text
- Corrected AI-generated task-report content so actual checklist items appear instead of generic filler such as `Checklist Item 1`
- Improved the report generation flow so grounded operational data is used before any AI polishing step
- Improved failure handling so weak AI output can fall back to a more reliable grounded draft
- Preserved report-writing drafts locally to reduce loss when users accidentally leave the page
- Added support for smarter in-flow writing assistance and user guidance in the report experience
- Extended report-writing capability so admins can also prepare and submit their own reports

### 4.4 Privacy and signal quality

- Changed the user-side performance view so goal detail is not openly exposed there in the same way tasks are summarised statistically
- Kept performance-focused visibility while reducing unnecessary goal exposure

## 5. Meetings, Accountability, and Follow-Through

### 5.1 Meeting Reports module

- Added a dedicated Meeting Reports module for the user side as a report inbox
- Added a dedicated Meeting Reports management page for the admin side
- Added structured report creation fields including title, date, meeting type, meeting overview, key updates, decisions, risks, next steps, attendees, circulation list, action items, email-copy option, and file upload

### 5.2 Distribution and acknowledgement

- Added report circulation to selected participants and recipients
- Added inbox delivery for recipients
- Added acknowledgement tracking so management can see who has acknowledged and who has not
- Added view tracking so management can see who has read a meeting report
- Added resend capability for follow-up circulation

### 5.3 Action capture

- Added support for extracting action items from meeting reports
- Added conversion of meeting action items into tasks for operational follow-through

### 5.4 Notification integration

- Added notification flows around meeting-report distribution and updates
- Integrated Meeting Reports into the broader notification layer on user and admin sides

## 6. Collaboration, Communication, and Social Usage

### 6.1 Team Chat

- Added sticker usage for team chat on user and admin sides
- Added message reactions so users can react to specific messages with emoji
- Improved the team-chat reaction tray so it remains visible on smaller message bubbles
- Improved the sticker and reaction interaction layer around chat usability
- Improved the chat layout so key chat controls remain more usable while messages scroll

### 6.2 Links and content previews

- Made links in chats and social feeds more recognisable and clickable
- Added richer link-preview support for compatible content so shared links feel closer to modern messaging expectations

### 6.3 Social and communication quality

- Improved communication-related navigation and interaction quality across team chat and social surfaces

## 7. AI Productivity Tools and DeckPrep

### 7.1 DeckPrep parity and usability

- Aligned the admin DeckPrep experience more closely with the stronger user-side experience
- Added additional-context input so users and admins can guide presentation generation more clearly
- Added background generation states so presentation jobs can continue while users leave the page
- Added completion and failure notification handling for DeckPrep jobs
- Improved side-pane behaviour so the deck workspace is less obstructive while working

### 7.2 Presentation-generation quality improvements

- Reworked the PDF-to-presentation preparation flow so it no longer relies too heavily on weak early-page extraction
- Improved document text cleaning to reduce disclaimer, footer, page-count, and table-of-contents pollution
- Improved full-document digesting before slide-building
- Improved fallback presentation construction so output can still be grounded in document structure when AI output is weak
- Reduced title-only and empty-slide failure patterns that were hurting output quality

### 7.3 Background continuity

- Improved long-running AI flows so users can leave DeckPrep or report-generation pages and return later without losing the job state

## 8. Training, Performance, and Development

### 8.1 Training stability

- Corrected the exam-rendering issue where some exams were showing unusable numeric blocks instead of the real content
- Preserved quiz-saving behaviour while fixing exam-side usability

### 8.2 Performance review flow

- Improved performance-detail responsiveness for admin users
- Preserved access to AI-generated performance interpretation while avoiding unnecessary wait before the rest of the page is usable

## 9. Notification Experience and Deep Linking

- Improved notification stack behaviour so users can click from notifications into the relevant platform area directly
- Improved admin and user routing for in-app notifications tied to generated content, meeting reports, projects, and related items
- Reduced friction between background AI completion and the point where the user needs to act

## 10. Interface and Experience Cleanups

- Increased the close icon size in task detail contexts where it had become too small to use comfortably
- Moved admin sign-out placement so the sidebar collapse control could remain visible
- Cleaned up encoding and label issues that were causing odd characters to appear in some pages
- Improved several admin and user UI details across reporting, DeckPrep, task handling, and chat interactions

## 11. Super-Admin and Management Intelligence Added Late in V1

In the later phase of the Version 1 improvement cycle, management control was further strengthened through:

- platform-wide activity reporting across major modules
- direct module filtering and user filtering
- task priority analysis
- user engagement and adoption checks
- weak-usage detection
- suspicious-priority-pattern detection
- grouped activity ledgers for easier review
- exportable PDF management reporting

This effectively introduced a first operational layer of management intelligence into Version 1 ahead of the more advanced controlled AI layer planned for Version 2.

## 12. Business Value of the V1 Improvement Phase

The post-launch improvement phase materially improved Version 1 in the following ways:

- stronger management visibility into activity, performance, and adoption
- better accountability around work, meetings, and reporting
- more reliable access and lower friction during day-to-day use
- better continuity for AI-assisted work
- improved collaboration quality
- improved readiness for enterprise-scale reporting and governance
- a clearer foundation for the more ambitious Version 2 architecture

## 13. Readiness Statement Before Version 2

Before the commencement of Version 2, FundCo AI Version 1 had already moved well beyond its original launch state. The platform now includes stronger management controls, stronger accountability workflows, more mature AI productivity utilities, better reporting depth, and improved reliability across core day-to-day user and admin operations.

This provides a stronger operational and engineering base for Version 2, which will introduce the next major layers around AI-led management, execution intelligence, portfolio and finance control, HR automation, and multi-company governance.
