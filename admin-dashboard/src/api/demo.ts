/**
 * Offline demo store.
 *
 * The dashboard normally talks to the Express + MongoDB server through /api. When that
 * server (or its database) is unreachable, this in-browser store takes over so the admin
 * UI stays fully explorable — CRUD even persists to localStorage. A banner in the layout
 * makes clear when demo data is on screen.
 *
 * The dataset mirrors the server seed (same courses, same admin credentials).
 */

import type {
  AdminUser,
  AppSettings,
  Category,
  Coupon,
  Course,
  EnrollmentDetail,
  Order,
  OrderStatus,
  Overview,
  Review,
  UserDetail,
} from './types';

// ---------- deterministic RNG -------------------------------------------------
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(20261008);
const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
const randInt = (min: number, max: number) => Math.floor(rand() * (max - min + 1)) + min;

let idCounter = 0;
const hexId = (prefix: string) => {
  idCounter += 1;
  return `${prefix}${(idCounter * 2654435761).toString(16).padStart(8, '0')}${prefix.length}`.padEnd(24, 'a').slice(0, 24);
};

const DAY = 86_400_000;
const now = Date.now();

// ---------- static catalog ------------------------------------------------------
const categorySeeds: Array<Pick<Category, 'slug' | 'label' | 'icon' | 'sortOrder'>> = [
  { slug: 'milk', label: 'Milk handling', icon: 'Milk', sortOrder: 1 },
  { slug: 'paneer', label: 'Paneer & chhana', icon: 'Package', sortOrder: 2 },
  { slug: 'ghee', label: 'Ghee & butter', icon: 'Flame', sortOrder: 3 },
  { slug: 'ferments', label: 'Curd & ferments', icon: 'Soup', sortOrder: 4 },
  { slug: 'cheese', label: 'Cheese', icon: 'CakeSlice', sortOrder: 5 },
  { slug: 'frozen', label: 'Frozen desserts', icon: 'IceCream', sortOrder: 6 },
  { slug: 'farming', label: 'Farm & animals', icon: 'Leaf', sortOrder: 7 },
  { slug: 'business', label: 'Dairy business', icon: 'Store', sortOrder: 8 },
];

type CourseSeed = Omit<Course, '_id' | 'category' | 'rating' | 'reviewCount'> & { categoryId: string };

const L = (title: string, minutes: number, isPreview = false) => ({
  title,
  minutes,
  isPreview,
  description: '',
});

