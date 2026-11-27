/* NutriBalance - app logic (vanilla JS, no dependencies, data stored in localStorage) */
(function () {
  'use strict';
  var N = window.NB_NUTRITION, DB = window.NB_FOODS.foods;
  var MEALS = N.MEALS, LABEL = N.MEAL_LABEL, KEYS = N.KEYS, f = N.fmt;
  var DEFAULTS = { calories: 2000, protein: 90, carbs: 250, fat: 65 };
  var VIEWS = [
    ['dashboard', 'Dashboard', '📊'], ['foods', 'Food Database', '🥗'], ['log', 'Meal Log', '📝'],
    ['recipes', 'Recipes', '🍳'], ['settings', 'Settings', '⚙️']
  ];

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function dstr(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function parseD(s) { var p = s.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function today() { return dstr(new Date()); }
  function shift(s, n) { var d = parseD(s); d.setDate(d.getDate() + n); return dstr(d); }
  function dateLabel(s) {
    if (s === today()) return 'Today';
    if (s === shift(today(), -1)) return 'Yesterday';
    if (s === shift(today(), 1)) return 'Tomorrow';
    return '';
  }
  function defaultMeal() {
    var h = new Date().getHours();
    return h < 11 ? 'breakfast' : h < 16 ? 'lunch' : h < 19 ? 'snacks' : 'dinner';
  }

  /* ---------- storage (graceful failure) ---------- */
  var mem = {}, storageOk = true;
  function load(key, def) {
    var raw = null;
    try { raw = localStorage.getItem(key); } catch (e) { storageOk = false; return mem[key] !== undefined ? mem[key] : def; }
    if (raw == null) return def;
    try { return JSON.parse(raw); } catch (e) { return def; }
  }
  function save(key, val) {
    mem[key] = val;
    try { localStorage.setItem(key, JSON.stringify(val)); }
    catch (e) { storageOk = false; renderBanner(); }
  }

  /* ---------- state ---------- */
  var S = {
    view: 'dashboard', date: today(), modal: null, draft: null, adding: false,
    fq: '', fcat: 'All',
    settings: sanitizeSettings(load('nb_settings', DEFAULTS)),
    log: load('nb_log', {}), custom: load('nb_custom', []), recipes: load('nb_recipes', [])
  };
  if (!S.log || typeof S.log !== 'object' || Array.isArray(S.log)) S.log = {};
  if (!Array.isArray(S.custom)) S.custom = [];
  if (!Array.isArray(S.recipes)) S.recipes = [];

  function sanitizeSettings(s) {
    var o = {};
    Object.keys(DEFAULTS).forEach(function (k) {
      var v = Number(s && s[k]);
      o[k] = isFinite(v) && v > 0 ? v : DEFAULTS[k];
    });
    return o;
  }

  /* ---------- foods ---------- */
  function recipeFood(r) {
    var rp = N.recipePer100(r.ingredients, r.finalWeight);
    return {
      id: 'r_' + r.id, name: r.name, category: 'My Recipes', form: 'recipe', per100: rp.per100,
      servingQty: rp.totalWeight / r.servings, servingLabel: '1 serving', unit: 'g',
      confidence: 'recipe', source: 'Calculated from your ingredients (approximate)', recipeId: r.id
    };
  }
  function allFoods() {
    var list = DB.slice();
    S.custom.forEach(function (c) {
      list.push({ id: c.id, name: c.name, category: c.category || 'My Foods', form: c.form || 'custom', per100: c.per100,
        servingQty: c.servingQty, servingLabel: c.servingLabel, unit: c.unit || 'g', confidence: 'user', source: 'Entered by you', custom: true });
    });
    S.recipes.forEach(function (r) {
      if (r.ingredients && r.ingredients.length && N.recipePer100(r.ingredients, r.finalWeight).totalWeight > 0) list.push(recipeFood(r));
    });
    return list;
  }
  function findFood(id) { var l = allFoods(); for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function categories() {
    var c = {}; allFoods().forEach(function (x) { c[x.category] = 1; });
    return Object.keys(c);
  }
  function searchFoods(q, cat) {
    var toks = q.toLowerCase().split(/\s+/).filter(Boolean), out = [];
    allFoods().forEach(function (fd) {
      if (cat && cat !== 'All' && fd.category !== cat) return;
      var hay = (fd.name + ' ' + fd.category + ' ' + fd.form).toLowerCase();
      for (var i = 0; i < toks.length; i++) if (hay.indexOf(toks[i]) < 0) return;
      out.push([toks.length && fd.name.toLowerCase().indexOf(toks[0]) === 0 ? 0 : 1, fd]);
    });
    out.sort(function (a, b) { return a[0] - b[0]; });
    return out.map(function (x) { return x[1]; });
  }
  function confPill(fd) {
    var m = { ref: ['Reference', ''], est: ['Estimate', 'est'], user: ['Custom', 'user'], recipe: ['Recipe', 'recipe'] }[fd.confidence] || ['', ''];
    return '<span class="pill ' + m[1] + '">' + m[0] + '</span>';
  }

  /* ---------- log ---------- */
  function getDay(date) {
    var d = S.log[date] || {};
    var o = {}; MEALS.forEach(function (m) { o[m] = Array.isArray(d[m]) ? d[m] : []; });
    return o;
  }
  function ensureDay(date) {
    if (!S.log[date]) S.log[date] = {};
    MEALS.forEach(function (m) { if (!Array.isArray(S.log[date][m])) S.log[date][m] = []; });
    return S.log[date];
  }
  function addEntry(meal, fd, qty) {
    var day = ensureDay(S.date);
    day[meal].push({
      id: uid(), foodId: fd.id, name: fd.name, qty: qty, unit: fd.unit, per100: JSON.parse(JSON.stringify(fd.per100)),
      servingQty: fd.servingQty, servingLabel: fd.servingLabel, confidence: fd.confidence
    });
    save('nb_log', S.log);
  }
  function findEntry(meal, id) {
    var arr = ensureDay(S.date)[meal];
    for (var i = 0; i < arr.length; i++) if (arr[i].id === id) return [arr, i];
    return null;
  }

  /* ---------- UI helpers ---------- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); t.textContent = msg; t.className = 'show';
    clearTimeout(toastT); toastT = setTimeout(function () { t.className = ''; }, 2400);
  }
  function bar(r, warn) {
    return '<div class="bar' + (r.over ? ' over' : warn ? ' warn' : '') + '"><i style="width:' + Math.min(100, r.pct) + '%"></i></div>';
  }
  function nutLine(n) {
    return '<b>' + f(n.calories, 0) + '</b> kcal · P <b>' + f(n.protein, 1) + '</b> g · C <b>' + f(n.carbs, 1) + '</b> g · F <b>' + f(n.fat, 1) +
      '</b> g · Fiber <b>' + f(n.fiber, 1) + '</b> g · Sugar <b>' + f(n.sugar, 1) + '</b> g';
  }

  /* ---------- rendering ---------- */
  function render() {
    renderNav(); renderBanner(); renderTopbar();
    $('#view').innerHTML = VIEW[S.view]();
    renderModal();
  }
  function renderBanner() {
    $('#banner').innerHTML = storageOk ? '' : '<div class="warnbar">Browser storage is unavailable, so your data will not persist after you close this tab.</div>';
  }
  function renderNav() {
    $('#nav').innerHTML = '<div class="brand">NutriBalance<small>Personal nutrition dashboard</small></div>' +
      VIEWS.map(function (v) {
        return '<button class="nav-btn' + (S.view === v[0] ? ' active' : '') + '" data-action="nav" data-view="' + v[0] + '"><span class="ic">' + v[2] + '</span><span>' + v[1] + '</span></button>';
      }).join('');
  }
  function renderTopbar() {
    var title = VIEWS.filter(function (v) { return v[0] === S.view; })[0][1];
    var dated = S.view === 'dashboard' || S.view === 'log';
    var h = '<h1>' + title + '</h1><div class="top-actions">';
    if (dated) {
      h += '<div class="datebar"><button class="icon-btn" data-action="date-prev" aria-label="Previous day">◀</button>' +
        '<input type="date" id="dateInput" value="' + S.date + '" data-change="date" aria-label="Date">' +
        '<span class="dlabel">' + dateLabel(S.date) + '</span>' +
        '<button class="icon-btn" data-action="date-next" aria-label="Next day">▶</button></div>' +
        '<button class="btn ghost" data-action="date-today">Today</button>' +
        '<button class="btn" data-action="add-open" data-meal="' + defaultMeal() + '">+ Add food</button>';
    }
    $('#topbar').innerHTML = h + '</div>';
  }

  var VIEW = {};

  VIEW.dashboard = function () {
    var day = getDay(S.date), t = N.dayTotals(day), g = S.settings, count = N.entryCount(day);
    var per = {}; MEALS.forEach(function (m) { per[m] = N.mealTotals(day[m]); });
    function card(label, key, unit, d) {
      var r = N.remaining(g[key], t[key]);
      return '<div class="card stat' + (r.over ? ' over' : '') + '" data-stat="' + key + '"><div class="stat-label">' + label + '</div>' +
        '<div class="stat-val">' + f(t[key], d) + ' <span>/ ' + f(g[key], d) + ' ' + unit + '</span></div>' + bar(r) +
        '<div class="stat-sub">' + (r.over ? 'Exceeded by ' + f(r.exceeded, d) + ' ' + unit : f(r.remaining, d) + ' ' + unit + ' remaining') + ' · ' + f(r.pct, 0) + '%</div></div>';
    }
    function bal(label, key) {
      var r = N.remaining(g[key], t[key]), warn = !r.over && r.pct >= 85;
      return '<div class="card bal' + (r.over ? ' over' : '') + '" data-bal="' + key + '"><h3>' + label +
        (r.over ? '<span class="pill over">Target exceeded</span>' : warn ? '<span class="pill warn">Nearly there</span>' : '<span class="pill">On track</span>') + '</h3>' +
        '<div class="bal-nums"><div><b>' + f(t[key], 1) + ' g</b><span>Consumed</span></div><div><b>' + f(g[key], 0) + ' g</b><span>Daily target</span></div>' +
        '<div class="rem"><b>' + (r.over ? '+' + f(r.exceeded, 1) : f(r.remaining, 1)) + ' g</b><span>' + (r.over ? 'Exceeded by' : 'Remaining') + '</span></div></div>' +
        bar(r, warn) + '<div class="stat-sub">' + f(r.pct, 0) + '% of target</div></div>';
    }
    var h = '<div class="grid g4">' + card('Calories', 'calories', 'kcal', 0) + card('Protein', 'protein', 'g', 1) +
      card('Carbohydrates', 'carbs', 'g', 1) + card('Fat', 'fat', 'g', 1) + '</div>';
    h += '<div class="section"><div class="grid g2">' + bal('Protein balance', 'protein') + bal('Carbohydrate balance', 'carbs') + '</div></div>';
    h += '<div class="section grid g2"><div class="card"><h2 style="margin:0 0 6px;font-size:16px">Meal breakdown</h2>';
    MEALS.forEach(function (m) {
      var x = per[m], pp = t.protein > 0 ? x.protein / t.protein * 100 : 0, cp = t.carbs > 0 ? x.carbs / t.carbs * 100 : 0;
      h += '<div class="meal-row" data-meal-row="' + m + '"><div class="mname">' + LABEL[m] + '<div class="note">' + day[m].length + ' item' + (day[m].length === 1 ? '' : 's') + '</div></div>' +
        '<div><div class="mnums"><span><b>' + f(x.calories, 0) + '</b> kcal</span><span>P <b>' + f(x.protein, 1) + '</b> g</span><span>C <b>' + f(x.carbs, 1) + '</b> g</span></div>' +
        '<div class="share"><div>Protein share ' + f(pp, 0) + '%<div class="bar"><i style="width:' + pp + '%"></i></div></div><div>Carb share ' + f(cp, 0) + '%<div class="bar"><i style="width:' + cp + '%"></i></div></div></div></div>' +
        '<button class="btn ghost sm" data-action="add-open" data-meal="' + m + '">+ Add</button></div>';
    });
    h += '</div><div class="card"><h2 style="margin:0 0 10px;font-size:16px">Nutrition insights</h2><ul class="insights">' +
      N.insights(t, g, count, per).map(function (i) { return '<li class="' + i.tone + '">' + esc(i.text) + '</li>'; }).join('') +
      '</ul><p class="note" style="margin-bottom:0">Insights are calculated from your logged foods and targets; they describe composition and are not medical advice.</p></div></div>';
    h += '<div class="section card"><div class="stat-label">Other nutrients today</div><div class="stat-sub" style="margin:4px 0 0">Fiber <b>' + f(t.fiber, 1) + ' g</b> · Sugar <b>' + f(t.sugar, 1) + ' g</b></div></div>';
    return h;
  };

  function servingHtml(e) {
    var sv = e.servingQty > 0 ? e.qty / e.servingQty : 0;
    return '≈ ' + f(sv, 2) + ' × ' + esc(e.servingLabel || 'serving') + ' (' + f(e.servingQty, 0) + ' ' + e.unit + ')' +
      (e.confidence === 'est' ? ' · estimate' : '');
  }
  function itemHtml(meal, e) {
    var n = N.entryNutrients(e);
    return '<div class="item" data-item="' + e.id + '"><div><div class="iname">' + esc(e.name) + '</div><small>' + servingHtml(e) + '</small></div>' +
      '<div class="iq"><input type="number" min="0" step="any" value="' + f(e.qty, 2) + '" data-change="editqty" data-meal="' + meal + '" data-id="' + e.id + '" aria-label="Quantity in ' + e.unit + '"><span>' + e.unit + '</span>' +
      '<button class="icon-btn" data-action="remove" data-meal="' + meal + '" data-id="' + e.id + '" aria-label="Remove ' + esc(e.name) + '">✕</button></div>' +
      '<div class="inut">' + nutLine(n) + '</div></div>';
  }
  VIEW.log = function () {
    var day = getDay(S.date), h = '';
    MEALS.forEach(function (m) {
      var tot = N.mealTotals(day[m]);
      h += '<div class="card mealcard" data-meal-card="' + m + '"><div class="mealhead"><h3>' + LABEL[m] + '</h3><button class="btn sm" data-action="add-open" data-meal="' + m + '">+ Add food</button></div>' +
        '<div class="mealtot">' + nutLine(tot) + '</div>';
      h += day[m].length ? day[m].map(function (e) { return itemHtml(m, e); }).join('') : '<div class="empty">Nothing logged for ' + LABEL[m].toLowerCase() + '.</div>';
      h += '</div>';
    });
    var t = N.dayTotals(day);
    return h + '<div class="card"><div class="stat-label">Daily total</div><div class="mealtot" data-daytotal style="margin-top:4px">' + nutLine(t) + '</div></div>';
  };

  VIEW.foods = function () {
    var cats = ['All'].concat(categories());
    return '<div class="toolbar"><input type="search" placeholder="Search foods (e.g. paneer, dal, oats)…" value="' + esc(S.fq) + '" data-input="food-search" aria-label="Search foods">' +
      '<select data-change="food-cat" aria-label="Category">' + cats.map(function (c) { return '<option' + (c === S.fcat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select>' +
      '<button class="btn" data-action="custom-new">+ Custom food</button></div>' +
      '<p class="note">Values are per 100 g / 100 ml. “Reference” entries are based on USDA / ICMR-NIN tables (approximate); “Estimate” entries are generic home-style figures that vary by recipe. Verify packaged foods against their labels.</p>' +
      '<div id="foodList">' + foodListHtml() + '</div>';
  };
  function foodListHtml() {
    var list = searchFoods(S.fq, S.fcat);
    if (!list.length) return '<div class="card empty">No match found. Pick a similar item, create a custom food, or build a recipe.<div style="margin-top:10px"><button class="btn sm" data-action="custom-new">Create custom food</button> <button class="btn ghost sm" data-action="nav" data-view="recipes">Go to Recipes</button></div></div>';
    return '<div class="note" style="margin-bottom:8px">' + list.length + ' food' + (list.length === 1 ? '' : 's') + '</div><div class="foodgrid">' + list.map(function (fd) {
      var p = fd.per100;
      return '<div class="card food"><h4>' + esc(fd.name) + '</h4><div class="meta">' + confPill(fd) + '<span>' + esc(fd.category) + ' · ' + esc(fd.form) + '</span></div>' +
        '<div class="macros"><div><b>' + f(p.calories, 0) + '</b>kcal</div><div><b>' + f(p.protein, 1) + '</b>protein</div><div><b>' + f(p.carbs, 1) + '</b>carbs</div><div><b>' + f(p.fat, 1) + '</b>fat</div><div><b>' + f(p.fiber, 1) + '</b>fiber</div></div>' +
        '<div class="src">per 100 ' + fd.unit + ' · serving: ' + esc(fd.servingLabel) + ' (' + f(fd.servingQty, 0) + ' ' + fd.unit + ')<br>Source: ' + esc(fd.source) + '</div>' +
        '<div class="acts"><button class="btn sm" data-action="food-add" data-id="' + esc(fd.id) + '">Add to log</button>' +
        (fd.custom ? '<button class="btn ghost sm" data-action="custom-edit" data-id="' + esc(fd.id) + '">Edit</button><button class="btn danger sm" data-action="custom-delete" data-id="' + esc(fd.id) + '">Delete</button>' : '') + '</div></div>';
    }).join('') + '</div>';
  }

  VIEW.recipes = function () {
    if (S.draft) return recipeBuilder();
    var h = '<div class="toolbar"><button class="btn" data-action="recipe-new">+ New recipe</button></div>' +
      '<p class="note">Recipes are calculated from ingredient quantities. Cooking changes (water loss, oil absorption) make results approximate — enter the final cooked weight for better per-100 g values.</p>';
    if (!S.recipes.length) return h + '<div class="card empty">No recipes yet. Build one from ingredients (for example besan cheela, roti or dal) and log it like any other food.</div>';
    return h + '<div class="foodgrid">' + S.recipes.map(function (r) {
      var rp = N.recipePer100(r.ingredients, r.finalWeight), ps = {}, sv = r.servings;
      KEYS.forEach(function (k) { ps[k] = rp.total[k] / sv; });
      return '<div class="card food"><h4>' + esc(r.name) + '</h4><div class="meta"><span class="pill recipe">Recipe</span><span>' + r.ingredients.length + ' ingredients · ' + f(sv, 2) + ' servings · ' + f(rp.totalWeight, 0) + ' g total</span></div>' +
        '<div class="macros"><div><b>' + f(ps.calories, 0) + '</b>kcal</div><div><b>' + f(ps.protein, 1) + '</b>protein</div><div><b>' + f(ps.carbs, 1) + '</b>carbs</div><div><b>' + f(ps.fat, 1) + '</b>fat</div><div><b>' + f(ps.fiber, 1) + '</b>fiber</div></div>' +
        '<div class="src">Per serving · approximate</div><div class="acts"><button class="btn sm" data-action="recipe-log" data-id="' + r.id + '">Add to log</button><button class="btn ghost sm" data-action="recipe-edit" data-id="' + r.id + '">Edit</button><button class="btn danger sm" data-action="recipe-delete" data-id="' + r.id + '">Delete</button></div></div>';
    }).join('') + '</div>';
  };
  function recipeBuilder() {
    var d = S.draft;
    var h = '<div class="card"><div class="row2"><div class="field"><label>Recipe name</label><input type="text" id="rName" value="' + esc(d.name) + '" data-input="draft-name" placeholder="e.g. Besan cheela"></div>' +
      '<div class="row2"><div class="field"><label>Servings made</label><input type="number" min="0.25" step="any" value="' + esc(d.servings) + '" data-change="draft-servings"></div>' +
      '<div class="field"><label>Cooked weight (g, optional)</label><input type="number" min="0" step="any" value="' + esc(d.finalWeight || '') + '" data-change="draft-weight" placeholder="auto"></div></div></div>' +
      '<p class="note">Leave cooked weight blank to use the sum of ingredient weights (water loss and oil absorption are not modelled).</p>' +
      '<h2 style="font-size:16px;margin:8px 0 4px">Ingredients</h2>';
    h += d.ingredients.length ? d.ingredients.map(function (i, idx) {
      var n = N.scale(i.per100, i.qty);
      return '<div class="recipe-line"><div><b>' + esc(i.name) + '</b><div class="note">' + f(n.calories, 0) + ' kcal · P ' + f(n.protein, 1) + ' · C ' + f(n.carbs, 1) + ' · F ' + f(n.fat, 1) + '</div></div>' +
        '<div class="iq"><input type="number" min="0" step="any" value="' + f(i.qty, 2) + '" data-change="draft-ing-qty" data-idx="' + idx + '"> ' + i.unit + '</div><button class="icon-btn" data-action="recipe-rm-ing" data-idx="' + idx + '" aria-label="Remove ingredient">✕</button></div>';
    }).join('') : '<div class="empty">No ingredients yet.</div>';
    h += '<div style="margin-top:10px"><button class="btn ghost" data-action="recipe-add-ing">+ Add ingredient</button></div>' +
      '<h2 style="font-size:16px;margin:16px 0 4px">Nutrition (approximate)</h2><div id="recipeNutrition">' + recipeNutritionHtml() + '</div>' +
      '<div class="dlg-foot"><button class="btn ghost" data-action="recipe-cancel">Cancel</button><button class="btn" data-action="recipe-save">Save recipe</button></div></div>';
    return h;
  }
  function recipeNutritionHtml() {
    var d = S.draft, rp = N.recipePer100(d.ingredients, d.finalWeight), sv = Number(d.servings) > 0 ? Number(d.servings) : 1, ps = {};
    KEYS.forEach(function (k) { ps[k] = rp.total[k] / sv; });
    return '<div class="note">Per serving (' + f(sv, 2) + ' servings)</div>' + totBlock(ps) +
      '<div class="note">Per 100 g of finished dish</div>' + totBlock(rp.per100);
  }
  function totBlock(n) {
    return '<div class="tot"><div><b>' + f(n.calories, 0) + '</b>kcal</div><div><b>' + f(n.protein, 1) + '</b>protein</div><div><b>' + f(n.carbs, 1) + '</b>carbs</div><div><b>' + f(n.fat, 1) + '</b>fat</div><div><b>' + f(n.fiber, 1) + '</b>fiber</div><div><b>' + f(n.sugar, 1) + '</b>sugar</div></div>';
  }

  VIEW.settings = function () {
    var g = S.settings;
    function fld(k, label, unit) {
      return '<div class="field"><label>' + label + ' (' + unit + ')</label><input type="number" min="1" step="any" value="' + g[k] + '" data-change="setting" data-key="' + k + '" id="set_' + k + '"></div>';
    }
    return '<div class="card"><h2 style="margin-top:0;font-size:16px">Daily targets</h2>' +
      '<p class="note">These are <b>demo defaults</b> (2000 kcal, 90 g protein, 250 g carbohydrates, 65 g fat) for trying the app — not personalized medical recommendations. Set targets that suit you, ideally with guidance from a qualified professional.</p>' +
      '<div class="settings-grid">' + fld('calories', 'Calories', 'kcal') + fld('protein', 'Protein', 'g') + fld('carbs', 'Carbohydrates', 'g') + fld('fat', 'Fat', 'g') + '</div>' +
      '<div class="toolbar"><button class="btn ghost" data-action="settings-reset">Reset to demo defaults</button></div></div>' +
      '<div class="card section"><h2 style="margin-top:0;font-size:16px">Your data</h2><p class="note">Everything is stored in this browser only (localStorage). Nothing is sent anywhere.</p>' +
      '<div class="toolbar"><button class="btn ghost" data-action="export">Export data (JSON)</button><button class="btn danger" data-action="clear">Delete all data</button></div></div>';
  };

  /* ---------- modals ---------- */
  function openPick(opts) {
    S.adding = false; // a freshly opened dialog is a new add; the guard only covers repeat clicks within one dialog
    S.modal = { type: 'pick', mode: opts.mode || 'log', meal: opts.meal || defaultMeal(), q: '', cat: 'All', food: opts.food || null, qty: opts.food ? opts.food.servingQty : 0 };
    render(); setTimeout(function () { var el = $('#pickSearch'); if (el) el.focus(); }, 0);
  }
  function closeModal() { S.modal = null; renderModal(); }
  function pickResultsHtml() {
    var m = S.modal, list = searchFoods(m.q, m.cat);
    if (!list.length) return '<div class="empty">No confident match. Choose a similar item, or create a custom food / recipe.<div style="margin-top:10px"><button class="btn sm" data-action="custom-new">Create custom food</button></div></div>';
    return list.slice(0, 80).map(function (fd) {
      var sv = N.scale(fd.per100, fd.servingQty);
      return '<button class="res" data-action="pick-food" data-id="' + esc(fd.id) + '"><div><b>' + esc(fd.name) + '</b><span>' + esc(fd.category) + ' · ' + esc(fd.form) + ' · ' + esc(fd.servingLabel) + '</span></div>' +
        '<div class="rk"><b>' + f(sv.calories, 0) + ' kcal</b><span>P ' + f(sv.protein, 1) + ' · C ' + f(sv.carbs, 1) + '</span></div></button>';
    }).join('') + (list.length > 80 ? '<div class="note">Showing 80 of ' + list.length + ' — refine your search.</div>' : '');
  }
  function previewHtml() {
    var m = S.modal, n = N.scale(m.food.per100, m.qty);
    return '<div><b>' + f(n.calories, 0) + '</b><span>kcal</span></div><div><b>' + f(n.protein, 1) + ' g</b><span>protein</span></div><div><b>' + f(n.carbs, 1) + ' g</b><span>carbs</span></div>' +
      '<div><b>' + f(n.fat, 1) + ' g</b><span>fat</span></div><div><b>' + f(n.fiber, 1) + ' g</b><span>fiber</span></div><div><b>' + f(n.sugar, 1) + ' g</b><span>sugar</span></div>';
  }
  function renderModal() {
    var m = S.modal, el = $('#modal');
    if (!m) { el.className = ''; el.innerHTML = ''; return; }
    el.className = 'open';
    var h = '<div class="dlg" role="dialog" aria-modal="true">';
    if (m.type === 'pick' && !m.food) {
      h += '<div class="dlg-head"><h3>' + (m.mode === 'ingredient' ? 'Add ingredient' : 'Choose a food') + '</h3><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
        '<div class="toolbar" style="margin-bottom:0"><input type="search" id="pickSearch" placeholder="Search foods…" value="' + esc(m.q) + '" data-input="pick-search" autocomplete="off">' +
        '<select data-change="pick-cat">' + ['All'].concat(categories()).map(function (c) { return '<option' + (c === m.cat ? ' selected' : '') + '>' + esc(c) + '</option>'; }).join('') + '</select></div>' +
        '<div class="results" id="pickResults">' + pickResultsHtml() + '</div>' +
        '<div class="dlg-foot"><button class="btn ghost sm" data-action="custom-new">+ Custom food</button></div>';
    } else if (m.type === 'pick') {
      var fd = m.food, sv = fd.servingQty > 0 ? m.qty / fd.servingQty : 0;
      h += '<div class="dlg-head"><h3>' + esc(fd.name) + '</h3><button class="icon-btn" data-action="close-modal" aria-label="Close">✕</button></div>' +
        '<div class="meta" style="display:flex;gap:6px;margin-bottom:10px">' + confPill(fd) + '<span class="note">' + esc(fd.category) + ' · ' + esc(fd.form) + ' · per 100 ' + fd.unit + ': ' + f(fd.per100.calories, 0) + ' kcal, P ' + f(fd.per100.protein, 1) + ', C ' + f(fd.per100.carbs, 1) + ', F ' + f(fd.per100.fat, 1) + '</span></div>' +
        (fd.confidence === 'est' ? '<p class="note">Estimated, generic values — actual nutrition varies by recipe and preparation.</p>' : '') +
        (fd.confidence === 'recipe' ? '<p class="note">Approximate: calculated from your recipe ingredients.</p>' : '') +
        '<div class="row2"><div class="field"><label>Servings (' + esc(fd.servingLabel) + ' = ' + f(fd.servingQty, 0) + ' ' + fd.unit + ')</label><input type="number" id="qServ" min="0" step="any" value="' + f(sv, 2) + '" data-input="q-serv"></div>' +
        '<div class="field"><label>Amount (' + fd.unit + ')</label><input type="number" id="qAmt" min="0" step="any" value="' + f(m.qty, 2) + '" data-input="q-amt"></div></div>' +
        '<div class="preview" id="preview">' + previewHtml() + '</div><div class="err" id="qErr"></div>';
      if (m.mode === 'log') h += '<div class="field"><label>Meal</label><select id="mealSel" data-change="meal-sel">' + MEALS.map(function (x) { return '<option value="' + x + '"' + (x === m.meal ? ' selected' : '') + '>' + LABEL[x] + '</option>'; }).join('') + '</select></div>';
      h += '<div class="dlg-foot"><button class="btn ghost" data-action="back-pick">Back</button><button class="btn" id="confirmAdd" data-action="confirm-add">' + (m.mode === 'ingredient' ? 'Add ingredient' : 'Add to ' + LABEL[m.meal]) + '</button></div>';
    } else if (m.type === 'custom') {
      var c = m.food || { name: '', category: 'My Foods', form: 'prepared', per100: { calories: '', protein: '', carbs: '', fat: '', fiber: 0, sugar: 0 }, servingQty: 100, servingLabel: '1 serving', unit: 'g' };
      function nf(id, label, v) { return '<div class="field"><label>' + label + '</label><input type="number" min="0" step="any" id="c_' + id + '" value="' + esc(v) + '"></div>'; }
      h += '<div class="dlg-head"><h3>' + (m.food ? 'Edit custom food' : 'Custom food') + '</h3><button class="icon-btn" data-action="close-custom" aria-label="Close">✕</button></div>' +
        '<div class="field"><label>Name</label><input type="text" id="c_name" value="' + esc(c.name) + '"></div>' +
        '<div class="row3"><div class="field"><label>Unit</label><select id="c_unit"><option' + (c.unit === 'g' ? ' selected' : '') + '>g</option><option' + (c.unit === 'ml' ? ' selected' : '') + '>ml</option></select></div>' +
        '<div class="field"><label>Serving size</label><input type="number" min="0" step="any" id="c_sq" value="' + esc(c.servingQty) + '"></div>' +
        '<div class="field"><label>Serving label</label><input type="text" id="c_sl" value="' + esc(c.servingLabel) + '"></div></div>' +
        '<div class="note" style="margin-bottom:6px">Nutrition per 100 g / 100 ml:</div><div class="row3">' +
        nf('calories', 'Calories (kcal)', c.per100.calories) + nf('protein', 'Protein (g)', c.per100.protein) + nf('carbs', 'Carbs (g)', c.per100.carbs) +
        nf('fat', 'Fat (g)', c.per100.fat) + nf('fiber', 'Fiber (g)', c.per100.fiber) + nf('sugar', 'Sugar (g)', c.per100.sugar) + '</div>' +
        '<div class="err" id="cErr"></div><div class="dlg-foot"><button class="btn ghost" data-action="close-custom">Cancel</button><button class="btn" data-action="custom-save">Save food</button></div>';
    }
    el.innerHTML = h + '</div>';
  }

  /* ---------- actions ---------- */
  function readNum(id) { var v = $(id).value; return v === '' ? NaN : Number(v); }
  var ACTIONS = {
    nav: function (el) { S.view = el.dataset.view; S.modal = null; render(); window.scrollTo(0, 0); },
    'date-prev': function () { S.date = shift(S.date, -1); render(); },
    'date-next': function () { S.date = shift(S.date, 1); render(); },
    'date-today': function () { S.date = today(); render(); },
    'add-open': function (el) { openPick({ meal: el.dataset.meal }); },
    'food-add': function (el) { openPick({ meal: defaultMeal(), food: findFood(el.dataset.id) }); },
    'pick-food': function (el) {
      var fd = findFood(el.dataset.id); if (!fd) return;
      S.modal.food = fd; S.modal.qty = fd.servingQty; renderModal();
      var a = $('#qAmt'); if (a) { a.focus(); a.select(); }
    },
    'back-pick': function () { S.modal.food = null; renderModal(); var el = $('#pickSearch'); if (el) el.focus(); },
    'close-modal': closeModal,
    'confirm-add': function () {
      var m = S.modal; if (!m || !m.food) return;
      if (S.adding) return;                                   // guard against repeated clicks
      if (!N.validQty(m.qty)) { $('#qErr').textContent = 'Enter a quantity greater than 0.'; return; }
      S.adding = true; setTimeout(function () { S.adding = false; }, 600);
      var btn = $('#confirmAdd'); if (btn) btn.disabled = true;
      var fd = m.food, qty = Number(m.qty);
      if (m.mode === 'ingredient') {
        S.draft.ingredients.push({ foodId: fd.id, name: fd.name, qty: qty, unit: fd.unit, per100: JSON.parse(JSON.stringify(fd.per100)) });
        S.modal = null; render(); toast('Ingredient added');
      } else {
        addEntry(m.meal, fd, qty); S.modal = null; render(); toast('Added ' + fd.name + ' to ' + LABEL[m.meal]);
      }
    },
    remove: function (el) {
      var r = findEntry(el.dataset.meal, el.dataset.id); if (!r) return;
      r[0].splice(r[1], 1); save('nb_log', S.log); render(); toast('Removed');
    },
    'custom-new': function () { S.modal = { type: 'custom', food: null }; renderModal(); },
    'custom-edit': function (el) {
      var c = S.custom.filter(function (x) { return x.id === el.dataset.id; })[0]; if (c) { S.modal = { type: 'custom', food: c }; renderModal(); }
    },
    'close-custom': closeModal,
    'custom-save': function () {
      var name = $('#c_name').value.trim(), err = $('#cErr'), p = {};
      var ok = KEYS.every(function (k) {
        var v = readNum('#c_' + k); if (!isFinite(v) || v < 0) return k === 'fiber' || k === 'sugar' ? (p[k] = 0, true) : false; p[k] = v; return true;
      });
      var sq = readNum('#c_sq');
      if (!name) { err.textContent = 'Please enter a name.'; return; }
      if (!ok) { err.textContent = 'Calories, protein, carbs and fat must be numbers ≥ 0.'; return; }
      if (!(sq > 0)) { err.textContent = 'Serving size must be greater than 0.'; return; }
      var obj = { name: name, category: 'My Foods', form: 'custom', per100: p, servingQty: sq, servingLabel: $('#c_sl').value.trim() || '1 serving', unit: $('#c_unit').value };
      if (S.modal.food) { var ex = S.custom.filter(function (x) { return x.id === S.modal.food.id; })[0]; Object.assign(ex, obj); }
      else { obj.id = 'c_' + uid(); S.custom.push(obj); }
      save('nb_custom', S.custom); S.modal = null; render(); toast('Custom food saved');
    },
    'custom-delete': function (el) {
      if (!confirm('Delete this custom food? Already-logged entries keep their values.')) return;
      S.custom = S.custom.filter(function (x) { return x.id !== el.dataset.id; }); save('nb_custom', S.custom); render();
    },
    'recipe-new': function () { S.draft = { id: null, name: '', servings: 1, finalWeight: '', ingredients: [] }; render(); },
    'recipe-edit': function (el) {
      var r = S.recipes.filter(function (x) { return x.id === el.dataset.id; })[0]; if (!r) return;
      S.draft = JSON.parse(JSON.stringify(r)); render();
    },
    'recipe-delete': function (el) {
      if (!confirm('Delete this recipe? Already-logged entries keep their values.')) return;
      S.recipes = S.recipes.filter(function (x) { return x.id !== el.dataset.id; }); save('nb_recipes', S.recipes); render();
    },
    'recipe-log': function (el) { var fd = findFood('r_' + el.dataset.id); if (fd) openPick({ meal: defaultMeal(), food: fd }); },
    'recipe-cancel': function () { S.draft = null; render(); },
    'recipe-add-ing': function () { openPick({ mode: 'ingredient' }); },
    'recipe-rm-ing': function (el) { S.draft.ingredients.splice(+el.dataset.idx, 1); render(); },
    'recipe-save': function () {
      var d = S.draft, name = (d.name || '').trim(), sv = Number(d.servings), fw = d.finalWeight === '' ? null : Number(d.finalWeight);
      if (!name) { toast('Give the recipe a name'); return; }
      if (!d.ingredients.length) { toast('Add at least one ingredient'); return; }
      if (!(sv > 0)) { toast('Servings must be greater than 0'); return; }
      if (fw !== null && !(fw > 0)) { toast('Cooked weight must be greater than 0 (or blank)'); return; }
      var rec = { id: d.id || uid(), name: name, servings: sv, finalWeight: fw, ingredients: d.ingredients };
      var i = S.recipes.map(function (x) { return x.id; }).indexOf(rec.id);
      if (i >= 0) S.recipes[i] = rec; else S.recipes.push(rec);
      save('nb_recipes', S.recipes); S.draft = null; render(); toast('Recipe saved');
    },
    'settings-reset': function () { S.settings = sanitizeSettings(DEFAULTS); save('nb_settings', S.settings); render(); toast('Reset to demo defaults'); },
    export: function () {
      var blob = new Blob([JSON.stringify({ settings: S.settings, log: S.log, customFoods: S.custom, recipes: S.recipes }, null, 2)], { type: 'application/json' });
      var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'nutribalance-export.json'; a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    },
    clear: function () {
      if (!confirm('Delete ALL NutriBalance data (logs, custom foods, recipes, targets)?')) return;
      ['nb_log', 'nb_custom', 'nb_recipes', 'nb_settings'].forEach(function (k) { try { localStorage.removeItem(k); } catch (e) {} delete mem[k]; });
      S.log = {}; S.custom = []; S.recipes = []; S.settings = sanitizeSettings(DEFAULTS); render(); toast('All data deleted');
    }
  };

  var CHANGES = {
    date: function (el) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(el.value)) {
        S.date = el.value; $('.dlabel').textContent = dateLabel(S.date);
        $('#view').innerHTML = VIEW[S.view]();
      }
    },
    editqty: function (el) {
      var r = findEntry(el.dataset.meal, el.dataset.id), v = Number(el.value);
      if (!r) return;
      var entry = r[0][r[1]];
      if (el.value === '' || !N.validQty(v)) { toast('Quantity must be greater than 0'); el.value = f(entry.qty, 2); return; }
      entry.qty = v; save('nb_log', S.log);
      // Keep inputs and buttons mounted while blur commits an edit, so the pending click survives.
      var item = el.closest('.item'), card = el.closest('.mealcard'), day = getDay(S.date);
      $('.inut', item).innerHTML = nutLine(N.entryNutrients(entry));
      $('small', item).innerHTML = servingHtml(entry);
      $('.mealtot', card).innerHTML = nutLine(N.mealTotals(day[el.dataset.meal]));
      $('[data-daytotal]').innerHTML = nutLine(N.dayTotals(day));
    },
    setting: function (el) {
      var v = Number(el.value);
      if (el.value === '' || !isFinite(v) || !(v > 0)) { toast('Target must be greater than 0'); el.value = S.settings[el.dataset.key]; return; }
      S.settings[el.dataset.key] = v; save('nb_settings', S.settings); toast('Target saved');
    },
    'food-cat': function (el) { S.fcat = el.value; $('#foodList').innerHTML = foodListHtml(); },
    'pick-cat': function (el) { S.modal.cat = el.value; $('#pickResults').innerHTML = pickResultsHtml(); },
    'meal-sel': function (el) { S.modal.meal = el.value; var b = $('#confirmAdd'); if (b) b.textContent = 'Add to ' + LABEL[el.value]; },
    'draft-servings': function (el) { S.draft.servings = el.value; $('#recipeNutrition').innerHTML = recipeNutritionHtml(); },
    'draft-weight': function (el) { S.draft.finalWeight = el.value; $('#recipeNutrition').innerHTML = recipeNutritionHtml(); },
    'draft-ing-qty': function (el) {
      var ingredient = S.draft.ingredients[+el.dataset.idx], v = Number(el.value);
      if (el.value === '' || !N.validQty(v)) { toast('Quantity must be greater than 0'); el.value = f(ingredient.qty, 2); return; }
      ingredient.qty = v;
      var n = N.scale(ingredient.per100, v);
      $('.note', el.closest('.recipe-line')).textContent = f(n.calories, 0) + ' kcal · P ' + f(n.protein, 1) + ' · C ' + f(n.carbs, 1) + ' · F ' + f(n.fat, 1);
      $('#recipeNutrition').innerHTML = recipeNutritionHtml();
    }
  };
  var INPUTS = {
    'food-search': function (el) { S.fq = el.value; $('#foodList').innerHTML = foodListHtml(); },
    'pick-search': function (el) { S.modal.q = el.value; $('#pickResults').innerHTML = pickResultsHtml(); },
    'draft-name': function (el) { S.draft.name = el.value; },
    'q-serv': function (el) {
      var m = S.modal, v = Number(el.value); m.qty = el.value === '' ? 0 : v * m.food.servingQty;
      $('#qAmt').value = m.qty ? f(m.qty, 2) : ''; updPreview();
    },
    'q-amt': function (el) {
      var m = S.modal; m.qty = el.value === '' ? 0 : Number(el.value);
      $('#qServ').value = m.qty ? f(m.qty / m.food.servingQty, 2) : ''; updPreview();
    }
  };
  function updPreview() {
    var m = S.modal, ok = N.validQty(m.qty);
    $('#preview').innerHTML = ok ? previewHtml() : '<div>—</div>';
    $('#qErr').textContent = ok ? '' : 'Enter a quantity greater than 0.';
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-action]');
    if (el && ACTIONS[el.dataset.action]) { ACTIONS[el.dataset.action](el); return; }
    if (e.target.id === 'modal' && S.modal) closeModal();
  });
  document.addEventListener('change', function (e) {
    var k = e.target.dataset && e.target.dataset.change; if (k && CHANGES[k]) CHANGES[k](e.target);
  });
  document.addEventListener('input', function (e) {
    var k = e.target.dataset && e.target.dataset.input; if (k && INPUTS[k]) INPUTS[k](e.target);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.modal) closeModal();
    if (e.key === 'Enter' && S.modal && S.modal.type === 'pick' && S.modal.food && e.target.tagName === 'INPUT') { e.preventDefault(); ACTIONS['confirm-add'](); }
  });

  window.__NB = { state: S, render: render, allFoods: allFoods };
  render();
})();
