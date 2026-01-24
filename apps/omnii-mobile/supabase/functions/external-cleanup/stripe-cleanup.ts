import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { corsHeaders } from '../_shared/cors.ts';

interface StripeCleanupRequest {
  userId: string;
  userEmail?: string;
}

interface StripeCleanupResponse {
  success: boolean;
  customerAnonymized: boolean;
  subscriptionsCancelled: number;
  paymentMethodsDetached: number;
  errors: string[];
  cleanupSummary: {
    customerId?: string;
    totalSubscriptions: number;
    activeSubscriptions: number;
    totalPaymentMethods: number;
    ordersCount: number;
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
    const requestBody: StripeCleanupRequest = await req.json();
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

    const response: StripeCleanupResponse = {
      success: false,
      customerAnonymized: false,
      subscriptionsCancelled: 0,
      paymentMethodsDetached: 0,
      errors: [],
      cleanupSummary: {
        totalSubscriptions: 0,
        activeSubscriptions: 0,
        totalPaymentMethods: 0,
        ordersCount: 0
      }
    };

    console.log(`Starting Stripe cleanup for user: ${userId}`);

    // 1. Get Stripe customer information from our database
    const { data: stripeCustomer, error: customerError } = await supabaseClient
      .from('stripe_customers')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (customerError && customerError.code !== 'PGRST116') {
      response.errors.push(`Failed to retrieve Stripe customer: ${customerError.message}`);
      return new Response(
        JSON.stringify(response),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!stripeCustomer) {
      response.success = true;
      response.customerAnonymized = true;
      console.log(`No Stripe customer found for user ${userId}`);
      
      return new Response(
        JSON.stringify(response),
        { 
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const customerId = stripeCustomer.customer_id;
    response.cleanupSummary.customerId = customerId;
    console.log(`Found Stripe customer: ${customerId}`);

    // 2. Get Stripe secret key for API calls
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      response.errors.push('Stripe secret key not configured');
      return new Response(
        JSON.stringify(response),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const stripeHeaders = {
      'Authorization': `Bearer ${stripeSecretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      // 3. Get customer subscriptions from Stripe
      const subscriptionsResponse = await fetch(
        `https://api.stripe.com/v1/subscriptions?customer=${customerId}&limit=100`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
        }
      );

      if (subscriptionsResponse.ok) {
        const subscriptionsData = await subscriptionsResponse.json();
        response.cleanupSummary.totalSubscriptions = subscriptionsData.data?.length || 0;
        
        // Cancel active subscriptions
        for (const subscription of subscriptionsData.data || []) {
          if (subscription.status === 'active' || subscription.status === 'trialing') {
            response.cleanupSummary.activeSubscriptions += 1;
            
            try {
              const cancelResponse = await fetch(
                `https://api.stripe.com/v1/subscriptions/${subscription.id}`,
                {
                  method: 'DELETE',
                  headers: stripeHeaders
                }
              );

              if (cancelResponse.ok) {
                response.subscriptionsCancelled += 1;
                console.log(`Cancelled subscription: ${subscription.id}`);
              } else {
                response.errors.push(`Failed to cancel subscription ${subscription.id}`);
              }
            } catch (error) {
              response.errors.push(`Error cancelling subscription ${subscription.id}: ${error.message}`);
            }
          }
        }
      } else {
        response.errors.push(`Failed to retrieve subscriptions: ${subscriptionsResponse.status}`);
      }

      // 4. Get and detach payment methods
      const paymentMethodsResponse = await fetch(
        `https://api.stripe.com/v1/payment_methods?customer=${customerId}&limit=100`,
        {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${stripeSecretKey}` }
        }
      );

      if (paymentMethodsResponse.ok) {
        const paymentMethodsData = await paymentMethodsResponse.json();
        response.cleanupSummary.totalPaymentMethods = paymentMethodsData.data?.length || 0;
        
        // Detach payment methods
        for (const paymentMethod of paymentMethodsData.data || []) {
          try {
            const detachResponse = await fetch(
              `https://api.stripe.com/v1/payment_methods/${paymentMethod.id}/detach`,
              {
                method: 'POST',
                headers: stripeHeaders
              }
            );

            if (detachResponse.ok) {
              response.paymentMethodsDetached += 1;
              console.log(`Detached payment method: ${paymentMethod.id}`);
            } else {
              response.errors.push(`Failed to detach payment method ${paymentMethod.id}`);
            }
          } catch (error) {
            response.errors.push(`Error detaching payment method ${paymentMethod.id}: ${error.message}`);
          }
        }
      } else {
        response.errors.push(`Failed to retrieve payment methods: ${paymentMethodsResponse.status}`);
      }

      // 5. Anonymize customer data in Stripe (don't delete for compliance)
      const anonymizedEmail = `deleted-user-${crypto.randomUUID().substring(0, 8)}@omnii.net`;
      const anonymizeResponse = await fetch(
        `https://api.stripe.com/v1/customers/${customerId}`,
        {
          method: 'POST',
          headers: stripeHeaders,
          body: new URLSearchParams({
            email: anonymizedEmail,
            name: 'Deleted User',
            description: 'Account deleted - anonymized for compliance',
            phone: '',
            'metadata[anonymized_at]': new Date().toISOString(),
            'metadata[original_user_id]': userId,
            'metadata[deletion_type]': 'gdpr_request'
          }).toString()
        }
      );

      if (anonymizeResponse.ok) {
        response.customerAnonymized = true;
        console.log(`Anonymized Stripe customer: ${customerId}`);
      } else {
        response.errors.push(`Failed to anonymize Stripe customer: ${anonymizeResponse.status}`);
      }

    } catch (stripeError) {
      response.errors.push(`Stripe API error: ${stripeError.message}`);
    }

    // 6. Get order count from our database  
    const { data: orders } = await supabaseClient
      .from('stripe_orders')
      .select('id')
      .eq('user_id', userId);
    
    response.cleanupSummary.ordersCount = orders?.length || 0;

    // 7. Anonymize customer record in our database (preserve for 7-year compliance)
    const anonymousId = `anon_${crypto.randomUUID().substring(0, 8)}`;
    const { error: dbUpdateError } = await supabaseClient
      .from('stripe_customers')
      .update({
        user_id: null, // Remove user association
        metadata: {
          anonymized_at: new Date().toISOString(),
          anonymous_id: anonymousId,
          original_user_id: userId,
          deletion_reason: 'gdpr_request',
          financial_retention_required: true,
          retention_expires_at: new Date(Date.now() + (7 * 365 * 24 * 60 * 60 * 1000)).toISOString() // 7 years
        }
      })
      .eq('user_id', userId);

    if (dbUpdateError) {
      response.errors.push(`Failed to anonymize customer in database: ${dbUpdateError.message}`);
    }

    // 8. Anonymize order records (preserve for compliance)
    if (response.cleanupSummary.ordersCount > 0) {
      const { error: ordersUpdateError } = await supabaseClient
        .from('stripe_orders')
        .update({
          user_id: null, // Remove user association
          metadata: {
            anonymized_at: new Date().toISOString(),
            anonymous_id: anonymousId,
            original_user_id: userId
          }
        })
        .eq('user_id', userId);

      if (ordersUpdateError) {
        response.errors.push(`Failed to anonymize orders: ${ordersUpdateError.message}`);
      }
    }

    // 9. Log cleanup operation for audit trail
    await supabaseClient
      .from('data_operations_audit')
      .insert({
        user_id: userId,
        operation_type: 'stripe_cleanup',
        affected_tables: ['stripe_customers', 'stripe_orders'],
        record_count: 1 + response.cleanupSummary.ordersCount,
        operation_metadata: {
          stripe_customer_id: customerId,
          subscriptions_cancelled: response.subscriptionsCancelled,
          payment_methods_detached: response.paymentMethodsDetached,
          customer_anonymized: response.customerAnonymized,
          anonymous_id: anonymousId,
          cleanup_summary: response.cleanupSummary,
          financial_compliance_note: 'Customer and order data anonymized but retained for 7-year legal requirement'
        },
        legal_basis: 'gdpr_compliance',
        performed_by: userId,
        ip_address: req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for'),
        user_agent: req.headers.get('user-agent') || 'system/stripe-cleanup'
      });

    // 10. Log high-impact operation
    const { data: auditRecord } = await supabaseClient
      .from('data_operations_audit')
      .select('id')
      .eq('user_id', userId)
      .eq('operation_type', 'stripe_cleanup')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (auditRecord) {
      await supabaseClient
        .from('high_impact_operations_log')
        .insert({
          audit_id: auditRecord.id,
          operation_type: 'financial_data_anonymization',
          user_id: userId,
          impact_level: 'high',
          requires_review: false // Automated process with compliance preservation
        });
    }

    // 11. Determine overall success
    response.success = response.errors.length === 0;

    console.log(`Stripe cleanup completed for user ${userId}:`, {
      customerId,
      customerAnonymized: response.customerAnonymized,
      subscriptionsCancelled: response.subscriptionsCancelled,
      paymentMethodsDetached: response.paymentMethodsDetached,
      ordersAnonymized: response.cleanupSummary.ordersCount,
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
    console.error('Stripe cleanup function error:', error);
    
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