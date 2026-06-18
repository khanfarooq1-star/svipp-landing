# Svipp Design System

> **Status: Permanent.** Dette er Svipps offisielle visuelle språk. Nettsiden
> (svipp.app) og appen skal oppleves som **ett produkt**. Ikke introduser
> alternative paletter, alternative primærfarger eller flere tema-retninger.
> Endringer her er merkevarebeslutninger, ikke designforslag.

Se også:
- [`branding.md`](./branding.md) — merkevarefilosofi og tone
- [`adr/ADR-brand-system.md`](./adr/ADR-brand-system.md) — beslutningen og begrunnelsen

---

## 1. Semantisk fargemodell

Fargesystemet er **semantisk**. Hver farge har **én** betydning. Fargevalg er
aldri dekorativt — det kommuniserer hva som skjer i produktet.

| Farge | Betydning | Token-familie |
|-------|-----------|---------------|
| 🔴 **RØD** | Handling + merkevare | `--brand-*` |
| 🟢 **GRØNN** | Resultat (oppnådd / levert / bekreftet) | `--success-*` |
| ⚫ **GRAFITT** | Tillit + systemhandling | `--action-*`, `--band-bg` |
| ⚪ **GRÅ** | Sekundær informasjon | `--text-secondary`, `--border-*` |

---

## 2. Offisielle design tokens

Dette er den **autoritative kilden**. Nettsiden er en statisk fler-fil-side
(ingen build-step), så de samme tokenene er deklarert som CSS-variabler i
`:root` i hver HTML-fil. Hold dem identiske. Når du endrer en verdi, endre den
overalt — denne filen er fasiten.

### Brand — RØD = HANDLING + MERKEVARE
| Token | Lys | Mørk | Bruk |
|-------|-----|------|------|
| `--brand-primary` | `#FA2D48` | `#FA2D48` | logo, hero-highlights, eyebrows, badges, lenker, anbefalt-merker, premium |
| `--brand-primary-hover` | `#E11D38` | `#FF4D63` | hover på merkevareflater |
| `--brand-tint` | `#FFE9EC` | `rgba(250,45,72,.16)` | avledet lys tint (badge-, ikon- og tabell-bakgrunn) |
| `--brand-tint-border` | `rgba(250,45,72,.15)` | `rgba(250,45,72,.32)` | kanter på brand-flater |
| `--brand-glow` | `rgba(250,45,72,.09)` | `rgba(250,45,72,.20)` | radiale hero-/CTA-glød |

### Text
| Token | Lys | Mørk |
|-------|-----|------|
| `--text-primary` | `#1D1D1F` | `#F5F5F7` |
| `--text-secondary` | `#86868B` | `#98989D` |

### Surfaces
| Token | Lys | Mørk |
|-------|-----|------|
| `--bg-primary` | `#FFFFFF` | `#000000` |
| `--bg-secondary` | `#F5F5F7` | `#1C1C1E` |
| `--nav-bg` | `rgba(255,255,255,.94)` | `rgba(0,0,0,.72)` |

### Borders
| Token | Lys | Mørk |
|-------|-----|------|
| `--border-primary` | `#D2D2D7` | `#38383A` |
| `--border-subtle` | `#E5E5EA` | `#2C2C2E` |

### Success — GRØNN = RESULTAT (sjelden)
| Token | Lys | Mørk |
|-------|-----|------|
| `--success` | `#1D9E75` | `#2FD6A0` |
| `--success-bg` | `#E1F5EE` | `#0F2E26` |
| `--success-text` | `#0F6E56` | `#7EE8C6` |

### Warning
| Token | Lys | Mørk |
|-------|-----|------|
| `--warning` | `#FF9F0A` | `#FFB340` |

### Error badge
| Token | Lys | Mørk |
|-------|-----|------|
| `--error-bg` | `#FBEEE6` | `#3A241A` |
| `--error-text` | `#8A4B22` | `#E8A87C` |