const courseSeeds: CourseSeed[] = [
  {
    slug: 'milk-foundations',
    title: 'Milk Foundations',
    promise: 'Buy, chill, test and store milk with the numbers a dairy actually runs on.',
    description: 'Reception checks, fat and SNF, chilling curves, adulteration tests and cleaning — every step demonstrated on real equipment.',
    coverUrl: '',
    categoryId: 'milk',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1999,
    listPriceInr: 2999,
    published: true,
    isPopular: true,
    isBeginnerPick: true,
    audience: 'New dairy owners and milk-collection staff.',
    outcomes: ['Judge milk quality on arrival', 'Take fat, SNF and lactometer readings', 'Chill a batch fast enough to hold shelf life'],
    equipment: ['Calibrated lactometer', 'Milk fat tester', 'Probe thermometer'],
    sections: [
      { title: 'Milk on arrival', summary: 'The reception routine.', lessons: [L('The reception check, step by step', 14, true), L('Fat, SNF and what they decide', 16), L('Reading a lactometer correctly', 12)] },
      { title: 'Cold chain', summary: 'Warm can to chilled bulk.', lessons: [L('The chilling curve', 18), L('Storing and transporting a batch', 15)] },
      { title: 'Testing and hygiene', summary: 'The small lab routine.', lessons: [L('Common adulteration tests', 18), L('Cleaning a milk line', 15), L('Running a small lab bench', 20)] },
    ],
  },
  {
    slug: 'paneer-craft',
    title: 'Paneer Craft',
    promise: 'Consistent paneer and chhana with yield numbers you can price from.',
    description: 'Acid strength, coagulation temperature, pressing and costing — the complete paneer make, batch by batch.',
    coverUrl: '',
    categoryId: 'paneer',
    level: 'Beginner',
    language: 'English',
    priceInr: 2999,
    listPriceInr: 3999,
    published: true,
    isPopular: true,
    isBeginnerPick: false,
    audience: 'Sweet-shop and dairy kitchen teams.',
    outcomes: ['Coagulate at the right strength', 'Press a block with even body', 'Cost a paneer batch into a per-kilo price'],
    equipment: ['Heavy-bottom pan', 'Muslin cloth and press'],
    sections: [
      { title: 'Before the first batch', summary: 'Recipes and milk choice.', lessons: [L('Reading a recipe like a dairy hand', 13, true), L('Choosing milk for yield', 17), L('Acid strength and temperature', 11, true)] },
      { title: 'Your first paneer', summary: 'Coagulation to pressing.', lessons: [L('Making a clean paneer block', 22), L('Cutting, cooling and storing', 21), L('A soft chhana make', 16)] },
      { title: 'Yield, quality and cost', summary: 'Batch to sellable product.', lessons: [L('Diagnosing a failed batch', 19), L('Packing and shelf life', 17), L('Costing a paneer batch', 15)] },
    ],
  },
  {
    slug: 'curd-ferments',
    title: 'Curd & Ferments',
    promise: 'Daily curd sets, drinks and thick products with reliable culture handling.',
    description: 'Cultures, the daily set, hung curd, lassi and mishti bases — plus the batch record that diagnoses faults.',
    coverUrl: '',
    categoryId: 'ferments',
    level: 'Beginner',
    language: 'English',
    priceInr: 1299,
    listPriceInr: 1999,
    published: true,
    isPopular: false,
    isBeginnerPick: true,
    audience: 'Home producers and small dairies.',
    outcomes: ['Handle starter cultures reliably', 'Set curd to the same firmness daily', 'Diagnose fermentation faults'],
    equipment: ['Incubator or warm space', 'Thermometer', 'Food-grade culture'],
    sections: [
      { title: 'Culture', summary: 'The living ingredient.', lessons: [L('Cultures and how they behave', 14, true), L('Handling and storing a starter', 12)] },
      { title: 'Setting curd', summary: 'Boiled milk to reliable set.', lessons: [L('The daily curd set', 19), L('In-cup setting', 16), L('Hung curd and thick products', 15)] },
      { title: 'Drinks and desserts', summary: 'Set into product line.', lessons: [L('Lassi, chaas and mattha', 14), L('A simple mishti base', 18), L('Diagnosing fermentation faults', 16)] },
    ],
  },
  {
    slug: 'ghee-butter',
    title: 'Ghee & Butter at Home',
    promise: 'White butter and ghee from cream, with the flavour stages on camera.',
    description: 'Collecting and ripening cream, churning white butter, and taking ghee through its stages without burning.',
    coverUrl: '',
    categoryId: 'ghee',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1499,
    listPriceInr: 2199,
    published: true,
    isPopular: true,
    isBeginnerPick: false,
    audience: 'Home producers and small shops.',
    outcomes: ['Separate cream at the right fat level', 'Churn clean white butter', 'Take ghee through every stage'],
    equipment: ['Cream separator', 'Churn or mixer', 'Heavy kadhai'],
    sections: [
      { title: 'Cream', summary: 'Where quality starts.', lessons: [L('Collecting and separating cream', 15, true), L('Ripening for flavour', 13)] },
      { title: 'Butter', summary: 'Churning and washing.', lessons: [L('Churning a clean white butter', 18), L('Salted and cultured butters', 14)] },
      { title: 'Ghee', summary: 'Reading the pot.', lessons: [L('Simmering to the golden stage', 20), L('Straining, storing and jar-filling', 12)] },
    ],
  },
  {
    slug: 'frozen-desserts',
    title: 'Frozen Dairy Desserts',
    promise: 'Kulfi, matka ice cream and frozen desserts with no ice crystals.',
    description: 'The mix, the ice-crystal rule, matka freezing and the cold chain to the shop.',
    coverUrl: '',
    categoryId: 'frozen',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 2499,
    listPriceInr: null,
    published: true,
    isPopular: false,
    isBeginnerPick: false,
    audience: 'Dessert makers starting a frozen line.',
    outcomes: ['Build a balanced mix', 'Keep ice crystals small', 'Cost a frozen line'],
    equipment: ['Moulds or matkas', '−18 °C freezer'],
    sections: [
      { title: 'The mix', summary: 'Balance first.', lessons: [L('Fat, sugar and solids in balance', 17), L('Kulfi base, reduced properly', 16)] },
      { title: 'Freezing', summary: 'Slow versus fast.', lessons: [L('Matka kulfi the traditional way', 19), L('Small-batch freezer ice cream', 18)] },
      { title: 'Cold chain and costing', summary: 'Freezer to shop.', lessons: [L('Storage, transport and display', 14), L('Costing a frozen line', 13)] },
    ],
  },
  {
    slug: 'artisan-cheese',
    title: 'Artisan Cheese',
    promise: 'Fresh and pressed cheeses with real cheese-room hygiene.',
    description: 'Rennet coagulation, pressing, salting and a short affinage a small producer can run.',
    coverUrl: '',
    categoryId: 'cheese',
    level: 'Advanced',
    language: 'English',
    priceInr: 3999,
    listPriceInr: 4999,
    published: true,
    isPopular: false,
    isBeginnerPick: false,
    audience: 'Producers moving into cheese.',
    outcomes: ['Set and cut a rennet curd', 'Press, salt and dry a wheel', 'Run a short affinage'],
    equipment: ['Moulds and press', 'pH strips', 'Cool ripening space'],
    sections: [
      { title: 'The cheese room', summary: 'Hygiene before the vat.', lessons: [L('Layout, drains and workflow', 15), L('Cultures and rennet', 14)] },
      { title: 'A pressed cheese', summary: 'Vat to wheel.', lessons: [L('Setting, cutting and cooking the curd', 24), L('Pressing and salting', 18), L('Affinage for small producers', 16)] },
    ],
  },
  {
    slug: 'dairy-farming',
    title: 'Dairy Farming Essentials',
    promise: 'Animal care, milking hygiene and forage planning for a small farm.',
    description: 'Breed selection, feeding, milking routine, mastitis prevention and farm records.',
    coverUrl: '',
    categoryId: 'farming',
    level: 'Beginner',
    language: 'Hindi',
    priceInr: 2199,
    listPriceInr: null,
    published: true,
    isPopular: false,
    isBeginnerPick: false,
    audience: 'Farm owners supplying dairies.',
    outcomes: ['Choose suited animals', 'Run a clean milking routine', 'Spot mastitis early'],
    equipment: ['Clean milking area', 'Strip cup', 'Feed store'],
    sections: [
      { title: 'Animals and feeding', summary: 'Feed decides milk.', lessons: [L('Choosing your animals', 16), L('Rations and green fodder', 19)] },
      { title: 'Milking and health', summary: 'A reliable routine.', lessons: [L('The milking routine', 15), L('Mastitis prevention', 17), L('Farm records that pay', 12)] },
    ],
  },
  {
    slug: 'dairy-business',
    title: 'Selling Your Dairy',
    promise: 'Pricing, licences and the shop math that turns batches into margin.',
    description: 'FSSAI registration, honest pricing, credit discipline and the monthly numbers to watch.',
    coverUrl: '',
    categoryId: 'business',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 1799,
    listPriceInr: 2499,
    published: true,
    isPopular: false,
    isBeginnerPick: false,
    audience: 'Owners who need the selling side to work.',
    outcomes: ['Get FSSAI registration yourself', 'Price from the batch sheet', 'Read a one-page profit sheet'],
    equipment: ['Weighing scale', 'Rate board', 'One notebook'],
    sections: [
      { title: 'Licences and setup', summary: 'Legal first.', lessons: [L('FSSAI registration step by step', 16), L('Labelling and claims', 12)] },
      { title: 'Money', summary: 'Pricing and credit.', lessons: [L('Pricing from the batch sheet', 18), L('Credit, ledgers and collections', 14), L('The monthly one-pager', 11)] },
    ],
  },
];

