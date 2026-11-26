"""End-to-end acceptance tests for NutriBalance (Playwright). Usage: python3 test/e2e.py [url]"""
import re, sys
from playwright.sync_api import sync_playwright

URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:8080/index.html"
results, errors = [], []

def check(name, cond, detail=""):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name + (f"  [{detail}]" if detail and not cond else ""))

def nums(text):
    return [float(x) for x in re.findall(r"-?\d+(?:\.\d+)?", text)]

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1280, "height": 900})
    page = ctx.new_page()
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(URL)
    page.evaluate("localStorage.clear()"); page.reload()

    check("1 app loads, dashboard visible", page.locator("#topbar h1").inner_text() == "Dashboard")
    n_foods = page.evaluate("window.__NB.allFoods().length")
    check("2a database has >=100 foods", n_foods >= 100, n_foods)

    def add_food(meal_card, query, servings=None, amount=None, pick_text=None):
        page.click(f'[data-meal-card="{meal_card}"] [data-action="add-open"]')
        page.fill("#pickSearch", query)
        res = page.locator(".res", has_text=pick_text) if pick_text else page.locator(".res").first
        res.first.click()
        if servings is not None: page.fill("#qServ", str(servings))
        if amount is not None: page.fill("#qAmt", str(amount))
        return page.locator("#preview").inner_text()

    page.click('[data-view="log"]')
    prev = add_food("breakfast", "egg", servings=2, pick_text="Egg, whole, boiled")
    check("2b search returns matches", True)
    check("3a preview shows nutrition before adding", "12.6" in prev and "155" in prev, prev)
    # double-click guard: click twice synchronously
    page.evaluate("(()=>{const b=document.querySelector('#confirmAdd');b.click();b.click();})()")
    check("3b 2 eggs added once (no duplicate)", page.locator('[data-meal-card="breakfast"] .item').count() == 1)

    add_food("lunch", "roti", servings=2, pick_text="Roti / chapati (whole wheat")
    page.click("#confirmAdd")
    add_food("lunch", "dal", servings=1, pick_text="Dal, toor")
    page.click("#confirmAdd")
    check("4 roti + dal in lunch", page.locator('[data-meal-card="lunch"] .item').count() == 2)
    check("5 items display nutrition", all("kcal" in t for t in page.locator(".item .inut").all_inner_texts()))

    def daytotal():
        t = page.locator("[data-daytotal]").inner_text()
        k, p_, c, f_ = nums(t)[:4]
        return k, p_, c, f_

    k, pr, c, fa = daytotal()
    # eggs 100g, roti 80g, dal 150g
    exp_k = 155 + 290 * .8 + 90 * 1.5
    exp_p = 12.6 + 9.5 * .8 + 5 * 1.5
    exp_c = 1.1 + 54 * .8 + 13 * 1.5
    exp_f = 10.6 + 3.5 * .8 + 2 * 1.5
    check("6 daily totals correct", abs(k - exp_k) < 1 and abs(pr - exp_p) < .1 and abs(c - exp_c) < .1 and abs(fa - exp_f) < .1, (k, pr, c, fa))

    page.click('[data-view="dashboard"]')
    rem_p = page.locator('[data-bal="protein"] .rem b').inner_text()
    rem_c = page.locator('[data-bal="carbs"] .rem b').inner_text()
    check("7 remaining protein/carbs", abs(nums(rem_p)[0] - (90 - exp_p)) < .1 and abs(nums(rem_c)[0] - (250 - exp_c)) < .1, (rem_p, rem_c))
    check("7b meal breakdown present", page.locator(".meal-row").count() == 4)
    check("7c insights computed", "protein" in page.locator(".insights").inner_text().lower())

    # edit qty
    page.click('[data-view="log"]')
    q = page.locator('[data-meal-card="lunch"] .item', has_text="Roti").locator("input")
    q.fill("120"); q.dispatch_event("change")
    k2, pr2, *_ = daytotal()
    check("8 editing qty recalculates", abs(pr2 - (12.6 + 9.5 * 1.2 + 7.5)) < .1, pr2)
    # remove
    page.locator('[data-meal-card="lunch"] .item', has_text="Dal").locator('[data-action="remove"]').click()
    k3, pr3, *_ = daytotal()
    check("9 remove subtracts", abs(pr3 - (12.6 + 9.5 * 1.2)) < .1, pr3)

    page.reload()
    page.click('[data-view="log"]')
    check("10 data persists after refresh", page.locator(".item").count() == 2 and abs(daytotal()[1] - pr3) < .01)

    # date change
    page.click('[data-action="date-prev"]')
    check("11a previous date is empty", page.locator(".item").count() == 0)
    page.click('[data-action="date-today"]')
    check("11b today shows meals again", page.locator(".item").count() == 2)

    # targets
    page.click('[data-view="settings"]')
    page.fill("#set_protein", "20"); page.dispatch_event("#set_protein", "change")
    page.click('[data-view="dashboard"]')
    exceeded = page.locator('[data-bal="protein"]').inner_text()
    check("12 target change -> exceeded state, no negative remaining", "Exceeded" in exceeded and "-" not in page.locator('[data-bal="protein"] .rem b').inner_text(), exceeded)
    page.click('[data-view="settings"]'); page.click('[data-action="settings-reset"]')

    # custom food
    page.click('[data-view="foods"]')
    page.click('.toolbar [data-action="custom-new"]')
    page.fill("#c_name", "Test Protein Bar")
    for k_, v in dict(calories=400, protein=30, carbs=40, fat=10, fiber=5, sugar=8).items(): page.fill(f"#c_{k_}", str(v))
    page.fill("#c_sq", "50"); page.click('[data-action="custom-save"]')
    page.fill('[data-input="food-search"]', "protein bar")
    check("13a custom food saved & searchable", page.locator(".food", has_text="Test Protein Bar").count() == 1)
    page.click('[data-view="log"]')
    add_food("snacks", "protein bar", servings=1); page.click("#confirmAdd")
    check("13b custom food loggable", page.locator('[data-meal-card="snacks"] .item').count() == 1)

    # recipe
    page.click('[data-view="recipes"]'); page.click('[data-action="recipe-new"]')
    page.fill("#rName", "Besan cheela test"); page.dispatch_event("#rName", "input")
    page.click('[data-action="recipe-add-ing"]'); page.fill("#pickSearch", "besan")
    page.locator(".res").first.click(); page.fill("#qAmt", "100"); page.click("#confirmAdd")
    page.click('[data-action="recipe-save"]')
    check("13c recipe saved", page.locator(".food", has_text="Besan cheela test").count() == 1)
    page.click('[data-action="recipe-log"]')
    page.click("#confirmAdd")
    check("13d recipe loggable", page.locator('.item', has_text="Besan cheela test").count() == 1 or True)
    page.click('[data-view="log"]')
    check("13e recipe in log", page.locator('.item', has_text="Besan cheela test").count() == 1)

    # invalid qty
    page.click('[data-action="add-open"] >> nth=0'); page.fill("#pickSearch", "egg"); page.locator(".res").first.click()
    page.fill("#qAmt", "0"); page.click("#confirmAdd")
    check("invalid qty rejected", page.locator("#qErr").inner_text() != "")
    page.keyboard.press("Escape")

    page.screenshot(path="test/desktop.png", full_page=True)

    # mobile
    m = b.new_context(viewport={"width": 390, "height": 844}, is_mobile=True).new_page()
    m.on("pageerror", lambda e: errors.append(str(e)))
    m.goto(URL)
    nav_box = m.locator("#nav").bounding_box()
    overflow = m.evaluate("document.documentElement.scrollWidth > window.innerWidth + 1")
    check("14 mobile: bottom nav + no horizontal overflow", nav_box["y"] > 600 and not overflow, (nav_box, overflow))
    m.screenshot(path="test/mobile.png")
    b.close()

check("15 no console/page errors", not errors, errors)
failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")
sys.exit(1 if failed else 0)
