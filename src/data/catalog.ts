/**
 * Sample catalog for Rasoi Studio.
 *
 * Everything here is FICTIONAL sample content authored for this prototype: courses, prices,
 * ratings, review counts and reviews are not verified real-world facts.
 * Lesson counts and durations are derived from the authored lessons so the numbers stay coherent.
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

export const categories: Category[] = [
  { id: 'north-indian', label: 'North Indian', icon: 'CookingPot' },
  { id: 'south-indian', label: 'South Indian', icon: 'Soup' },
  { id: 'baking', label: 'Baking', icon: 'Croissant' },
  { id: 'desserts', label: 'Desserts', icon: 'CakeSlice' },
  { id: 'everyday', label: 'Everyday cooking', icon: 'Utensils' },
  { id: 'healthy', label: 'Healthy', icon: 'Salad' },
  { id: 'foundations', label: 'Foundations', icon: 'CookingPot' },
];

export const interests = categories;

const courseSeeds: CourseSeed[] = [
  {
    id: 'biryani',
    title: 'The Art of Biryani',
    promise: 'Build a layered handi biryani you can be proud of, from rice to dum.',
    description:
      'A structured path through biryani: choosing and soaking rice, building the base, layering and sealing the handi, then the sides that complete the plate. Every technique is demonstrated on camera so you can see how the rice, masala and heat are supposed to behave.',
    cover: images.biryani,
    video: 'gravies',
    categoryId: 'north-indian',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 2499,
    listPriceInr: 3499,
    rating: 4.8,
    reviewCount: 1284,
    outcomes: [
      'Cook long-grain rice so the grains stay separate under dum',
      'Build a layered biryani without a pressure cooker',
      'Balance whole spices, fried onion and curd marinade',
      'Judge doneness by sight, sound and smell',
      'Plate a handi biryani for a table of six',
    ],
    equipment: [
      'A heavy-bottomed handi or thick casserole with a tight lid',
      'A flat tawa or griddle for the dum stage',
      'Fine muslin or foil for sealing',
      'A large wide pan for the rice par-boil',
    ],
    audience:
      'Home cooks who already handle a basic masala and want a repeatable biryani method.',
    sections: [
      {
        title: 'Foundations of a great biryani',
        summary: 'Rice, spice and heat before anything is layered.',
        lessons: [
          {
            title: 'Choosing and soaking the rice',
            minutes: 14,
            description: 'Age of rice, the 30-minute soak, and why broken grains spoil a biryani.',
            preview: true,
          },
          {
            title: 'Whole spices: building the base',
            minutes: 16,
            description: 'How to bloom whole garam masala in ghee without burning it.',
            preview: true,
          },
          {
            title: 'Why dum works',
            minutes: 12,
            description: 'What steam and trapped pressure do to rice, and how to tell when it is done.',
          },
        ],
      },
      {
        title: 'The layered biryani',
        summary: 'Marinade, par-boil, layer, seal.',
        video: 'home-cooking',
        lessons: [
          {
            title: 'Marinating for depth',
            minutes: 18,
            description: 'Curd, raw papaya and time: how long each protein actually needs.',
          },
          {
            title: 'Brown onion: the real technique',
            minutes: 20,
            description: 'Slicing evenly, frying in batches, and storing birista without it going soft.',
          },
          {
            title: 'Layering and sealing the handi',
            minutes: 24,
            description: 'Rice-to-masala ratios, saffron milk, and sealing the pot for dum.',
            recipe: {
              title: 'Dum-style vegetable biryani',
              servings: 4,
              prepMinutes: 30,
              cookMinutes: 45,
              ingredients: [
                { item: 'Basmati rice, soaked', quantity: '500 g' },
                { item: 'Mixed vegetables, cubed', quantity: '500 g' },
                { item: 'Thick curd', quantity: '200 g' },
                { item: 'Fried onion (birista)', quantity: '1.5 cups' },
                { item: 'Ghee', quantity: '4 tbsp' },
                { item: 'Whole spices (bay, cardamom, clove, cinnamon)', quantity: '1 tbsp' },
                { item: 'Saffron in warm milk', quantity: '3 tbsp' },
                { item: 'Mint and coriander, chopped', quantity: '1 cup' },
                { item: 'Salt', quantity: 'to taste' },
              ],
              steps: [
                'Marinate the vegetables in curd, half the birista, ginger-garlic paste, salt and half the mint for at least 30 minutes.',
                'Bring a wide pot of water to a rolling boil with whole spices and salt, then par-boil the soaked rice until it is 70 percent done. Drain immediately.',
                'Heat ghee in the handi, spread the marinade at the base, then layer the drained rice over it.',
                'Top with the remaining birista, mint, coriander, saffron milk and a spoon of ghee.',
                'Seal the lid with dough or foil, place on a tawa over low heat and cook for 25 minutes.',
                'Rest for 10 minutes undisturbed, then open and fold gently from the side.',
              ],
              tips: [
                'Par-boil in small batches and spread the rice on a tray so it stops cooking.',
                'If your handi is thin, add a second tawa underneath to spread the heat.',
                'Cook for 25 minutes without lifting the lid; opening early loses the steam that finishes the rice.',
              ],
            },
          },
          {
            title: 'Getting the rice just right',
            minutes: 15,
            description: 'Reading the par-boil stage, and what to do if it went too far.',
          },
        ],
      },
      {
        title: 'Sides and finishing',
        summary: 'The bowls that make the plate.',
        lessons: [
          { title: 'Mirchi ka salan', minutes: 18, description: 'A tangy peanut-sesame gravy that balances a rich biryani.' },
          { title: 'Burani raita', minutes: 10, description: 'Garlic, mint and curd, whisked so it stays pourable.' },
          { title: 'Plating and serving a handi', minutes: 12, description: 'Breaking the seal at the table and serving without crushing the rice.', preview: true },
          { title: 'Troubleshooting: rice, spice, dryness', minutes: 14, description: 'A checklist for the five things that most often go wrong.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Ankita R.',
        rating: 5,
        context: 'Completed The Art of Biryani',
        body: 'I had failed at biryani three times before this. The par-boil lesson alone fixed it — my rice was cooked and separate for the first time.',
      },
      {
        author: 'Faizan S.',
        rating: 5,
        context: 'Completed The Art of Biryani',
        body: 'The brown onion lesson is worth the course. I make a batch every fortnight now and freeze it.',
      },
      {
        author: 'Devika M.',
        rating: 4,
        context: 'Watching The Art of Biryani',
        body: 'Very clear method. I wish the salan lesson was longer, but everything else is exactly what I needed.',
      },
    ],
    isPopular: true,
  },
  {
    id: 'everyday-indian',
    title: 'Everyday Indian Cooking',
    promise: 'Cook a confident, balanced Indian meal on a weeknight — without a recipe open.',
    description:
      'The course for anyone who wants to stop following recipes line by line. You will build a masala dabba, learn tempering and balancing, then cook a full thali repeatedly until it feels routine.',
    cover: images.everydayIndian,
    video: 'home-cooking',
    categoryId: 'everyday',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 1199,
    listPriceInr: 1799,
    rating: 4.7,
    reviewCount: 2051,
    outcomes: [
      'Build and use an everyday masala dabba',
      'Temper spices without burning them',
      'Balance salt, acid, fat and heat in any dish',
      'Cook dal, sabzi, roti and rice in one sequence',
      'Plate a balanced thali without stress',
    ],
    equipment: ['A kadai or deep pan', 'A pressure cooker or heavy lidded pot', 'A tawa for rotis', 'A small tempering pan'],
    audience: 'Beginners and anyone who cooks daily but wants more confidence and consistency.',
    sections: [
      {
        title: 'Getting your kitchen ready',
        summary: 'The small systems that make weeknights easy.',
        lessons: [
          {
            title: 'The everyday masala dabba',
            minutes: 12,
            description: 'The eight spices worth keeping within reach, and how to store them.',
            preview: true,
          },
          { title: 'Tempering: the 30-second rule', minutes: 13, description: 'Reading the sound and smell of a tadka so it never turns bitter.' },
          { title: 'Salt, acid, fat: balancing a dish', minutes: 15, description: 'A practical order for fixing a dish that tastes flat.' },
        ],
      },
      {
        title: 'Dal, sabzi and roti',
        summary: 'The core of a home meal.',
        lessons: [
          {
            title: 'Dal tadka that never fails',
            minutes: 18,
            description: 'Proportions, cooking time and a finishing tadka that carries the dish.',
            recipe: {
              title: 'Everyday dal tadka',
              servings: 4,
              prepMinutes: 10,
              cookMinutes: 25,
              ingredients: [
                { item: 'Toor dal', quantity: '1 cup' },
                { item: 'Turmeric', quantity: '0.5 tsp' },
                { item: 'Ghee or oil', quantity: '2 tbsp' },
                { item: 'Cumin seeds', quantity: '1 tsp' },
                { item: 'Garlic, sliced', quantity: '5 cloves' },
                { item: 'Dried red chilli', quantity: '2' },
                { item: 'Tomato, chopped', quantity: '1' },
                { item: 'Coriander leaves', quantity: '2 tbsp' },
                { item: 'Salt', quantity: 'to taste' },
              ],
              steps: [
                'Rinse the dal well and cook with turmeric, salt and 3 cups of water until soft. Whisk to a loose, pourable consistency.',
                'Heat ghee and add cumin. When it crackles, add garlic and dried chilli and fry until the garlic is pale gold.',
                'Add tomato and cook until it softens and the fat separates.',
                'Pour the tempering over the dal, stir once, and simmer for 5 minutes.',
                'Finish with coriander and a squeeze of lemon.',
              ],
              tips: [
                'Dal thickens as it sits — keep a little hot water handy to loosen it.',
                'A pressure cooker gives softer dal; a pot gives more texture. Both work.',
                'Temper in a separate pan so the dal does not split.',
              ],
            },
          },
          { title: 'Seasonal sabzi, three ways', minutes: 20, description: 'Dry, semi-dry and curry treatments for whatever is in season.' },
          { title: 'Soft rotis on a tawa', minutes: 19, description: 'Dough consistency, resting, and keeping rotis soft in a casserole.' },
          { title: 'Rice that stays separate', minutes: 14, description: 'Water ratios for everyday rice, and how to salvage sticky rice.' },
          {
            title: 'Paneer bhurji in 15 minutes',
            minutes: 15,
            description: 'A fast protein dish using the masala habits from earlier lessons.',
            recipe: {
              title: 'Paneer bhurji',
              servings: 3,
              prepMinutes: 8,
              cookMinutes: 12,
              ingredients: [
                { item: 'Paneer, crumbled', quantity: '250 g' },
                { item: 'Onion, chopped', quantity: '1' },
                { item: 'Tomato, chopped', quantity: '2' },
                { item: 'Green chilli', quantity: '1' },
                { item: 'Turmeric', quantity: '0.25 tsp' },
                { item: 'Garam masala', quantity: '0.5 tsp' },
                { item: 'Oil', quantity: '2 tbsp' },
                { item: 'Coriander leaves', quantity: '2 tbsp' },
              ],
              steps: [
                'Heat oil and sauté onion with a pinch of salt until soft and lightly golden.',
                'Add chilli, tomato and turmeric, and cook until the tomato breaks down.',
                'Add the crumbled paneer and toss on high heat for 2 to 3 minutes only.',
                'Finish with garam masala and coriander, and serve immediately.',
              ],
              tips: ['Do not overcook the paneer or it turns rubbery.', 'Use fresh paneer for a softer crumble.'],
            },
          },
        ],
      },
      {
        title: 'Putting a thali together',
        summary: 'Sequencing a full meal.',
        lessons: [
          { title: 'Planning a balanced thali', minutes: 13, description: 'Carbohydrate, protein, vegetable and something fresh.' },
          { title: 'Everyday salad and raita', minutes: 11, description: 'Two five-minute sides that finish any plate.', preview: true },
          { title: 'A weeknight thali, start to finish', minutes: 26, description: 'One person, one hob, four dishes in forty minutes.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Sneha K.',
        rating: 5,
        context: 'Completed Everyday Indian Cooking',
        body: 'I cook every day and still learned things. The tempering rule changed how my dal tastes.',
      },
      {
        author: 'Ravi T.',
        rating: 5,
        context: 'Watching Everyday Indian Cooking',
        body: 'The weeknight thali lesson is the most useful video I have watched on cooking.',
      },
      {
        author: 'Megha B.',
        rating: 4,
        context: 'Completed Everyday Indian Cooking',
        body: 'Great for beginners. I would have liked a couple more rice options.',
      },
    ],
    isPopular: true,
    isBeginnerPick: true,
  },
  {
    id: 'baking-basics',
    title: 'Baking Basics',
    promise: 'Weigh it right, read the dough, and bake bread and cakes that work every time.',
    description:
      'A complete first course in baking: how ingredients behave, your first loaf, cakes and cookies, and a troubleshooting section for the bakes that did not go to plan.',
    cover: images.bakingBasics,
    video: 'baking',
    categoryId: 'baking',
    level: 'Beginner',
    language: 'English',
    priceInr: 2999,
    listPriceInr: 3999,
    rating: 4.9,
    reviewCount: 876,
    outcomes: [
      'Weigh ingredients and understand why it matters',
      'Bake a no-knead country loaf with an open crumb',
      'Shape, proof and score dough with confidence',
      'Cream butter and sugar for consistent cakes',
      'Diagnose dense cakes, dry bread and flat cookies',
    ],
    equipment: ['A digital kitchen scale', 'A mixing bowl and dough scraper', 'A lidded pot or baking stone', 'An oven thermometer'],
    audience: 'First-time bakers and home cooks who want reliable, repeatable results.',
    sections: [
      {
        title: 'Before you bake',
        summary: 'Ingredients and habits that decide the outcome.',
        lessons: [
          { title: 'Reading a recipe like a baker', minutes: 13, description: 'Order of operations, temperatures and why recipes rewrite badly.', preview: true },
          { title: 'Flour, yeast and what they do', minutes: 17, description: 'Protein content, hydration and how yeast actually behaves.' },
          { title: 'Weighing vs measuring', minutes: 11, description: 'A side-by-side that shows how much a cup of flour really varies.', preview: true },
        ],
      },
      {
        title: 'Your first bread',
        summary: 'From flour and water to a baked loaf.',
        video: 'foundations',
        lessons: [
          {
            title: 'No-knead country loaf',
            minutes: 28,
            description: 'A forgiving loaf that teaches fermentation, shaping and steam.',
            recipe: {
              title: 'No-knead country loaf',
              servings: 1,
              prepMinutes: 20,
              cookMinutes: 45,
              ingredients: [
                { item: 'Bread flour', quantity: '400 g' },
                { item: 'Water, warm', quantity: '300 g' },
                { item: 'Instant yeast', quantity: '1 tsp' },
                { item: 'Salt', quantity: '8 g' },
              ],
              steps: [
                'Mix flour, yeast and salt, then add water and combine into a shaggy dough.',
                'Cover and leave at room temperature for 12 to 18 hours.',
                'Fold the dough four times on a floured surface, then shape into a tight round.',
                'Proof in a floured cloth-lined bowl for 1 hour.',
                'Bake in a preheated lidded pot at 230 C for 30 minutes, then uncovered for 15 minutes.',
                'Cool completely on a rack before slicing.',
              ],
              tips: [
                'A slow, cold ferment gives more flavour than a warm, quick one.',
                'If the loaf feels dense, your second proof probably ran short.',
              ],
            },
          },
          { title: 'Shaping and proofing', minutes: 21, description: 'Reading the dough instead of timing it.' },
          { title: 'Scoring and steam', minutes: 16, description: 'Why the cut matters and how steam gives you an open crust.' },
        ],
      },
      {
        title: 'Cakes and cookies',
        summary: 'Butter, sugar, and the texture they create.',
        lessons: [
          { title: 'Creaming butter and sugar', minutes: 14, description: 'Colour, aeration and how to know when it is ready.' },
          {
            title: 'Eggless vanilla sponge',
            minutes: 24,
            description: 'A dependable sponge for cakes and trifles, with the cues to look for.',
            recipe: {
              title: 'Eggless vanilla sponge',
              servings: 8,
              prepMinutes: 20,
              cookMinutes: 35,
              ingredients: [
                { item: 'All-purpose flour', quantity: '220 g' },
                { item: 'Curd, room temperature', quantity: '200 g' },
                { item: 'Sugar', quantity: '150 g' },
                { item: 'Oil', quantity: '100 ml' },
                { item: 'Baking powder', quantity: '1 tsp' },
                { item: 'Baking soda', quantity: '0.5 tsp' },
                { item: 'Vanilla extract', quantity: '1 tsp' },
                { item: 'Milk', quantity: '50 ml' },
              ],
              steps: [
                'Whisk curd, sugar, oil and vanilla until the sugar dissolves.',
                'Sift in the flour, baking powder, baking soda and a pinch of salt. Fold until just combined.',
                'Loosen with milk to a ribbon consistency, then pour into a lined tin.',
                'Bake at 180 C for 30 to 35 minutes, until a skewer comes out clean.',
                'Cool in the tin for 10 minutes, then turn out onto a rack.',
              ],
              tips: [
                'Do not overmix after adding flour; it makes the sponge rubbery.',
                'All ingredients at room temperature give a more even rise.',
              ],
            },
          },
          { title: 'Cookie texture, demystified', minutes: 18, description: 'Chewy, crisp or cakey — decided by two small changes.' },
          { title: 'Frosting without a stand mixer', minutes: 15, description: 'A smooth buttercream using a bowl and a whisk.' },
        ],
      },
      {
        title: 'Fixing what goes wrong',
        summary: 'The diagnostic section.',
        lessons: [
          { title: 'Dense cake? Dry bread?', minutes: 19, description: 'The ten most common faults and their actual causes.' },
          { title: 'Storing and freezing bakes', minutes: 12, description: 'Keeping bread crusty and cakes moist for longer.' },
          { title: 'Kitchen temperatures and your oven', minutes: 13, description: 'Testing your oven and adjusting for hot spots.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Pooja D.',
        rating: 5,
        context: 'Completed Baking Basics',
        body: 'My first loaf actually rose. The weighing lesson alone was worth it — I had been using almost 30 percent too much flour.',
      },
      {
        author: 'Karan V.',
        rating: 5,
        context: 'Completed Baking Basics',
        body: 'The troubleshooting section is unusually honest. It explains failures instead of hiding them.',
      },
      {
        author: 'Nisha A.',
        rating: 5,
        context: 'Watching Baking Basics',
        body: 'The eggless sponge is now my default cake recipe.',
      },
    ],
    isPopular: true,
    isBeginnerPick: true,
  },
  {
    id: 'south-indian-breakfasts',
    title: 'South Indian Breakfasts',
    promise: 'Consistent dosa, idli and chutneys — from batter to tawa.',
    description:
      'Fermentation explained in plain language, then the tawa skills that decide whether your dosa is crisp. Includes the chutneys, sambar and podis that complete a weekend breakfast.',
    cover: images.southIndian,
    video: 'home-cooking',
    categoryId: 'south-indian',
    level: 'Beginner',
    language: 'English + Hindi',
    priceInr: 899,
    rating: 4.6,
    reviewCount: 1430,
    outcomes: [
      'Ferment batter reliably in your own kitchen',
      'Pour a crisp dosa on the first try',
      'Steam soft, fluffy idlis',
      'Make coconut chutney and sambar from scratch',
      'Adjust batter for weather and season',
    ],
    equipment: ['A wet grinder or powerful blender', 'A cast-iron or non-stick tawa', 'An idli steamer', 'A ladle with a flat bottom'],
    audience: 'Anyone who loves a South Indian breakfast and wants to make it at home.',
    sections: [
      {
        title: 'Batter basics',
        summary: 'Fermentation you can actually control.',
        lessons: [
          {
            title: 'Fermenting dosa batter',
            minutes: 22,
            description: 'Ratio, grinding, temperature and the signs that batter is ready.',
            preview: true,
            recipe: {
              title: 'Crispy dosa batter',
              servings: 6,
              prepMinutes: 30,
              cookMinutes: 10,
              ingredients: [
                { item: 'Parboiled rice', quantity: '3 cups' },
                { item: 'Urad dal', quantity: '1 cup' },
                { item: 'Fenugreek seeds', quantity: '1 tsp' },
                { item: 'Salt', quantity: '1 tsp' },
                { item: 'Water', quantity: 'as needed' },
              ],
              steps: [
                'Rinse the rice and dal separately and soak for 5 hours with the fenugreek.',
                'Grind the dal first to a light, fluffy batter, then grind the rice to a fine rava texture.',
                'Combine both, add salt and mix with your hand for a minute to help fermentation.',
                'Rest in a warm spot for 8 to 10 hours until the batter rises and smells lightly sour.',
                'Refrigerate once fermented; bring to room temperature before making dosas.',
              ],
              tips: [
                'Cold weather slows fermentation — keep the batter in a closed oven with the light on.',
                'A thin dosa needs a thinner batter; adjust with water just before pouring.',
              ],
            },
          },
          { title: 'Grinding vs mixing', minutes: 14, description: 'How texture decides whether dosa crisps or turns leathery.' },
          { title: 'Reading the batter', minutes: 12, description: 'Smell, bubbles and volume — knowing when to stop waiting.' },
        ],
      },
      {
        title: 'On the tawa',
        summary: 'The cooking itself.',
        video: 'foundations',
        lessons: [
          { title: 'Crispy dosa, first try', minutes: 21, description: 'Tawa temperature, spreading, and the fat you use.' },
          { title: 'Soft idlis every time', minutes: 17, description: 'Steamer setup, plate depth and resting the batter.' },
          { title: 'Uttapam and adai', minutes: 15, description: 'Two thicker batters that use the same technique, differently.', preview: true },
        ],
      },
      {
        title: 'Chutneys and sides',
        summary: 'What makes the plate complete.',
        lessons: [
          { title: 'Coconut chutney, three ways', minutes: 13, description: 'With curd, with roasted gram, and with a tempering.' },
          { title: 'Sambar from scratch', minutes: 24, description: 'Dal, tamarind and the sambar powder ratio that holds.' },
          { title: 'Podis and instant sides', minutes: 12, description: 'Two dry chutneys to keep in the pantry.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Harish P.',
        rating: 5,
        context: 'Completed South Indian Breakfasts',
        body: 'My batter ferments properly now. The weather adjustment tip in lesson three was the missing piece.',
      },
      {
        author: 'Lakshmi S.',
        rating: 4,
        context: 'Watching South Indian Breakfasts',
        body: 'Very good for someone outside South India trying to get this right. Sambar lesson is excellent.',
      },
    ],
  },
  {
    id: 'restaurant-gravies',
    title: 'Restaurant-Style Gravies',
    promise: 'Four base gravies, and the technique to make any curry taste finished.',
    description:
      'Learn the base gravies that restaurant kitchens keep on hand, then the finishing techniques — bhunao, dhungar, cream and butter balance — that make a home curry taste like a restaurant plate.',
    cover: images.gravies,
    video: 'gravies',
    categoryId: 'north-indian',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 1799,
    listPriceInr: 2499,
    rating: 4.7,
    reviewCount: 612,
    outcomes: [
      'Make four base gravies you can reuse all week',
      'Cook bhunao without scorching the masala',
      'Balance cream, butter, cashew and spice',
      'Use dhungar smoking for a finishing aroma',
      'Plate butter chicken and paneer butter masala at home',
    ],
    equipment: ['A wide heavy pan or kadai', 'A blender that handles hot purées', 'A small vessel for smoking coal', 'A fine sieve'],
    audience: 'Cooks who are comfortable with basic curries and want restaurant depth and finish.',
    sections: [
      {
        title: 'The base gravies',
        summary: 'Build these once, use them all week.',
        lessons: [
          {
            title: 'Onion-tomato masala',
            minutes: 22,
            description: 'The workhorse base, cooked to the exact stage restaurants look for.',
            preview: true,
            recipe: {
              title: 'Onion-tomato masala base',
              servings: 4,
              prepMinutes: 15,
              cookMinutes: 35,
              ingredients: [
                { item: 'Onion, sliced', quantity: '500 g' },
                { item: 'Tomato, chopped', quantity: '500 g' },
                { item: 'Ginger-garlic paste', quantity: '2 tbsp' },
                { item: 'Whole spices', quantity: '1 tbsp' },
                { item: 'Red chilli powder', quantity: '1.5 tsp' },
                { item: 'Coriander powder', quantity: '2 tsp' },
                { item: 'Oil or ghee', quantity: '4 tbsp' },
                { item: 'Salt', quantity: 'to taste' },
              ],
              steps: [
                'Heat the fat, add whole spices, then the onion. Sauté until deep golden, not pale.',
                'Add ginger-garlic paste and cook until the raw smell goes.',
                'Add tomato and the powdered spices, and cook until the mixture pulls away from the pan.',
                'Cool, blend smooth, and strain if you want a silkier base.',
                'Return to the pan and bhunao until the fat separates at the edges.',
              ],
              tips: [
                'Golden onion is the flavour; pale onion is the shortcut that tastes flat.',
                'The base keeps for four days refrigerated and freezes well.',
              ],
            },
          },
          { title: 'Silky makhani base', minutes: 20, description: 'Tomato, butter, cashew and the ratio that keeps it from splitting.' },
          { title: 'White gravy for korma', minutes: 18, description: 'Cashew, curd and melon seeds, handled so nothing curdles.' },
        ],
      },
      {
        title: 'Techniques that change texture',
        summary: 'The restaurant habits.',
        lessons: [
          { title: 'Bhunao: cooking the masala down', minutes: 16, description: 'Heat control and the visual cue that the masala is ready.' },
          { title: 'Cashew and cream, balanced', minutes: 14, description: 'Richness without heaviness, and how much is enough.' },
          { title: 'Smoking and finishing (dhungar)', minutes: 13, description: 'A safe method and how long to keep the lid on.', preview: true },
        ],
      },
      {
        title: 'The restaurant plates',
        summary: 'Assembling full dishes from your bases.',
        lessons: [
          { title: 'Butter chicken at home', minutes: 26, description: 'Marinated chicken, makhani base, and the final tempering.' },
          { title: 'Paneer butter masala', minutes: 20, description: 'Same base, different balance, and how to keep paneer soft.' },
          { title: 'Dal makhani, slow and steady', minutes: 28, description: 'Overnight cooking, finishing with butter and cream.' },
          { title: 'Plating and portioning', minutes: 12, description: 'Portion size, garnish and serving temperature.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Aditya N.',
        rating: 5,
        context: 'Completed Restaurant-Style Gravies',
        body: 'The bhunao lesson fixed my curries. I was always stopping too early and blaming the recipe.',
      },
      {
        author: 'Zoya H.',
        rating: 4,
        context: 'Watching Restaurant-Style Gravies',
        body: 'Rich food, clearly taught. I make the makhani base monthly and freeze it.',
      },
    ],
    isPopular: true,
  },
  {
    id: 'healthy-weeknight',
    title: 'Healthy Weeknight Meals',
    promise: 'Balanced dinners in about twenty minutes, built from Indian staples.',
    description:
      'A practical course for busy weeks: a pantry that supports quick cooking, one-pan plates, and lighter versions of the dishes your family already likes.',
    cover: images.healthyWeeknight,
    video: 'home-cooking',
    categoryId: 'healthy',
    level: 'Beginner',
    language: 'English',
    priceInr: 799,
    listPriceInr: 1099,
    rating: 4.5,
    reviewCount: 938,
    outcomes: [
      'Stock a pantry that makes fast cooking possible',
      'Build a balanced plate without measuring every meal',
      'Cook three 20-minute dinners reliably',
      'Prep a week of components in one hour',
      'Lighten familiar dishes without losing flavour',
    ],
    equipment: ['A wide sauté pan', 'A small blender', 'Containers for prepped components', 'A kitchen scale (optional)'],
    audience: 'Working professionals and families who want quick, balanced weeknight food.',
    sections: [
      {
        title: 'Fast foundations',
        summary: 'What makes speed possible.',
        lessons: [
          { title: 'A weeknight pantry', minutes: 12, description: 'The ten things that turn any vegetable into dinner.', preview: true },
          { title: 'One-pan cooking rules', minutes: 14, description: 'Order of adding, pan size, and why crowding ruins texture.' },
          { title: 'Protein without fuss', minutes: 13, description: 'Paneer, eggs, dal and legumes, cooked quickly.' },
        ],
      },
      {
        title: '20-minute plates',
        summary: 'Dinners you will repeat.',
        lessons: [
          {
            title: 'Paneer and quinoa bowl',
            minutes: 18,
            description: 'A balanced bowl with a quick dressing and toasted seeds.',
            preview: true,
            recipe: {
              title: 'Paneer and quinoa bowl',
              servings: 2,
              prepMinutes: 10,
              cookMinutes: 15,
              ingredients: [
                { item: 'Quinoa, rinsed', quantity: '1 cup' },
                { item: 'Paneer, cubed', quantity: '200 g' },
                { item: 'Mixed vegetables', quantity: '2 cups' },
                { item: 'Curd', quantity: '0.5 cup' },
                { item: 'Lemon juice', quantity: '1 tbsp' },
                { item: 'Roasted seeds', quantity: '2 tbsp' },
                { item: 'Olive oil', quantity: '1 tbsp' },
                { item: 'Chilli flakes and salt', quantity: 'to taste' },
              ],
              steps: [
                'Cook quinoa in twice its volume of water until the grains open, then fluff.',
                'Sear the paneer in a little oil until golden on two sides, and set aside.',
                'Sauté the vegetables in the same pan until just tender.',
                'Whisk curd, lemon, chilli flakes and salt into a dressing.',
                'Assemble quinoa, vegetables and paneer, spoon over the dressing and finish with seeds.',
              ],
              tips: ['Cook quinoa in advance and refrigerate for a faster assembly.', 'Searing paneer in a hot pan keeps it soft inside.'],
            },
          },
          { title: 'Millet khichdi', minutes: 20, description: 'A one-pot dinner with millets, dal and seasonal vegetables.' },
          { title: 'Stir-fried greens and egg', minutes: 14, description: 'A five-minute plate when you have run out of time.', preview: true },
        ],
      },
      {
        title: 'Prep and plan',
        summary: 'Making the week easier.',
        lessons: [
          { title: 'Sunday prep in an hour', minutes: 22, description: 'A realistic sequence that actually saves time.' },
          { title: 'Lunchbox-friendly meals', minutes: 15, description: 'Food that travels and reheats well.' },
          { title: 'Lightening up family favourites', minutes: 17, description: 'Reducing oil and cream without flattening the taste.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Ritika J.',
        rating: 5,
        context: 'Completed Healthy Weeknight Meals',
        body: 'The prep lesson is the reason I stopped ordering dinner on weekdays.',
      },
      {
        author: 'Sameer G.',
        rating: 4,
        context: 'Watching Healthy Weeknight Meals',
        body: 'Simple and honest cooking. The quinoa bowl is now a regular at home.',
      },
    ],
    isBeginnerPick: true,
  },
  {
    id: 'eggless-desserts',
    title: 'Eggless Desserts',
    promise: 'Mousse, baked yoghurt and celebration cakes — without eggs, without compromise.',
    description:
      'Eggless baking treated as its own craft. Learn what eggs do in a recipe, what replaces them convincingly, and how to plate desserts that look like they came from a restaurant.',
    cover: images.egglessDesserts,
    video: 'baking',
    categoryId: 'desserts',
    level: 'Intermediate',
    language: 'English + Hindi',
    priceInr: 2299,
    listPriceInr: 3199,
    rating: 4.8,
    reviewCount: 703,
    outcomes: [
      'Understand what eggs do and choose the right replacement',
      'Make a set chocolate mousse without gelatin or eggs',
      'Bake a celebration chocolate cake that holds its crumb',
      'Cook custard without curdling',
      'Plate desserts with restraint and clean edges',
    ],
    equipment: ['A hand or stand mixer', 'A digital scale', 'A whisk and heatproof bowls', 'A few small ramekins'],
    audience: 'Home bakers who cook eggless for family or festivals and want professional results.',
    sections: [
      {
        title: 'Eggless, explained',
        summary: 'The why, before the recipes.',
        lessons: [
          { title: 'What eggs do and what replaces them', minutes: 16, description: 'Binding, aeration and moisture — matched to curd, flax and aquafaba.', preview: true },
          { title: 'Measuring for eggless bakes', minutes: 13, description: 'Why eggless recipes are less forgiving about proportions.' },
          { title: 'Chocolate, chosen well', minutes: 14, description: 'Couverture, compound and cocoa, and what each is good for.' },
        ],
      },
      {
        title: 'Plated desserts',
        summary: 'Cold desserts and custards.',
        lessons: [
          {
            title: 'Eggless chocolate mousse',
            minutes: 22,
            description: 'A set mousse with three ingredients and a stable texture.',
            preview: true,
            recipe: {
              title: 'Eggless chocolate mousse',
              servings: 4,
              prepMinutes: 20,
              cookMinutes: 5,
              ingredients: [
                { item: 'Dark chocolate, chopped', quantity: '200 g' },
                { item: 'Whipping cream, cold', quantity: '300 ml' },
                { item: 'Icing sugar', quantity: '2 tbsp' },
                { item: 'Vanilla extract', quantity: '0.5 tsp' },
                { item: 'Sea salt', quantity: '1 pinch' },
              ],
              steps: [
                'Melt the chocolate over a water bath and cool until just warm to the touch.',
                'Whip 200 ml of the cream with icing sugar and vanilla to soft peaks.',
                'Fold a third of the cream into the chocolate to loosen it, then fold in the rest gently.',
                'Spoon into ramekins and refrigerate for at least 4 hours.',
                'Finish with the remaining cream, whipped, and a pinch of sea salt.',
              ],
              tips: [
                'If the melted chocolate is hot, it will seize the cream. Let it cool first.',
                'Fold in one direction with a spatula to keep the air in.',
              ],
            },
          },
          { title: 'Baked yoghurt with fruit', minutes: 18, description: 'A three-ingredient dessert that looks far more complicated.' },
          { title: 'Custard, without curdling', minutes: 17, description: 'Temperature control and a reliable thickening ratio.' },
        ],
      },
      {
        title: 'Cakes and celebration',
        summary: 'For birthdays and festivals.',
        lessons: [
          {
            title: 'Eggless chocolate cake',
            minutes: 25,
            description: 'A celebration cake with a tight, moist crumb.',
            recipe: {
              title: 'Eggless chocolate celebration cake',
              servings: 10,
              prepMinutes: 25,
              cookMinutes: 40,
              ingredients: [
                { item: 'All-purpose flour', quantity: '240 g' },
                { item: 'Cocoa powder', quantity: '40 g' },
                { item: 'Sugar', quantity: '220 g' },
                { item: 'Curd', quantity: '240 g' },
                { item: 'Oil', quantity: '120 ml' },
                { item: 'Milk, warm', quantity: '120 ml' },
                { item: 'Baking powder', quantity: '1.5 tsp' },
                { item: 'Baking soda', quantity: '0.5 tsp' },
                { item: 'Instant coffee', quantity: '1 tsp' },
              ],
              steps: [
                'Whisk curd, sugar, oil and coffee dissolved in warm milk.',
                'Sift in flour, cocoa, baking powder, baking soda and salt; fold to a smooth batter.',
                'Pour into two lined 6-inch tins and bake at 175 C for 30 to 35 minutes.',
                'Cool completely, then fill and crumb-coat with your frosting of choice.',
              ],
              tips: ['Weigh the batter between tins for level layers.', 'Chill before the final coat so the frosting sets clean.'],
            },
          },
          { title: 'Frosting and finish', minutes: 19, description: 'A smooth buttercream and a clean crumb coat.' },
          { title: 'Desserts for festivals', minutes: 20, description: 'Mithai-inspired plating using the same core techniques.' },
          { title: 'Plating for a dinner table', minutes: 15, description: 'Portioning, garnish and serving temperature.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Tanvi S.',
        rating: 5,
        context: 'Completed Eggless Desserts',
        body: 'The mousse is foolproof if you follow the cooling step. Made it three times for guests.',
      },
      {
        author: 'Manav R.',
        rating: 5,
        context: 'Completed Eggless Desserts',
        body: 'I finally understand why my eggless cakes were dense. The measuring lesson explains it.',
      },
    ],
    isPopular: true,
  },
  {
    id: 'knife-skills',
    title: 'Knife Skills & Kitchen Foundations',
    promise: 'Cut faster, cut safer, and set up a kitchen that works with you.',
    description:
      'A short, dense course on the fundamentals: your knife, your board, your grip, and the handful of cuts that cover almost everything you cook. Ends with heat control and mise en place.',
    cover: images.knifeSkills,
    video: 'foundations',
    categoryId: 'foundations',
    level: 'Beginner',
    language: 'English',
    priceInr: 599,
    rating: 4.9,
    reviewCount: 1102,
    outcomes: [
      'Choose and maintain your first proper knife',
      'Hold a knife and guide with a claw grip safely',
      'Cut onion, dice vegetables and chop herbs evenly',
      'Set up a board and station that keeps you organised',
      'Control pan heat instead of guessing',
    ],
    equipment: ['A chef knife (20 cm is a good start)', 'A honing rod', 'A sturdy cutting board', 'A bench scraper'],
    audience: 'Anyone who finds prep slow, uneven or slightly unsafe.',
    sections: [
      {
        title: 'Your tools',
        summary: 'Before you cut anything.',
        lessons: [
          { title: 'Choosing your first knife', minutes: 14, description: 'Blade length, steel and what actually matters at home.', preview: true },
          { title: 'Sharpening and honing', minutes: 16, description: 'The difference between the two, and a weekly routine.' },
          { title: 'Grip, board and posture', minutes: 12, description: 'Pinch grip, claw guide and a board height that suits you.', preview: true },
        ],
      },
      {
        title: 'Cuts that matter',
        summary: 'Four cuts, most of your cooking.',
        lessons: [
          { title: 'Onion, three ways', minutes: 18, description: 'Slicing, dicing and the vertical cut that avoids tears.' },
          { title: 'Julienne, dice and brunoise', minutes: 20, description: 'Even sizes and why consistency changes cooking time.' },
          { title: 'Herbs, garlic and ginger', minutes: 14, description: 'Clean chopping for aromatics without bruising them.' },
          { title: 'Prepping vegetables for a week', minutes: 17, description: 'What keeps well, what does not, and how to store it.' },
        ],
      },
      {
        title: 'Working clean',
        summary: 'The habits of a fast kitchen.',
        lessons: [
          { title: 'Mise en place', minutes: 13, description: 'Setting up so cooking becomes assembly.' },
          { title: 'Heat, pans and timing', minutes: 19, description: 'Reading a pan, and why preheating changes everything.' },
          { title: 'Cleaning and storing your kit', minutes: 11, description: 'Looking after knives and boards so they last.' },
        ],
      },
    ],
    reviews: [
      {
        author: 'Ishaan M.',
        rating: 5,
        context: 'Completed Knife Skills & Kitchen Foundations',
        body: 'Cheapest course I have bought and the most useful. My prep time is roughly halved.',
      },
      {
        author: 'Preeti L.',
        rating: 5,
        context: 'Completed Knife Skills & Kitchen Foundations',
        body: 'The claw grip lesson made me feel safe with a knife for the first time.',
      },
    ],
    isBeginnerPick: true,
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
