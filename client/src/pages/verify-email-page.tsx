import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, AlertCircle, Mail, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'resend'>('loading');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
      verifyEmail(token);
    } else {
      setStatus('resend');
      setMessage('No verification token provided. Enter your email to resend verification.');
    }
  }, []);

  const verifyEmail = async (token: string) => {
    try {
      const response = await fetch(`/api/verify-email?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setStatus('success');
        setMessage(data.message);
        toast({
          title: "Email Verified!",
          description: "Your email has been verified successfully. You can now log in.",
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          setLocation('/auth');
        }, 3000);
      } else {
        setStatus('error');
        setMessage(data.message);
      }
    } catch (error) {
      setStatus('error');
      setMessage('Failed to verify email. Please try again.');
    }
  };

  const resendVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Email Required",
        description: "Please enter your email address",
        variant: "destructive",
      });
      return;
    }

    setResending(true);
    try {
      const response = await fetch('/api/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Verification Email Sent",
          description: "Please check your inbox for a new verification email.",
        });
        setStatus('success');
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        toast({
          title: "Failed to Send Email",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResending(false);
    }
  };

  const renderContent = () => {
    switch (status) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin mx-auto mb-4 text-cyan-500" />
            <h2 className="text-xl font-semibold mb-2">Verifying your email...</h2>
            <p className="text-gray-600">Please wait while we verify your email address.</p>
          </div>
        );

      case 'success':
        return (
          <div className="text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-xl font-semibold mb-2 text-green-700">Email Verified!</h2>
            <p className="text-gray-600 mb-4">{message}</p>
            <Button 
              onClick={() => setLocation('/auth')}
              className="bg-cyan-500 hover:bg-cyan-600"
            >
              Go to Login
            </Button>
          </div>
        );

      case 'error':
        return (
          <div className="text-center">
            <AlertCircle className="h-16 w-16 mx-auto mb-4 text-red-500" />
            <h2 className="text-xl font-semibold mb-2 text-red-700">Verification Failed</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            <div className="space-y-4">
              <Button 
                onClick={() => setStatus('resend')}
                variant="outline"
                className="w-full"
              >
                Resend Verification Email
              </Button>
              <Button 
                onClick={() => setLocation('/auth')}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
              >
                Back to Login
              </Button>
            </div>
          </div>
        );

      case 'resend':
        return (
          <div className="text-center">
            <Mail className="h-16 w-16 mx-auto mb-4 text-cyan-500" />
            <h2 className="text-xl font-semibold mb-2">Resend Verification Email</h2>
            <p className="text-gray-600 mb-6">{message}</p>
            
            <form onSubmit={resendVerification} className="space-y-4">
              <div className="text-left">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-cyan-50 border-cyan-200"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                disabled={resending}
                className="w-full bg-cyan-500 hover:bg-cyan-600"
              >
                {resending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Send Verification Email'
                )}
              </Button>
            </form>
            
            <Button 
              onClick={() => setLocation('/auth')}
              variant="link"
              className="mt-4 text-cyan-600"
            >
              Back to Login
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-gray-800">
            Email Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}