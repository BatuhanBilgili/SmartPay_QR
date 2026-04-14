import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { tables, categories, menuItems } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import TableClient, { type MenuItem, type Category, type TableData, type RestaurantData } from './TableClient';

export default async function MenuPage() {
  // 1. Read cookie
  const cookieStore = await cookies();
  const tableCookie = cookieStore.get('smartpay_table');
  
  if (!tableCookie?.value) {
    redirect('/');
  }

  let cookieData: any;
  try {
    cookieData = JSON.parse(tableCookie.value);
  } catch {
    redirect('/');
  }

  const { tableId, tableNumber, tableLabel, restaurantId, sessionId, restaurantName } = cookieData;

  if (!tableId || !sessionId) {
    redirect('/');
  }

  // 2. Read participant cookie (may not exist yet)
  const participantCookie = cookieStore.get('smartpay_participant');
  let participantId: string | null = null;
  let participantName: string | null = null;
  let participantEmoji: string | null = null;
  
  if (participantCookie?.value) {
    try {
      const pData = JSON.parse(participantCookie.value);
      participantId = pData.participantId || null;
      participantName = pData.displayName || null;
      participantEmoji = pData.avatarEmoji || null;
    } catch {}
  }

  // 3. Fetch restaurant menu data from DB
  const table = await db.query.tables.findFirst({
    where: eq(tables.id, tableId),
    with: {
      restaurant: {
        with: {
          categories: {
            where: eq(categories.isActive, true),
            orderBy: (cats, { asc }) => [asc(cats.sortOrder)],
            with: {
              menuItems: {
                where: eq(menuItems.isAvailable, true),
                orderBy: (items, { asc }) => [asc(items.sortOrder)],
              },
            },
          },
        },
      },
    },
  });

  if (!table) {
    redirect('/');
  }

  // 4. Data mapping
  const mappedTable: TableData = {
    id: table.id,
    tableNumber: table.tableNumber,
    label: table.label,
    status: table.status,
  };

  const mappedRestaurant: RestaurantData = {
    id: table.restaurant.id,
    name: table.restaurant.name,
    slug: table.restaurant.slug,
    description: table.restaurant.description,
  };

  const mappedCategories: Category[] = table.restaurant.categories.map((c: any) => ({
    id: c.id,
    name: c.name,
    emoji: c.iconEmoji || '🍽️',
  }));

  let featuredItem: MenuItem | null = null;
  
  const fallbackImages = [
    '/images/menu/hero-mixed-grill.png',
    '/images/menu/mercimek-soup.png',
    '/images/menu/sigara-boregi.png',
    '/images/menu/kunefe-dessert.png',
  ];

  const mappedMenuItems: MenuItem[] = table.restaurant.categories.flatMap((c: any) => 
    c.menuItems.map((m: any, index: number) => {
      let variant: MenuItem['variant'] = 'horizontal';
      if (index === 0 && !featuredItem) {
        variant = 'featured';
      } else if (index % 4 === 0) {
        variant = 'accent';
      } else if (index % 3 === 0) {
        variant = 'compact';
      }

      const imageIndex = m.id.length % fallbackImages.length;
      
      const mappedItem: MenuItem = {
        id: m.id,
        name: m.name,
        description: m.description,
        price: parseFloat(m.price),
        image: m.imageUrl || fallbackImages[imageIndex],
        category: c.id,
        preparationTime: m.preparationTime,
        badge: index === 0 ? 'Özel' : null,
        variant,
      };

      if (variant === 'featured' && !featuredItem) {
        featuredItem = mappedItem;
      }

      return mappedItem;
    })
  );

  if (!featuredItem && mappedMenuItems.length > 0) {
    featuredItem = mappedMenuItems[0];
  }

  return (
    <TableClient 
      restaurant={mappedRestaurant}
      table={mappedTable}
      tableId={tableId}
      sessionId={sessionId}
      categories={mappedCategories}
      menuItems={mappedMenuItems}
      featuredItem={featuredItem}
      initialParticipantId={participantId}
      initialParticipantName={participantName}
      initialParticipantEmoji={participantEmoji}
    />
  );
}
