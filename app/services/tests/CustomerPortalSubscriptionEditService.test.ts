import {
  MIN_SUBSCRIPTION_QUANTITY,
  applyAdjustment,
  buildLinePricing,
  hasOperations,
  planEdit,
  type EditContext,
  type EditSellingPlan,
} from '../CustomerPortalSubscriptionEditService';

const PLAN_4_WEEKS: EditSellingPlan = {
  id: 'gid://shopify/SellingPlan/4',
  name: 'Deliver every 4 weeks, 20% off',
  deliveryInterval: 'WEEK' as EditSellingPlan['deliveryInterval'],
  deliveryIntervalCount: 4,
  billingPolicy: {
    interval: 'WEEK' as EditSellingPlan['deliveryInterval'],
    intervalCount: 4,
  },
  adjustment: {type: 'PERCENTAGE', value: 20},
};

const PLAN_6_WEEKS: EditSellingPlan = {
  ...PLAN_4_WEEKS,
  id: 'gid://shopify/SellingPlan/6',
  name: 'Deliver every 6 weeks, 15% off',
  deliveryIntervalCount: 6,
  billingPolicy: {...PLAN_4_WEEKS.billingPolicy, intervalCount: 6},
  adjustment: {type: 'PERCENTAGE', value: 15},
};

function variant(id: string, price: string, availableForSale = true) {
  return {
    id: `gid://shopify/ProductVariant/${id}`,
    title: `Variant ${id}`,
    price,
    availableForSale,
    selectedOptions: [{name: 'Size', value: id}],
    imageUrl: null,
  };
}

function context(overrides: Partial<EditContext> = {}): EditContext {
  return {
    contractId: 'gid://shopify/SubscriptionContract/10',
    status: 'ACTIVE',
    currencyCode: 'DKK',
    sellingPlanId: PLAN_4_WEEKS.id,
    sellingPlans: [PLAN_4_WEEKS, PLAN_6_WEEKS],
    products: [
      {
        id: 'gid://shopify/Product/papaya',
        title: 'Colour - Papaya',
        imageUrl: null,
        options: [{name: 'Size', values: ['1', '2']}],
        variants: [variant('1', '57.00'), variant('2', '60.00')],
      },
      {
        id: 'gid://shopify/Product/lavender',
        title: 'Colour - Lavender',
        imageUrl: null,
        options: [{name: 'Size', values: ['3', '4']}],
        variants: [variant('3', '57.00'), variant('4', '57.00', false)],
      },
    ],
    lines: [
      {
        id: 'gid://shopify/SubscriptionLine/a',
        productId: 'gid://shopify/Product/papaya',
        variantId: 'gid://shopify/ProductVariant/1',
        quantity: 1,
        title: 'Colour - Papaya',
        variantTitle: null,
        imageUrl: null,
        unitPrice: '45.6',
        basePrice: '50.00',
      },
      {
        id: 'gid://shopify/SubscriptionLine/b',
        productId: 'gid://shopify/Product/lavender',
        variantId: 'gid://shopify/ProductVariant/3',
        quantity: 2,
        title: 'Colour - Lavender',
        variantTitle: null,
        imageUrl: null,
        unitPrice: '45.6',
        basePrice: '57.00',
      },
    ],
    ...overrides,
  };
}

const LINE_A = 'gid://shopify/SubscriptionLine/a';
const LINE_B = 'gid://shopify/SubscriptionLine/b';
const unchangedLines = [
  {id: LINE_A, variantId: 'gid://shopify/ProductVariant/1', quantity: 1},
  {id: LINE_B, variantId: 'gid://shopify/ProductVariant/3', quantity: 2},
];

describe('applyAdjustment', () => {
  it.each([
    [{type: 'PERCENTAGE', value: 20}, 57, 45.6],
    [{type: 'PERCENTAGE', value: 15}, 57, 48.45],
    [{type: 'PERCENTAGE', value: 33}, 10, 6.7],
    [{type: 'FIXED_AMOUNT', value: 5}, 57, 52],
    [{type: 'FIXED_AMOUNT', value: 100}, 57, 0],
    [{type: 'PRICE', value: 40}, 57, 40],
    [null, 57.004, 57],
  ] as const)('applies %o to %d', (adjustment, price, expected) => {
    expect(applyAdjustment(price, adjustment)).toBe(expected);
  });
});

describe('buildLinePricing', () => {
  it('builds a pricing policy with the plan discount', () => {
    expect(buildLinePricing(57, PLAN_4_WEEKS)).toEqual({
      currentPrice: 45.6,
      pricingPolicy: {
        basePrice: 57,
        cycleDiscounts: [
          {
            adjustmentType: 'PERCENTAGE',
            adjustmentValue: {percentage: 20},
            afterCycle: 0,
            computedPrice: 45.6,
          },
        ],
      },
    });
  });

  it('uses a fixed value for amount discounts', () => {
    expect(
      buildLinePricing(57, {
        ...PLAN_4_WEEKS,
        adjustment: {type: 'FIXED_AMOUNT', value: 7},
      }).pricingPolicy?.cycleDiscounts[0].adjustmentValue,
    ).toEqual({fixedValue: 7});
  });

  it('has no pricing policy without a discount', () => {
    expect(buildLinePricing(57, {...PLAN_4_WEEKS, adjustment: null})).toEqual({
      currentPrice: 57,
    });
  });
});

