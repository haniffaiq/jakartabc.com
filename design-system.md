# Jakarta BC — Design System

> Foreign Company Registration & Market Entry Consulting · Indonesia
> Versi 0.2 · 2026-05-18 · Status: deepened — di atas kompetitor pada minimalism, UX clarity, dan editorial confidence

---

## 1. Konteks & Pemosisian

### Apa yang kita jual
Layanan masuk pasar Indonesia untuk investor asing: PT PMA setup, KBLI classification, OSS, izin sektor, KITAS, accounting, tax, ongoing compliance.

### Siapa pesaingnya
| Pesaing | Posisi | Visual yang dipakai |
|---|---|---|
| InCorp / Cekindo | Corporate massal, 20rb klien | Navy + teal + orange CTA, sans-serif, stock photo globe |
| Emerhub | Hybrid agency + consulting | Navy + orange, photo profesional kantor, card grid |
| Hawksford | Boutique premium global | Lebih bersih, editorial |
| Permitindo, Lets Move, BusinessHubAsia | Mid-market | Template SaaS generik |

### Masalah visual pesaing
1. Palette kembar — navy + teal + orange di mana-mana. Sulit dibedakan.
2. Sans-serif penuh tanpa hierarki editorial → terasa transaksional, bukan strategis.
3. Stock photo "handshake/skyline/globe" → tidak otentik, tidak Indonesia.
4. Card grid 3-kolom seragam → digital brochure feel, bukan editorial confidence.

### Peluang Jakarta BC
**Boutique premium yang terasa Indonesia tanpa kitsch.** Quiet confidence, editorial bukan korporat, modern tanpa "AI-SaaS look".

### North star
Jika pengunjung membuka jakartabc.com di tab sebelah Cekindo/Emerhub, perbedaannya harus **terlihat dalam 2 detik** — beda palette, beda tipografi, beda ritme. Bukan "lebih bagus dari" — **kategori berbeda**.

---

## 2. Prinsip Brand

1. **Quiet confidence.** Jangan teriak. Otoritas datang dari ketenangan, restraint, dan kejelasan — bukan dari klaim "trusted", "leading", "intelligent".
2. **Editorial, bukan brochure.** Tata letak terasa seperti majalah bisnis berkualitas (Monocle, Financial Times Weekend), bukan landing page SaaS.
3. **Rooted in Jakarta.** Sentuhan lokal halus: warna tanah, fotografi nyata kota, referensi tropical modernism — tanpa batik ornamen klise.
4. **Clarity over cleverness.** Setiap halaman jawab: apa, untuk siapa, berapa lama, berapa biaya, apa langkah berikutnya.
5. **Anti-AI aesthetic.** Hindari sinyal generik AI/SaaS (lihat §11).

---

## 3. Tone of Voice

| Atribut | Lakukan | Hindari |
|---|---|---|
| Bahasa | Direct, faktual, angka konkret | "Empowering your journey", "seamlessly" |
| Klaim | Spesifik ("PT PMA 4–6 minggu") | "Fast", "world-class", "trusted by many" |
| Sapaan | "Anda" formal, profesional | "Kamu", emoji, slang |
| Bilingual | EN primer, ID sekunder (audience: investor asing) | Hanya EN tanpa konteks Indonesia |

Pattern headline: `[fakta konkret]. [implikasi].`
Contoh: "Modal minimum PT PMA turun ke IDR 2.5M (BKPM Reg 5/2025). Time to set up: 4–6 minggu."

---

## 4. Warna

### Filosofi
Keluar dari navy-herd. Palette berbasis **ink (warm black) + bone (off-white) + ochre (gold-earth)**. Terasa Indonesia heritage, premium, dan tidak overlap dengan pesaing manapun.

### Token

