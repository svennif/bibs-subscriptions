import type {
  DraftLine,
  EditLine,
  EditProduct,
  EditSellingPlan,
  EditVariant,
  PlanAdjustment,
  SelectedOption,
} from './types';

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

/**
 * Applies a selling plan's price adjustment to a price. The result is only a
 * preview; the app server calculates the price that is saved.
 */
export function applyAdjustment(
  price: number,
  adjustment: PlanAdjustment | null,
): number {
  if (!adjustment) {
    return roundMoney(price);
  }

  switch (adjustment.type) {
    case 'PERCENTAGE':
      return roundMoney(price * (1 - adjustment.value / 100));
    case 'FIXED_AMOUNT':
      return roundMoney(Math.max(0, price - adjustment.value));
    case 'PRICE':
      return roundMoney(adjustment.value);
    default:
      return roundMoney(price);
  }
}

interface PreviewUnitPriceArgs {
  draftLine: DraftLine;
  originalLine?: EditLine;
  variant?: EditVariant;
  plan?: EditSellingPlan;
  planChanged: boolean;
}

/**
 * Estimates the unit price of a line after saving. Lines the customer didn't
 * change keep their current price; changed or added lines get the variant's
 * price with the plan's discount.
 */
export function previewUnitPrice({
  draftLine,
  originalLine,
  variant,
  plan,
  planChanged,
}: PreviewUnitPriceArgs): number {
  const adjustment = plan?.adjustment ?? null;

  if (originalLine && draftLine.variantId === originalLine.variantId) {
    return planChanged
      ? applyAdjustment(Number(originalLine.basePrice), adjustment)
      : Number(originalLine.unitPrice);
  }

  return applyAdjustment(Number(variant?.price ?? 0), adjustment);
}

function matchesOptions(variant: EditVariant, options: SelectedOption[]) {
  return options.every(({name, value}) =>
    variant.selectedOptions.some(
      (option) => option.name === name && option.value === value,
    ),
  );
}

/**
 * Picks the variant to use when the customer switches to another product:
 * keeps the current option values (e.g. size and nipple type) when the new
 * product has a matching variant, otherwise the first available variant.
 */
export function variantForProductChange(
  product: EditProduct,
  currentOptions: SelectedOption[],
): EditVariant | undefined {
  const matching =
    currentOptions.length > 0
      ? product.variants.find((variant) =>
          matchesOptions(variant, currentOptions),
        )
      : undefined;

  return (
    matching ??
    product.variants.find((variant) => variant.availableForSale) ??
    product.variants[0]
  );
}

/**
 * Picks the variant to use when the customer changes one option: the variant
 * matching all selected options, otherwise the first variant with the new
 * option value.
 */
export function variantForOptionChange(
  product: EditProduct,
  currentVariant: EditVariant | undefined,
  optionName: string,
  value: string,
): EditVariant | undefined {
  const desired = (currentVariant?.selectedOptions ?? [])
    .filter((option) => option.name !== optionName)
    .concat({name: optionName, value});

  return (
    product.variants.find((variant) => matchesOptions(variant, desired)) ??
    product.variants.find((variant) =>
      matchesOptions(variant, [{name: optionName, value}]),
    )
  );
}

/**
 * Whether choosing `value` for `optionName`, with the current variant's other
 * options, leads to a variant that can be bought.
 */
export function isOptionValueAvailable(
  product: EditProduct,
  currentVariant: EditVariant | undefined,
  optionName: string,
  value: string,
) {
  const variant = variantForOptionChange(
    product,
    currentVariant,
    optionName,
    value,
  );

  return Boolean(
    variant?.availableForSale &&
      variant.selectedOptions.some(
        (option) => option.name === optionName && option.value === value,
      ),
  );
}

export function findVariant(products: EditProduct[], variantId: string) {
  for (const product of products) {
    const variant = product.variants.find(({id}) => id === variantId);
    if (variant) {
      return {product, variant};
    }
  }

  return undefined;
}

export function toDraftLines(lines: EditLine[]): DraftLine[] {
  return lines.map(({id, productId, variantId, quantity}) => ({
    key: id,
    id,
    productId,
    variantId,
    quantity,
  }));
}

/**
 * Whether the draft differs from the contract as it was loaded.
 */
export function hasChanges(
  originalLines: EditLine[],
  draftLines: DraftLine[],
  planChanged: boolean,
) {
  if (planChanged || originalLines.length !== draftLines.length) {
    return true;
  }

  return draftLines.some((draftLine) => {
    const original = originalLines.find(({id}) => id === draftLine.id);

    return (
      !original ||
      original.variantId !== draftLine.variantId ||
      original.quantity !== draftLine.quantity
    );
  });
}
