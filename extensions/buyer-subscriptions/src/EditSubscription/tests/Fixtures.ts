import type {EditProduct, SubscriptionEditData} from '../types';

export const PLAN_4_WEEKS = 'gid://shopify/SellingPlan/4';
export const PLAN_6_WEEKS = 'gid://shopify/SellingPlan/6';

function variant(
  id: string,
  shape: string,
  {availableForSale = true, price = '57.00'} = {},
) {
  return {
    id,
    title: shape,
    price,
    availableForSale,
    selectedOptions: [{name: 'Shape', value: shape}],
    imageUrl: null,
  };
}

function product(
  id: string,
  title: string,
  variants: EditProduct['variants'],
): EditProduct {
  return {
    id,
    title,
    imageUrl: `https://cdn.example.com/${id.split('/').pop()}.png`,
    options: [{name: 'Shape', values: ['Round', 'Symmetrical']}],
    variants,
  };
}

export const PAPAYA = product('gid://shopify/Product/1', 'Colour - Papaya', [
  variant('gid://shopify/ProductVariant/11', 'Round'),
  variant('gid://shopify/ProductVariant/12', 'Symmetrical'),
]);

export const LAVENDER = product(
  'gid://shopify/Product/2',
  'Colour - Lavender',
  [
    variant('gid://shopify/ProductVariant/21', 'Round'),
    variant('gid://shopify/ProductVariant/22', 'Symmetrical', {
      availableForSale: false,
    }),
  ],
);

export const APRICOT = product('gid://shopify/Product/3', 'Colour - Apricot', [
  variant('gid://shopify/ProductVariant/31', 'Symmetrical'),
  variant('gid://shopify/ProductVariant/32', 'Round', {price: '60.00'}),
]);

export function createEditData(
  overrides: Partial<SubscriptionEditData> = {},
): SubscriptionEditData {
  return {
    contract: {
      id: 'gid://shopify/SubscriptionContract/10',
      status: 'ACTIVE',
      currencyCode: 'DKK',
      sellingPlanId: PLAN_4_WEEKS,
    },
    minQuantity: 3,
    maxQuantity: 10,
    sellingPlans: [
      {
        id: PLAN_4_WEEKS,
        name: 'Deliver every 4 weeks, 20% off',
        deliveryInterval: 'WEEK',
        deliveryIntervalCount: 4,
        adjustment: {type: 'PERCENTAGE', value: 20},
      },
      {
        id: PLAN_6_WEEKS,
        name: 'Deliver every 6 weeks, 15% off',
        deliveryInterval: 'WEEK',
        deliveryIntervalCount: 6,
        adjustment: {type: 'PERCENTAGE', value: 15},
      },
    ],
    lines: [
      {
        id: 'gid://shopify/SubscriptionLine/1',
        productId: PAPAYA.id,
        variantId: 'gid://shopify/ProductVariant/11',
        quantity: 1,
        title: 'Colour - Papaya',
        variantTitle: 'Round',
        imageUrl: null,
        unitPrice: '40.00',
        basePrice: '50.00',
      },
      {
        id: 'gid://shopify/SubscriptionLine/2',
        productId: LAVENDER.id,
        variantId: 'gid://shopify/ProductVariant/21',
        quantity: 2,
        title: 'Colour - Lavender',
        variantTitle: 'Round',
        imageUrl: null,
        unitPrice: '40.00',
        basePrice: '50.00',
      },
    ],
    products: [PAPAYA, LAVENDER, APRICOT],
    ...overrides,
  };
}
