import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient, type SupabaseClient } from "jsr:@supabase/supabase-js@2";

// ─────────────────────────────────────────────────────────────────────────────
// admin-metrics
//
// Privat admin-dashboard-backend ("Kontrolltarnet"). Verifiserer kallerens JWT,
// autoriserer mot en hardkodet admin-allowlist, og regner ut alle metrikker
// server-side med service-rolle. Radata forlater aldri denne funksjonen.
//
// SIKKERHET: Ingen service-nokkel finnes i frontend. Frontend snakker kun med
// denne funksjonen, autentisert med brukerens egen JWT. Deployes med JWT-
// verifisering PAA (verify_jwt=true) — gateway avviser ugyldig/manglende JWT,
// og koden under avviser alt som ikke er i ADMIN_IDS med 403.
// ─────────────────────────────────────────────────────────────────────────────

// Autorisert admin. Nøyaktig én ID med vilje: allowlist skal holde alle andre
// ute (inkl. skrivefeil-kontoer og andre brukere). Ikke utvid uten grunn.
export const ADMIN_IDS: readonly string[] = [
  "fe60ffd3-10d3-443e-a804-f3f6b93ea05c", // khan.farooq1@outlook.com
];

export function isAdmin(userId: string | null | undefined): boolean {
  return !!userId && ADMIN_IDS.includes(userId);
}

// Plan-priser i kr/mnd-ekvivalent for MRR-ESTIMAT. Alle tre betalte planer er
// med selv om ikke alle finnes i data ennaa (manedlig lanseres senere).
// plus_gratis = gratis kampanje: teller som aktiv bruker, men 0 kr MRR.
const PLAN_PRIS_MND: Record<string, number> = {
  ukentlig: 386, // 89 kr/uke  -> ~386 kr/mnd
  manedlig: 199, // 199 kr/mnd
  kvartalsvis: 133, // 399 kr/kvartal -> ~133 kr/mnd
};
// Norske plannavn i data bruker 'a-ring'. Vi normaliserer saa nokkel-oppslag
// virker uansett om verdien er "manedlig" eller "månedlig".
const PLAN_ALIAS: Record<string, string> = { "månedlig": "manedlig" };
const BETALTE_PLANER = ["ukentlig", "manedlig", "kvartalsvis"] as const;

// ── CORS (samme monster som resten av prosjektet) ───────────────────────────
// Admin-dashboardet hostes bak admin.svipp.app / svipp.app/admin. Lokalt aapner
// du HTML-fila direkte (origin "null") eller via en lokal server (localhost).
const ALLOWED_ORIGINS = new Set([
  "https://svipp.app",
  "https://admin.svipp.app",
  "https://www.svipp.app",
]);

function corsHeadersFor(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const erLokal = origin === "null" ||
    origin.startsWith("http://localhost") ||
    origin.startsWith("http://127.0.0.1");
  const allowOrigin = ALLOWED_ORIGINS.has(origin) || erLokal
    ? origin
    : "https://svipp.app";
  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Vary": "Origin",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

// ── Service-rolle-klient (lat init, saa modulen kan importeres i test uten env)
let _client: SupabaseClient | null = null;
function getServiceClient(): SupabaseClient {
  if (!_client) {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      throw new Error("Mangler SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
    }
    _client = createClient(url, key, { auth: { persistSession: false } });
  }
  return _client;
}

// Hent alle rader (PostgREST-paginering, robust mot rad-tak).
async function fetchAll(
  client: SupabaseClient,
  table: string,
  columns: string,
): Promise<Record<string, unknown>[]> {
  const pageSize = 1000;
  let from = 0;
  const out: Record<string, unknown>[] = [];
  while (true) {
    const { data, error } = await client
      .from(table)
      .select(columns)
      .range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows as Record<string, unknown>[]);
    if (rows.length < pageSize) break;
    from += pageSize;
  }
  return out;
}

// YYYY-MM-DD i Europe/Oslo (saa "i dag" stemmer for norsk bruker).
const osloFmt = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
function osloDate(d: Date): string {
  return osloFmt.format(d);
}

function toDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}

function rate(teller: number, nevner: number): number {
  return nevner > 0 ? teller / nevner : 0;
}

