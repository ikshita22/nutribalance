/* NutriBalance - nutrition calculation utilities (no DOM access, testable in Node) */
(function (root) {
  'use strict';
  var KEYS = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar'];
  var MEALS = ['breakfast', 'lunch', 'dinner', 'snacks'];

  function num(v) { v = Number(v); return isFinite(v) ? v : 0; }
  function zero() { var o = {}; KEYS.forEach(function (k) { o[k] = 0; }); return o; }
  function validQty(q) { q = Number(q); return isFinite(q) && q > 0 && q <= 100000; }

  // Calculated nutrient = reference nutrient x (user quantity / reference quantity [100])
  function scale(per100, qty) {
    var r = num(qty) / 100, o = {};
    KEYS.forEach(function (k) { o[k] = num(per100 && per100[k]) * r; });
    return o;
  }
  function add(a, b) { var o = {}; KEYS.forEach(function (k) { o[k] = num(a[k]) + num(b[k]); }); return o; }
  function sum(list) { return list.reduce(add, zero()); }

  function entryNutrients(e) { return scale(e.per100, e.qty); }
  function mealTotals(items) { return sum((items || []).map(entryNutrients)); }
  function dayTotals(day) {
    return sum(MEALS.map(function (m) { return mealTotals(day && day[m]); }));
  }
  function entryCount(day) {
    return MEALS.reduce(function (n, m) { return n + ((day && day[m]) ? day[m].length : 0); }, 0);
  }

  // Remaining is never negative; exceeded is reported separately.
  function remaining(target, intake) {
    target = num(target); intake = num(intake);
    return {
      remaining: Math.max(0, target - intake),
      exceeded: Math.max(0, intake - target),
      pct: target > 0 ? (intake / target) * 100 : 0,
      over: intake > target
    };
  }

  // ingredients: [{qty, per100}]. finalWeight optional (cooked weight in g).
  function recipePer100(ingredients, finalWeight) {
    var total = sum((ingredients || []).map(function (i) { return scale(i.per100, i.qty); }));
    var rawWeight = (ingredients || []).reduce(function (s, i) { return s + num(i.qty); }, 0);
    var w = num(finalWeight) > 0 ? num(finalWeight) : rawWeight;
    var per100 = zero();
    if (w > 0) KEYS.forEach(function (k) { per100[k] = total[k] / w * 100; });
    return { total: total, per100: per100, totalWeight: w, rawWeight: rawWeight };
  }

  function fmt(n, d) {
    n = num(n); d = d || 0;
    var p = Math.pow(10, d);
    var s = (Math.round(n * p) / p).toFixed(d);
    return d ? s.replace(/\.?0+$/, '') : s;
  }

  var MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snacks: 'Snacks' };

  // Rule-based insights computed from real logged data and targets.
  function insights(t, g, count, perMeal) {
    var out = [];
    if (!count) {
      out.push({ tone: 'info', text: 'No foods logged for this date yet. Add a meal to see insights calculated from your log.' });
      return out;
    }
    var P = remaining(g.protein, t.protein), C = remaining(g.carbs, t.carbs), K = remaining(g.calories, t.calories);
    out.push({ tone: 'info', text: 'You have consumed ' + fmt(t.protein, 0) + ' g of protein out of your ' + fmt(g.protein, 0) + ' g target.' });
    if (P.over) out.push({ tone: 'over', text: 'You are about ' + fmt(P.exceeded, 0) + ' g above your protein target.' });
    else out.push({ tone: 'ok', text: 'You have approximately ' + fmt(P.remaining, 0) + ' g of protein remaining.' });

    if (C.over) out.push({ tone: 'over', text: 'Your carbohydrate intake is ' + fmt(C.exceeded, 0) + ' g above your daily target (' + fmt(t.carbs, 0) + ' g of ' + fmt(g.carbs, 0) + ' g).' });
    else if (C.pct >= 85) out.push({ tone: 'warn', text: 'Your carbohydrate intake is approaching your daily target (' + fmt(t.carbs, 0) + ' g of ' + fmt(g.carbs, 0) + ' g, ' + fmt(C.remaining, 0) + ' g left).' });
    else out.push({ tone: 'ok', text: 'You have consumed ' + fmt(t.carbs, 0) + ' g of carbohydrates (' + fmt(C.pct, 0) + '% of target); about ' + fmt(C.remaining, 0) + ' g remaining.' });

    if (K.over) out.push({ tone: 'over', text: 'Calories are ' + fmt(K.exceeded, 0) + ' kcal above your target.' });
    else out.push({ tone: 'info', text: 'About ' + fmt(K.remaining, 0) + ' kcal remain of your ' + fmt(g.calories, 0) + ' kcal target.' });

    if (!P.over && P.pct < 80) {
      if (C.over) out.push({ tone: 'info', text: 'Your carbohydrate target is reached while protein is still short; foods that are higher in protein relative to carbohydrates would fit best.' });
      else out.push({ tone: 'info', text: 'Consider a protein-rich food in your next meal if it fits your remaining nutrition needs.' });
    }
    if (perMeal && t.protein > 0) {
      var best = null;
      MEALS.forEach(function (m) { if (perMeal[m] && (!best || perMeal[m].protein > perMeal[best].protein)) best = m; });
      if (best && perMeal[best].protein > 0)
        out.push({ tone: 'info', text: MEAL_LABEL[best] + ' contributed the most protein: ' + fmt(perMeal[best].protein, 0) + ' g (' + fmt(perMeal[best].protein / t.protein * 100, 0) + '% of today\'s protein).' });
    }
    return out;
  }

  var api = {
    KEYS: KEYS, MEALS: MEALS, MEAL_LABEL: MEAL_LABEL, num: num, zero: zero, validQty: validQty,
    scale: scale, add: add, sum: sum, entryNutrients: entryNutrients, mealTotals: mealTotals,
    dayTotals: dayTotals, entryCount: entryCount, remaining: remaining, recipePer100: recipePer100,
    fmt: fmt, insights: insights
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NB_NUTRITION = api;
})(typeof window !== 'undefined' ? window : globalThis);
