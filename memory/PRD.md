# Mini Project Management System - PRD

## Original Problem Statement
Build a multi-tenant project management tool with Organizations, Projects, Tasks, and TaskComments. Features include JWT authentication, real-time WebSocket updates, GraphQL API, project dashboard with statistics, task board/kanban view, and responsive design.

## Architecture
- **Backend**: FastAPI + Strawberry GraphQL + MongoDB
- **Frontend**: React + Apollo Client + TailwindCSS + Shadcn/UI
- **Auth**: JWT token-based authentication
- **Real-time**: WebSocket subscriptions for live updates

## User Personas
1. **Team Lead** - Creates organizations, manages projects, assigns tasks
2. **Team Member** - Works on tasks, updates status, adds comments
3. **Stakeholder** - Views project progress and statistics

## Core Requirements (Static)
- [x] Multi-tenant data isolation (organization-based)
- [x] JWT authentication system
- [x] GraphQL API with queries, mutations, subscriptions
- [x] Project CRUD with status tracking
- [x] Task management with Kanban board
- [x] Comment system for tasks
- [x] Real-time updates via WebSockets
- [x] Professional dark theme UI
- [x] Responsive design

## What's Been Implemented (December 2024)
### Backend
- FastAPI server with Strawberry GraphQL
- JWT authentication (register/login/token validation)
- MongoDB models: User, Organization, Project, Task, TaskComment
- GraphQL queries, mutations, subscriptions
- REST endpoints for auth compatibility
- WebSocket subscription manager for real-time

### Frontend
- Apollo Client with WebSocket support
- Auth context with token management
- Organization selection flow
- Project dashboard with statistics
- Kanban-style task board
- Task detail sheet with comments
- Calendar date picker for due dates
- Form validation and error handling
- Toast notifications (sonner)
- Professional dark theme with Plus Jakarta Sans font

### Files Created
- `/app/backend/server.py` - Main FastAPI + GraphQL server
- `/app/frontend/src/lib/apollo.js` - Apollo Client config
- `/app/frontend/src/lib/graphql.js` - All GraphQL operations
- `/app/frontend/src/contexts/AuthContext.jsx` - Auth state
- `/app/frontend/src/contexts/OrgContext.jsx` - Org selection
- `/app/frontend/src/pages/LoginPage.jsx` - Auth page
- `/app/frontend/src/pages/DashboardPage.jsx` - Org list
- `/app/frontend/src/pages/OrgDashboardPage.jsx` - Projects
- `/app/frontend/src/pages/ProjectPage.jsx` - Task board
- `/app/README.md` - Documentation
- `/app/docs/django_reference.md` - Django/PostgreSQL reference

## Prioritized Backlog

### P0 - Completed
- [x] Authentication system
- [x] Organization management
- [x] Project CRUD
- [x] Task CRUD with status
- [x] Comments system
- [x] Statistics dashboard

### P1 - Future Enhancements
- [ ] Role-based access control (Admin/Member/Viewer)
- [ ] Drag-and-drop task reordering
- [ ] File attachments for tasks
- [ ] Search and filtering
- [ ] Activity timeline/audit log

### P2 - Nice to Have
- [ ] Email notifications
- [ ] Calendar view for due dates
- [ ] Mobile app (React Native)
- [ ] Dark/Light theme toggle
- [ ] Export data (CSV/PDF)

## Next Tasks
1. Add drag-and-drop for task status changes
2. Implement role-based permissions
3. Add search functionality
4. Create activity timeline
