import { createSupabaseAdmin } from '@omnii/auth';
import type { AuraInstanceRequest, AuraInstanceResponse, AuraInstanceStatus } from '../../types/neo4j.types';

const AURA_API_BASE = 'https://api.neo4j.io/v1';

async function auraFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = process.env.OMNII_NEO4J_AURA_API_TOKEN;
  if (!token) {
    throw new Error('Missing OMNII_NEO4J_AURA_API_TOKEN');
  }

  const response = await fetch(`${AURA_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Aura API error: ${response.status} - ${error}`);
  }

  return response.json();
}

/**
 * Provision a new Neo4j database for a user.
 * Called by auth webhook on signup.
 */
export async function provisionUserDatabase(userId: string): Promise<{
  instanceId: string;
  status: 'pending' | 'ready' | 'failed';
}> {
  const supabase = createSupabaseAdmin();
  const tenantId = process.env.OMNII_NEO4J_AURA_TENANT_ID;

  if (!tenantId) {
    throw new Error('Missing OMNII_NEO4J_AURA_TENANT_ID');
  }

  // Create instance in Aura
  const instanceRequest: AuraInstanceRequest = {
    name: `omnii-user-${userId.substring(0, 8)}`,
    version: '5',
    region: 'us-central1',  // GCP region
    memory: '1GB',          // Smallest size
    type: 'free-db',        // Use free tier for dev, change for prod
    tenant_id: tenantId,
    cloud_provider: 'gcp',
  };

  try {
    const result = await auraFetch<AuraInstanceResponse>('/instances', {
      method: 'POST',
      body: JSON.stringify(instanceRequest),
    });

    // Convert neo4j+s:// to https:// for HTTP API
    const httpUri = result.data.connection_url.replace('neo4j+s://', 'https://');

    // Store in Supabase (status pending until DB is ready)
    const { error: insertError } = await supabase
      .from('user_databases')
      .insert({
        user_id: userId,
        neo4j_uri: httpUri,
        neo4j_user: result.data.username,
        neo4j_password: result.data.password,
        database_name: result.data.name,
        status: 'pending',
        aura_instance_id: result.data.id,
      });

    if (insertError) {
      console.error('Failed to store database credentials:', insertError);
      throw new Error('Failed to store database credentials');
    }

    // Start background polling for readiness
    pollInstanceStatus(userId, result.data.id);

    return {
      instanceId: result.data.id,
      status: 'pending',
    };

  } catch (error) {
    console.error('Database provisioning failed:', error);

    // Store failed status
    await supabase.from('user_databases').insert({
      user_id: userId,
      neo4j_uri: '',
      neo4j_user: '',
      neo4j_password: '',
      database_name: '',
      status: 'failed',
    });

    throw error;
  }
}

/**
 * Poll Aura API for instance readiness, update status when ready.
 * Runs in background (non-blocking).
 */
async function pollInstanceStatus(userId: string, instanceId: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const maxAttempts = 60;  // ~5 minutes at 5s intervals
  const pollInterval = 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    await new Promise(resolve => setTimeout(resolve, pollInterval));

    try {
      const status = await auraFetch<AuraInstanceStatus>(`/instances/${instanceId}`);

      if (status.data.status === 'running') {
        await supabase
          .from('user_databases')
          .update({ status: 'ready' })
          .eq('user_id', userId);

        console.log(`Database ready for user ${userId}`);
        return;
      }

      if (status.data.status === 'stopped' || status.data.status === 'deleting') {
        await supabase
          .from('user_databases')
          .update({ status: 'failed' })
          .eq('user_id', userId);

        console.error(`Database provisioning failed for user ${userId}`);
        return;
      }

    } catch (error) {
      console.error(`Error polling instance status:`, error);
    }
  }

  // Timeout - mark as failed
  await supabase
    .from('user_databases')
    .update({ status: 'failed' })
    .eq('user_id', userId);
}

/**
 * Get provisioning status for a user.
 */
export async function getProvisioningStatus(userId: string): Promise<{
  status: 'pending' | 'ready' | 'failed' | 'not_found';
  database?: { uri: string; name: string };
}> {
  const supabase = createSupabaseAdmin();

  const { data, error } = await supabase
    .from('user_databases')
    .select('status, neo4j_uri, database_name')
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return { status: 'not_found' };
  }

  return {
    status: data.status as 'pending' | 'ready' | 'failed',
    database: data.status === 'ready' ? {
      uri: data.neo4j_uri,
      name: data.database_name,
    } : undefined,
  };
}
