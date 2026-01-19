# Django + PostgreSQL Reference Implementation

This file provides the Django/PostgreSQL equivalent code for the Mini PM system.
The main application uses FastAPI + MongoDB as per platform requirements.

## Django Models (models.py)

```python
from django.db import models
from django.contrib.auth.models import User
import uuid

class Organization(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    contact_email = models.EmailField()
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='organizations')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name


class Project(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('COMPLETED', 'Completed'),
        ('ON_HOLD', 'On Hold'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='projects')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE')
    due_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def task_count(self):
        return self.tasks.count()

    @property
    def completed_tasks(self):
        return self.tasks.filter(status='DONE').count()


class Task(models.Model):
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('DONE', 'Done'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tasks')
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO')
    assignee_email = models.EmailField(blank=True)
    due_date = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return self.title


class TaskComment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    task = models.ForeignKey(Task, on_delete=models.CASCADE, related_name='comments')
    content = models.TextField()
    author_email = models.EmailField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author_email} on {self.task.title}"
```

## Django GraphQL Schema (schema.py)

```python
import graphene
from graphene_django import DjangoObjectType
from .models import Organization, Project, Task, TaskComment

class OrganizationType(DjangoObjectType):
    class Meta:
        model = Organization
        fields = '__all__'

class ProjectType(DjangoObjectType):
    task_count = graphene.Int()
    completed_tasks = graphene.Int()

    class Meta:
        model = Project
        fields = '__all__'

    def resolve_task_count(self, info):
        return self.task_count

    def resolve_completed_tasks(self, info):
        return self.completed_tasks

class TaskType(DjangoObjectType):
    class Meta:
        model = Task
        fields = '__all__'

class TaskCommentType(DjangoObjectType):
    class Meta:
        model = TaskComment
        fields = '__all__'

class Query(graphene.ObjectType):
    organizations = graphene.List(OrganizationType)
    organization = graphene.Field(OrganizationType, id=graphene.UUID(required=True))
    projects = graphene.List(ProjectType, organization_id=graphene.UUID(required=True))
    project = graphene.Field(ProjectType, id=graphene.UUID(required=True))
    tasks = graphene.List(TaskType, project_id=graphene.UUID(required=True))
    task = graphene.Field(TaskType, id=graphene.UUID(required=True))
    task_comments = graphene.List(TaskCommentType, task_id=graphene.UUID(required=True))

    def resolve_organizations(self, info):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        return Organization.objects.filter(owner=user)

    def resolve_organization(self, info, id):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        return Organization.objects.get(id=id, owner=user)

    def resolve_projects(self, info, organization_id):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        org = Organization.objects.get(id=organization_id, owner=user)
        return Project.objects.filter(organization=org)

    def resolve_project(self, info, id):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        project = Project.objects.get(id=id)
        if project.organization.owner != user:
            raise Exception("Access denied")
        return project

    def resolve_tasks(self, info, project_id):
        return Task.objects.filter(project_id=project_id)

    def resolve_task(self, info, id):
        return Task.objects.get(id=id)

    def resolve_task_comments(self, info, task_id):
        return TaskComment.objects.filter(task_id=task_id)


# Input Types
class OrganizationInput(graphene.InputObjectType):
    name = graphene.String(required=True)
    slug = graphene.String(required=True)
    contact_email = graphene.String(required=True)

class ProjectInput(graphene.InputObjectType):
    organization_id = graphene.UUID(required=True)
    name = graphene.String(required=True)
    description = graphene.String()
    status = graphene.String()
    due_date = graphene.Date()

class TaskInput(graphene.InputObjectType):
    project_id = graphene.UUID(required=True)
    title = graphene.String(required=True)
    description = graphene.String()
    status = graphene.String()
    assignee_email = graphene.String()
    due_date = graphene.DateTime()


# Mutations
class CreateOrganization(graphene.Mutation):
    class Arguments:
        input = OrganizationInput(required=True)

    organization = graphene.Field(OrganizationType)

    def mutate(self, info, input):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        
        org = Organization.objects.create(
            name=input.name,
            slug=input.slug,
            contact_email=input.contact_email,
            owner=user
        )
        return CreateOrganization(organization=org)


class CreateProject(graphene.Mutation):
    class Arguments:
        input = ProjectInput(required=True)

    project = graphene.Field(ProjectType)

    def mutate(self, info, input):
        user = info.context.user
        if not user.is_authenticated:
            raise Exception("Not authenticated")
        
        org = Organization.objects.get(id=input.organization_id, owner=user)
        project = Project.objects.create(
            organization=org,
            name=input.name,
            description=input.description or '',
            status=input.status or 'ACTIVE',
            due_date=input.due_date
        )
        return CreateProject(project=project)


class CreateTask(graphene.Mutation):
    class Arguments:
        input = TaskInput(required=True)

    task = graphene.Field(TaskType)

    def mutate(self, info, input):
        project = Project.objects.get(id=input.project_id)
        task = Task.objects.create(
            project=project,
            title=input.title,
            description=input.description or '',
            status=input.status or 'TODO',
            assignee_email=input.assignee_email or '',
            due_date=input.due_date
        )
        return CreateTask(task=task)


class Mutation(graphene.ObjectType):
    create_organization = CreateOrganization.Field()
    create_project = CreateProject.Field()
    create_task = CreateTask.Field()


schema = graphene.Schema(query=Query, mutation=Mutation)
```

## Django Settings (settings.py additions)

```python
INSTALLED_APPS = [
    # ...
    'graphene_django',
    'corsheaders',
    'pm_app',
]

GRAPHENE = {
    'SCHEMA': 'pm_app.schema.schema',
    'MIDDLEWARE': [
        'graphql_jwt.middleware.JSONWebTokenMiddleware',
    ],
}

AUTHENTICATION_BACKENDS = [
    'graphql_jwt.backends.JSONWebTokenBackend',
    'django.contrib.auth.backends.ModelBackend',
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': 'minipm',
        'USER': 'postgres',
        'PASSWORD': 'password',
        'HOST': 'localhost',
        'PORT': '5432',
    }
}
```

## Django URLs (urls.py)

```python
from django.urls import path
from graphene_django.views import GraphQLView
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    path('graphql/', csrf_exempt(GraphQLView.as_view(graphiql=True))),
]
```

## Requirements (requirements-django.txt)

```
Django==4.2
graphene-django==3.1
django-graphql-jwt==0.4
psycopg2-binary==2.9
django-cors-headers==4.3
```

## Database Migrations

```bash
python manage.py makemigrations
python manage.py migrate
```

---

Note: This Django reference implementation is provided for documentation purposes.
The actual application uses FastAPI + MongoDB as per platform requirements.
