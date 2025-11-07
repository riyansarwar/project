import React, { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { login, register, loading } = useAuth();
  const { toast } = useToast();
  
  const [loginForm, setLoginForm] = useState({
    username: "",
    password: "",
    role: "student", // Default to student
    rememberMe: false
  });
  
  const [registerForm, setRegisterForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    confirmPassword: "",
    role: "student" // Default to student
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.role) {
      toast({
        title: "Role Required",
        description: "Please select whether you are a teacher or student",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await login(loginForm.username, loginForm.password, loginForm.rememberMe, loginForm.role);
      toast({
        title: "Success",
        description: "Logged in successfully!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!registerForm.role) {
      toast({
        title: "Role Required",
        description: "Please select whether you are a teacher or student",
        variant: "destructive",
      });
      return;
    }
    
    if (registerForm.password !== registerForm.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords do not match",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await register(
        registerForm.email,
        registerForm.password,
        registerForm.firstName,
        registerForm.lastName,
        registerForm.role,
        registerForm.username
      );
      toast({
        title: "Success",
        description: "Account created successfully!",
      });
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Card className="w-full max-w-4xl shadow-2xl rounded-lg overflow-hidden">
        <div className="flex">
          {/* Left Side - Branding */}
          <div className="hidden md:flex md:w-1/2 bg-gradient-to-br from-cyan-400 to-blue-500 text-white p-12 flex-col justify-center items-center">
            <div className="text-center">
              <div className="mb-8">
                <div className="w-24 h-24 mx-auto mb-6 bg-white/20 rounded-2xl flex items-center justify-center">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="3" y="4" width="18" height="14" rx="2" stroke="white" strokeWidth="2"/>
                    <path d="M7 8h6M7 12h10M7 16h4" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <circle cx="17" cy="20" r="2" fill="white"/>
                  </svg>
                </div>
              </div>
              <h1 className="text-4xl font-bold mb-4">Perceive AI</h1>
              <p className="text-xl mb-8 opacity-90">
                AI-powered assessment platform for the modern classroom
              </p>
              <div className="space-y-3 text-left">
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>AI-powered grading</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Personalized assessments</span>
                </div>
                <div className="flex items-center">
                  <div className="w-2 h-2 bg-white rounded-full mr-3"></div>
                  <span>Detailed performance analytics</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Auth Form */}
          <div className="w-full md:w-1/2 p-8">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger 
                  value="login" 
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
                >
                  Log In
                </TabsTrigger>
                <TabsTrigger 
                  value="register"
                  className="data-[state=active]:bg-cyan-500 data-[state=active]:text-white"
                >
                  Register
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="username">Username</Label>
                    <Input
                      id="username"
                      placeholder="your.username"
                      value={loginForm.username}
                      onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Checkbox 
                        id="remember"
                        checked={loginForm.rememberMe}
                        onCheckedChange={(checked) => 
                          setLoginForm({ ...loginForm, rememberMe: !!checked })
                        }
                      />
                      <Label htmlFor="remember" className="text-sm">Remember me</Label>
                    </div>
                    <Button variant="link" className="text-cyan-600 p-0">
                      Forgot password?
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <Label>Login as: <span className="text-red-500">*</span></Label>
                    <RadioGroup 
                      value={loginForm.role} 
                      onValueChange={(value) => setLoginForm({ ...loginForm, role: value })}
                      className="flex space-x-6"
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="teacher-login" />
                        <Label htmlFor="teacher-login">Teacher</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="student" id="student-login" />
                        <Label htmlFor="student-login">Student</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Logging in..." : "Log In"}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="register">
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-reg">Email</Label>
                    <Input
                      id="email-reg"
                      type="email"
                      placeholder="john.doe@example.com"
                      value={registerForm.email}
                      onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        placeholder="John"
                        value={registerForm.firstName}
                        onChange={(e) => setRegisterForm({ ...registerForm, firstName: e.target.value })}
                        className="bg-cyan-50 border-cyan-200"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        placeholder="Doe"
                        value={registerForm.lastName}
                        onChange={(e) => setRegisterForm({ ...registerForm, lastName: e.target.value })}
                        className="bg-cyan-50 border-cyan-200"
                        required
                      />
                    </div>
                  </div>
                  

                  <div className="space-y-2">
                    <Label htmlFor="username-reg">Username</Label>
                    <Input
                      id="username-reg"
                      placeholder="your.username"
                      value={registerForm.username}
                      onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password-reg">Password</Label>
                    <Input
                      id="password-reg"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.password}
                      onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="••••••••"
                      value={registerForm.confirmPassword}
                      onChange={(e) => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })}
                      className="bg-cyan-50 border-cyan-200"
                      required
                    />
                  </div>

                  <div className="space-y-3">
                    <Label>Register as: <span className="text-red-500">*</span></Label>
                    <RadioGroup 
                      value={registerForm.role} 
                      onValueChange={(value) => setRegisterForm({ ...registerForm, role: value })}
                      className="flex space-x-6"
                      required
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="teacher" id="teacher-reg" />
                        <Label htmlFor="teacher-reg">Teacher</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="student" id="student-reg" />
                        <Label htmlFor="student-reg">Student</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full bg-cyan-500 hover:bg-cyan-600 text-white"
                    disabled={loading}
                  >
                    {loading ? "Creating account..." : "Create Account"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </Card>
    </div>
  );
}