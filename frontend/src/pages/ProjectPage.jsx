import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useSubscription } from '@apollo/client/react';
import { 
  GET_PROJECT, GET_TASKS, CREATE_TASK, UPDATE_TASK, DELETE_TASK,
  GET_TASK_COMMENTS, ADD_COMMENT, DELETE_COMMENT, ORGANIZATION_EVENTS
} from '../lib/graphql';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Badge } from '../components/ui/badge';
import { Skeleton } from '../components/ui/skeleton';
import { ScrollArea } from '../components/ui/scroll-area';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../components/ui/sheet';
import { Separator } from '../components/ui/separator';
import { Avatar, AvatarFallback } from '../components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../components/ui/alert-dialog';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { 
  Plus, ArrowLeft, Calendar as CalendarIcon, Loader2, 
  CheckCircle2, Clock, Circle, MoreVertical, Pencil, Trash2,
  MessageSquare, Send, X, GripVertical, User
} from 'lucide-react';

const TASK_STATUS_CONFIG = {
  TODO: { label: 'To Do', class: 'status-todo', icon: Circle, column: 0 },
  IN_PROGRESS: { label: 'In Progress', class: 'status-in-progress', icon: Clock, column: 1 },
  DONE: { label: 'Done', class: 'status-done', icon: CheckCircle2, column: 2 },
};

