/**
 * Full product catalog from store.letstruck.com
 * Products are mapped to relevant lead magnets for email promotion
 */

export interface Product {
  id: string;
  name: string;
  handle: string;
  url: string;
  price: string;
  category: "supplement" | "food" | "equipment" | "testing" | "trucking" | "program";
  subcategory?: string;
  description: string;
  benefits: string[];
  bestForLeadMagnets: string[]; // Lead magnet slugs this product pairs well with
  isKevinDaily?: boolean; // Part of Kevin's daily stack
}

export const PRODUCT_CATALOG: Product[] = [
  // ===== KEVIN'S DAILY STACK =====
  {
    id: "algae-dha",
    name: "Algae Oil DHA Omega-3s",
    handle: "algae-oil-dha-omega-3s",
    url: "https://store.letstruck.com/products/algae-oil-dha-omega-3s",
    price: "54.99",
    category: "supplement",
    subcategory: "omega-3",
    description: "Plant-based omega-3s with organic lemon peel oil. No fish burps.",
    benefits: [
      "Supports brain function and focus",
      "Anti-inflammatory",
      "No fishy taste or aftertaste",
      "Sustainable and vegan-friendly",
    ],
    bestForLeadMagnets: [
      "eat-like-a-human",
      "diesel-in-your-blood",
      "brain-health",
      "gut-check",
      "the-owners-operators-heart",
    ],
    isKevinDaily: true,
  },
  {
    id: "cardio-miracle",
    name: "Cardio Miracle",
    handle: "cardio-miracle",
    url: "https://store.letstruck.com/products/cardio-miracle",
    price: "89.95",
    category: "supplement",
    subcategory: "heart",
    description:
      "Nitric oxide formula with L-Arginine, L-Citrulline, and 50+ ingredients for cardiovascular health.",
    benefits: [
      "Widens blood vessels",
      "Supports healthy blood pressure",
      "Enhances circulation",
      "Nobel Prize-winning research",
    ],
    bestForLeadMagnets: ["the-owners-operators-heart", "diesel-in-your-blood", "blood-sugar-chaos"],
    isKevinDaily: true,
  },
  {
    id: "bio-d-mulsion-forte",
    name: "Bio-D-Mulsion Forte",
    handle: "bio-d-mulsion-forte",
    url: "https://store.letstruck.com/products/bio-d-mulsion-forte",
    price: "23.90",
    category: "supplement",
    subcategory: "vitamin-d",
    description: "Emulsified Vitamin D3 for enhanced absorption. 2000 IU per drop.",
    benefits: [
      "Superior absorption",
      "Supports immune function",
      "Essential for drivers with limited sun exposure",
      "Easy dosing",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "stress-proof", "sleep-when-youre-dead"],
    isKevinDaily: true,
  },
  {
    id: "biodoph-7-plus",
    name: "BioDoph-7 Plus",
    handle: "biodoph-7-plus",
    url: "https://store.letstruck.com/products/biodoph-7-plus",
    price: "42.90",
    category: "supplement",
    subcategory: "probiotic",
    description: "Professional-grade probiotic with 7 beneficial strains for gut health.",
    benefits: [
      "Supports digestive health",
      "Enhances immune function",
      "Shelf-stable strains",
      "No refrigeration needed",
    ],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest", "eat-like-a-human", "clean-machine"],
    isKevinDaily: true,
  },
  {
    id: "bee-ome-gold",
    name: "Bee-Ome Gold",
    handle: "bee-ome-gold",
    url: "https://store.letstruck.com/products/bee-ome-gold",
    price: "49.95",
    category: "supplement",
    subcategory: "probiotic",
    description: "Functional honey with probiotics and prebiotics. Gut health that tastes amazing.",
    benefits: [
      "Probiotics + prebiotics in one",
      "Raw honey base",
      "Supports gut microbiome",
      "Delicious daily ritual",
    ],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest", "eat-like-a-human"],
    isKevinDaily: true,
  },
  {
    id: "terraflora-deep-zen",
    name: "Terraflora Deep Zen",
    handle: "terraflora-deep-zen",
    url: "https://store.letstruck.com/products/terraflora-deep-zen",
    price: "59.95",
    category: "supplement",
    subcategory: "psychobiotic",
    description: "Advanced psychobiotic formula for gut-brain axis support. Calm mind, healthy gut.",
    benefits: [
      "Gut-brain axis support",
      "Promotes calm and focus",
      "Spore-based probiotics",
      "No refrigeration needed",
    ],
    bestForLeadMagnets: ["gut-check", "stress-proof", "sleep-when-youre-dead"],
    isKevinDaily: true,
  },
  {
    id: "mind-fuel-mct",
    name: "Mind Fuel MCT Oil",
    handle: "mind-fuel-mct-oil",
    url: "https://store.letstruck.com/products/mind-fuel-mct-oil",
    price: "24.95",
    category: "supplement",
    subcategory: "energy",
    description: "Pure C8 MCT oil for mental clarity and sustained energy. Brain fuel for long hauls.",
    benefits: [
      "Quick mental energy",
      "Supports ketone production",
      "No crash or jitters",
      "Flavorless - add to anything",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "blood-sugar-chaos", "diesel-in-your-blood"],
    isKevinDaily: true,
  },
  {
    id: "bio-dk-mulsion",
    name: "Bio-DK Mulsion",
    handle: "bio-dk-mulsion",
    url: "https://store.letstruck.com/products/bio-dk-mulsion",
    price: "30.50",
    category: "supplement",
    subcategory: "vitamin-d",
    description: "Emulsified Vitamin D3 + K2 for enhanced absorption. Essential for drivers.",
    benefits: [
      "D3 + K2 synergy",
      "Superior absorption",
      "Supports bone and heart health",
      "Easy liquid dosing",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "the-owners-operators-heart", "stress-proof"],
    isKevinDaily: true,
  },

  // ===== GUT HEALTH =====
  {
    id: "adp",
    name: "ADP (Emulsified Oregano)",
    handle: "adp",
    url: "https://store.letstruck.com/products/adp",
    price: "32.90",
    category: "supplement",
    subcategory: "antimicrobial",
    description: "Time-released oregano oil for gut pathogen support without stomach irritation.",
    benefits: [
      "Targets gut pathogens",
      "Time-released for intestinal delivery",
      "Supports healthy gut flora balance",
      "Gentle on stomach",
    ],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest", "clean-machine"],
  },
  {
    id: "gastrazyme",
    name: "Gastrazyme",
    handle: "gastrazyme",
    url: "https://store.letstruck.com/products/gastrazyme",
    price: "28.90",
    category: "supplement",
    subcategory: "digestion",
    description: "Vitamin U complex with chlorophyllins for stomach and intestinal lining support.",
    benefits: [
      "Supports stomach lining integrity",
      "Soothes digestive discomfort",
      "Contains Vitamin U complex",
      "Helps with occasional heartburn",
    ],
    bestForLeadMagnets: ["shut-up-and-digest", "gut-check", "stress-proof"],
  },
  {
    id: "beta-tcp",
    name: "Beta-TCP",
    handle: "beta-tcp",
    url: "https://store.letstruck.com/products/beta-tcp",
    price: "24.90",
    category: "supplement",
    subcategory: "bile",
    description: "Bile salts with taurine and pancreatic enzymes for fat digestion support.",
    benefits: [
      "Supports fat digestion",
      "Helpful post-gallbladder removal",
      "Thins bile for better flow",
      "Supports liver function",
    ],
    bestForLeadMagnets: ["shut-up-and-digest", "eat-like-a-human", "clean-machine"],
  },
  {
    id: "tudca",
    name: "TUDCA",
    handle: "tudca",
    url: "https://store.letstruck.com/products/tudca",
    price: "59.99",
    category: "supplement",
    subcategory: "bile",
    description: "Tauroursodeoxycholic acid for liver and bile flow support.",
    benefits: [
      "Supports healthy bile flow",
      "Liver protective properties",
      "Supports cellular health",
      "Research-backed compound",
    ],
    bestForLeadMagnets: ["shut-up-and-digest", "clean-machine", "diesel-in-your-blood"],
  },
  {
    id: "fc-cidal",
    name: "FC-Cidal",
    handle: "fc-cidal",
    url: "https://store.letstruck.com/products/fc-cidal",
    price: "32.90",
    category: "supplement",
    subcategory: "antimicrobial",
    description: "French tarragon and other botanicals for biofilm and microbial support.",
    benefits: [
      "Supports biofilm disruption",
      "Natural antimicrobial herbs",
      "Works synergistically with ADP",
      "Supports gut terrain",
    ],
    bestForLeadMagnets: ["gut-check", "clean-machine"],
  },
  {
    id: "dysbiocide",
    name: "Dysbiocide",
    handle: "dysbiocide",
    url: "https://store.letstruck.com/products/dysbiocide",
    price: "34.90",
    category: "supplement",
    subcategory: "antimicrobial",
    description: "Herbal formula for gut flora balance with wormwood, stemona, and more.",
    benefits: [
      "Broad-spectrum botanical support",
      "Supports gut ecology",
      "Works with ADP protocol",
      "Traditional herbs combined",
    ],
    bestForLeadMagnets: ["gut-check", "clean-machine"],
  },

  // ===== ADRENAL / STRESS =====
  {
    id: "adb5-plus",
    name: "ADB5 Plus",
    handle: "adb5-plus",
    url: "https://store.letstruck.com/products/adb5-plus",
    price: "31.90",
    category: "supplement",
    subcategory: "adrenal",
    description: "Adrenal glandular with B5 (pantothenic acid) for stress response support.",
    benefits: [
      "Supports adrenal function",
      "Helps with stress adaptation",
      "Contains B5 for energy",
      "Glandular support",
    ],
    bestForLeadMagnets: ["stress-proof", "sleep-when-youre-dead", "diesel-in-your-blood"],
  },
  {
    id: "de-stress",
    name: "De-Stress",
    handle: "de-stress",
    url: "https://store.letstruck.com/products/de-stress",
    price: "35.90",
    category: "supplement",
    subcategory: "stress",
    description: "L-Theanine and GABA support formula for calm focus.",
    benefits: [
      "Promotes calm without drowsiness",
      "Supports focus under stress",
      "Non-habit forming",
      "Fast-acting",
    ],
    bestForLeadMagnets: ["stress-proof", "sleep-when-youre-dead"],
  },
  {
    id: "stress-relief",
    name: "Stress Relief (Global Healing)",
    handle: "stress-relief",
    url: "https://store.letstruck.com/products/stress-relief",
    price: "49.95",
    category: "supplement",
    subcategory: "stress",
    description: "Adaptogenic herbs including ashwagandha for stress resilience.",
    benefits: [
      "Adaptogenic support",
      "Promotes relaxation",
      "Supports healthy cortisol",
      "Natural botanical formula",
    ],
    bestForLeadMagnets: ["stress-proof", "sleep-when-youre-dead"],
  },

  // ===== BLOOD SUGAR / METABOLISM =====
  {
    id: "calocurb",
    name: "Calocurb GLP-1 Activator",
    handle: "calocurb-glp-1-activator",
    url: "https://store.letstruck.com/products/calocurb-glp-1-activator",
    price: "89.99",
    category: "supplement",
    subcategory: "weight",
    description: "Natural GLP-1 activator from hops extract for appetite management.",
    benefits: [
      "Naturally activates GLP-1 pathway",
      "Supports appetite control",
      "No prescription needed",
      "Plant-based formula",
    ],
    bestForLeadMagnets: ["blood-sugar-chaos", "eat-like-a-human", "road-food-revolution"],
  },
  {
    id: "bio-glycozyme-forte",
    name: "Bio-Glycozyme Forte",
    handle: "bio-glycozyme-forte",
    url: "https://store.letstruck.com/products/bio-glycozyme-forte",
    price: "42.90",
    category: "supplement",
    subcategory: "blood-sugar",
    description: "Comprehensive formula for blood sugar metabolism support.",
    benefits: [
      "Supports glucose metabolism",
      "Contains chromium and vanadium",
      "Pancreatic enzyme support",
      "Comprehensive formula",
    ],
    bestForLeadMagnets: ["blood-sugar-chaos", "eat-like-a-human"],
  },

  // ===== DETOX / LIVER =====
  {
    id: "livotrit-plus",
    name: "Livotrit Plus",
    handle: "livotrit-plus",
    url: "https://store.letstruck.com/products/livotrit-plus",
    price: "37.90",
    category: "supplement",
    subcategory: "liver",
    description: "Liver glandular with lipotropic factors for detox support.",
    benefits: [
      "Supports liver function",
      "Contains lipotropic factors",
      "Aids detoxification pathways",
      "Glandular support",
    ],
    bestForLeadMagnets: ["clean-machine", "diesel-in-your-blood", "shut-up-and-digest"],
  },
  {
    id: "liposomal-glutathione",
    name: "Liposomal Glutathione",
    handle: "liposomal-glutathione",
    url: "https://store.letstruck.com/products/liposomal-glutathione",
    price: "62.80",
    category: "supplement",
    subcategory: "detox",
    description: "Master antioxidant in liposomal form for enhanced absorption.",
    benefits: [
      "Master antioxidant",
      "Superior absorption",
      "Supports detoxification",
      "Cellular protection",
    ],
    bestForLeadMagnets: ["clean-machine", "diesel-in-your-blood"],
  },
  {
    id: "candida-balance",
    name: "Candida Balance",
    handle: "candida-balance",
    url: "https://store.letstruck.com/products/candida-balance",
    price: "39.95",
    category: "supplement",
    subcategory: "antifungal",
    description: "Herbal formula for fungal balance support.",
    benefits: [
      "Supports healthy yeast levels",
      "Natural antifungal herbs",
      "Gut ecology support",
      "Part of candida protocols",
    ],
    bestForLeadMagnets: ["gut-check", "clean-machine"],
  },
  {
    id: "ozonated-charcoal",
    name: "Ozonated Activated Charcoal",
    handle: "ozonated-activated-charcoal",
    url: "https://store.letstruck.com/products/ozonated-activated-charcoal",
    price: "29.95",
    category: "supplement",
    subcategory: "detox",
    description: "Activated charcoal with ozone for enhanced binding capacity.",
    benefits: [
      "Binds toxins in the gut",
      "Enhanced with ozone",
      "Supports detox protocols",
      "Travel-friendly",
    ],
    bestForLeadMagnets: ["clean-machine", "gut-check", "road-food-revolution"],
  },

  // ===== ORGANS / ANCESTRAL =====
  {
    id: "ancestral-liver",
    name: "Ancestral Grass Fed Beef Liver",
    handle: "grass-fed-desiccated-beef-liver",
    url: "https://store.letstruck.com/products/grass-fed-desiccated-beef-liver",
    price: "38.00",
    category: "supplement",
    subcategory: "organ",
    description: "Freeze-dried grass-fed beef liver. Nature's multivitamin.",
    benefits: [
      "Nature's multivitamin",
      "Rich in B12 and iron",
      "Bioavailable nutrients",
      "100% grass-fed",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "diesel-in-your-blood", "clean-machine"],
  },
  {
    id: "ancestral-organs",
    name: "Ancestral Grass Fed Beef Organs",
    handle: "grass-fed-desiccated-beef-organs",
    url: "https://store.letstruck.com/products/grass-fed-desiccated-beef-organs",
    price: "48.00",
    category: "supplement",
    subcategory: "organ",
    description: "Multi-organ blend: liver, heart, kidney, pancreas, spleen.",
    benefits: [
      "Full spectrum organ nutrition",
      "Supports multiple body systems",
      "Traditional nose-to-tail eating",
      "Convenient capsule form",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "diesel-in-your-blood"],
  },
  {
    id: "ancestral-colostrum",
    name: "Ancestral Grass Fed Colostrum",
    handle: "grass-fed-colostrum",
    url: "https://store.letstruck.com/products/grass-fed-colostrum",
    price: "68.00",
    category: "supplement",
    subcategory: "immune",
    description: "First milk immune factors for gut and immune support.",
    benefits: [
      "Supports gut lining",
      "Immune system modulation",
      "Growth factors",
      "Traditional superfood",
    ],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest", "eat-like-a-human"],
  },
  {
    id: "ancestral-adrenal",
    name: "Ancestral Grass Fed Beef Adrenal",
    handle: "grass-fed-beef-adrenal",
    url: "https://store.letstruck.com/products/grass-fed-beef-adrenal",
    price: "80.00",
    category: "supplement",
    subcategory: "organ",
    description: "Adrenal glandular for stress and energy support.",
    benefits: [
      "Supports adrenal function",
      "Like supports like principle",
      "Helps with fatigue",
      "100% grass-fed source",
    ],
    bestForLeadMagnets: ["stress-proof", "diesel-in-your-blood", "sleep-when-youre-dead"],
  },
  {
    id: "ancestral-gallbladder",
    name: "Ancestral Grass Fed Gallbladder with Ox Bile",
    handle: "grass-fed-gallbladder-with-ox-bile-and-liver",
    url: "https://store.letstruck.com/products/grass-fed-gallbladder-with-ox-bile-and-liver",
    price: "72.00",
    category: "supplement",
    subcategory: "organ",
    description: "Gallbladder and liver support with ox bile for fat digestion.",
    benefits: [
      "Supports fat digestion",
      "Ideal post-cholecystectomy",
      "Contains ox bile",
      "Liver included for synergy",
    ],
    bestForLeadMagnets: ["shut-up-and-digest", "eat-like-a-human"],
  },
  {
    id: "ancestral-thyroid",
    name: "Ancestral Grass Fed Beef Thyroid",
    handle: "grass-fed-beef-thyroid",
    url: "https://store.letstruck.com/products/grass-fed-beef-thyroid",
    price: "56.00",
    category: "supplement",
    subcategory: "organ",
    description: "Thyroid glandular with liver for metabolic support.",
    benefits: [
      "Supports thyroid function",
      "Natural glandular nutrients",
      "Includes liver for synergy",
      "Traditional approach",
    ],
    bestForLeadMagnets: ["blood-sugar-chaos", "diesel-in-your-blood"],
  },

  // ===== ENERGY / MITOCHONDRIA =====
  {
    id: "coq10-pqq",
    name: "Super Ubiquinol CoQ10 with PQQ",
    handle: "super-ubiquinol-coq10-with-ppq",
    url: "https://store.letstruck.com/products/super-ubiquinol-coq10-with-ppq",
    price: "33.75",
    category: "supplement",
    subcategory: "energy",
    description: "Active form CoQ10 with PQQ for mitochondrial support.",
    benefits: [
      "Cellular energy production",
      "Heart health support",
      "Mitochondrial biogenesis",
      "Active ubiquinol form",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "the-owners-operators-heart", "stress-proof"],
  },
  {
    id: "ultimate-shilajit",
    name: "Ultimate Shilajit",
    handle: "ultimate_shilajit",
    url: "https://store.letstruck.com/products/ultimate_shilajit",
    price: "39.99",
    category: "supplement",
    subcategory: "energy",
    description: "Himalayan mineral pitch with fulvic acid for energy and recovery.",
    benefits: [
      "Natural mineral complex",
      "Supports energy levels",
      "Enhances nutrient absorption",
      "Traditional Ayurvedic compound",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "stress-proof"],
  },
  {
    id: "mct-oil",
    name: "Brain Octane MCT Oil",
    handle: "brain-octane-c8-mct-oil",
    url: "https://store.letstruck.com/products/brain-octane-c8-mct-oil",
    price: "23.95",
    category: "supplement",
    subcategory: "energy",
    description: "Pure C8 MCT oil for rapid ketone production and brain fuel.",
    benefits: [
      "Quick energy without crash",
      "Supports mental clarity",
      "Ketone production",
      "No digestive issues",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "blood-sugar-chaos", "diesel-in-your-blood"],
  },

  // ===== MINERALS =====
  {
    id: "acti-mag",
    name: "Acti-Mag Plus",
    handle: "acti-mag-plus",
    url: "https://store.letstruck.com/products/acti-mag-plus",
    price: "23.90",
    category: "supplement",
    subcategory: "mineral",
    description: "Highly absorbable magnesium with taurine for muscle and nerve support.",
    benefits: [
      "Highly absorbable form",
      "Supports muscle relaxation",
      "Calming effect",
      "Contains taurine",
    ],
    bestForLeadMagnets: ["stress-proof", "sleep-when-youre-dead", "the-sitting-disease"],
  },
  {
    id: "magnesium-glycinate",
    name: "Magnesium Glycinate",
    handle: "magnesium-glycinate",
    url: "https://store.letstruck.com/products/magnesium-glycinate",
    price: "26.00",
    category: "supplement",
    subcategory: "mineral",
    description: "Gentle, highly absorbable magnesium bound to glycine.",
    benefits: [
      "Excellent absorption",
      "Gentle on stomach",
      "Supports relaxation",
      "Muscle and nerve support",
    ],
    bestForLeadMagnets: ["stress-proof", "sleep-when-youre-dead"],
  },
  {
    id: "lyte-balance",
    name: "Lyte Balance",
    handle: "lyte-balance",
    url: "https://store.letstruck.com/products/lyte-balance",
    price: "24.95",
    category: "supplement",
    subcategory: "electrolyte",
    description: "Comprehensive electrolyte formula for hydration without sugar.",
    benefits: [
      "Full electrolyte spectrum",
      "No sugar or artificial ingredients",
      "Supports hydration",
      "Great for long hauls",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "the-sitting-disease", "stress-proof"],
    isKevinDaily: true,
  },
  {
    id: "detoxadine",
    name: "Detoxadine Nascent Iodine",
    handle: "detoxadine",
    url: "https://store.letstruck.com/products/detoxadine",
    price: "29.95",
    category: "supplement",
    subcategory: "mineral",
    description: "Nascent iodine in glycerin base for thyroid and metabolism.",
    benefits: [
      "Supports thyroid function",
      "Highly bioavailable form",
      "Metabolism support",
      "Detoxification cofactor",
    ],
    bestForLeadMagnets: ["blood-sugar-chaos", "clean-machine", "diesel-in-your-blood"],
  },

  // ===== SLEEP =====
  {
    id: "melatonin",
    name: "Melatonin",
    handle: "melatonin",
    url: "https://store.letstruck.com/products/melatonin",
    price: "12.90",
    category: "supplement",
    subcategory: "sleep",
    description: "Time-release melatonin for circadian rhythm support.",
    benefits: [
      "Supports natural sleep",
      "Time-release formula",
      "Circadian rhythm support",
      "Non-habit forming",
    ],
    bestForLeadMagnets: ["sleep-when-youre-dead", "stress-proof"],
  },

  // ===== LUNG / RESPIRATORY =====
  {
    id: "lung-health",
    name: "Lung Health",
    handle: "lung-health",
    url: "https://store.letstruck.com/products/lung-health",
    price: "29.95",
    category: "supplement",
    subcategory: "respiratory",
    description: "Herbal formula for respiratory and lung tissue support.",
    benefits: [
      "Supports lung function",
      "Natural botanical herbs",
      "Ideal for diesel exposure",
      "Respiratory tissue support",
    ],
    bestForLeadMagnets: ["diesel-in-your-blood", "clean-machine"],
  },

  // ===== FOOD & SNACKS =====
  {
    id: "beef-sticks",
    name: "100% Grass Fed Beef Sticks",
    handle: "beef-sticks-jalapeno",
    url: "https://store.letstruck.com/products/beef-sticks-jalapeno",
    price: "22.50",
    category: "food",
    subcategory: "snack",
    description: "Clean protein snack with no sugar, gluten, or seed oils.",
    benefits: [
      "100% grass-fed beef",
      "No sugar or seed oils",
      "Portable protein",
      "Clean ingredients",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "road-food-revolution", "blood-sugar-chaos"],
  },
  {
    id: "air-cheese",
    name: "Air Cheese",
    handle: "air-cheese",
    url: "https://store.letstruck.com/products/air-cheese",
    price: "1.49",
    category: "food",
    subcategory: "snack",
    description: "Crunchy cheese puffs with zero carbs. Perfect truck snack.",
    benefits: [
      "Zero carbs",
      "High protein",
      "Crunchy satisfaction",
      "No refrigeration needed",
    ],
    bestForLeadMagnets: ["eat-like-a-human", "road-food-revolution", "blood-sugar-chaos"],
  },

  // ===== EQUIPMENT / LIFESTYLE =====
  {
    id: "mihigh",
    name: "MiHIGH Infrared Sauna Blanket",
    handle: "mihigh-infrared-sauna-blanket",
    url: "https://store.letstruck.com/products/mihigh-infrared-sauna-blanket",
    price: "499.00",
    category: "equipment",
    subcategory: "recovery",
    description: "Portable infrared sauna blanket for detox and recovery on the road.",
    benefits: [
      "Portable detox solution",
      "Fits in sleeper cab",
      "Supports recovery",
      "Infrared benefits anywhere",
    ],
    bestForLeadMagnets: [
      "clean-machine",
      "diesel-in-your-blood",
      "stress-proof",
      "the-sitting-disease",
    ],
  },
  {
    id: "resistance-bands",
    name: '32" Resistance Bands',
    handle: "32-resistance-bands",
    url: "https://store.letstruck.com/products/32-resistance-bands",
    price: "10.90",
    category: "equipment",
    subcategory: "fitness",
    description: "Heavy-duty resistance bands for strength training anywhere.",
    benefits: ["Portable strength training", "Multiple resistance levels", "No gym needed", "Fits in cab"],
    bestForLeadMagnets: ["the-sitting-disease", "diesel-in-your-blood"],
  },

  // ===== TESTING =====
  {
    id: "kbmo-fit",
    name: "KBMO FIT Test",
    handle: "kbmo-fit-test",
    url: "https://store.letstruck.com/products/kbmo-fit-test",
    price: "349.00",
    category: "testing",
    subcategory: "food-sensitivity",
    description: "Food inflammation test measuring IgG and immune complexes to 176 foods.",
    benefits: [
      "Identifies trigger foods",
      "Measures inflammation, not just IgG",
      "176 foods tested",
      "Professional interpretation available",
    ],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest", "eat-like-a-human"],
  },

  // ===== TRUCKING =====
  {
    id: "scangauge",
    name: "ScanGaugeKR",
    handle: "scangaugekr",
    url: "https://store.letstruck.com/products/scangaugekr",
    price: "169.95",
    category: "trucking",
    subcategory: "monitoring",
    description: "Real-time digital gauges and fuel economy tracking for trucks.",
    benefits: ["Real-time fuel economy", "Diagnostic trouble codes", "Trip data tracking", "Maximize MPG"],
    bestForLeadMagnets: [],
  },

  // ===== KITS =====
  {
    id: "advanced-immune-kit",
    name: "Advanced Immune Support Kit",
    handle: "advanced-immune-support-kit",
    url: "https://store.letstruck.com/products/advanced-immune-support-kit",
    price: "119.00",
    category: "supplement",
    subcategory: "kit",
    description: "Complete immune support kit with BioDoph-7, D3, and immune botanicals.",
    benefits: ["Complete immune protocol", "Synergistic formulas", "Professional-grade", "Travel-ready"],
    bestForLeadMagnets: ["diesel-in-your-blood", "stress-proof"],
  },
  {
    id: "sbo-kit",
    name: "SBO Kit",
    handle: "sbo-kit",
    url: "https://store.letstruck.com/products/sbo-kit",
    price: "89.00",
    category: "supplement",
    subcategory: "kit",
    description: "Small bowel overgrowth protocol kit with antimicrobials and probiotics.",
    benefits: ["Complete SIBO support", "Antimicrobial herbs", "Gut repair nutrients", "Professional protocol"],
    bestForLeadMagnets: ["gut-check", "shut-up-and-digest"],
  },

  // ===== PROGRAMS =====
  {
    id: "coaching",
    name: "Destination Health Coaching",
    handle: "destination-health-one-on-one",
    url: "https://store.letstruck.com/pages/destination-health-one-on-one",
    price: "varies",
    category: "program",
    subcategory: "coaching",
    description: "One-on-one health coaching with Kevin for personalized protocols.",
    benefits: [
      "Personalized protocols",
      "Lab interpretation",
      "Ongoing support",
      "Driver-specific approach",
    ],
    bestForLeadMagnets: [
      "gut-check",
      "diesel-in-your-blood",
      "blood-sugar-chaos",
      "clean-machine",
      "stress-proof",
    ],
  },
];

