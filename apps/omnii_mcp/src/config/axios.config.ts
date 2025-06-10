import axios, { AxiosInstance } from 'axios';
import { ClientRequest, RequestOptions } from 'http';
import { RequestOptions as HttpsRequestOptions } from 'https';

// Function to configure an axios instance
function configureAxiosInstance(instance: AxiosInstance, source: string) {
  console.log(`🔧 [AXIOS CONFIG] Configuring axios instance from: ${source}`);
  
  // Set default headers to prevent Brotli
  instance.defaults.headers.common['Accept-Encoding'] = 'gzip, deflate';

  // Add request interceptor
  instance.interceptors.request.use(
    (config) => {
      config.headers = config.headers || {};
      config.headers['Accept-Encoding'] = 'gzip, deflate';
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Add response interceptor to handle Brotli responses
  instance.interceptors.response.use(
    (response) => {
      // If the response has Brotli encoding, remove it to prevent decompression attempts
      if (response.headers['content-encoding'] === 'br') {
        console.log(`🔧 [AXIOS CONFIG] Removing Brotli encoding from response:`, {
          url: response.config.url,
          status: response.status
        });
        delete response.headers['content-encoding'];
      }
      return response;
    },
    (error) => Promise.reject(error)
  );
}

// Configure the default axios instance
configureAxiosInstance(axios, 'default');

// Patch the follow-redirects module's internal HTTP client
try {
  const followRedirects = require('follow-redirects');
  if (followRedirects) {
    // Patch the internal HTTP client
    const originalHttpRequest = followRedirects.http.request;
    const originalHttpsRequest = followRedirects.https.request;

    followRedirects.http.request = function(
      options: RequestOptions,
      callback?: (res: any) => void
    ): ClientRequest {
      options.headers = options.headers || {};
      options.headers['Accept-Encoding'] = 'gzip, deflate';
      return originalHttpRequest.call(this, options, callback);
    };

    followRedirects.https.request = function(
      options: HttpsRequestOptions,
      callback?: (res: any) => void
    ): ClientRequest {
      options.headers = options.headers || {};
      options.headers['Accept-Encoding'] = 'gzip, deflate';
      return originalHttpsRequest.call(this, options, callback);
    };

    console.log('✅ [AXIOS CONFIG] Patched follow-redirects internal HTTP client');
  }
} catch (error) {
  console.warn('⚠️ [AXIOS CONFIG] Could not patch follow-redirects:', error);
}

// Store the original create method
const originalCreate = axios.create;

// Override the create method to ensure all new instances have our configuration
axios.create = function(config) {
  const instance = originalCreate(config);
  configureAxiosInstance(instance, 'axios.create');
  return instance;
} as typeof axios.create;

// Patch the Composio library's axios instance if it exists
try {
  // @ts-ignore - Composio might be using its own axios instance
  const composio = require('composio-core');
  if (composio && composio.axios) {
    configureAxiosInstance(composio.axios, 'composio');
  }
} catch (error) {
  console.warn('⚠️ [AXIOS CONFIG] Could not configure Composio axios instance:', error);
}

console.log('✅ [AXIOS CONFIG] Axios configuration complete');

export default axios; 