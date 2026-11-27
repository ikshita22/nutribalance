# NutriBalance

NutriBalance is a small nutrition tracker that runs in your browser. Log what you eat, check your daily totals, and compare them with targets you set yourself. There's no account to create and no backend to set up.

## What you can do

- Search the built-in food list, including Indian dishes and everyday ingredients.
- Log breakfast, lunch, dinner, and snacks by date, using servings or amounts in grams or millilitres.
- Edit quantities and see calories, protein, carbohydrates, fat, fibre, and sugar recalculate.
- Check remaining targets, meal breakdowns, and short insights based on your log.
- Add custom foods from a package label, or build recipes from ingredients. Recipes can use a final cooked weight.
- Set daily targets, export your data as JSON, or delete the data saved in this browser.

The layout works on desktop and narrow screens, with bottom navigation on mobile.

## Run locally

You'll need Python 3. If you want to use the npm shortcuts, you'll also need Node.js and npm. There are no application packages to install and no build step.

From the project directory:

```sh
python -m http.server 8080 --bind 127.0.0.1
```

Or, with npm:

```sh
npm start -- --bind 127.0.0.1
```

Open [localhost:8080/index.html](http://localhost:8080/index.html). Keep the terminal running while you use the app, and press Ctrl+C when you're done.

If your system calls Python 3 `python3`, use that name instead of `python` in the direct commands.

## How it fits together

This is a static site made with HTML, CSS, and plain JavaScript. The local server only serves files; it doesn't calculate nutrition or store meal logs.

| File | Job |
| --- | --- |
| `index.html` | Page shell; loads the stylesheet and the three JavaScript files. |
| `styles.css` | Desktop and mobile layouts, cards, navigation, and dialogs. |
| `foods.js` | Built-in foods, per-100 g/ml nutrition values, serving sizes, and source notes. |
| `nutrition.js` | Quantity scaling, meal and day totals, target balances, and recipe calculations. |
| `app.js` | Screens, search, user actions, input validation, and browser storage. |
| `e2e.py` | Playwright browser checks for the app's main flows and editing regressions. |

`index.html` loads `nutrition.js` and `foods.js` before `app.js`. The app combines the built-in foods with your custom foods and recipes, passes quantities to the nutrition helpers, and renders the results. Changes to logs, targets, custom foods, and recipes are saved in `localStorage`.

Logged entries keep a copy of their nutrition values, so editing or deleting a custom food or recipe doesn't change meals you've already logged.

## Your data

Your records stay in this browser. The app doesn't send meal logs to a server, use an external nutrition API, or include analytics. It can work without an internet connection while the local server is running.

Browser storage isn't a backup. Clearing site data, switching browsers, or using a different address or port gives you a different storage area. Private browsing may discard records when you close it. If storage is unavailable, the app shows a warning and changes may not persist.

Use **Settings > Export data (JSON)** to keep a copy. There is currently no import or sync feature. The export contains your logs and targets, so treat it as personal data.

## Run the browser checks

The tests use Python Playwright and its Chromium browser. Install them once:

```sh
python -m pip install playwright
python -m playwright install chromium
```

Start the app as described above. In a second terminal, run:

```sh
npm test
```

Without npm, or to test a different server address:

```sh
python e2e.py
python e2e.py http://localhost:8080/index.html
```

The suite checks meal logging, nutrition totals, edits, refresh persistence, date changes, target changes, custom foods, recipes, invalid quantities, mobile layout, and browser errors. It also checks that clicking after editing a field works the first time, including on an emulated mobile screen.

Screenshots are written to `test/desktop.png` and `test/mobile.png`. Set the `NB_SCREENSHOT_DIR` environment variable to use another folder. Tests use fresh browser contexts and clear storage in those contexts, not in your regular browser profile.

## A few limits

Food values are approximate. Many starter entries are estimates or have unverified source notes; they aren't lab measurements. Check labels for packaged foods and add your own values when accuracy matters.

Recipe totals come from the ingredients you enter. Cooked weight changes the per-100 g result, but the app doesn't model oil absorption or nutrient changes during cooking.

The initial targets are demo values, not personalised recommendations. The insights describe your logged intake; they aren't medical advice.

Browser checks use Chromium and mobile emulation. They don't replace checking physical phones, Safari, or Firefox.
