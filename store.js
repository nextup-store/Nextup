import { db, fs, $, $$, esc, toast, loadSettings, money, imgs, PLACEHOLDER, reveal } from "./core.js";
import { EMAILJS_PUBLIC_KEY, EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID } from "./config.js";
let S, P = [], busy = false;
const app = $("#app");
const wa = (t = "") => `https://wa.me/${String(S.whatsapp).replace(/\D/g, "")}?text=${encodeURIComponent(t)}`;
const disc = p => p.oldPrice > p.price ? Math.round((1 - p.price / p.oldPrice) * 100) : 0;
const card = p => `<div class="card rv"><a href="#/product/${esc(p.id)}"><img loading="lazy" src="${esc(imgs(p)[0] || PLACEHOLDER)}" alt="${esc(p.name)}"></a>
${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}${disc(p) ? `<span class="badge d">-${disc(p)}%</span>` : ""}
<div class="b"><h3>${esc(p.name)}</h3><div class="pr">${money(p.price, S)}${p.oldPrice > p.price ? `<s>${money(p.oldPrice, S)}</s>` : ""}</div>
<div class="stock ${p.stock === "out" ? "out" : "in"}">${p.stock === "out" ? "Out of stock" : "In stock"}</div>
<div class="row" style="margin-top:10px"><a class="btn alt sm" href="#/product/${esc(p.id)}">View details</a>${p.stock === "out" ? "" : `<a class="btn sm" href="#/order/${esc(p.id)}">Order now</a>`}</div></div></div>`;
const sect = (t, l) => l.length ? `<section class="sec"><h2>${t}</h2><div class="grid">${l.map(card).join("")}</div></section>` : "";

