import React from "react";
import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ProtectedRoute({
  path,
  component: Component,
  exact = false,
}: {
  path: string;
  component: () => React.JSX.Element;
  exact?: boolean;
}) {
  const { user, loading } = useAuth();

  // Show loading state while checking authentication
  if (loading) {
    return (
      <Route path={path} exact={exact}>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Card className="w-96">
            <CardContent className="p-6">
              <div className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </CardContent>
          </Card>
        </div>
      </Route>
    );
  }

  // Redirect to auth if not authenticated
  if (!user) {
    return (
      <Route path={path} exact={exact}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Render the protected component if authenticated
  return <Route path={path} exact={exact} component={Component} />;
}