describe('planEdit', () => {
  it('has no operations when nothing changed', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: unchangedLines,
    });

    expect(result.ok && hasOperations(result.operations)).toBe(false);
  });

  it('only updates the quantity when the quantity changes', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [{...unchangedLines[0], quantity: 3}, unchangedLines[1]],
    });

    expect(result).toEqual({
      ok: true,
      operations: {
        updates: [{lineId: LINE_A, input: {quantity: 3}}],
        additions: [],
        removals: [],
        newPlan: null,
      },
    });
  });

  it("reprices a line whose variant changes at today's price", () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [
        {...unchangedLines[0], variantId: 'gid://shopify/ProductVariant/2'},
        unchangedLines[1],
      ],
    });

    expect(result.ok && result.operations.updates).toEqual([
      {
        lineId: LINE_A,
        input: {
          productVariantId: 'gid://shopify/ProductVariant/2',
          quantity: 1,
          currentPrice: 48,
          pricingPolicy: expect.objectContaining({basePrice: 60}),
          sellingPlanId: PLAN_4_WEEKS.id,
          sellingPlanName: PLAN_4_WEEKS.name,
        },
      },
    ]);
  });

  it('reprices all lines from their base price when the plan changes', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_6_WEEKS.id,
      lines: unchangedLines,
    });

    expect(result.ok && result.operations.newPlan).toBe(PLAN_6_WEEKS);
    expect(
      result.ok &&
        result.operations.updates.map(({lineId, input}) => [
          lineId,
          input.currentPrice,
          input.sellingPlanId,
        ]),
    ).toEqual([
      [LINE_A, 42.5, PLAN_6_WEEKS.id],
      [LINE_B, 48.45, PLAN_6_WEEKS.id],
    ]);
  });

  it('adds new lines and removes lines left out', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [
        {...unchangedLines[0], quantity: 2},
        {variantId: 'gid://shopify/ProductVariant/2', quantity: 1},
      ],
    });

    expect(result.ok && result.operations.removals).toEqual([LINE_B]);
    expect(result.ok && result.operations.additions).toEqual([
      expect.objectContaining({
        productVariantId: 'gid://shopify/ProductVariant/2',
        quantity: 1,
        currentPrice: 48,
        sellingPlanId: PLAN_4_WEEKS.id,
      }),
    ]);
  });

  it(`requires at least ${MIN_SUBSCRIPTION_QUANTITY} items`, () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [unchangedLines[1]],
    });

    expect(result).toMatchObject({ok: false, code: 'BELOW_MINIMUM'});
  });

  it('rejects variants that are not in the plan', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [
        ...unchangedLines,
        {variantId: 'gid://shopify/ProductVariant/999', quantity: 1},
      ],
    });

    expect(result).toMatchObject({ok: false, code: 'INELIGIBLE_VARIANT'});
  });

  it('rejects swapping to an out of stock variant', () => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [
        unchangedLines[0],
        {...unchangedLines[1], variantId: 'gid://shopify/ProductVariant/4'},
      ],
    });

    expect(result).toMatchObject({ok: false, code: 'UNAVAILABLE'});
  });

  it('lets customers keep an unchanged variant that is out of stock', () => {
    const lines = context().lines.map((line) =>
      line.id === LINE_B
        ? {...line, variantId: 'gid://shopify/ProductVariant/4'}
        : line,
    );
    const result = planEdit(context({lines}), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [
        {...unchangedLines[0], quantity: 2},
        {...unchangedLines[1], variantId: 'gid://shopify/ProductVariant/4'},
      ],
    });

    expect(result.ok).toBe(true);
  });

  it('rejects plans outside the group', () => {
    const result = planEdit(context(), {
      sellingPlanId: 'gid://shopify/SellingPlan/999',
      lines: unchangedLines,
    });

    expect(result).toMatchObject({ok: false, code: 'INVALID_PLAN'});
  });

  it.each([0, 1.5, 100])('rejects a quantity of %d', (quantity) => {
    const result = planEdit(context(), {
      sellingPlanId: PLAN_4_WEEKS.id,
      lines: [{...unchangedLines[0], quantity}, unchangedLines[1]],
    });

    expect(result).toMatchObject({ok: false, code: 'INVALID_QUANTITY'});
  });

  it('rejects line ids from other contracts and duplicates', () => {
    expect(
      planEdit(context(), {
        sellingPlanId: PLAN_4_WEEKS.id,
        lines: [
          ...unchangedLines,
          {
            id: 'gid://shopify/SubscriptionLine/other',
            variantId: 'gid://shopify/ProductVariant/1',
            quantity: 1,
          },
        ],
      }),
    ).toMatchObject({ok: false, code: 'INVALID_LINE'});

    expect(
      planEdit(context(), {
        sellingPlanId: PLAN_4_WEEKS.id,
        lines: [...unchangedLines, unchangedLines[0]],
      }),
    ).toMatchObject({ok: false, code: 'INVALID_LINE'});
  });
});