```
/* Core */
--ink-900:    #1A1815   /* warm near-black, headline, body utama */
--ink-700:    #3A352E   /* secondary text */
--ink-500:    #6B6358   /* tertiary, meta, captions */

/* Surfaces */
--bone-50:    #FAF7F2   /* page background, hangat tidak putih klinis */
--bone-100:   #F2EDE4   /* alternate section */
--bone-200:   #E5DDD0   /* divider, subtle card */

/* Accent (gunakan hemat — maks 1 elemen utama per viewport) */
--ochre-600:  #B8893A   /* CTA primer, link emphasis */
--ochre-700:  #95701E   /* CTA hover */
--ochre-100:  #F0E3C9   /* tag/badge background lembut */

/* Functional */
--success:    #4A6B3F   /* hijau zamrud teredam, bukan emerald terang */
--warning:    #B8732A   /* terakota, satu nada dengan ochre */
--danger:     #8B3A2E   /* merah-bata, premium bukan crayon */
--info:       #3A5567   /* slate biru gelap, jarang dipakai */

/* Border */
--rule-soft:  rgba(26,24,21,0.08)
--rule-firm:  rgba(26,24,21,0.16)
```

### Aturan pakai
- **80% bone & ink. 15% ochre tints. 5% accent.** Jangan lebih.
- Tidak ada **gradient** sebagai background hero atau button. Gradien = sinyal AI/SaaS.
- Tidak ada **dark mode toggle** di v1 (terlalu banyak SaaS pakai ini sebagai default — premium publication tidak).
- Body text `--ink-900` di `--bone-50`. Kontras ≥ AA WCAG.

---

## 5. Typography

### Pasangan
Editorial serif untuk display + grotesk netral untuk body. Pola Pentagram/Hawksford.

```
--font-display: "Fraunces", "GT Sectra", "Tiempos Headline", Georgia, serif;
--font-body:    "Inter", "Söhne", "Neue Haas Grotesk", system-ui, sans-serif;
--font-mono:    "JetBrains Mono", "IBM Plex Mono", ui-monospace, monospace;
```

Alternatif gratis (jika anggaran nol): Fraunces (display) + Inter (body), keduanya Google Fonts.

### Scale (1.25 modular)

| Token | Size | Line | Weight | Pakai |
|---|---|---|---|---|
| `display-xl` | 64/72 | 1.05 | 400 serif | Hero headline saja, 1 per page |
| `display-lg` | 48/56 | 1.1 | 400 serif | Section opener |
| `display-md` | 36/44 | 1.15 | 400 serif | H2 editorial |
| `heading-lg` | 28/36 | 1.2 | 500 sans | H3 standar |
| `heading-md` | 22/30 | 1.3 | 500 sans | H4, card title |
| `body-lg` | 18/30 | 1.65 | 400 sans | Lead paragraph |
| `body-md` | 16/26 | 1.6 | 400 sans | Body default |
| `body-sm` | 14/22 | 1.55 | 400 sans | Caption, meta |
| `mono-sm` | 13/20 | 1.5 | 400 mono | Kode, ID, nomor referensi |
| `eyebrow` | 12/16 | 1.3 | 500 sans, uppercase, tracking 0.08em | Section label di atas display |

### Aturan
- **Serif hanya untuk display tier** (`display-*`). Jangan untuk button atau body — terasa konyol.
- **Line length** body: 60–75 karakter. Jangan full-width 100ch.
- **Numeric**: tabular-nums untuk angka di tabel/pricing. `font-variant-numeric: tabular-nums`.
- Hindari **all-caps headline panjang**. Eyebrow kecil boleh.

---

## 6. Spacing & Grid

### Skala (4px base)
`2, 4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160`

### Grid
- 12 kolom, gutter 24px, max-width container `1200px`.
- Editorial sections: pakai 8-kolom container `880px` untuk body teks supaya tetap dapat optimal line length.
- Vertikal rhythm section: padding `96px` desktop, `64px` tablet, `48px` mobile.

### Whitespace
**Generous.** Section dipisah minimal 96px desktop. Tidak ada 2 CTA besar dalam jarak < 200px vertikal — biarkan halaman bernafas.

---

## 7. Komponen

### 7.1 Button

| Variant | Visual | Pakai |
|---|---|---|
| `primary` | Solid `--ochre-600`, text `--bone-50`, radius 4px, padding 14×24, weight 500 | 1 per viewport, action utama (Book consultation) |
| `secondary` | Border 1px `--ink-900`, text `--ink-900`, transparent bg | Action sekunder (Learn more) |
| `ghost` | No border, text `--ink-900` dengan underline animasi on hover | Tertiary, link-like |
| `link` | Inline text underline, `--ochre-700` | Inline body link |