// ── Kjernen: regn ut alt server-side ────────────────────────────────────────
export async function computeMetricsWith(client: SupabaseClient) {
  const naa = new Date();
  const ms = 24 * 60 * 60 * 1000;
  const cutoff7 = new Date(naa.getTime() - 7 * ms);
  const cutoff30 = new Date(naa.getTime() - 30 * ms);
  const idagStr = osloDate(naa);

  const [brukereRader, soknadRader, hendelser] = await Promise.all([
    fetchAll(client, "brukere", "id, opprettet, sist_aktiv, slettet"),
    fetchAll(client, "soknader", "status, levert_kl"),
    fetchAll(
      client,
      "analytics_events",
      "pseudo_id, event_type, plan_paa_tidspunkt, opprettet",
    ),
  ]);

  // ── Daglig serie: init 30 dagers-bøtter (eldst -> nyest) ──
  const serie = new Map<
    string,
    { dato: string; nye_brukere: number; hoyre_sveips: number; venstre_sveips: number }
  >();
  for (let i = 29; i >= 0; i--) {
    const d = osloDate(new Date(naa.getTime() - i * ms));
    serie.set(d, { dato: d, nye_brukere: 0, hoyre_sveips: 0, venstre_sveips: 0 });
  }

  // ── Brukere ──
  const ikkeSlettet = brukereRader.filter((r) => r.slettet !== true);
  let nye7 = 0, nye30 = 0, aktive7 = 0;
  for (const r of ikkeSlettet) {
    const opp = toDate(r.opprettet);
    if (opp) {
      if (opp >= cutoff7) nye7++;
      if (opp >= cutoff30) nye30++;
      const b = serie.get(osloDate(opp));
      if (b) b.nye_brukere++;
    }
    const sist = toDate(r.sist_aktiv);
    if (sist && sist >= cutoff7) aktive7++;
  }

  // ── Analytics: sveips, konvertering, abonnement-estimat, daglig serie ──
  let hoyreTotal = 0, venstreTotal = 0, hoyre7 = 0, venstre7 = 0;
  let sendtFaktiskTotal = 0, sendtFaktisk7 = 0;
  let paywallVist = 0, kjopFullfort = 0;
  let hoyreIdag = 0, venstreIdag = 0;

  // Siste plan per pseudo_id -> beste tilnaerming paa "naavaerende" abonnent.
  const sistePlan = new Map<string, { t: number; plan: string | null }>();

  for (const e of hendelser) {
    const type = e.event_type as string;
    const t = toDate(e.opprettet);
    const tid = t ? t.getTime() : 0;
    const dag = t ? osloDate(t) : null;

    switch (type) {
      case "soknad_generert": {
        hoyreTotal++;
        if (t && t >= cutoff7) hoyre7++;
        if (dag === idagStr) hoyreIdag++;
        if (dag && serie.has(dag)) serie.get(dag)!.hoyre_sveips++;
        break;
      }
      case "soknad_forkastet": {
        venstreTotal++;
        if (t && t >= cutoff7) venstre7++;
        if (dag === idagStr) venstreIdag++;
        if (dag && serie.has(dag)) serie.get(dag)!.venstre_sveips++;
        break;
      }
      case "soknad_sendt": {
        sendtFaktiskTotal++;
        if (t && t >= cutoff7) sendtFaktisk7++;
        break;
      }
      case "paywall_vist":
        paywallVist++;
        break;
      case "kjop_fullfort":
        kjopFullfort++;
        break;
    }

    // Abonnement-estimat: hold siste kjente plan per pseudo_id.
    const pid = e.pseudo_id as string | null;
    if (pid) {
      const forrige = sistePlan.get(pid);
      if (!forrige || tid >= forrige.t) {
        sistePlan.set(pid, { t: tid, plan: (e.plan_paa_tidspunkt as string) ?? null });
      }
    }
  }

  // ── Inntekt-estimat (plan-basert) ──
  const planTeller: Record<string, number> = {
    ukentlig: 0, manedlig: 0, kvartalsvis: 0, plus_gratis: 0,
  };
  for (const { plan } of sistePlan.values()) {
    if (!plan) continue;
    const norm = PLAN_ALIAS[plan] ?? plan;
    if (norm in planTeller) planTeller[norm]++;
  }
  const perPlan = [
    ...BETALTE_PLANER.map((p) => ({
      plan: p,
      antall: planTeller[p],
      pris_mnd_kr: PLAN_PRIS_MND[p],
      sum_kr: planTeller[p] * PLAN_PRIS_MND[p],
    })),
    { plan: "plus_gratis", antall: planTeller.plus_gratis, pris_mnd_kr: 0, sum_kr: 0 },
  ];
  const estimertMrr = BETALTE_PLANER.reduce(
    (sum, p) => sum + planTeller[p] * PLAN_PRIS_MND[p],
    0,
  );
  const aktiveAbonnenter = BETALTE_PLANER.reduce((n, p) => n + planTeller[p], 0);

  // ── Soknader / leveringsrate ──
  let nLevert = 0, nFeilet = 0, nSendt = 0, nLevertKlEllerStatus = 0;
  for (const s of soknadRader) {
    const status = s.status as string | null;
    const harLevertKl = s.levert_kl != null;
    if (status === "levert") nLevert++;
    else if (status === "feilet") nFeilet++;
    else if (status === "sendt") nSendt++;
    if (status === "levert" || harLevertKl) nLevertKlEllerStatus++;
  }
  const forsokt = nLevert + nFeilet + nSendt; // nevner: forsokt levert (ekskl. utkast)

  return {
    generert_kl: naa.toISOString(),
    brukere: {
      total: ikkeSlettet.length,
      nye_7d: nye7,
      nye_30d: nye30,
      aktive_7d: aktive7,
    },
    sveips: {
      hoyre_total: hoyreTotal, // soknad_generert (= hoyresveip)
      venstre_total: venstreTotal, // soknad_forkastet (= venstresveip)
      hoyre_7d: hoyre7,
      venstre_7d: venstre7,
      i_dag_total: hoyreIdag + venstreIdag,
      send_rate: rate(hoyreTotal, hoyreTotal + venstreTotal),
      // Egen trakt-metrikk: hoyresveip (generert) -> faktisk sendt.
      sendt_faktisk: sendtFaktiskTotal, // soknad_sendt
      sendt_faktisk_7d: sendtFaktisk7,
      generert_til_sendt_rate: rate(sendtFaktiskTotal, hoyreTotal),
    },
    soknader: {
      sendt_total: forsokt, // forsokt levert (levert + feilet + sendt)
      levert_total: nLevertKlEllerStatus, // status levert ELLER levert_kl satt
      feilet_total: nFeilet,
      under_sending: nSendt, // status 'sendt' = in-flight, ikke bekreftet levert
      leverings_rate: rate(nLevertKlEllerStatus, forsokt),
    },
    inntekt_estimat: {
      er_estimat: true,
      aktive_abonnenter: aktiveAbonnenter, // kun betalte planer
      gratis_promo_antall: planTeller.plus_gratis, // plus_gratis: aktiv, 0 kr
      per_plan: perPlan,
      estimert_mrr_kr: Math.round(estimertMrr),
    },
    konvertering: {
      paywall_vist_total: paywallVist,
      kjop_fullfort_total: kjopFullfort,
      konverterings_rate: rate(kjopFullfort, paywallVist),
    },
    daglig_serie: [...serie.values()],
  };
}