const ProjectPage = () => {
  const { orgId, projectId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', status: 'TODO', assignee_email: '', due_date: null
  });

  const { data: projectData, loading: projectLoading } = useQuery(GET_PROJECT, {
    variables: { id: projectId },
  });

  const { data: tasksData, loading: tasksLoading, refetch: refetchTasks } = useQuery(GET_TASKS, {
    variables: { projectId },
  });

  // Subscription for real-time updates
  useSubscription(ORGANIZATION_EVENTS, {
    variables: { organizationId: orgId },
    onData: ({ data }) => {
      if (data?.data?.organizationEvents) {
        refetchTasks();
      }
    },
  });

  const [createTask, { loading: creating }] = useMutation(CREATE_TASK, {
    onCompleted: () => {
      toast.success('Task created!');
      closeDialog();
      refetchTasks();
    },
    onError: (error) => toast.error(error.message),
  });

  const [updateTask, { loading: updating }] = useMutation(UPDATE_TASK, {
    onCompleted: () => {
      toast.success('Task updated!');
      closeDialog();
      refetchTasks();
    },
    onError: (error) => toast.error(error.message),
  });

  const [deleteTask] = useMutation(DELETE_TASK, {
    onCompleted: () => {
      toast.success('Task deleted');
      setSelectedTask(null);
      refetchTasks();
    },
    onError: (error) => toast.error(error.message),
  });

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingTask(null);
    setTaskForm({ title: '', description: '', status: 'TODO', assignee_email: '', due_date: null });
  };

  const openEditDialog = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description,
      status: task.status,
      assignee_email: task.assigneeEmail,
      due_date: task.dueDate ? new Date(task.dueDate) : null,
    });
    setDialogOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!taskForm.title) {
      toast.error('Task title is required');
      return;
    }

    const input = {
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status,
      assigneeEmail: taskForm.assignee_email,
      dueDate: taskForm.due_date ? taskForm.due_date.toISOString() : null,
    };

    if (editingTask) {
      updateTask({ variables: { id: editingTask.id, input } });
    } else {
      createTask({ variables: { input: { ...input, projectId } } });
    }
  };

  const handleStatusChange = (taskId, newStatus) => {
    updateTask({ variables: { id: taskId, input: { status: newStatus } } });
  };

  const project = projectData?.project;
  const tasks = tasksData?.tasks || [];

  // Group tasks by status
  const tasksByStatus = {
    TODO: tasks.filter(t => t.status === 'TODO'),
    IN_PROGRESS: tasks.filter(t => t.status === 'IN_PROGRESS'),
    DONE: tasks.filter(t => t.status === 'DONE'),
  };

  if (projectLoading) {
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
        <div className="max-w-full mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/org/${orgId}`)} data-testid="back-to-org-btn">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-bold tracking-tight">{project?.name}</h1>
              <p className="text-xs text-muted-foreground">{project?.description}</p>
            </div>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); else setDialogOpen(true); }}>
            <DialogTrigger asChild>
              <Button data-testid="create-task-btn" className="shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]">
                <Plus className="h-4 w-4 mr-2" />
                Add Task
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingTask ? 'Edit Task' : 'Create Task'}</DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Update task details' : 'Add a new task to this project'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="task-title">Title</Label>
                  <Input
                    id="task-title"
                    placeholder="Implement feature X"
                    value={taskForm.title}
                    onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                    data-testid="task-title-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="task-desc">Description</Label>
                  <Textarea
                    id="task-desc"
                    placeholder="Task details..."
                    value={taskForm.description}
                    onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                    data-testid="task-desc-input"
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                      value={taskForm.status}
                      onValueChange={(value) => setTaskForm({ ...taskForm, status: value })}
                    >
                      <SelectTrigger data-testid="task-status-select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Assignee Email</Label>
                    <Input
                      placeholder="assignee@example.com"
                      value={taskForm.assignee_email}
                      onChange={(e) => setTaskForm({ ...taskForm, assignee_email: e.target.value })}
                      data-testid="task-assignee-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal"
                        data-testid="task-duedate-btn"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {taskForm.due_date ? format(taskForm.due_date, 'PPP') : 'Pick date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={taskForm.due_date}
                        onSelect={(date) => setTaskForm({ ...taskForm, due_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating || updating} data-testid="task-submit-btn">
                    {(creating || updating) && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                    {editingTask ? 'Update' : 'Create'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Kanban Board */}
      <main className="p-6">
        {tasksLoading ? (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex-shrink-0 w-80">
                <Skeleton className="h-8 w-24 mb-4" />
                <div className="space-y-3">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-32 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {Object.entries(TASK_STATUS_CONFIG).map(([status, config]) => (
              <KanbanColumn
                key={status}
                status={status}
                config={config}
                tasks={tasksByStatus[status]}
                onTaskClick={setSelectedTask}
                onStatusChange={handleStatusChange}
                onEdit={openEditDialog}
                onDelete={(id) => deleteTask({ variables: { id } })}
              />
            ))}
          </div>
        )}
      </main>

      {/* Task Detail Sheet */}
      <TaskDetailSheet
        task={selectedTask}
        onClose={() => setSelectedTask(null)}
        onEdit={() => { openEditDialog(selectedTask); setSelectedTask(null); }}
        onDelete={() => deleteTask({ variables: { id: selectedTask.id } })}
        onStatusChange={handleStatusChange}
      />
    </div>
  );
};

const KanbanColumn = ({ status, config, tasks, onTaskClick, onStatusChange, onEdit, onDelete }) => {
  const StatusIcon = config.icon;

  return (
    <div className="flex-shrink-0 w-80">
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-1.5 rounded ${config.class}`}>
          <StatusIcon className="h-4 w-4" />
        </div>
        <h3 className="font-semibold">{config.label}</h3>
        <Badge variant="secondary" className="ml-auto">{tasks.length}</Badge>
      </div>
      <ScrollArea className="h-[calc(100vh-200px)]">
        <div className="space-y-3 pr-2">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              onEdit={() => onEdit(task)}
              onDelete={() => onDelete(task.id)}
              onStatusChange={onStatusChange}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No tasks
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

const TaskCard = ({ task, onClick, onEdit, onDelete, onStatusChange }) => {
  return (
    <Card 
      className="border-white/5 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
      data-testid={`task-card-${task.id}`}
    >
      <CardContent className="p-4" onClick={onClick}>
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium text-sm line-clamp-2">{task.title}</h4>
          <div onClick={(e) => e.stopPropagation()}>
            <Select
              value={task.status}
              onValueChange={(value) => onStatusChange(task.id, value)}
            >
              <SelectTrigger className="h-7 w-7 p-0 border-0 bg-transparent">
                <GripVertical className="h-4 w-4 text-muted-foreground" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="TODO">To Do</SelectItem>
                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                <SelectItem value="DONE">Done</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        {task.description && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
        )}
        <div className="flex items-center gap-2 mt-3">
          {task.assigneeEmail && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <User className="h-3 w-3" />
              <span className="truncate max-w-[120px]">{task.assigneeEmail}</span>
            </div>
          )}
          {task.dueDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground ml-auto">
              <CalendarIcon className="h-3 w-3" />
              {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const TaskDetailSheet = ({ task, onClose, onEdit, onDelete, onStatusChange }) => {
  const { user } = useAuth();
  const [comment, setComment] = useState('');

  const { data: commentsData, refetch: refetchComments } = useQuery(GET_TASK_COMMENTS, {
    variables: { taskId: task?.id },
    skip: !task,
  });

  const [addComment, { loading: addingComment }] = useMutation(ADD_COMMENT, {
    onCompleted: () => {
      setComment('');
      refetchComments();
      toast.success('Comment added');
    },
    onError: (error) => toast.error(error.message),
  });

  const [deleteComment] = useMutation(DELETE_COMMENT, {
    onCompleted: () => {
      refetchComments();
      toast.success('Comment deleted');
    },
    onError: (error) => toast.error(error.message),
  });

  const handleAddComment = (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    addComment({ variables: { input: { taskId: task.id, content: comment } } });
  };

  const comments = commentsData?.taskComments || [];
  const statusConfig = task ? TASK_STATUS_CONFIG[task.status] : null;

  return (
    <Sheet open={!!task} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {task && (
          <>
            <SheetHeader>
              <div className="flex items-center justify-between">
                <div className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 ${statusConfig?.class}`}>
                  {statusConfig && <statusConfig.icon className="h-3 w-3" />}
                  {statusConfig?.label}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={onEdit} data-testid="edit-task-btn">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-destructive" data-testid="delete-task-btn">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete this task and all its comments.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onDelete} className="bg-destructive">Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              <SheetTitle className="text-left mt-4">{task.title}</SheetTitle>
              {task.description && (
                <SheetDescription className="text-left">{task.description}</SheetDescription>
              )}
            </SheetHeader>

            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Select value={task.status} onValueChange={(value) => onStatusChange(task.id, value)}>
                    <SelectTrigger className="mt-1" data-testid="task-detail-status-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TODO">To Do</SelectItem>
                      <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                      <SelectItem value="DONE">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Assignee</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    {task.assigneeEmail ? (
                      <>
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">{task.assigneeEmail[0].toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="truncate">{task.assigneeEmail}</span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">Unassigned</span>
                    )}
                  </div>
                </div>
              </div>

              {task.dueDate && (
                <div>
                  <Label className="text-xs text-muted-foreground">Due Date</Label>
                  <div className="mt-1 flex items-center gap-2 text-sm">
                    <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                    {format(new Date(task.dueDate), 'MMMM d, yyyy')}
                  </div>
                </div>
              )}

              <Separator />

              {/* Comments */}
              <div>
                <h4 className="font-medium flex items-center gap-2 mb-4">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({comments.length})
                </h4>

                <form onSubmit={handleAddComment} className="flex gap-2 mb-4">
                  <Input
                    placeholder="Add a comment..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    data-testid="comment-input"
                  />
                  <Button type="submit" size="icon" disabled={addingComment || !comment.trim()} data-testid="add-comment-btn">
                    {addingComment ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>

                <div className="space-y-3">
                  {comments.map((c) => (
                    <div key={c.id} className="bg-secondary/50 rounded-lg p-3" data-testid={`comment-${c.id}`}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-xs">{c.authorEmail[0].toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">{c.authorEmail}</span>
                        </div>
                        {c.authorEmail === user?.email && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteComment({ variables: { id: c.id } })}
                            data-testid={`delete-comment-${c.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm">{c.content}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(c.createdAt), 'MMM d, h:mm a')}
                      </p>
                    </div>
                  ))}
                  {comments.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No comments yet. Be the first to comment!
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default ProjectPage;
