import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/plugin/events
 * Record a new plugin event from Claude Code
 *
 * This endpoint is called by the Skopaq Claude Code plugin's hooks
 * to record events for monitoring in the dashboard.
 *
 * Note: Uses type assertions because plugin_events table may not exist
 * in the current database schema until migration is applied.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    // Allow unauthenticated requests with API key (for plugin use)
    const apiKey = request.headers.get('x-api-key');
    let effectiveUserId = userId;

    if (!userId && apiKey) {
      // Validate API key and get associated user
      const supabase = await createServerSupabaseClient();
      const { data: keyData } = await supabase
        .from('api_keys')
        .select('user_id')
        .eq('key', apiKey)
        .eq('is_active', true)
        .single();

      if (keyData) {
        effectiveUserId = (keyData as { user_id: string }).user_id;
      }
    }

    if (!effectiveUserId) {
      return NextResponse.json(
        { error: 'Authentication required. Provide a valid session or API key.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      session_id,
      event_type,
      event_name,
      status = 'completed',
      input_data = {},
      output_data = {},
      error_message,
      duration_ms,
      git_branch,
      git_commit,
      git_repo,
      workspace_path,
      file_paths,
      plugin_version,
      claude_code_version,
      os_platform,
      project_id,
    } = body;

    // Validate required fields
    if (!session_id || !event_type || !event_name) {
      return NextResponse.json(
        { error: 'Missing required fields: session_id, event_type, event_name' },
        { status: 400 }
      );
    }

    // Validate event_type
    const validEventTypes = ['command', 'skill', 'agent', 'hook', 'mcp_tool', 'error', 'session_start', 'session_end'];
    if (!validEventTypes.includes(event_type)) {
      return NextResponse.json(
        { error: `Invalid event_type. Must be one of: ${validEventTypes.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = await createServerSupabaseClient();

    // Insert the event (using any to bypass type checking for new table)
    const { data: event, error: insertError } = await (supabase as any)
      .from('plugin_events')
      .insert({
        user_id: effectiveUserId,
        project_id,
        session_id,
        event_type,
        event_name,
        status,
        input_data,
        output_data,
        error_message,
        duration_ms,
        git_branch,
        git_commit,
        git_repo,
        workspace_path,
        file_paths,
        plugin_version,
        claude_code_version,
        os_platform,
        completed_at: status !== 'started' ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to insert plugin event:', insertError);
      return NextResponse.json(
        { error: 'Failed to record event' },
        { status: 500 }
      );
    }

    // Update or create session record
    if (event_type === 'session_start') {
      await (supabase as any)
        .from('plugin_sessions')
        .upsert({
          user_id: effectiveUserId,
          project_id,
          session_id,
          started_at: new Date().toISOString(),
          git_repo,
          git_branch,
          workspace_path,
          plugin_version,
          claude_code_version,
          os_platform,
        }, {
          onConflict: 'session_id',
        });
    } else if (event_type === 'session_end') {
      // Update session with end time
      const { data: session } = await (supabase as any)
        .from('plugin_sessions')
        .select('started_at')
        .eq('session_id', session_id)
        .single();

      if (session) {
        const endTime = new Date();
        const startTime = new Date(session.started_at);
        const durationMs = endTime.getTime() - startTime.getTime();

        await (supabase as any)
          .from('plugin_sessions')
          .update({
            ended_at: endTime.toISOString(),
            duration_ms: durationMs,
          })
          .eq('session_id', session_id);
      }
    } else {
      // Increment event counters on the session
      const eventTypeToField: Record<string, string> = {
        command: 'commands_executed',
        skill: 'skills_activated',
        agent: 'agents_invoked',
        hook: 'hooks_triggered',
        mcp_tool: 'mcp_calls',
        error: 'errors_count',
      };
      const updateField = eventTypeToField[event_type];

      if (updateField) {
        // Use RPC to increment counter atomically
        await (supabase as any).rpc('increment_plugin_session_counter', {
          p_session_id: session_id,
          p_field: updateField,
        });
      }
    }

    return NextResponse.json({
      success: true,
      event_id: event?.id,
    });
  } catch (error) {
    console.error('Error in POST /api/plugin/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/plugin/events
 * Get plugin events for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('session_id');
    const eventType = searchParams.get('event_type');
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const supabase = await createServerSupabaseClient();

    let query = (supabase as any)
      .from('plugin_events')
      .select('*')
      .eq('user_id', userId)
      .order('started_at', { ascending: false })
      .limit(limit);

    if (sessionId) {
      query = query.eq('session_id', sessionId);
    }

    if (eventType) {
      query = query.eq('event_type', eventType);
    }

    const { data: events, error } = await query;

    if (error) {
      console.error('Failed to fetch plugin events:', error);
      return NextResponse.json(
        { error: 'Failed to fetch events' },
        { status: 500 }
      );
    }

    return NextResponse.json({ events });
  } catch (error) {
    console.error('Error in GET /api/plugin/events:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