// ── JWT -> user_id (service-klient verifiserer token) ────────────────────────
async function resolveUserIdReal(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;
  const { data, error } = await getServiceClient().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

// ── Handler (dependency-injisert, saa autorisasjonen kan testes offline) ─────
export interface Deps {
  resolveUserId: (req: Request) => Promise<string | null>;
  computeMetrics: () => Promise<unknown>;
}

export async function handleRequest(req: Request, deps: Deps): Promise<Response> {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }
  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse(req, { ok: false, error: "Method not allowed" }, 405);
  }

  // 1) Autentisert?
  const userId = await deps.resolveUserId(req);
  if (!userId) {
    return jsonResponse(req, { ok: false, error: "Ikke autentisert" }, 401);
  }
  // 2) Autorisert? Ikke-admin faar 403 UTEN at data hentes.
  if (!isAdmin(userId)) {
    return jsonResponse(req, { ok: false, error: "Ingen tilgang" }, 403);
  }
  // 3) Data.
  try {
    const metrikker = await deps.computeMetrics();
    return jsonResponse(req, { ok: true, ...(metrikker as object) }, 200);
  } catch (err) {
    console.error("[admin-metrics] feil:", err);
    return jsonResponse(req, { ok: false, error: "Intern feil" }, 500);
  }
}

// Wire opp ekte avhengigheter kun naar modulen kjores som funksjon (ikke i test).
if (import.meta.main) {
  Deno.serve((req) =>
    handleRequest(req, {
      resolveUserId: resolveUserIdReal,
      computeMetrics: () => computeMetricsWith(getServiceClient()),
    })
  );
}
