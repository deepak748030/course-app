/**
 * Development seed — mirrors the YDU Academy app catalog and generates a believable
 * 60 days of users, orders and enrollments so the admin dashboard charts have data.
 *
 *   npm run seed        # wipes the database and reseeds (dev only!)
 *
 * Admin login after seeding:  admin@yduacademy.com / Admin@123
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { Category } from '../models/Category.js';
import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { Settings } from '../models/Settings.js';
import { User } from '../models/User.js';
import { recomputeCourseRating } from '../controllers/shared.js';

// Deterministic RNG so reseeding produces the same dataset.
function mulberry32(seed) {
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
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;

const categories = [
  { slug: 'milk', label: 'Milk handling', icon: 'Milk', sortOrder: 1 },
  { slug: 'paneer', label: 'Paneer & chhana', icon: 'Package', sortOrder: 2 },
  { slug: 'ghee', label: 'Ghee & butter', icon: 'Flame', sortOrder: 3 },
  { slug: 'ferments', label: 'Curd & ferments', icon: 'Soup', sortOrder: 4 },
  { slug: 'cheese', label: 'Cheese', icon: 'CakeSlice', sortOrder: 5 },
  { slug: 'frozen', label: 'Frozen desserts', icon: 'IceCream', sortOrder: 6 },
  { slug: 'farming', label: 'Farm & animals', icon: 'Leaf', sortOrder: 7 },
  { slug: 'business', label: 'Dairy business', icon: 'Store', sortOrder: 8 },
];

const lesson = (title, minutes, description = '', isPreview = false) => ({
  title,
  minutes,
  description,
  isPreview,
});

const courses = [
  {
    slug: 'milk-foundations',
    title: 'Milk Foundations',
    promise: 'Buy, chill, test and store milk with the numbers a dairy actually runs on.',
    description:
      'The course every other YDU track assumes you have done. Reception checks, fat and SNF, chilling curves, adulteration tests and cleaning — every step demonstrated on real equipment with the readings shown on camera.',
    categoryId: 'milk',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1999,
    listPriceInr: 2999,
    published: true,
    isPopular: true,
    isBeginnerPick: true,
    audience: 'New dairy owners, milk-collection staff and anyone buying milk in bulk.',
    outcomes: [
      'Judge milk quality on arrival by smell, temperature and appearance',
      'Take and record fat, SNF and lactometer readings correctly',
      'Chill a batch fast enough to hold shelf life',
      'Run the common adulteration tests in under ten minutes',
    ],
    equipment: [
      'A calibrated lactometer and a 500 ml test cylinder',
      'A milk fat tester or a gerber centrifuge',
      'A probe thermometer reading 0 to 100 °C',
    ],
    sections: [
      {
        title: 'Milk on arrival',
        summary: 'The reception routine that decides everything downstream.',
        lessons: [
          lesson('The reception check, step by step', 14, 'Smell, temperature, visual check and when to reject a can outright.', true),
          lesson('Fat, SNF and what they decide', 16, 'Why the two numbers set your price and your yield.'),
          lesson('Reading a lactometer correctly', 12, 'Temperature correction and the mistakes that shift the reading.'),
        ],
      },
      {
        title: 'Cold chain',
        summary: 'From warm can to chilled bulk without losing shelf life.',
        lessons: [
          lesson('The chilling curve', 18, 'How fast milk must fall through the danger zone.'),
          lesson('Storing and transporting a batch', 15, 'Holding times, can hygiene and the delivery window.'),
        ],
      },
      {
        title: 'Testing and hygiene',
        summary: 'The small lab routine that keeps adulteration out.',
        lessons: [
          lesson('Common adulteration tests', 18, 'Starch, water, detergent and urea — the four tests to run on any doubtful can.'),
          lesson('Cleaning a milk line', 15, 'Rinse, caustic, rinse, acid, rinse — and verifying the result.'),
          lesson('Running a small lab bench', 20, 'Sample labels, glassware discipline and a daily record sheet.'),
        ],
      },
    ],
  },
  {
    slug: 'paneer-craft',
    title: 'Paneer Craft',
    promise: 'Consistent paneer and chhana with yield numbers you can price from.',
    description:
      'Acid strength, coagulation temperature, pressing and costing — the complete paneer make shown batch by batch, including a soft chhana line for sandesh and rasgulla.',
    categoryId: 'paneer',
    level: 'Beginner',
    language: 'English',
    priceInr: 2999,
    listPriceInr: 3999,
    published: true,
    isPopular: true,
    audience: 'Sweet-shop and dairy kitchen teams adding paneer to their line.',
    outcomes: [
      'Coagulate with citric, lactic or vinegar at the right strength',
      'Press a block with even body and clean cutting edges',
      'Diagnose crumbly, rubbery or sour batches',
      'Cost a paneer batch into a per-kilo price',
    ],
    equipment: ['A 10–20 litre heavy-bottom pan', 'Muslin cloth and a paneer press', 'A probe thermometer'],
    sections: [
      {
        title: 'Before the first batch',
        summary: 'Reading recipes and choosing milk for yield.',
        lessons: [
          lesson('Reading a recipe like a dairy hand', 13, 'Batch sizes, temperatures and why a make-sheet beats memory.', true),
          lesson('Choosing milk for yield', 17, 'Fat, SNF and how much a litre really gives you — measured, not guessed.'),
          lesson('Acid strength and temperature', 11, 'Citric, lactic and vinegar at working strength, side by side on camera.', true),
        ],
      },
      {
        title: 'Your first paneer',
        summary: 'The full make, coagulation to pressing.',
        lessons: [
          lesson('Making a clean paneer block', 22, 'Coagulation, whey drain and pressing in one continuous make.'),
          lesson('Cutting, cooling and storing', 21, 'Block sizes, cube cutting, brine holding and shelf life.'),
          lesson('A soft chhana make', 16, 'The same milk, less pressing — the base for sandesh and rasgulla.'),
        ],
      },
      {
        title: 'Yield, quality and cost',
        summary: 'Turning the batch into a sellable, priced product.',
        lessons: [
          lesson('Diagnosing a failed batch', 19, 'Crumbly, rubbery, sour, or short on weight — causes and fixes.'),
          lesson('Packing and shelf life', 17, 'Cold water holding, vacuum pouches and honest date labels.'),
          lesson('Costing a paneer batch', 15, 'Milk, acid, gas, labour and losses into a per-kilo cost.'),
        ],
      },
    ],
  },
  {
    slug: 'curd-ferments',
    title: 'Curd & Ferments',
    promise: 'Daily curd sets, drinks and thick products with reliable culture handling.',
    description:
      'Cultures and how they behave, the daily set, in-cup setting, hung curd, lassi and mishti bases — plus the batch record that diagnoses fermentation faults.',
    categoryId: 'ferments',
    level: 'Beginner',
    language: 'English',
    priceInr: 1299,
    listPriceInr: 1999,
    published: true,
    isBeginnerPick: true,
    audience: 'Home producers and small dairies selling curd, lassi and shrikhand.',
    outcomes: [
      'Handle and store starter cultures that stay reliable',
      'Set curd to the same firmness every day',
      'Make lassi, chaas and mattha that do not split',
      'Diagnose thin, slimy, gassy or sour ferments',
    ],
    equipment: ['An incubator or warm holding space', 'A thermometer', 'Food-grade culture'],
    sections: [
      {
        title: 'Culture',
        summary: 'The living ingredient behind every ferment.',
        lessons: [
          lesson('Cultures and how they behave', 14, 'Mesophilic and thermophilic cultures and what each does to body and sourness.', true),
          lesson('Handling and storing a starter', 12, 'Portioning, freezing, and how many generations a culture stays reliable.'),
        ],
      },
      {
        title: 'Setting curd',
        summary: 'From boiled milk to a set you can rely on.',
        lessons: [
          lesson('The daily curd set', 19, 'Temperatures, inoculation and the holding window that sets it right.'),
          lesson('In-cup setting', 16, 'Filling, incubation and cooling cups so the surface stays flat.'),
          lesson('Hung curd and thick products', 15, 'Draining whey for shrikhand, labneh and dip bases.'),
        ],
      },
      {
        title: 'Drinks and desserts',
        summary: 'Turning the set into a product line.',
        lessons: [
          lesson('Lassi, chaas and mattha', 14, 'Dilution ratios, salt and spice — keeping them from splitting.'),
          lesson('A simple mishti base', 18, 'Sweetening after the set without turning the batch grainy.'),
          lesson('Diagnosing fermentation faults', 16, 'Thin, slimy, gassy, sour and separated curd — and the record that shows why.'),
        ],
      },
    ],
  },
  {
    slug: 'ghee-butter',
    title: 'Ghee & Butter at Home',
    promise: 'White butter and ghee from cream, with the flavour stages on camera.',
    description:
      'Collecting and ripening cream, churning clean white butter, and taking ghee through its stages without burning — small-batch methods that scale to a shop line.',
    categoryId: 'ghee',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1499,
    listPriceInr: 2199,
    published: true,
    isPopular: true,
    audience: 'Home producers and small shops selling ghee and white butter.',
    outcomes: [
      'Separate cream by gravity or machine at the right fat level',
      'Ripen cream for flavour without spoiling it',
      'Churn a clean white butter and wash it properly',
      'Take ghee through every stage without scorching',
    ],
    equipment: ['A cream separator or wide settling pans', 'A churn or stand mixer', 'A heavy kadhai'],
    sections: [
      {
        title: 'Cream',
        summary: 'Where butter and ghee quality actually starts.',
        lessons: [
          lesson('Collecting and separating cream', 15, 'Gravity versus mechanical separation, and the fat level each gives you.', true),
          lesson('Ripening for flavour', 13, 'How long to hold cream, at what temperature, and when ripening turns to spoiling.'),
        ],
      },
      {
        title: 'Butter',
        summary: 'Churning, washing and salting a small batch.',
        lessons: [
          lesson('Churning a clean white butter', 18, 'Temperature, timing and the wash that keeps it sweet.'),
          lesson('Salted, cultured and flavoured butters', 14, 'Working salt evenly and keeping flavours true.'),
        ],
      },
      {
        title: 'Ghee',
        summary: 'The stages every batch passes through — and how to read them.',
        lessons: [
          lesson('Simmering to the golden stage', 20, 'Foam, crackle and clarity: reading the pot instead of the clock.'),
          lesson('Straining, storing and jar-filling', 12, 'Clean jars, honest cooling and the shelf life you can promise.'),
        ],
      },
    ],
  },
  {
    slug: 'frozen-desserts',
    title: 'Frozen Dairy Desserts',
    promise: 'Kulfi, matka ice cream and frozen desserts with the right body and no ice crystals.',
    description:
      'The mix, the ice-crystal rule, slow freezing in a matka, a small batch freezer, moulding, and the cold-chain handling that gets a frozen product to a shop without a melt-and-refreeze cycle.',
    categoryId: 'frozen',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 2499,
    published: true,
    audience: 'Dessert makers and dairies starting a frozen line.',
    outcomes: [
      'Build a mix with the right fat, sugar and solids',
      'Keep ice crystals small so the texture stays smooth',
      'Freeze kulfi in moulds and matkas without freezer burn',
      'Cost a frozen line and price a single serving',
    ],
    equipment: ['Moulds, matkas or a shallow freezer tray', 'A freezer that holds −18 °C or colder'],
    sections: [
      {
        title: 'The mix',
        summary: 'Balance first — texture follows.',
        lessons: [
          lesson('Fat, sugar and solids in balance', 17, 'Why crystal size is decided before anything freezes.'),
          lesson('Kulfi base, reduced properly', 16, 'The reduction that gives kulfi its cooked-milk body.'),
        ],
      },
      {
        title: 'Freezing',
        summary: 'Slow versus fast, moulds versus matkas.',
        lessons: [
          lesson('Matka kulfi the traditional way', 19, 'Sealing, packing and the slow freeze that makes it matte and dense.'),
          lesson('Small-batch freezer ice cream', 18, 'Overrun, draw temperature and hardening without crystals.'),
        ],
      },
      {
        title: 'Cold chain and costing',
        summary: 'From freezer to shop without quality loss.',
        lessons: [
          lesson('Storage, transport and display', 14, 'The melt-and-refreeze cycle and how to never run it.'),
          lesson('Costing a frozen line', 13, 'Electricity and losses into a per-serving price.'),
        ],
      },
    ],
  },
  {
    slug: 'artisan-cheese',
    title: 'Artisan Cheese',
    promise: 'Fresh and pressed cheeses with the hygiene discipline a cheese room needs.',
    description:
      'A cheese-room course: rennet coagulation, cutting and cooking the curd, pressing, salting and the short affinage a small producer can actually run.',
    categoryId: 'cheese',
    level: 'Advanced',
    language: 'English',
    priceInr: 3999,
    listPriceInr: 4999,
    published: true,
    audience: 'Producers moving from fresh dairy into cheese.',
    outcomes: [
      'Set a rennet curd and cut it to the right size',
      'Press, salt and dry a wheel evenly',
      'Run a short affinage without surface faults',
      'Keep a cheese room audit-ready',
    ],
    equipment: ['Cheese moulds and a press', 'pH strips or meter', 'A cool, humid ripening space'],
    sections: [
      {
        title: 'The cheese room',
        summary: 'Hygiene and layout before the first vat.',
        lessons: [
          lesson('Layout, drains and workflow', 15, 'One-way flow so clean milk never meets whey.'),
          lesson('Cultures and rennet', 14, 'Choosing the pair that matches your milk.'),
        ],
      },
      {
        title: 'A pressed cheese',
        summary: 'From vat to wheel in one make day.',
        lessons: [
          lesson('Setting, cutting and cooking the curd', 24, 'The make, with pH checks at every step.'),
          lesson('Pressing and salting', 18, 'Pressure schedules and the brine that seasons evenly.'),
          lesson('Affinage for small producers', 16, 'Turning, brushing and when a wheel is ready.'),
        ],
      },
    ],
  },
  {
    slug: 'dairy-farming',
    title: 'Dairy Farming Essentials',
    promise: 'Animal care, milking hygiene and forage planning for a small farm.',
    description:
      'The farm side of the trade: breed selection, feeding and forage, milking routine, mastitis prevention and the records a small farm needs to stay profitable.',
    categoryId: 'farming',
    level: 'Beginner',
    language: 'Hindi',
    priceInr: 2199,
    published: true,
    audience: 'Farm owners and caretakers supplying milk to dairies.',
    outcomes: [
      'Choose animals suited to your feed and climate',
      'Run a clean milking routine that lowers cell counts',
      'Plan green forage across the year',
      'Spot mastitis early and act correctly',
    ],
    equipment: ['A milking area with clean water', 'Strip cup and dip solution', 'Basic feed store'],
    sections: [
      {
        title: 'Animals and feeding',
        summary: 'The feed plan decides the milk.',
        lessons: [
          lesson('Choosing your animals', 16, 'Breed, body condition and what a good buyer checks.'),
          lesson('Rations and green fodder', 19, 'Balancing dry and green feed through the seasons.'),
        ],
      },
      {
        title: 'Milking and health',
        summary: 'A routine the herd can rely on.',
        lessons: [
          lesson('The milking routine', 15, 'Order, hygiene and the checks before the cluster goes on.'),
          lesson('Mastitis prevention', 17, 'Strip cup, dipping and the dry-cow programme.'),
          lesson('Farm records that pay', 12, 'Yield, heat and health logs in one notebook system.'),
        ],
      },
    ],
  },
  {
    slug: 'dairy-business',
    title: 'Selling Your Dairy',
    promise: 'Pricing, licences and the shop math that turns batches into margin.',
    description:
      'The business of selling dairy: FSSAI registration, pricing every product honestly, wholesale versus counter, credit discipline and the simple monthly numbers to watch.',
    categoryId: 'business',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 1799,
    listPriceInr: 2499,
    published: true,
    audience: 'Owners who make well but need the selling side to work.',
    outcomes: [
      'Get FSSAI registration without a consultant',
      'Price every product from its batch cost',
      'Manage counter and wholesale credit safely',
      'Read a one-page monthly profit sheet',
    ],
    equipment: ['A weighing scale', 'A rate board', 'One notebook or spreadsheet'],
    sections: [
      {
        title: 'Licences and setup',
        summary: 'Legal before the first sale.',
        lessons: [
          lesson('FSSAI registration step by step', 16, 'Documents, fees and renewal — done yourself.'),
          lesson('Labelling and claims', 12, 'What a dairy label may and may not say.'),
        ],
      },
      {
        title: 'Money',
        summary: 'The pricing and credit discipline.',
        lessons: [
          lesson('Pricing from the batch sheet', 18, 'Every rupee of a batch onto a per-kilo price.'),
          lesson('Credit, ledgers and collections', 14, 'Keeping khata credit from eating the margin.'),
          lesson('The monthly one-pager', 11, 'Six numbers that tell you the truth about the month.'),
        ],
      },
    ],
  },
];

const firstNames = [
  'Aarav', 'Priya', 'Rohan', 'Sneha', 'Vikram', 'Ananya', 'Karan', 'Meera', 'Aditya', 'Pooja',
  'Rahul', 'Divya', 'Suresh', 'Kavita', 'Manish', 'Ritu', 'Amit', 'Neha', 'Deepak', 'Shreya',
  'Rajesh', 'Isha', 'Nitin', 'Aarti',
];
const lastNames = [
  'Sharma', 'Verma', 'Patel', 'Yadav', 'Singh', 'Gupta', 'Mehta', 'Joshi', 'Chavan', 'Reddy',
  'Nair', 'Kulkarni', 'Desai', 'Iyer', 'Bhatt',
];

const reviewBodies = [
  'Very practical — I used the batch sheet the very next morning.',
  'Clear numbers, no fluff. Exactly what a working dairy needs.',
  'The videos show real equipment, which made all the difference.',
  'Wish it were longer, but everything shown works as promised.',
  'Good pace and the Hindi examples help my staff follow along.',
  'The costing lesson alone paid for the course.',
  'Solid basics; would love an advanced follow-up.',
  'Step by step and easy to repeat in our own kitchen.',
];

const DAY = 24 * 60 * 60 * 1000;

async function run() {
  const connected = await connectDb({ retries: 3, delayMs: 2000 });
  if (!connected) {
    console.error('Cannot seed without MongoDB. Start MongoDB and set MONGODB_URI, then retry.');
    process.exit(1);
  }

  console.log('Wiping existing data…');
  await Promise.all([
    User.deleteMany({}),
    Category.deleteMany({}),
    Course.deleteMany({}),
    Review.deleteMany({}),
    Order.deleteMany({}),
    Enrollment.deleteMany({}),
    Coupon.deleteMany({}),
    Settings.deleteMany({}),
  ]);

  // ---- admin + settings -------------------------------------------------------
  const adminHash = await bcrypt.hash('Admin@123', 10);
  await User.create({
    name: 'YDU Admin',
    email: 'admin@yduacademy.com',
    passwordHash: adminHash,
    role: 'admin',
  });
  await Settings.create({
    _id: 'app',
    appName: 'YDU Academy',
    tagline: 'Learn the dairy trade, one batch at a time.',
    supportEmail: 'support@ydu.academy',
    supportPhone: '+91 98765 43210',
    currency: 'INR',
    maintenanceMode: false,
    minAppVersion: '',
  });

  // ---- categories + courses ----------------------------------------------------
  console.log('Creating categories and courses…');
  const categoryDocs = await Category.create(categories);
  const categoryIdBySlug = new Map(categoryDocs.map((c) => [c.slug, c._id]));

  const courseDocs = [];
  for (const seed of courses) {
    const { categoryId, ...rest } = seed;
    courseDocs.push(
      await Course.create({
        ...rest,
        category: categoryIdBySlug.get(categoryId),
        rating: 0,
        reviewCount: 0,
      })
    );
  }

  // ---- learners ----------------------------------------------------------------
  console.log('Creating learners…');
  const userHash = await bcrypt.hash('Learner@123', 10);
  const learners = [];
  const now = Date.now();
  for (let i = 0; i < 42; i += 1) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${randInt(1, 99)}@example.com`;
    learners.push(
      await User.create({
        name,
        email,
        passwordHash: userHash,
        phone: `98${String(randInt(10000000, 99999999))}`,
        createdAt: new Date(now - randInt(0, 75) * DAY - randInt(0, 20) * 60 * 60 * 1000),
      })
    );
  }
  // Also one known learner account for testing the app side.
  learners.push(
    await User.create({
      name: 'Demo Learner',
      email: 'learner@ydu.academy',
      passwordHash: await bcrypt.hash('Learner@123', 10),
      phone: '9876500001',
    })
  );

  // ---- coupons -------------------------------------------------------------------
  console.log('Creating coupons…');
  await Coupon.create([
    { code: 'WELCOME10', description: '10% off your first course', type: 'percent', value: 10, maxUses: 0, usedCount: randInt(20, 40), active: true },
    { code: 'DAIRY200', description: '₹200 off any course', type: 'flat', value: 200, maxUses: 500, usedCount: randInt(60, 120), active: true },
    { code: 'FESTIVE25', description: '25% off — festival week', type: 'percent', value: 25, maxUses: 200, usedCount: randInt(30, 80), active: true, expiresAt: new Date(now + 21 * DAY) },
    { code: 'OLD2019', description: 'Expired launch coupon', type: 'percent', value: 15, maxUses: 100, usedCount: 100, active: false, expiresAt: new Date(now - 300 * DAY) },
  ]);

  // ---- orders + enrollments (last ~60 days, denser recently) ----------------------
  console.log('Generating orders and enrollments…');
  const coupons = await Coupon.find();
  const orders = [];
  const enrollments = [];
  for (let i = 0; i < 190; i += 1) {
    const learner = pick(learners);
    const course = pick(courseDocs);
    // Bias toward recent days so the charts have a live feel.
    const daysAgo = Math.floor(Math.pow(rand(), 1.6) * 60);
    const createdAt = new Date(now - daysAgo * DAY - randInt(1, 18) * 60 * 60 * 1000);

    let discountInr = 0;
    let couponCode = '';
    if (rand() < 0.18) {
      const coupon = pick(coupons.filter((c) => c.active));
      if (coupon) {
        discountInr = coupon.discountFor(course.priceInr);
        couponCode = coupon.code;
      }
    }

    const status = rand() < 0.93 ? 'paid' : rand() < 0.6 ? 'refunded' : 'pending';
    orders.push({
      user: learner._id,
      course: course._id,
      courseTitle: course.title,
      amountInr: course.priceInr - discountInr,
      listAmountInr: course.listPriceInr || course.priceInr,
      couponCode,
      discountInr,
      status,
      paymentMethod: pick(['upi', 'card', 'netbanking', 'wallet']),
      paymentReference: `seed_${i}_${createdAt.getTime().toString(36)}`,
      createdAt,
      updatedAt: createdAt,
    });

    if (status === 'paid') {
      enrollments.push({
        user: learner._id,
        course: course._id,
        completedLessons: course.sections
          .flatMap((s) => s.lessons)
          .slice(0, randInt(0, 12))
          .map((l) => String(l._id)),
        createdAt,
        updatedAt: createdAt,
      });
    }
  }
  // De-duplicate enrollments per user+course (unique index).
  const seen = new Set();
  const uniqueEnrollments = enrollments.filter((e) => {
    const key = `${e.user}:${e.course}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // De-duplicate paid orders per user+course too, mirroring the app's one-purchase rule.
  const orderSeen = new Set();
  const uniqueOrders = orders.filter((o) => {
    if (o.status !== 'paid') return true;
    const key = `${o.user}:${o.course}`;
    if (orderSeen.has(key)) return false;
    orderSeen.add(key);
    return true;
  });

  await Order.insertMany(uniqueOrders);
  await Enrollment.insertMany(uniqueEnrollments);

  // ---- reviews --------------------------------------------------------------------
  console.log('Creating reviews…');
  const reviews = [];
  const reviewSeen = new Set();
  for (let i = 0; i < 90; i += 1) {
    const learner = pick(learners);
    const course = pick(courseDocs);
    const key = `${learner._id}:${course._id}`;
    if (reviewSeen.has(key)) continue;
    reviewSeen.add(key);
    const daysAgo = randInt(0, 55);
    reviews.push({
      course: course._id,
      user: learner._id,
      author: learner.name,
      rating: rand() < 0.62 ? 5 : rand() < 0.75 ? 4 : randInt(2, 3),
      body: pick(reviewBodies),
      visible: rand() < 0.94,
      createdAt: new Date(now - daysAgo * DAY),
      updatedAt: new Date(now - daysAgo * DAY),
    });
  }
  await Review.insertMany(reviews);

  console.log('Recomputing course ratings…');
  for (const course of courseDocs) {
    await recomputeCourseRating(course._id);
  }

  console.log('\nSeed complete ✔');
  console.log('──────────────────────────────────────────────');
  console.log(' Admin login:    admin@yduacademy.com / Admin@123');
  console.log(' Learner login:  learner@ydu.academy / Learner@123');
  console.log('──────────────────────────────────────────────');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
