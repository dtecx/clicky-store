export type DemoProduct = {
  category: string
  description: string
  dpi: string
  imageUrl: string
  name: string
  price: string
  slug: string
  stock: string
  traits: string[]
}

export const demoProducts: DemoProduct[] = [
  {
    category: 'Gaming',
    description:
      'A lightweight wired mouse with a precise sensor, crisp switches, and low-lift glide for competitive play.',
    dpi: '26K DPI',
    imageUrl: '/assets/products/viper-x1.svg',
    name: 'Viper X1 Gaming Mouse',
    price: '$79.00',
    slug: 'viper-x1-gaming-mouse',
    stock: 'In stock',
    traits: ['62 g', 'Wired', 'RGB'],
  },
  {
    category: 'Office',
    description:
      'A quiet everyday mouse shaped for long desk sessions, shared offices, and steady productivity.',
    dpi: '8K DPI',
    imageUrl: '/assets/products/quietdesk-m2.svg',
    name: 'QuietDesk M2',
    price: '$49.00',
    slug: 'quietdesk-m2',
    stock: 'In stock',
    traits: ['Silent clicks', 'Wireless', 'Ergonomic'],
  },
  {
    category: 'Travel',
    description:
      'A compact rechargeable mouse with reliable tracking and a slim profile for commuting.',
    dpi: '6K DPI',
    imageUrl: '/assets/products/travelclick.svg',
    name: 'TravelClick Mini',
    price: '$39.00',
    slug: 'travelclick-mini',
    stock: 'Limited',
    traits: ['Bluetooth', 'Portable', 'Rechargeable'],
  },
]
