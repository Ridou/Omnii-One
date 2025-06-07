import { test, expect } from "bun:test";

const DOMAIN = "omnii.net";
const USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function http200(url: string) {
  const res = await fetch(url, { method: "GET", headers: { "User-Agent": USER_AGENT } });
  const text = await res.text();
  console.log('text length',text.length);
  console.log('status',res.status);
  return res.status === 200;
}

async function dnsTxtContainsGoogleVerification(domain: string) {
  // Use dig with Google DNS for reliability
  const proc = Bun.spawnSync([
    "dig",
    "TXT",
    domain,
    "+short",
    "@8.8.8.8"
  ]);
  const output = proc.stdout.toString();
  
  console.log("=== DNS TXT Debug ===");
  console.log("Exit code:", proc.exitCode);
  console.log("Stdout:", JSON.stringify(output));
  console.log("Output length:", output.length);
  console.log("Contains google-site-verification:", output.toLowerCase().includes("google-site-verification"));
  console.log("=====================");
  
  return output.toLowerCase().includes("google-site-verification");
}

async function htmlMetaContainsGoogleVerification(url: string) {
  const proc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-s", url,
    "-H", "Accept: text/html"
  ]);
  const html = proc.stdout.toString();
  
  console.log("=== HTML Meta Debug ===");
  console.log("URL:", url);
  console.log("User-Agent:", USER_AGENT);
  console.log("HTML length:", html.length);
  console.log("First 500 chars:", html.substring(0, 500));
  console.log("Contains data-rh (React Helmet):", html.includes('data-rh="true"'));
  console.log("Contains google-site-verification:", /google-site-verification/i.test(html));
  console.log("Is React app?:", html.includes('data-rh="true"') || html.includes('<div id="root">'));
  console.log("========================");
  
  return /google-site-verification/i.test(html);
}

async function homepageContainsPrivacyLink(url: string) {
  const proc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-s", url
  ]);
  const html = proc.stdout.toString();
  
  console.log("=== Privacy Link Debug ===");
  console.log("URL:", url);
  console.log("HTML length:", html.length);
  console.log("Contains privacy-policy:", /href[^>]*["/]privacy[-]?policy[">/]/i.test(html));
  console.log("Privacy matches:", html.match(/href[^>]*privacy[^>]*>/gi));
  console.log("===========================");
  
  // Check for links to privacy policy
  return /href[^>]*["/]privacy[-]?policy[">/]/i.test(html);
}

async function homepageContainsTermsLink(url: string) {
  const proc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-s", url
  ]);
  const html = proc.stdout.toString();
  
  console.log("=== Terms Link Debug ===");
  console.log("URL:", url);
  console.log("HTML length:", html.length);
  console.log("Contains terms-of-service:", /href[^>]*["/]terms[-]?of[-]?service[">/]/i.test(html));
  console.log("Terms matches:", html.match(/href[^>]*terms[^>]*>/gi));
  console.log("=========================");
  
  // Check for links to terms of service
  return /href[^>]*["/]terms[-]?of[-]?service[">/]/i.test(html);
}

test("Homepage is accessible (HTTP 200)", async () => {
  expect(await http200(`https://${DOMAIN}/`)).toBe(true);
});

test("Privacy Policy is accessible (HTTP 200)", async () => {
  expect(await http200(`https://${DOMAIN}/privacy-policy`)).toBe(true);
});

test("Terms of Service is accessible (HTTP 200)", async () => {
  expect(await http200(`https://${DOMAIN}/terms-of-service`)).toBe(true);
});

test("google-site-verification TXT record exists", async () => {
  expect(await dnsTxtContainsGoogleVerification(DOMAIN)).toBe(true);
});

test("google-site-verification meta tag exists in homepage HTML", async () => {
  expect(await htmlMetaContainsGoogleVerification(`https://${DOMAIN}/`)).toBe(true);
});

test("Homepage contains link to Privacy Policy", async () => {
  expect(await homepageContainsPrivacyLink(`https://${DOMAIN}/`)).toBe(true);
});

test("Homepage contains link to Terms of Service", async () => {
  expect(await homepageContainsTermsLink(`https://${DOMAIN}/`)).toBe(true);
});

test("Direct access to landing.html works", async () => {
  const proc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-I", // Get headers to see status code
    `https://${DOMAIN}/landing.html`
  ]);
  const headers = proc.stdout.toString();
  
  console.log("=== Direct landing.html Test (Headers) ===");
  console.log("Headers:", headers);
  console.log("===========================================");
  
  // Also get the content
  const contentProc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-s", `https://${DOMAIN}/landing.html`
  ]);
  const html = contentProc.stdout.toString();
  
  console.log("=== Direct landing.html Test (Content) ===");
  console.log("HTML length:", html.length);
  console.log("First 200 chars:", html.substring(0, 200));
  console.log("Contains google-site-verification:", /google-site-verification/i.test(html));
  console.log("Contains privacy-policy link:", /href[^>]*privacy-policy/i.test(html));
  console.log("Contains terms-of-service link:", /href[^>]*terms-of-service/i.test(html));
  console.log("Is React app?:", html.includes('data-rh="true"'));
  console.log("Is 404 page?:", html.includes('404') || html.includes('Not Found'));
  console.log("==========================================");
  
  expect(headers.includes('200')).toBe(true);
});

test("User-Agent rewrite debugging", async () => {
  const userAgents = [
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Googlebot",
    "bot",
    "crawler",
    "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)"
  ];
  
  for (const ua of userAgents) {
    const proc = Bun.spawnSync([
      "curl",
      "-A", ua,
      "-s", `https://${DOMAIN}/`
    ]);
    const html = proc.stdout.toString();
    
    console.log(`=== User-Agent: ${ua} ===`);
    console.log("HTML length:", html.length);
    console.log("Is React app?:", html.includes('data-rh="true"'));
    console.log("Is static HTML?:", html.length < 10000 && !html.includes('data-rh="true"'));
    console.log("First 100 chars:", html.substring(0, 100));
    console.log("===============================");
  }
  
  expect(true).toBe(true); // Always pass, this is just for debugging
}); 