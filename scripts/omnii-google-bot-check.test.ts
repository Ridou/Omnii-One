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
    "-s", url
  ]);
  const html = proc.stdout.toString();
  
  console.log("=== HTML Meta Debug ===");
  console.log("URL:", url);
  console.log("HTML length:", html.length);
  console.log("First 500 chars:", html.substring(0, 500));
  console.log("Contains google-site-verification:", /google-site-verification/i.test(html));
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