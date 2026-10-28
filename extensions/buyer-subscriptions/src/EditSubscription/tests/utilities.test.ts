import {
  getSubscriptionIdFromPath,
  isEditSubscriptionPath,
} from 'utilities/navigation';

import {
  applyAdjustment,
  hasChanges,
  isOptionValueAvailable,
  previewUnitPrice,
  toDraftLines,
  variantForOptionChange,
  variantForProductChange,
} from '../utilities';
import {APRICOT, LAVENDER, PAPAYA, createEditData} from './Fixtures';

describe('applyAdjustment', () => {
  it('applies a percentage discount', () => {
    expect(applyAdjustment(57, {type: 'PERCENTAGE', value: 20})).toBe(45.6);
  });

  it('rounds to two decimals', () => {
    expect(applyAdjustment(10, {type: 'PERCENTAGE', value: 33})).toBe(6.7);
    expect(applyAdjustment(9.999, null)).toBe(10);
  });

  it('applies a fixed amount discount without going below zero', () => {
    expect(applyAdjustment(57, {type: 'FIXED_AMOUNT', value: 7})).toBe(50);
    expect(applyAdjustment(5, {type: 'FIXED_AMOUNT', value: 7})).toBe(0);
  });

  it('uses a fixed price', () => {
    expect(applyAdjustment(57, {type: 'PRICE', value: 30})).toBe(30);
  });

  it('keeps the price without an adjustment', () => {
    expect(applyAdjustment(57, null)).toBe(57);
  });
});

describe('previewUnitPrice', () => {
  const data = createEditData();
  const [originalLine] = data.lines;
  const [draftLine] = toDraftLines(data.lines);
  const [plan4, plan6] = data.sellingPlans;

  it('keeps the current price of an unchanged line', () => {
    expect(
      previewUnitPrice({
        draftLine,
        originalLine,
        variant: PAPAYA.variants[0],
        plan: plan4,
        planChanged: false,
      }),
    ).toBe(40);
  });

  it('applies the new plan to the base price when only the plan changed', () => {
    expect(
      previewUnitPrice({
        draftLine,
        originalLine,
        variant: PAPAYA.variants[0],
        plan: plan6,
        planChanged: true,
      }),
    ).toBe(42.5);
  });

  it('uses the variant price with the plan discount when the variant changed', () => {
    expect(
      previewUnitPrice({
        draftLine: {...draftLine, variantId: APRICOT.variants[1].id},
        originalLine,
        variant: APRICOT.variants[1],
        plan: plan4,
        planChanged: false,
      }),
    ).toBe(48);
  });

  it('uses the variant price with the plan discount for new lines', () => {
    expect(
      previewUnitPrice({
        draftLine: {
          key: 'new-1',
          productId: PAPAYA.id,
          variantId: PAPAYA.variants[0].id,
          quantity: 1,
        },
        variant: PAPAYA.variants[0],
        plan: plan4,
        planChanged: false,
      }),
    ).toBe(45.6);
  });
});

describe('variantForProductChange', () => {
  it('keeps the current option values when the new product has them', () => {
    expect(
      variantForProductChange(APRICOT, [{name: 'Shape', value: 'Round'}])?.id,
    ).toBe('gid://shopify/ProductVariant/32');
  });

  it('falls back to the first available variant', () => {
    expect(
      variantForProductChange(APRICOT, [{name: 'Shape', value: 'Other'}])?.id,
    ).toBe('gid://shopify/ProductVariant/31');
  });

  it('falls back to the first variant when nothing is available', () => {
    const soldOut = {
      ...LAVENDER,
      variants: LAVENDER.variants.map((variant) => ({
        ...variant,
        availableForSale: false,
      })),
    };

    expect(variantForProductChange(soldOut, [])?.id).toBe(
      'gid://shopify/ProductVariant/21',
    );
  });
});

describe('variantForOptionChange', () => {
  it('picks the variant matching all selected options', () => {
    expect(
      variantForOptionChange(PAPAYA, PAPAYA.variants[0], 'Shape', 'Symmetrical')
        ?.id,
    ).toBe('gid://shopify/ProductVariant/12');
  });

  it('falls back to the first variant with the new option value', () => {
    const twoOptions = {
      ...PAPAYA,
      options: [
        {name: 'Shape', values: ['Round', 'Symmetrical']},
        {name: 'Size', values: ['1', '2']},
      ],
      variants: [
        {
          ...PAPAYA.variants[0],
          id: 'round-1',
          selectedOptions: [
            {name: 'Shape', value: 'Round'},
            {name: 'Size', value: '1'},
          ],
        },
        {
          ...PAPAYA.variants[1],
          id: 'symmetrical-2',
          selectedOptions: [
            {name: 'Shape', value: 'Symmetrical'},
            {name: 'Size', value: '2'},
          ],
        },
      ],
    };

    expect(
      variantForOptionChange(
        twoOptions,
        twoOptions.variants[0],
        'Shape',
        'Symmetrical',
      )?.id,
    ).toBe('symmetrical-2');
  });
});

describe('isOptionValueAvailable', () => {
  it('reports option values that lead to an out of stock variant', () => {
    expect(
      isOptionValueAvailable(LAVENDER, LAVENDER.variants[0], 'Shape', 'Round'),
    ).toBe(true);
    expect(
      isOptionValueAvailable(
        LAVENDER,
        LAVENDER.variants[0],
        'Shape',
        'Symmetrical',
      ),
    ).toBe(false);
  });
});

describe('hasChanges', () => {
  const data = createEditData();

  it('is false for the loaded state', () => {
    expect(hasChanges(data.lines, toDraftLines(data.lines), false)).toBe(false);
  });

  it('detects plan, variant, quantity and line count changes', () => {
    const lines = toDraftLines(data.lines);

    expect(hasChanges(data.lines, lines, true)).toBe(true);
    expect(
      hasChanges(
        data.lines,
        [{...lines[0], variantId: 'other'}, lines[1]],
        false,
      ),
    ).toBe(true);
    expect(
      hasChanges(data.lines, [{...lines[0], quantity: 5}, lines[1]], false),
    ).toBe(true);
    expect(hasChanges(data.lines, [lines[0]], false)).toBe(true);
  });
});

describe('edit subscription paths', () => {
  it('recognises the edit page path and keeps the subscription id', () => {
    expect(isEditSubscriptionPath('/subscriptions/10/edit')).toBe(true);
    expect(getSubscriptionIdFromPath('/subscriptions/10/edit')).toBe('10');
    expect(isEditSubscriptionPath('/subscriptions/10')).toBe(false);
    expect(isEditSubscriptionPath('/')).toBe(false);
  });
});
