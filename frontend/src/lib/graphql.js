import { gql } from '@apollo/client';

// Auth Mutations
export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterInput!) {
    register(input: $input) {
      token
      user {
        id
        email
        name
        createdAt
      }
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      token
      user {
        id
        email
        name
        createdAt
      }
    }
  }
`;

// Organization Queries & Mutations
export const GET_ORGANIZATIONS = gql`
  query GetOrganizations {
    organizations {
      id
      name
      slug
      contactEmail
      createdAt
    }
  }
`;

export const GET_ORGANIZATION = gql`
  query GetOrganization($id: String!) {
    organization(id: $id) {
      id
      name
      slug
      contactEmail
      createdAt
    }
  }
`;

export const CREATE_ORGANIZATION = gql`
  mutation CreateOrganization($input: OrganizationInput!) {
    createOrganization(input: $input) {
      id
      name
      slug
      contactEmail
      createdAt
    }
  }
`;

// Project Queries & Mutations
export const GET_PROJECTS = gql`
  query GetProjects($organizationId: String!) {
    projects(organizationId: $organizationId) {
      id
      organizationId
      name
      description
      status
      dueDate
      createdAt
      taskCount
      completedTasks
    }
  }
`;

export const GET_PROJECT = gql`
  query GetProject($id: String!) {
    project(id: $id) {
      id
      organizationId
      name
      description
      status
      dueDate
      createdAt
      taskCount
      completedTasks
    }
  }
`;

export const CREATE_PROJECT = gql`
  mutation CreateProject($input: ProjectInput!) {
    createProject(input: $input) {
      id
      organizationId
      name
      description
      status
      dueDate
      createdAt
      taskCount
      completedTasks
    }
  }
`;

export const UPDATE_PROJECT = gql`
  mutation UpdateProject($id: String!, $input: ProjectUpdateInput!) {
    updateProject(id: $id, input: $input) {
      id
      organizationId
      name
      description
      status
      dueDate
      createdAt
      taskCount
      completedTasks
    }
  }
`;

export const DELETE_PROJECT = gql`
  mutation DeleteProject($id: String!) {
    deleteProject(id: $id)
  }
`;

// Task Queries & Mutations
export const GET_TASKS = gql`
  query GetTasks($projectId: String!) {
    tasks(projectId: $projectId) {
      id
      projectId
      title
      description
      status
      assigneeEmail
      dueDate
      createdAt
    }
  }
`;

export const GET_TASK = gql`
  query GetTask($id: String!) {
    task(id: $id) {
      id
      projectId
      title
      description
      status
      assigneeEmail
      dueDate
      createdAt
    }
  }
`;

export const CREATE_TASK = gql`
  mutation CreateTask($input: TaskInput!) {
    createTask(input: $input) {
      id
      projectId
      title
      description
      status
      assigneeEmail
      dueDate
      createdAt
    }
  }
`;

export const UPDATE_TASK = gql`
  mutation UpdateTask($id: String!, $input: TaskUpdateInput!) {
    updateTask(id: $id, input: $input) {
      id
      projectId
      title
      description
      status
      assigneeEmail
      dueDate
      createdAt
    }
  }
`;

export const DELETE_TASK = gql`
  mutation DeleteTask($id: String!) {
    deleteTask(id: $id)
  }
`;

// Comments
export const GET_TASK_COMMENTS = gql`
  query GetTaskComments($taskId: String!) {
    taskComments(taskId: $taskId) {
      id
      taskId
      content
      authorEmail
      createdAt
    }
  }
`;

export const ADD_COMMENT = gql`
  mutation AddComment($input: TaskCommentInput!) {
    addComment(input: $input) {
      id
      taskId
      content
      authorEmail
      createdAt
    }
  }
`;

export const DELETE_COMMENT = gql`
  mutation DeleteComment($id: String!) {
    deleteComment(id: $id)
  }
`;

// Stats
export const GET_PROJECT_STATS = gql`
  query GetProjectStats($organizationId: String!) {
    projectStats(organizationId: $organizationId) {
      totalProjects
      activeProjects
      completedProjects
      onHoldProjects
      totalTasks
      completedTasks
      completionRate
    }
  }
`;

// Me Query
export const GET_ME = gql`
  query GetMe {
    me {
      id
      email
      name
      createdAt
    }
  }
`;

// Subscription
export const ORGANIZATION_EVENTS = gql`
  subscription OrganizationEvents($organizationId: String!) {
    organizationEvents(organizationId: $organizationId) {
      eventType
      entityType
      entityId
      organizationId
    }
  }
`;
