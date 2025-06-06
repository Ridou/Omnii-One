import { test, expect } from "bun:test";

const DOMAIN = "omnii.net";
const USER_AGENT = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

async function http200(url: string) {
  const res = await fetch(url, { method: "HEAD", headers: { "User-Agent": USER_AGENT } });
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
  return output.toLowerCase().includes("google-site-verification");
}

async function htmlMetaContainsGoogleVerification(url: string) {
  const proc = Bun.spawnSync([
    "curl",
    "-A", USER_AGENT,
    "-s", url
  ]);
  const html = proc.stdout.toString();
  return /google-site-verification/i.test(html);
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