const firstNames = ['Aarav', 'Priya', 'Rohan', 'Sneha', 'Vikram', 'Ananya', 'Karan', 'Meera', 'Aditya', 'Pooja', 'Rahul', 'Divya', 'Suresh', 'Kavita', 'Manish', 'Ritu', 'Amit', 'Neha', 'Deepak', 'Shreya'];
const lastNames = ['Sharma', 'Verma', 'Patel', 'Yadav', 'Singh', 'Gupta', 'Mehta', 'Joshi', 'Chavan', 'Reddy', 'Nair', 'Kulkarni', 'Desai'];
const reviewBodies = [
  'Very practical — I used the batch sheet the very next morning.',
  'Clear numbers, no fluff. Exactly what a working dairy needs.',
  'The videos show real equipment, which made all the difference.',
  'Good pace and the Hindi examples help my staff follow along.',
  'The costing lesson alone paid for the course.',
  'Solid basics; would love an advanced follow-up.',
  'Wish it were longer, but everything shown works as promised.',
];

// ---------- the store ---------------------------------------------------------------
export interface DemoDb {
  admin: AdminUser;
  users: AdminUser[];
  categories: Category[];
  courses: Course[];
  orders: Order[];
  enrollments: { _id: string; userId: string; courseId: string; completed: number; createdAt: string }[];
  reviews: Review[];
  coupons: Coupon[];
  settings: AppSettings;
}

