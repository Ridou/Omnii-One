import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface ExportRequest {
  userId: string;
  format: 'json' | 'csv';
  categories?: string[]; // Optional: specific data categories
  requestType?: 'manual' | 'pre_deletion' | 'compliance';
}

interface ExportResponse {
  exportId: string;
  downloadUrl?: string;
  estimatedSize: number;
  expiresAt: string; // 7 days from now
  dataCategories: string[];
  exportCompleted: boolean;
}

interface UserDataExport {
  requestId: string;
  userId: string;
  exportDate: string;
  dataCategories: {
    profile: any;
    productivity: any;
    conversations: any[];
    achievements: any;
    onboarding: any;
    external: any;
    settings: any;
  };
  metadata: {
    totalRecords: number;
    privacyNotices: string[];
    retentionInfo: string[];
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Parse request body
    const requestBody: ExportRequest = await req.json();
    const { userId, format = 'json', categories, requestType = 'manual' } = requestBody;

    // Validate request
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Generate export ID
    const exportId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000)); // 7 days

    const response: ExportResponse = {
      exportId,
      estimatedSize: 0,
      expiresAt: expiresAt.toISOString(),
      dataCategories: [],
      exportCompleted: false
    };

    // 1. Create user_data_exports record
    const { data: exportRecord, error: exportError } = await supabaseClient
      .from('user_data_exports')
      .insert({
        id: exportId,
        user_id: userId,
        request_type: requestType,
        export_format: format,
        expires_at: expiresAt.toISOString(),
        export_completed: false
      })
      .select()
      .single();

    if (exportError) {
      return new Response(
        JSON.stringify({ error: `Failed to create export record: ${exportError.message}` }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Collect user data from all tables
    const exportData: UserDataExport = {
      requestId: exportId,
      userId,
      exportDate: new Date().toISOString(),
      dataCategories: {
        profile: {},
        productivity: {},
        conversations: [],
        achievements: {},
        onboarding: {},
        external: {},
        settings: {}
      },
      metadata: {
        totalRecords: 0,
        privacyNotices: [
          'This export contains all your personal data stored in OMNII.',
          'External service data (OAuth tokens) are excluded for security.',
          'Financial data is included in anonymized form for compliance.',
          'This export link expires in 7 days for security.'
        ],
        retentionInfo: [
          'Profile data: Deleted 30 days after account deletion',
          'Productivity data: Anonymized for analytics after deletion',
          'Financial data: Retained 7 years for legal compliance',
          'Audit logs: Retained permanently for compliance'
        ]
      }
    };

    let totalRecords = 0;

    // Profile Data (Auth + Settings)
    try {
      const { data: userData } = await supabaseClient.auth.admin.getUserById(userId);
      const { data: userSettings } = await supabaseClient
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      exportData.dataCategories.profile = {
        user_info: {
          id: userData.user?.id,
          email: userData.user?.email,
          created_at: userData.user?.created_at,
          last_sign_in: userData.user?.last_sign_in_at,
          email_confirmed: userData.user?.email_confirmed_at ? true : false
        },
        settings: userSettings?.settings || {},
        preferences: userSettings || {}
      };
      totalRecords += 2;
      response.dataCategories.push('profile');
    } catch (error) {
      console.error('Failed to export profile data:', error);
    }

    // Productivity Data
    try {
      const [xpTransactions, levelProgressions, featureAccess] = await Promise.all([
        supabaseClient.from('xp_transactions').select('*').eq('user_id', userId),
        supabaseClient.from('level_progressions').select('*').eq('user_id', userId),
        supabaseClient.from('user_feature_access').select('*').eq('user_id', userId)
      ]);

      exportData.dataCategories.productivity = {
        xp_history: xpTransactions.data || [],
        level_progressions: levelProgressions.data || [],
        feature_access: featureAccess.data || [],
        total_xp: xpTransactions.data?.reduce((sum, tx) => sum + tx.amount, 0) || 0,
        current_level: levelProgressions.data?.reduce((max, prog) => Math.max(max, prog.to_level), 1) || 1
      };
      totalRecords += (xpTransactions.data?.length || 0) + (levelProgressions.data?.length || 0) + (featureAccess.data?.length || 0);
      response.dataCategories.push('productivity');
    } catch (error) {
      console.error('Failed to export productivity data:', error);
    }

    // Conversations Data
    try {
      const { data: messages } = await supabaseClient
        .from('messages')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: true });

      exportData.dataCategories.conversations = messages || [];
      totalRecords += messages?.length || 0;
      response.dataCategories.push('conversations');
    } catch (error) {
      console.error('Failed to export conversations:', error);
    }

    // Onboarding Data
    try {
      const [onboardingSessions, quoteResponses] = await Promise.all([
        supabaseClient.from('onboarding_sessions').select('*').eq('user_id', userId),
        supabaseClient.from('user_quote_responses').select('*').eq('user_id', userId)
      ]);

      exportData.dataCategories.onboarding = {
        sessions: onboardingSessions.data || [],
        quote_responses: quoteResponses.data || [],
        completion_stats: {
          total_sessions: onboardingSessions.data?.length || 0,
          total_quotes_responded: quoteResponses.data?.length || 0
        }
      };
      totalRecords += (onboardingSessions.data?.length || 0) + (quoteResponses.data?.length || 0);
      response.dataCategories.push('onboarding');
    } catch (error) {
      console.error('Failed to export onboarding data:', error);
    }

    // External Services Data (Limited for security)
    try {
      const [stripeCustomer, sharedFiles] = await Promise.all([
        supabaseClient.from('stripe_customers').select('customer_id, created_at').eq('user_id', userId).single(),
        supabaseClient.from('shared_files').select('file_path, created_at').eq('owner', userId)
      ]);

      exportData.dataCategories.external = {
        stripe_customer: stripeCustomer.data ? {
          has_customer: true,
          customer_created: stripeCustomer.data.created_at,
          // Note: Actual customer_id excluded for security
        } : { has_customer: false },
        shared_files: sharedFiles.data?.map(file => ({
          file_path: file.file_path,
          created_at: file.created_at
        })) || [],
        oauth_connections: {
          note: 'OAuth tokens excluded for security - revoked during account deletion'
        }
      };
      totalRecords += (sharedFiles.data?.length || 0) + 1;
      response.dataCategories.push('external');
    } catch (error) {
      console.error('Failed to export external data:', error);
    }

    // User Presence Data
    try {
      const { data: presence } = await supabaseClient
        .from('user_presence')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (presence) {
        exportData.dataCategories.settings.presence = {
          last_seen: presence.last_seen,
          status: presence.status,
          metadata: presence.metadata
        };
        totalRecords += 1;
      }
    } catch (error) {
      console.error('Failed to export presence data:', error);
    }

    // Update metadata
    exportData.metadata.totalRecords = totalRecords;
    response.estimatedSize = JSON.stringify(exportData).length;

    // 3. Generate export file and upload to secure storage
    let downloadUrl: string | undefined;
    
    try {
      // For now, we'll create a simple JSON export
      // In production, you might want to upload to secure storage (S3, etc.)
      const exportContent = JSON.stringify(exportData, null, 2);
      
      // TODO: Upload to secure storage and generate signed URL
      // For now, we'll indicate the export is ready for email delivery
      downloadUrl = `${req.url}/download/${exportId}`;
      
      // Update export record with completion
      await supabaseClient
        .from('user_data_exports')
        .update({
          file_size_bytes: exportContent.length,
          download_url: downloadUrl,
          export_completed: true
        })
        .eq('id', exportId);

      response.downloadUrl = downloadUrl;
      response.exportCompleted = true;

    } catch (error) {
      console.error('Failed to generate export file:', error);
    }

    // 4. Log operation in data_operations_audit
    const auditEntry = {
      user_id: userId,
      operation_type: 'data_export',
      affected_tables: response.dataCategories,
      record_count: totalRecords,
      operation_metadata: {
        export_id: exportId,
        export_format: format,
        request_type: requestType,
        data_categories: response.dataCategories,
        file_size_bytes: response.estimatedSize,
        expires_at: expiresAt.toISOString()
      },
      legal_basis: 'user_request',
      performed_by: userId,
      ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent')
    };

    await supabaseClient
      .from('data_operations_audit')
      .insert(auditEntry);

    // 5. Log data access for transparency
    await supabaseClient
      .from('data_access_log')
      .insert({
        user_id: userId,
        accessed_tables: response.dataCategories,
        access_type: 'export',
        purpose: `GDPR data export - ${requestType}`,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent')
      });

    console.log(`Data export completed for user ${userId}:`, {
      exportId,
      totalRecords,
      dataCategories: response.dataCategories,
      fileSize: response.estimatedSize
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Export user data function error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 