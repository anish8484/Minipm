import React, { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useNavigate, Link } from 'react-router-dom';
import { LOGIN_MUTATION, REGISTER_MUTATION } from '../lib/graphql';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';
import { Loader2, FolderKanban } from 'lucide-react';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [activeTab, setActiveTab] = useState('login');
  
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ email: '', password: '', name: '' });

  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_MUTATION, {
    onCompleted: (data) => {
      login(data.login.token, data.login.user);
      toast.success('Welcome back!');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Login failed');
    },
  });

  const [registerMutation, { loading: registerLoading }] = useMutation(REGISTER_MUTATION, {
    onCompleted: (data) => {
      login(data.register.token, data.register.user);
      toast.success('Account created successfully!');
      navigate('/dashboard');
    },
    onError: (error) => {
      toast.error(error.message || 'Registration failed');
    },
  });

  const handleLogin = (e) => {
    e.preventDefault();
    if (!loginForm.email || !loginForm.password) {
      toast.error('Please fill in all fields');
      return;
    }
    loginMutation({ variables: { input: loginForm } });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!registerForm.email || !registerForm.password || !registerForm.name) {
      toast.error('Please fill in all fields');
      return;
    }
    registerMutation({ variables: { input: registerForm } });
  };

  return (
    <div className="min-h-screen flex gradient-bg">
      {/* Left side - Image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1610741804272-059e1d3c5dba?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDk1Nzl8MHwxfHNlYXJjaHwyfHxtb2Rlcm4lMjBvZmZpY2UlMjBhcmNoaXRlY3R1cmUlMjBhYnN0cmFjdHxlbnwwfHx8fDE3Njg2ODQ4NDV8MA&ixlib=rb-4.1.0&q=85)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-transparent" />
        <div className="relative z-10 flex flex-col justify-center p-12">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-primary/20">
              <FolderKanban className="h-8 w-8 text-primary" />
            </div>
            <span className="text-2xl font-bold tracking-tight">MiniPM</span>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold tracking-tight mb-4">
            Manage Projects <br />
            <span className="text-primary">Effortlessly</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-md">
            A powerful multi-tenant project management tool for teams of all sizes. 
            Organize, track, and collaborate in real-time.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="p-2 rounded-lg bg-primary/20">
              <FolderKanban className="h-6 w-6 text-primary" />
            </div>
            <span className="text-xl font-bold tracking-tight">MiniPM</span>
          </div>
          
          <Card className="border-white/5 bg-card/50 backdrop-blur-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-bold tracking-tight">
                {activeTab === 'login' ? 'Welcome back' : 'Create account'}
              </CardTitle>
              <CardDescription>
                {activeTab === 'login' 
                  ? 'Enter your credentials to access your workspace' 
                  : 'Get started with your free account'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="login" data-testid="login-tab">Login</TabsTrigger>
                  <TabsTrigger value="register" data-testid="register-tab">Register</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="space-y-4">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="you@example.com"
                        value={loginForm.email}
                        onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                        data-testid="login-email-input"
                        className="bg-input/50 border-transparent focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginForm.password}
                        onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                        data-testid="login-password-input"
                        className="bg-input/50 border-transparent focus:border-primary"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]" 
                      disabled={loginLoading}
                      data-testid="login-submit-btn"
                    >
                      {loginLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        'Sign in'
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="register" className="space-y-4">
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-name">Full Name</Label>
                      <Input
                        id="register-name"
                        type="text"
                        placeholder="John Doe"
                        value={registerForm.name}
                        onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                        data-testid="register-name-input"
                        className="bg-input/50 border-transparent focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        type="email"
                        placeholder="you@example.com"
                        value={registerForm.email}
                        onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                        data-testid="register-email-input"
                        className="bg-input/50 border-transparent focus:border-primary"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        type="password"
                        placeholder="••••••••"
                        value={registerForm.password}
                        onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                        data-testid="register-password-input"
                        className="bg-input/50 border-transparent focus:border-primary"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full shadow-[0_0_20px_-5px_rgba(99,102,241,0.4)]" 
                      disabled={registerLoading}
                      data-testid="register-submit-btn"
                    >
                      {registerLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating account...
                        </>
                      ) : (
                        'Create account'
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