### System action (CTA) — GRAFITT
| Token | Lys | Mørk | Bruk |
|-------|-----|------|------|
| `--action-bg` | `#1D1D1F` | `#F5F5F7` | bakgrunn på systemhandlings-knapper |
| `--action-bg-hover` | `#000000` | `#FFFFFF` | hover |
| `--action-text` | `#FFFFFF` | `#1D1D1F` | tekst på knapp |
| `--band-bg` | `#1D1D1F` | `#000000` | bevisst mørke markedsføringsbånd (CTA-band, footer) |

---

## 3. CTA-strategi (kritisk)

Nettsiden følger **samme prinsipp som appen**, inspirert av Apple HIG:

> **Rød brukes når merkevaren snakker. Grafitt brukes når systemet ber brukeren
> gjøre noe.**

Systemhandlinger bruker **grafitt** (`--action-*`), ikke merkevarerød:

- «Last ned appen» / «Last ned gratis»
- «Kom i gang» / «Start nå»
- «Opprett konto»
- «Se jobber»

**Begrunnelse:** skiller merkevare fra handling, gir mer visuell ro, og gjør
merkevarefargen mer verdifull fordi den brukes sjeldnere.

På bevisst mørke bånd (`--band-bg`) inverteres CTA-knappen til en lys flate slik
at den forblir synlig og nøytral — den blir ikke rød.

---

## 4. Den absolutte regelen for grønn

Grønn betyr at **noe faktisk er oppnådd**. Den er sjelden.

✅ Grønn **kan** brukes til: søknad sendt, levert, bekreftet, intervju, jobb
funnet, suksesshistorier, dokumentert resultat.

❌ Grønn skal **ikke** brukes til: CTA-knapper, hero, navigasjon, illustrasjoner,
dekorasjon, premium, onboarding, markedsføring.

> Hvis grønn brukes uten at noe er oppnådd, er implementasjonen feil.

**Eneste grønne element på landingssiden** er leveringsbekreftelsen
(`.feature.result` + `.delivered-badge` i `index.html`) — fordi
leveringsbekreftelsen er produktets viktigste tillitssignal og representerer et
faktisk resultat.

> **Merk — responstid-badge (`support.html`):** En responstid-garanti er et
> *trygghetssignal*, ikke et oppnådd resultat. Den bruker derfor **grafitt/grå**
> (tillit), ikke grønn. Den var tidligere grønn (`#16a34a`) og ble migrert.

---

## 5. Hero- og dark mode-prinsipper

**Hero** skal føles inspirert av Apple News+ (ikke kopiert): mye luft, store
typografiske overskrifter, sterk kontrast, rød merkevareidentitet,
minimalistiske flater. Unngå startup-gradienter, blå SaaS-estetikk, neon,
kryptostil, produktjakt-design og Material Design.

**Dark mode** følger Apple-prinsipper (`prefers-color-scheme: dark`):
- behold `#FA2D48` som merkevarefarge
- behold grønn semantikk
- ekte sort bakgrunn (`#000`) med løftede flater (`#1C1C1E`)
- skal minne om Apple News / Wallet / TV — ikke Material/Bootstrap/SaaS-dashboard

---

## 6. Token-struktur (oppsummert)

```
:root {
  /* Brand — RØD */
  --brand-primary  --brand-primary-hover  --brand-tint  --brand-tint-border  --brand-glow
  /* Text — GRÅ/grafitt */
  --text-primary   --text-secondary
  /* Surfaces */
  --bg-primary     --bg-secondary  --nav-bg
  /* Borders — GRÅ */
  --border-primary --border-subtle
  /* Success — GRØNN (sjelden) */
  --success        --success-bg    --success-text
  /* Warning / Error badge */
  --warning        --error-bg      --error-text
  /* System action / dark bands — GRAFITT */
  --action-bg      --action-bg-hover  --action-text  --band-bg
}
@media (prefers-color-scheme: dark) { :root { /* … remap … */ } }
```
