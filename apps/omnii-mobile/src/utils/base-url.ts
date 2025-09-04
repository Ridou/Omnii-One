import Constants from "expo-constants";
import { Platform } from "react-native";

/**
 * Base URL Configuration - Easy Dev/Production Switching
 * 
 * DEVELOPMENT: Uses localhost:8000 (for testing executive assistant)
 * PRODUCTION: Uses Railway server (commented out below)
 */
export const getBaseUrl = () => {
  // First try to get from expo config extra
  const backendApiUrl = Constants.expoConfig?.extra?.backendApiUrl;
  
  // If that fails, try the environment variable directly  
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_BASE_URL;
  
  // FOR DEVELOPMENT: Use localhost to test executive assistant
  const developmentUrl = "http://localhost:8000";
  
  // FOR PRODUCTION: Uncomment line below and comment out developmentUrl
  // const productionUrl = "https://omniimcp-production.up.railway.app";
  
  // Return the first available URL or default to development
  return backendApiUrl || envUrl || developmentUrl;
  
  // TO SWITCH TO PRODUCTION:
  // 1. Comment out: return backendApiUrl || envUrl || developmentUrl;
  // 2. Uncomment: return backendApiUrl || envUrl || productionUrl;
};
