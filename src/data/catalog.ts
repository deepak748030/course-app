/**
 * Sample catalog for YDU Academy.
 *
 * Everything here is FICTIONAL sample content authored for this prototype: courses, prices,
 * ratings, review counts and reviews are not verified real-world facts.
 * Lesson counts and durations are derived from the authored lessons so the numbers stay coherent.
 *
 * DOMAIN
 * YDU Academy sells structured video courses for the dairy trade: milk handling and testing,
 * paneer and chhana, ghee and butter, curd and ferments, cheese, frozen dairy desserts, farm
 * practice and the business of selling dairy. Recipe cards are the standardised make-sheets a
 * dairy worker actually works from — batch sizes, temperatures and times.
 */

import { images } from '@/media';
import type { Category, Course, Id, Lesson, Recipe, Review, VideoKey } from '@/types';

type RecipeSeed = Omit<Recipe, 'id' | 'title'> & { title: string };
type LessonSeed = {
  title: string;
  minutes: number;
  description: string;
  /** Free preview lesson — playable without purchase. */
  preview?: boolean;
  recipe?: RecipeSeed;
};
type SectionSeed = { title: string; summary: string; video?: VideoKey; lessons: LessonSeed[] };
type ReviewSeed = Omit<Review, 'id'>;
type CourseSeed = {
  id: Id;
  title: string;
  promise: string;
  description: string;
  cover: Course['cover'];
  video: VideoKey;
  categoryId: Id;
  level: Course['level'];
  language: Course['language'];
  priceInr: number;
  listPriceInr?: number;
  rating: number;
  reviewCount: number;
  outcomes: string[];
  equipment: string[];
  audience: string;
  sections: SectionSeed[];
  reviews: ReviewSeed[];
  isPopular?: boolean;
  isBeginnerPick?: boolean;
};

/** The tracks a dairy learner picks between on the interests step and in Explore. */
export const categories: Category[] = [
  { id: 'milk', label: 'Milk handling', icon: 'Milk' },
  { id: 'paneer', label: 'Paneer & chhana', icon: 'Package' },
  { id: 'ghee', label: 'Ghee & butter', icon: 'Flame' },
  { id: 'ferments', label: 'Curd & ferments', icon: 'Soup' },
  { id: 'cheese', label: 'Cheese', icon: 'CakeSlice' },
  { id: 'frozen', label: 'Frozen desserts', icon: 'IceCream' },
  { id: 'farming', label: 'Farm & animals', icon: 'Leaf' },
  { id: 'business', label: 'Dairy business', icon: 'Store' },
];

export const interests = categories;

