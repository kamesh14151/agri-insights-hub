export type Product = {
  id: string;
  name: string;
  category: "Seeds" | "Fertilizers" | "Pesticides" | "Tools" | "Irrigation";
  price: number;
  unit: string;
  rating: number;
  stock: number;
  desc: string;
};

export const PRODUCTS: Product[] = [
  { id: "p1", name: "ADT 45 Paddy Seeds", category: "Seeds", price: 780, unit: "10 kg bag", rating: 4.6, stock: 42, desc: "High-yield short duration paddy variety suited for Cauvery delta." },
  { id: "p2", name: "Hybrid Tomato Seeds (Arka Rakshak)", category: "Seeds", price: 340, unit: "10 g", rating: 4.8, stock: 120, desc: "Triple disease resistant tomato hybrid with 75 t/ha potential." },
  { id: "p3", name: "Urea 46% N", category: "Fertilizers", price: 266, unit: "45 kg", rating: 4.3, stock: 80, desc: "Nitrogen source for vegetative growth stage top dressing." },
  { id: "p4", name: "Vermicompost Organic", category: "Fertilizers", price: 420, unit: "30 kg", rating: 4.7, stock: 65, desc: "Rich organic manure improving soil structure and microbial life." },
  { id: "p5", name: "Neem Oil Bio-Pesticide", category: "Pesticides", price: 510, unit: "1 L", rating: 4.5, stock: 54, desc: "Azadirachtin 1500 ppm for sucking pests and leaf miners." },
  { id: "p6", name: "Sulphur 80% WDG", category: "Pesticides", price: 295, unit: "1 kg", rating: 4.2, stock: 37, desc: "Contact fungicide effective against powdery mildew." },
  { id: "p7", name: "Battery Knapsack Sprayer", category: "Tools", price: 3250, unit: "16 L", rating: 4.4, stock: 18, desc: "12V rechargeable sprayer with 4 nozzle types." },
  { id: "p8", name: "Hand Weeder (Cono Type)", category: "Tools", price: 1450, unit: "unit", rating: 4.1, stock: 24, desc: "Manual cono weeder for SRI paddy inter-cultivation." },
  { id: "p9", name: "Drip Lateral Pipe 16 mm", category: "Irrigation", price: 1890, unit: "400 m roll", rating: 4.6, stock: 30, desc: "Inline emitter drip laterals at 40 cm spacing." },
  { id: "p10", name: "Soil Moisture Sensor Kit", category: "Irrigation", price: 2600, unit: "kit", rating: 4.5, stock: 15, desc: "Capacitive sensor with LoRa transmitter for field telemetry." },
];

export type Listing = {
  id: string;
  crop: string;
  farmer: string;
  location: string;
  quantity: string;
  price: number;
  unit: string;
  grade: string;
  harvested: string;
};

export const LISTINGS: Listing[] = [
  { id: "l1", crop: "Paddy (ADT 45)", farmer: "Murugan Selvam", location: "Erode, TN", quantity: "8 tonnes", price: 2320, unit: "quintal", grade: "A", harvested: "12 days ago" },
  { id: "l2", crop: "Tomato", farmer: "Lakshmi Devi", location: "Madanapalle, AP", quantity: "1.4 tonnes", price: 1850, unit: "quintal", grade: "A", harvested: "2 days ago" },
  { id: "l3", crop: "Turmeric (Finger)", farmer: "Kannan R", location: "Salem, TN", quantity: "3 tonnes", price: 14200, unit: "quintal", grade: "Premium", harvested: "1 month ago" },
  { id: "l4", crop: "Groundnut", farmer: "Sivakumar P", location: "Tiruvannamalai, TN", quantity: "5 tonnes", price: 6400, unit: "quintal", grade: "B", harvested: "20 days ago" },
  { id: "l5", crop: "Banana (Nendran)", farmer: "Anitha Joseph", location: "Thrissur, KL", quantity: "2.2 tonnes", price: 3600, unit: "quintal", grade: "A", harvested: "5 days ago" },
  { id: "l6", crop: "Cotton (Shankar-6)", farmer: "Ramesh Patil", location: "Dharwad, KA", quantity: "6 tonnes", price: 7350, unit: "quintal", grade: "A", harvested: "18 days ago" },
];

export type Service = {
  id: string;
  name: string;
  provider: string;
  type: "Equipment" | "Labour" | "Advisory" | "Transport";
  rate: number;
  unit: string;
  rating: number;
  available: string;
};

export const SERVICES: Service[] = [
  { id: "s1", name: "Tractor with Rotavator", provider: "Kisan Agro Rentals", type: "Equipment", rate: 950, unit: "hour", rating: 4.7, available: "Tomorrow onwards" },
  { id: "s2", name: "Combine Harvester", provider: "Green Harvest Co.", type: "Equipment", rate: 2400, unit: "hour", rating: 4.5, available: "In 3 days" },
  { id: "s3", name: "Drone Spraying Service", provider: "SkyFarm Aerials", type: "Equipment", rate: 700, unit: "acre", rating: 4.8, available: "Today" },
  { id: "s4", name: "Transplanting Labour Team", provider: "Grama Thozhilalar Sangam", type: "Labour", rate: 480, unit: "person/day", rating: 4.3, available: "Today" },
  { id: "s5", name: "Soil Testing & Agronomy Visit", provider: "Dr. Vasanthi Agri Lab", type: "Advisory", rate: 1200, unit: "visit", rating: 4.9, available: "In 2 days" },
  { id: "s6", name: "Refrigerated Produce Transport", provider: "ColdLink Logistics", type: "Transport", rate: 38, unit: "km", rating: 4.4, available: "Today" },
];

