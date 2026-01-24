import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface DeletionPreviewResponse {
  userId: string;
  dataCategories: Array<{
    category: string;
    description: string;
    recordCount: number;
    retentionPolicy: string;
    examples: string[];
  }>;
  externalServices: Array<{
    service: string;
    connected: boolean;
    dataTypes: string[];
    cleanupAction: string;
  }>;
  estimatedDeletionTime: string;
  gracePeriod: string;
  recoveryOptions: string[];
}

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    // Get user from JWT token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const { userId } = await req.json()
    if (!userId || userId !== user.id) {
      return new Response(JSON.stringify({ error: 'Invalid user ID' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Get admin client for database queries
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Count records in each data category
    const dataCategories = []

    // Profile & Account Data
    const { count: profileCount } = await supabaseAdmin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('id', userId)

    dataCategories.push({
      category: 'Profile & Account',
      description: 'Your basic account information, preferences, and settings',
      recordCount: profileCount || 0,
      retentionPolicy: 'Deleted immediately after grace period',
      examples: ['Email, username, preferences', 'Account settings', 'Profile picture']
    })

    // Productivity Data
    const { count: tasksCount } = await supabaseAdmin
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    dataCategories.push({
      category: 'Tasks & Productivity',
      description: 'Your tasks, goals, and productivity tracking data',
      recordCount: tasksCount || 0,
      retentionPolicy: 'Anonymized for analytics, personal identifiers removed',
      examples: ['Tasks and to-dos', 'Completion rates', 'Productivity metrics']
    })

    // Achievement Data
    const { count: achievementsCount } = await supabaseAdmin
      .from('user_achievements')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    dataCategories.push({
      category: 'Achievements & Progress',
      description: 'Your earned achievements, badges, and progress tracking',
      recordCount: achievementsCount || 0,
      retentionPolicy: 'Anonymized for analytics, personal identifiers removed',
      examples: ['Earned badges', 'Level progression', 'Achievement timestamps']
    })

    // Chat History
    const { count: chatCount } = await supabaseAdmin
      .from('chat_sessions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    dataCategories.push({
      category: 'AI Chat History',
      description: 'Your conversations with the AI assistant',
      recordCount: chatCount || 0,
      retentionPolicy: 'Completely deleted after grace period',
      examples: ['Chat messages', 'AI responses', 'Conversation context']
    })

    // Analytics Data
    const { count: analyticsCount } = await supabaseAdmin
      .from('user_analytics')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    dataCategories.push({
      category: 'Usage Analytics',
      description: 'App usage patterns and behavior analytics',
      recordCount: analyticsCount || 0,
      retentionPolicy: 'Anonymized and retained for product improvement',
      examples: ['App usage time', 'Feature interactions', 'Performance metrics']
    })

    // Check external service connections
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('google_calendar_connected, google_email_connected, stripe_customer_id')
      .eq('id', userId)
      .single()

    const externalServices = [
      {
        service: 'Google Calendar',
        connected: profile?.google_calendar_connected || false,
        dataTypes: ['Calendar events', 'OAuth tokens'],
        cleanupAction: 'OAuth tokens revoked, calendar access removed'
      },
      {
        service: 'Google Email',
        connected: profile?.google_email_connected || false,
        dataTypes: ['Email access tokens', 'OAuth permissions'],
        cleanupAction: 'OAuth tokens revoked, email access removed'
      },
      {
        service: 'Stripe Payments',
        connected: !!profile?.stripe_customer_id,
        dataTypes: ['Payment history', 'Subscription data'],
        cleanupAction: 'Customer data anonymized (retained 7 years for compliance)'
      }
    ]

    const response: DeletionPreviewResponse = {
      userId,
      dataCategories,
      externalServices,
      estimatedDeletionTime: '24-48 hours',
      gracePeriod: '30 days',
      recoveryOptions: [
        'Recovery email with secure token',
        'Account restoration within grace period',
        'Data export before deletion (if requested)'
      ]
    }

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })

  } catch (error) {
    console.error('Deletion preview error:', error)
    return new Response(JSON.stringify({ 
      error: 'Failed to generate deletion preview',
      details: error.message 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}) 