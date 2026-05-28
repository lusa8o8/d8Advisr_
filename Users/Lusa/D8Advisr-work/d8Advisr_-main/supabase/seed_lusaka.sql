-- D8Advisr — Lusaka venue seed data
-- Run with: supabase db push (after adding to migrations) or via Supabase SQL editor

-- ─── Lusaka Venues ───────────────────────────────────────────────────────────

insert into public.venues (
  name, slug, city, area, category, tier, price_tier,
  description, address, lat, lng,
  cover_image, vibes, rating, review_count, avg_cost_pp,
  is_active, is_hidden_gem
) values

-- ── VERIFIED TIER ─────────────────────────────────────────────────────────────

(
  'Latitude 15°',
  'latitude-15-lusaka',
  'Lusaka', 'Kabulonga',
  'Restaurant & Bar',
  'Verified', '$$$',
  'Lusaka''s most iconic rooftop dining experience. Sweeping views of the city, carefully crafted cocktails, and a menu that celebrates Zambian produce with a contemporary twist. The place for a date that needs to impress.',
  'Lat 15° Hotel, 1 Katima Mulilo Rd, Kabulonga',
  -15.4015, 28.3194,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
  ARRAY['Romantic','Scenic','Fine Dining','Cocktails'],
  4.7, 312,
  55,
  true, false
),

(
  'Rhapsody''s Lusaka',
  'rhapsodys-lusaka',
  'Lusaka', 'Longacres',
  'Restaurant & Bar',
  'Verified', '$$$',
  'A Zambian institution. Warm open-air terrace, live music on weekends, and a menu strong on grills and local fish. The energy here on a Friday evening is unmatched — lively without being loud.',
  'Longacres, Lusaka',
  -15.4167, 28.3083,
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&h=400&fit=crop&auto=format',
  ARRAY['Lively','Live Music','Date Night','Grills'],
  4.5, 489,
  40,
  true, false
),

(
  'Sugarbush Café',
  'sugarbush-cafe-lusaka',
  'Lusaka', 'Kabulonga',
  'Café & Brunch',
  'Verified', '$$',
  'The gold standard for Lusaka brunch dates. Garden setting with jacaranda shade, farm-to-table food, excellent coffee. Low-key and genuinely lovely — perfect for a relaxed daytime date with no pressure.',
  'Kabulonga Shopping Centre, Lusaka',
  -15.3972, 28.3211,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop&auto=format',
  ARRAY['Relaxed','Brunch','Garden','Cozy','Coffee'],
  4.6, 276,
  20,
  true, false
),

(
  'Zebra Crossing',
  'zebra-crossing-lusaka',
  'Lusaka', 'Olympia',
  'Restaurant & Bar',
  'Verified', '$$',
  'A favourite with Lusaka''s creative crowd. Exposed brick, mismatched furniture, craft beers on tap, and a menu that punches well above its price point. Great for a first date where you want to keep things relaxed but still feel intentional.',
  'Olympia Park, Lusaka',
  -15.4056, 28.3278,
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop&auto=format',
  ARRAY['Casual','Creative','Craft Beer','Affordable'],
  4.4, 198,
  25,
  true, false
),

(
  'The Mint Lounge',
  'mint-lounge-lusaka',
  'Lusaka', 'Woodlands',
  'Cocktail Bar & Lounge',
  'Verified', '$$$',
  'Lusaka''s most polished cocktail bar. Sleek interior, inventive drinks menu, and a playlist that gets it right. One of the few places in the city where you can linger over a Negroni without feeling rushed. Ideal for a late-evening second stop.',
  'Woodlands Extension, Lusaka',
  -15.3889, 28.3444,
  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600&h=400&fit=crop&auto=format',
  ARRAY['Cocktails','Sophisticated','Nightlife','Date Night'],
  4.6, 143,
  35,
  true, false
),

(
  'Chit Chat Restaurant',
  'chit-chat-lusaka',
  'Lusaka', 'Jesmondine',
  'Restaurant',
  'Verified', '$$',
  'A Lusaka classic that''s been feeding the city for decades. Zambian staples done right — nshima, kapenta, village chicken — in a no-frills environment that feels genuinely Zambian. Perfect for introducing someone to local cuisine.',
  'Jesmondine, Lusaka',
  -15.3944, 28.3556,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
  ARRAY['Local Cuisine','Authentic','Casual','Affordable'],
  4.3, 367,
  15,
  true, false
),

-- ── D8 APPROVED TIER ──────────────────────────────────────────────────────────