function buildDb(): DemoDb {
  const categories: Category[] = categorySeeds.map((c) => ({ ...c, _id: hexId('ca7') }));
  const catBySlug = new Map(categories.map((c) => [c.slug, c]));

  const courses: Course[] = courseSeeds.map((seed) => {
    const { categoryId, ...rest } = seed;
    const sections = seed.sections.map((s) => ({
      ...s,
      _id: hexId('sec'),
      lessons: s.lessons.map((l) => ({ ...l, _id: hexId('les') })),
    }));
    return {
      ...rest,
      sections,
      _id: hexId('c04'),
      category: catBySlug.get(categoryId)!,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(now - randInt(90, 220) * DAY).toISOString(),
    };
  });

  const admin: AdminUser = {
    _id: hexId('ad0'),
    name: 'YDU Admin',
    email: 'admin@yduacademy.com',
    role: 'admin',
    blocked: false,
    createdAt: new Date(now - 300 * DAY).toISOString(),
  };

  const users: AdminUser[] = [];
  for (let i = 0; i < 34; i += 1) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    users.push({
      _id: hexId('be5'),
      name,
      email: `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${randInt(1, 99)}@example.com`,
      phone: `98${randInt(10000000, 99999999)}`,
      role: 'user',
      blocked: rand() < 0.06,
      createdAt: new Date(now - randInt(0, 70) * DAY - randInt(0, 20) * 3600_000).toISOString(),
    });
  }

  const coupons: Coupon[] = [
    { _id: hexId('c0a'), code: 'WELCOME10', description: '10% off your first course', type: 'percent', value: 10, maxUses: 0, usedCount: randInt(20, 40), expiresAt: null, active: true },
    { _id: hexId('c0b'), code: 'DAIRY200', description: '₹200 off any course', type: 'flat', value: 200, maxUses: 500, usedCount: randInt(60, 120), expiresAt: null, active: true },
    { _id: hexId('c0c'), code: 'FESTIVE25', description: '25% off — festival week', type: 'percent', value: 25, maxUses: 200, usedCount: randInt(30, 80), expiresAt: new Date(now + 21 * DAY).toISOString(), active: true },
    { _id: hexId('c0d'), code: 'OLD2019', description: 'Expired launch coupon', type: 'percent', value: 15, maxUses: 100, usedCount: 100, expiresAt: new Date(now - 300 * DAY).toISOString(), active: false },
  ];

  const orders: Order[] = [];
  const enrollments: DemoDb['enrollments'] = [];
  const enrolledKeys = new Set<string>();
  const paidKeys = new Set<string>();
  for (let i = 0; i < 210; i += 1) {
    const user = pick(users);
    const course = pick(courses);
    const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 60);
    const createdAt = new Date(now - daysAgo * DAY - randInt(1, 18) * 3600_000);
    let discountInr = 0;
    let couponCode = '';
    if (rand() < 0.18) {
      const coupon = pick(coupons.filter((c) => c.active));
      discountInr = coupon.type === 'flat' ? Math.min(coupon.value, course.priceInr) : Math.round((course.priceInr * coupon.value) / 100);
      couponCode = coupon.code;
    }
    const status: OrderStatus = rand() < 0.93 ? 'paid' : rand() < 0.6 ? 'refunded' : 'pending';
    const key = `${user._id}:${course._id}`;
    if (status === 'paid' && paidKeys.has(key)) continue;
    if (status === 'paid') paidKeys.add(key);

    orders.push({
      _id: hexId('04d'),
      user: { _id: user._id, name: user.name, email: user.email },
      course: { _id: course._id, title: course.title },
      courseTitle: course.title,
      amountInr: course.priceInr - discountInr,
      listAmountInr: course.listPriceInr ?? course.priceInr,
      couponCode,
      discountInr,
      status,
      paymentMethod: pick(['upi', 'card', 'netbanking', 'wallet']),
      createdAt: createdAt.toISOString(),
    });

    if (status === 'paid' && !enrolledKeys.has(key)) {
      enrolledKeys.add(key);
      const lessonTotal = course.sections.reduce((sum, s) => sum + s.lessons.length, 0);
      enrollments.push({
        _id: hexId('e01'),
        userId: user._id,
        courseId: course._id,
        completed: randInt(0, lessonTotal),
        createdAt: createdAt.toISOString(),
      });
    }
  }

  const reviews: Review[] = [];
  const reviewKeys = new Set<string>();
  for (let i = 0; i < 90; i += 1) {
    const user = pick(users);
    const course = pick(courses);
    const key = `${user._id}:${course._id}`;
    if (reviewKeys.has(key)) continue;
    reviewKeys.add(key);
    const rating = rand() < 0.62 ? 5 : rand() < 0.75 ? 4 : randInt(2, 3);
    reviews.push({
      _id: hexId('4e7'),
      course: { _id: course._id, title: course.title, slug: course.slug },
      user: { _id: user._id, name: user.name, email: user.email },
      author: user.name,
      rating,
      body: pick(reviewBodies),
      visible: rand() < 0.94,
      createdAt: new Date(now - randInt(0, 55) * DAY).toISOString(),
    });
  }

  // Denormalised ratings from visible reviews.
  for (const course of courses) {
    const rs = reviews.filter((r) => (r.course as { _id: string })._id === course._id && r.visible);
    course.reviewCount = rs.length;
    course.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
  }

  return {
    admin,
    users,
    categories,
    courses,
    orders,
    enrollments,
    reviews,
    coupons,
    settings: {
      appName: 'YDU Academy',
      tagline: 'Learn the dairy trade, one batch at a time.',
      supportEmail: 'support@ydu.academy',
      supportPhone: '+91 98765 43210',
      currency: 'INR',
      maintenanceMode: false,
      minAppVersion: '',
    },
  };
}

// ---------- persistence ---------------------------------------------------------------
const LS_KEY = 'ydu-admin-demo-db-v1';

let db: DemoDb = load();

function load(): DemoDb {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw) as DemoDb;
  } catch {
    /* corrupted storage — rebuild */
  }
  return buildDb();
}

function save() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(db));
  } catch {
    /* storage full — demo continues in memory */
  }
}

/** Clear the demo dataset and rebuild it (used by the demo banner). */
export function resetDemoDb() {
  db = buildDb();
  save();
}

