import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface DeleteAccountRequest {
  userId: string;
  reason?: string;
  exportData: boolean;
  immediateDelete: boolean; // Skip grace period for immediate deletion
}

interface DeleteAccountResponse {
  success: boolean;
  deletionId: string;
  gracePeriodEnds?: string;
  exportId?: string;
  recoveryToken?: string;
  errors?: string[];
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
    const requestBody: DeleteAccountRequest = await req.json();
    const { userId, reason, exportData, immediateDelete } = requestBody;

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

    // Generate deletion ID and recovery token
    const deletionId = crypto.randomUUID();
    const recoveryToken = crypto.randomUUID() + '-' + Date.now().toString(36);
    const gracePeriodDays = immediateDelete ? 0 : 30;
    const gracePeriodEnds = new Date(Date.now() + (gracePeriodDays * 24 * 60 * 60 * 1000));

    const response: DeleteAccountResponse = {
      success: false,
      deletionId,
      errors: []
    };

    // 1. Check for active Stripe subscriptions
    const { data: stripeCustomer, error: stripeError } = await supabaseClient
      .from('stripe_customers')
      .select('customer_id')
      .eq('user_id', userId)
      .single();

    if (stripeError && stripeError.code !== 'PGRST116') {
      response.errors?.push(`Failed to check Stripe subscriptions: ${stripeError.message}`);
    }

    // TODO: If active subscriptions found, handle cancellation
    if (stripeCustomer) {
      console.log(`User has Stripe customer: ${stripeCustomer.customer_id}`);
      // Note: Stripe subscription cancellation will be handled by external-cleanup function
    }

    // 2. Create account_deletions record
    const { data: deletionRecord, error: deletionError } = await supabaseClient
      .from('account_deletions')
      .insert({
        id: deletionId,
        user_id: userId,
        deletion_reason: reason || 'User requested deletion',
        deletion_requested_at: new Date().toISOString(),
        grace_period_ends: gracePeriodEnds.toISOString(),
        recovery_token: recoveryToken,
        data_exported: false,
        deletion_completed: false
      })
      .select()
      .single();

    if (deletionError) {
      response.errors?.push(`Failed to create deletion record: ${deletionError.message}`);
      return new Response(
        JSON.stringify(response),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    response.gracePeriodEnds = gracePeriodEnds.toISOString();
    response.recoveryToken = recoveryToken;

    // 3. Optionally trigger data export
    if (exportData) {
      try {
        const exportResponse = await fetch(`${req.url.replace('/delete-account', '/export-user-data')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            userId,
            format: 'json',
            requestType: 'pre_deletion'
          })
        });

        if (exportResponse.ok) {
          const exportData = await exportResponse.json();
          response.exportId = exportData.exportId;
          
          // Update deletion record with export ID
          await supabaseClient
            .from('account_deletions')
            .update({ data_exported: true })
            .eq('id', deletionId);
        } else {
          response.errors?.push('Failed to trigger data export');
        }
      } catch (error) {
        response.errors?.push(`Data export error: ${error.message}`);
      }
    }

    // 4. Begin soft deletion of Category 2 data (messages, shared_files)
    if (!immediateDelete) {
      // Soft delete messages - replace content with placeholder
      const { error: messagesError } = await supabaseClient
        .from('messages')
        .update({ 
          content: '[DELETED USER MESSAGE - RECOVERABLE FOR 30 DAYS]',
          role: 'user' // Keep role for conversation structure
        })
        .eq('user_id', userId);

      if (messagesError) {
        response.errors?.push(`Failed to soft delete messages: ${messagesError.message}`);
      }

      // Transfer shared file ownership to system account
      const systemAccountId = '00000000-0000-0000-0000-000000000000';
      const { error: filesError } = await supabaseClient
        .from('shared_files')
        .update({ 
          owner: systemAccountId,
          metadata: { original_owner: userId, deleted_at: new Date().toISOString() }
        })
        .eq('owner', userId);

      if (filesError) {
        response.errors?.push(`Failed to transfer shared files: ${filesError.message}`);
      }
    }

    // 5. Schedule external service cleanup (call orchestrator)
    try {
      // Get user email for external cleanup
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
      const userEmail = userData.user?.email;

      if (userEmail) {
        const cleanupResponse = await fetch(`${req.url.replace('/delete-account', '/external-cleanup/orchestrator')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            userId,
            userEmail,
            services: ['google', 'stripe', 'email']
          })
        });

        if (!cleanupResponse.ok) {
          response.errors?.push('External service cleanup failed');
        }
      }
    } catch (error) {
      response.errors?.push(`External cleanup error: ${error.message}`);
    }

    // 6. Log operation in data_operations_audit
    const auditEntry = {
      user_id: userId,
      operation_type: 'account_deletion_requested',
      affected_tables: ['account_deletions', 'messages', 'shared_files'],
      record_count: 1,
      operation_metadata: {
        deletion_id: deletionId,
        grace_period_ends: gracePeriodEnds.toISOString(),
        immediate_delete: immediateDelete,
        export_requested: exportData,
        reason: reason || 'User requested deletion',
        recovery_token_generated: true
      },
      legal_basis: 'user_request',
      performed_by: userId,
      ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
      user_agent: req.headers.get('user-agent')
    };

    const { error: auditError } = await supabaseClient
      .from('data_operations_audit')
      .insert(auditEntry);

    if (auditError) {
      response.errors?.push(`Audit logging failed: ${auditError.message}`);
    }

    // 7. Log high-impact operation
    const { data: auditRecord } = await supabaseClient
      .from('data_operations_audit')
      .select('id')
      .eq('user_id', userId)
      .eq('operation_type', 'account_deletion_requested')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (auditRecord) {
      await supabaseClient
        .from('high_impact_operations_log')
        .insert({
          audit_id: auditRecord.id,
          operation_type: 'account_deletion',
          user_id: userId,
          impact_level: 'critical',
          requires_review: false // Automated process
        });
    }

    // 8. If immediate deletion, trigger permanent deletion
    if (immediateDelete) {
      try {
        const cleanupResponse = await fetch(`${req.url.replace('/delete-account', '/cleanup-deleted-accounts')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            dryRun: false,
            targetUserId: userId // Process specific user immediately
          })
        });

        if (!cleanupResponse.ok) {
          response.errors?.push('Immediate deletion failed');
        }
      } catch (error) {
        response.errors?.push(`Immediate deletion error: ${error.message}`);
      }
    }

    // 9. Success response
    response.success = response.errors?.length === 0;

    console.log(`Account deletion initiated for user ${userId}:`, {
      deletionId,
      gracePeriodEnds: response.gracePeriodEnds,
      exportRequested: exportData,
      immediateDelete,
      errorsCount: response.errors?.length || 0
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Delete account function error:', error);
    
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