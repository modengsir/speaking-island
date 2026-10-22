import { test } from "node:test";
import assert from "node:assert/strict";
import { accessState, passwordChallenge, sameOrigin } from "../lib/server-access.ts";

function request(url = "http://127.0.0.1:3000/", credentials) {
  return new Request(url, { headers: credentials === undefined ? {} : { Authorization: "Basic " + Buffer.from(credentials).toString("base64") } });
}

test("local development is available without a password; remote development is locked", () => {
  for (const host of ["localhost", "127.0.0.1", "[::1]"]) assert.equal(accessState(request(`http://${host}:3000/`), { NODE_ENV: "development" }), "allowed");
  for (const host of ["example.com", "localhost.example.com", "192.168.1.2"]) assert.equal(accessState(request(`https://${host}/`), { NODE_ENV: "development" }), "production_locked");
});

test("production fails closed even when the request URL is localhost", () => {
  for (const url of ["https://example.com/", "http://127.0.0.1:3000/"]) assert.equal(accessState(request(url), { NODE_ENV: "production" }), "production_locked");
});

test("a configured password protects both development and production", () => {
  const environment = { NODE_ENV: "production", APP_PASSWORD: "test-only-family-password" };
  assert.equal(accessState(request("https://example.com/", "parent:test-only-family-password"), environment), "allowed");
  for (const credentials of [undefined, "parent:wrong", "other:test-only-family-password", "parent:test-only-family-password-extra"]) assert.equal(accessState(request("https://example.com/", credentials), environment), "password_required");
  assert.equal(accessState(new Request("https://example.com/", { headers: { Authorization: "Bearer arbitrary-token" } }), environment), "password_required");
  assert.equal(accessState(request(), { ...environment, NODE_ENV: "development" }), "password_required");
});

test("password parsing handles unicode and rejects malformed or oversized headers", () => {
  assert.equal(accessState(request("https://example.com/", "parent:家庭:练习"), { APP_PASSWORD: "家庭:练习" }), "allowed");
  for (const authorization of ["Basic !!!", "Basic ", "Basic " + "x".repeat(5000)]) assert.equal(accessState(new Request("https://example.com/", { headers: { authorization } }), { APP_PASSWORD: "test-only" }), "password_required");
  const response = passwordChallenge();
  assert.equal(response.status, 401);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.match(response.headers.get("www-authenticate"), /^Basic /);
});

test("origin checks support an explicit HTTPS proxy origin and reject cross-site requests", () => {
  const local = "http://127.0.0.1:3000/api/voice/listen";
  const browser = origin => new Request(local, { headers: { origin } });
  assert.equal(sameOrigin(browser("http://127.0.0.1:3000"), ""), true);
  assert.equal(sameOrigin(browser("https://example.com"), ""), false);
  assert.equal(sameOrigin(browser("https://example.com"), "https://example.com"), true);
  assert.equal(sameOrigin(browser("https://other.example"), "https://example.com"), false);
  assert.equal(sameOrigin(browser("null"), "https://example.com"), false);
  assert.equal(sameOrigin(browser("https://example.com"), "invalid url"), false);
  assert.equal(sameOrigin(new Request(local), "https://example.com"), true);
});
