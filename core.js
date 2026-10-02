import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import * as fs from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import * as au from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { firebaseConfig } from "./config.js";
export const app = initializeApp(firebaseConfig), db = fs.getFirestore(app), auth = au.getAuth(app);
export { fs, au };
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
// XSS protection: ALWAYS wrap user/DB text in esc() before putting it in innerHTML.
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const DEFAULTS = { storeName: "Nextup", whatsapp: "", facebook: "", instagram: "", deliveryInside: 60, deliveryOutside: 120, currency: "৳", ejPublic: "", ejService: "", ejTemplate: "" };
export async function loadSettings() {
  try { const d = await fs.getDoc(fs.doc(db, "settings", "store")); return { ...DEFAULTS, ...(d.exists() ? d.data() : {}) }; } catch { return { ...DEFAULTS }; }
}
export const money = (n, S) => `${S.currency}${Number(n || 0).toLocaleString()}`;
export function toast(msg, bad) {
  let w = $("#toasts"); if (!w) { w = document.createElement("div"); w.id = "toasts"; document.body.append(w); }
  const t = document.createElement("div"); t.className = "toast" + (bad ? " bad" : ""); t.textContent = msg; w.append(t);
  setTimeout(() => t.remove(), 3200);
}
export const fmtDate = t => t?.toDate ? t.toDate().toLocaleString() : "";
export const imgs = p => String(p.images || "").split(",").map(s => s.trim()).filter(s => /^https:\/\//.test(s));
export const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="100%" height="100%" fill="#eef0f6"/><text x="50%" y="50%" fill="#9aa1b8" font-family="sans-serif" font-size="28" text-anchor="middle">No image</text></svg>');
export function reveal() {
  const io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting && (e.target.classList.add("in"), io.unobserve(e.target))), { threshold: .1 });
  $$(".rv:not(.in)").forEach(el => io.observe(el));
}
