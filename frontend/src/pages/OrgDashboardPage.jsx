import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { 
  GET_ORGANIZATION, GET_PROJECTS, GET_PROJECT_STATS, CREATE_PROJECT, 
  UPDATE_PROJECT, DELETE_PROJECT, ORGANIZATION_EVENTS 
} from '../lib/graphql';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, FolderKanban, ArrowLeft, Calendar as CalendarIcon, 
  MoreVertical, Pencil, Trash2, CheckCircle2, Clock, AlertCircle,
  Loader2, Activity, BarChart3, Users, TrendingUp
} from 'lucide-react';

const STATUS_CONFIG = {
  ACTIVE: { label: 'Active', class: 'status-active', icon: Activity },
  COMPLETED: { label: 'Completed', class: 'status-completed', icon: CheckCircle2 },
  ON_HOLD: { label: 'On Hold', class: 'status-on-hold', icon: Clock },
};

const OrgDashboardPage = () => {
  const { orgId } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectedOrg, clearOrg } = useOrg();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [projectForm, setProjectForm] = useState({
    name: '', description: '', status: 'ACTIVE', due_date: null
  });

  const { data: orgData, loading: orgLoading } = useQuery(GET_ORGANIZATION, {
    variables: { id: orgId },
  });

  const { data: projectsData, loading: projectsLoading, refetch: refetchProjects } = useQuery(GET_PROJECTS, {
    variables: { organizationId: orgId },
  });

  const { data: statsData, refetch: refetchStats } = useQuery(GET_PROJECT_STATS, {
    variables: { organizationId: orgId },
  });

  // Subscription for real-time updates
  const { data: subData } = useSubscription(ORGANIZATION_EVENTS, {
    variables: { organizationId: orgId },
    onData: ({ data }) => {
      if (data?.data?.organizationEvents) {
        refetchProjects();
        refetchStats();
      }
    },
  });

  const [createProject, { loading: creating }] = useMutation(CREATE_PROJECT, {
    onCompleted: () => {
      toast.success('Project created!');
      closeDialog();
      refetchProjects();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const [updateProject, { loading: updating }] = useMutation(UPDATE_PROJECT, {
    onCompleted: () => {
      toast.success('Project updated!');
      closeDialog();
      refetchProjects();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const [deleteProject] = useMutation(DELETE_PROJECT, {
    onCompleted: () => {
      toast.success('Project deleted');
      refetchProjects();
      refetchStats();
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingProject(null);
    setProjectForm({ name: '', description: '', status: 'ACTIVE', due_date: null });
  };

  const openEditDialog = (project) => {
    setEditingProject(project);
    setProjectForm({
      name: project.name,
      description: project.description,
      status: project.status,
      due_date: project.dueDate ? new Date(project.dueDate) : null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectForm.name) {
      toast.error('Project name is required');
      return;
    }

    const input = {
      name: projectForm.name,
      description: projectForm.description,
      status: projectForm.status,
      dueDate: projectForm.due_date ? projectForm.due_date.toISOString().split('T')[0] : null,
    };

    if (editingProject) {
      updateProject({ variables: { id: editingProject.id, input } });
    } else {
      createProject({ variables: { input: { ...input, organizationId: orgId } } });
    }
  };

  const handleBack = () => {
    clearOrg();
    navigate('/dashboard');
  };

  const org = orgData?.organization;
  const projects = projectsData?.projects || [];
  const stats = statsData?.projectStats;

  if (orgLoading) {
    return (
      <div className="min-h-screen gradient-bg flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleBack} data-testid="back-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{org?.name}</h1>
              <p className="text-xs text-muted-foreground font-mono">{org?.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={() => { logout(); navigate('/'); }}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard 
            title="Total Projects" 
            value={stats?.totalProjects || 0} 
            icon={FolderKanban}
            color="primary"
          />
          <StatCard 
            title="Active" 
            value={stats?.activeProjects || 0} 
            icon={Activity}
            color="emerald"
          />
          <StatCard 
            title="Completed" 
            value={stats?.completedProjects || 0} 
            icon={CheckCircle2}
            color="blue"
          />
          <StatCard 
            title="Completion Rate" 
            value={`${stats?.completionRate || 0}%`} 
            icon={TrendingUp}
            color="amber"
          />
        </div>

        {/* Projects Section */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <FolderKanban className="h-5 w-5 text-primary" />
            Projects
          </h2>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-project-btn" className="shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]">
                <Plus className="h-4 w-4 mr-2" />
                New Project
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingProject ? 'Edit Project' : 'Create Project'}</DialogTitle>
                <DialogDescription>
                  {editingProject ? 'Update project details' : 'Add a new project to this organization'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input
                    id="project-name"
                    placeholder="Website Redesign"
                    value={projectForm.name}
                    onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })}
                    data-testid="project-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-desc">Description</Label>
                  <Textarea
                    id="project-desc"
                    placeholder="Brief description of the project..."
                    value={projectForm.description}
                    onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })}
                    data-testid="project-desc-input"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={projectForm.status}
                      onValueChange={(value) => setProjectForm({ ...projectForm, status: value })}
                    >
                      <SelectTrigger data-testid="project-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="ON_HOLD">On Hold</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Due Date</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                          data-testid="project-duedate-btn"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {projectForm.due_date ? format(projectForm.due_date, 'PPP') : 'Pick date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={projectForm.due_date}
                          onSelect={(date) => setProjectForm({ ...projectForm, due_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || updating} data-testid="project-submit-btn">
                    {(creating || updating) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingProject ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {projectsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-white/5 bg-card/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-2 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <Card className="border-white/5 bg-card/50 text-center py-12">
            <CardContent>
              <FolderKanban className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first project to get started
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Project
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onEdit={() => openEditDialog(project)}
                onDelete={() => deleteProject({ variables: { id: project.id } })}
                onClick={() => navigate(`/org/${orgId}/project/${project.id}`)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }) => {
  const colorMap = {
    primary: 'text-primary bg-primary/10',
    emerald: 'text-emerald-500 bg-emerald-500/10',
    blue: 'text-blue-500 bg-blue-500/10',
    amber: 'text-amber-500 bg-amber-500/10',
  };

  return (
    <Card className="border-white/5 bg-card/50">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{title}</p>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
          </div>
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ProjectCard = ({ project, onEdit, onDelete, onClick }) => {
  const statusConfig = STATUS_CONFIG[project.status] || STATUS_CONFIG.ACTIVE;
  const StatusIcon = statusConfig.icon;
  const progress = project.taskCount > 0 
    ? Math.round((project.completedTasks / project.taskCount) * 100) 
    : 0;

  return (
    <Card 
      className="border-white/5 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
      data-testid={`project-card-${project.id}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div 
            className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${statusConfig.class}`}
          >
            <StatusIcon className="h-3 w-3" />
            {statusConfig.label}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8" data-testid={`project-menu-${project.id}`}>
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }} data-testid={`edit-project-${project.id}`}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-destructive" data-testid={`delete-project-${project.id}`}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Project?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete "{project.name}" and all its tasks. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <CardTitle className="text-lg font-semibold mt-2 cursor-pointer" onClick={onClick}>
          {project.name}
        </CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2">{project.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent onClick={onClick}>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{project.completedTasks}/{project.taskCount} tasks</span>
          </div>
          <Progress value={progress} className="h-2" />
          {project.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="h-3 w-3" />
              Due {format(new Date(project.dueDate), 'MMM d, yyyy')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default OrgDashboardPage;