Aturan:
- Radius **4px** semua (bukan 12px+ — pill/heavy rounded = SaaS look).
- Tidak ada shadow elevasi pada button. Solid surface saja.
- Hover: ochre-700, transition 150ms. Bukan scale/lift.
- Tidak ada icon dalam button kecuali arrow `→` (single char, bukan SVG ikon ramai).

### 7.2 Card

```
background: --bone-100
border: 1px solid --rule-soft
radius: 6px
padding: 32
no shadow (atau hanya hover: 0 2px 12px rgba(0,0,0,0.04))
```

Hindari card dengan shadow tebal, gradient border, atau emoji ikon besar di atas.

### 7.3 Form / Input

- Border bawah saja (`1px solid --ink-500`), tidak ada border kotak penuh.
- Focus: border bawah `--ochre-600` 2px, tidak ada glow/ring.
- Label di atas input, eyebrow style.
- Error inline, text `--danger`, tidak ada toast pop-up.

### 7.4 Navigation

- Sticky top, tinggi 72px desktop / 64px mobile.
- Background `--bone-50` dengan border bawah `--rule-soft` saat scroll (bukan blur glass).
- Logo kiri (wordmark serif), nav tengah, CTA kanan.
- Mobile: full-screen takeover menu, tipografi besar (display-md untuk item).

### 7.5 Hero section

Struktur:
```
[ Eyebrow kecil ]
[ Display headline serif, 1-2 baris, max 8 kata ]
[ Lead paragraph 1-2 kalimat ]
[ Primary CTA ]   [ Secondary link ]
```

Tidak ada:
- Background image full-bleed dengan overlay gelap
- Gradient mesh / blob abstract
- Carousel
- Video autoplay
- Counter "20,000+ clients" — gunakan di section terpisah, bukan hero

### 7.6 Pricing / Service tier

Editorial table, bukan card 3-kolom mengambang. Border tipis, tabular-nums untuk angka, baris alternating `--bone-50` / `--bone-100`.

### 7.7 Testimonial / Case

Format kutipan editorial: serif besar, atribusi kecil di bawah. Tidak ada bintang 5 / avatar bulat besar / quote-mark ikon raksasa.

---

## 8. Imagery & Photography

### Prinsip
Foto **otentik, bertekstur, editorial**. Bayangkan halaman feature Monocle atau FT Weekend tentang Jakarta business district.

### Lakukan
- Foto Jakarta nyata: SCBD, Sudirman, Sarinah, kafe meeting, dokumen notaris di meja
- Available light, grain halus boleh
- Subject orang sebenarnya (klien dengan izin) atau model lokal yang tidak terasa stock
- Crop berani (close-up tangan menandatangani, detail arsitektur), bukan establishing shot dari atas

### Hindari
- Stock "diverse handshake" / smiling team meeting
- Globe / world map / network nodes
- Skyline NYC/London (kita Indonesia, bukan generic global)
- Foto over-edited, super saturated, atau dengan filter biru korporat
- AI-generated portrait (terdeteksi & merusak trust)

### Treatment
- Subtle warm grade, sedikit toward bone palette
- Bisa duotone ink + ochre untuk thematic section (hemat — bukan di setiap foto)

---

## 9. Iconography

- **Line icons**, stroke 1.5px, ukuran 20/24px.
- Set tunggal & konsisten: **Lucide** atau **Phosphor (regular weight)**. Pilih satu.
- Tidak ada icon 3D, gradient, atau emoji sebagai dekorasi.
- Icon untuk **fungsi** (search, menu, close, arrow), bukan untuk **ornamen** ("rocket" di samping headline).

---

## 10. Motion

- Transition default: **150ms ease-out** untuk hover, **300ms ease-out** untuk reveal.
- Scroll reveal: fade + 8px translate. Tidak ada slide-from-100px, rotate, atau scale dramatis.
- Tidak ada **Lottie** animasi mascot.
- Tidak ada **parallax** dramatis.
- Cursor: default OS, tidak ada custom blob cursor.
- Page transition: hanya fade halus, tidak ada wipe/curtain.

Prinsip: motion membantu attention, tidak menarik perhatian ke dirinya sendiri.

---

## 11. Do / Don't — Anti-AI Aesthetic

