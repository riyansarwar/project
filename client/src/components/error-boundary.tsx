import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // You can add client-side logging here
    console.error("ErrorBoundary caught: ", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
          <Card className="max-w-xl w-full">
            <CardHeader>
              <CardTitle className="text-2xl">Something went wrong</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                An unexpected error occurred while rendering this page. Try reloading.
              </p>
              <div className="flex gap-2">
                <Button onClick={this.handleReload}>Reload</Button>
                <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>Go to Dashboard</Button>
              </div>
              {process.env.NODE_ENV === "development" && this.state.error && (
                <pre className="mt-4 p-3 bg-muted rounded text-xs overflow-auto max-h-64">
                  {this.state.error?.message}
                </pre>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children as React.ReactElement;
  }
}