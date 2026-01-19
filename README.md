# Mini Project Management System

A multi-tenant project management tool built with FastAPI, GraphQL (Strawberry), MongoDB, React, and Apollo Client.

## Features

- **Multi-tenant Architecture**: Organization-based data isolation
- **JWT Authentication**: Secure user authentication
- **Real-time Updates**: WebSocket subscriptions for live data sync
- **Project Management**: Create, update, delete projects with status tracking
- **Task Board**: Kanban-style task management with drag-and-drop status changes
- **Comments System**: Collaborative task discussions
- **Statistics Dashboard**: Project and task completion metrics

## Tech Stack

### Backend
- **FastAPI** - Modern Python web framework
- **Strawberry GraphQL** - GraphQL library for Python
- **MongoDB** - Document database
- **Motor** - Async MongoDB driver
- **JWT** - Token-based authentication
- **WebSockets** - Real-time subscriptions

### Frontend
- **React 18** - UI library
- **Apollo Client** - GraphQL client with caching
- **TailwindCSS** - Utility-first CSS
- **Shadcn/UI** - Component library
- **React Router** - Client-side routing
- **date-fns** - Date formatting

## Project Structure

```
/app
├── backend/
│   ├── server.py          # FastAPI + GraphQL server
│   ├── requirements.txt   # Python dependencies
│   └── .env               # Environment variables
│
├── frontend/
│   ├── src/
│   │   ├── components/ui/ # Shadcn UI components
│   │   ├── contexts/      # React context providers
│   │   │   ├── AuthContext.jsx
│   │   │   └── OrgContext.jsx
│   │   ├── lib/
│   │   │   ├── apollo.js  # Apollo Client setup
│   │   │   └── graphql.js # GraphQL queries/mutations
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── OrgDashboardPage.jsx
│   │   │   └── ProjectPage.jsx
│   │   ├── App.js         # Main app with routing
│   │   └── index.css      # Global styles
│   ├── package.json
│   └── .env
│
└── README.md
```

## Data Models

### Organization
```
{
  id: string
  name: string
  slug: string (unique)
  contact_email: string
  user_id: string (owner)
  created_at: datetime
}
```

### Project
```
{
  id: string
  organization_id: string
  name: string
  description: string
  status: 'ACTIVE' | 'COMPLETED' | 'ON_HOLD'
  due_date: date (optional)
  created_at: datetime
}
```

### Task
```
{
  id: string
  project_id: string
  title: string
  description: string
  status: 'TODO' | 'IN_PROGRESS' | 'DONE'
  assignee_email: string
  due_date: datetime (optional)
  created_at: datetime
}
```

### TaskComment
```
{
  id: string
  task_id: string
  content: string
  author_email: string
  created_at: datetime
}
```

## GraphQL API

### Endpoint
`POST /api/graphql`

### Queries
- `me` - Get current user
- `organizations` - List user's organizations
- `organization(id)` - Get single organization
- `projects(organizationId)` - List projects
- `project(id)` - Get single project
- `tasks(projectId)` - List tasks
- `task(id)` - Get single task
- `taskComments(taskId)` - List comments
- `projectStats(organizationId)` - Get statistics

### Mutations
- `register(input)` - Create account
- `login(input)` - Authenticate
- `createOrganization(input)` - Create org
- `createProject(input)` - Create project
- `updateProject(id, input)` - Update project
- `deleteProject(id)` - Delete project
- `createTask(input)` - Create task
- `updateTask(id, input)` - Update task
- `deleteTask(id)` - Delete task
- `addComment(input)` - Add comment
- `deleteComment(id)` - Delete comment

### Subscriptions
- `organizationEvents(organizationId)` - Real-time updates

## Setup Instructions

### Prerequisites
- Python 3.11+
- Node.js 18+
- MongoDB 6.0+

### Backend Setup
```bash
cd backend
pip install -r requirements.txt
# Configure .env with MONGO_URL and SECRET_KEY
python -m uvicorn server:app --host 0.0.0.0 --port 8001
```

### Frontend Setup
```bash
cd frontend
yarn install
# Configure .env with REACT_APP_BACKEND_URL
yarn start
```

## API Authentication

All authenticated endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Environment Variables

### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
SECRET_KEY=your-secret-key
CORS_ORIGINS=*
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=http://localhost:8001
```

## Design Decisions

1. **Strawberry GraphQL** - Chosen for type safety and modern Python async support
2. **MongoDB** - Flexible schema for rapid development
3. **JWT Authentication** - Stateless, scalable auth
4. **Apollo Client** - Powerful caching and real-time support
5. **Multi-tenancy** - User-based organization ownership for data isolation

## Future Improvements

- [ ] Role-based access control (Admin, Member, Viewer)
- [ ] File attachments for tasks
- [ ] Email notifications
- [ ] Drag-and-drop task reordering
- [ ] Advanced filtering and search
- [ ] Activity timeline/audit log
- [ ] Mobile app with React Native

