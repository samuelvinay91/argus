'use client';

import { useState } from 'react';
import { Loader2, Plus, FolderPlus, Globe } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateProject } from '@/lib/hooks/use-projects';

interface CreateProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (project: any) => void;
}

export function CreateProjectModal({
  open,
  onOpenChange,
  onSuccess,
}: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [urlError, setUrlError] = useState('');

  const createProject = useCreateProject();

  const validateUrl = (value: string) => {
    if (!value) {
      setUrlError('URL is required');
      return false;
    }
    try {
      new URL(value);
      setUrlError('');
      return true;
    } catch {
      setUrlError('Please enter a valid URL (e.g., https://example.com)');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) return;
    if (!validateUrl(url)) return;

    try {
      const project = await createProject.mutateAsync({
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        app_url: url.trim(),
        description: description.trim() || undefined,
      });

      // Reset form
      setName('');
      setUrl('');
      setDescription('');
      setUrlError('');

      onOpenChange(false);
      onSuccess?.(project);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  const handleClose = () => {
    setName('');
    setUrl('');
    setDescription('');
    setUrlError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Create New Project
          </DialogTitle>
          <DialogDescription>
            Add a new application to test. You can configure tests, discovery, and visual regression for each project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name <span className="text-error">*</span>
              </label>
              <Input
                id="name"
                placeholder="My Application"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                A friendly name for your application
              </p>
            </div>

            <div className="space-y-2">
              <label htmlFor="url" className="text-sm font-medium">
                Application URL <span className="text-error">*</span>
              </label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="url"
                  placeholder="https://myapp.com"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (urlError) validateUrl(e.target.value);
                  }}
                  onBlur={() => url && validateUrl(url)}
                  className="pl-10"
                />
              </div>
              {urlError ? (
                <p className="text-xs text-error">{urlError}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  The URL of the application you want to test
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description <span className="text-muted-foreground">(optional)</span>
              </label>
              <Textarea
                id="description"
                placeholder="Brief description of what this application does..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createProject.isPending || !name.trim() || !url.trim()}
            >
              {createProject.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Create Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Inline project creation form for empty states
export function CreateProjectInline({
  onSuccess,
  className,
}: {
  onSuccess?: (project: any) => void;
  className?: string;
}) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const createProject = useCreateProject();

  const handleCreate = async () => {
    if (!name || !url) return;

    try {
      const project = await createProject.mutateAsync({
        name,
        slug: name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        app_url: url,
      });

      setName('');
      setUrl('');
      onSuccess?.(project);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  return (
    <div className={className}>
      <div className="space-y-4">
        <Input
          placeholder="Project name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Application URL (e.g., https://myapp.com)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button
          className="w-full"
          onClick={handleCreate}
          disabled={createProject.isPending || !name || !url}
        >
          {createProject.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Plus className="h-4 w-4 mr-2" />
          )}
          Create Project
        </Button>
      </div>
    </div>
  );
}
