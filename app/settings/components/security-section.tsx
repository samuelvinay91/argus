'use client';

import { Shield, CheckCircle, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function SecuritySection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Security Settings
        </CardTitle>
        <CardDescription>
          Security is managed by Clerk authentication
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h4 className="font-medium">Clerk Authentication</h4>
              <p className="text-sm text-muted-foreground">
                Your account is secured by Clerk
              </p>
            </div>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Multi-factor authentication available</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Social login (Google, GitHub)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span>Session management</span>
            </div>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => window.open('https://accounts.skopaq.ai/user', '_blank')}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          Manage Security in Clerk
        </Button>
      </CardContent>
    </Card>
  );
}