### ❌ Hindari (sinyal "AI/SaaS generik")
- Gradient hero ungu→biru, mesh gradient
- Glassmorphism (frosted blur card)
- Abstract 3D blob / fluid shape sebagai dekorasi
- Floating screenshot dengan tilt 3D
- "Powered by AI" badge atau hero copy "Intelligent / Smart / AI-driven"
- Dark mode default + neon accent
- Bento grid asimetris yang sedang viral
- Stock illustration berstyle Notion/Linear
- Emoji di headline atau button
- Border radius super besar (>12px) di mana-mana
- Spinning logo carousel "trusted by" yang terlalu cepat
- AI-generated profile photo atau hero image

### ✅ Lakukan (premium quiet)
- Solid surface, palette restrained 3 warna inti
- Editorial serif headline + grotesk body
- Foto Jakarta otentik
- Whitespace generous, section breathable
- Number/data concrete dalam copy
- Eyebrow label kecil sebelum display
- Border tipis ganti shadow
- Garis horizontal sebagai divider editorial
- Underline link inline (klasik, jelas, percaya diri)

---

## 12. Aplikasi per Halaman (sketsa)

### Home
1. Hero editorial: eyebrow "Foreign Direct Investment · Indonesia" + serif headline + lead + 1 CTA primer
2. Service overview: 4 layanan utama dalam list editorial (bukan card 4-kolom)
3. Numbers section: 3 angka konkret (regulasi 2025, time-to-setup, klien sektor)
4. Selected case studies: 2-3 kutipan klien editorial
5. Insight/journal preview: 3 artikel terbaru
6. Footer: kontak Jakarta, alamat fisik (trust signal kuat)

### Service detail (mis. PT PMA Setup)
1. Hero: nama layanan + 1 paragraf definisi
2. Sticky sidebar TOC + body editorial 8-kolom
3. Section: Apa, Untuk siapa, Persyaratan, Timeline, Biaya estimasi, Langkah berikutnya
4. CTA inline: "Book a 30-min consultation"

### About
- Foto kantor & tim asli, bukan stock
- Founder note pendek dengan tanda tangan scan
- Lisensi & registrasi profesional ditampilkan jujur

### Insights / Journal
- Layout editorial mirip publikasi: serif headline, lead, byline, tanggal, est. read time
- Tag minimal: kategori + tanggal

### Contact
- Form minimal (nama, email, perusahaan, pesan), 4 field
- Alamat fisik dengan map embed minimalis (mono style)
- Direct WA / email link sebagai opsi

---

## 13. Aksesibilitas

- Kontras teks ≥ WCAG AA (body 4.5:1, large 3:1)
- Focus state visible: outline `--ochre-600` 2px offset 2px
- Semantic HTML (`<nav>`, `<main>`, `<article>`, heading order)
- Alt text foto deskriptif
- Form label terhubung dengan `for/id`
- Reduce-motion: respect `prefers-reduced-motion`, matikan reveal animation

---

## 14. Stack Implementasi (rekomendasi, opsional)

- **Framework**: Next.js (App Router) atau Astro (lebih ringan jika content-heavy)
- **Styling**: Tailwind CSS dengan token di atas dimap ke `theme.extend`
- **Font**: `next/font` self-host Fraunces + Inter
- **CMS**: Sanity / Payload untuk insight + case study (jika butuh)
- **Image**: `next/image` + AVIF, atau Astro `<Image>`
- **i18n**: EN primer, ID sekunder, route `/id/...`

---

## 15. Referensi Visual

Untuk inspirasi (bukan untuk dicopy):
- Hawksford (hawksford.com) — boutique premium
- Pentagram (pentagram.com) — typography discipline
- Monocle (monocle.com) — editorial restraint
- Stripe Press (press.stripe.com) — book-like web design
- Mercury (mercury.com) — minimal financial trust (tanpa terlalu SaaS)
- Werklig studio sites — editorial agency aesthetic

Hindari sebagai referensi:
- Linear, Notion, Vercel marketing — sudah jadi cliché AI-SaaS look
- Cekindo, Emerhub, InCorp — pola yang kita lawan

---

## 16. Open Questions (untuk iterasi)

- [ ] Konfirmasi nama brand: "Jakarta BC" expand jadi apa? (Business Consultants? Bureau of Commerce?)
- [ ] Logo: wordmark serif saja, atau ada monogram?
- [ ] Bahasa default: EN dulu, atau bilingual dari hari 1?
- [ ] Apakah ada anggaran untuk fotografi kustom Jakarta, atau v1 pakai pilihan stock editorial-grade (Stocksy/Cavan)?
- [ ] Scope v1: marketing site saja, atau ada client portal?

