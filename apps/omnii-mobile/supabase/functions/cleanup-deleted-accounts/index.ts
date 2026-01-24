import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface CleanupRequest {
  dryRun?: boolean; // Preview what would be deleted
  targetUserId?: string; // Process specific user (for immediate deletion)
  batchSize?: number; // Number of accounts to process
}

interface CleanupResponse {
  success: boolean;
  processedUsers: number;
  deletedRecords: number;
  anonymizedRecords: number;
  errors: string[];
  dryRunPreview?: {
    usersToDelete: string[];
    recordsToDelete: number;
    recordsToAnonymize: number;
  };
}

interface AnonymizationMapping {
  userId: string;
  anonymousId: string;
  mascotStage: string;
  totalXP: number;
  currentLevel: number;
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
    const requestBody: CleanupRequest = await req.json();
    const { dryRun = false, targetUserId, batchSize = 10 } = requestBody;

    const response: CleanupResponse = {
      success: false,
      processedUsers: 0,
      deletedRecords: 0,
      anonymizedRecords: 0,
      errors: []
    };

    // 1. Find accounts eligible for permanent deletion
    let eligibleAccountsQuery = supabaseClient
      .from('account_deletions')
      .select('user_id, deletion_reason, recovery_token')
      .eq('deletion_completed', false)
      .lt('grace_period_ends', new Date().toISOString())
      .order('deletion_requested_at', { ascending: true });

    // Filter to specific user if provided (for immediate deletion)
    if (targetUserId) {
      eligibleAccountsQuery = eligibleAccountsQuery.eq('user_id', targetUserId);
    } else {
      eligibleAccountsQuery = eligibleAccountsQuery.limit(batchSize);
    }

    const { data: eligibleAccounts, error: accountsError } = await eligibleAccountsQuery;

