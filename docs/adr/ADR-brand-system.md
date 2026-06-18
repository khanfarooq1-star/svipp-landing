# ADR: Svipp brand- og designsystem

- **Status:** Vedtatt (permanent)
- **Dato:** 2026-06-18
- **Gjelder:** Hele svipp.app-nettsiden, og delt visuelt språk med Svipp-appen
- **Erstatter:** Tidligere blå identitet (`#185FA5`)

Denne ADR-en er den **autoritative forklaringen** på merkevaren. Fremtidige
utviklere og AI-agenter skal lese den før de gjør visuelle endringer. Se også
[`../design-system.md`](../design-system.md) og [`../branding.md`](../branding.md).

---

## Kontekst

Svipp er en norsk jobbsøkerplattform der brukeren sveiper seg til jobb, AI
skriver søknaden, søknaden sendes, og **Svipp bekrefter levering**. Nettsiden og
appen skal oppleves som ett produkt.

Den tidligere nettsiden brukte en blå identitet (`#185FA5`) med fargebruk uten
semantisk system. Variabelnavngivningen var dessuten misvisende: CSS-variabelen
het `--coral`, men inneholdt en blåfarge. Det fantes ingen autoritativ
token-kilde og ingen dark mode.

---

## Beslutning

Vi innfører et **semantisk** fargesystem der hver farge har én betydning, med
`#FA2D48` (rød) som merkevarefarge.

```
RØD     = HANDLING + MERKEVARE
GRØNN   = RESULTAT
GRAFITT = TILLIT + SYSTEMHANDLING
GRÅ     = SEKUNDÆR INFORMASJON
```

Konkrete konsekvenser:
- All blå legacy-branding migreres til det nye systemet.
- Systemhandlinger (CTA-er som «Last ned», «Kom i gang») bruker **grafitt**, ikke
  rød.
- Grønn brukes **kun** når noe faktisk er oppnådd, og er sjelden.
- Det innføres dark mode etter Apple-prinsipper.
- Tokenene dokumenteres som én autoritativ kilde (`design-system.md`) og speiles
  i `:root` i hver HTML-fil.

---

## Begrunnelse

### Hvorfor blå identitet ble forlatt
Blått (særlig denne nyansen) er den generiske «SaaS/tech»-fargen og bygger ikke
det norske, handlingsdrevne forbrukerproduktet Svipp er. Den gamle bruken var
usemantisk og uten system, og variabelnavnet (`--coral` for en blåfarge) var
direkte villedende. Blått skiller ikke Svipp fra mengden og kommuniserer verken
fremdrift eller handling.

### Hvorfor rød representerer handling
Svipp handler om **fremdrift og handling** — sveipe, søke, sende. Rød er den
mest handlingsdrevne fargen i paletten og eier merkevaren. Den reserveres til
flater der «merkevaren snakker» (logo, hero, highlights, lenker, anbefalt,
premium), slik at den forblir verdifull.

### Hvorfor grønn representerer resultat
Grønn knyttes universelt til «fullført / bekreftet». I Svipp betyr grønn at noe
**faktisk er oppnådd**: levert, bekreftet, intervju, jobb funnet. Å reservere
grønn til ekte resultater gjør den til et troverdig signal.

### Hvorfor leveringsbekreftelse er kjernen i Svipp
Tradisjonell jobbsøking gir ingen visshet om at søknaden faktisk nådde frem.
Svipps **leveringsbekreftelse** — tidsstempel og bekreftet mottak — er produktets
viktigste tillitssignal og selve grunnen til at brukeren kan stole på at
handlingen førte til et resultat. Derfor er det det eneste stedet grønn brukes på
landingssiden.

### Hvorfor grønn er sjelden
Hvis grønn brukes til dekorasjon, CTA-er eller markedsføring, mister den
betydning. Sjeldenhet er det som gjør at grønn faktisk signaliserer «oppnådd».
Brukes grønn uten at noe er oppnådd, er implementasjonen feil.

### Hvorfor grafitt representerer tillit
Grafitt (`#1D1D1F`) er rolig, solid og nøytral — den bærer tillit og brukes til
systemhandlinger. Ved å la systemet «be brukeren gjøre noe» i grafitt (Apple
HIG-kompatibelt) skiller vi handling fra merkevare, gir mer visuell ro, og gjør
merkevarerødt mer verdifullt.

---

## Konsekvenser

**Positivt**
- Ett konsistent visuelt språk på tvers av nettside og app.
- Farge bærer mening; grensesnittet blir mer forståelig.
- Merkevarerødt får mer effekt fordi det brukes sparsomt.
- Dark mode med bevart merkevare og semantikk.
- Én autoritativ token-kilde gjør fremtidige endringer trygge.

**Kostnad / å være klar over**
- `og-image.png` genereres fra `scripts/generate-og.js` og må regenereres når
  brand-farger endres (krever `sharp`).
- Tokenene speiles i flere HTML-filer (statisk side uten build); de må holdes i
  synk med `design-system.md`.

---

## Ikke gjør (fastsatt)

- Ikke gjeninnfør blå aksentfarger.
- Ikke bruk grønn som CTA.
- Ikke lag alternative brand-farger eller flere tema-retninger.
- Ikke legg inn gradienter som endrer merkevareidentiteten.
- Ikke A/B-test brandfargen.
- Ikke behold gammel branding av hensyn til historikk.