(
  'Nomads',
  'nomads-lusaka',
  'Lusaka', 'Leopards Hill',
  'Restaurant & Bar',
  'D8 Approved', '$$$',
  'Set in a converted farmhouse on the city outskirts, Nomads offers a genuinely different Lusaka evening — garden seating under the stars, wood-fired grills, and a wine list that travels. The drive out is part of the experience.',
  'Leopards Hill Rd, Lusaka',
  -15.4556, 28.3889,
  'https://images.unsplash.com/photo-1544148103-0773bf10d330?w=600&h=400&fit=crop&auto=format',
  ARRAY['Scenic','Romantic','Outdoor','Wine','Grills'],
  4.5, 156,
  50,
  true, false
),

(
  'Luangwa Brasserie',
  'luangwa-brasserie-lusaka',
  'Lusaka', 'Ridgeway',
  'Fine Dining',
  'D8 Approved', '$$$$',
  'The most refined dinner option in Lusaka''s hotel strip. French-influenced menu with strong local sourcing — Luangwa river fish, Zambian mushrooms, village honey. Best for a milestone date or anniversary.',
  'Ridgeway Hotel, Lusaka',
  -15.4111, 28.2944,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&h=400&fit=crop&auto=format',
  ARRAY['Fine Dining','Anniversary','Romantic','Quiet'],
  4.4, 89,
  80,
  true, false
),

(
  'Chez Ntemba',
  'chez-ntemba-lusaka',
  'Lusaka', 'Chilenje',
  'Live Music Venue',
  'D8 Approved', '$$',
  'The heartbeat of Lusaka''s live music scene. Congolese rumba, Zambian kalindula, and Afrobeats through the weekend — this place is joyful. Go when you want to dance and mean it. Arrive by 9 PM for the best experience.',
  'Chilenje South, Lusaka',
  -15.4444, 28.3167,
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop&auto=format',
  ARRAY['Live Music','Dance','Afrobeats','Vibrant','Late Night'],
  4.5, 211,
  20,
  true, false
),

(
  'Flavours of Asia',
  'flavours-of-asia-lusaka',
  'Lusaka', 'Kabulonga',
  'Restaurant',
  'D8 Approved', '$$$',
  'Reliably the best Pan-Asian food in Lusaka. Dim sum on Sundays, proper ramen, and a cocktail menu built around lychee and yuzu. If you want to eat somewhere genuinely different from the usual Lusaka choices, this is it.',
  'Kabulonga Road, Lusaka',
  -15.3944, 28.3278,
  'https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=600&h=400&fit=crop&auto=format',
  ARRAY['Asian','Date Night','Cocktails','Different'],
  4.4, 134,
  45,
  true, false
),

(
  'Sunday Lusaka',
  'sunday-lusaka',
  'Lusaka', 'Mass Media',
  'Brunch & Day Club',
  'D8 Approved', '$$$',
  'Lusaka''s favourite Sunday escape. Pool views, DJ sets from noon, bottomless brunches, and a crowd that''s there to enjoy themselves properly. A group date classic — but also works beautifully for a couple who want to make a day of it.',
  'Mass Media, Lusaka',
  -15.3833, 28.3333,
  'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&h=400&fit=crop&auto=format',
  ARRAY['Brunch','Pool','Group','Daytime','DJ'],
  4.3, 278,
  60,
  true, false
),

(
  'The Intercontinental Lusaka — Sky Lounge',
  'intercontinental-sky-lounge-lusaka',
  'Lusaka', 'Haile Selassie',
  'Rooftop Bar',
  'D8 Approved', '$$$',
  'The highest bar in Lusaka with views to match. Sunsets here are genuinely worth the trip — a horizon of copper-red sky over the city canopy. Cocktails are well-priced for a five-star hotel. Best from 5–8 PM.',
  'Intercontinental Lusaka, Haile Selassie Ave',
  -15.4167, 28.2889,
  'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600&h=400&fit=crop&auto=format',
  ARRAY['Rooftop','Sunset','Cocktails','Views','Romantic'],
  4.4, 167,
  40,
  true, false
),

-- ── HIDDEN GEM TIER ───────────────────────────────────────────────────────────

(
  'The Fig Tree',
  'the-fig-tree-lusaka',
  'Lusaka', 'Ibex Hill',
  'Garden Restaurant',
  'Hidden Gem', '$$',
  'You won''t find this on any listicle. A small garden restaurant tucked into a residential plot in Ibex Hill, run by a couple who grow most of what lands on your plate. The menu changes daily. Booking required. Only 8 tables.',
  'Ibex Hill, Lusaka',
  -15.4278, 28.3611,
  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600&h=400&fit=crop&auto=format',
  ARRAY['Intimate','Garden','Farm-to-Table','Unique','Quiet'],
  4.9, 34,
  30,
  true, true
),