---

---

## 17. Diferensiator Matrix vs Kompetitor

Konkret. Bukan klaim — fitur/pengalaman yang **tidak ada** di pesaing.

| Area | Kompetitor pakai | Jakarta BC pakai | Mengapa menang |
|---|---|---|---|
| Palette | Navy + teal + orange | Ink + bone + ochre | Distinct 2 detik, terasa Indonesia heritage |
| Tipografi | Sans-serif penuh | Editorial serif display + grotesk body | Otoritas tanpa berteriak |
| Hero | Tagline + form besar + logo carousel | Eyebrow + display serif + 1 lead + 1 CTA | Tidak transaksional, premium |
| Pricing | "Contact us for quote" disembunyikan | Tabel transparan + estimator inline | Trust besar di FDI: investor benci surprise cost |
| Process info | Paragraf panjang & generik | Editorial timeline + dokumen checklist downloadable | Investor butuh kepastian step-by-step |
| Foto | Stock handshake/globe/skyline | Foto Jakarta nyata (SCBD, notaris, kantor) | Lokal, tidak interchangeable |
| Bilingual | Flag dropdown bendera | Toggle EN/ID minimal di header, URL `/id/...` | Tidak childish, SEO baik |
| Konsultasi | Form 12 field → call back besok | Cal-style scheduler dengan timezone investor | Friction rendah, modern |
| Compliance content | Salesy blog | Journal editorial dengan tanggal regulasi, byline | Authority signal kuat |
| Mobile | Hamburger + dropdown rame | Full-screen typographic menu | Memorable, premium |
| Footer | Wall of links + newsletter pop-up | Alamat Jakarta + lisensi + email langsung | Honest, tidak desperate |
| Trust badges | "Trusted by 20,000+" generic counter | Lisensi profesional asli + alamat fisik + nama partner | Verifiable trust |

---

## 18. Layout Wireframes (ASCII)

### 18.1 Home — Hero

```
┌───────────────────────────────────────────────────────────────────┐
│  jakartabc            Services  Insights  About    [Book a call ]│  ← 72px nav, --bone-50
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│                                                                   │  ← 128px breathing
│       FOREIGN DIRECT INVESTMENT  ·  INDONESIA                     │  ← eyebrow, ochre-700
│                                                                   │
│       Set up a PT PMA in Indonesia.                               │  ← display-xl, serif
│       Without the guesswork.                                      │
│                                                                   │
│       Foreign-owned company registration, sector licensing,       │  ← body-lg, max 60ch
│       and ongoing compliance — handled by a Jakarta team that     │
│       has done it 400+ times.                                     │
│                                                                   │
│       [ Book a 30-min call → ]    See how it works                │  ← primary + ghost link
│                                                                   │
│                                                                   │  ← 128px breathing
└───────────────────────────────────────────────────────────────────┘
```

Tidak ada: background image, gradient, counter raksasa, logo carousel di atas fold.

### 18.2 Home — Services list (editorial, bukan card grid)

```
┌───────────────────────────────────────────────────────────────────┐
│  WHAT WE DO                                                       │  ← eyebrow
│  ─────────                                                        │
│                                                                   │
│  01    PT PMA Setup                                       4–6 wks │  ← display-md serif, mono number
│        Foreign-owned LLC registration, end to end.               │
│                                                          Read  → │
│  ──────────────────────────────────────────────────────────────── │
│  02    Sector Licensing                                   2–8 wks │
│        OSS, KBLI, sector-specific permits.                        │
│                                                          Read  → │
│  ──────────────────────────────────────────────────────────────── │
│  03    Tax & Accounting                                   ongoing │
│        Monthly tax filing, payroll, annual reporting.             │
│                                                          Read  → │
│  ──────────────────────────────────────────────────────────────── │
│  04    Investor KITAS                                     3–4 wks │
│        Residency for foreign shareholders and directors.          │
│                                                          Read  → │
└───────────────────────────────────────────────────────────────────┘
```

Kunci: **list dengan rule line + nomor + timeline**, bukan card mengambang. Terasa table of contents majalah.