// ---------- overview computation --------------------------------------------------------
function overview(): Overview {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const t = today.getTime();
  const d30 = t - 30 * DAY;
  const d60 = t - 60 * DAY;

  const paid = db.orders.filter((o) => o.status === 'paid');
  const inRange = (o: { createdAt: string }, from: number, to: number) => {
    const ts = new Date(o.createdAt).getTime();
    return ts >= from && ts < to;
  };
  const sum = (os: Order[]) => os.reduce((s, o) => s + o.amountInr, 0);

  const revenue30 = sum(paid.filter((o) => inRange(o, d30, t + DAY)));
  const revenuePrev = sum(paid.filter((o) => inRange(o, d60, d30)));
  const users30 = db.users.filter((u) => new Date(u.createdAt).getTime() >= d30);
  const usersPrev = db.users.filter((u) => {
    const ts = new Date(u.createdAt).getTime();
    return ts >= d60 && ts < d30;
  });
  const enroll30 = db.enrollments.filter((e) => new Date(e.createdAt).getTime() >= d30);
  const enrollPrev = db.enrollments.filter((e) => {
    const ts = new Date(e.createdAt).getTime();
    return ts >= d60 && ts < d30;
  });
  const orders30 = paid.filter((o) => inRange(o, d30, t + DAY));
  const ordersPrev = paid.filter((o) => inRange(o, d60, d30));

  const pct = (cur: number, prev: number) => (prev === 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));

  const dayLabel = (ts: number) => new Date(ts).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const revenueSeries: Overview['revenueSeries'] = [];
  const enrollmentSeries: Overview['enrollmentSeries'] = [];
  for (let i = 29; i >= 0; i -= 1) {
    const dayStart = t - i * DAY;
    const revenue = sum(paid.filter((o) => inRange(o, dayStart, dayStart + DAY)));
    const count = paid.filter((o) => inRange(o, dayStart, dayStart + DAY)).length;
    revenueSeries.push({ date: dayLabel(dayStart), revenue, orders: count });
    if (i < 14) {
      enrollmentSeries.push({
        date: dayLabel(dayStart),
        enrollments: db.enrollments.filter((e) => inRange(e, dayStart, dayStart + DAY)).length,
      });
    }
  }

  const topCourses = db.courses
    .map((course) => {
      const courseOrders = orders30.filter((o) => o.course?._id === course._id || o.courseTitle === course.title);
      return {
        id: course._id,
        title: course.title,
        coverUrl: course.coverUrl,
        rating: course.rating,
        priceInr: course.priceInr,
        published: course.published,
        enrollments30: enroll30.filter((e) => e.courseId === course._id).length,
        revenue30: sum(courseOrders),
      };
    })
    .sort((a, b) => b.revenue30 - a.revenue30)
    .slice(0, 6);

  const ratingDistribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: db.reviews.filter((r) => r.visible && r.rating === stars).length,
  }));

  const categoryBreakdown = db.categories
    .map((category) => {
      const catCourses = db.courses.filter((c) => (c.category as Category)._id === category._id);
      const ids = new Set(catCourses.map((c) => c._id));
      return {
        label: category.label,
        courses: catCourses.length,
        enrollments30: enroll30.filter((e) => ids.has(e.courseId)).length,
      };
    })
    .sort((a, b) => b.enrollments30 - a.enrollments30);

  const recentOrders = [...db.orders]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 8)
    .map((o) => ({
      id: o._id,
      courseTitle: o.courseTitle,
      user: o.user ? { name: o.user.name, email: o.user.email } : null,
      amountInr: o.amountInr,
      status: o.status,
      createdAt: o.createdAt,
    }));

  const recentUsers = [...db.users]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 6)
    .map((u) => ({ _id: u._id, name: u.name, email: u.email, createdAt: u.createdAt }));

  const rated = db.courses.filter((c) => c.reviewCount > 0);
  return {
    kpis: {
      revenue30,
      revenueDelta: pct(revenue30, revenuePrev),
      orders30: orders30.length,
      ordersDelta: pct(orders30.length, ordersPrev.length),
      newUsers30: users30.length,
      newUsersDelta: pct(users30.length, usersPrev.length),
      enrollments30: enroll30.length,
      enrollmentsDelta: pct(enroll30.length, enrollPrev.length),
      totalUsers: db.users.length,
      totalCourses: db.courses.length,
      publishedCourses: db.courses.filter((c) => c.published).length,
      avgRating: rated.length ? Math.round((rated.reduce((s, c) => s + c.rating, 0) / rated.length) * 10) / 10 : 0,
    },
    revenueSeries,
    enrollmentSeries,
    topCourses,
    ratingDistribution,
    categoryBreakdown,
    recentOrders,
    recentUsers,
  };
}

// ---------- helpers ---------------------------------------------------------------------
function withEnrollmentCounts<T extends { _id: string }>(courses: (T & Partial<Course>)[]) {
  return courses.map((course) => ({
    ...course,
    enrollmentCount: db.enrollments.filter((e) => e.courseId === course._id).length,
    lessonCount: (course.sections || []).reduce((sum, s) => sum + s.lessons.length, 0),
  }));
}

export class DemoApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------- the request dispatcher --------------------------------------------------------
/**
 * Handles the endpoints the dashboard uses, against the in-memory store.
 * Mirrors the Express route behaviour closely enough for the UI not to notice.
 */
/**
 * Demo-mode behaviour analytics. Derived from the same in-browser orders/users as
 * the rest of the demo store, so the numbers stay coherent with the Orders page.
 */
