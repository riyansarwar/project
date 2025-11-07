import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Key, Loader2, Mail } from "lucide-react";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [mode, setMode] = useState<'request' | 'reset'>('request');
  const [status, setStatus] = useState<'form' | 'loading' | 'success' | 'error'>('form');
  const [message, setMessage] = useState('');
  
  const [requestForm, setRequestForm] = useState({
    email: ''
  });
  
  const [resetForm, setResetForm] = useState({
    token: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      setMode('reset');
      setResetForm(prev => ({ ...prev, token }));
    }
  }, []);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!requestForm.email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestForm),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        toast({
          title: "Reset Email Sent",
          description: "Please check your inbox for password reset instructions.",
        });
      } else {
        setStatus('error');
        setMessage(data.message);
        toast({
          title: "Error",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to send reset email. Please try again.');
      toast({
        title: "Error",
        description: "Failed to send reset email. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!resetForm.newPassword || !resetForm.confirmPassword) {
      toast({
        title: "All Fields Required",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (resetForm.newPassword !== resetForm.confirmPassword) {
      toast({
        title: "Passwords Don't Match",
        description: "Please ensure both password fields match",
        variant: "destructive",
      });
      return;
    }

    if (resetForm.newPassword.length < 8) {
      toast({
        title: "Password Too Short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setStatus('loading');
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: resetForm.token,
          newPassword: resetForm.newPassword
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        toast({
          title: "Password Reset Successfully",
          description: "Your password has been reset. You can now log in.",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation('/auth');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message);
        toast({
          title: "Reset Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to reset password. Please try again.');
      toast({
        title: "Error",
        description: "Failed to reset password. Please try again.",
        variant: "destructive",
      });
    }
  };

  const renderRequestForm = () => (
    <>
      <div className="text-center mb-6">
        <Mail className="h-16 w-16 mx-auto mb-4 text-cyan-500" />
        <h2 className="text-xl font-semibold mb-2">Forgot Password</h2>
        <p className="text-gray-600">
          Enter your email address and we'll send you a link to reset your password.
        </p>
      </div>

      <form onSubmit={handleForgotPassword} className="space-y-4">
        <div>
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="your@email.com"
            value={requestForm.email}
            onChange={(e) => setRequestForm({ ...requestForm, email: e.target.value })}
            className="bg-cyan-50 border-cyan-200"
            required
          />
        </div>
        
        <Button 
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-cyan-500 hover:bg-cyan-600"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sending Reset Email...
            </>
          ) : (
            'Send Reset Email'
          )}
        </Button>
      </form>

      <Button 
        onClick={() => setLocation('/auth')}
        variant="link"
        className="w-full mt-4 text-cyan-600"
      >
        Back to Login
      </Button>
    </>
  );

  const renderResetForm = () => (
    <>
      <div className="text-center mb-6">
        <Key className="h-16 w-16 mx-auto mb-4 text-cyan-500" />
        <h2 className="text-xl font-semibold mb-2">Reset Password</h2>
        <p className="text-gray-600">
          Enter your new password below.
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4">
        <div>
          <Label htmlFor="newPassword">New Password</Label>
          <Input
            id="newPassword"
            type="password"
            placeholder="Enter new password"
            value={resetForm.newPassword}
            onChange={(e) => setResetForm({ ...resetForm, newPassword: e.target.value })}
            className="bg-cyan-50 border-cyan-200"
            required
          />
        </div>
        
        <div>
          <Label htmlFor="confirmPassword">Confirm New Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            placeholder="Confirm new password"
            value={resetForm.confirmPassword}
            onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
            className="bg-cyan-50 border-cyan-200"
            required
          />
        </div>
        
        <Button 
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-cyan-500 hover:bg-cyan-600"
        >
          {status === 'loading' ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Resetting Password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>

      <Button 
        onClick={() => setLocation('/auth')}
        variant="link"
        className="w-full mt-4 text-cyan-600"
      >
        Back to Login
      </Button>
    </>
  );

  const renderStatusContent = () => {
    if (status === 'success') {
      return (
        <div className="text-center">
          <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
          <h2 className="text-xl font-semibold mb-2 text-green-700">Success!</h2>
          <p className="text-gray-600 mb-4">{message}</p>
          <Button 
            onClick={() => setLocation('/auth')}
            className="bg-cyan-500 hover:bg-cyan-600"
          >
            Go to Login
          </Button>
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="text-center">
          <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2 text-red-700">Error</h2>
          <p className="text-gray-600 mb-6">{message}</p>
          <div className="space-y-2">
            <Button 
              onClick={() => setStatus('form')}
              className="w-full bg-cyan-500 hover:bg-cyan-600"
            >
              Try Again
            </Button>
            <Button 
              onClick={() => setLocation('/auth')}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      );
    }

    return mode === 'request' ? renderRequestForm() : renderResetForm();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Password Reset
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {renderStatusContent()}
        </CardContent>
      </Card>
    </div>
  );
}