import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface RecoveryRequest {
  recoveryToken: string;
  userEmail: string;
  newPassword?: string; // Optional: set new password during recovery
}

interface RecoveryResponse {
  success: boolean;
  message: string;
  userRestored: boolean;
  dataRestored: {
    messages: number;
    sharedFiles: number;
    settings: number;
  };
  errors: string[];
  userId?: string;
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
    const requestBody: RecoveryRequest = await req.json();
    const { recoveryToken, userEmail, newPassword } = requestBody;

    // Validate request
    if (!recoveryToken || !userEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Recovery token and email are required' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const response: RecoveryResponse = {
      success: false,
      message: '',
      userRestored: false,
      dataRestored: {
        messages: 0,
        sharedFiles: 0,
        settings: 0
      },
      errors: []
    };

    // 1. Find and validate recovery token
    const { data: deletionRecord, error: deletionError } = await supabaseClient
      .from('account_deletions')
      .select('*')
      .eq('recovery_token', recoveryToken)
      .eq('deletion_completed', false)
      .single();

    if (deletionError || !deletionRecord) {
      response.errors.push('Invalid recovery token or account not found');
      response.message = 'Recovery token is invalid or has expired. Please contact support.';
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 2. Check if recovery period is still valid
    const gracePeriodEnds = new Date(deletionRecord.grace_period_ends);
    const now = new Date();

    if (now > gracePeriodEnds) {
      response.errors.push('Recovery period has expired');
      response.message = 'The 30-day recovery period has expired. Your data has been permanently deleted.';
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 410, // 410 Gone
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Check recovery attempts limit (prevent brute force)
    if (deletionRecord.recovery_attempts >= 5) {
      response.errors.push('Too many recovery attempts');
      response.message = 'Maximum recovery attempts exceeded. Please contact support.';
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 429, // Too Many Requests
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const userId = deletionRecord.user_id;

    // 4. Verify user email matches (additional security)
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(userId);
    
    if (userError || !userData.user || userData.user.email !== userEmail) {
      // Increment recovery attempts
      await supabaseClient
        .from('account_deletions')
        .update({ 
          recovery_attempts: deletionRecord.recovery_attempts + 1 
        })
        .eq('id', deletionRecord.id);

      response.errors.push('Email mismatch or user not found');
      response.message = 'The provided email does not match our records.';
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 5. Begin account recovery process
    try {
      // 5a. Restore soft-deleted messages
      const { data: messagesUpdated, error: messagesError } = await supabaseClient
        .from('messages')
        .update({ 
          content: null // Remove the deletion placeholder - restore to null for system to handle
        })
        .eq('user_id', userId)
        .eq('content', '[DELETED USER MESSAGE - RECOVERABLE FOR 30 DAYS]')
        .select();

      if (messagesError) {
        response.errors.push(`Failed to restore messages: ${messagesError.message}`);
      } else {
        response.dataRestored.messages = messagesUpdated?.length || 0;
      }

      // 5b. Restore shared files ownership
      const systemAccountId = '00000000-0000-0000-0000-000000000000';
      
      const { data: filesToRestore } = await supabaseClient
        .from('shared_files')
        .select('id, metadata')
        .eq('owner', systemAccountId)
        .like('metadata->original_owner', `%${userId}%`);

      if (filesToRestore && filesToRestore.length > 0) {
        const { data: filesRestored, error: filesError } = await supabaseClient
          .from('shared_files')
          .update({ 
            owner: userId,
            metadata: {} // Clear recovery metadata
          })
          .in('id', filesToRestore.map(f => f.id))
          .select();

        if (filesError) {
          response.errors.push(`Failed to restore shared files: ${filesError.message}`);
        } else {
          response.dataRestored.sharedFiles = filesRestored?.length || 0;
        }
      }

      // 5c. Reactivate user account
      if (newPassword) {
        // Set new password if provided
        const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(userId, {
          password: newPassword,
          email_confirm: true // Ensure email is confirmed on recovery
        });

        if (passwordError) {
          response.errors.push(`Failed to update password: ${passwordError.message}`);
        }
      } else {
        // Just reactivate the account
        const { error: reactivateError } = await supabaseClient.auth.admin.updateUserById(userId, {
          email_confirm: true,
          banned_until: null // Remove any bans
        });

        if (reactivateError) {
          response.errors.push(`Failed to reactivate account: ${reactivateError.message}`);
        }
      }

      // 5d. Delete the account deletion record (recovery successful)
      const { error: deletionDeleteError } = await supabaseClient
        .from('account_deletions')
        .delete()
        .eq('id', deletionRecord.id);

      if (deletionDeleteError) {
        response.errors.push(`Failed to remove deletion record: ${deletionDeleteError.message}`);
      }

      // 5e. Log successful recovery
      await supabaseClient
        .from('data_operations_audit')
        .insert({
          user_id: userId,
          operation_type: 'account_recovery_completed',
          affected_tables: ['messages', 'shared_files', 'account_deletions', 'auth.users'],
          record_count: response.dataRestored.messages + response.dataRestored.sharedFiles,
          operation_metadata: {
            recovery_token_used: recoveryToken,
            recovery_attempt: deletionRecord.recovery_attempts + 1,
            days_before_permanent_deletion: Math.ceil((gracePeriodEnds.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
            data_restored: response.dataRestored,
            password_reset: !!newPassword
          },
          legal_basis: 'user_request',
          performed_by: userId,
          ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
          user_agent: req.headers.get('user-agent')
        });

      // 5f. Log high-impact operation
      const { data: auditRecord } = await supabaseClient
        .from('data_operations_audit')
        .select('id')
        .eq('user_id', userId)
        .eq('operation_type', 'account_recovery_completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (auditRecord) {
        await supabaseClient
          .from('high_impact_operations_log')
          .insert({
            audit_id: auditRecord.id,
            operation_type: 'account_recovery',
            user_id: userId,
            impact_level: 'high',
            requires_review: false // Automated process
          });
      }

      response.success = response.errors.length === 0;
      response.userRestored = true;
      response.userId = userId;
      response.message = response.success 
        ? 'Account successfully restored! You can now log in normally.'
        : 'Account partially restored with some errors. Please contact support.';

      console.log(`Account recovery completed for user ${userId}:`, {
        dataRestored: response.dataRestored,
        errorsCount: response.errors.length
      });

      return new Response(
        JSON.stringify(response),
        { 
          status: response.success ? 200 : 207, // 207 Multi-Status for partial success
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (recoveryError) {
      // Increment recovery attempts even on internal error
      await supabaseClient
        .from('account_deletions')
        .update({ 
          recovery_attempts: deletionRecord.recovery_attempts + 1 
        })
        .eq('id', deletionRecord.id);

      response.errors.push(`Recovery process failed: ${recoveryError.message}`);
      response.message = 'An error occurred during account recovery. Please try again or contact support.';
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Recovery system function error:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error',
        message: 'An unexpected error occurred. Please contact support.' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}); 