function analyticsOverview(days: number) {
  const clamp = Math.min(Math.max(days, 7), 365);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = today.getTime() - (clamp - 1) * DAY;

  const paid = db.orders.filter((o) => o.status === 'paid');
  const paidByDay = new Map<string, { count: number; revenue: number }>();
  for (const order of paid) {
    const key = order.createdAt.slice(0, 10);
    const entry = paidByDay.get(key) || { count: 0, revenue: 0 };
    entry.count += 1;
    entry.revenue += order.amountInr;
    paidByDay.set(key, entry);
  }

  const daily = [] as Array<{
    date: string; label: string; requests: number; uniques: number; courseViews: number;
    checkouts: number; lessonStarts: number; purchases: number; revenueInr: number;
  }>;
  for (let i = 0; i < clamp; i += 1) {
    const d = new Date(start + i * DAY);
    const key = d.toISOString().slice(0, 10);
    const growth = 1 + i * 0.012;
    const weekly = d.getUTCDay() === 0 ? 0.7 : d.getUTCDay() === 6 ? 0.85 : 1;
    const requests = Math.round((260 + rand() * 240) * growth * weekly);
    const uniques = Math.round(requests * (0.22 + rand() * 0.1));
    const od = paidByDay.get(key);
    const purchases = od?.count || 0;
    daily.push({
      date: key,
      label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      requests,
      uniques,
      courseViews: Math.round(uniques * (1.6 + rand() * 0.8)),
      checkouts: purchases + Math.round(purchases * (0.5 + rand() * 0.6)) + randInt(1, 4),
      lessonStarts: Math.round(uniques * (1.1 + rand() * 0.7)),
      purchases,
      revenueInr: od?.revenue || 0,
    });
  }

  const totals = daily.reduce(
    (acc, row) => {
      acc.requests += row.requests;
      acc.courseViews += row.courseViews;
      acc.checkouts += row.checkouts;
      acc.purchases += row.purchases;
      acc.revenueInr += row.revenueInr;
      return acc;
    },
    { requests: 0, courseViews: 0, checkouts: 0, purchases: 0, revenueInr: 0 }
  );

  const last = daily[daily.length - 1];
  const sumSince = (n: number) => daily.slice(-n).reduce((s, row) => s + row.uniques, 0);

  const byCourse = new Map<string, { count: number; revenue: number; title: string }>();
  const since = new Date(start).toISOString();
  for (const order of paid.filter((o) => o.createdAt >= since)) {
    const key = (order.course as { _id: string })._id;
    const entry = byCourse.get(key) || { count: 0, revenue: 0, title: order.courseTitle };
    entry.count += 1;
    entry.revenue += order.amountInr;
    byCourse.set(key, entry);
  }
  const topPurchased = [...byCourse.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 5)
    .map(([id, entry]) => ({ id, slug: id, title: entry.title, count: entry.count, revenueInr: entry.revenue }));
  const topViewed = [...byCourse.entries()]
    .map(([id, entry]) => ({ id, slug: id, title: entry.title, count: entry.count * randInt(7, 12) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Learn-hour shape: mornings and evenings, quiet overnight.
  const peakHours = Array.from({ length: 24 }, (_, hour) => {
    const morning = Math.exp(-((hour - 9) ** 2) / 8) * 46;
    const evening = Math.exp(-((hour - 20) ** 2) / 6) * 64;
    return { hour, count: Math.round((morning + evening) * (0.75 + rand() * 0.5)) };
  });

  const searchTerms: Array<[string, number]> = [
    ['paneer', randInt(40, 70)], ['ghee', randInt(30, 55)], ['milk testing', randInt(22, 40)],
    ['curd', randInt(18, 34)], ['cheese', randInt(14, 28)], ['lactometer', randInt(9, 20)],
    ['dahi', randInt(8, 16)], ['cream', randInt(5, 12)],
  ];

  return {
    periodDays: clamp,
    kpis: {
      requests: { total: totals.requests, today: last.requests },
      activeUsers: { dau: last.uniques, wau: sumSince(7), mau: sumSince(30) },
      signups: { total: Math.round(totals.requests * 0.021), today: randInt(1, 4) },
      orders: {
        count: totals.purchases,
        revenueInr: totals.revenueInr,
        today: { count: last.purchases, revenueInr: last.revenueInr },
      },
    },
    daily,
    funnel: {
      courseViews: totals.courseViews,
      checkoutStarted: totals.checkouts,
      ordersPaid: totals.purchases,
      conversionPct: totals.courseViews > 0 ? Math.round((totals.purchases / totals.courseViews) * 1000) / 10 : 0,
    },
    peakHours,
    topViewed,
    topPurchased,
    topSearches: searchTerms.map(([query, count]) => ({ query, count })),
  };
}

export function demoRequest(method: string, path: string, body?: unknown, query?: Record<string, string>): unknown {
  const [pathname, search] = path.split('?');
  const q: Record<string, string> = { ...(query || {}) };
  if (search) {
    new URLSearchParams(search).forEach((v, k) => {
      q[k] = v;
    });
  }
  const b = (body || {}) as Record<string, any>;

  // ---- auth ---------------------------------------------------------------
  if (method === 'POST' && pathname === '/auth/login') {
    const { email, password } = b;
    if (email === db.admin.email && password === 'Admin@123') {
      return { token: 'demo-token', user: db.admin };
    }
    throw new DemoApiError(401, 'Incorrect email or password');
  }
  if (method === 'GET' && pathname === '/auth/me') return { user: db.admin };

  // ---- overview --------------------------------------------------------------
  if (method === 'GET' && pathname === '/admin/stats/overview') return overview();
  if (method === 'GET' && pathname === '/admin/analytics/overview') {
    return analyticsOverview(Number(q.days) || 30);
  }

  // ---- courses ------------------------------------------------------------------
  if (pathname === '/admin/courses' && method === 'GET') {
    let list = [...db.courses];
    if (q.search) {
      const rx = new RegExp(q.search, 'i');
      list = list.filter((c) => rx.test(c.title) || rx.test(c.slug));
    }
    if (q.category) list = list.filter((c) => (c.category as Category)._id === q.category);
    if (q.published) list = list.filter((c) => String(c.published) === q.published);
    if (q.sort === 'price') list.sort((a, b2) => b2.priceInr - a.priceInr);
    else if (q.sort === 'rating') list.sort((a, b2) => b2.rating - a.rating);
    else list.sort((a, b2) => (b2.createdAt || '').localeCompare(a.createdAt || ''));
    return { courses: withEnrollmentCounts(list) };
  }
  if (pathname === '/admin/courses' && method === 'POST') {
    const category = db.categories.find((c) => c._id === b.category);
    if (!category) throw new DemoApiError(400, 'Unknown category');
    const course: Course = {
      _id: hexId(`c${Date.now() % 100}`),
      slug:
        b.slug ||
        String(b.title)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, ''),
      title: b.title,
      promise: b.promise || '',
      description: b.description || '',
      coverUrl: b.coverUrl || '',
      category,
      level: b.level || 'Beginner',
      language: b.language || 'English',
      priceInr: b.priceInr,
      listPriceInr: b.listPriceInr ?? null,
      published: b.published ?? false,
      isPopular: b.isPopular ?? false,
      isBeginnerPick: b.isBeginnerPick ?? false,
      rating: 0,
      reviewCount: 0,
      outcomes: b.outcomes || [],
      equipment: b.equipment || [],
      audience: b.audience || '',
      sections: b.sections || [],
      createdAt: new Date().toISOString(),
    };
    db.courses.unshift(course);
    save();
    return { course: { ...course, enrollmentCount: 0 } };
  }
  const courseMatch = pathname.match(/^\/admin\/courses\/([^/]+)$/);
  if (courseMatch) {
    const course = db.courses.find((c) => c._id === courseMatch[1]);
    if (!course) throw new DemoApiError(404, 'Course not found');
    if (method === 'GET') return { course: withEnrollmentCounts([course])[0] };
    if (method === 'PUT') {
      if (b.category) {
        const category = db.categories.find((c) => c._id === b.category);
        if (!category) throw new DemoApiError(400, 'Unknown category');
        course.category = category;
      }
      Object.assign(course, {
        ...b,
        category: course.category,
        listPriceInr: b.listPriceInr === undefined ? course.listPriceInr : b.listPriceInr,
      });
      save();
      return { course };
    }
    if (method === 'DELETE') {
      db.courses = db.courses.filter((c) => c._id !== course._id);
      db.reviews = db.reviews.filter((r) => (r.course as { _id: string })._id !== course._id);
      db.enrollments = db.enrollments.filter((e) => e.courseId !== course._id);
      save();
      return { ok: true, deleted: course.title };
    }
  }
  const publishMatch = pathname.match(/^\/admin\/courses\/([^/]+)\/publish$/);
  if (publishMatch && method === 'PATCH') {
    const course = db.courses.find((c) => c._id === publishMatch[1]);
    if (!course) throw new DemoApiError(404, 'Course not found');
    course.published = Boolean(b.published);
    save();
    return { course };
  }

  // ---- categories ---------------------------------------------------------------
  if (pathname === '/admin/categories') {
    if (method === 'GET') {
      return {
        categories: db.categories
          .map((c) => ({ ...c, courseCount: db.courses.filter((k) => (k.category as Category)._id === c._id).length }))
          .sort((a, b2) => a.sortOrder - b2.sortOrder),
      };
    }
    if (method === 'POST') {
      const category: Category = {
        _id: hexId('ca9'),
        label: b.label,
        slug:
          b.slug ||
          String(b.label)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, ''),
        icon: b.icon || 'Shapes',
        sortOrder: b.sortOrder ?? db.categories.length + 1,
      };
      db.categories.push(category);
      save();
      return { category };
    }
  }
  const categoryMatch = pathname.match(/^\/admin\/categories\/([^/]+)$/);
  if (categoryMatch) {
    const category = db.categories.find((c) => c._id === categoryMatch[1]);
    if (!category) throw new DemoApiError(404, 'Category not found');
    if (method === 'PUT') {
      Object.assign(category, b);
      save();
      return { category };
    }
    if (method === 'DELETE') {
      const inUse = db.courses.filter((k) => (k.category as Category)._id === category._id).length;
      if (inUse > 0) throw new DemoApiError(409, `${inUse} course(s) still use this category — move them first`);
      db.categories = db.categories.filter((c) => c._id !== category._id);
      save();
      return { ok: true, deleted: category.label };
    }
  }

  // ---- users ------------------------------------------------------------------------
  if (pathname === '/admin/users' && method === 'GET') {
    let list = [...db.users];
    if (q.role) list = list.filter((u) => u.role === q.role);
    if (q.blocked) list = list.filter((u) => String(u.blocked) === q.blocked);
    if (q.search) {
      const rx = new RegExp(q.search, 'i');
      list = list.filter((u) => rx.test(u.name) || rx.test(u.email) || rx.test(u.phone || ''));
    }
    list.sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
    return {
      users: list.map((u) => ({
        ...u,
        enrollmentCount: db.enrollments.filter((e) => e.userId === u._id).length,
        totalSpentInr: db.orders.filter((o) => o.user?._id === u._id && o.status === 'paid').reduce((s, o) => s + o.amountInr, 0),
      })),
    };
  }
  const userMatch = pathname.match(/^\/admin\/users\/([^/]+)$/);
  if (userMatch) {
    const user = db.users.find((u) => u._id === userMatch[1]);
    if (!user) throw new DemoApiError(404, 'User not found');
    if (method === 'GET') {
      const enrollments: EnrollmentDetail[] = db.enrollments
        .filter((e) => e.userId === user._id)
        .map((e) => {
          const course = db.courses.find((c) => c._id === e.courseId);
          return {
            _id: e._id,
            course: course ? { _id: course._id, title: course.title, slug: course.slug, priceInr: course.priceInr } : null,
            completedLessons: Array.from({ length: e.completed }, (_, i) => `l${i}`),
            createdAt: e.createdAt,
          };
        });
      const orders = db.orders
        .filter((o) => o.user?._id === user._id)
        .sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
      return { user, enrollments, orders } satisfies UserDetail;
    }
    if (method === 'PATCH') {
      if (user.role === 'admin') throw new DemoApiError(400, 'The seeded admin account cannot be changed in demo mode');
      Object.assign(user, b);
      save();
      return { user };
    }
    if (method === 'DELETE') {
      db.users = db.users.filter((u) => u._id !== user._id);
      db.orders = db.orders.filter((o) => o.user?._id !== user._id);
      db.reviews = db.reviews.filter((r) => r.user?._id !== user._id);
      db.enrollments = db.enrollments.filter((e) => e.userId !== user._id);
      save();
      return { ok: true, deleted: user.email };
    }
  }

  // ---- orders ---------------------------------------------------------------------------
  if (pathname === '/admin/orders' && method === 'GET') {
    let list = [...db.orders];
    if (q.status) list = list.filter((o) => o.status === q.status);
    list.sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
    if (q.search) {
      const rx = new RegExp(q.search, 'i');
      list = list.filter((o) => rx.test(o.courseTitle) || rx.test(o.user?.name || '') || rx.test(o.user?.email || '') || rx.test(o.couponCode || ''));
    }
    list = list.slice(0, Number(q.limit || 200));
    const totals = list.reduce(
      (acc, o) => {
        acc.count += 1;
        if (o.status === 'paid') {
          acc.paid += o.amountInr;
          acc.discounts += o.discountInr || 0;
        }
        return acc;
      },
      { count: 0, paid: 0, discounts: 0 }
    );
    return { orders: list, totals };
  }
  const orderMatch = pathname.match(/^\/admin\/orders\/([^/]+)$/);
  if (orderMatch && method === 'PATCH') {
    const order = db.orders.find((o) => o._id === orderMatch[1]);
    if (!order) throw new DemoApiError(404, 'Order not found');
    const previous = order.status;
    order.status = b.status;
    if (b.status === 'paid' && previous !== 'paid' && order.user && order.course) {
      const exists = db.enrollments.some((e) => e.userId === order.user!._id && e.courseId === order.course!._id);
      if (!exists) {
        db.enrollments.push({ _id: hexId('e02'), userId: order.user._id, courseId: order.course._id, completed: 0, createdAt: new Date().toISOString() });
      }
    }
    if (b.status === 'refunded' && previous === 'paid' && order.user && order.course) {
      db.enrollments = db.enrollments.filter((e) => !(e.userId === order.user!._id && e.courseId === order.course!._id));
    }
    save();
    return { order };
  }

  // ---- reviews ------------------------------------------------------------------------------
  if (pathname === '/admin/reviews' && method === 'GET') {
    let list = [...db.reviews];
    if (q.visible) list = list.filter((r) => String(r.visible) === q.visible);
    list.sort((a, b2) => b2.createdAt.localeCompare(a.createdAt));
    return { reviews: list };
  }
  const reviewMatch = pathname.match(/^\/admin\/reviews\/([^/]+)$/);
  if (reviewMatch) {
    const review = db.reviews.find((r) => r._id === reviewMatch[1]);
    if (!review) throw new DemoApiError(404, 'Review not found');
    const courseId = (review.course as { _id: string })._id;
    if (method === 'PATCH') {
      Object.assign(review, b);
      recomputeRating(courseId);
      save();
      return { review };
    }
    if (method === 'DELETE') {
      db.reviews = db.reviews.filter((r) => r._id !== review._id);
      recomputeRating(courseId);
      save();
      return { ok: true };
    }
  }

  // ---- coupons --------------------------------------------------------------------------------
  if (pathname === '/admin/coupons') {
    if (method === 'GET') return { coupons: [...db.coupons].sort((a, b2) => (b2.createdAt || '').localeCompare(a.createdAt || '')) };
    if (method === 'POST') {
      if (db.coupons.some((c) => c.code === String(b.code).toUpperCase())) throw new DemoApiError(409, 'That code is already taken');
      const coupon: Coupon = {
        _id: hexId('c0f'),
        code: String(b.code).toUpperCase(),
        description: b.description || '',
        type: b.type,
        value: b.value,
        maxUses: b.maxUses ?? 0,
        usedCount: 0,
        expiresAt: b.expiresAt || null,
        active: b.active ?? true,
        createdAt: new Date().toISOString(),
      };
      db.coupons.unshift(coupon);
      save();
      return { coupon };
    }
  }
  const couponMatch = pathname.match(/^\/admin\/coupons\/([^/]+)$/);
  if (couponMatch) {
    const coupon = db.coupons.find((c) => c._id === couponMatch[1]);
    if (!coupon) throw new DemoApiError(404, 'Coupon not found');
    if (method === 'PUT') {
      Object.assign(coupon, b);
      if (b.code) coupon.code = String(b.code).toUpperCase();
      save();
      return { coupon };
    }
    if (method === 'DELETE') {
      db.coupons = db.coupons.filter((c) => c._id !== coupon._id);
      save();
      return { ok: true, deleted: coupon.code };
    }
  }

  // ---- settings -----------------------------------------------------------------------------------
  if (pathname === '/admin/settings') {
    if (method === 'GET') return { settings: db.settings };
    if (method === 'PUT') {
      Object.assign(db.settings, b);
      save();
      return { settings: db.settings };
    }
  }

  throw new DemoApiError(404, `Demo API: no handler for ${method} ${pathname}`);
}

function recomputeRating(courseId: string) {
  const course = db.courses.find((c) => c._id === courseId);
  if (!course) return;
  const rs = db.reviews.filter((r) => (r.course as { _id: string })._id === courseId && r.visible);
  course.reviewCount = rs.length;
  course.rating = rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0;
}

export const DEMO_ADMIN_EMAIL = 'admin@yduacademy.com';
export const DEMO_ADMIN_PASSWORD = 'Admin@123';
