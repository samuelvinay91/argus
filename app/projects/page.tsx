'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import {
  Plus,
  FolderKanban,
  ExternalLink,
  Play,
  MoreVertical,
  Trash2,
  Edit,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Grid,
  List,
  Globe,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CreateProjectModal, CreateProjectInline } from '@/components/projects/create-project-modal';
import { useProjects, useDeleteProject } from '@/lib/hooks/use-projects';
import { cn } from '@/lib/utils';
import type { Project } from '@/lib/supabase/types';

export default function ProjectsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: projects = [], isLoading } = useProjects();
  const deleteProject = useDeleteProject();

  // Filter projects by search
  const filteredProjects = projects.filter((project) =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.app_url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this project? This will also delete all associated tests, discoveries, and visual baselines.')) {
      await deleteProject.mutateAsync(projectId);
    }
  };

  const handleProjectClick = (projectId: string) => {
    router.push(`/projects/${projectId}`);
  };

  // Empty state
  if (!isLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <FolderKanban className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">
              Create your first project
            </h2>
            <p className="text-muted-foreground mb-6">
              Projects represent the applications you want to test. Add a project to start running tests, discovery, and visual regression.
            </p>
            <CreateProjectInline
              onSuccess={(project) => router.push(`/projects/${project.id}`)}
            />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-6">
            <div className="flex items-center gap-2">
              <FolderKanban className="h-5 w-5 text-primary" />
              <h1 className="font-semibold">Projects</h1>
            </div>

            <div className="flex-1" />

            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search projects..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-9"
              />
            </div>

            {/* View Toggle */}
            <div className="flex items-center border rounded-md">
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-9 px-3 rounded-r-none', viewMode === 'grid' && 'bg-muted')}
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className={cn('h-9 px-3 rounded-l-none', viewMode === 'list' && 'bg-muted')}
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <Button size="sm" onClick={() => setShowCreateModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Project
            </Button>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProjects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                  onDelete={(e) => handleDelete(project.id, e)}
                />
              ))}
              {/* Add New Card */}
              <button
                onClick={() => setShowCreateModal(true)}
                className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors min-h-[200px]"
              >
                <Plus className="h-8 w-8" />
                <span className="font-medium">Add New Project</span>
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProjects.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onClick={() => handleProjectClick(project.id)}
                  onDelete={(e) => handleDelete(project.id, e)}
                />
              ))}
            </div>
          )}

          {filteredProjects.length === 0 && searchQuery && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No projects found matching &quot;{searchQuery}&quot;</p>
            </div>
          )}
        </div>
      </main>

      <CreateProjectModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSuccess={(project) => router.push(`/projects/${project.id}`)}
      />
    </div>
  );
}

function ProjectCard({
  project,
  onClick,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  // TODO: Fetch actual stats from database
  const stats = {
    tests: 0,
    passRate: 0,
    lastRun: null as Date | null,
    lastRunStatus: null as string | null,
  };

  return (
    <div
      onClick={onClick}
      className="group border rounded-lg p-5 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer bg-card"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Globe className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">{project.name}</h3>
            <a
              href={project.app_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
            >
              {new URL(project.app_url).hostname}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
        </Button>
      </div>

      {/* Description */}
      {project.description && (
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {project.description}
        </p>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm border-t pt-3 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="font-medium">{stats.tests}</span>
          <span className="text-muted-foreground">tests</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          {stats.passRate >= 90 ? (
            <CheckCircle2 className="h-4 w-4 text-success" />
          ) : stats.passRate >= 70 ? (
            <Clock className="h-4 w-4 text-warning" />
          ) : (
            <XCircle className="h-4 w-4 text-error" />
          )}
          <span className="font-medium">{stats.passRate}%</span>
        </div>
      </div>

      {/* Last Run */}
      <div className="text-xs text-muted-foreground mt-3">
        {stats.lastRun ? (
          <span>
            Last run: {formatDistanceToNow(stats.lastRun, { addSuffix: true })}
          </span>
        ) : (
          <span>No tests run yet</span>
        )}
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onClick,
  onDelete,
}: {
  project: Project;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 border rounded-lg p-4 hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer bg-card"
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Globe className="h-5 w-5 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-semibold">{project.name}</h3>
        <p className="text-sm text-muted-foreground truncate">{project.app_url}</p>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>Created {formatDistanceToNow(new Date(project.created_at), { addSuffix: true })}</span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
        >
          View
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-error" />
        </Button>
      </div>
    </div>
  );
}
