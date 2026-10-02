# Nextup – Free e-commerce store (Firebase + EmailJS)

Static site (HTML/CSS/vanilla JS). Storefront = `index.html`, admin = `admin.html`. No paid server needed.

## 1. Firebase setup (free Spark plan)
1. https://console.firebase.google.com → **Add project**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (production mode).
4. **Project settings → Your apps → Web (`</>`)** → copy the config into `js/config.js`.
5. **Authentication → Authorized domains**: add your hosting domain (e.g. `username.github.io`).

## 2. Create the admin account
1. **Authentication → Users → Add user** (your email + a strong password).
2. Copy that user's **UID**.
3. **Firestore → Start collection** `admins` → Document ID = **the UID** → add any field (e.g. `role: "admin"`).
4. Create document `settings/store` with fields: `storeName` (string), `deliveryInside` (number, e.g. 60), `deliveryOutside` (number, e.g. 120), `currency` (string, e.g. ৳). **Orders are rejected until this exists.**
5. Open `/admin.html`, sign in, then fill Settings.

## 3. Security rules
Firestore → **Rules** → paste the contents of `firestore.rules` → **Publish**.
What they enforce: the public can read active products and settings, and can only **create** orders whose price, delivery charge and total match trusted product/settings data. Only admins can read/update/delete orders or write products/settings. Visitors cannot read or change any order.

## 4. EmailJS
1. https://www.emailjs.com → add an Email Service (Gmail etc.) → note **Service ID**.
2. Create an Email Template. Set "To email" to your store email. Use these variables in the body:
   `{{order_id}} {{customer_name}} {{phone}} {{address}} {{product}} {{quantity}} {{price}} {{delivery_charge}} {{total}} {{order_time}} {{note}}` → note **Template ID**.
3. Account → **Public Key**.
4. Put the three values in `js/config.js` (`EMAILJS_PUBLIC_KEY`, `EMAILJS_SERVICE_ID`, `EMAILJS_TEMPLATE_ID`) **or** in Admin → Settings.
5. In EmailJS → Security, restrict allowed domains to your site and enable the free-plan rate limits.

## 5. Deploy
- **GitHub Pages:** push the folder to a repo → Settings → Pages → Deploy from branch → `main` / root.
- **Netlify:** drag-and-drop the folder at app.netlify.com/drop.
- **Cloudflare Pages:** Create project → connect repo (or upload) → build command empty, output directory `/`.
HTTPS is automatic on all three.

## 6. Adding products
Use Admin → Products. Images are **HTTPS URLs** (e.g. from Imgur/Cloudinary free tier) so no paid storage is needed. Separate several URLs with commas.

## 7. Safe vs secret
**Safe to be public:** Firebase web config, EmailJS public key/service ID/template ID, WhatsApp number, social links (Firebase security comes from the rules, not from hiding the config).
**NEVER expose:** your Firebase service-account JSON / Admin SDK keys, any admin password, EmailJS **private key** (not needed here), SMTP/email passwords. None of these appear in this project.

## Honest limitations
- GitHub Pages is static, so real protection lives in Firebase Auth + Firestore rules, not in the admin page itself. Never rely on hiding `admin.html`.
- EmailJS is called from the browser, so someone could spam it; keep domain restrictions on. The order itself is always validated by the Firestore rules.
- Order IDs are generated in the browser; the rules require the ID to match the document path.
- Each order is for a single product (as in your form spec).
- Not included in this lean first build: dashboard charts, product image upload, multi-product cart, order-ID tracking page for customers.
