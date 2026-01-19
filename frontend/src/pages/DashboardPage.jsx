import React, { useState } from 'react';
import { useQuery, useMutation } from '@apollo/client/react';
import { useNavigate } from 'react-router-dom';
import { GET_ORGANIZATIONS, CREATE_ORGANIZATION, GET_PROJECT_STATS } from '../lib/graphql';
import { useAuth } from '../contexts/AuthContext';
import { useOrg } from '../contexts/OrgContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Skeleton } from '../components/ui/skeleton';
import { toast } from 'sonner';
import { 
  Plus, Building2, LogOut, FolderKanban, ArrowRight, 
  Users, CheckCircle2, Clock, Loader2 
} from 'lucide-react';

const DashboardPage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { selectOrg } = useOrg();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({ name: '', slug: '', contact_email: '' });

  const { data, loading, refetch } = useQuery(GET_ORGANIZATIONS);

  const [createOrg, { loading: creating }] = useMutation(CREATE_ORGANIZATION, {
    onCompleted: () => {
      toast.success('Organization created!');
      setDialogOpen(false);
      setOrgForm({ name: '', slug: '', contact_email: '' });
      refetch();
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const handleCreateOrg = (e) => {
    e.preventDefault();
    if (!orgForm.name || !orgForm.slug || !orgForm.contact_email) {
      toast.error('Please fill in all fields');
      return;
    }
    createOrg({
      variables: {
        input: {
          name: orgForm.name,
          slug: orgForm.slug.toLowerCase().replace(/\s+/g, '-'),
          contactEmail: orgForm.contact_email,
        },
      },
    });
  };

  const handleSelectOrg = (org) => {
    selectOrg(org);
    navigate(`/org/${org.id}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Header */}
      <header className="glass sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <FolderKanban className="h-5 w-5 text-primary" />
            </div>
            <span className="text-lg font-bold tracking-tight">MiniPM</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {user?.name}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              data-testid="logout-btn"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-12">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            Welcome back, {user?.name?.split(' ')[0]}
          </h1>
          <p className="text-muted-foreground text-lg">
            Select an organization to get started or create a new one
          </p>
        </div>

        {/* Organizations Grid */}
        <div className="mb-8 flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            Your Organizations
          </h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="create-org-btn" className="shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]">
                <Plus className="h-4 w-4 mr-2" />
                New Organization
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create Organization</DialogTitle>
                <DialogDescription>
                  Add a new organization to manage your projects
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateOrg} className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Inc."
                    value={orgForm.name}
                    onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })}
                    data-testid="org-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-slug">Slug (URL identifier)</Label>
                  <Input
                    id="org-slug"
                    placeholder="acme-inc"
                    value={orgForm.slug}
                    onChange={(e) => setOrgForm({ ...orgForm, slug: e.target.value })}
                    data-testid="org-slug-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="org-email">Contact Email</Label>
                  <Input
                    id="org-email"
                    type="email"
                    placeholder="contact@acme.com"
                    value={orgForm.contact_email}
                    onChange={(e) => setOrgForm({ ...orgForm, contact_email: e.target.value })}
                    data-testid="org-email-input"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} data-testid="create-org-submit-btn">
                    {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Create
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="border-white/5 bg-card/50">
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : data?.organizations?.length === 0 ? (
          <Card className="border-white/5 bg-card/50 text-center py-12">
            <CardContent>
              <Building2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first organization to start managing projects
              </p>
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Organization
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data?.organizations?.map((org) => (
              <OrgCard key={org.id} org={org} onClick={() => handleSelectOrg(org)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

const OrgCard = ({ org, onClick }) => {
  const { data: statsData } = useQuery(GET_PROJECT_STATS, {
    variables: { organizationId: org.id },
    fetchPolicy: 'cache-first',
  });

  const stats = statsData?.projectStats;

  return (
    <Card 
      className="border-white/5 bg-card/50 hover:bg-card/80 hover:border-primary/50 transition-all duration-300 cursor-pointer group"
      onClick={onClick}
      data-testid={`org-card-${org.slug}`}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="p-2 rounded-lg bg-primary/10">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <CardTitle className="text-lg font-semibold mt-3">{org.name}</CardTitle>
        <CardDescription className="font-mono text-xs">{org.slug}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <FolderKanban className="h-4 w-4" />
            <span>{stats?.totalProjects || 0} projects</span>
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <span>{stats?.completionRate || 0}%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardPage;
