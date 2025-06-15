import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Extend this function when going to production by
 * setting the baseUrl to your production API URL.
 */
export const getBaseUrl = () => {
  // First try to get from expo config extra
  const backendApiUrl = Constants.expoConfig?.extra?.backendApiUrl;
  
  // If that fails, try the environment variable directly  
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  
  // Return the first available URL or default to production
  return backendApiUrl || envUrl || "https://omniimcp-production.up.railway.app";
};
