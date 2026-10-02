import { db, auth, fs, au, $, $$, esc, toast, loadSettings, money, fmtDate, DEFAULTS } from "./core.js";
const root = $("#root"), STAT = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled"];
let S = DEFAULTS, products = [], orders = [], view = "dash", idle;

au.setPersistence(auth, au.browserSessionPersistence);
au.onAuthStateChanged(auth, async u => {
  if (!u) return loginUI();
  // Server-side check: only users with a doc in admins/{uid} are admins (rules enforce this for every read/write too).
  let ok = false; try { ok = (await fs.getDoc(fs.doc(db, "admins", u.uid))).exists(); } catch {}
  if (!ok) { await au.signOut(auth); loginUI("This account is not an admin."); return; }
  S = await loadSettings(); await load(); shell(); resetIdle();
});
["click", "keydown", "touchstart"].forEach(e => addEventListener(e, () => auth.currentUser && resetIdle()));
function resetIdle() { clearTimeout(idle); idle = setTimeout(() => au.signOut(auth), 30 * 60 * 1000); } // auto-logout after 30 min idle

function loginUI(msg = "") {
  root.innerHTML = `<form class="login" id="lf"><div class="logo" style="margin-bottom:16px">Next<b>up</b> Admin</div><label>Email</label><input type="email" name="e" required autocomplete="username"><label>Password</label><input type="password" name="p" required autocomplete="current-password"><p class="err" id="er">${esc(msg)}</p><button class="btn" style="width:100%">Sign in</button></form>`;
  $("#lf").onsubmit = async e => { e.preventDefault(); try { await au.signInWithEmailAndPassword(auth, e.target.e.value, e.target.p.value); } catch { $("#er").textContent = "Wrong email or password."; } };
}
async function load() {
  const [p, o] = await Promise.all([fs.getDocs(fs.collection(db, "products")), fs.getDocs(fs.collection(db, "orders"))]);
  products = p.docs.map(d => ({ id: d.id, ...d.data() })); orders = o.docs.map(d => ({ ...d.data(), _id: d.id }));
}
const NAV = [["dash", "Dashboard"], ["products", "Products"], ["orders", "Orders"], ["settings", "Settings"]];
function shell() {
  root.innerHTML = `<div class="adm"><aside class="side"><span class="logo">Next<b style="color:#7b93ff">up</b></span>${NAV.map(n => `<a data-v="${n[0]}">${n[1]}</a>`).join("")}<a id="out" style="margin-top:20px">Log out</a></aside>
<section class="main"><div class="bar"><h2 id="vt" style="margin:0"></h2><button class="btn alt sm" id="out2">Log out</button></div><div id="v"></div></section>
<nav class="bot">${NAV.map(n => `<a data-v="${n[0]}">${n[1]}</a>`).join("")}</nav></div>`;
  $$("[data-v]").forEach(a => a.onclick = () => go(a.dataset.v)); $("#out").onclick = $("#out2").onclick = () => au.signOut(auth); go(view);
}
function go(v) { view = v; $$("[data-v]").forEach(a => a.classList.toggle("on", a.dataset.v === v)); $("#vt").textContent = NAV.find(n => n[0] === v)[1]; ({ dash, products: prodV, orders: ordV, settings: setV })[v](); }
const ts = o => o.createdAt?.seconds || 0, pill = s => `<span class="pill ${esc(s)}">${esc(s)}</span>`;

