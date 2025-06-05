/**
 * Test setup file for Bun tests
 * This file is loaded before any tests are run
 */

import { config } from 'dotenv';
import { USER_ID, API_BASE_URL, API_NEO4J_URL, API_MCP_URL, colors, log } from './constants.js';

// Load environment variables
config();

// Add constants to global scope for easy access in tests
global.USER_ID = USER_ID;
global.API_BASE_URL = API_BASE_URL;
global.API_NEO4J_URL = API_NEO4J_URL;
global.API_MCP_URL = API_MCP_URL;
global.colors = colors;
global.log = log;

console.log(`${colors.green}[SETUP]${colors.reset} Test environment initialized with API: ${API_BASE_URL}`);