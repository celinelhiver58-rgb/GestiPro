import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard, Package, ShoppingCart, Users, Wallet, CreditCard,
  LogOut, Plus, Trash2, Menu, X, Leaf, AlertTriangle, Download,
  ReceiptText, TrendingUp, LockKeyhole
} from "lucide-react";
import { isSupabaseConfigured, supabase, money, today } from "./lib";

const empty = { products: [], customers: [], sales: [], expenses: [] };
const localKeys = ["products", "customers", "sales", "expenses"];

function readLocal() {
  try {
    return Object.fromEntries(localKeys.map(k => [k, JSON.parse(localStorage.getItem("gp_" + k) || "[]")]));
  } catch { return { ...empty }; }
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!isSupabaseConfigured);
  const [demo, setDemo] = useState(!isSupabaseConfigured);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [message, setMessage] = useState("");
  const [data, setData] = useState(readLocal);
  const [page, setPage] = useState("dashboard");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [form, setForm] = useState({});

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    supabase.auth.getSession().then(({ data: d }) => {
      setSession(d.session);
      setAuthReady(true);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (demo) {
      localKeys.forEach(k => localStorage.setItem("gp_" + k, JSON.stringify(data[k] || [])));
    }
  }, [data, demo]);

  useEffect(() => {
    if (session) loadCloudData();
  }, [session]);

  async function loadCloudData() {
    const tables = ["products", "customers", "sales", "expenses"];
    const result = {};
    for (const table of tables) {
      const { data: rows, error } = await supabase.from(table).select("*").order("created_at", { ascending: false });
      if (error) { setMessage("Erreur de chargement : " + error.message); return; }
      result[table] = rows || [];
    }
    setData(result);
  }

  async function authenticate(e) {
    e.preventDefault(); setMessage("");
    const action = authMode === "login"
      ? supabase.auth.signInWithPassword({ email, password })
      : supabase.auth.signUp({ email, password });
    const { error } = await action;
    setMessage(error ? error.message : authMode === "login"
      ? "Connexion réussie." : "Compte créé. Vérifie ton e-mail si une confirmation est demandée.");
  }

  async function logout() {
    if (demo) { setData({ ...empty }); localKeys.forEach(k => localStorage.removeItem("gp_" + k)); setMessage("La démonstration a été réinitialisée."); }
    else await supabase.auth.signOut();
  }

  const revenue = useMemo(() => data.sales.reduce((s, x) => s + Number(x.total || 0), 0), [data.sales]);
  const expensesTotal = useMemo(() => data.expenses.reduce((s, x) => s + Number(x.amount || 0), 0), [data.expenses]);
  const profit = revenue - expensesTotal;
  const lowStock = data.products.filter(p => Number(p.stock) <= Number(p.alert_at ?? 5));

  async function insert(table, row) {
    if (demo) {
      setData(old => ({ ...old, [table]: [{ id: crypto.randomUUID(), created_at: new Date().toISOString(), ...row }, ...old[table]] }));
    } else {
      const { error } = await supabase.from(table).insert({ ...row, user_id: session.user.id });
      if (error) { setMessage(error.message); return false; }
      await loadCloudData();
    }
    setForm({});
    return true;
  }

  async function remove(table, id) {
    if (!window.confirm("Supprimer cet élément ?")) return;
    if (demo) setData(old => ({ ...old, [table]: old[table].filter(x => x.id !== id) }));
    else {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) setMessage(error.message); else loadCloudData();
    }
  }

  async function addSale(product) {
    if (Number(product.stock) < 1) return setMessage("Stock insuffisant.");
    const ok = await insert("sales", {
      product_id: product.id, product_name: product.name, quantity: 1,
      unit_price: Number(product.price), total: Number(product.price), sold_on: today()
    });
    if (!ok) return;
    if (demo) setData(old => ({ ...old, products: old.products.map(p => p.id === product.id ? { ...p, stock: Number(p.stock) - 1 } : p) }));
    else {
      const { error } = await supabase.from("products").update({ stock: Number(product.stock) - 1 }).eq("id", product.id);
      if (error) setMessage("Vente enregistrée, mais mise à jour du stock impossible : " + error.message);
      await loadCloudData();
    }
  }

  async function saveProduct(e) {
    e.preventDefault();
    const row = { name: form.name, price: Number(form.price), stock: Number(form.stock), alert_at: Number(form.alert_at || 5) };
    if (!row.name || row.price <= 0 || row.stock < 0) return setMessage("Vérifie le nom, le prix et le stock.");
    await insert("products", row);
  }

  async function saveCustomer(e) {
    e.preventDefault();
    if (!form.name?.trim()) return setMessage("Saisis le nom du client.");
    await insert("customers", { name: form.name.trim(), phone: form.phone || "", notes: form.notes || "" });
  }

  async function saveExpense(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.label || amount <= 0) return setMessage("Saisis un libellé et un montant valide.");
    await insert("expenses", { label: form.label, amount, spent_on: today() });
  }

  async function saveDebt(e) {
    e.preventDefault();
    const amount = Number(form.amount);
    const customer = data.customers.find(c => c.id === form.customer_id);
    if (!customer || amount <= 0) return setMessage("Choisis un client et un montant valide.");
    await insert("expenses", { label: `Dette client — ${customer.name}`, amount: 0, spent_on: today(), note: `Dette à suivre : ${amount} FCFA` });
    setMessage("Note de dette ajoutée dans les dépenses. Le suivi détaillé des remboursements sera ajouté dans une prochaine version.");
  }

  function exportCsv() {
    const rows = [["Type", "Détail", "Montant"], ...data.sales.map(s => ["Vente", s.product_name, s.total]), ...data.expenses.map(x => ["Dépense", x.label, x.amount])];
    const csv = rows.map(r => r.map(v => `"${String(v ?? "").replaceAll('"', '""')}"`).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
    a.download = "gestipro-rapport.csv"; a.click(); URL.revokeObjectURL(a.href);
  }

  const nav = [
    ["dashboard", "Tableau de bord", LayoutDashboard],
    ["products", "Produits et stocks", Package],
    ["sales", "Ventes", ShoppingCart],
    ["customers", "Clients", Users],
    ["expenses", "Dépenses", Wallet],
    ["plans", "Abonnements", CreditCard]
  ];

  if (!authReady) return <div className="center-screen">Chargement de GestiPro…</div>;

  if (isSupabaseConfigured && !session && !demo) return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={authenticate}>
        <div className="brand-mark"><Leaf /></div>
        <h1>GestiPro</h1><p>La gestion simple de votre commerce.</p>
        <h2>{authMode === "login" ? "Connexion" : "Créer un compte"}</h2>
        <label>Adresse e-mail<input type="email" required value={email} onChange={e => setEmail(e.target.value)} /></label>
        <label>Mot de passe<input type="password" minLength="8" required value={password} onChange={e => setPassword(e.target.value)} /></label>
        <button className="primary full">{authMode === "login" ? "Se connecter" : "Créer mon compte"}</button>
        <button type="button" className="text-button" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>{authMode === "login" ? "Créer un compte" : "J'ai déjà un compte"}</button>
        {message && <p className="notice">{message}</p>}
      </form>
    </div>
  );

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <div className="brand"><span className="brand-mark"><Leaf /></span><span>GestiPro<small>Gestion commerciale</small></span><button className="close-menu" onClick={() => setMobileMenu(false)}><X /></button></div>
        <nav>{nav.map(([id, label, Icon]) => <button key={id} className={page === id ? "active" : ""} onClick={() => { setPage(id); setMobileMenu(false); }}><Icon size={19}/>{label}</button>)}</nav>
        <div className="sidebar-bottom"><span className="mode-label">{demo ? "Mode démonstration" : "Compte connecté"}</span><button onClick={logout}><LogOut size={18}/> {demo ? "Réinitialiser la démo" : "Déconnexion"}</button></div>
      </aside>
      {mobileMenu && <button className="scrim" aria-label="Fermer le menu" onClick={() => setMobileMenu(false)} />}
      <main className="main-area">
        <header className="topbar"><button className="menu-button" onClick={() => setMobileMenu(true)}><Menu /></button><div><strong>{nav.find(n => n[0] === page)?.[1]}</strong><small>Votre activité en un coup d'œil</small></div><span className="top-spacer"/><span className="avatar">GP</span></header>
        {demo && <div className="demo-banner"><LockKeyhole size={16}/> Mode démonstration : données enregistrées uniquement sur cet appareil. Configure Supabase pour un vrai compte en ligne.</div>}
        {message && <div className="notice global-notice" onClick={() => setMessage("")}>{message} <b>×</b></div>}

        {page === "dashboard" && <section className="content">
          <div className="page-heading"><div><p className="eyebrow">VUE GÉNÉRALE</p><h1>Bonjour 👋</h1><p>Voici le résumé de votre commerce.</p></div><button className="secondary" onClick={exportCsv}><Download size={17}/> Exporter</button></div>
          <div className="stats-grid">
            <Stat title="Chiffre d'affaires" value={money(revenue)} icon={TrendingUp}/>
            <Stat title="Dépenses" value={money(expensesTotal)} icon={Wallet}/>
            <Stat title="Solde estimé" value={money(profit)} icon={ReceiptText}/>
            <Stat title="Produits" value={data.products.length} icon={Package}/>
          </div>
          <div className="panel"><div className="panel-title"><h2>Alertes de stock</h2><span className="count">{lowStock.length}</span></div>
            {lowStock.length ? lowStock.map(p => <div className="list-row" key={p.id}><AlertTriangle className="warning-icon"/><span>{p.name}</span><strong>{p.stock} restant(s)</strong></div>) : <p className="empty">Aucune alerte. Les stocks sont au-dessus du seuil.</p>}
          </div>
          <div className="panel"><h2>Dernières ventes</h2>{data.sales.slice(0,5).length ? data.sales.slice(0,5).map(s => <div className="list-row" key={s.id}><span>{s.product_name}</span><strong>{money(s.total)}</strong></div>) : <p className="empty">Aucune vente enregistrée pour le moment.</p>}</div>
        </section>}

        {page === "products" && <section className="content">
          <PageTitle title="Produits et stocks" subtitle="Ajoutez vos articles et surveillez les quantités."/>
          <form className="form-panel" onSubmit={saveProduct}><h2>Nouveau produit</h2><div className="form-grid"><Field label="Nom du produit" value={form.name || ""} onChange={v => setForm({...form,name:v})} placeholder="Ex. Riz 25 kg"/><Field label="Prix de vente (FCFA)" type="number" value={form.price || ""} onChange={v => setForm({...form,price:v})}/><Field label="Quantité en stock" type="number" value={form.stock || ""} onChange={v => setForm({...form,stock:v})}/><Field label="Seuil d'alerte" type="number" value={form.alert_at ?? "5"} onChange={v => setForm({...form,alert_at:v})}/></div><button className="primary"><Plus size={17}/> Ajouter le produit</button></form>
          <div className="panel"><h2>Catalogue ({data.products.length})</h2>{data.products.length ? data.products.map(p => <div className="list-row" key={p.id}><div><strong>{p.name}</strong><small>{money(p.price)} · Stock : {p.stock}</small></div><div className="row-actions"><button className="small-primary" onClick={() => addSale(p)}>Vendre 1</button><button className="icon-button danger" onClick={() => remove("products",p.id)} aria-label="Supprimer"><Trash2 size={17}/></button></div></div>) : <p className="empty">Aucun produit. Ajoutez votre premier article ci-dessus.</p>}</div>
        </section>}

        {page === "sales" && <section className="content"><PageTitle title="Ventes" subtitle="Enregistrez une vente en un seul geste."/><div className="panel"><h2>Choisir un produit</h2>{data.products.length ? data.products.map(p => <div className="list-row" key={p.id}><div><strong>{p.name}</strong><small>{money(p.price)} · Stock : {p.stock}</small></div><button className="small-primary" disabled={Number(p.stock) < 1} onClick={() => addSale(p)}>Vendre</button></div>) : <p className="empty">Ajoutez d'abord des produits dans Produits et stocks.</p>}</div><div className="panel"><h2>Historique</h2>{data.sales.length ? data.sales.map(s => <div className="list-row" key={s.id}><span>{s.product_name}<small>{s.sold_on}</small></span><strong>{money(s.total)}</strong></div>) : <p className="empty">Aucune vente.</p>}</div></section>}

        {page === "customers" && <section className="content"><PageTitle title="Clients" subtitle="Conservez les coordonnées de vos clients."/><form className="form-panel" onSubmit={saveCustomer}><h2>Nouveau client</h2><div className="form-grid"><Field label="Nom du client" value={form.name || ""} onChange={v => setForm({...form,name:v})}/><Field label="Téléphone" value={form.phone || ""} onChange={v => setForm({...form,phone:v})} placeholder="+225…"/></div><button className="primary"><Plus size={17}/> Ajouter le client</button></form><div className="panel"><h2>Mes clients ({data.customers.length})</h2>{data.customers.length ? data.customers.map(c => <div className="list-row" key={c.id}><div><strong>{c.name}</strong><small>{c.phone || "Pas de téléphone"}</small></div><button className="icon-button danger" onClick={() => remove("customers",c.id)}><Trash2 size={17}/></button></div>) : <p className="empty">Aucun client enregistré.</p>}</div></section>}

        {page === "expenses" && <section className="content"><PageTitle title="Dépenses" subtitle="Suivez les sorties d'argent de votre commerce."/><form className="form-panel" onSubmit={saveExpense}><h2>Nouvelle dépense</h2><div className="form-grid"><Field label="Description" value={form.label || ""} onChange={v => setForm({...form,label:v})} placeholder="Ex. Transport"/><Field label="Montant (FCFA)" type="number" value={form.amount || ""} onChange={v => setForm({...form,amount:v})}/></div><button className="primary"><Plus size={17}/> Enregistrer</button></form><div className="panel"><h2>Historique des dépenses</h2>{data.expenses.length ? data.expenses.map(x => <div className="list-row" key={x.id}><span>{x.label}<small>{x.spent_on}</small></span><strong>{money(x.amount)}</strong></div>) : <p className="empty">Aucune dépense.</p>}</div></section>}

        {page === "plans" && <section className="content"><PageTitle title="Abonnements" subtitle="Choisissez la formule adaptée à votre activité."/><div className="plans-grid">{[["Starter","3 000","Fonctions essentielles"],["Business","7 500","Gestion avancée"],["Premium","15 000","Pour les commerces en croissance"]].map(([name,price,desc]) => <div className="plan-card" key={name}><span className="eyebrow">GESTIPRO</span><h2>{name}</h2><strong className="plan-price">{price} <small>FCFA/mois</small></strong><p>{desc}</p><ul><li>Gestion des produits</li><li>Suivi des ventes</li><li>Tableau de bord</li></ul><button className="secondary full" onClick={() => setMessage("Les paiements seront activés après configuration du prestataire Mobile Money.")}>Choisir cette formule</button></div>)}</div><p className="notice">Les tarifs sont affichés à titre de proposition. Aucun paiement réel n'est encore activé.</p></section>}
        <footer>© {new Date().getFullYear()} GestiPro · Votre commerce, mieux organisé.</footer>
      </main>
    </div>
  );
}

function Stat({ title, value, icon: Icon }) {
  return <div className="stat-card"><span className="stat-icon"><Icon size={20}/></span><p>{title}</p><strong>{value}</strong></div>;
}
function PageTitle({ title, subtitle }) { return <div className="page-heading"><div><p className="eyebrow">GESTION</p><h1>{title}</h1><p>{subtitle}</p></div></div>; }
function Field({ label, value, onChange, type="text", placeholder="" }) {
  return <label className="field">{label}<input type={type} min={type === "number" ? "0" : undefined} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)} required /></label>;
}