### 18.3 Service detail (PT PMA)

```
┌───────────────────────────────────────────────────────────────────┐
│           ┌─────────────┐  ┌──────────────────────────────────┐  │
│ Sticky →  │ On this page│  │  PT PMA SETUP                    │  │
│ TOC       │             │  │                                  │  │
│ 200px     │ Overview    │  │  Foreign-owned company           │  │  ← display-lg serif
│           │ Who it's for│  │  registration in Indonesia.      │  │
│           │ Requirements│  │                                  │  │
│           │ Timeline    │  │  Lead paragraph 2 kalimat        │  │  ← body-lg
│           │ Cost        │  │  konkret, no fluff.              │  │
│           │ FAQ         │  │                                  │  │
│           │             │  │  ─────────────────────────────── │  │
│           │ [ Book → ]  │  │                                  │  │
│           │             │  │  OVERVIEW                        │  │  ← eyebrow
│           └─────────────┘  │  Body editorial 8-col, max 720px│  │
│                            │  ...                             │  │
└───────────────────────────────────────────────────────────────────┘
```

### 18.4 Pricing — transparent table

```
┌───────────────────────────────────────────────────────────────────┐
│  WHAT YOU PAY                                                     │
│  ───────────                                                      │
│                                                                   │
│  Service                              Gov. fee      Our fee  Total│  ← header tabular
│  ──────────────────────────────────────────────────────────────── │
│  PT PMA incorporation                 IDR  2.5M    IDR 18M    20.5│
│  KBLI classification & OSS            IDR  0       IDR  4M     4.0│
│  NPWP corporate                       IDR  0       IDR  1.5M   1.5│
│  Bank account opening assistance      IDR  0       IDR  2M     2.0│
│  ──────────────────────────────────────────────────────────────── │
│  Starter package                                              28.0│  ← bold, ochre underline
│                                                                   │
│  Estimates as of May 2026. No hidden costs. Custom quotes for    │  ← body-sm, ink-500
│  regulated sectors.                                               │
│                                                                   │
│  [ Get a tailored quote → ]                                       │
└───────────────────────────────────────────────────────────────────┘
```

Transparansi harga = **diferensiator UX terbesar** vs kompetitor yang menyembunyikan harga di balik form.

### 18.5 Mobile nav (full-screen)

```
┌──────────────────────┐
│  jakartabc       [×] │
├──────────────────────┤
│                      │
│  Services            │  ← display-md serif, tap area 64px
│  ──────              │
│                      │
│  Insights            │
│  ──────              │
│                      │
│  About               │
│  ──────              │
│                      │
│  Contact             │
│  ──────              │
│                      │
│  ─────────────────── │
│  EN  ·  ID           │  ← language toggle, eyebrow
│                      │
│  [ Book a call → ]   │  ← primary CTA bawah
│                      │
└──────────────────────┘
```

---

## 19. UX Patterns Khas Jakarta BC

Pattern yang sengaja dibuat berbeda dari kompetitor.

### 19.1 Transparent pricing first
Halaman `/pricing` adalah **link level-1 di nav**. Tidak ada "request a quote" untuk paket standar. Custom quote hanya untuk regulated sector.

### 19.2 Editorial timeline (bukan flowchart)
Proses PT PMA ditampilkan sebagai **timeline editorial vertikal** dengan tanggal estimasi, dokumen dibutuhkan per step, dan siapa yang melakukan (klien vs Jakarta BC). Bukan diagram flowchart panah-panah.

```
Week 1   ●  Name reservation & deed preparation
            We handle. You provide: passport scan, address proof.
            ─────
Week 2   ●  Notarial deed (Akta) signing
            Joint. Remote via video notary OR in person.
            ─────
Week 3   ●  Kemenkumham approval
            We handle. ~5 working days.
            ─────
Week 4   ●  NPWP & OSS registration
            We handle. KBLI must be finalized.
            ─────
Week 5-6 ●  Business license per sector
            Varies. Some sectors 2-8 additional weeks.
```

### 19.3 Sticky doc-helper sidebar
Pada service detail panjang, sidebar kiri sticky berisi: TOC + downloadable checklist PDF + primary CTA. Membantu investor scanning ↔ reading.

