# FundCo AI Repository

FundCo AI is a multi-surface operating platform for company execution, collaboration, and oversight.

## Repository At A Glance

### Runtime surfaces

- `frontend/` - user workspace frontend
- `backend/` - user platform API, background jobs, and real-time services
- `adminpanel/frontend/` - admin workspace frontend
- `adminpanel/backend/` - admin API and real-time services

### Shared supporting material

- `diagrams/` - architecture and analysis diagrams used for technical orientation

## What The Platform Covers

FundCo AI is organized around two operational experiences.

### User workspace

The user-facing platform covers day-to-day execution and team participation, including:

- task management and assigned work
- personal and team goals
- reminders and calendar workflows
- meetings, meeting reports, and collaboration flows
- team chat, social activity, and notifications
- file storage and document workflows
- training and progress tracking
- AI-assisted work surfaces such as report generation and deck preparation
- revenue-linked project participation where applicable

### Admin workspace

The admin-facing platform provides cross-team visibility and control, including:

- user and team oversight
- task, goal, and reminder administration
- meeting and reporting supervision
- performance and platform activity views
- revenue project coordination
- file, report, and workflow review surfaces
- AI and specialist operational tooling available to administrators

## How To Use This Repository


Each frontend and backend service is maintained as its own runnable unit. Setup instructions, environment expectations, and API references live in the service-level documentation listed below.

## Documentation Map

- [frontend/README.md](frontend/README.md) - user frontend runbook
- [backend/README.md](backend/README.md) - user backend runbook
- [backend/docs/API.md](backend/docs/API.md) - user backend API reference
- [adminpanel/README.md](adminpanel/README.md) - admin workspace overview
- [adminpanel/frontend/README.md](adminpanel/frontend/README.md) - admin frontend runbook
- [adminpanel/backend/README.md](adminpanel/backend/README.md) - admin backend runbook
- [adminpanel/backend/docs/API.md](adminpanel/backend/docs/API.md) - admin backend API reference
- [CLAUDE.md](CLAUDE.md) - living project notes: decisions, open questions, future plans
- [docs/AUDIT_REPORT.md](docs/AUDIT_REPORT.md) - full codebase audit

## System Diagrams

The repository includes a small set of reference diagrams for onboarding, architecture reviews, and business-flow discussions.

### Data Flow Diagram

![Data Flow Diagram](diagrams/data_flow.png)

Shows how operational data moves across user actions, admin controls, application services, and supporting workflows.

### UML Class Diagram

![Class Diagram](diagrams/class_diagram.png)

Provides a model-level view of the core platform entities and their relationships.

### UML Use Case Diagram

![Use Case Diagram](diagrams/use_case.png)

Summarizes the major interactions between standard users, administrators, and the system.

### Sequence Diagram: Task Creation

![Sequence Diagram](diagrams/sequence_task_creation.png)

Illustrates the request and processing flow for task creation and related system handling.

### Component Diagram

![Component Diagram](diagrams/component_diagram.png)

Shows the main frontend, backend, and integration boundaries at a component level.

## Operational Notes

- Authentication is split by platform. User and admin services maintain separate access tokens and refresh cookies.
- The platform uses both HTTP APIs and Socket.IO channels. Service-level API documentation calls out real-time behavior where relevant.