(
  'Mwamba''s Kapenta Bar',
  'mwambas-kapenta-bar-lusaka',
  'Lusaka', 'Matero',
  'Local Bar & Grill',
  'Hidden Gem', '$',
  'A Lusaka secret that regulars guard jealously. Cold chibuku, perfect kapenta with nshima, an outdoor fire pit, and music so good you''ll forget to check your phone. Cash only. No sign outside — ask locally.',
  'Matero Market area, Lusaka',
  -15.3944, 28.2722,
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&h=400&fit=crop&auto=format',
  ARRAY['Authentic','Local','Budget','Late Night','Chill'],
  4.8, 18,
  8,
  true, true
),

(
  'Courtyard at Providence',
  'courtyard-at-providence-lusaka',
  'Lusaka', 'Northmead',
  'Café & Events Space',
  'Hidden Gem', '$$',
  'Hidden inside a community complex, this courtyard café doubles as an art gallery and weekend events space. Coffee is some of the best in Lusaka — proper single-origin Zambian beans. Evening events range from poetry to acoustic sets.',
  'Providence Community Centre, Northmead',
  -15.3722, 28.3444,
  'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=600&h=400&fit=crop&auto=format',
  ARRAY['Art','Coffee','Creative','Unique','Cultural'],
  4.7, 52,
  15,
  true, true
);

-- ─── Lusaka Events ────────────────────────────────────────────────────────────

insert into public.events (
  title, description, category, vibes, cover_image,
  starts_at, ends_at, price_pp, currency,
  capacity, spots_left, is_free, is_featured, city
) values

(
  'Jazz at Latitude 15°',
  'Monthly jazz session on the rooftop. Live quartet, full cocktail menu, and Lusaka''s best skyline as a backdrop. Doors open at 7 PM — arrive before 8 PM for the best seats.',
  'Live Music',
  ARRAY['Romantic','Sophisticated','Live Music'],
  'https://images.unsplash.com/photo-1415201364774-f6f0bb35f28f?w=600&h=400&fit=crop&auto=format',
  (now() + interval '3 days')::date + time '19:00',
  (now() + interval '3 days')::date + time '23:00',
  3500, 'ZMW',
  60, 14,
  false, true, 'Lusaka'
),

(
  'Lusaka Night Market',
  'Street food, local craft vendors, and live music at the Arcades grounds. Over 40 vendors, Zambian food, imported street eats, and cold Mosi. Free entry — perfect casual date.',
  'Market & Street Food',
  ARRAY['Casual','Foodie','Social','Outdoor'],
  'https://images.unsplash.com/photo-1533900298318-6b8da08a523e?w=600&h=400&fit=crop&auto=format',
  (now() + interval '5 days')::date + time '17:00',
  (now() + interval '5 days')::date + time '22:00',
  0, 'ZMW',
  null, null,
  true, true, 'Lusaka'
),

(
  'Sundowner Cinema — Nomads',
  'Open-air movie night at Nomads Farm. BYO blanket, wine included in the ticket price, food trucks on site. Film announced on the day. Couples seating sections available.',
  'Cinema',
  ARRAY['Romantic','Outdoor','Relaxed','Film'],
  'https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c?w=600&h=400&fit=crop&auto=format',
  (now() + interval '7 days')::date + time '18:30',
  (now() + interval '7 days')::date + time '21:30',
  2500, 'ZMW',
  80, 22,
  false, true, 'Lusaka'
),

(
  'Afrobeats Sunday — Chez Ntemba',
  'The weekly Sunday session at Chez Ntemba. Live band, dance floor opens at 4 PM, DJ takes over at 8 PM. The city''s most reliable Sunday vibe. Free entry before 5 PM.',
  'Nightlife',
  ARRAY['Afrobeats','Dance','Vibrant','Group'],
  'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=600&h=400&fit=crop&auto=format',
  (now() + interval '2 days')::date + time '16:00',
  (now() + interval '2 days')::date + time '23:59',
  0, 'ZMW',
  200, null,
  true, false, 'Lusaka'
),

(
  'Coffee & Canvas Morning',
  'A 2-hour guided painting session at Courtyard at Providence, coffee included. No experience needed. Couples and groups welcome. Limited to 16 participants — book early.',
  'Activity',
  ARRAY['Creative','Relaxed','Unique','Morning'],
  'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?w=600&h=400&fit=crop&auto=format',
  (now() + interval '4 days')::date + time '09:00',
  (now() + interval '4 days')::date + time '11:30',
  1800, 'ZMW',
  16, 7,
  false, false, 'Lusaka'
);