### 19.4 Regulasi citation footer per artikel
Setiap insight/journal punya footer "Regulations cited" dengan link ke BKPM Reg, UU, dll. Authority signal yang **tidak ada satu kompetitor pun** menampilkan dengan jujur.

### 19.5 Timezone-aware booking
Booking konsultasi tampil dalam timezone visitor (auto-detect), bukan WIB hardcoded. Cal.com atau Savvycal embed, bukan form callback.

### 19.6 Bilingual toggle minimal
`EN · ID` di header kanan, tipografi eyebrow style. Tidak ada flag bendera (rentan ofensif & tidak akurat — bendera ≠ bahasa).

### 19.7 Founder/partner note dengan tanda tangan scan
Halaman About punya **handwritten signature scan** dari founder. Trust signal kuat & manusiawi — kompetitor korporat tidak punya.

### 19.8 No live chat widget di pojok kanan
Pop-up "Hi, can we help?" = SaaS signal & merusak ritme editorial. Ganti dengan **inline contact block** di akhir setiap halaman service.

### 19.9 No newsletter modal interrupt
Tidak ada modal "Subscribe to our newsletter" yang muncul setelah 10 detik. Kompetitor pakai ini & merusak trust. Newsletter sign-up halus di footer.

### 19.10 Slow content > fast content
Insight ditulis 1500+ kata, ada byline & est. read time. Bukan blog SEO listicle "10 Tips for Foreign Investors".

---

## 20. Component State Matrix

Tiap interactive component **harus** punya 7 state didefinisikan.

| State | Button primary | Input text | Card link | Nav link |
|---|---|---|---|---|
| **default** | ochre-600 bg, bone-50 text | bottom border ink-500 | bone-100 bg, no shadow | ink-900 text |
| **hover** | ochre-700 bg, transition 150ms | bottom border ink-900 | bone-200 bg, no shadow shift | ochre-700 + underline grow |
| **focus** | outline 2px ochre-600 offset 2px | bottom border ochre-600 2px | outline 2px ochre-600 offset 2px | outline 2px ochre-600 offset 2px |
| **active** | ochre-700 + 1px inset | bottom border ochre-700 | bone-200 + 1px inset | ochre-700 |
| **disabled** | bone-200 bg, ink-500 text, no pointer | bone-100 bg, ink-500 text | opacity 0.5 | opacity 0.4, no pointer |
| **loading** | spinner mono char `·` rotating, text tetap | shimmer subtle ink-500 strip | skeleton bone-100 → bone-200 pulse | n/a |
| **error** | n/a | bottom border danger 2px, helper text danger | n/a | n/a |

Aturan: **focus state visible selalu** (a11y wajib), tidak boleh `outline: none` tanpa pengganti.

---

## 21. Content Patterns (page templates)

Template untuk writer/AI agar konsistensi terjaga.

### 21.1 Service page template

```
[ EYEBROW: Kategori service ]

[ DISPLAY HEADLINE serif, max 8 kata ]

[ LEAD: 1-2 kalimat. Apa & untuk siapa. Konkret. ]

[ Block: Apa yang termasuk (bullet list editorial, bukan card) ]

[ Block: Untuk siapa (3 persona ringkas) ]

[ Block: Persyaratan dokumen (checklist downloadable) ]

[ Block: Timeline editorial vertikal §19.2 ]

[ Block: Biaya — link ke /pricing atau tabel inline §18.4 ]

[ Block: FAQ — 5-8 pertanyaan, jawaban pendek ]

[ Block: Inline contact — "Bicara dengan partner" + foto + email ]

[ Footer: Regulations cited dengan link ]
```

### 21.2 Insight/journal article template

```
[ Category tag · Date · Est read time ]

[ DISPLAY HEADLINE serif ]

[ Lead paragraph italic, body-lg ]

[ Byline: foto kecil + nama + role + LinkedIn link ]

[ Body editorial 720px max, drop cap optional di paragraf pertama ]

[ Pull quotes serif besar dipisah dari body ]

[ Section breaks: hairline rule + 96px space ]

[ Footer: Regulations cited + related articles + author bio expanded ]
```

### 21.3 About page template

