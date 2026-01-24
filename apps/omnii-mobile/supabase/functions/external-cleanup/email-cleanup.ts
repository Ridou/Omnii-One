import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface EmailCleanupRequest {
  userId: string;
  userEmail: string;
}

interface EmailCleanupResponse {
  success: boolean;
  unsubscribedFromMarketing: boolean;
  addedToSuppression: boolean;
  preferencesCleared: boolean;
  errors: string[];
  cleanupSummary: {
    emailAddress: string;
    marketingListsRemoved: number;
    preferencesCleared: number;
    suppressionAdded: boolean;
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
    const requestBody: EmailCleanupRequest = await req.json();
    const { userId, userEmail } = requestBody;

    // Validate request
    if (!userId || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'User ID and email are required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const response: EmailCleanupResponse = {
      success: false,
      unsubscribedFromMarketing: false,
      addedToSuppression: false,
      preferencesCleared: false,
      errors: [],
      cleanupSummary: {
        emailAddress: userEmail,
        marketingListsRemoved: 0,
        preferencesCleared: 0,
        suppressionAdded: false
      }
    };

    console.log(`Starting email cleanup for user: ${userId} (${userEmail})`);

    // 1. Add email to our suppression list first (most important)
    try {
      const { error: suppressionError } = await supabaseClient
        .from('email_suppressions')
        .insert({
          email: userEmail.toLowerCase(),
          reason: 'account_deletion_gdpr',
          suppressed_at: new Date().toISOString()
        });

      if (suppressionError && suppressionError.code !== '23505') {
        // 23505 is unique constraint violation - email already suppressed, which is fine
        response.errors.push(`Failed to add to suppression list: ${suppressionError.message}`);
      } else {
        response.addedToSuppression = true;
        response.cleanupSummary.suppressionAdded = true;
        console.log(`Added ${userEmail} to email suppression list`);
      }
    } catch (error) {
      response.errors.push(`Error adding to suppression list: ${error.message}`);
    }

    // 2. Clear email preferences from user settings
    try {
      const { data: userSettings } = await supabaseClient
        .from('user_settings')
        .select('settings')
        .eq('user_id', userId)
        .single();

      if (userSettings?.settings) {
        // Clear all email-related preferences
        const updatedSettings = { ...userSettings.settings };
        const emailFields = [
          'email_notifications',
          'marketing_emails',
          'newsletter_subscription',
          'product_updates',
          'security_alerts',
          'weekly_digest',
          'achievement_notifications',
          'team_notifications'
        ];

        let clearedCount = 0;
        emailFields.forEach(field => {
          if (updatedSettings[field] !== undefined) {
            updatedSettings[field] = false;
            clearedCount++;
          }
        });

        // Update user settings
        const { error: settingsError } = await supabaseClient
          .from('user_settings')
          .update({ settings: updatedSettings })
          .eq('user_id', userId);

        if (settingsError) {
          response.errors.push(`Failed to clear email preferences: ${settingsError.message}`);
        } else {
          response.preferencesCleared = true;
          response.cleanupSummary.preferencesCleared = clearedCount;
          console.log(`Cleared ${clearedCount} email preferences`);
        }
      } else {
        response.preferencesCleared = true; // No preferences to clear
      }
    } catch (error) {
      response.errors.push(`Error clearing email preferences: ${error.message}`);
    }

    // 3. SendGrid unsubscribe (if configured)
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY');
    if (sendGridApiKey) {
      try {
        // Add to SendGrid global suppression list
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/asm/suppressions/global', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient_emails: [userEmail]
          })
        });

        if (sendGridResponse.ok) {
          response.unsubscribedFromMarketing = true;
          response.cleanupSummary.marketingListsRemoved += 1;
          console.log(`Added ${userEmail} to SendGrid global suppression`);
        } else {
          const errorText = await sendGridResponse.text();
          response.errors.push(`SendGrid suppression failed: ${sendGridResponse.status} - ${errorText}`);
        }

        // Also try to remove from all SendGrid contact lists
        try {
          const deleteFromListsResponse = await fetch(`https://api.sendgrid.com/v3/marketing/contacts?emails=${encodeURIComponent(userEmail)}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${sendGridApiKey}`
            }
          });

          if (deleteFromListsResponse.ok) {
            console.log(`Removed ${userEmail} from SendGrid contact lists`);
          }
        } catch (listError) {
          console.error('SendGrid list removal error:', listError);
        }

      } catch (sendGridError) {
        response.errors.push(`SendGrid API error: ${sendGridError.message}`);
      }
    } else {
      response.unsubscribedFromMarketing = true; // No SendGrid configured, consider success
      console.log('SendGrid not configured, skipping external unsubscribe');
    }

    // 4. Mailchimp unsubscribe (if configured)
    const mailchimpApiKey = Deno.env.get('MAILCHIMP_API_KEY');
    const mailchimpServer = Deno.env.get('MAILCHIMP_SERVER'); // e.g., 'us1'
    
    if (mailchimpApiKey && mailchimpServer) {
      try {
        // Calculate MD5 hash of email for Mailchimp API
        const emailHash = await crypto.subtle.digest(
          'MD5', 
          new TextEncoder().encode(userEmail.toLowerCase())
        );
        const hashArray = Array.from(new Uint8Array(emailHash));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

        // Get list ID (you might want to store this in environment or database)
        const listId = Deno.env.get('MAILCHIMP_LIST_ID');
        
        if (listId) {
          const mailchimpResponse = await fetch(
            `https://${mailchimpServer}.api.mailchimp.com/3.0/lists/${listId}/members/${hashHex}`,
            {
              method: 'PATCH',
              headers: {
                'Authorization': `Bearer ${mailchimpApiKey}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                status: 'unsubscribed'
              })
            }
          );

          if (mailchimpResponse.ok || mailchimpResponse.status === 404) {
            // 404 means email wasn't in list, which is fine
            response.cleanupSummary.marketingListsRemoved += 1;
            console.log(`Unsubscribed ${userEmail} from Mailchimp`);
          } else {
            response.errors.push(`Mailchimp unsubscribe failed: ${mailchimpResponse.status}`);
          }
        }
      } catch (mailchimpError) {
        response.errors.push(`Mailchimp API error: ${mailchimpError.message}`);
      }
    }

    // 5. Log cleanup operation for audit trail
    await supabaseClient
      .from('data_operations_audit')
      .insert({
        user_id: userId,
        operation_type: 'email_cleanup',
        affected_tables: ['email_suppressions', 'user_settings'],
        record_count: 1,
        operation_metadata: {
          email_address: userEmail,
          suppression_added: response.addedToSuppression,
          marketing_unsubscribed: response.unsubscribedFromMarketing,
          preferences_cleared: response.preferencesCleared,
          cleanup_summary: response.cleanupSummary,
          external_services: {
            sendgrid_configured: !!sendGridApiKey,
            mailchimp_configured: !!(mailchimpApiKey && mailchimpServer)
          }
        },
        legal_basis: 'gdpr_compliance',
        performed_by: userId,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent') || 'system/email-cleanup'
      });

    // 6. Log high-impact operation if this is a marketing email
    const isDomainEmail = userEmail.includes('@omnii.') || userEmail.includes('@gmail.') || userEmail.includes('@yahoo.') || userEmail.includes('@hotmail.');
    
    if (isDomainEmail) {
      const { data: auditRecord } = await supabaseClient
        .from('data_operations_audit')
        .select('id')
        .eq('user_id', userId)
        .eq('operation_type', 'email_cleanup')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (auditRecord) {
        await supabaseClient
          .from('high_impact_operations_log')
          .insert({
            audit_id: auditRecord.id,
            operation_type: 'email_suppression',
            user_id: userId,
            impact_level: 'medium',
            requires_review: false // Automated process
          });
      }
    }

    // 7. Determine overall success
    response.success = response.addedToSuppression && response.errors.length === 0;

    console.log(`Email cleanup completed for user ${userId}:`, {
      email: userEmail,
      suppressionAdded: response.addedToSuppression,
      marketingUnsubscribed: response.unsubscribedFromMarketing,
      preferencesCleared: response.preferencesCleared,
      errorsCount: response.errors.length
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: response.success ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Email cleanup function error:', error);
    
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