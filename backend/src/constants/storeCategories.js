const STORE_CATEGORY_KEYS = [
  'all',
  'electronics',
  'fashion',
  'grocery',
  'home',
  'beauty',
  'sports',
  'books',
  'toys',
  'health'
];

/** Allowed subcategory keys per parent (`''` = general / any). */
const SUBCATEGORIES_BY_PARENT = {
  all: [''],
  electronics: [
    '',
    'phones',
    'laptops',
    'tv_audio',
    'ac_appliances',
    'wearables',
    'cameras',
    'gaming',
    'accessories'
  ],
  fashion: ['', 'mens', 'womens', 'kids', 'footwear', 'traditional', 'bags'],
  grocery: ['', 'fresh', 'snacks', 'beverages', 'staples', 'frozen', 'bakery'],
  home: ['', 'furniture', 'kitchen', 'decor', 'tools', 'cleaning'],
  beauty: ['', 'skincare', 'haircare', 'makeup', 'fragrance'],
  sports: ['', 'fitness', 'outdoor', 'team_sports', 'cycling'],
  books: ['', 'fiction', 'nonfiction', 'textbooks', 'kids_books'],
  toys: ['', 'board_games', 'action_figures', 'educational', 'outdoor_toys'],
  health: ['', 'vitamins', 'otc', 'personal_care']
};

/** Extra words merged into Google Shopping `q` after the main category hint. */
const SUB_SHOPPING_HINT = {
  electronics: {
    phones: 'smartphone mobile phone',
    laptops: 'laptop notebook computer',
    tv_audio: 'television speaker audio home theater',
    ac_appliances: 'air conditioner refrigerator washing machine appliance',
    wearables: 'smartwatch fitness tracker wearable',
    cameras: 'camera lens photography',
    gaming: 'gaming console controller',
    accessories: 'charger cable case electronic accessory'
  },
  fashion: {
    mens: 'men clothing apparel',
    womens: 'women clothing apparel',
    kids: 'kids children clothing',
    footwear: 'shoes sneakers sandals',
    traditional: 'saree kurta ethnic wear',
    bags: 'handbag backpack wallet'
  },
  grocery: {
    fresh: 'fresh fruits vegetables produce',
    snacks: 'snacks chips namkeen',
    beverages: 'drinks juice soda water',
    staples: 'rice dal atta grocery staples',
    frozen: 'frozen food ice cream',
    bakery: 'bread bakery cakes'
  },
  home: {
    furniture: 'sofa bed table chair furniture',
    kitchen: 'cookware utensils kitchen appliance',
    decor: 'home decor lamp curtains',
    tools: 'tools hardware DIY',
    cleaning: 'cleaning supplies storage organizer'
  },
  beauty: {
    skincare: 'skincare face cream serum',
    haircare: 'shampoo conditioner hair oil',
    makeup: 'makeup lipstick foundation',
    fragrance: 'perfume deodorant body spray'
  },
  sports: {
    fitness: 'gym fitness exercise equipment',
    outdoor: 'camping hiking outdoor gear',
    team_sports: 'cricket football sports gear',
    cycling: 'bicycle cycling helmet'
  },
  books: {
    fiction: 'fiction novel story book',
    nonfiction: 'nonfiction biography self help book',
    textbooks: 'textbook exam guide study book',
    kids_books: 'children kids story book'
  },
  toys: {
    board_games: 'board game puzzle',
    action_figures: 'action figure doll toy',
    educational: 'educational learning toy',
    outdoor_toys: 'outdoor play swing scooter'
  },
  health: {
    vitamins: 'vitamins supplements protein',
    otc: 'medicine first aid pharmacy',
    personal_care: 'soap toothbrush personal hygiene'
  }
};

/**
 * Optional Google Places `includedTypes` overrides when a subcategory is set.
 * See https://developers.google.com/maps/documentation/places/web-service/place-types
 */
