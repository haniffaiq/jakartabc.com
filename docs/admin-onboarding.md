# Admin Onboarding — jakartabc.com CMS

This guide is for editors and partners who manage content via the Payload admin at `https://jakartabc.com/admin` or `https://staging.jakartabc.com/admin` during testing.

## 1. Logging in

Your admin account is provisioned by an existing admin. First-time login requires the email and temporary password sent to you. Change your password immediately under your user profile by opening the top-right avatar menu.

## 2. Roles

v1 has two roles:

- **Admin** — full CRUD access on all collections and user management.
- **Editor** — CRUD access on Insights, Services overview, Media, Authors, Categories, and Regulations.

Partner-level access for the sales workflow on `BookingLeads` is planned for Phase 3. Until then, do not create shared partner accounts.

## 3. Publishing an Insight (bilingual)

1. Open **Collections → Insights → Create New**.
2. Fill the EN fields first. EN is the source of truth for launch content.
   - **Slug** — URL-friendly, all-lowercase, dash-separated, for example `bkpm-reg-5-2025-what-changes`. Do not translate the slug; it stays English across locales.
   - **Title**, **Lead**, and **Body** — write factual, direct copy. Avoid generic claims such as “world-class” or “seamless”.
   - **Category** and **Author** — choose existing relationship records.
   - **Cover Image** — optional, but it must include alt text before publishing.
   - **Regulations Cited** — add the BKPM, UU, PP, or ministry references mentioned in the article. These render as a footer block on the public page.
   - **Published At** — set the date used for list ordering.
   - **Status** — leave as `draft` until editorial review is complete.
3. Switch locale to **ID** in the header dropdown and fill the Indonesian Title, Lead, and Body. Lexical body content translates independently per locale.
4. Save the draft.
5. Verify the public routes:
   - EN: `/insights/{slug}`
   - ID: `/id/insights/{slug}`
6. When ready, change **Status** to `published` and save. Revalidation runs automatically.

## 4. Drop cap, pull quote, and regulation cite blocks

In the Lexical body editor, click the **+** menu and choose the block type you need:

- **dropCap** — marks the next paragraph for editorial drop-cap treatment.
- **pullQuote** — highlights a short quote or key implication in the article rhythm.
- **regulationCite** — references a Regulation by code.

Use these sparingly. The site should feel editorial and confident, not decorated.

## 5. Editing Services

Services are the four core service detail pages. They include array fields such as `whoFor`, `requirements`, `timelineSteps`, and `faq`. Each array supports adding rows, removing rows, and reordering rows.

Field notes:

- `timelineSteps.who` is a select field. Choose `we` when Jakarta BC handles the step, `joint` when both sides coordinate, or `you` when the client provides the item. The public label localizes through the i18n JSON in code (`we_label`, `joint_label`, `you_label`).
- `pricing.govFee` and `pricing.ourFee` are integers in IDR. Do not enter decimals, currency symbols, or separators.
- Editing any Service triggers revalidation of `/services`, `/services/{slug}`, and `/pricing`.

Before publishing a Services change, verify both locale routes where relevant:

- EN: `/services` and `/services/{slug}`
- ID: `/id/services` and `/id/services/{slug}`

## 6. Adding a Regulation

Regulations have a globally unique **code**, for example `BKPM Reg 5/2025`. When citing a regulation in an Insight or Service, select it by code from the relationship dropdown.

Keep regulation names factual and consistent with the source document. If a regulation is uncertain or superseded, leave the content in draft and ask engineering or legal before publishing.

## 7. Image alt text is required

Every Media upload must have alt text. The form refuses to save without it. This is a hard accessibility requirement, not a soft suggestion.

Good alt text describes what the image shows:

- “Jakarta office towers behind a shaded pedestrian walkway.”
- “Consultant reviewing incorporation documents at a meeting table.”

Avoid keyword stuffing or abstract brand language:

- “Premium Indonesia market-entry success.”
- “World-class business consulting image.”

## 8. Translation workflow

The site is bilingual EN/ID from day one. The convention is:

1. Content team drafts EN as the source of truth.
2. Translator updates ID fields on the same content item.
3. Editor verifies both public routes before publishing.
4. Published items should not launch with missing ID content unless explicitly approved.

Admin lists may show a badge when the ID locale is missing for a published item. Treat that as a launch blocker for public editorial content.

## 9. What editors should not touch

Coordinate with engineering or the owning team before changing:

- `Settings → Site` globals, including brand and default locale.
- `Settings → Footer` legal or license entries. Legal owns final values.
- `Users` collection. User management is admin-only.
- Environment-dependent settings such as domains, email, Turnstile, or revalidation keys.

## 10. Getting help

- Engineering Slack: `#jakartabc-eng`
- Content questions: `#jakartabc-editorial`
- Production incidents: escalate to the engineering owner before editing published content as a workaround.
