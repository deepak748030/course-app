/**
 * Development seed — mirrors the YDU Academy app catalog and generates a believable
 * 60 days of users, orders and enrollments so the admin dashboard charts have data.
 *
 *   npm run seed        # wipes the database and reseeds (dev only!)
 *
 * The admin and learner sign-in values are defined in this file (they are not
 * printed to the terminal or listed in the READMEs).
 */
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../config/db.js';
import { AnalyticsEvent } from '../models/AnalyticsEvent.js';
import { Category } from '../models/Category.js';
import { DailyStat } from '../models/DailyStat.js';
import { Coupon } from '../models/Coupon.js';
import { Course } from '../models/Course.js';
import { Enrollment } from '../models/Enrollment.js';
import { Order } from '../models/Order.js';
import { Review } from '../models/Review.js';
import { DEFAULT_SUPPORT_EMAIL, DEFAULT_SUPPORT_PHONE, Settings } from '../models/Settings.js';
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

const lesson = (title, minutes, description = '', isPreview = false, recipe = undefined) => ({
  title,
  minutes,
  description,
  isPreview,
  recipe,
});

const recipe = (title, servings, prepMinutes, cookMinutes, ingredients, steps, tips) => ({
  title,
  servings,
  prepMinutes,
  cookMinutes,
  ingredients,
  steps,
  tips,
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
    lessons: [
      lesson('The reception check, step by step', 14, 'Smell, temperature, visual check and when to reject a can outright.', true),
      lesson('Fat, SNF and what they decide', 16, 'Why the two numbers set your price and your yield.'),
      lesson('Reading a lactometer correctly', 12, 'Temperature correction and the mistakes that shift the reading.'),
      lesson('The chilling curve', 18, 'How fast milk must fall through the danger zone.'),
      lesson('Storing and transporting a batch', 15, 'Holding times, can hygiene and the delivery window.'),
      lesson('Common adulteration tests', 18, 'Starch, water, detergent and urea — the four tests to run on any doubtful can.'),
      lesson('Cleaning a milk line', 15, 'Rinse, caustic, rinse, acid, rinse — and verifying the result.'),
      lesson('Running a small lab bench', 20, 'Sample labels, glassware discipline and a daily record sheet.'),
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
    lessons: [
      lesson('Reading a recipe like a dairy hand', 13, 'Batch sizes, temperatures and why a make-sheet beats memory.', true),
      lesson('Choosing milk for yield', 17, 'Fat, SNF and how much a litre really gives you — measured, not guessed.'),
      lesson('Acid strength and temperature', 11, 'Citric, lactic and vinegar at working strength, side by side on camera.', true),
      lesson(
        'Making a clean paneer block',
        22,
        'Coagulation, whey drain and pressing in one continuous make.',
        false,
        recipe(
          'Standard paneer batch',
          4,
          15,
          40,
          [
            { item: 'Full-cream milk', quantity: '10 L' },
            { item: 'Citric acid (1% solution)', quantity: '180 ml' },
            { item: 'Salt', quantity: '10 g' },
          ],
          [
            'Heat the milk to 82 °C, stirring gently to prevent scorching.',
            'Cut the heat and bring it down to 72 °C before coagulation.',
            'Add the acid solution in three passes, stirring each for 30 seconds.',
            'Rest 5 minutes, then strain through muslin and rinse the curd.',
            'Press under 8 kg for 20 minutes, then chill the block in cold water.',
          ],
          ['Do not over-stir after the curd forms — the grains stay softer.', 'Chill the block before cutting for clean cubes.']
        )
      ),
      lesson('Cutting, cooling and storing', 21, 'Block sizes, cube cutting, brine holding and shelf life.'),
      lesson('A soft chhana make', 16, 'The same milk, less pressing — the base for sandesh and rasgulla.'),
      lesson('Diagnosing a failed batch', 19, 'Crumbly, rubbery, sour, or short on weight — causes and fixes.'),
      lesson('Packing and shelf life', 17, 'Cold water holding, vacuum pouches and honest date labels.'),
      lesson('Costing a paneer batch', 15, 'Milk, acid, gas, labour and losses into a per-kilo cost.'),
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
    lessons: [
      lesson('Cultures and how they behave', 14, 'Mesophilic and thermophilic cultures and what each does to body and sourness.', true),
      lesson('Handling and storing a starter', 12, 'Portioning, freezing, and how many generations a culture stays reliable.'),
      lesson('The daily curd set', 19, 'Temperatures, inoculation and the holding window that sets it right.'),
      lesson('In-cup setting', 16, 'Filling, incubation and cooling cups so the surface stays flat.'),
      lesson('Hung curd and thick products', 15, 'Draining whey for shrikhand, labneh and dip bases.'),
      lesson('Lassi, chaas and mattha', 14, 'Dilution ratios, salt and spice — keeping them from splitting.'),
      lesson('A simple mishti base', 18, 'Sweetening after the set without turning the batch grainy.'),
      lesson('Diagnosing fermentation faults', 16, 'Thin, slimy, gassy, sour and separated curd — and the record that shows why.'),
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
    lessons: [
      lesson('Collecting and separating cream', 15, 'Gravity versus mechanical separation, and the fat level each gives you.', true),
      lesson('Ripening for flavour', 13, 'How long to hold cream, at what temperature, and when ripening turns to spoiling.'),
      lesson(
        'Churning a clean white butter',
        18,
        'Temperature, timing and the wash that keeps it sweet.',
        false,
        recipe(
          'White butter from 2 litres of cream',
          2,
          20,
          30,
          [
            { item: 'Ripened cream (30% fat)', quantity: '2 L' },
            { item: 'Chilled water for washing', quantity: '3 L' },
          ],
          [
            'Chill the cream to 12 °C before churning.',
            'Churn until the grains separate cleanly from the buttermilk.',
            'Wash the grains twice in chilled water until it runs clear.',
            'Work the butter gently to a smooth, dry finish.',
          ],
          ['Warmer cream churns faster but gives softer butter.', 'Keep the last wash water as sweet as the first.']
        )
      ),
      lesson('Salted, cultured and flavoured butters', 14, 'Working salt evenly and keeping flavours true.'),
      lesson('Simmering to the golden stage', 20, 'Foam, crackle and clarity: reading the pot instead of the clock.'),
      lesson('Straining, storing and jar-filling', 12, 'Clean jars, honest cooling and the shelf life you can promise.'),
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
    lessons: [
      lesson('Fat, sugar and solids in balance', 17, 'Why crystal size is decided before anything freezes.'),
      lesson('Kulfi base, reduced properly', 16, 'The reduction that gives kulfi its cooked-milk body.'),
      lesson('Matka kulfi the traditional way', 19, 'Sealing, packing and the slow freeze that makes it matte and dense.'),
      lesson('Small-batch freezer ice cream', 18, 'Overrun, draw temperature and hardening without crystals.'),
      lesson('Storage, transport and display', 14, 'The melt-and-refreeze cycle and how to never run it.'),
      lesson('Costing a frozen line', 13, 'Electricity and losses into a per-serving price.'),
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
    lessons: [
      lesson('Layout, drains and workflow', 15, 'One-way flow so clean milk never meets whey.'),
      lesson('Cultures and rennet', 14, 'Choosing the pair that matches your milk.'),
      lesson('Setting, cutting and cooking the curd', 24, 'The make, with pH checks at every step.'),
      lesson('Pressing and salting', 18, 'Pressure schedules and the brine that seasons evenly.'),
      lesson('Affinage for small producers', 16, 'Turning, brushing and when a wheel is ready.'),
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
    lessons: [
      lesson('Choosing your animals', 16, 'Breed, body condition and what a good buyer checks.'),
      lesson('Rations and green fodder', 19, 'Balancing dry and green feed through the seasons.'),
      lesson('The milking routine', 15, 'Order, hygiene and the checks before the cluster goes on.'),
      lesson('Mastitis prevention', 17, 'Strip cup, dipping and the dry-cow programme.'),
      lesson('Farm records that pay', 12, 'Yield, heat and health logs in one notebook system.'),
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
    lessons: [
      lesson('FSSAI registration step by step', 16, 'Documents, fees and renewal — done yourself.'),
      lesson('Labelling and claims', 12, 'What a dairy label may and may not say.'),
      lesson('Pricing from the batch sheet', 18, 'Every rupee of a batch onto a per-kilo price.'),
      lesson('Credit, ledgers and collections', 14, 'Keeping khata credit from eating the margin.'),
      lesson('The monthly one-pager', 11, 'Six numbers that tell you the truth about the month.'),
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
    supportEmail: DEFAULT_SUPPORT_EMAIL,
    supportPhone: DEFAULT_SUPPORT_PHONE,
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
  // Indian mobiles: 10 digits starting 6-9, unique per learner. The two demo numbers below are
  // reserved, and 9000000000 is left out because the app uses it to simulate a network failure.
  const usedPhones = new Set(['9876500001', '9876500002', '9000000000']);
  const newPhone = () => {
    for (;;) {
      const candidate = `${pick(['6', '7', '8', '9'])}${String(randInt(100000000, 999999999))}`;
      if (!usedPhones.has(candidate)) {
        usedPhones.add(candidate);
        return candidate;
      }
    }
  };
  for (let i = 0; i < 42; i += 1) {
    const name = `${pick(firstNames)} ${pick(lastNames)}`;
    const email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${randInt(1, 99)}@example.com`;
    learners.push(
      await User.create({
        name,
        email,
        passwordHash: userHash,
        phone: newPhone(),
        createdAt: new Date(now - randInt(0, 75) * DAY - randInt(0, 20) * 60 * 60 * 1000),
      })
    );
  }
  // Known learner with email + password (dashboard/API testing) and the same number for OTP sign-in.
  learners.push(
    await User.create({
      name: 'Demo Learner',
      email: 'learner@ydu.academy',
      passwordHash: await bcrypt.hash('Learner@123', 10),
      phone: '9876500001',
    })
  );
  // Known phone-only learner: signs in with +91 98765 00002 and OTP, no email or password.
  learners.push(
    await User.create({
      name: 'Asha Verma',
      phone: '9876500002',
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
        completedLessons: course.lessons
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

  // ---- analytics history (last 60 days) ---------------------------------------------
  // Reconstructs the behaviour trail the real app would have produced around the
  // seeded orders: signups, course views, checkout starts, lesson activity, searches
  // and the daily request rollup — so the dashboard analytics page has a real shape.
  console.log('Generating analytics history…');
  const events = [];
  const pushEvent = (user, event, course, at, meta = {}) =>
    events.push({ user, event, course, meta, createdAt: at, updatedAt: at });

  for (const learner of learners) {
    pushEvent(learner._id, 'signup', null, learner.createdAt);
  }

  for (const order of uniqueOrders) {
    const at = order.createdAt;
    const buyerViewAt = new Date(at.getTime() - randInt(2, 36) * 60 * 60 * 1000);
    pushEvent(order.user, 'course_viewed', order.course, buyerViewAt);
    // Extra eyes that did not convert make the funnel honest.
    for (let v = 0; v < randInt(2, 6); v += 1) {
      const visitor = pick(learners);
      pushEvent(visitor._id, 'course_viewed', order.course, new Date(at.getTime() - randInt(4, 96) * 60 * 60 * 1000));
    }
    pushEvent(order.user, 'checkout_started', order.course, new Date(at.getTime() - randInt(10, 90) * 60 * 1000));
    if (order.status === 'paid') {
      pushEvent(order.user, 'order_paid', order.course, at, { amountInr: order.amountInr });
    }
  }

  // Lesson activity from the seeded enrollments.
  for (const enrollment of uniqueEnrollments) {
    const course = courseDocs.find((c) => String(c._id) === String(enrollment.course));
    if (!course) continue;
    for (const lessonId of enrollment.completedLessons.slice(0, 6)) {
      pushEvent(enrollment.user, 'lesson_started', course._id, new Date(enrollment.createdAt.getTime() + randInt(0, 20) * DAY));
      pushEvent(enrollment.user, 'lesson_completed', course._id, new Date(enrollment.createdAt.getTime() + randInt(0, 20) * DAY), { lessonId });
    }
    pushEvent(enrollment.user, 'app_opened', null, new Date(enrollment.createdAt.getTime() - randInt(0, 4) * DAY));
  }

  // A scatter of searches, including some that never appear in the catalog.
  const searchTerms = ['paneer', 'ghee', 'milk testing', 'cheese', 'curd', 'lactometer', 'butter', 'dahi', 'price', 'cream'];
  for (let i = 0; i < 140; i += 1) {
    pushEvent(pick(learners)._id, 'search', null, new Date(now - randInt(0, 59) * DAY - randInt(0, 20) * 60 * 60 * 1000), {
      query: pick(searchTerms),
    });
  }

  await AnalyticsEvent.insertMany(events);

  // Daily request rollup: a gentle growth curve with weekly rhythm + noise.
  const dailyStats = [];
  for (let d = 59; d >= 0; d -= 1) {
    const date = new Date(now - d * DAY);
    const growth = 1 + (59 - d) * 0.012;
    const weekly = date.getDay() === 0 ? 0.7 : date.getDay() === 6 ? 0.85 : 1;
    dailyStats.push({
      date: date.toISOString().slice(0, 10),
      requests: Math.round((260 + rand() * 240) * growth * weekly),
    });
  }
  await DailyStat.insertMany(dailyStats);

  console.log('Recomputing course ratings…');
  for (const course of courseDocs) {
    await recomputeCourseRating(course._id);
  }

  console.log('\nSeed complete ✔');
  console.log('──────────────────────────────────────────────');
  console.log(' Accounts created: a dashboard admin and demo learners with sample orders.');
  console.log(' Sign-in values are defined in src/seed/seed.js (not printed here).');
  console.log(' The app accepts any valid Indian mobile outside production with the');
  console.log(' demo OTP configured as DEMO_OTP in .env.');
  console.log('──────────────────────────────────────────────');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