const courseSeeds: CourseSeed[] = [
  {
    id: 'milk-foundations',
    title: 'Milk Foundations',
    promise: 'Buy, chill, test and store milk with the numbers a dairy actually runs on.',
    description:
      'The course every other YDU track assumes you have done. Milk arrives warm and leaves cold, and everything between those two facts decides your yield and your shelf life: reception checks, fat and SNF, chilling curves, adulteration tests and cleaning. Every step is demonstrated on real equipment, with the readings shown on camera.',
    cover: images.coverMilkFoundations,
    video: 'milk',
    categoryId: 'milk',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1999,
    listPriceInr: 2999,
    rating: 4.8,
    reviewCount: 1284,
    outcomes: [
      'Judge milk quality on arrival by smell, temperature and appearance',
      'Take and record fat, SNF and lactometer readings correctly',
      'Chill a batch fast enough to hold shelf life',
      'Run the common adulteration tests in under ten minutes',
      'Clean and sanitise a milk line so the next batch is not spoiled',
    ],
    equipment: [
      'A calibrated lactometer and a 500 ml test cylinder',
      'A milk fat tester or a gerber centrifuge',
      'A probe thermometer reading 0 to 100 °C',
      'A clean 20 litre chilling can or bulk cooler',
    ],
    audience:
      'New dairy workers, small dairy owners and home producers who want the numbers right before they scale up.',
    sections: [
      {
        title: 'Milk on arrival',
        summary: 'What you check before you accept a single litre.',
        lessons: [
          {
            title: 'The reception check, step by step',
            minutes: 14,
            description: 'Temperature, smell, appearance and the organoleptic red flags that mean a rejected can.',
            preview: true,
          },
          {
            title: 'Fat, SNF and what they decide',
            minutes: 17,
            description: 'Why fat decides your payout, what SNF tells you about solids, and how the two travel together.',
            preview: true,
          },
          {
            title: 'Reading a lactometer correctly',
            minutes: 12,
            description: 'Temperature correction, the meniscus, and the two mistakes that skew every reading.',
          },
        ],
      },
      {
        title: 'Cold chain',
        summary: 'Chilling, holding and moving milk without losing days of shelf life.',
        video: 'curd-ferments',
        lessons: [
          {
            title: 'The chilling curve',
            minutes: 16,
            description: 'How fast milk must drop below 4 °C, and what happens to the bacterial count when it does not.',
          },
          {
            title: 'Storing and transporting a batch',
            minutes: 13,
            description: 'Can hygiene, loading order, agitation and the rules that keep a cold chain unbroken.',
            recipe: {
              title: 'Reception log sheet',
              servings: 1,
              prepMinutes: 5,
              cookMinutes: 0,
              ingredients: [
                { item: 'Batch record form (or a notebook)', quantity: '1' },
                { item: 'Probe thermometer', quantity: '1' },
                { item: 'Lactometer and cylinder', quantity: '1 set' },
                { item: 'Gerber tubes for the fat test', quantity: '2' },
              ],
              steps: [
                'Record supplier, date, time and the can number before opening it.',
                'Take the temperature within two minutes of arrival and write it down.',
                'Draw one sample from the top and one after stirring; test both.',
                'Log fat percentage, SNF percentage and the lactometer reading with its temperature.',
                'Run the adulteration strip and note the result against the batch.',
                'Accept or reject, and note the reason — a rejection is data, not a favour.',
              ],
              tips: [
                'Never test a cold sample for fat; warm it to 20 °C first.',
                'Log the supplier rejection rate monthly; it is the cheapest quality signal you own.',
              ],
            },
          },
        ],
      },
      {
        title: 'Testing and hygiene',
        summary: 'The tests every buyer asks for, and the cleaning that makes them pass.',
        lessons: [
          { title: 'Common adulteration tests', minutes: 18, description: 'Starch, water, detergent and urea — the four tests to run on any doubtful can.' },
          { title: 'Cleaning a milk line', minutes: 15, description: 'Rinse, caustic, rinse, acid, rinse — and how to verify the result instead of assuming it.' },
          { title: 'Running a small lab bench', minutes: 20, description: 'Sample labels, glassware discipline and a daily record sheet that survives an audit.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Rakesh M.',
        rating: 5,
        context: 'Completed Milk Foundations',
        body: 'We were losing milk every summer and never knew why. The chilling curve lesson explained it in twenty minutes and our rejection rate dropped in the first week.',
      },
      {
        author: 'Sunita P.',
        rating: 5,
        context: 'Watching Milk Foundations',
        body: 'The testing lessons are shown at the bench with real readings, not diagrams. I finally understand what my lactometer is telling me.',
      },
      {
        author: 'Imran S.',
        rating: 4,
        context: 'Completed Milk Foundations',
        body: 'Excellent for a new plant hand. I would have liked a longer section on bulk coolers rather than cans.',
      },
    ],
    isPopular: true,
    isBeginnerPick: true,
  },
  {
    id: 'paneer-craft',
    title: 'Paneer Craft',
    promise: 'Make paneer and chhana that hold their shape, taste fresh and give you the yield you paid for.',
    description:
      'A complete course in coagulated milk products: choosing milk for yield, heating and acidulating at the right strength, draining and pressing, cutting and storing, then the packaging and costing that decide whether the batch was worth making. Troubleshooting covers crumbly, rubbery, sour and low-yield paneer.',
    cover: images.coverPaneerCraft,
    video: 'paneer',
    categoryId: 'paneer',
    level: 'Beginner',
    language: 'English',
    priceInr: 2999,
    listPriceInr: 3999,
    rating: 4.9,
    reviewCount: 876,
    outcomes: [
      'Choose milk and acid strength for a predictable yield',
      'Coagulate at the right temperature without grainy curds',
      'Press paneer to the firmness a kitchen or market wants',
      'Diagnose crumbly, rubbery, sour and low-yield batches',
      'Cost a batch so every kilo is priced with a margin',
    ],
    equipment: [
      'A 20 litre stainless steel vessel with a heavy base',
      'Fine muslin or cheese cloth, boiled before use',
      'A paneer press or two flat boards and a weight',
      'A probe thermometer and a measuring jug',
    ],
    audience:
      'Small dairy owners, sweet-shop kitchens and home cooks who want a repeatable paneer rather than a lucky one.',
    sections: [
      {
        title: 'Before the first batch',
        summary: 'Milk, acid and the habits that decide yield.',
        lessons: [
          { title: 'Reading a recipe like a dairy hand', minutes: 13, description: 'Batch sizes, temperatures and why a make-sheet beats memory.', preview: true },
          { title: 'Choosing milk for yield', minutes: 17, description: 'Fat, SNF and how much a litre really gives you — measured, not guessed.' },
          { title: 'Acid strength and temperature', minutes: 11, description: 'Citric, lactic and vinegar at working strength, side by side on camera.', preview: true },
        ],
      },
      {
        title: 'Your first paneer',
        summary: 'From milk in the vessel to a pressed block.',
        video: 'milk',
        lessons: [
          {
            title: 'Making a clean paneer block',
            minutes: 28,
            description: 'Heat, acidulate, rest, drain, press and cool — the whole make with the temperatures called out.',
            recipe: {
              title: 'Standard paneer batch',
              servings: 1,
              prepMinutes: 20,
              cookMinutes: 25,
              ingredients: [
                { item: 'Full-cream milk', quantity: '5 litres' },
                { item: 'Citric acid solution (1%)', quantity: '400 ml' },
                { item: 'Cool water for washing the curd', quantity: '4 litres' },
                { item: 'Salt (optional, for a salted block)', quantity: '8 g' },
              ],
              steps: [
                'Heat the milk to 85 °C, then cool it to 75 °C before you add anything.',
                'Add the citric acid solution in a slow stream while stirring gently in one direction.',
                'Stop as soon as the whey turns clear and pale green — more acid makes a crumbly block.',
                'Rest for 10 minutes, then pour through a muslin-lined colander.',
                'Wash the curd in cool water for two minutes to stop further acid action.',
                'Bundle the cloth, press under 3 to 5 kg for 25 minutes, then cool in cold water before cutting.',
              ],
              tips: [
                'Record the yield every batch: a 5 litre make should give roughly 900 g to 1.1 kg.',
                'Never press a hot block; it traps whey and turns the texture rubbery.',
              ],
            },
          },
          { title: 'Cutting, cooling and storing', minutes: 21, description: 'Block sizes, cube cutting, brine holding and how long it stays fresh.' },
          { title: 'A soft chhana make', minutes: 16, description: 'The same milk, less pressing and a different product — the base for sandesh and rasgulla.' },
        ],
      },
      {
        title: 'Yield, quality and cost',
        summary: 'Turning a good batch into a business.',
        lessons: [
          { title: 'Diagnosing a failed batch', minutes: 19, description: 'Crumbly, rubbery, sour, or simply short on weight — what caused it and what to change next time.' },
          { title: 'Packing and shelf life', minutes: 17, description: 'Cold water holding, vacuum pouches and honest date labels for a small kitchen.' },
          { title: 'Costing a paneer batch', minutes: 15, description: 'Milk price, acid, gas, labour and losses worked into a per-kilo cost you can actually price from.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Pooja D.',
        rating: 5,
        context: 'Completed Paneer Craft',
        body: 'My first pressed block actually held together. The acid-strength lesson alone was worth it — I had been adding almost twice the citric solution I needed.',
      },
      {
        author: 'Karan V.',
        rating: 5,
        context: 'Completed Paneer Craft',
        body: 'The troubleshooting section is unusually honest. It explains failed batches instead of hiding them, and the costing sheet paid for the course in a month.',
      },
      {
        author: 'Meena R.',
        rating: 5,
        context: 'Completed Paneer Craft',
        body: 'I run a sweet shop and we switched our chhana make to the method shown here. Softer, and the yield is steadier.',
      },
    ],
    isPopular: true,
  },
  {
    id: 'curd-ferments',
    title: 'Curd & Ferments',
    promise: 'Set thick curd, dahi and cultured cream the same way every single day.',
    description:
      'Fermentation is the most forgiving and the most punishing part of dairy work: one warm night can turn a batch. This course covers culture handling, incubation temperature, setting times, in-cup versus bulk setting, and the fermented drinks and desserts that use the same base culture.',
    cover: images.coverCurdFerments,
    video: 'curd-ferments',
    categoryId: 'ferments',
    level: 'Beginner',
    language: 'English',
    priceInr: 1299,
    listPriceInr: 1999,
    rating: 4.7,
    reviewCount: 642,
    outcomes: [
      'Handle and store a starter culture without losing its strength',
      'Hold incubation temperature through a full set',
      'Set thick curd in bulk and in cups with the same culture',
      'Fix a thin, sour or separated batch',
      'Make cultured cream, lassi and a simple mishti base',
    ],
    equipment: [
      'A thermometer reading 30 to 50 °C',
      'A incubator, a warm cabinet or a well-insulated box',
      'Food-grade cups with lids for in-cup setting',
      'A clean muslin cloth for hung curd',
    ],
    audience: 'Dairy kitchens adding a curd line, and home producers who are tired of inconsistent sets.',
    sections: [
      {
        title: 'Culture',
        summary: 'The living part of the batch.',
        lessons: [
          { title: 'Cultures and how they behave', minutes: 14, description: 'Mesophilic and thermophilic cultures, what each does to body and sourness.', preview: true },
          { title: 'Handling and storing a starter', minutes: 12, description: 'Portioning, freezing, and how many generations a culture stays reliable.' },
        ],
      },
      {
        title: 'Setting curd',
        summary: 'Temperature, time and thickness in one reliable loop.',
        video: 'paneer',
        lessons: [
          {
            title: 'The daily curd set',
            minutes: 22,
            description: 'A repeatable batch: inoculation rate, incubation, and when to move it to the cold room.',
            recipe: {
              title: 'Bulk curd set — 10 litres',
              servings: 1,
              prepMinutes: 15,
              cookMinutes: 0,
              ingredients: [
                { item: 'Milk', quantity: '10 litres' },
                { item: 'Active curd starter', quantity: '100 g' },
                { item: 'Skim milk powder (for a firmer body)', quantity: '80 g' },
              ],
              steps: [
                'Heat the milk to 85 °C for five minutes, then cool it to 42 °C.',
                'Whisk the starter with a little warm milk so it has no lumps.',
                'Add the skim milk powder, then the starter, and stir for 30 seconds only.',
                'Hold at 42 °C without disturbing the vessel for 4 to 5 hours.',
                'Check the set at 4 hours: it should hold a clean spoon cut.',
                'Chill immediately to 4 °C to stop the culture and keep the taste mild.',
              ],
              tips: [
                'A one-degree drift changes the set time by about half an hour — log the temperature, not just the clock.',
                'Never move the vessel during the first four hours; agitation gives you a weak body.',
              ],
            },
          },
          { title: 'In-cup setting', minutes: 16, description: 'Filling, incubation and cooling cups so the lid stays clean and the surface flat.' },
          { title: 'Hung curd and thick products', minutes: 15, description: 'Draining whey for shrikhand, labneh and dip bases without losing too much of the batch.' },
        ],
      },
      {
        title: 'Drinks and desserts',
        summary: 'What the same base culture becomes.',
        lessons: [
          { title: 'Lassi, chaas and mattha', minutes: 14, description: 'Dilution ratios, salt and spice, and how to keep them from splitting.' },
          { title: 'A simple mishti base', minutes: 18, description: 'Sweetening after the set, colour and flavour without turning the batch grainy.' },
          { title: 'Diagnosing fermentation faults', minutes: 16, description: 'Thin, slimy, gassy, sour and separated curd, and the batch record that shows which one you have.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Neha J.',
        rating: 5,
        context: 'Completed Curd & Ferments',
        body: 'We set curd in a warm room and it was always a gamble. Holding 42 °C properly fixed it — same set every morning now.',
      },
      {
        author: 'Bhavin P.',
        rating: 4,
        context: 'Completed Curd & Ferments',
        body: 'Very clear on culture handling. I would like one more lesson on packaging cups at scale.',
      },
      {
        author: 'Arifa K.',
        rating: 5,
        context: 'Watching Curd & Ferments',
        body: 'The hung curd lesson solved a shrikhand problem we had been fighting for months.',
      },
    ],
  },
  {
    id: 'ghee-butter',
    title: 'Ghee & Butter at Home',
    promise: 'From cream to clean butter and fragrant ghee, with the moisture and solids under control.',
    description:
      'Cream handling, churning, washing and working butter, then the clarification that decides whether ghee tastes nutty or burnt. The course covers cream separation, ripening, both the hand churn and a small machine, and the drained-weight and moisture checks a serious kitchen needs.',
    cover: images.coverGheeButter,
    video: 'ghee',
    categoryId: 'ghee',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1499,
    listPriceInr: 2199,
    rating: 4.8,
    reviewCount: 713,
    outcomes: [
      'Separate and standardise cream to a working fat level',
      'Churn butter and wash it so it keeps longer',
      'Clarify ghee without scorching the solids',
      'Judge ghee by smell, colour and clarity before it is packed',
      'Hit the drained weights and moisture figures a buyer expects',
    ],
    equipment: [
      'A hand churn or a small butter churn',
      'A cream separator or a shallow tray for gravity separation',
      'A heavy-bottomed vessel and a fine strainer',
      'A thermometer and a moisture-checking method',
    ],
    audience: 'Home producers and small dairies adding ghee and white butter to a product line.',
    sections: [
      {
        title: 'Cream',
        summary: 'The raw material decides the flavour.',
        lessons: [
          { title: 'Collecting and separating cream', minutes: 15, description: 'Gravity versus mechanical separation, and the fat level each gives you.', preview: true },
          { title: 'Ripening for flavour', minutes: 13, description: 'How long to hold cream, at what temperature, and when ripening turns to spoiling.' },
        ],
      },
      {
        title: 'Butter',
        summary: 'Churn, wash, work and store.',
        video: 'milk',
        lessons: [
          {
            title: 'Churning a clean white butter',
            minutes: 24,
            description: 'Temperature windows, churn speed, and the moment the butter separates from the buttermilk.',
            recipe: {
              title: 'White butter from 2 litres of cream',
              servings: 1,
              prepMinutes: 15,
              cookMinutes: 30,
              ingredients: [
                { item: 'Cream at 38 to 40% fat', quantity: '2 litres' },
                { item: 'Ice-cold water for washing', quantity: '2 litres' },
                { item: 'Salt (optional)', quantity: '12 g' },
              ],
              steps: [
                'Temper the cream to 12 to 14 °C — too warm and the butter is soft, too cold and it will not churn.',
                'Churn at a steady speed until the butter grains are the size of small peas.',
                'Drain the buttermilk fully and keep it for baking or drinking.',
                'Wash the butter in ice-cold water, changing the water until it runs clear.',
                'Work the butter with a paddle to press out the last of the water.',
                'Add salt if you want it, then pack in a clean container and refrigerate.',
              ],
              tips: [
                'Buttermilk left in the butter is what turns it rancid first — wash it out properly.',
                'Weigh the butter and record the yield; 2 litres of 40% cream should give roughly 800 g.',
              ],
            },
          },
          { title: 'Working, salting and storing', minutes: 16, description: 'Moisture control, salt distribution and storage temperature for a long keep.' },
        ],
      },
      {
        title: 'Ghee',
        summary: 'Clarification and the pack.',
        lessons: [
          { title: 'Clarifying without burning', minutes: 20, description: 'Heat stages, the crackle test and the colour that means stop.' },
          { title: 'Judging and packing ghee', minutes: 14, description: 'Clarity, aroma, grain and the fill temperatures for jars and tins.' },
          { title: 'Troubleshooting ghee batches', minutes: 15, description: 'Burnt, cloudy, greasy or short-yield ghee, and what each one means about the batch before it.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Deepa S.',
        rating: 5,
        context: 'Completed Ghee & Butter at Home',
        body: 'My ghee was always slightly burnt. The heat stages lesson fixed it on the first try and the aroma is completely different now.',
      },
      {
        author: 'Mohan L.',
        rating: 5,
        context: 'Completed Ghee & Butter at Home',
        body: 'We sell white butter to two bakeries. The washing method here added days to our shelf life.',
      },
      {
        author: 'Kavita B.',
        rating: 4,
        context: 'Watching Ghee & Butter at Home',
        body: 'Very practical. I would have liked a lesson on handling a larger separator.',
      },
    ],
  },
  {
    id: 'frozen-desserts',
    title: 'Frozen Dairy Desserts',
    promise: 'Kulfi, matka ice cream and frozen desserts with the right body and no ice crystals.',
    description:
      'Freezing is where dairy desserts are won or lost. This course covers the mix, the ice-crystal rule, slow freezing in a matka, a small batch freezer, moulding, and the cold-chain handling that gets a frozen product to a shop without a melt-and-refreeze cycle.',
    cover: images.coverFrozenDesserts,
    video: 'ghee',
    categoryId: 'frozen',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 2499,
    rating: 4.7,
    reviewCount: 418,
    outcomes: [
      'Build a mix with the right fat, sugar and solids',
      'Keep ice crystals small so the texture stays smooth',
      'Freeze kulfi in moulds and matkas without a freezer burn',
      'Handle a frozen product through storage and transport',
      'Cost a frozen line and price a single serving',
    ],
    equipment: [
      'Moulds, matkas or a shallow freezer tray',
      'A freezer that holds −18 °C or colder',
      'A thermometer that reads below zero',
      'A whisk, a heavy pan and a fine strainer',
    ],
    audience: 'Dairy kitchens and sweet shops adding a frozen line, and home producers testing kulfi.',
    sections: [
      {
        title: 'The mix',
        summary: 'Fat, sugar and solids before anything freezes.',
        lessons: [
          { title: 'Balancing a frozen dessert mix', minutes: 18, description: 'Why too much sugar turns ice cream soft and too little turns it icy.', preview: true },
          { title: 'Ice crystals and body', minutes: 15, description: 'What freezing speed does to texture, shown with a slow and a fast freeze side by side.' },
        ],
      },
      {
        title: 'Kulfi and matka',
        summary: 'The slow-frozen classics.',
        video: 'curd-ferments',
        lessons: [
          {
            title: 'Malai kulfi in moulds',
            minutes: 26,
            description: 'Reducing the milk, sweetening, flavouring and the slow freeze that gives kulfi its body.',
            recipe: {
              title: 'Malai kulfi — 12 moulds',
              servings: 12,
              prepMinutes: 15,
              cookMinutes: 55,
              ingredients: [
                { item: 'Full-cream milk', quantity: '2 litres' },
                { item: 'Sugar', quantity: '180 g' },
                { item: 'Skim milk powder', quantity: '40 g' },
                { item: 'Cardamom powder', quantity: '1/2 tsp' },
                { item: 'Pistachio, slivered', quantity: '20 g' },
              ],
              steps: [
                'Bring the milk to a boil, then reduce it on a low flame to about 1.1 litres.',
                'Whisk in the skim milk powder so no lumps remain.',
                'Add the sugar and cook for five more minutes, stirring continuously.',
                'Cool completely, then stir in the cardamom and pistachio.',
                'Fill the moulds, tap them to release air pockets, and seal.',
                'Freeze at −18 °C or colder for at least 8 hours, then unmould in cool water.',
              ],
              tips: [
                'A slow freeze in a matka gives the classic denser body; a reach-in freezer gives a softer bite.',
                'Never refreeze a mould that has melted — the crystals will be unmistakable.',
              ],
            },
          },
          { title: 'Matka freezing and unmoulding', minutes: 17, description: 'The ice and salt pack, resting times, and how to release a mould without breaking it.' },
        ],
      },
      {
        title: 'Scoops and storage',
        summary: 'Batch freezing and the cold chain.',
        lessons: [
          { title: 'Small-batch freezer work', minutes: 22, description: 'Churning, overrun and when to stop for a scoopable body.' },
          { title: 'Storage and transport', minutes: 15, description: 'Cabinet temperature, loading, and the melt-and-refreeze signs to look for in a shop.' },
          { title: 'Costing a frozen line', minutes: 14, description: 'Mix cost, overrun and wastage worked into a per-serving price.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Snehal D.',
        rating: 5,
        context: 'Completed Frozen Dairy Desserts',
        body: 'Our kulfi was always icy. Slowing the freeze and fixing the sugar level changed the texture completely.',
      },
      {
        author: 'Arun N.',
        rating: 4,
        context: 'Completed Frozen Dairy Desserts',
        body: 'Good on the principles. I run a small freezer so the batch-freezer lesson was the one I used most.',
      },
      {
        author: 'Ritika S.',
        rating: 5,
        context: 'Watching Frozen Dairy Desserts',
        body: 'The storage lesson saved us a summer of complaints from shops.',
      },
    ],
  },
  {
    id: 'artisan-cheese',
    title: 'Artisan Cheese',
    promise: 'Rennet, curd cutting, pressing and maturing — a small-room method for real cheese.',
    description:
      'A structured path into cheese: rennet and coagulation, cutting and cooking the curd, pressing, salting, and the humidity and temperature a maturing room needs. The course builds a fresh cheese first, then a pressed cheese, then a simple matured wheel, with a fault guide for each stage.',
    cover: images.coverArtisanCheese,
    video: 'paneer',
    categoryId: 'cheese',
    level: 'Intermediate',
    language: 'English',
    priceInr: 3499,
    listPriceInr: 4999,
    rating: 4.9,
    reviewCount: 934,
    outcomes: [
      'Set a clean rennet curd and read the flocculation point',
      'Cut, cook and stir curd for the texture you want',
      'Press and salt a wheel consistently',
      'Hold a maturing room at the right temperature and humidity',
      'Diagnose a failed set, a sour wheel or a cracked rind',
    ],
    equipment: [
      'A cheese vat or a large heavy-bottomed vessel',
      'Rennet, a measuring syringe and calcium chloride',
      'Cheese moulds and a press',
      'A hygrometer and a thermometer for the maturing space',
    ],
    audience:
      'Dairies and serious home producers who already make paneer or curd and want to move into cheese.',
    sections: [
      {
        title: 'Coagulation',
        summary: 'Milk, rennet and the set.',
        lessons: [
          { title: 'Rennet and the clean set', minutes: 19, description: 'Rennet strength, dose, temperature and the clean break you are looking for.', preview: true },
          { title: 'Flocculation and cutting time', minutes: 16, description: 'Reading the flocculation point instead of watching the clock.' },
          { title: 'Acid, calcium and the curd', minutes: 15, description: 'Starter, calcium chloride and how acidity decides the final texture.' },
        ],
      },
      {
        title: 'Fresh and pressed cheeses',
        summary: 'From a soft set to a firm wheel.',
        video: 'milk',
        lessons: [
          {
            title: 'A fresh cheese, start to finish',
            minutes: 27,
            description: 'A simple rennet-set fresh cheese with the cut, drain and salt shown at working speed.',
            recipe: {
              title: 'Fresh rennet cheese from 10 litres',
              servings: 1,
              prepMinutes: 30,
              cookMinutes: 60,
              ingredients: [
                { item: 'Milk', quantity: '10 litres' },
                { item: 'Mesophilic starter', quantity: '100 g' },
                { item: 'Rennet, diluted', quantity: '2.5 ml' },
                { item: 'Calcium chloride solution', quantity: '2 ml' },
                { item: 'Cheese salt', quantity: '25 g' },
              ],
              steps: [
                'Heat the milk to 32 °C and add the starter; hold for 30 minutes.',
                'Add the calcium chloride, then the diluted rennet, and stir for 30 seconds.',
                'Leave undisturbed until you get a clean break — usually 35 to 45 minutes.',
                'Cut the curd into 1 cm cubes and rest for five minutes.',
                'Stir gently and raise the temperature by 1 °C every five minutes to 38 °C.',
                'Drain the whey, fill the mould, press lightly for two hours, then salt and chill.',
              ],
              tips: [
                'Dilute rennet in cool water, never in chlorinated tap water.',
                'Record the set time with the milk temperature; the same dose sets differently on a warm day.',
              ],
            },
          },
          { title: 'Cutting, cooking and stirring', minutes: 21, description: 'Curd size, temperature steps and how each one changes the wheel.' },
          { title: 'Pressing and salting', minutes: 18, description: 'Pressure schedules, brine strength and how much salt a wheel actually takes.' },
        ],
      },
      {
        title: 'Maturing',
        summary: 'Time, humidity and the rind.',
        lessons: [
          { title: 'A workable maturing room', minutes: 20, description: 'Temperature, humidity, turning and the airflow a small room needs.' },
          { title: 'Rinds, moulds and what is normal', minutes: 17, description: 'Which growths are wanted, which are not, and how to clean a shelf between wheels.' },
          { title: 'A cheese fault guide', minutes: 19, description: 'A failed set, bitterness, a cracked rind and a sour wheel, traced back to the stage that caused them.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Farhan A.',
        rating: 5,
        context: 'Completed Artisan Cheese',
        body: 'I had been making paneer for years and every rennet attempt failed. Reading flocculation instead of the clock was the missing piece.',
      },
      {
        author: 'Lakshmi V.',
        rating: 5,
        context: 'Completed Artisan Cheese',
        body: 'The maturing room lesson is worth the price by itself. Our first three wheels had a cracked rind and now we know exactly why.',
      },
      {
        author: 'Daniel M.',
        rating: 5,
        context: 'Watching Artisan Cheese',
        body: 'Densely practical. Nothing is glossed over, including the batches that went wrong.',
      },
    ],
    isPopular: true,
  },
  {
    id: 'dairy-farming',
    title: 'Dairy Farming Basics',
    promise: 'Feed, health and hygiene on a small farm, planned around the milk you actually sell.',
    description:
      'The farm end of the chain: animal feeding and water, clean milking routine, udder health, record keeping and the hygiene that keeps a buyer’s tests passing. Built for smallholdings of two to twenty animals rather than industrial units.',
    cover: images.coverDairyFarming,
    video: 'milk',
    categoryId: 'farming',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1799,
    listPriceInr: 2699,
    rating: 4.6,
    reviewCount: 528,
    outcomes: [
      'Plan a daily feed and water routine around your herd size',
      'Run a clean milking routine that protects udder health',
      'Spot mastitis early and act before the milk is lost',
      'Keep herd and milk records that show what is working',
      'Set up a shed routine that keeps bacteria counts down',
    ],
    equipment: [
      'A clean milking pail and a strip cup',
      'A thermometer and a clean water source',
      'A record register or a simple farm book',
      'A foot bath and basic cleaning material',
    ],
    audience: 'Small and marginal dairy farmers, and family farms who sell milk or supply a co-operative.',
    sections: [
      {
        title: 'The animal',
        summary: 'Feed, water and calm handling.',
        lessons: [
          { title: 'Feeding for the milk you sell', minutes: 18, description: 'Dry matter, green fodder and concentrate, worked out per animal per day.', preview: true },
          { title: 'Water and comfort', minutes: 13, description: 'How much water a milking animal drinks, and why shed heat matters more than breed.' },
          { title: 'Handling without stress', minutes: 14, description: 'A calm routine that makes milking faster and safer for both sides.' },
        ],
      },
      {
        title: 'Milking and udder health',
        summary: 'The routine that decides your tests.',
        video: 'curd-ferments',
        lessons: [
          {
            title: 'A clean milking routine',
            minutes: 20,
            description: 'Fore-milking, cleaning, drying, the milking itself and the post-milking dip, in order.',
            recipe: {
              title: 'Daily milking routine card',
              servings: 1,
              prepMinutes: 10,
              cookMinutes: 0,
              ingredients: [
                { item: 'Clean milking pail, dry', quantity: '1' },
                { item: 'A single-use cloth or paper towel per animal', quantity: '1 per animal' },
                { item: 'Milking salve', quantity: 'as needed' },
                { item: 'Teat dip or a clean water bowl', quantity: '1' },
              ],
              steps: [
                'Wash your hands and tie the animal calmly before touching the udder.',
                'Fore-milk two or three strips into a strip cup and look at it — this is your daily test.',
                'Clean the udder, then dry it with a separate towel; never milk a wet udder.',
                'Milk with full hands, in a steady rhythm, and finish within 7 to 8 minutes.',
                'Dip or wash the teats after milking and leave the animal standing for 30 minutes.',
                'Strain the milk and rush it to chilling; move the pail out of the shed before cleaning it.',
              ],
              tips: [
                'One cloth per animal. A shared cloth is how mastitis travels through a shed.',
                'Write the fore-milk finding in the register daily — a curve is what warns you, not one reading.',
              ],
            },
          },
          { title: 'Spotting mastitis early', minutes: 17, description: 'Strip cup checks, the first signs, and what to do before the milk is unsellable.' },
          { title: 'Shed hygiene that holds', minutes: 16, description: 'Floor slope, bedding, washing routine and reducing flies without extra labour.' },
        ],
      },
      {
        title: 'Records and planning',
        summary: 'What to write down and how to use it.',
        lessons: [
          { title: 'A farm record book', minutes: 15, description: 'Feed, milk, health and cost in four columns you can keep for a year.' },
          { title: 'Deciding with the numbers', minutes: 18, description: 'Reading a month of records to find the two changes worth making next month.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Suresh Y.',
        rating: 5,
        context: 'Completed Dairy Farming Basics',
        body: 'We had two animals with repeat mastitis. The one-cloth-per-animal rule changed the shed in a month.',
      },
      {
        author: 'Anita D.',
        rating: 4,
        context: 'Completed Dairy Farming Basics',
        body: 'Simple and practical. It is aimed at small farms, which is exactly what we have.',
      },
      {
        author: 'Ganesh K.',
        rating: 5,
        context: 'Watching Dairy Farming Basics',
        body: 'The record book lesson paid off in the first month — we found we were overfeeding concentrate.',
      },
    ],
    isBeginnerPick: true,
  },
  {
    id: 'dairy-business',
    title: 'Selling Your Dairy',
    promise: 'Price, pack, licence and deliver dairy products without giving away your margin.',
    description:
      'The commercial half of dairy work: working out what a product really costs, choosing pack sizes, approaching shops and co-operatives, the licences and labelling a small dairy needs, and the cold-chain promises you must be able to keep. Includes a costing sheet and a simple route plan.',
    cover: images.coverDairyBusiness,
    video: 'ghee',
    categoryId: 'business',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 999,
    listPriceInr: 0,
    rating: 4.5,
    reviewCount: 297,
    outcomes: [
      'Cost a product so price covers milk, power, labour and loss',
      'Choose pack sizes that fit a shop’s shelf and a home buyer',
      'Check the licences and labels a small dairy needs',
      'Plan a delivery route that keeps the cold chain unbroken',
      'Talk margins with a buyer without guessing at numbers',
    ],
    equipment: [
      'A notebook or a simple spreadsheet',
      'A weighing scale accurate to 5 g',
      'A thermometer for delivery checks',
      'Sample cups and labels for a shop tasting',
    ],
    audience: 'Small dairy owners and family producers who already sell milk and want to sell products.',
    sections: [
      {
        title: 'Numbers first',
        summary: 'Cost, price and the margin in between.',
        lessons: [
          { title: 'What a product really costs', minutes: 18, description: 'Milk, culture, power, packaging, labour and loss built into one per-kilo figure.', preview: true },
          { title: 'Pricing without guessing', minutes: 20, description: 'Cost, shop margin and the price a buyer will actually pay, tested against the catalog.', preview: true },
          { title: 'Reading a month of sales', minutes: 15, description: 'Which products are quietly losing money, and how to cut a line without upsetting a buyer.' },
        ],
      },
      {
        title: 'Product and pack',
        summary: 'What to sell it in, and under what name.',
        video: 'milk',
        lessons: [
          {
            title: 'Packs, labels and shelf life',
            minutes: 16,
            description: 'Pack sizes, cold-water holding, and the label information a buyer expects.',
            recipe: {
              title: 'Product costing sheet — 1 kg paneer',
              servings: 1,
              prepMinutes: 10,
              cookMinutes: 0,
              ingredients: [
                { item: 'Milk at your purchase rate', quantity: '8 litres' },
                { item: 'Citric acid / culture cost', quantity: 'as used' },
                { item: 'Fuel or power for the batch', quantity: 'metered' },
                { item: 'Pack, label and labour', quantity: 'per batch' },
              ],
              steps: [
                'Write the milk cost as a rate per litre, not what you paid last month.',
                'Add the acid, culture and salt used for exactly this batch.',
                'Add fuel or electricity measured over the batch, not an average day.',
                'Add the pack, label and the labour hours at a stated hourly rate.',
                'Divide by the finished weight after loss and trimming — the true per-kilo cost.',
                'Mark it up for the shop margin, then check the price against what your market already pays.',
              ],
              tips: [
                'Never price from a competitor’s shelf price alone; their milk rate is not your milk rate.',
                'Review the sheet whenever the milk rate moves — a 10% milk rise is not a 10% price rise.',
              ],
            },
          },
          { title: 'Selling to shops and co-operatives', minutes: 19, description: 'Samples, margin talks, delivery promises and how to keep a buyer for a year.' },
        ],
      },
      {
        title: 'Licences and delivery',
        summary: 'The paperwork and the route.',
        lessons: [
          { title: 'Licences and labelling basics', minutes: 17, description: 'What a small dairy unit needs in place, and what must appear on a label.' },
          { title: 'A cold-chain delivery route', minutes: 16, description: 'Route order, boxes, ice packs and the delivery window that keeps a promise.' },
          { title: 'When something goes wrong', minutes: 14, description: 'A recall plan, complaints, and protecting the name you have built.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Mahesh R.',
        rating: 5,
        context: 'Completed Selling Your Dairy',
        body: 'We were pricing paneer from a competitor’s board. The costing sheet showed us we were losing money on every kilo.',
      },
      {
        author: 'Fatima Z.',
        rating: 4,
        context: 'Completed Selling Your Dairy',
        body: 'The route plan lesson is very practical for a small delivery van.',
      },
      {
        author: 'Rohit B.',
        rating: 5,
        context: 'Watching Selling Your Dairy',
        body: 'Straight talk about margins, licences and labels. No theory padding.',
      },
    ],
  },
];


function makeCourse(seed: CourseSeed): Course {
  const lessons: Lesson[] = [];
  let lessonNumber = 0;

  const sections = seed.sections.map((section, sectionIndex) => {
    const sectionId = `${seed.id}-s${sectionIndex + 1}`;
    section.lessons.forEach((lessonSeed) => {
      lessonNumber += 1;
      const lessonId = `${seed.id}-l${lessonNumber}`;
      lessons.push({
        id: lessonId,
        courseId: seed.id,
        sectionId,
        title: lessonSeed.title,
        description: lessonSeed.description,
        minutes: lessonSeed.minutes,
        isPreview: lessonSeed.preview ?? false,
        video: section.video ?? seed.video,
        recipe: lessonSeed.recipe ? { ...lessonSeed.recipe, id: `${lessonId}-recipe` } : undefined,
      });
    });
    return { id: sectionId, title: section.title, summary: section.summary };
  });

  const totalMinutes = lessons.reduce((sum, lesson) => sum + lesson.minutes, 0);

  return {
    id: seed.id,
    title: seed.title,
    promise: seed.promise,
    description: seed.description,
    cover: seed.cover,
    video: seed.video,
    categoryId: seed.categoryId,
    level: seed.level,
    language: seed.language,
    hours: Math.round((totalMinutes / 60) * 10) / 10,
    lessonCount: lessons.length,
    priceInr: seed.priceInr,
    listPriceInr: seed.listPriceInr,
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    outcomes: seed.outcomes,
    equipment: seed.equipment,
    audience: seed.audience,
    sections,
    lessons,
    reviews: seed.reviews.map((review, index) => ({ ...review, id: `${seed.id}-r${index + 1}` })),
    isPopular: seed.isPopular,
    isBeginnerPick: seed.isBeginnerPick,
  };
}

export const courses: Course[] = courseSeeds.map(makeCourse);

/**
 * Percent off when the sample data models a real discount, else null. Derived so a price change
 * can never disagree with the badge that advertises it.
 */
export function discountPercent(course: Course): number | null {
  if (!course.listPriceInr || course.listPriceInr <= course.priceInr) return null;
  return Math.round(((course.listPriceInr - course.priceInr) / course.listPriceInr) * 100);
}

export function courseById(id: string | undefined): Course | undefined {
  return courses.find((course) => course.id === id);
}

export function nextLesson(course: Course, lessonId: string): Lesson | undefined {
  const index = course.lessons.findIndex((lesson) => lesson.id === lessonId);
  return index === -1 ? undefined : course.lessons[index + 1];
}

export function firstPlayableLesson(course: Course): Lesson {
  return course.lessons.find((lesson) => lesson.isPreview) ?? course.lessons[0];
}

/* ------------------------------------------------------------------ *
 * Browse: search and filters run over the sample catalog above.
 * ------------------------------------------------------------------ */

export type SortKey = 'recommended' | 'rating' | 'price-asc' | 'price-desc' | 'shortest';

export type BrowseFilters = {
  categoryIds: string[];
  levels: string[];
  priceBands: string[]; // 'under-1000' | '1000-2500' | 'above-2500'
  durations: string[]; // 'under-2' | '2-4' | 'above-4'
  query: string;
  sort: SortKey;
};

export const emptyFilters: BrowseFilters = {
  categoryIds: [],
  levels: [],
  priceBands: [],
  durations: [],
  query: '',
  sort: 'recommended',
};

export const sortOptions: { id: SortKey; label: string }[] = [
  { id: 'recommended', label: 'Recommended' },
  { id: 'rating', label: 'Top rated' },
  { id: 'price-asc', label: 'Price: low to high' },
  { id: 'price-desc', label: 'Price: high to low' },
  { id: 'shortest', label: 'Shortest first' },
];

export const priceBandOptions = [
  { id: 'under-1000', label: 'Under ₹1,000' },
  { id: '1000-2500', label: '₹1,000 – ₹2,500' },
  { id: 'above-2500', label: 'Above ₹2,500' },
];

export const durationOptions = [
  { id: 'under-2', label: 'Under 2 hours' },
  { id: '2-4', label: '2 – 4 hours' },
  { id: 'above-4', label: '4 hours and above' },
];

export function browseCourses(filters: BrowseFilters): Course[] {
  const query = filters.query.trim().toLowerCase();

  const matched = courses.filter((course) => {
    const matchesQuery =
      query.length === 0 ||
      course.title.toLowerCase().includes(query) ||
      course.promise.toLowerCase().includes(query) ||
      course.description.toLowerCase().includes(query) ||
      course.level.toLowerCase().includes(query) ||
      course.outcomes.some((outcome) => outcome.toLowerCase().includes(query));

    const matchesCategory =
      filters.categoryIds.length === 0 || filters.categoryIds.includes(course.categoryId);
    const matchesLevel = filters.levels.length === 0 || filters.levels.includes(course.level);

    const matchesPrice =
      filters.priceBands.length === 0 ||
      filters.priceBands.some((band) =>
        band === 'under-1000'
          ? course.priceInr < 1000
          : band === '1000-2500'
            ? course.priceInr >= 1000 && course.priceInr <= 2500
            : course.priceInr > 2500,
      );

    const matchesDuration =
      filters.durations.length === 0 ||
      filters.durations.some((band) =>
        band === 'under-2' ? course.hours < 2 : band === '2-4' ? course.hours >= 2 && course.hours <= 4 : course.hours > 4,
      );

    return matchesQuery && matchesCategory && matchesLevel && matchesPrice && matchesDuration;
  });

  const sorted = [...matched];
  switch (filters.sort) {
    case 'rating':
      sorted.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
      break;
    case 'price-asc':
      sorted.sort((a, b) => a.priceInr - b.priceInr);
      break;
    case 'price-desc':
      sorted.sort((a, b) => b.priceInr - a.priceInr);
      break;
    case 'shortest':
      sorted.sort((a, b) => a.hours - b.hours);
      break;
    default:
      sorted.sort(
        (a, b) =>
          Number(b.isPopular ?? false) - Number(a.isPopular ?? false) ||
          b.rating - a.rating ||
          b.reviewCount - a.reviewCount,
      );
  }
  return sorted;
}
