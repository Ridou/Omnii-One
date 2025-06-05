import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface ExternalCleanupRequest {
  userId: string;
  userEmail: string;
  services: ('google' | 'stripe' | 'email')[];
}

interface CleanupResult {
  service: string;
  success: boolean;
  details: any;
  errors: string[];
  duration: number;
}

interface ExternalCleanupResponse {
  overallSuccess: boolean;
  servicesCleanedUp: string[];
  totalItemsCleaned: number;
  serviceResults: CleanupResult[];
  errors: string[];
  cleanupSummary: {
    totalServices: number;
    successfulServices: number;
    failedServices: number;
    totalDuration: number;
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
    const requestBody: ExternalCleanupRequest = await req.json();
    const { userId, userEmail, services = ['google', 'stripe', 'email'] } = requestBody;

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

    const response: ExternalCleanupResponse = {
      overallSuccess: false,
      servicesCleanedUp: [],
      totalItemsCleaned: 0,
      serviceResults: [],
      errors: [],
      cleanupSummary: {
        totalServices: services.length,
        successfulServices: 0,
        failedServices: 0,
        totalDuration: 0
      }
    };

    const startTime = Date.now();
    console.log(`Starting external service cleanup orchestration for user: ${userId}`);
    console.log(`Services to clean: ${services.join(', ')}`);

    // 1. Google OAuth Cleanup
    if (services.includes('google')) {
      const serviceStartTime = Date.now();
      console.log('Starting Google OAuth cleanup...');
      
      try {
        const googleResponse = await fetch(`${req.url.replace('/orchestrator', '/google-oauth')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            userId,
            userEmail
          })
        });

        const googleResult = await googleResponse.json();
        const serviceDuration = Date.now() - serviceStartTime;

        const cleanupResult: CleanupResult = {
          service: 'google',
          success: googleResponse.ok && googleResult.success,
          details: googleResult,
          errors: googleResult.errors || [],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);

        if (cleanupResult.success) {
          response.servicesCleanedUp.push('google');
          response.cleanupSummary.successfulServices += 1;
          response.totalItemsCleaned += googleResult.tokensRevoked || 0;
          console.log(`Google cleanup completed successfully in ${serviceDuration}ms`);
        } else {
          response.cleanupSummary.failedServices += 1;
          response.errors.push(`Google cleanup failed: ${googleResult.error || 'Unknown error'}`);
          console.error(`Google cleanup failed in ${serviceDuration}ms`);
        }

      } catch (error) {
        const serviceDuration = Date.now() - serviceStartTime;
        const cleanupResult: CleanupResult = {
          service: 'google',
          success: false,
          details: null,
          errors: [error.message],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);
        response.cleanupSummary.failedServices += 1;
        response.errors.push(`Google cleanup error: ${error.message}`);
        console.error(`Google cleanup error in ${serviceDuration}ms:`, error);
      }
    }

    // 2. Stripe Cleanup
    if (services.includes('stripe')) {
      const serviceStartTime = Date.now();
      console.log('Starting Stripe cleanup...');
      
      try {
        const stripeResponse = await fetch(`${req.url.replace('/orchestrator', '/stripe-cleanup')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            userId,
            userEmail
          })
        });

        const stripeResult = await stripeResponse.json();
        const serviceDuration = Date.now() - serviceStartTime;

        const cleanupResult: CleanupResult = {
          service: 'stripe',
          success: stripeResponse.ok && stripeResult.success,
          details: stripeResult,
          errors: stripeResult.errors || [],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);

        if (cleanupResult.success) {
          response.servicesCleanedUp.push('stripe');
          response.cleanupSummary.successfulServices += 1;
          response.totalItemsCleaned += (stripeResult.subscriptionsCancelled || 0) + 
                                      (stripeResult.paymentMethodsDetached || 0);
          console.log(`Stripe cleanup completed successfully in ${serviceDuration}ms`);
        } else {
          response.cleanupSummary.failedServices += 1;
          response.errors.push(`Stripe cleanup failed: ${stripeResult.error || 'Unknown error'}`);
          console.error(`Stripe cleanup failed in ${serviceDuration}ms`);
        }

      } catch (error) {
        const serviceDuration = Date.now() - serviceStartTime;
        const cleanupResult: CleanupResult = {
          service: 'stripe',
          success: false,
          details: null,
          errors: [error.message],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);
        response.cleanupSummary.failedServices += 1;
        response.errors.push(`Stripe cleanup error: ${error.message}`);
        console.error(`Stripe cleanup error in ${serviceDuration}ms:`, error);
      }
    }

    // 3. Email Cleanup
    if (services.includes('email')) {
      const serviceStartTime = Date.now();
      console.log('Starting Email cleanup...');
      
      try {
        const emailResponse = await fetch(`${req.url.replace('/orchestrator', '/email-cleanup')}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': req.headers.get('Authorization') || ''
          },
          body: JSON.stringify({
            userId,
            userEmail
          })
        });

        const emailResult = await emailResponse.json();
        const serviceDuration = Date.now() - serviceStartTime;

        const cleanupResult: CleanupResult = {
          service: 'email',
          success: emailResponse.ok && emailResult.success,
          details: emailResult,
          errors: emailResult.errors || [],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);

        if (cleanupResult.success) {
          response.servicesCleanedUp.push('email');
          response.cleanupSummary.successfulServices += 1;
          response.totalItemsCleaned += emailResult.cleanupSummary?.marketingListsRemoved || 0;
          console.log(`Email cleanup completed successfully in ${serviceDuration}ms`);
        } else {
          response.cleanupSummary.failedServices += 1;
          response.errors.push(`Email cleanup failed: ${emailResult.error || 'Unknown error'}`);
          console.error(`Email cleanup failed in ${serviceDuration}ms`);
        }

      } catch (error) {
        const serviceDuration = Date.now() - serviceStartTime;
        const cleanupResult: CleanupResult = {
          service: 'email',
          success: false,
          details: null,
          errors: [error.message],
          duration: serviceDuration
        };

        response.serviceResults.push(cleanupResult);
        response.cleanupSummary.failedServices += 1;
        response.errors.push(`Email cleanup error: ${error.message}`);
        console.error(`Email cleanup error in ${serviceDuration}ms:`, error);
      }
    }

    // Calculate total duration
    response.cleanupSummary.totalDuration = Date.now() - startTime;

    // 4. Log orchestration operation for audit trail
    await supabaseClient
      .from('data_operations_audit')
      .insert({
        user_id: userId,
        operation_type: 'external_services_cleanup_orchestration',
        affected_tables: ['oauth_tokens', 'stripe_customers', 'email_suppressions'],
        record_count: response.totalItemsCleaned,
        operation_metadata: {
          services_requested: services,
          services_completed: response.servicesCleanedUp,
          total_items_cleaned: response.totalItemsCleaned,
          cleanup_summary: response.cleanupSummary,
          service_results: response.serviceResults.map(result => ({
            service: result.service,
            success: result.success,
            duration: result.duration,
            errors_count: result.errors.length
          })),
          user_email: userEmail
        },
        legal_basis: 'gdpr_compliance',
        performed_by: userId,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent') || 'system/external-cleanup-orchestrator'
      });

    // 5. Log high-impact operation
    const { data: auditRecord } = await supabaseClient
      .from('data_operations_audit')
      .select('id')
      .eq('user_id', userId)
      .eq('operation_type', 'external_services_cleanup_orchestration')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (auditRecord) {
      await supabaseClient
        .from('high_impact_operations_log')
        .insert({
          audit_id: auditRecord.id,
          operation_type: 'external_services_cleanup',
          user_id: userId,
          impact_level: 'critical',
          requires_review: false // Automated process
        });
    }

    // 6. Determine overall success
    response.overallSuccess = response.cleanupSummary.successfulServices === response.cleanupSummary.totalServices;

    console.log(`External cleanup orchestration completed for user ${userId}:`, {
      totalServices: response.cleanupSummary.totalServices,
      successful: response.cleanupSummary.successfulServices,
      failed: response.cleanupSummary.failedServices,
      totalItemsCleaned: response.totalItemsCleaned,
      duration: response.cleanupSummary.totalDuration,
      overallSuccess: response.overallSuccess
    });

    return new Response(
      JSON.stringify(response),
      { 
        status: response.overallSuccess ? 200 : 207, // 207 Multi-Status for partial success
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('External cleanup orchestrator function error:', error);
    
    return new Response(
      JSON.stringify({ 
        overallSuccess: false, 
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