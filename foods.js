/* NutriBalance - built-in starter food database (offline).
 * All values are per 100 g (or per 100 ml where unit = 'ml').
 * Confidence: 'ref' = matched to a published reference record during the current audit,
 *             'est' = estimate or not yet verified; actual values may vary widely.
 * NOTE: values are approximate reference-based figures entered for this starter set, not laboratory
 * measurements. Check packaged-food labels and edit/add custom foods for precision.
 */
(function (root) {
  'use strict';
  var U = 'Unverified: USDA record not captured; limited audit blocked by API rate limit';
  var I = 'Unverified: IFCT/USDA record not captured; limited audit blocked by API rate limit';
  var E = 'Generic estimate (varies by recipe)';
  var R = 'est', S = 'est';

  // [name, category, form, kcal, protein, carbs, fat, fiber, sugar, servingQty, servingLabel, confidence, source, unit?]
  var rows = [
    // ---- Indian Breakfast
    ['Poha (prepared, with oil & onion)', 'Indian Breakfast', 'prepared', 130, 2.6, 25, 2.5, 1, 1.5, 150, '1 plate', S, E],
    ['Upma (prepared)', 'Indian Breakfast', 'prepared', 140, 3.5, 22, 4.5, 1.5, 1.5, 200, '1 bowl', S, E],
    ['Idli (steamed)', 'Indian Breakfast', 'cooked', 130, 3.9, 26, 0.4, 1, 0.5, 40, '1 idli', S, E],
    ['Dosa, plain (prepared)', 'Indian Breakfast', 'prepared', 168, 3.9, 29, 3.7, 1, 1, 90, '1 dosa', S, E],
    ['Masala dosa (prepared)', 'Indian Breakfast', 'prepared', 190, 4, 28, 7, 1.5, 1.5, 150, '1 dosa', S, E],
    ['Besan cheela (home-style, est.)', 'Indian Breakfast', 'prepared', 190, 8, 24, 7, 4, 2, 80, '1 cheela', S, E],
    ['Moong dal cheela (home-style, est.)', 'Indian Breakfast', 'prepared', 170, 9, 22, 5, 4, 1, 80, '1 cheela', S, E],
    ['Aloo paratha (with oil)', 'Indian Breakfast', 'prepared', 260, 5.5, 38, 10, 3, 1, 100, '1 paratha', S, E],
    ['Plain paratha (with oil)', 'Indian Breakfast', 'prepared', 300, 7, 42, 12, 3, 1, 80, '1 paratha', S, E],
    ['Medu vada (fried)', 'Indian Breakfast', 'fried', 270, 8, 25, 15, 3, 1, 45, '1 vada', S, E],
    ['Sambar (prepared)', 'Indian Breakfast', 'prepared', 50, 2.5, 7, 1.5, 2, 2, 200, '1 bowl', S, E],
    ['Coconut chutney (prepared)', 'Indian Breakfast', 'prepared', 170, 2, 7, 15, 4, 2, 30, '2 tbsp', S, E],
    ['Dhokla (steamed)', 'Indian Breakfast', 'cooked', 160, 6, 25, 4, 2, 4, 60, '2 pieces', S, E],
    ['Thepla (prepared)', 'Indian Breakfast', 'prepared', 290, 8, 40, 11, 5, 2, 40, '1 thepla', S, E],

    // ---- Grains & Breads
    ['Rice, white, cooked', 'Grains & Breads', 'cooked', 130, 2.7, 28, 0.3, 0.4, 0.1, 150, '1 cup (~1 katori)', R, U],
    ['Rice, brown, cooked', 'Grains & Breads', 'cooked', 123, 2.7, 25.6, 1, 1.6, 0.2, 150, '1 cup', R, U],
    ['Rice, basmati, cooked', 'Grains & Breads', 'cooked', 121, 3.5, 25, 0.4, 0.7, 0.1, 150, '1 cup', S, E],
    ['Roti / chapati (whole wheat, no oil)', 'Grains & Breads', 'cooked', 290, 9.5, 54, 3.5, 6, 1, 40, '1 roti', S, E],
    ['Roti / chapati with ghee (1 tsp each)', 'Grains & Breads', 'prepared', 330, 8.5, 50, 9, 5.5, 1, 45, '1 roti', S, E],
    ['Naan (prepared)', 'Grains & Breads', 'prepared', 290, 9, 50, 5, 2, 3, 90, '1 naan', S, E],
    ['Poori (fried)', 'Grains & Breads', 'fried', 330, 7, 42, 15, 3, 1, 30, '1 poori', S, E],
    ['Bread, white', 'Grains & Breads', 'ready-to-eat', 265, 9, 49, 3.2, 2.7, 5, 28, '1 slice', R, U],
    ['Bread, whole wheat', 'Grains & Breads', 'ready-to-eat', 252, 12.3, 42.7, 3.5, 6, 5.7, 30, '1 slice', R, U],
    ['Oats, rolled (dry)', 'Grains & Breads', 'dry', 389, 16.9, 66.3, 6.9, 10.6, 0.9, 40, '1/2 cup dry', R, U],
    ['Oats porridge (cooked in water)', 'Grains & Breads', 'cooked', 71, 2.5, 12, 1.5, 1.7, 0.3, 250, '1 bowl', R, U],
    ['Quinoa, cooked', 'Grains & Breads', 'cooked', 120, 4.4, 21.3, 1.9, 2.8, 0.9, 185, '1 cup', R, U],
    ['Pasta, cooked', 'Grains & Breads', 'cooked', 158, 5.8, 30.9, 0.9, 1.8, 0.6, 140, '1 cup', R, U],
    ['Cornflakes (breakfast cereal)', 'Grains & Breads', 'ready-to-eat', 357, 7.5, 84, 0.4, 3.3, 8, 30, '1 bowl', R, U],
    ['Muesli (generic, est.)', 'Grains & Breads', 'dry', 340, 10, 66, 5, 7, 15, 50, '1/2 cup', S, E],
    ['Vegetable pulao (prepared)', 'Grains & Breads', 'prepared', 150, 3, 24, 4.5, 1.5, 1, 200, '1 plate', S, E],
    ['Khichdi (rice & dal, prepared)', 'Grains & Breads', 'prepared', 120, 4.5, 19, 3, 2, 1, 250, '1 bowl', S, E],
    ['Chicken biryani (prepared)', 'Grains & Breads', 'prepared', 170, 8, 21, 6, 1, 1, 250, '1 plate', S, E],
    ['Curd rice (prepared)', 'Grains & Breads', 'prepared', 120, 3.5, 20, 3, 0.5, 2, 200, '1 bowl', S, E],

    // ---- Protein Sources
    ['Egg, whole, boiled', 'Protein Sources', 'cooked', 155, 12.6, 1.1, 10.6, 0, 1.1, 50, '1 egg', R, U],
    ['Egg white, boiled', 'Protein Sources', 'cooked', 52, 10.9, 0.7, 0.2, 0, 0.7, 33, '1 egg white', R, U],
    ['Omelette (plain, cooked in oil)', 'Protein Sources', 'prepared', 154, 10.6, 0.6, 11.7, 0, 0.6, 60, '1-egg omelette', R, U],
    ['Egg bhurji (prepared)', 'Protein Sources', 'prepared', 170, 10, 3, 13, 0.5, 2, 100, '1 serving', S, E],
    ['Chicken breast, cooked (skinless)', 'Protein Sources', 'cooked', 165, 31, 0, 3.6, 0, 0, 100, '100 g', R, U],
    ['Chicken thigh, cooked (skinless)', 'Protein Sources', 'cooked', 209, 26, 0, 10.9, 0, 0, 100, '100 g', R, U],
    ['Chicken curry (home-style)', 'Protein Sources', 'prepared', 130, 12, 4, 7, 1, 2, 200, '1 bowl', S, E],
    ['Tandoori chicken (prepared)', 'Protein Sources', 'prepared', 150, 22, 3, 5, 0.5, 1, 150, '1 serving', S, E],
    ['Fish curry (home-style)', 'Protein Sources', 'prepared', 110, 12, 3, 5, 0.5, 1, 200, '1 bowl', S, E],
    ['Salmon, cooked', 'Protein Sources', 'cooked', 206, 22.1, 0, 12.4, 0, 0, 100, '100 g', R, U],
    ['Tilapia, cooked', 'Protein Sources', 'cooked', 128, 26, 0, 2.7, 0, 0, 100, '100 g', R, U],
    ['Tuna, canned in water', 'Protein Sources', 'ready-to-eat', 116, 25.5, 0, 0.8, 0, 0, 100, '100 g', R, U],
    ['Prawns / shrimp, cooked', 'Protein Sources', 'cooked', 99, 24, 0.2, 0.3, 0, 0, 100, '100 g', R, U],
    ['Mutton curry (home-style)', 'Protein Sources', 'prepared', 190, 15, 4, 12, 1, 2, 200, '1 bowl', S, E],
    ['Paneer (full fat)', 'Protein Sources', 'raw', 265, 18, 1.2, 21, 0, 1.2, 50, '50 g cube', R, I],
    ['Paneer bhurji / curry (home-style)', 'Protein Sources', 'prepared', 200, 10, 6, 15, 1, 3, 150, '1 bowl', S, E],
    ['Tofu, regular, raw', 'Protein Sources', 'raw', 76, 8.1, 1.9, 4.8, 0.3, 0.6, 100, '100 g', R, U],
    ['Soya chunks, dry', 'Protein Sources', 'dry', 345, 52, 33, 0.5, 13, 0, 30, '30 g dry', S, 'Typical pack label / IFCT (approx.)'],
    ['Soya chunks, boiled', 'Protein Sources', 'cooked', 115, 17, 11, 0.2, 4.5, 0, 100, '100 g boiled', S, E],
    ['Whey protein powder (generic)', 'Protein Sources', 'packaged', 400, 78, 8, 6, 0, 4, 30, '1 scoop', S, 'Generic; check your product label'],
    ['Greek yogurt, plain, nonfat', 'Protein Sources', 'ready-to-eat', 59, 10.2, 3.6, 0.4, 0, 3.2, 170, '1 cup', R, U],
    ['Cottage cheese (Western style)', 'Protein Sources', 'ready-to-eat', 98, 11.1, 3.4, 4.3, 0, 2.7, 113, '1/2 cup', R, U],
    ['Peanut butter', 'Protein Sources', 'packaged', 588, 25, 20, 50, 6, 9, 16, '1 tbsp', R, U],

    // ---- Legumes
    ['Dal, toor/arhar (thin, home-style, cooked)', 'Legumes', 'prepared', 90, 5, 13, 2, 3, 1, 150, '1 bowl', S, E],
    ['Dal tadka (thick, with ghee/oil)', 'Legumes', 'prepared', 120, 6, 15, 4, 3, 1.5, 150, '1 bowl', S, E],
    ['Moong dal, boiled (plain)', 'Legumes', 'cooked', 105, 7, 19.2, 0.4, 7.6, 2, 150, '1 bowl', R, U],
    ['Masoor dal, boiled (plain)', 'Legumes', 'cooked', 116, 9, 20, 0.4, 7.9, 1.8, 150, '1 bowl', R, U],
    ['Chickpeas (chana), boiled', 'Legumes', 'cooked', 164, 8.9, 27.4, 2.6, 7.6, 4.8, 150, '1 katori', R, U],
    ['Rajma (kidney beans), boiled', 'Legumes', 'cooked', 127, 8.7, 22.8, 0.5, 6.4, 0.3, 150, '1 katori', R, U],
    ['Rajma curry (home-style)', 'Legumes', 'prepared', 110, 5.5, 16, 3, 4, 2, 200, '1 bowl', S, E],
    ['Chole masala (home-style)', 'Legumes', 'prepared', 150, 6.5, 20, 5, 5, 3, 200, '1 bowl', S, E],
    ['Black beans, boiled', 'Legumes', 'cooked', 132, 8.9, 23.7, 0.5, 8.7, 0.3, 150, '1 katori', R, U],
    ['Sprouts, moong (raw)', 'Legumes', 'raw', 30, 3, 6, 0.2, 1.8, 4.3, 100, '1 cup', R, U],
    ['Hummus', 'Legumes', 'ready-to-eat', 166, 7.9, 14.3, 9.6, 6, 0.3, 30, '2 tbsp', R, U],

    // ---- Dairy
    ['Milk, whole', 'Dairy', 'ready-to-eat', 61, 3.2, 4.8, 3.3, 0, 5.1, 250, '1 glass', R, U, 'ml'],
    ['Milk, toned (Indian, approx.)', 'Dairy', 'ready-to-eat', 58, 3.1, 4.7, 3, 0, 4.7, 250, '1 glass', S, I, 'ml'],
    ['Milk, skimmed', 'Dairy', 'ready-to-eat', 34, 3.4, 5, 0.1, 0, 5, 250, '1 glass', R, U, 'ml'],
    ['Curd / dahi, plain (whole milk)', 'Dairy', 'ready-to-eat', 61, 3.5, 4.7, 3.3, 0, 4.7, 100, '1 katori', R, U],
    ['Buttermilk / chaas', 'Dairy', 'ready-to-eat', 40, 3.3, 4.8, 0.9, 0, 4.8, 200, '1 glass', R, U, 'ml'],
    ['Lassi, sweet (est.)', 'Dairy', 'prepared', 70, 2.5, 11, 2, 0, 10, 250, '1 glass', S, E, 'ml'],
    ['Cheddar cheese', 'Dairy', 'ready-to-eat', 403, 24.9, 1.3, 33.1, 0, 0.5, 20, '1 slice', R, U],
    ['Mozzarella (low moisture, whole milk)', 'Dairy', 'ready-to-eat', 300, 22.2, 2.2, 22.4, 0, 1, 28, '1 oz', R, U],
    ['Processed cheese slice (generic)', 'Dairy', 'packaged', 330, 18, 6, 25, 0, 4, 20, '1 slice', S, 'Generic; check label'],
    ['Ghee', 'Dairy', 'ready-to-eat', 876, 0.3, 0, 99.5, 0, 0, 5, '1 tsp', R, U],
    ['Butter', 'Dairy', 'ready-to-eat', 717, 0.9, 0.1, 81, 0, 0.1, 5, '1 tsp', R, U],

    // ---- Vegetables
    ['Potato, boiled', 'Vegetables', 'cooked', 87, 1.9, 20.1, 0.1, 1.8, 0.9, 150, '1 medium', R, U],
    ['Sweet potato, baked', 'Vegetables', 'cooked', 90, 2, 20.7, 0.2, 3.3, 6.5, 130, '1 medium', R, U],
    ['Onion, raw', 'Vegetables', 'raw', 40, 1.1, 9.3, 0.1, 1.7, 4.2, 70, '1 small', R, U],
    ['Tomato, raw', 'Vegetables', 'raw', 18, 0.9, 3.9, 0.2, 1.2, 2.6, 100, '1 medium', R, U],
    ['Cucumber, raw', 'Vegetables', 'raw', 15, 0.7, 3.6, 0.1, 0.5, 1.7, 100, '1 cup sliced', R, U],
    ['Carrot, raw', 'Vegetables', 'raw', 41, 0.9, 9.6, 0.2, 2.8, 4.7, 60, '1 medium', R, U],
    ['Spinach (palak), raw', 'Vegetables', 'raw', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 100, '100 g', R, U],
    ['Cauliflower, raw', 'Vegetables', 'raw', 25, 1.9, 5, 0.3, 2, 1.9, 100, '100 g', R, U],
    ['Cabbage, raw', 'Vegetables', 'raw', 25, 1.3, 5.8, 0.1, 2.5, 3.2, 100, '100 g', R, U],
    ['Broccoli, raw', 'Vegetables', 'raw', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 100, '100 g', R, U],
    ['Okra (bhindi), raw', 'Vegetables', 'raw', 33, 1.9, 7.5, 0.2, 3.2, 1.5, 100, '100 g', R, U],
    ['Brinjal / eggplant, raw', 'Vegetables', 'raw', 25, 1, 5.9, 0.2, 3, 3.5, 100, '100 g', R, U],
    ['Green peas, boiled', 'Vegetables', 'cooked', 84, 5.4, 15.6, 0.2, 5.5, 5.9, 100, '1/2 cup', R, U],
    ['Capsicum (green bell pepper), raw', 'Vegetables', 'raw', 20, 0.9, 4.6, 0.2, 1.7, 2.4, 100, '1 medium', R, U],
    ['Mushrooms, raw', 'Vegetables', 'raw', 22, 3.1, 3.3, 0.3, 1, 2, 100, '1 cup', R, U],
    ['Sweet corn, boiled', 'Vegetables', 'cooked', 96, 3.4, 21, 1.5, 2.4, 4.5, 100, '1/2 cup', R, U],
    ['Mixed vegetable sabzi (home-style)', 'Vegetables', 'prepared', 85, 2, 9, 4.5, 3, 3, 150, '1 katori', S, E],
    ['Aloo gobi (home-style)', 'Vegetables', 'prepared', 100, 2.5, 12, 5, 2.5, 2, 150, '1 katori', S, E],
    ['Palak paneer (home-style)', 'Vegetables', 'prepared', 150, 6.5, 6, 11, 2, 2, 150, '1 katori', S, E],

    // ---- Fruits
    ['Banana', 'Fruits', 'raw', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 120, '1 medium (peeled)', R, U],
    ['Apple', 'Fruits', 'raw', 52, 0.3, 13.8, 0.2, 2.4, 10.4, 180, '1 medium', R, U],
    ['Orange', 'Fruits', 'raw', 47, 0.9, 11.8, 0.1, 2.4, 9.4, 130, '1 medium', R, U],
    ['Mango', 'Fruits', 'raw', 60, 0.8, 15, 0.4, 1.6, 13.7, 165, '1 cup pieces', R, U],
    ['Grapes', 'Fruits', 'raw', 69, 0.7, 18.1, 0.2, 0.9, 15.5, 100, '1 cup', R, U],
    ['Papaya', 'Fruits', 'raw', 43, 0.5, 10.8, 0.3, 1.7, 7.8, 150, '1 cup pieces', R, U],
    ['Watermelon', 'Fruits', 'raw', 30, 0.6, 7.6, 0.2, 0.4, 6.2, 150, '1 cup pieces', R, U],
    ['Pomegranate (arils)', 'Fruits', 'raw', 83, 1.7, 18.7, 1.2, 4, 13.7, 100, '1/2 cup', R, U],
    ['Guava', 'Fruits', 'raw', 68, 2.6, 14.3, 1, 5.4, 8.9, 100, '1 medium', R, U],
    ['Pineapple', 'Fruits', 'raw', 50, 0.5, 13.1, 0.1, 1.4, 9.9, 100, '1 cup pieces', R, U],
    ['Dates (Medjool)', 'Fruits', 'dry', 277, 1.8, 74.9, 0.2, 6.7, 66.5, 24, '1 date', R, U],
    ['Raisins', 'Fruits', 'dry', 299, 3.1, 79.2, 0.5, 3.7, 59.2, 15, '1 small box', R, U],
    ['Avocado', 'Fruits', 'raw', 160, 2, 8.5, 14.7, 6.7, 0.7, 100, '1/2 avocado', R, U],
    ['Coconut, fresh', 'Fruits', 'raw', 354, 3.3, 15.2, 33.5, 9, 6.2, 30, '1 piece', R, U],

    // ---- Nuts & Seeds
    ['Almonds', 'Nuts & Seeds', 'dry', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 28, '1 handful', R, U],
    ['Cashews', 'Nuts & Seeds', 'dry', 553, 18.2, 30.2, 43.8, 3.3, 5.9, 28, '1 handful', R, U],
    ['Walnuts', 'Nuts & Seeds', 'dry', 654, 15.2, 13.7, 65.2, 6.7, 2.6, 28, '1 handful', R, U],
    ['Peanuts, roasted', 'Nuts & Seeds', 'dry', 587, 24, 21.5, 49.7, 8, 4.2, 28, '1 handful', R, U],
    ['Pistachios', 'Nuts & Seeds', 'dry', 560, 20.2, 27.2, 45.3, 10.6, 7.7, 28, '1 handful', R, U],
    ['Chia seeds', 'Nuts & Seeds', 'dry', 486, 16.5, 42.1, 30.7, 34.4, 0, 12, '1 tbsp', R, U],
    ['Flax seeds', 'Nuts & Seeds', 'dry', 534, 18.3, 28.9, 42.2, 27.3, 1.6, 10, '1 tbsp', R, U],
    ['Sunflower seeds', 'Nuts & Seeds', 'dry', 584, 20.8, 20, 51.5, 8.6, 2.6, 15, '1 tbsp+', R, U],
    ['Pumpkin seeds', 'Nuts & Seeds', 'dry', 559, 30.2, 10.7, 49, 6, 1.4, 15, '1 tbsp+', R, U],

    // ---- Snacks & Sweets
    ['Samosa (fried, potato)', 'Snacks & Sweets', 'fried', 262, 4.5, 28, 14, 2.5, 2, 60, '1 samosa', S, E],
    ['Pakora / bhajia (fried)', 'Snacks & Sweets', 'fried', 280, 6, 28, 16, 4, 2, 80, '4 pieces', S, E],
    ['Biscuit, Marie-type (est.)', 'Snacks & Sweets', 'packaged', 440, 7, 74, 12, 2, 20, 8, '1 biscuit', S, 'Generic; check label'],
    ['Potato chips', 'Snacks & Sweets', 'packaged', 536, 7, 52.9, 34.6, 4.4, 0.3, 28, '1 small pack', R, U],
    ['Gulab jamun', 'Snacks & Sweets', 'prepared', 300, 4, 45, 12, 0.5, 35, 50, '1 piece', S, E],
    ['Jalebi', 'Snacks & Sweets', 'fried', 380, 2, 66, 12, 0.5, 50, 60, '2 pieces', S, E],
    ['Rasgulla', 'Snacks & Sweets', 'prepared', 186, 4.5, 38, 1, 0, 30, 50, '1 piece', S, E],
    ['Besan laddu', 'Snacks & Sweets', 'prepared', 450, 8, 55, 22, 3, 30, 40, '1 laddu', S, E],
    ['Kheer (rice pudding)', 'Snacks & Sweets', 'prepared', 130, 3.5, 20, 4, 0.2, 14, 150, '1 bowl', S, E],
    ['Ice cream, vanilla', 'Snacks & Sweets', 'ready-to-eat', 207, 3.5, 23.6, 11, 0.7, 21.2, 66, '1/2 cup', R, U],
    ['Dark chocolate (70-85% cacao)', 'Snacks & Sweets', 'ready-to-eat', 598, 7.8, 45.9, 42.6, 10.9, 24, 20, '2 squares', R, U],
    ['Milk chocolate', 'Snacks & Sweets', 'ready-to-eat', 535, 7.7, 59.4, 29.7, 3.4, 51.5, 25, '1 small bar', R, U],
    ['Instant noodles, dry (generic, est.)', 'Snacks & Sweets', 'packaged', 450, 9, 62, 18, 2, 2, 70, '1 pack (dry)', S, 'Generic; check your pack label'],

    // ---- Fast Food
    ['Pizza, cheese (slice)', 'Fast Food', 'prepared', 266, 11, 33, 10, 2.3, 3.6, 107, '1 slice', R, U],
    ['Veg burger (generic, est.)', 'Fast Food', 'prepared', 250, 7, 33, 10, 2.5, 5, 150, '1 burger', S, E],
    ['Chicken burger (generic, est.)', 'Fast Food', 'prepared', 260, 13, 28, 10, 1.5, 5, 170, '1 burger', S, E],
    ['French fries', 'Fast Food', 'fried', 312, 3.4, 41, 15, 3.8, 0.3, 100, '1 medium', R, U],
    ['Pav bhaji (prepared)', 'Fast Food', 'prepared', 150, 3.5, 20, 6, 3, 3, 250, '1 plate', S, E],
    ['Vada pav (prepared)', 'Fast Food', 'prepared', 250, 5.5, 35, 10, 3, 3, 130, '1 vada pav', S, E],

    // ---- Beverages
    ['Tea with milk & sugar (est.)', 'Beverages', 'prepared', 45, 1.2, 6.5, 1.5, 0, 6, 150, '1 cup', S, E, 'ml'],
    ['Coffee, black (no sugar)', 'Beverages', 'prepared', 2, 0.1, 0, 0, 0, 0, 240, '1 cup', R, U, 'ml'],
    ['Orange juice', 'Beverages', 'ready-to-eat', 45, 0.7, 10.4, 0.2, 0.2, 8.4, 250, '1 glass', R, U, 'ml'],
    ['Coconut water', 'Beverages', 'ready-to-eat', 19, 0.7, 3.7, 0.2, 1.1, 2.6, 240, '1 cup', R, U, 'ml'],
    ['Cola', 'Beverages', 'packaged', 42, 0, 10.6, 0, 0, 10.6, 250, '1 glass', R, U, 'ml'],
    ['Soy milk, unsweetened', 'Beverages', 'ready-to-eat', 33, 2.9, 1.7, 1.6, 0.4, 0.9, 250, '1 glass', R, U, 'ml'],

    // ---- Fats & Sugars
    ['Sugar, white', 'Fats & Sugars', 'dry', 387, 0, 100, 0, 0, 100, 5, '1 tsp', R, U],
    ['Honey', 'Fats & Sugars', 'ready-to-eat', 304, 0.3, 82.4, 0, 0.2, 82.1, 21, '1 tbsp', R, U],
    ['Jaggery (gur)', 'Fats & Sugars', 'dry', 383, 0.4, 98, 0.1, 0, 97, 10, '1 small piece', S, I],
    ['Cooking oil (vegetable)', 'Fats & Sugars', 'raw', 884, 0, 0, 100, 0, 0, 5, '1 tsp', R, U],

    // ---- Raw Ingredients (useful for recipes)
    ['Wheat flour (atta), whole wheat, raw', 'Raw Ingredients', 'raw', 340, 12, 71, 1.7, 11, 0.4, 100, '100 g', R, I],
    ['Besan (chickpea flour), raw', 'Raw Ingredients', 'raw', 387, 22, 57.8, 6.7, 10.8, 10.9, 100, '100 g', R, U],
    ['Rice, white, raw', 'Raw Ingredients', 'raw', 365, 7.1, 80, 0.7, 1.3, 0.1, 100, '100 g', R, U],
    ['Toor/arhar dal, raw', 'Raw Ingredients', 'raw', 335, 22.3, 57.6, 1.7, 15.5, 0, 100, '100 g', R, I],
    ['Moong dal, raw', 'Raw Ingredients', 'raw', 347, 23.9, 62.6, 1.2, 16.3, 6.7, 100, '100 g', R, U],
    ['Masoor dal, raw', 'Raw Ingredients', 'raw', 352, 24.6, 63.4, 1.1, 10.7, 2, 100, '100 g', R, U],
    ['Chickpeas (chana), dry', 'Raw Ingredients', 'raw', 378, 20.5, 62.9, 6, 12.2, 10.7, 100, '100 g', R, U],
    ['Rajma (kidney beans), dry', 'Raw Ingredients', 'raw', 333, 23.6, 60, 0.8, 24.9, 2.2, 100, '100 g', R, U],
    ['Semolina (suji/rava), raw', 'Raw Ingredients', 'raw', 360, 12.7, 72.8, 1.1, 3.9, 0, 100, '100 g', R, U],
    ['Poha (flattened rice), raw', 'Raw Ingredients', 'raw', 346, 6.6, 77.3, 1.2, 1, 0, 100, '100 g', R, I]
  ];

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  var foods = rows.map(function (r) {
    return {
      id: 'b_' + slug(r[0]),
      name: r[0], category: r[1], form: r[2],
      per100: { calories: r[3], protein: r[4], carbs: r[5], fat: r[6], fiber: r[7], sugar: r[8] },
      servingQty: r[9], servingLabel: r[10], confidence: r[11], source: r[12], unit: r[13] || 'g'
    };
  });

  var api = { foods: foods };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NB_FOODS = api;
})(typeof window !== 'undefined' ? window : globalThis);