export const IOT_SENSORS = [
  { id: "n1", name: "Node A — North Block", crop: "Paddy", moisture: 62, temp: 31.4, humidity: 68, ph: 6.4, npk: "N 68 · P 42 · K 55", battery: 88, status: "Optimal" },
  { id: "n2", name: "Node B — Canal Side", crop: "Banana", moisture: 78, temp: 29.8, humidity: 74, ph: 6.9, npk: "N 74 · P 38 · K 61", battery: 71, status: "Optimal" },
  { id: "n3", name: "Node C — Dry Plot", crop: "Groundnut", moisture: 24, temp: 34.6, humidity: 41, ph: 7.6, npk: "N 41 · P 29 · K 33", battery: 46, status: "Irrigate now" },
  { id: "n4", name: "Node D — Greenhouse", crop: "Tomato", moisture: 55, temp: 27.2, humidity: 63, ph: 6.2, npk: "N 82 · P 56 · K 70", battery: 93, status: "Optimal" },
];

export const IOT_TIMESERIES = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, "0")}:00`,
  moisture: Math.round(52 + 14 * Math.sin((i / 24) * Math.PI * 2) + (i % 4)),
  temp: Math.round((26 + 7 * Math.sin(((i - 6) / 24) * Math.PI * 2)) * 10) / 10,
  humidity: Math.round(60 + 12 * Math.cos((i / 24) * Math.PI * 2)),
}));

export const MARKET_TREND = [
  { month: "Jan", paddy: 2100, tomato: 1400, turmeric: 12800, cotton: 6900 },
  { month: "Feb", paddy: 2150, tomato: 1750, turmeric: 13100, cotton: 7050 },
  { month: "Mar", paddy: 2240, tomato: 2200, turmeric: 13600, cotton: 7180 },
  { month: "Apr", paddy: 2280, tomato: 2650, turmeric: 13400, cotton: 7220 },
  { month: "May", paddy: 2310, tomato: 2100, turmeric: 13900, cotton: 7300 },
  { month: "Jun", paddy: 2295, tomato: 1680, turmeric: 14250, cotton: 7420 },
  { month: "Jul", paddy: 2330, tomato: 1850, turmeric: 14100, cotton: 7510 },
  { month: "Aug", paddy: 2380, tomato: 2400, turmeric: 14600, cotton: 7480 },
];

export const DEMAND_FORECAST = [
  { crop: "Tomato", demand: 92, supply: 61, advice: "Plant now — 3 month window" },
  { crop: "Turmeric", demand: 84, supply: 58, advice: "Strong export pull" },
  { crop: "Paddy", demand: 71, supply: 79, advice: "Hold, prices flat" },
  { crop: "Cotton", demand: 66, supply: 72, advice: "Sell existing stock" },
  { crop: "Groundnut", demand: 58, supply: 44, advice: "Moderate opportunity" },
];

export const CROP_RECOMMENDATIONS = [
  { crop: "Paddy (ADT 45)", match: 94, season: "Kharif", water: "High", duration: "115 days", profit: "₹48,000 / ha", why: "Alluvial soil, canal irrigation and 1100 mm rainfall window fit perfectly." },
  { crop: "Banana (Nendran)", match: 88, season: "Year round", water: "High", duration: "300 days", profit: "₹1,90,000 / ha", why: "Warm humid climate and pH 6.5 loam support high bunch weight." },
  { crop: "Turmeric", match: 81, season: "Kharif", water: "Medium", duration: "240 days", profit: "₹1,35,000 / ha", why: "Well drained loam with partial shade and strong regional market." },
  { crop: "Groundnut", match: 74, season: "Rabi", water: "Low", duration: "105 days", profit: "₹62,000 / ha", why: "Sandy loam pockets and low irrigation dependency reduce risk." },
];

export const ADMIN_STATS = [
  { label: "Registered farmers", value: "12,480", delta: "+8.2%" },
  { label: "Active IoT nodes", value: "3,214", delta: "+4.1%" },
  { label: "Disease scans (30d)", value: "48,905", delta: "+21.6%" },
  { label: "Marketplace GMV", value: "₹2.9 Cr", delta: "+13.4%" },
];

export const ADMIN_SIGNUPS = [
  { month: "Mar", farmers: 620, buyers: 240 },
  { month: "Apr", farmers: 810, buyers: 310 },
  { month: "May", farmers: 940, buyers: 402 },
  { month: "Jun", farmers: 1120, buyers: 466 },
  { month: "Jul", farmers: 1380, buyers: 512 },
  { month: "Aug", farmers: 1610, buyers: 604 },
];

export const ACTIVITY = [
  { title: "Leaf blight detected on Node C plot", detail: "Confidence 91% · Suggested: Propiconazole 25% EC", time: "22 min ago" },
  { title: "Soil moisture below threshold", detail: "Node C — Dry Plot dropped to 24%", time: "1 hr ago" },
  { title: "New buyer enquiry", detail: "8 t paddy lot — Erode Mandi trader", time: "3 hrs ago" },
  { title: "Booking confirmed", detail: "Drone spraying · 6 acres · tomorrow 07:00", time: "Yesterday" },
];