```
[ Display headline: 1 kalimat misi konkret ]

[ Foto kantor Jakarta — wide, editorial crop ]

[ Founder note 200-400 kata + signature scan ]

[ Tim: foto + nama + role + 1 kalimat. Tidak ada bio bertele-tele. ]

[ Lisensi profesional & registrasi resmi — tampilkan jujur ]

[ Alamat fisik + map embed minimalis ]
```

---

## 22. Performance & Perception

Premium feel = fast feel. Performance budget bagian dari design system.

| Metric | Target | Catatan |
|---|---|---|
| LCP | < 1.5s | Hero serif headline harus instant (preload font) |
| INP | < 100ms | Tidak ada heavy JS di interaksi awal |
| CLS | < 0.05 | Reserve space untuk font + image |
| JS bundle (initial) | < 100kb gzipped | Astro lebih mudah hit ini daripada Next |
| Image | AVIF + WebP fallback, lazy below fold | Hero image max 200kb |
| Font | self-host subset, `font-display: swap` | Fraunces + Inter subset latin saja |
| Total page weight | < 800kb p75 | Audit di Lighthouse tiap deploy |

Perception detail:
- **Page transition** halus fade 200ms — tidak ada loading spinner page-level.
- **Image fade-in** 300ms saat lazy load, dengan blur placeholder (`next/image` blurDataURL).
- **Skeleton** untuk data fetch > 200ms, tipografi-shape bukan generic box.

---

## 23. Empty / Error / Loading States

Sering dilupakan, sering jadi sinyal "amatir" di kompetitor.

### Empty
- Insight kategori kosong: "No articles yet in this category." + link kategori populer. **Tidak ada illustration besar kosong-kosong**.

### 404
- Display serif: "This page isn't here."
- Body: "It may have been moved, or the link is incorrect."
- Link kembali ke Home + Services + Insights. **Tidak ada illustration 404 dengan astronot/dinosaurus**.

### 500 / failure
- "Something on our end isn't working. We've been notified."
- Email kontak langsung sebagai fallback.

### Loading (form submission)
- Button state: ochre-700 + mono char `·` rotating, text tetap "Sending…"
- Tidak ada modal loading overlay full-screen.

### Form success
- In-place message ganti form: "Thanks. We'll reply within 1 business day."
- Tidak ada confetti, tidak ada modal pop-up.

---

## 24. Dark Variant (selective)

Default light (bone-50). Dark variant **bukan toggle global** — dipakai selektif untuk momen editorial:

- **Founder note section** pada About — full-bleed dark `--ink-900` bg, `--bone-50` text, foto B&W.
- **Featured insight article hero** — opsional dark hero saat artikel "long-read flagship".
- **Footer** — boleh dark `--ink-900` sebagai grounding visual.

Token dark:
```
--dark-bg:     #1A1815   /* ink-900 */
--dark-surface:#252220
--dark-text:   #F2EDE4   /* bone-100 */
--dark-text-2: #B0A89B
--dark-accent: #D4A24C   /* ochre yang lebih cerah agar AA contrast */
```

Aturan: dark section harus **clearly bounded** (full-width band), tidak setengah-setengah. Transition antar light/dark = hairline rule, bukan gradient blend.

---

## 25. Trust Architecture

Bagaimana setiap page secara aktif membangun trust — bukan sekadar klaim.

| Layer | Bagaimana | Di mana |
|---|---|---|
| **Verifiable** | Nama partner real, alamat Jakarta real, lisensi nomor real | Footer, About, kontak |
| **Specific** | Angka konkret regulasi, durasi, harga | Service pages, pricing, hero |
| **Recent** | Tanggal regulasi terbaru dicitate, "updated May 2026" | Insights, FAQ |
| **Human** | Foto tim asli, signature founder, byline penulis | About, journal |
| **Honest** | Tampilkan apa yang **tidak** kita tangani | Service pages section "Outside our scope" |
| **Quiet** | Tidak ada badge "Best of 2025", tidak ada testimonial 5-bintang | Seluruh site |

---

## Changelog
- **0.2** (2026-05-18) — Tambah: diferensiator matrix konkret vs kompetitor, ASCII wireframes 5 layout kunci, 10 UX pattern khas, state matrix 7-state, content templates per page type, performance budget, edge states (empty/404/500/loading/success), dark variant selektif, trust architecture layers.
- **0.1** (2026-05-18) — Draft awal pasca riset 3 kompetitor utama + tren UI 2026.
