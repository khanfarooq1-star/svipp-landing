import { assert, assertEquals } from "jsr:@std/assert@1";
import { ADMIN_IDS, handleRequest, isAdmin } from "./index.ts";

const IKKE_ADMIN = "00000000-0000-0000-0000-000000000000";

function lagReq(method = "POST"): Request {
  return new Request("https://x.functions.supabase.co/admin-metrics", {
    method,
    headers: { Authorization: "Bearer fake.jwt.token", Origin: "https://svipp.app" },
  });
}

// Hovedkravet: ikke-admin JWT -> 403, og INGEN data hentes.
Deno.test("403 for ikke-admin JWT, og data hentes ikke", async () => {
  let computeKalt = false;
  const res = await handleRequest(lagReq(), {
    resolveUserId: () => Promise.resolve(IKKE_ADMIN),
    computeMetrics: () => {
      computeKalt = true;
      return Promise.resolve({ hemmelig: true });
    },
  });
  assertEquals(res.status, 403);
  const body = await res.json();
  assertEquals(body.ok, false);
  assertEquals(body.error, "Ingen tilgang");
  assertEquals(body.hemmelig, undefined); // ingen data lekket
  assertEquals(computeKalt, false); // computeMetrics ble aldri kalt
});

// Manglende/ugyldig bruker -> 401 (heller ikke her hentes data).
Deno.test("401 naar bruker ikke kan verifiseres", async () => {
  let computeKalt = false;
  const res = await handleRequest(lagReq(), {
    resolveUserId: () => Promise.resolve(null),
    computeMetrics: () => {
      computeKalt = true;
      return Promise.resolve({});
    },
  });
  assertEquals(res.status, 401);
  assertEquals(computeKalt, false);
});

// Admin slipper gjennom -> 200 med data.
Deno.test("200 for admin, med data", async () => {
  const res = await handleRequest(lagReq(), {
    resolveUserId: () => Promise.resolve(ADMIN_IDS[0]),
    computeMetrics: () => Promise.resolve({ brukere: { total: 13 } }),
  });
  assertEquals(res.status, 200);
  const body = await res.json();
  assertEquals(body.ok, true);
  assertEquals(body.brukere.total, 13);
});

// OPTIONS -> CORS-preflight uten autorisasjon.
Deno.test("OPTIONS returnerer CORS-preflight", async () => {
  const res = await handleRequest(lagReq("OPTIONS"), {
    resolveUserId: () => Promise.reject(new Error("skal ikke kalles")),
    computeMetrics: () => Promise.reject(new Error("skal ikke kalles")),
  });
  assertEquals(res.status, 200);
  assert(res.headers.get("Access-Control-Allow-Origin") !== null);
  await res.body?.cancel();
});

Deno.test("isAdmin: kun allowlisten slipper inn", () => {
  assert(isAdmin(ADMIN_IDS[0]));
  assert(!isAdmin(IKKE_ADMIN));
  assert(!isAdmin(null));
  assert(!isAdmin("c8f9bea5-b283-4d83-b385-24862d68a198")); // Alian (rad 1) - nektes
});