async function init() {
  S = await loadSettings();
  document.title = `${S.storeName} – Shop smart, order easy`;
  $("#fname").textContent = `© ${new Date().getFullYear()} ${S.storeName}`;
  $("#social").innerHTML = [["Facebook", S.facebook], ["Instagram", S.instagram]].filter(x => /^https:\/\//.test(x[1])).map(x => `<a href="${esc(x[1])}" rel="noopener" target="_blank">${x[0]}</a>`).join("");
  try {
    const q = await fs.getDocs(fs.query(fs.collection(db, "products"), fs.where("active", "==", true)));
    P = q.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
  } catch (e) { toast("Could not load products. Check Firebase setup.", 1); }
  $("#burger").onclick = () => $("#menu").classList.toggle("open");
  addEventListener("hashchange", route); route();
}
function route() {
  $("#menu").classList.remove("open"); scrollTo(0, 0);
  const [, r = "", id] = location.hash.slice(1).split("/");
  const p = P.find(x => x.id === id);
  const v = { "": home, products, about, contact }[r];
  app.innerHTML = `<div class="page">${v ? v() : r === "product" ? detail(p) : r === "order" ? checkout(p) : r === "success" ? success(id) : home()}</div>`;
  if (r === "order" && p) wireOrder(p); if (r === "product" && p) wireDetail();
  reveal();
}
function home() {
  const cats = [...new Set(P.map(p => p.category).filter(Boolean))];
  return `<section class="hero"><div><h1>Everything you need. Delivered to your door.</h1><p>Quality products at honest prices. Pay in cash when your order arrives.</p>
<div class="row"><a class="btn" href="#/products">Shop products</a>${S.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${wa("Hi Nextup!")}">WhatsApp us</a>` : ""}</div></div><div class="box">Next<br>up</div></section>
${cats.length ? `<div class="chips">${cats.map(c => `<a class="chip" href="#/products/${encodeURIComponent(c)}">${esc(c)}</a>`).join("")}</div>` : ""}
${sect("Featured", P.filter(p => p.badge === "Hot").slice(0, 4))}${sect("Latest products", P.slice(0, 4))}${sect("On sale", P.filter(p => disc(p) || p.badge === "Sale").slice(0, 4))}
${P.length ? "" : `<p class="sec">No products yet. Add some from the admin panel.</p>`}
<section class="sec"><h2>Why choose ${esc(S.storeName)}</h2><div class="why rv"><div><b>Cash on Delivery</b>Pay only when you receive.</div><div><b>Fast delivery</b>Quick dispatch across the country.</div><div><b>Real support</b>Talk to us on WhatsApp anytime.</div></div></section>
${S.whatsapp ? `<section class="cta rv"><h2>Need help choosing?</h2><p>Message us and we will help you order.</p><a class="btn wa" target="_blank" rel="noopener" href="${wa("Hi Nextup!")}">Chat on WhatsApp</a></section>` : ""}`;
}
function products() {
  const cat = decodeURIComponent(location.hash.split("/")[2] || "");
  return `<section class="sec"><h2>${cat ? esc(cat) : "All products"}</h2><div class="grid">${P.filter(p => !cat || p.category === cat).map(card).join("") || "<p>No products found.</p>"}</div></section>`;
}
function detail(p) {
  if (!p) return `<p class="sec">Product not found. <a href="#/products"><u>Browse products</u></a></p>`;
  const im = imgs(p).length ? imgs(p) : [PLACEHOLDER];
  return `<section class="sec two"><div class="gal"><img class="main" id="main" src="${esc(im[0])}" alt="${esc(p.name)}"><div class="thumbs">${im.map(i => `<img src="${esc(i)}" alt="">`).join("")}</div></div>
<div><h1 style="font-size:2rem">${esc(p.name)}</h1><div class="pr" style="font-size:1.4rem">${money(p.price, S)}${p.oldPrice > p.price ? `<s>${money(p.oldPrice, S)}</s>` : ""}</div>
<div class="stock ${p.stock === "out" ? "out" : "in"}">${p.stock === "out" ? "Out of stock" : "In stock"}</div><p style="margin:14px 0;white-space:pre-line">${esc(p.description)}</p>
<ul style="padding-left:18px;margin-bottom:14px">${String(p.features || "").split("\n").filter(Boolean).map(f => `<li>${esc(f)}</li>`).join("")}</ul>
<p style="color:var(--mut)">Delivery: ${money(S.deliveryInside, S)} inside city, ${money(S.deliveryOutside, S)} outside. Cash on Delivery.</p>
<div class="row" style="margin-top:16px">${p.stock === "out" ? "" : `<a class="btn" href="#/order/${esc(p.id)}">Order now</a>`}${S.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${wa("I want to order: " + p.name)}">WhatsApp order</a>` : ""}</div></div></section>`;
}
function wireDetail() { $$(".thumbs img").forEach(i => i.onclick = () => $("#main").src = i.src); }
function checkout(p) {
  if (!p || p.stock === "out") return `<p class="sec">This product is unavailable. <a href="#/products"><u>Browse products</u></a></p>`;
  return `<section class="sec two"><form id="f" novalidate><h2>Your details</h2>
<label>Full name</label><input name="name" maxlength="80" autocomplete="name"><label>Phone (e.g. 01XXXXXXXXX)</label><input name="phone" inputmode="tel" maxlength="15" autocomplete="tel">
<label>District / City</label><input name="district" maxlength="60"><label>Full address</label><textarea name="address" rows="3" maxlength="300"></textarea>
<label>Delivery location</label><select name="location"><option value="inside">Inside city (${money(S.deliveryInside, S)})</option><option value="outside">Outside city (${money(S.deliveryOutside, S)})</option></select>
<label>Quantity</label><div class="qty"><button type="button" id="mi">−</button><input name="qty" id="qty" value="1" style="width:70px;text-align:center"><button type="button" id="pl">+</button></div>
<label>Order note (optional)</label><textarea name="note" rows="2" maxlength="300"></textarea><p class="err" id="err"></p>
<button class="btn" id="go" style="width:100%">Place order (Cash on Delivery)</button></form>
<aside><div class="sum"><h2>Order summary</h2><div><span>${esc(p.name)}</span><span id="s1"></span></div><div><span>Delivery</span><span id="s2"></span></div><div class="t"><span>Total</span><span id="s3"></span></div><p style="color:var(--mut);font-size:.85rem">Payment: Cash on Delivery</p></div></aside></section>`;
}
function wireOrder(p) {
  const f = $("#f"), q = () => Math.min(20, Math.max(1, parseInt(f.qty.value) || 1));
  const calc = () => { const qty = q(), d = f.location.value === "inside" ? +S.deliveryInside : +S.deliveryOutside; $("#s1").textContent = `${money(p.price, S)} × ${qty}`; $("#s2").textContent = money(d, S); $("#s3").textContent = money(p.price * qty + d, S); return { qty, d }; };
  f.oninput = calc; $("#mi").onclick = () => { f.qty.value = q() - 1 || 1; calc(); }; $("#pl").onclick = () => { f.qty.value = q() + 1; calc(); }; calc();
  f.onsubmit = async e => {
    e.preventDefault(); if (busy) return;
    const clean = s => s.trim().replace(/[<>]/g, "").replace(/\s+/g, " "), v = Object.fromEntries(new FormData(f)), er = $("#err");
    const phone = v.phone.replace(/[\s-]/g, "");
    if (clean(v.name).length < 2) return er.textContent = "Enter your full name.";
    if (!/^(\+?880|0)1[3-9]\d{8}$/.test(phone)) return er.textContent = "Enter a valid Bangladeshi mobile number.";
    if (clean(v.district).length < 2) return er.textContent = "Enter your district or city.";
    if (clean(v.address).length < 6) return er.textContent = "Enter your full address.";
    if (Date.now() - (+localStorage.lastOrder || 0) < 30000) return er.textContent = "Please wait 30 seconds before placing another order.";
    er.textContent = ""; busy = true; $("#go").disabled = true; $("#go").textContent = "Placing order…";
    const { qty, d } = calc(), id = "NX" + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    const o = { id, name: clean(v.name), phone, district: clean(v.district), address: clean(v.address), productId: p.id, productName: p.name, qty, price: p.price, delivery: d, total: p.price * qty + d, location: v.location, note: clean(v.note || ""), status: "Pending", payment: "Cash on Delivery", createdAt: fs.serverTimestamp() };
    try {
      await fs.setDoc(fs.doc(db, "orders", id), o); localStorage.lastOrder = Date.now();
      mail(o); location.hash = `#/success/${id}`;
    } catch (x) { toast("Order failed. Please check your details or try again.", 1); busy = false; $("#go").disabled = false; $("#go").textContent = "Place order (Cash on Delivery)"; }
    busy = false;
  };
}
async function mail(o) {
  const k = S.ejPublic || EMAILJS_PUBLIC_KEY, sv = S.ejService || EMAILJS_SERVICE_ID, t = S.ejTemplate || EMAILJS_TEMPLATE_ID;
  if (!window.emailjs || k.startsWith("YOUR_") || !k) return;
  try {
    await emailjs.send(sv, t, { order_id: o.id, customer_name: o.name, phone: o.phone, address: `${o.address}, ${o.district}`, product: o.productName, quantity: o.qty, price: o.price, delivery_charge: o.delivery, total: o.total, order_time: new Date().toLocaleString(), note: o.note || "-" }, { publicKey: k });
  } catch (e) { console.warn("EmailJS failed", e); }
}
function success(id) {
  setTimeout(() => { const b = $("#cp"); if (b) b.onclick = () => navigator.clipboard.writeText(id).then(() => toast("Order ID copied")); });
  return `<section class="ok"><div class="tick">✓</div><h1 style="font-size:2rem">Order placed!</h1><p style="color:var(--mut)">Thank you. We will call you soon to confirm.</p>
<div class="oid"><span>${esc(id)}</span><button class="btn alt sm" id="cp">Copy</button></div><div class="row" style="justify-content:center">${S.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${wa("My order ID: " + id)}">Contact on WhatsApp</a>` : ""}<a class="btn alt" href="#/products">Keep shopping</a></div></section>`;
}
const about = () => `<section class="sec" style="max-width:640px"><h2>About ${esc(S.storeName)}</h2><p>${esc(S.storeName)} is an online store built around simple ordering: pick a product, send your details, pay on delivery.</p></section>`;
const contact = () => `<section class="sec" style="max-width:640px"><h2>Contact</h2><div class="row">${S.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${wa("Hello!")}">WhatsApp</a>` : ""}${/^https:/.test(S.facebook) ? `<a class="btn alt" target="_blank" rel="noopener" href="${esc(S.facebook)}">Facebook</a>` : ""}${/^https:/.test(S.instagram) ? `<a class="btn alt" target="_blank" rel="noopener" href="${esc(S.instagram)}">Instagram</a>` : ""}</div></section>`;
init();
