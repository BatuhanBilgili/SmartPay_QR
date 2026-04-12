/**
 * Mock data for development — will be replaced with API calls when DB is connected
 */

export interface MockMenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  category: string;
  preparationTime: number;
  badge?: string;
  variant?: 'featured' | 'horizontal' | 'compact' | 'accent' | 'dark';
}

export interface MockCategory {
  id: string;
  name: string;
  emoji: string;
}

export const RESTAURANT = {
  id: 'mock-restaurant-1',
  name: 'Lezzet Durağı',
  slug: 'lezzet-duragi',
  description: 'Geleneksel Türk mutfağının modern yorumu',
  tableNumber: 2,
  tableLabel: 'İç Mekan 2',
};

export const CATEGORIES: MockCategory[] = [
  { id: 'cat-1', name: 'Başlangıçlar', emoji: '🥗' },
  { id: 'cat-2', name: 'Ana Yemekler', emoji: '🥩' },
  { id: 'cat-3', name: 'Pizzalar', emoji: '🍕' },
  { id: 'cat-4', name: 'Burgerler', emoji: '🍔' },
  { id: 'cat-5', name: 'Makarnalar', emoji: '🍝' },
  { id: 'cat-6', name: 'Tatlılar', emoji: '🍰' },
  { id: 'cat-7', name: 'İçecekler', emoji: '🥤' },
  { id: 'cat-8', name: 'Sıcak İçecekler', emoji: '☕' },
];

