// Genererer og-image.png (1200x630) for deling pa sosiale medier.
// Kjor: node scripts/generate-og.js   (krever sharp som dependency)
// Farge MA matche --brand-primary i index.html (#FA2D48).
// Se /docs/design-system.md for autoritativ token-kilde.
const sharp = require('sharp');
const path = require('path');

const W = 1200, H = 630;
const BRAND = '#FA2D48';       // brandPrimary — RØD = HANDLING + MERKEVARE
const BRAND_DARK = '#C11A33';  // mørkere brand for dybde
const TINT = '#FFE9EC';        // avledet lys brand-tint
const TINT_TEXT = '#A11328';   // mørk brand-tekst pa tint
const LIGHT = '#FCB4BF';       // lys brand for stottelinje
const WHITE = '#FFFFFF';

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BRAND}"/>

  <!-- logo: to skrastreker + ordmerke -->
  <g transform="translate(110,92)">
    <g transform="rotate(-20 26 13)">
      <rect x="0"  y="6" width="34" height="9" rx="4.5" fill="${WHITE}"/>
      <rect x="22" y="6" width="34" height="9" rx="4.5" fill="${WHITE}" fill-opacity="0.4"/>
    </g>
    <text x="74" y="30" font-family="Arial, sans-serif" font-size="40" font-weight="700" letter-spacing="-1.5" fill="${WHITE}">svipp</text>
  </g>

  <!-- tagline -->
  <text x="110" y="300" font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="-2" fill="${WHITE}">Søk jobb på</text>
  <text x="110" y="390" font-family="Arial, sans-serif" font-size="78" font-weight="700" letter-spacing="-2" fill="${WHITE}">30 sekunder</text>

  <!-- stottelinje -->
  <text x="113" y="448" font-family="Arial, sans-serif" font-size="30" font-weight="400" fill="${LIGHT}">Sveip. AI skriver søknaden. Sendt med bekreftelse.</text>

  <!-- app-kort-hint, stikker inn fra hoyre, lett rotert -->
  <g transform="translate(905,355) rotate(8)">
    <rect x="0" y="0" width="300" height="380" rx="22" fill="${WHITE}"/>
    <rect x="0" y="0" width="300" height="130" rx="22" fill="${BRAND_DARK}"/>
    <rect x="0" y="100" width="300" height="30" fill="${BRAND_DARK}"/>
    <rect x="26" y="104" width="46" height="46" rx="11" fill="${TINT}"/>
    <rect x="26" y="172" width="74" height="26" rx="13" fill="${TINT}"/>
    <text x="63" y="190" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${TINT_TEXT}" text-anchor="middle">Oslo</text>
    <rect x="110" y="172" width="86" height="26" rx="13" fill="${TINT}"/>
    <text x="153" y="190" font-family="Arial, sans-serif" font-size="14" font-weight="700" fill="${TINT_TEXT}" text-anchor="middle">Heltid</text>
    <rect x="26" y="222" width="230" height="13" rx="6" fill="#EAEAEA"/>
    <rect x="26" y="248" width="150" height="13" rx="6" fill="#EAEAEA"/>
  </g>
</svg>`;

sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile(path.join(__dirname, '..', 'images', 'og-image.png'))
  .then(() => console.log('Wrote images/og-image.png (1200x630)'))
  .catch(err => { console.error('OG-generering feilet:', err); process.exit(1); });
