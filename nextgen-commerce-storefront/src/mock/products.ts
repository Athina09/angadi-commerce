import type { Category, Product } from "@/types/product";

let seq = 0;
const BASE = Date.parse("2026-06-01T08:00:00.000Z");
const DAY = 86400000;

/** Unsplash-style placeholders — swap for CDN later */
const img = (seed: string) =>
  `https://images.unsplash.com/${seed}?auto=format&fit=crop&w=600&q=80`;

function make(
  category: Category,
  name: string,
  unit: string,
  price: number,
  description: string,
  imageSeed: string,
  opts: { mrp?: number; stock?: number } = {}
): Product {
  seq += 1;
  return {
    id: `p${String(seq).padStart(3, "0")}`,
    name,
    description,
    category,
    price,
    mrp: opts.mrp,
    stock: opts.stock ?? 24,
    unit,
    imageUrl: img(imageSeed),
    createdAt: new Date(BASE + seq * 3 * 3600000 - 20 * DAY).toISOString(),
  };
}

export const PRODUCTS: Product[] = [
  // Vegetables (12)
  make("Vegetables", "Vine Tomatoes", "500 g", 32, "Deep-red country tomatoes — tangy for rasam, sweet for salads.", "photo-1546470427-e26264be0b0d", { mrp: 40, stock: 38 }),
  make("Vegetables", "Red Onions", "1 kg", 45, "Sharp Bellary onions with papery skins.", "photo-1518977956812-cd3d35b60400", { stock: 60 }),
  make("Vegetables", "Lady's Finger", "250 g", 24, "Tender okra — no strings when fried hot.", "photo-1597362926023-8846239c6e2e", { stock: 5 }),
  make("Vegetables", "Green Capsicum", "500 g", 38, "Crunchy thick-walled peppers for stir-fries.", "photo-1563565375-f3fdfdbefa83", { mrp: 48, stock: 22 }),
  make("Vegetables", "Ooty Carrots", "500 g", 34, "Sweet hill-station carrots, washed and trimmed.", "photo-1598170845058-32b9d6a5da37", { stock: 41 }),
  make("Vegetables", "Baby Potatoes", "1 kg", 42, "Uniform potatoes that roast evenly.", "photo-1518977676601-b53f82aba655", { stock: 55 }),
  make("Vegetables", "Curry Leaves", "100 g", 12, "Aromatic sprigs for every South Indian tempering.", "photo-1604329760661-eaecebb0ac0d", { stock: 30 }),
  make("Vegetables", "Cauliflower", "1 pc", 40, "Tight cream-white florets.", "photo-1568584711075-3d021a7c3c9c", { mrp: 55, stock: 14 }),
  make("Vegetables", "Palak Spinach", "250 g", 20, "Washed baby palak for dal and salads.", "photo-1576045057995-568f588f82fb", { stock: 3 }),
  make("Vegetables", "Cucumber", "500 g", 26, "Crisp field cucumbers with thin skins.", "photo-1449300079323-14067b2a3a2a", { stock: 33 }),
  make("Vegetables", "Ginger", "200 g", 28, "Firm fibre-light ginger for chai and gravies.", "photo-1615485290382-441e4d049cb5", { stock: 44 }),
  make("Vegetables", "Drumstick", "3 pcs", 30, "Fleshy murungakkai for sambar.", "photo-1594282486552-05b4d80acd03", { mrp: 36, stock: 0 }),

  // Fruits (12)
  make("Fruits", "Robusta Bananas", "6 pcs", 36, "Naturally ripened, lunchbox-ready.", "photo-1571771894821-ce9b6c11b08e", { stock: 48 }),
  make("Fruits", "Royal Gala Apples", "4 pcs", 120, "Crisp imported Galas with a honeyed finish.", "photo-1560806887-1e4cd0b6cbd6", { mrp: 150, stock: 26 }),
  make("Fruits", "Alphonso Mangoes", "2 pcs", 180, "Saffron flesh, zero fibre — Ratnagiri.", "photo-1553279768-865429fa0078", { mrp: 220, stock: 8 }),
  make("Fruits", "Nagpur Oranges", "1 kg", 78, "Seedless oranges that peel clean.", "photo-1547514701-42782126185d", { stock: 35 }),
  make("Fruits", "Pomegranate", "2 pcs", 110, "Ruby Bhagwa arils, crack-checked.", "photo-1541344999736-83eca272f6fc", { stock: 19 }),
  make("Fruits", "Green Grapes", "500 g", 65, "Seedless Thompson, chilled and crunchy.", "photo-1537640538966-79f369143f8f", { mrp: 80, stock: 4 }),
  make("Fruits", "Watermelon", "1 pc", 70, "Thumped and guaranteed red inside.", "photo-1587049352846-4a222e784d38", { stock: 12 }),
  make("Fruits", "Papaya", "1 pc", 55, "Ready-to-eat ripe papaya.", "photo-1517282009849-2c6d4d2c0e1e", { stock: 16 }),
  make("Fruits", "Kiwi", "3 pcs", 90, "Tart-sweet green kiwis at perfect give.", "photo-1585059895524-72359e06133a", { stock: 21 }),
  make("Fruits", "Fresh Coconut", "1 pc", 35, "Heavy water-filled coconuts.", "photo-1580982327559-c1206714aca0", { stock: 40 }),
  make("Fruits", "Guava", "500 g", 48, "Allahabad safeda — firm and pink-sweet.", "photo-1536511132770-e5058fd43e95", { mrp: 60, stock: 27 }),
  make("Fruits", "Sapota", "500 g", 52, "Caramel-sweet chikoos, hand-sorted.", "photo-1601493700631-2b16ec4b7070", { stock: 0 }),

  // Dairy (12)
  make("Dairy", "Full Cream Milk", "1 L", 62, "Pasteurised within 4 hours of milking.", "photo-1563636619-e9143da7973b", { stock: 50 }),
  make("Dairy", "Toned Milk", "500 ml", 28, "Everyday milk for chai and cereal.", "photo-1550583724-b2692b85b150", { stock: 64 }),
  make("Dairy", "Fresh Curd", "400 g", 40, "Thick set curd with a gentle tang.", "photo-1488477181946-6428a0291777", { mrp: 48, stock: 32 }),
  make("Dairy", "Salted Butter", "100 g", 58, "Slow-churned creamery butter.", "photo-1589985270826-4b7bb135bc9d", { stock: 25 }),
  make("Dairy", "Paneer", "200 g", 95, "Soft malai-rich paneer.", "photo-1631452180519-c014fe946bc7", { mrp: 110, stock: 18 }),
  make("Dairy", "Cow Ghee", "500 ml", 320, "Bilona-method ghee with nutty aroma.", "photo-1628088062854-32b9d6a5da37", { stock: 15 }),
  make("Dairy", "Cheese Slices", "10 slices", 130, "Melty slices for sandwiches.", "photo-1486297678162-eb2a19b0a32d", { stock: 29 }),
  make("Dairy", "Buttermilk Chaas", "500 ml", 20, "Spiced chaas with curry leaf.", "photo-1623065422902-30a2d299bbe4", { stock: 42 }),
  make("Dairy", "Greek Yogurt", "90 g", 45, "Triple-strained blueberry swirl.", "photo-1488477181946-6428a0291777", { mrp: 55, stock: 6 }),
  make("Dairy", "Fresh Cream", "200 ml", 65, "25% fat cream for kormas and desserts.", "photo-1563636619-e9143da7973b", { stock: 20 }),
  make("Dairy", "Khova Mawa", "200 g", 120, "Slow-reduced milk solids for sweets.", "photo-1606313564200-e75d5e30476c", { stock: 0 }),
  make("Dairy", "Mango Lassi", "200 ml", 30, "Thick mango lassi in glass bottle.", "photo-1623065422902-30a2d299bbe4", { stock: 36 }),

  // Bakery (12)
  make("Bakery", "Whole Wheat Bread", "400 g", 45, "100% atta loaf baked at dawn.", "photo-1509440159596-0249088772ff", { stock: 30 }),
  make("Bakery", "Milk Bread", "350 g", 40, "Pillowy white sandwich bread.", "photo-1549931319-a545dcf3bc73", { mrp: 48, stock: 24 }),
  make("Bakery", "Butter Croissant", "2 pcs", 90, "27 laminated butter layers.", "photo-1555507036-ab1f4038808a", { stock: 10 }),
  make("Bakery", "Pav Buns", "6 pcs", 30, "Squishy ladi pav for bhaji nights.", "photo-1509440159596-0249088772ff", { stock: 45 }),
  make("Bakery", "Chocolate Muffins", "2 pcs", 70, "Double-chocolate with molten centres.", "photo-1607958996333-41aef7caefaa", { mrp: 85, stock: 13 }),
  make("Bakery", "Masala Buns", "4 pcs", 48, "Iyengar-style spiced buns.", "photo-1555507036-ab1f4038808a", { stock: 17 }),
  make("Bakery", "Multigrain Loaf", "400 g", 55, "Seeds and oats in every slice.", "photo-1549931319-a545dcf3bc73", { stock: 20 }),
  make("Bakery", "Garlic Breadsticks", "6 pcs", 60, "Crisp sticks with herb butter.", "photo-1509440159596-0249088772ff", { stock: 22 }),
  make("Bakery", "Fruit Cake Slice", "1 pc", 45, "Dense plum cake with nuts.", "photo-1607958996333-41aef7caefaa", { stock: 8 }),
  make("Bakery", "Cookies Assorted", "200 g", 85, "Butter cookies, bakery tin.", "photo-1499636136210-6f4ee915583e", { mrp: 99, stock: 28 }),
  make("Bakery", "Pizza Base", "2 pcs", 50, "Thin crust ready for toppings.", "photo-1513104890138-7c749659a591", { stock: 16 }),
  make("Bakery", "Rusk Toast", "200 g", 40, "Twice-baked tea-time classic.", "photo-1549931319-a545dcf3bc73", { stock: 0 }),

  // Snacks (12)
  make("Snacks", "Salted Peanuts", "200 g", 45, "Roasted with a light salt crust.", "photo-1599599810769-bcde5a160d32", { stock: 40 }),
  make("Snacks", "Banana Chips", "150 g", 55, "Kerala-style coconut-oil chips.", "photo-1621939514649-535d9d4c5c0f", { mrp: 65, stock: 28 }),
  make("Snacks", "Murukku", "200 g", 60, "Crisp spiral snack from the evening batch.", "photo-1601050690597-df0568f70950", { stock: 22 }),
  make("Snacks", "Mixture", "250 g", 70, "Savory south-Indian mix.", "photo-1599599810769-bcde5a160d32", { stock: 19 }),
  make("Snacks", "Dark Chocolate Bar", "80 g", 95, "70% cocoa single-origin.", "photo-1606312619070-d48b4c652a52", { mrp: 120, stock: 35 }),
  make("Snacks", "Glucose Biscuits", "150 g", 30, "Everyday dunkable biscuits.", "photo-1558961363-fa8fdf82db35", { stock: 55 }),
  make("Snacks", "Trail Mix", "200 g", 140, "Almonds, raisins, pumpkin seeds.", "photo-1599599810769-bcde5a160d32", { stock: 14 }),
  make("Snacks", "Popcorn Caramel", "100 g", 50, "Sweet crunch for movie nights.", "photo-1578849278619-e73505e9610f", { stock: 26 }),
  make("Snacks", "Khakhra", "200 g", 65, "Roasted Gujarati flatbreads.", "photo-1601050690597-df0568f70950", { stock: 18 }),
  make("Snacks", "Energy Bar", "40 g", 45, "Oats and dates — no refined sugar.", "photo-1606312619070-d48b4c652a52", { stock: 32 }),
  make("Snacks", "Namkeen Sev", "150 g", 40, "Fine besan sev.", "photo-1601050690597-df0568f70950", { stock: 4 }),
  make("Snacks", "Wafers Pack", "100 g", 35, "Crispy potato wafers.", "photo-1621939514649-535d9d4c5c0f", { stock: 0 }),

  // Beverages (12)
  make("Beverages", "Filter Coffee Powder", "200 g", 165, "80:20 peaberry blend, dark roast.", "photo-1447933601403-0c6688de566e", { mrp: 190, stock: 28 }),
  make("Beverages", "Nilgiri Leaf Tea", "250 g", 195, "High-grown orthodox leaf tea.", "photo-1564890369478-c89ca6d9cde9", { stock: 22 }),
  make("Beverages", "Fresh Orange Juice", "1 L", 90, "Cold-pressed, no added sugar.", "photo-1600271886742-f049cd451bba", { stock: 12 }),
  make("Beverages", "Coconut Water", "200 ml", 40, "Tender coconut in tetra.", "photo-1580982327559-c1206714aca0", { stock: 30 }),
  make("Beverages", "Sparkling Water", "750 ml", 55, "Light bubbles, zero calories.", "photo-1523362628745-0c100150b504", { stock: 40 }),
  make("Beverages", "Green Tea Bags", "25 bags", 120, "Sencha-style bags.", "photo-1564890369478-c89ca6d9cde9", { mrp: 140, stock: 18 }),
  make("Beverages", "Hot Chocolate Mix", "200 g", 180, "Dutch cocoa for winter cups.", "photo-1511381939415-e44015466834", { stock: 15 }),
  make("Beverages", "Lemonade Concentrate", "500 ml", 75, "Dilute 1:4 with chilled water.", "photo-1621263764928-df1444c5e859", { stock: 24 }),
  make("Beverages", "Buttermilk Pack", "200 ml", 18, "Spiced ready-to-drink chaas.", "photo-1623065422902-30a2d299bbe4", { stock: 48 }),
  make("Beverages", "Cold Brew Coffee", "250 ml", 110, "12-hour steep, bottled.", "photo-1461023058943-07fcbe16d735", { stock: 9 }),
  make("Beverages", "Herbal Infusion", "20 bags", 150, "Chamomile and lemongrass.", "photo-1564890369478-c89ca6d9cde9", { stock: 3 }),
  make("Beverages", "Tender Coconut Shake", "300 ml", 80, "Blended with jaggery.", "photo-1580982327559-c1206714aca0", { stock: 0 }),

  // Staples (12)
  make("Staples", "Sona Masoori Rice", "5 kg", 380, "Aged rice for everyday meals.", "photo-1586201375761-83865001e31c", { mrp: 420, stock: 40 }),
  make("Staples", "Toor Dal", "1 kg", 145, "Split pigeon peas, polished.", "photo-1586201375761-83865001e31c", { stock: 35 }),
  make("Staples", "Urad Dal", "500 g", 95, "Whole black gram for idli batter.", "photo-1516684669134-de6f7c473a2a", { stock: 28 }),
  make("Staples", "Rock Salt", "1 kg", 35, "Unrefined cooking salt.", "photo-1516684669134-de6f7c473a2a", { stock: 50 }),
  make("Staples", "Turmeric Powder", "200 g", 55, "Bright Salem turmeric.", "photo-1596040033229-a9821ebd058d", { stock: 33 }),
  make("Staples", "Coconut Oil", "500 ml", 220, "Cold-pressed cooking oil.", "photo-1474979266404-7eaacbcd87c5", { mrp: 260, stock: 20 }),
  make("Staples", "Wheat Atta", "5 kg", 250, "Stone-ground chapati flour.", "photo-1574323347407-f5e1ad6d020b", { stock: 25 }),
  make("Staples", "Sugar", "1 kg", 48, "Fine crystal sugar.", "photo-1586201375761-83865001e31c", { stock: 45 }),
  make("Staples", "Jaggery Blocks", "500 g", 70, "Palm jaggery for payasam.", "photo-1606313564200-e75d5e30476c", { stock: 16 }),
  make("Staples", "Mustard Seeds", "200 g", 40, "Black mustard for tempering.", "photo-1596040033229-a9821ebd058d", { stock: 38 }),
  make("Staples", "Red Chilli Powder", "200 g", 65, "Guntur chilli, medium heat.", "photo-1596040033229-a9821ebd058d", { stock: 5 }),
  make("Staples", "Besan Flour", "500 g", 55, "Fine gram flour.", "photo-1574323347407-f5e1ad6d020b", { stock: 0 }),

  // Household (12)
  make("Household", "Dish Wash Liquid", "500 ml", 95, "Lemon scent, grease-cutting.", "photo-1583947215259-38e31be7901b", { stock: 30 }),
  make("Household", "Floor Cleaner", "1 L", 120, "Plant-based concentrate.", "photo-1563453392212-326f5e854473", { mrp: 140, stock: 22 }),
  make("Household", "Laundry Detergent", "1 kg", 185, "Front-load compatible powder.", "photo-1610557892470-55d9e80c0bce", { stock: 18 }),
  make("Household", "Kitchen Towels", "3 pcs", 160, "Absorbent cotton towels.", "photo-1558618666-fcd25c85cd64", { stock: 26 }),
  make("Household", "Garbage Bags", "30 pcs", 75, "Medium kitchen rolls.", "photo-1610557892470-55d9e80c0bce", { stock: 40 }),
  make("Household", "Glass Cleaner", "500 ml", 110, "Streak-free spray.", "photo-1563453392212-326f5e854473", { stock: 15 }),
  make("Household", "Toilet Cleaner", "500 ml", 85, "Thick gel formula.", "photo-1583947215259-38e31be7901b", { stock: 20 }),
  make("Household", "Mosquito Coils", "10 pcs", 45, "Citronella coils.", "photo-1558618666-fcd25c85cd64", { stock: 32 }),
  make("Household", "LED Bulb 9W", "1 pc", 99, "Warm white, B22 base.", "photo-1513506003901-1e6a229e2be9", { mrp: 129, stock: 28 }),
  make("Household", "Tissue Box", "100 pulls", 65, "Soft facial tissues.", "photo-1558618666-fcd25c85cd64", { stock: 35 }),
  make("Household", "Scrub Pads", "3 pcs", 40, "Non-scratch multipurpose.", "photo-1583947215259-38e31be7901b", { stock: 4 }),
  make("Household", "Air Freshener", "200 ml", 150, "Room spray, sandalwood.", "photo-1563453392212-326f5e854473", { stock: 0 }),

  // Personal Care (12)
  make("Personal Care", "Neem Soap", "100 g", 55, "Cold-process neem bar.", "photo-1608248543803-ba4f8c70ae0b", { stock: 40 }),
  make("Personal Care", "Aloe Face Wash", "150 ml", 145, "Gentle twice-daily cleanser.", "photo-1556228578-0d85b1a4d571", { mrp: 170, stock: 22 }),
  make("Personal Care", "Herbal Shampoo", "200 ml", 180, "Amla and hibiscus.", "photo-1535585209827-a15fcdbc4c2d", { stock: 18 }),
  make("Personal Care", "Toothpaste", "150 g", 95, "Fluoride mint paste.", "photo-1622383563227-04401dc8d2e8", { stock: 45 }),
  make("Personal Care", "Hand Sanitizer", "100 ml", 50, "70% alcohol gel.", "photo-1584744982491-665516d93411", { stock: 60 }),
  make("Personal Care", "Body Lotion", "200 ml", 210, "Cocoa butter moisturiser.", "photo-1556228578-0d85b1a4d571", { stock: 16 }),
  make("Personal Care", "Deodorant Stick", "50 g", 165, "Aluminium-free.", "photo-1608248543803-ba4f8c70ae0b", { mrp: 199, stock: 24 }),
  make("Personal Care", "Cotton Buds", "100 pcs", 45, "Paper-stem buds.", "photo-1584744982491-665516d93411", { stock: 38 }),
  make("Personal Care", "Lip Balm", "1 pc", 75, "Beeswax and shea.", "photo-1556228578-0d85b1a4d571", { stock: 30 }),
  make("Personal Care", "Face Tissue", "50 sheets", 40, "Soft wet tissues.", "photo-1584744982491-665516d93411", { stock: 28 }),
  make("Personal Care", "Hair Oil", "100 ml", 120, "Coconut and hibiscus oil.", "photo-1474979266404-7eaacbcd87c5", { stock: 5 }),
  make("Personal Care", "Sunscreen SPF50", "50 ml", 350, "Matte gel for daily wear.", "photo-1556228578-0d85b1a4d571", { stock: 0 }),

  // Stationery (12)
  make("Stationery", "A5 Notebook", "1 pc", 120, "Clothbound lined notebook.", "photo-1531346878377-a5be20836c33", { mrp: 150, stock: 35 }),
  make("Stationery", "Ball Pens Pack", "5 pcs", 55, "Smooth blue gel pens.", "photo-1583485088034-697b5bc36b31", { stock: 50 }),
  make("Stationery", "Sticky Notes", "3 pads", 65, "Pastel flag pads.", "photo-1586281380349-632531db7ed4", { stock: 28 }),
  make("Stationery", "Highlighter Set", "4 pcs", 90, "Chisel tip, pastel.", "photo-1583485088034-697b5bc36b31", { stock: 22 }),
  make("Stationery", "A4 Paper Ream", "500 sheets", 280, "80 GSM white copier paper.", "photo-1586281380349-632531db7ed4", { stock: 15 }),
  make("Stationery", "Desk Organiser", "1 pc", 340, "Bamboo tray for pens.", "photo-1484480974693-6ca0a78fb36b", { mrp: 399, stock: 12 }),
  make("Stationery", "Masking Tape", "2 rolls", 40, "Washi-style craft tape.", "photo-1586281380349-632531db7ed4", { stock: 40 }),
  make("Stationery", "Scissors", "1 pc", 85, "Stainless office scissors.", "photo-1583485088034-697b5bc36b31", { stock: 20 }),
  make("Stationery", "Glue Stick", "2 pcs", 35, "Non-toxic school glue.", "photo-1586281380349-632531db7ed4", { stock: 45 }),
  make("Stationery", "Sketch Pad", "1 pc", 110, "A4 cartridge paper.", "photo-1531346878377-a5be20836c33", { stock: 18 }),
  make("Stationery", "Correction Tape", "1 pc", 50, "Clean white-out tape.", "photo-1583485088034-697b5bc36b31", { stock: 4 }),
  make("Stationery", "File Folder Set", "5 pcs", 95, "Coloured document folders.", "photo-1484480974693-6ca0a78fb36b", { stock: 0 }),
];

export function getProductById(id: string): Product | undefined {
  return PRODUCTS.find((p) => p.id === id);
}

export function getRelatedProducts(product: Product, limit = 8): Product[] {
  return PRODUCTS.filter((p) => p.category === product.category && p.id !== product.id).slice(
    0,
    limit
  );
}