export const MENU_ITEMS: MockMenuItem[] = [
  // Başlangıçlar
  {
    id: 'item-1',
    name: 'Mevsim Salatası',
    description: 'Taze mevsim yeşillikleri, cherry domates, salatalık, havuç, nar ekşili sos',
    price: 85,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-1',
    preparationTime: 8,
    variant: 'horizontal',
  },
  {
    id: 'item-2',
    name: 'Mercimek Çorbası',
    description: 'Geleneksel kırmızı mercimek çorbası, limon ve kruton eşliğinde',
    price: 65,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-1',
    preparationTime: 5,
    variant: 'featured',
    badge: 'Popüler',
  },
  {
    id: 'item-3',
    name: 'Humus Tabağı',
    description: 'Ev yapımı humus, zeytinyağı, paprika, sıcak pide ile servis',
    price: 95,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-1',
    preparationTime: 7,
    variant: 'compact',
  },
  {
    id: 'item-4',
    name: 'Sigara Böreği',
    description: 'Çıtır yufka içinde beyaz peynir ve maydanoz (4 adet)',
    price: 90,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-1',
    preparationTime: 10,
    variant: 'accent',
  },
  {
    id: 'item-5',
    name: 'Patates Kızartması',
    description: 'Çıtır patates kızartması, özel baharat karışımı',
    price: 70,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-1',
    preparationTime: 8,
    variant: 'compact',
  },

  // Ana Yemekler
  {
    id: 'item-6',
    name: 'Izgara Köfte',
    description: 'El yapımı dana köfte (200g), pilav, közlenmiş biber ve domates',
    price: 195,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-2',
    preparationTime: 20,
    variant: 'featured',
    badge: 'Şef Önerisi',
  },
  {
    id: 'item-7',
    name: 'Tavuk Şiş',
    description: 'Marine edilmiş tavuk göğsü şiş, bulgur pilavı ve yeşillik',
    price: 175,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-2',
    preparationTime: 18,
    variant: 'horizontal',
  },
  {
    id: 'item-8',
    name: 'Adana Kebap',
    description: 'Acılı el kıyması kebap, lavaş, közlenmiş sebze garnitür',
    price: 220,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-2',
    preparationTime: 22,
    variant: 'accent',
  },
  {
    id: 'item-9',
    name: 'Fırın Somon',
    description: 'Tereyağlı fırın somon fileto (250g), sebze sote ve patates püresi',
    price: 285,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-2',
    preparationTime: 25,
    variant: 'horizontal',
  },
  {
    id: 'item-10',
    name: 'Karışık Izgara',
    description: 'Kuzu pirzola, tavuk kanat, köfte, Adana — 2 kişilik',
    price: 450,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-2',
    preparationTime: 30,
    variant: 'featured',
    badge: 'En Çok Satan',
  },

  // Pizzalar
  {
    id: 'item-11',
    name: 'Margarita',
    description: 'Domates sos, mozzarella, taze fesleğen',
    price: 155,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-3',
    preparationTime: 15,
    variant: 'featured',
  },
  {
    id: 'item-12',
    name: 'Karışık Pizza',
    description: 'Sucuk, mantar, biber, zeytin, mozzarella',
    price: 185,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-3',
    preparationTime: 15,
    variant: 'horizontal',
  },
  {
    id: 'item-13',
    name: 'Pepperoni',
    description: 'Bol pepperoni, mozzarella, domates sosu',
    price: 175,
    image: '/images/menu/sigara-boregi.png',
    category: 'cat-3',
    preparationTime: 15,
    variant: 'accent',
  },

  // Burgerler
  {
    id: 'item-14',
    name: 'Klasik Burger',
    description: '180g dana burger, marul, domates, turşu, cheddar, patates kızartması',
    price: 195,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-4',
    preparationTime: 15,
    variant: 'featured',
  },
  {
    id: 'item-15',
    name: 'Smash Burger',
    description: 'Double smash patty, karamelize soğan, özel sos, cheddar',
    price: 220,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-4',
    preparationTime: 12,
    variant: 'accent',
    badge: 'Yeni',
  },
  {
    id: 'item-16',
    name: 'Tavuk Burger',
    description: 'Çıtır tavuk, coleslaw, ranch sos, patates kızartması',
    price: 185,
    image: '/images/menu/hero-mixed-grill.png',
    category: 'cat-4',
    preparationTime: 14,
    variant: 'horizontal',
  },

  // Makarnalar
  {
    id: 'item-17',
    name: 'Penne Arabiata',
    description: 'Acılı domates soslu penne, parmesan',
    price: 145,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-5',
    preparationTime: 12,
    variant: 'horizontal',
  },
  {
    id: 'item-18',
    name: 'Fettuccine Alfredo',
    description: 'Kremalı parmesan sos, tavuk parçaları',
    price: 165,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-5',
    preparationTime: 14,
    variant: 'featured',
  },
  {
    id: 'item-19',
    name: 'Spaghetti Bolognese',
    description: 'Kıymalı domates sos, parmesan rendesi',
    price: 155,
    image: '/images/menu/mercimek-soup.png',
    category: 'cat-5',
    preparationTime: 14,
    variant: 'accent',
  },

  // Tatlılar
  {
    id: 'item-20',
    name: 'Künefe',
    description: 'Sıcak servis künefe, antep fıstığı, kaymak',
    price: 120,
    image: '/images/menu/kunefe-dessert.png',
    category: 'cat-6',
    preparationTime: 15,
    variant: 'featured',
    badge: 'Özel',
  },
  {
    id: 'item-21',
    name: 'Cheesecake',
    description: 'New York usulü cheesecake, orman meyvesi sos',
    price: 110,
    image: '/images/menu/kunefe-dessert.png',
    category: 'cat-6',
    preparationTime: 3,
    variant: 'horizontal',
  },
  {
    id: 'item-22',
    name: 'Sütlaç',
    description: 'Fırın sütlaç, tarçın',
    price: 75,
    image: '/images/menu/kunefe-dessert.png',
    category: 'cat-6',
    preparationTime: 3,
    variant: 'compact',
  },
  {
    id: 'item-23',
    name: 'Brownie & Dondurma',
    description: 'Sıcak çikolatalı brownie, vanilya dondurma, çikolata sos',
    price: 115,
    image: '/images/menu/kunefe-dessert.png',
    category: 'cat-6',
    preparationTime: 8,
    variant: 'accent',
  },

  // İçecekler - these use grid layout
  {
    id: 'item-24',
    name: 'Coca Cola',
    description: '330ml',
    price: 45,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 1,
  },
  {
    id: 'item-25',
    name: 'Fanta',
    description: '330ml',
    price: 45,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 1,
  },
  {
    id: 'item-26',
    name: 'Ayran',
    description: 'Ev yapımı ayran',
    price: 35,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 1,
  },
  {
    id: 'item-27',
    name: 'Taze Limonata',
    description: 'Taze sıkılmış limonata, nane',
    price: 55,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 3,
  },
  {
    id: 'item-28',
    name: 'Ice Tea Şeftali',
    description: '330ml',
    price: 45,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 1,
  },
  {
    id: 'item-29',
    name: 'Su',
    description: '500ml',
    price: 15,
    image: '/images/menu/lemonade.png',
    category: 'cat-7',
    preparationTime: 1,
  },

  // Sıcak İçecekler
  {
    id: 'item-30',
    name: 'Türk Kahvesi',
    description: 'Geleneksel Türk kahvesi, lokum ikramı',
    price: 50,
    image: '/images/menu/turkish-coffee.png',
    category: 'cat-8',
    preparationTime: 5,
  },
  {
    id: 'item-31',
    name: 'Filtre Kahve',
    description: 'Taze çekilmiş filtre kahve',
    price: 55,
    image: '/images/menu/turkish-coffee.png',
    category: 'cat-8',
    preparationTime: 4,
  },
  {
    id: 'item-32',
    name: 'Latte',
    description: 'Espresso, buharda süt',
    price: 65,
    image: '/images/menu/turkish-coffee.png',
    category: 'cat-8',
    preparationTime: 4,
  },
  {
    id: 'item-33',
    name: 'Cappuccino',
    description: 'Espresso, köpüklü süt, kakao tozu',
    price: 65,
    image: '/images/menu/turkish-coffee.png',
    category: 'cat-8',
    preparationTime: 4,
  },
  {
    id: 'item-34',
    name: 'Çay',
    description: 'Demlik çay, ince belli bardak',
    price: 20,
    image: '/images/menu/turkish-coffee.png',
    category: 'cat-8',
    preparationTime: 3,
  },
];

export const FEATURED_ITEM = MENU_ITEMS.find(item => item.id === 'item-10')!; // Karışık Izgara
