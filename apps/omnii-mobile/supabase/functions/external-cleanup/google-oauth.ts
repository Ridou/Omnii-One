import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface GoogleCleanupRequest {
  userId: string;
  userEmail?: string;
}

interface GoogleCleanupResponse {
  success: boolean;
  tokensRevoked: number;
  calendarDisconnected: boolean;
  emailDisconnected: boolean;
  errors: string[];
  cleanupSummary: {
    totalTokens: number;
    successfulRevocations: number;
    failedRevocations: number;
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
    const requestBody: GoogleCleanupRequest = await req.json();
    const { userId, userEmail } = requestBody;

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

    const response: GoogleCleanupResponse = {
      success: false,
      tokensRevoked: 0,
      calendarDisconnected: false,
      emailDisconnected: false,
      errors: [],
      cleanupSummary: {
        totalTokens: 0,
        successfulRevocations: 0,
        failedRevocations: 0
      }
    };

    console.log(`Starting Google OAuth cleanup for user: ${userId}`);

    // 1. Retrieve all Google OAuth tokens for the user
    const { data: oauthTokens, error: tokensError } = await supabaseClient
      .from('oauth_tokens')
      .select('*')
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (tokensError) {
      response.errors.push(`Failed to retrieve OAuth tokens: ${tokensError.message}`);
      return new Response(
        JSON.stringify(response),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    response.cleanupSummary.totalTokens = oauthTokens?.length || 0;

    if (!oauthTokens || oauthTokens.length === 0) {
      response.success = true;
      response.calendarDisconnected = true;
      response.emailDisconnected = true;
      console.log(`No Google OAuth tokens found for user ${userId}`);
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${oauthTokens.length} Google OAuth tokens to revoke`);

    // 2. Revoke each token with Google's OAuth2 API
    for (const token of oauthTokens) {
      try {
        // Use Google's token revocation endpoint
        const revokeUrl = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.access_token)}`;
        
        const revokeResponse = await fetch(revokeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          }
        });

        if (revokeResponse.ok || revokeResponse.status === 400) {
          // 400 can mean token was already invalid/revoked, which is fine
          response.cleanupSummary.successfulRevocations += 1;
          response.tokensRevoked += 1;
          console.log(`Successfully revoked Google token for scope: ${token.scope}`);
          
          // Check if this was a calendar token
          if (token.scope?.includes('calendar')) {
            response.calendarDisconnected = true;
          }
          
          // Check if this was an email token
          if (token.scope?.includes('gmail') || token.scope?.includes('email')) {
            response.emailDisconnected = true;
          }
        } else {
          response.cleanupSummary.failedRevocations += 1;
          response.errors.push(`Failed to revoke token for scope ${token.scope}: HTTP ${revokeResponse.status}`);
          console.error(`Failed to revoke Google token: ${revokeResponse.status} ${revokeResponse.statusText}`);
        }
      } catch (error) {
        response.cleanupSummary.failedRevocations += 1;
        response.errors.push(`Error revoking token ${token.id}: ${error.message}`);
        console.error(`Error revoking Google token:`, error);
      }

      // Also try to revoke refresh token if it exists
      if (token.refresh_token) {
        try {
          const refreshRevokeUrl = `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token.refresh_token)}`;
          
          const refreshRevokeResponse = await fetch(refreshRevokeUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            }
          });

          if (!refreshRevokeResponse.ok && refreshRevokeResponse.status !== 400) {
            console.error(`Failed to revoke refresh token: ${refreshRevokeResponse.status}`);
          }
        } catch (error) {
          console.error(`Error revoking refresh token:`, error);
        }
      }
    }

    // 3. Delete OAuth tokens from our database
    const { error: deleteError } = await supabaseClient
      .from('oauth_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('provider', 'google');

    if (deleteError) {
      response.errors.push(`Failed to delete OAuth tokens from database: ${deleteError.message}`);
    }

    // 4. Log cleanup operation for audit trail
    await supabaseClient
      .from('data_operations_audit')
      .insert({
        user_id: userId,
        operation_type: 'google_oauth_cleanup',
        affected_tables: ['oauth_tokens'],
        record_count: oauthTokens.length,
        operation_metadata: {
          tokens_found: response.cleanupSummary.totalTokens,
          tokens_revoked: response.cleanupSummary.successfulRevocations,
          revocation_failures: response.cleanupSummary.failedRevocations,
          calendar_disconnected: response.calendarDisconnected,
          email_disconnected: response.emailDisconnected,
          user_email: userEmail || 'not_provided'
        },
        legal_basis: 'gdpr_compliance',
        performed_by: userId,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent') || 'system/google-oauth-cleanup'
      });

    // 5. Log high-impact operation
    const { data: auditRecord } = await supabaseClient
      .from('data_operations_audit')
      .select('id')
      .eq('user_id', userId)
      .eq('operation_type', 'google_oauth_cleanup')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (auditRecord) {
      await supabaseClient
        .from('high_impact_operations_log')
        .insert({
          audit_id: auditRecord.id,
          operation_type: 'oauth_revocation',
          user_id: userId,
          impact_level: 'medium',
          requires_review: false // Automated process
        });
    }

    // 6. Determine overall success
    response.success = response.errors.length === 0 || 
                      (response.cleanupSummary.successfulRevocations > 0 && 
                       response.cleanupSummary.failedRevocations === 0);

    console.log(`Google OAuth cleanup completed for user ${userId}:`, {
      totalTokens: response.cleanupSummary.totalTokens,
      successful: response.cleanupSummary.successfulRevocations,
      failed: response.cleanupSummary.failedRevocations,
      calendar: response.calendarDisconnected,
      email: response.emailDisconnected
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Google OAuth cleanup function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
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