function dash() {
  const c = s => orders.filter(o => o.status === s).length, sales = orders.filter(o => o.status !== "Cancelled").reduce((a, o) => a + o.total, 0);
  const st = [["📦", "Products", products.length], ["🧾", "Orders", orders.length], ["⏳", "Pending", c("Pending")], ["✅", "Confirmed", c("Confirmed")], ["❌", "Cancelled", c("Cancelled")], ["💰", "Total sales (excl. cancelled)", sales]];
  $("#v").innerHTML = `<div class="stats">${st.map(s => `<div class="stat"><span>${s[0]}</span><b data-n="${s[2]}">0</b><small>${s[1]}</small></div>`).join("")}</div>
<h3 style="margin-bottom:10px">Recent orders</h3>${ordTable([...orders].sort((a, b) => ts(b) - ts(a)).slice(0, 5))}
<h3 style="margin:20px 0 10px">Recent products</h3><div class="tw"><table>${[...products].sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)).slice(0, 5).map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price, S)}</td><td>${p.active ? "Active" : "Hidden"}</td></tr>`).join("") || "<tr><td>No products yet</td></tr>"}</table></div>`;
  $$("[data-n]").forEach((el, i) => { const t = +el.dataset.n, m = i === 5; let k = 0; const step = () => { k = Math.min(1, k + .04); el.textContent = (m ? S.currency : "") + Math.round(t * k).toLocaleString(); if (k < 1) requestAnimationFrame(step); }; step(); });
  bindRows();
}
function ordTable(l) {
  return `<div class="tw"><table><tr><th>Order</th><th>Customer</th><th>Phone</th><th>Product</th><th>Total</th><th>Date</th><th>Status</th></tr>${l.map(o => `<tr class="cl" data-o="${esc(o._id)}"><td>${esc(o.id)}</td><td>${esc(o.name)}</td><td>${esc(o.phone)}</td><td>${esc(o.productName)} ×${o.qty}</td><td>${money(o.total, S)}</td><td>${fmtDate(o.createdAt)}</td><td>${pill(o.status)}</td></tr>`).join("") || `<tr><td colspan=7>No orders found.</td></tr>`}</table></div>`;
}
function bindRows() { $$("[data-o]").forEach(r => r.onclick = () => orderModal(orders.find(o => o._id === r.dataset.o))); }
function ordV() {
  $("#v").innerHTML = `<div class="tools"><input id="q" placeholder="Search order ID, name or phone"><select id="st"><option value="">All statuses</option>${STAT.map(s => `<option>${s}</option>`).join("")}</select><input type="date" id="dt"><select id="so"><option value="n">Newest first</option><option value="o">Oldest first</option></select></div><div id="t"></div>`;
  const draw = () => {
    const q = $("#q").value.toLowerCase().trim(), st = $("#st").value, dt = $("#dt").value, dir = $("#so").value === "n" ? -1 : 1;
    const l = orders.filter(o => (!q || [o.id, o.name, o.phone].some(x => String(x).toLowerCase().includes(q))) && (!st || o.status === st) && (!dt || o.createdAt?.toDate().toLocaleDateString("en-CA") === dt)).sort((a, b) => dir * (ts(a) - ts(b)));
    $("#t").innerHTML = ordTable(l); bindRows();
  };
  $$("#q,#st,#dt,#so").forEach(e => e.oninput = draw); draw();
}
function modal(html) { const m = document.createElement("div"); m.className = "modal"; m.innerHTML = `<div>${html}</div>`; m.onclick = e => { if (e.target === m) m.remove(); }; document.body.append(m); return m; }
function orderModal(o) {
  const i = STAT.indexOf(o.status), row = (a, b) => `<tr><td style="color:var(--mut)">${a}</td><td style="white-space:normal">${esc(b)}</td></tr>`;
  const m = modal(`<div class="bar"><h3>Order ${esc(o.id)}</h3>${pill(o.status)}</div>