    if (accountsError) {
      response.errors.push(`Failed to find eligible accounts: ${accountsError.message}`);
      return new Response(
        JSON.stringify(response),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!eligibleAccounts || eligibleAccounts.length === 0) {
      response.success = true;
      response.processedUsers = 0;
      console.log('No accounts eligible for deletion');
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Found ${eligibleAccounts.length} accounts eligible for deletion`);

    // 2. Dry run preview
    if (dryRun) {
      let totalRecordsToDelete = 0;
      let totalRecordsToAnonymize = 0;

      for (const account of eligibleAccounts) {
        // Count records that would be deleted
        const [messages, settings, presence, exports] = await Promise.all([
          supabaseClient.from('messages').select('id').eq('user_id', account.user_id),
          supabaseClient.from('user_settings').select('id').eq('user_id', account.user_id),
          supabaseClient.from('user_presence').select('id').eq('user_id', account.user_id),
          supabaseClient.from('user_data_exports').select('id').eq('user_id', account.user_id)
        ]);

        totalRecordsToDelete += (messages.data?.length || 0) + 
                               (settings.data?.length || 0) + 
                               (presence.data?.length || 0) + 
                               (exports.data?.length || 0);

        // Count records that would be anonymized
        const [xpTx, levelProg] = await Promise.all([
          supabaseClient.from('xp_transactions').select('id').eq('user_id', account.user_id),
          supabaseClient.from('level_progressions').select('id').eq('user_id', account.user_id)
        ]);

        totalRecordsToAnonymize += (xpTx.data?.length || 0) + (levelProg.data?.length || 0);
      }

      response.dryRunPreview = {
        usersToDelete: eligibleAccounts.map(acc => acc.user_id),
        recordsToDelete: totalRecordsToDelete,
        recordsToAnonymize: totalRecordsToAnonymize
      };

      response.success = true;
      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // 3. Process each account for permanent deletion
    for (const account of eligibleAccounts) {
      const userId = account.user_id;
      console.log(`Processing permanent deletion for user: ${userId}`);

      try {
        // 3a. Anonymize analytics data before deletion
        const anonymousId = `anon_${crypto.randomUUID().substring(0, 8)}`;
        
        // Get user data for anonymization
        const [xpData, levelData] = await Promise.all([
          supabaseClient.from('xp_transactions').select('*').eq('user_id', userId),
          supabaseClient.from('level_progressions').select('*').eq('user_id', userId)
        ]);

        // Create anonymization mapping
        const anonymizationData: AnonymizationMapping = {
          userId,
          anonymousId,
          mascotStage: 'unknown', // Will be calculated
          totalXP: xpData.data?.reduce((sum, tx) => sum + tx.amount, 0) || 0,
          currentLevel: levelData.data?.reduce((max, prog) => Math.max(max, prog.to_level), 1) || 1
        };

        // Determine mascot stage from level
        if (anonymizationData.currentLevel >= 26) {
          anonymizationData.mascotStage = 'tree';
        } else if (anonymizationData.currentLevel >= 11) {
          anonymizationData.mascotStage = 'flower';
        } else {
          anonymizationData.mascotStage = 'seed';
        }

        // 3b. Move XP data to anonymized table
        if (xpData.data && xpData.data.length > 0) {
          const anonymizedXPData = xpData.data.map(tx => ({
            anonymous_id: anonymousId,
            amount: tx.amount,
            reason: tx.reason,
            source: tx.source,
            created_at: tx.created_at,
            metadata: tx.metadata
          }));

          await supabaseClient
            .from('xp_transactions_anonymized')
            .insert(anonymizedXPData);

          response.anonymizedRecords += anonymizedXPData.length;
        }

        // 3c. Move level progressions to anonymized table
        if (levelData.data && levelData.data.length > 0) {
          const anonymizedLevelData = levelData.data.map(prog => ({
            anonymous_id: anonymousId,
            from_level: prog.from_level,
            to_level: prog.to_level,
            xp_required: prog.xp_required,
            achieved_at: prog.achieved_at,
            metadata: prog.metadata
          }));

          await supabaseClient
            .from('level_progressions_anonymized')
            .insert(anonymizedLevelData);

          response.anonymizedRecords += anonymizedLevelData.length;
        }

        // 3d. Delete personal data (Category 1 - Immediate deletion)
        const deletionPromises = [
          // User settings and preferences
          supabaseClient.from('user_settings').delete().eq('user_id', userId),
          
          // Messages and conversations
          supabaseClient.from('messages').delete().eq('user_id', userId),
          
          // User presence data
          supabaseClient.from('user_presence').delete().eq('user_id', userId),
          
          // Data exports
          supabaseClient.from('user_data_exports').delete().eq('user_id', userId),
          
          // Onboarding data
          supabaseClient.from('onboarding_sessions').delete().eq('user_id', userId),
          supabaseClient.from('user_quote_responses').delete().eq('user_id', userId),
          
          // Feature access records
          supabaseClient.from('user_feature_access').delete().eq('user_id', userId),
          
          // Original XP and level data (now anonymized)
          supabaseClient.from('xp_transactions').delete().eq('user_id', userId),
          supabaseClient.from('level_progressions').delete().eq('user_id', userId)
        ];

        const deletionResults = await Promise.allSettled(deletionPromises);
        
        // Count successful deletions
        deletionResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            response.deletedRecords += 1;
          } else {
            response.errors.push(`Failed to delete data ${index}: ${result.reason}`);
          }
        });

        // 3e. Anonymize Stripe customer data (don't delete for compliance)
        await supabaseClient
          .from('stripe_customers')
          .update({ 
            user_id: null, // Remove user association
            metadata: { 
              anonymized_at: new Date().toISOString(),
              anonymous_id: anonymousId,
              original_deletion_reason: account.deletion_reason
            }
          })
          .eq('user_id', userId);

        // 3f. Handle OAuth tokens - revoke and delete
        const { data: oauthTokens } = await supabaseClient
          .from('oauth_tokens')
          .select('*')
          .eq('user_id', userId);

        if (oauthTokens && oauthTokens.length > 0) {
          // TODO: Call external cleanup to revoke tokens first
          // For now, just delete the records
          await supabaseClient
            .from('oauth_tokens')
            .delete()
            .eq('user_id', userId);
        }

        // 3g. Delete from Supabase Auth (THIS MUST BE LAST)
        await supabaseClient.auth.admin.deleteUser(userId);

        // 3h. Mark deletion as completed
        await supabaseClient
          .from('account_deletions')
          .update({
            deletion_completed: true,
            permanent_deletion_at: new Date().toISOString()
          })
          .eq('user_id', userId);

        response.processedUsers += 1;

        // 3i. Log the permanent deletion
        await supabaseClient
          .from('data_operations_audit')
          .insert({
            user_id: userId, // Will reference null after auth deletion
            operation_type: 'permanent_deletion_completed',
            affected_tables: [
              'user_settings', 'messages', 'user_presence', 'user_data_exports',
              'onboarding_sessions', 'user_quote_responses', 'user_feature_access',
              'xp_transactions', 'level_progressions', 'oauth_tokens', 'auth.users'
            ],
            record_count: response.deletedRecords,
            operation_metadata: {
              anonymous_id: anonymousId,
              total_xp: anonymizationData.totalXP,
              final_level: anonymizationData.currentLevel,
              mascot_stage: anonymizationData.mascotStage,
              deletion_reason: account.deletion_reason,
              anonymized_records: response.anonymizedRecords
            },
            legal_basis: 'gdpr_compliance',
            performed_by: null, // System operation
            ip_address: req.headers.get('cf-connecting-ip'),
            user_agent: 'system/cleanup-function'
          });

        console.log(`Completed permanent deletion for user ${userId}, anonymized as ${anonymousId}`);

      } catch (error) {
        response.errors.push(`Failed to delete user ${userId}: ${error.message}`);
        console.error(`Error deleting user ${userId}:`, error);
      }
    }

    response.success = response.errors.length === 0;

    console.log(`Cleanup completed. Processed: ${response.processedUsers}, Deleted: ${response.deletedRecords}, Anonymized: ${response.anonymizedRecords}, Errors: ${response.errors.length}`);

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Cleanup deleted accounts function error:', error);
    
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