const { google } = require("googleapis");
const readline = require("readline");
const open = require("open");

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function getAuthCode(oauth2Client) {
  // Generate auth URL
  const scopes = [
    "https://www.googleapis.com/auth/contacts.readonly",
    "https://www.googleapis.com/auth/contacts",
    "https://www.googleapis.com/auth/contacts.other.readonly",
    "https://www.googleapis.com/auth/userinfo.profile",
    "https://www.googleapis.com/auth/userinfo.email",
  ];

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: scopes,
    prompt: "consent",
    include_granted_scopes: true,
  });

  console.log("\n🔗 Auth URL:");
  console.log(authUrl);
  console.log("\n📝 Opening browser for authorization...");

  // Open the auth URL in the default browser
  open(authUrl);

  console.log("\n📝 After authorizing, paste the code from the success page:");
  console.log(
    "Note: The code expires quickly, so paste it immediately after authorization."
  );

  return new Promise((resolve) => {
    rl.question("Enter the code: ", (code) => {
      resolve(code);
    });
  });
}

async function testSearchContacts() {
  console.log("Testing Google Contacts search...");

  try {
    // Initialize OAuth2 client with the server's callback URL
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      "https://omnii.net/auth/google/callback"
    );

    // Get auth code from user
    const code = await getAuthCode(oauth2Client);

    console.log("\n🔄 Exchanging code for tokens...");

    try {
      // Get tokens
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);

      console.log("\n✅ OAuth tokens received:", {
        access_token: tokens.access_token ? "present" : "missing",
        refresh_token: tokens.refresh_token ? "present" : "missing",
        expires_in: tokens.expires_in,
      });

      // Initialize People API with auth
      const peopleApi = google.people({ version: "v1", auth: oauth2Client });

      // Get search query from user
      const searchQuery = await new Promise((resolve) => {
        rl.question(
          "\nEnter search query (name, email, or phone): ",
          (query) => {
            resolve(query);
          }
        );
      });

      console.log(`\n🔍 Searching for: "${searchQuery}"`);

      // Search contacts
      const response = await peopleApi.people.connections.list({
        resourceName: "people/me",
        pageSize: 100,
        personFields: "names,emailAddresses,phoneNumbers",
      });

      const connections = response.data.connections || [];

      // Filter contacts based on search query
      const searchResults = connections.filter((person) => {
        const name = person.names?.[0]?.displayName?.toLowerCase() || "";
        const email = person.emailAddresses?.[0]?.value?.toLowerCase() || "";
        const phone = person.phoneNumbers?.[0]?.value || "";

        return (
          name.includes(searchQuery.toLowerCase()) ||
          email.includes(searchQuery.toLowerCase()) ||
          phone.includes(searchQuery)
        );
      });

      console.log(`\n✅ Found ${searchResults.length} matching contacts:`);

      searchResults.forEach((contact, index) => {
        const name = contact.names?.[0]?.displayName || "Unknown";
        const email = contact.emailAddresses?.[0]?.value || "No email";
        const phone = contact.phoneNumbers?.[0]?.value || "No phone";

        console.log(`\n${index + 1}. ${name}`);
        console.log(`   📧 ${email}`);
        console.log(`   📞 ${phone}`);
      });
    } catch (tokenError) {
      console.error("\n❌ Token exchange failed:", tokenError.message);
      if (tokenError.message.includes("invalid_grant")) {
        console.log("\nPossible reasons:");
        console.log("1. The code has expired (they expire quickly)");
        console.log("2. The code was already used");
        console.log("3. The redirect URI doesn't match exactly");
        console.log("\nTry running the script again to get a fresh code.");
      }
      throw tokenError;
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error.message);
    console.log("\nMake sure you have:");
    console.log("1. Valid OAuth2 credentials set in environment");
    console.log("2. Proper scopes authorized (contacts.readonly)");
    console.log("3. Valid access token");
  } finally {
    rl.close();
  }
}

testSearchContacts();