<div class="tl">${STAT.filter(s => s !== "Cancelled").map((s, k) => `<div class="${o.status !== "Cancelled" && k <= i ? "d" : ""}"><i style="animation-delay:${k * .1}s"></i>${s}</div>`).join("")}</div>
<table>${row("Customer", o.name)}${row("Phone", o.phone)}${row("Address", o.address + ", " + o.district)}${row("Product", o.productName + " × " + o.qty)}${row("Unit price", money(o.price, S))}${row("Delivery", money(o.delivery, S) + " (" + o.location + ")")}${row("Total", money(o.total, S))}${row("Payment", o.payment)}${row("Placed", fmtDate(o.createdAt))}${row("Note", o.note || "-")}</table>
<div class="row noprint" style="margin-top:14px"><select id="ns" style="width:auto">${STAT.map(s => `<option ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}</select><button class="btn" id="sv">Update status</button><button class="btn alt" id="pr">Print</button><button class="btn alt" id="cl">Close</button></div>`);
  $("#cl", m).onclick = () => m.remove(); $("#pr", m).onclick = () => print();
  $("#sv", m).onclick = async () => { try { await fs.updateDoc(fs.doc(db, "orders", o._id), { status: $("#ns", m).value }); o.status = $("#ns", m).value; toast("Status updated"); m.remove(); go(view); } catch { toast("Update failed", 1); } };
}
function prodV() {
  $("#v").innerHTML = `<div class="tools"><input id="q" placeholder="Search products"><button class="btn" id="add">Add product</button></div><div id="t"></div>`;
  const draw = () => { const q = $("#q").value.toLowerCase(); $("#t").innerHTML = `<div class="tw"><table><tr><th>Name</th><th>Price</th><th>Category</th><th>Stock</th><th>Status</th><th></th></tr>${products.filter(p => p.name.toLowerCase().includes(q)).map(p => `<tr><td>${esc(p.name)}</td><td>${money(p.price, S)}</td><td>${esc(p.category)}</td><td>${p.stock === "out" ? "Out" : "In"}</td><td>${p.active ? "Active" : "Hidden"}</td><td class="row"><button class="btn alt sm" data-e="${esc(p.id)}">Edit</button><button class="btn alt sm" data-t="${esc(p.id)}">${p.active ? "Disable" : "Enable"}</button><button class="btn bad sm" data-d="${esc(p.id)}">Delete</button></td></tr>`).join("") || "<tr><td>No products yet. Click Add product.</td></tr>"}</table></div>`;
    $$("[data-e]").forEach(b => b.onclick = () => prodForm(products.find(p => p.id === b.dataset.e)));
    $$("[data-t]").forEach(b => b.onclick = async () => { const p = products.find(x => x.id === b.dataset.t); await fs.updateDoc(fs.doc(db, "products", p.id), { active: !p.active }); p.active = !p.active; draw(); });
    $$("[data-d]").forEach(b => b.onclick = async () => { if (!confirm("Delete this product?")) return; await fs.deleteDoc(fs.doc(db, "products", b.dataset.d)); products = products.filter(p => p.id !== b.dataset.d); toast("Deleted"); draw(); });
  };
  $("#q").oninput = draw; $("#add").onclick = () => prodForm(); draw();
}
function prodForm(p = {}) {
  const f = (n, l, t = "text") => `<label>${l}</label><input name="${n}" type="${t}" value="${esc(p[n] ?? "")}" ${t === "number" ? 'min="0" step="any"' : ""}>`;
  const m = modal(`<h3>${p.id ? "Edit" : "Add"} product</h3><form id="pf">${f("name", "Name")}${f("price", "Price", "number")}${f("oldPrice", "Old price (optional)", "number")}${f("category", "Category")}
<label>Description</label><textarea name="description" rows="3">${esc(p.description)}</textarea><label>Features (one per line)</label><textarea name="features" rows="3">${esc(p.features)}</textarea>
<label>Image URLs (https, separated by commas)</label><textarea name="images" rows="2">${esc(p.images)}</textarea>
<label>Badge</label><select name="badge">${["", "New", "Sale", "Hot"].map(b => `<option ${b === (p.badge || "") ? "selected" : ""} value="${b}">${b || "None"}</option>`).join("")}</select>
<label>Stock</label><select name="stock"><option value="in">In stock</option><option value="out" ${p.stock === "out" ? "selected" : ""}>Out of stock</option></select>
<label><input type="checkbox" name="active" style="width:auto" ${p.active !== false ? "checked" : ""}> Visible in store</label><div class="row" style="margin-top:14px"><button class="btn">Save</button><button type="button" class="btn alt" id="cl">Cancel</button></div></form>`);
  $("#cl", m).onclick = () => m.remove();
  $("#pf", m).onsubmit = async e => {
    e.preventDefault(); const v = Object.fromEntries(new FormData(e.target));
    const d = { name: v.name.trim(), price: +v.price, oldPrice: +v.oldPrice || 0, category: v.category.trim(), description: v.description.trim(), features: v.features.trim(), images: v.images.trim(), badge: v.badge, stock: v.stock, active: !!v.active };
    if (!d.name || !(d.price >= 0) || v.price === "") return toast("Name and price are required", 1);
    try { if (p.id) { await fs.updateDoc(fs.doc(db, "products", p.id), d); Object.assign(p, d); } else { d.createdAt = fs.serverTimestamp(); const r = await fs.addDoc(fs.collection(db, "products"), d); products.unshift({ id: r.id, ...d }); } toast("Saved"); m.remove(); go(view); } catch { toast("Save failed", 1); }
  };
}
function setV() {
  const f = (n, l, t = "text") => `<label>${l}</label><input name="${n}" type="${t}" value="${esc(S[n])}">`;
  $("#v").innerHTML = `<form class="tw" style="padding:20px;max-width:560px" id="sf">${f("storeName", "Store name")}${f("whatsapp", "WhatsApp number (with country code)")}${f("facebook", "Facebook link")}${f("instagram", "Instagram link")}${f("deliveryInside", "Delivery charge – inside city", "number")}${f("deliveryOutside", "Delivery charge – outside city", "number")}${f("currency", "Currency symbol")}
<h3 style="margin-top:18px">EmailJS (public values only)</h3>${f("ejPublic", "Public key")}${f("ejService", "Service ID")}${f("ejTemplate", "Template ID")}<button class="btn" style="margin-top:16px">Save settings</button></form>`;
  $("#sf").onsubmit = async e => { e.preventDefault(); const v = Object.fromEntries(new FormData(e.target)); v.deliveryInside = +v.deliveryInside || 0; v.deliveryOutside = +v.deliveryOutside || 0; try { await fs.setDoc(fs.doc(db, "settings", "store"), v); S = { ...S, ...v }; toast("Settings saved"); } catch { toast("Save failed", 1); } };
}
