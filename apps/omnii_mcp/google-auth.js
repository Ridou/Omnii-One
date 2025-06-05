const express = require("express");
const { google } = require("googleapis");
const { OAuth2Client } = require("google-auth-library");
const path = require("path");
const fs = require("fs").promises;

const app = express();
const port = 8000;

// Add body parser middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// OAuth2 credentials from Google Cloud Console
const CLIENT_ID =
  "process.env.GOOGLE_CLIENT_ID";
const CLIENT_SECRET = "process.env.GOOGLE_CLIENT_SECRET";
const REDIRECT_URI = "http://localhost:8000/auth/google/callback";

// Validate credentials
if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error("Missing OAuth2 credentials!");
  process.exit(1);
}

console.log("Starting server with OAuth2 configuration:", {
  clientId: CLIENT_ID,
  clientSecretLength: CLIENT_SECRET.length,
  redirectUri: REDIRECT_URI,
  port,
});

const oauth2Client = new OAuth2Client(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

// Store tokens (in production, use a proper database)
const tokens = new Map();

app.get("/", (req, res) => {
  res.send(`
    <h1>Google Contacts API Demo</h1>
    <p>This demo uses OAuth2 to access your Google Contacts.</p>
    <a href="/auth">Login with Google</a>
  `);
});

app.get("/auth", (req, res) => {
  try {
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/contacts"],
      prompt: "consent",
    });
    console.log("Generated OAuth2 auth URL:", authUrl);
    res.redirect(authUrl);
  } catch (error) {
    console.error("Error generating auth URL:", error);
    res.status(500).send(`
      <h1>Error generating auth URL</h1>
      <pre>${JSON.stringify(error, null, 2)}</pre>
    `);
  }
});

app.get("/auth/google/callback", async (req, res) => {
  const { code, error: authError } = req.query;

  if (authError) {
    console.error("Auth error from Google:", authError);
    return res.status(400).send(`
      <h1>Auth Error</h1>
      <p>${authError}</p>
    `);
  }

  if (!code) {
    console.error("No code received from Google");
    return res.status(400).send("No code provided");
  }

  console.log("Received OAuth2 code:", code.substring(0, 10) + "...");

  try {
    console.log("Attempting to exchange code for OAuth2 tokens...");
    const { tokens: newTokens } = await oauth2Client.getToken(code);

    console.log("OAuth2 token exchange successful:", {
      hasAccessToken: !!newTokens.access_token,
      hasRefreshToken: !!newTokens.refresh_token,
      scope: newTokens.scope,
      tokenType: newTokens.token_type,
      expiryDate: newTokens.expiry_date,
    });

    oauth2Client.setCredentials(newTokens);

    // Store tokens (in production, use a proper database)
    const userId = "user123"; // In production, use actual user ID
    tokens.set(userId, newTokens);

    // Show contacts page with create form
    try {
      const people = google.people({ version: "v1", auth: oauth2Client });
      const { data } = await people.people.connections.list({
        resourceName: "people/me",
        pageSize: 10,
        personFields: "names,emailAddresses",
      });

      res.send(`
        <h1>Your Contacts</h1>
        <div style="margin: 20px 0; padding: 20px; border: 1px solid #ccc; border-radius: 5px;">
          <h2>Create New Contact</h2>
          <form action="/create-contact" method="POST">
            <div style="margin: 10px 0;">
              <label for="givenName">First Name:</label><br>
              <input type="text" id="givenName" name="givenName" required style="padding: 5px; width: 200px;">
            </div>
            <div style="margin: 10px 0;">
              <label for="familyName">Last Name:</label><br>
              <input type="text" id="familyName" name="familyName" required style="padding: 5px; width: 200px;">
            </div>
            <div style="margin: 10px 0;">
              <label for="email">Email:</label><br>
              <input type="email" id="email" name="email" style="padding: 5px; width: 200px;">
            </div>
            <button type="submit" style="padding: 8px 15px; background: #4285f4; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Contact</button>
          </form>
        </div>
        <h2>Existing Contacts</h2>
        <pre>${JSON.stringify(data.connections, null, 2)}</pre>
        <a href="/">Back to Home</a>
      `);
    } catch (error) {
      console.error("Error accessing contacts:", error);
      res.status(500).send(`
        <h1>Error accessing contacts</h1>
        <pre>${JSON.stringify(error.response?.data || error, null, 2)}</pre>
        <a href="/">Try again</a>
      `);
    }
  } catch (error) {
    console.error("Full error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data,
      stack: error.stack,
    });

    res.status(500).send(`
      <h1>Error getting OAuth2 tokens</h1>
      <p>${error.message}</p>
      <h2>Debug Information:</h2>
      <pre>${JSON.stringify(
        {
          error: error.message,
          code: error.code,
          status: error.status,
          response: error.response?.data,
        },
        null,
        2
      )}</pre>
      <h2>Please check:</h2>
      <ul>
        <li>Your OAuth2 client ID and secret are correct</li>
        <li>The redirect URI matches what's in Google Cloud Console</li>
        <li>The People API is enabled</li>
        <li>Your OAuth consent screen is configured</li>
        <li>You're using the correct Google account</li>
      </ul>
      <a href="/">Try again</a>
    `);
  }
});

app.post("/create-contact", async (req, res) => {
  try {
    const { givenName, familyName, email } = req.body;
    const userId = "user123"; // In production, use actual user ID
    const userTokens = tokens.get(userId);

    if (!userTokens) {
      return res.status(401).send(`
        <h1>Not Authenticated</h1>
        <p>Please <a href="/auth">login</a> first.</p>
      `);
    }

    oauth2Client.setCredentials(userTokens);
    const people = google.people({ version: "v1", auth: oauth2Client });

    const contact = {
      names: [
        {
          givenName,
          familyName,
        },
      ],
    };

    if (email) {
      contact.emailAddresses = [
        {
          value: email,
          type: "work",
        },
      ];
    }

    const response = await people.people.createContact({
      requestBody: contact,
    });

    console.log("Contact created:", response.data);

    // Redirect back to show updated contacts
    res.redirect("/auth/google/callback?code=" + userTokens.code);
  } catch (error) {
    console.error("Error creating contact:", error);
    res.status(500).send(`
      <h1>Error creating contact</h1>
      <pre>${JSON.stringify(error.response?.data || error, null, 2)}</pre>
      <a href="/auth/google/callback?code=${
        tokens.get("user123")?.code
      }">Back to Contacts</a>
    `);
  }
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