const SUB_PLACE_TYPES = {
  electronics: {
    phones: ['cell_phone_store', 'electronics_store'],
    laptops: ['electronics_store'],
    tv_audio: ['electronics_store', 'home_goods_store'],
    ac_appliances: ['electronics_store', 'home_goods_store'],
    wearables: ['electronics_store'],
    cameras: ['electronics_store'],
    gaming: ['electronics_store'],
    accessories: ['electronics_store']
  },
  fashion: {
    mens: ['clothing_store', 'shoe_store'],
    womens: ['clothing_store', 'shoe_store'],
    kids: ['clothing_store'],
    footwear: ['shoe_store'],
    traditional: ['clothing_store'],
    bags: ['clothing_store', 'shoe_store']
  },
  grocery: {
    fresh: ['supermarket', 'grocery_store', 'farmers_market'],
    snacks: ['supermarket', 'grocery_store', 'convenience_store'],
    beverages: ['supermarket', 'grocery_store', 'convenience_store'],
    staples: ['supermarket', 'grocery_store'],
    frozen: ['supermarket', 'grocery_store'],
    bakery: ['bakery', 'grocery_store']
  },
  home: {
    furniture: ['furniture_store', 'home_goods_store'],
    kitchen: ['home_goods_store', 'hardware_store'],
    decor: ['home_goods_store', 'furniture_store'],
    tools: ['hardware_store', 'home_goods_store'],
    cleaning: ['home_goods_store', 'hardware_store']
  },
  beauty: {
    skincare: ['drugstore', 'beauty_salon'],
    haircare: ['beauty_salon', 'drugstore'],
    makeup: ['drugstore', 'beauty_salon'],
    fragrance: ['drugstore', 'beauty_salon']
  },
  sports: {
    fitness: ['sporting_goods_store', 'gym'],
    outdoor: ['sporting_goods_store'],
    team_sports: ['sporting_goods_store'],
    cycling: ['bicycle_store', 'sporting_goods_store']
  },
  books: {
    fiction: ['book_store'],
    nonfiction: ['book_store'],
    textbooks: ['book_store'],
    kids_books: ['book_store']
  },
  toys: {
    board_games: ['toy_store'],
    action_figures: ['toy_store'],
    educational: ['toy_store'],
    outdoor_toys: ['toy_store', 'sporting_goods_store']
  },
  health: {
    vitamins: ['pharmacy', 'drugstore'],
    otc: ['pharmacy', 'drugstore'],
    personal_care: ['drugstore', 'pharmacy']
  }
};

function normalizeStoreCategory(raw) {
  if (raw == null || raw === '') return 'all';
  const v = String(raw).trim().toLowerCase();
  return STORE_CATEGORY_KEYS.includes(v) ? v : 'all';
}

function normalizeStoreSubcategory(parentRaw, subRaw) {
  const parent = normalizeStoreCategory(parentRaw);
  if (parent === 'all') return '';
  const allowed = SUBCATEGORIES_BY_PARENT[parent] || [''];
  const v = subRaw == null || subRaw === '' ? '' : String(subRaw).trim().toLowerCase();
  if (v === '' || v === 'general') return '';
  return allowed.includes(v) ? v : '';
}

function getSubcategoryShoppingHint(parentKey, subKey) {
  if (!subKey) return '';
  const parent = normalizeStoreCategory(parentKey);
  const sub = normalizeStoreSubcategory(parent, subKey);
  if (!sub) return '';
  return SUB_SHOPPING_HINT[parent]?.[sub] || '';
}

/** @returns {string[]|null} Place types to use instead of parent defaults, or null. */
function getSubcategoryPlaceTypesOverride(parentKey, subKey) {
  const parent = normalizeStoreCategory(parentKey);
  const sub = normalizeStoreSubcategory(parent, subKey);
  if (!sub) return null;
  const types = SUB_PLACE_TYPES[parent]?.[sub];
  return types?.length ? types : null;
}

module.exports = {
  STORE_CATEGORY_KEYS,
  SUBCATEGORIES_BY_PARENT,
  normalizeStoreCategory,
  normalizeStoreSubcategory,
  getSubcategoryShoppingHint,
  getSubcategoryPlaceTypesOverride
};