// Helper functions
export function getProductById(id: string): Product | undefined {
  return PRODUCT_CATALOG.find((p) => p.id === id);
}

export function getProductByHandle(handle: string): Product | undefined {
  return PRODUCT_CATALOG.find((p) => p.handle === handle);
}

export function getRecommendedProducts(leadMagnetSlug: string): Product[] {
  const recommended = PRODUCT_CATALOG.filter((p) => p.bestForLeadMagnets.includes(leadMagnetSlug)).sort(
    (a, b) => (b.isKevinDaily ? 1 : 0) - (a.isKevinDaily ? 1 : 0)
  );

  const others = PRODUCT_CATALOG.filter(
    (p) => !p.bestForLeadMagnets.includes(leadMagnetSlug) && p.category === "supplement"
  );

  return [...recommended, ...others.slice(0, 5)];
}

export function getKevinsDailyStack(): Product[] {
  return PRODUCT_CATALOG.filter((p) => p.isKevinDaily);
}

export function getProductsByCategory(category: string): Product[] {
  return PRODUCT_CATALOG.filter((p) => p.category === category);
}

export function getAllProducts(): Product[] {
  return PRODUCT_CATALOG;
}

export function searchProducts(query: string): Product[] {
  const lowerQuery = query.toLowerCase();
  return PRODUCT_CATALOG.filter(
    (p) =>
      p.name.toLowerCase().includes(lowerQuery) ||
      p.description.toLowerCase().includes(lowerQuery) ||
      p.benefits.some((b) => b.toLowerCase().includes(lowerQuery)) ||
      p.category.toLowerCase().includes(lowerQuery) ||
      (p.subcategory && p.subcategory.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Find a product mentioned in text content
 * Returns the first matching product or undefined
 */
export function findProductInText(text: string): Product | undefined {
  const lowerText = text.toLowerCase();

  // Check each product - prioritize exact name matches
  for (const product of PRODUCT_CATALOG) {
    const productNameLower = product.name.toLowerCase();
    // Check if product name appears in text
    if (lowerText.includes(productNameLower)) {
      return product;
    }
  }

  // Second pass: check for partial matches (first significant word)
  for (const product of PRODUCT_CATALOG) {
    const firstWord = product.name.split(' ')[0].toLowerCase();
    // Skip generic words
    if (['the', 'a', 'an', 'grass', 'super', 'advanced'].includes(firstWord)) {
      continue;
    }
    if (firstWord.length >= 4 && lowerText.includes(firstWord)) {
      return product;
    }
  }

  return undefined;
}

/**
 * Find all products mentioned in text content
 */
export function findAllProductsInText(text: string): Product[] {
  const lowerText = text.toLowerCase();
  const found: Product[] = [];

  for (const product of PRODUCT_CATALOG) {
    const productNameLower = product.name.toLowerCase();
    if (lowerText.includes(productNameLower)) {
      found.push(product);
    }
  }

  return found;
}
