import type {
  CustomerPortalSellingPlanGroupQuery as CustomerPortalSellingPlanGroupQueryData,
  CustomerPortalSubscriptionEditQuery as CustomerPortalSubscriptionEditQueryData,
  CustomerPortalVariantSellingPlanGroupsQuery as CustomerPortalVariantSellingPlanGroupsQueryData,
} from 'types/admin.generated';
import type {
  SellingPlanInterval,
  SellingPlanPricingPolicyAdjustmentType,
} from 'types/admin.types';
import CustomerPortalSellingPlanGroupQuery from '~/graphql/CustomerPortalSellingPlanGroupQuery';
import CustomerPortalSubscriptionEditQuery from '~/graphql/CustomerPortalSubscriptionEditQuery';
import CustomerPortalVariantSellingPlanGroupsQuery from '~/graphql/CustomerPortalVariantSellingPlanGroupsQuery';
import {buildDraftFromContract} from '~/models/SubscriptionContractDraft/SubscriptionContractDraft.server';
import type {PricingPolicyInput} from '~/routes/app.contracts.$id.edit/validator';
import type {GraphQLClient} from '~/types';
import type {
  SubscriptionLineInput,
  UpdateLineInput,
} from '~/types/contractEditing';
import {logger} from '~/utils/logger.server';

/** Customers can't save a subscription with fewer items than this in total */
export const MIN_SUBSCRIPTION_QUANTITY = 3;
export const MAX_LINE_QUANTITY = 99;

const EDITABLE_STATUSES = ['ACTIVE', 'PAUSED'];
const MAX_PRODUCT_PAGES = 20;

export type PlanAdjustmentType = 'PERCENTAGE' | 'FIXED_AMOUNT' | 'PRICE';

export interface PlanAdjustment {
  type: PlanAdjustmentType;
  value: number;
}

export interface EditSellingPlan {
  id: string;
  name: string;
  deliveryInterval: SellingPlanInterval;
  deliveryIntervalCount: number;
  billingPolicy: {
    interval: SellingPlanInterval;
    intervalCount: number;
    minCycles?: number | null;
    maxCycles?: number | null;
  };
  adjustment: PlanAdjustment | null;
}

export interface EditVariant {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  selectedOptions: {name: string; value: string}[];
  imageUrl: string | null;
}

export interface EditProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  options: {name: string; values: string[]}[];
  variants: EditVariant[];
}

export interface EditLine {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  title: string;
  variantTitle: string | null;
  imageUrl: string | null;
  unitPrice: string;
  basePrice: string;
}

export interface EditContext {
  contractId: string;
  status: string;
  currencyCode: string;
  sellingPlanId: string;
  lines: EditLine[];
  sellingPlans: EditSellingPlan[];
  products: EditProduct[];
}

export type EditErrorCode =
  | 'NOT_EDITABLE'
  | 'CURRENCY_NOT_SUPPORTED'
  | 'NO_PLAN'
  | 'BELOW_MINIMUM'
  | 'INELIGIBLE_VARIANT'
  | 'UNAVAILABLE'
  | 'INVALID_PLAN'
  | 'INVALID_QUANTITY'
  | 'INVALID_LINE'
  | 'UPDATE_FAILED';

export type LoadEditContextResult =
  | {status: 'not_found'}
  | {status: 'not_editable'; code: EditErrorCode}
  | {status: 'ok'; context: EditContext};

/**
 * Loads everything needed to edit a contract from the customer portal: the
 * contract lines, the selling plan group the contract was bought with, and the
 * products and variants in that group. Contracts that don't belong to the
 * customer are reported as not found.
 */
export async function loadEditContext(
  graphql: GraphQLClient,
  contractId: string,
  customerId: string,
): Promise<LoadEditContextResult> {
  const contractData = await queryJson<CustomerPortalSubscriptionEditQueryData>(
    graphql,
    CustomerPortalSubscriptionEditQuery,
    {contractId},
  );
  const contract = contractData?.subscriptionContract;

  if (!contractData || !contract || contract.customer?.id !== customerId) {
    return {status: 'not_found'};
  }

  if (!EDITABLE_STATUSES.includes(contract.status)) {
    return {status: 'not_editable', code: 'NOT_EDITABLE'};
  }

  // Prices must be in the contract currency. With a delivery country, use the
  // prices of that country's market. Otherwise fall back to the shop prices,
  // which are only correct for contracts in the shop currency.
  const country = deliveryCountry(contract.deliveryMethod);

  if (!country && contract.currencyCode !== contractData.shop.currencyCode) {
    return {status: 'not_editable', code: 'CURRENCY_NOT_SUPPORTED'};
  }

  const pricing: VariantPricing = {
    country,
    currencyCode: contract.currencyCode,
  };

  const lineWithPlan = contract.lines.nodes.find(
    (line) => line.sellingPlanId && line.variantId,
  );

  if (!lineWithPlan?.sellingPlanId || !lineWithPlan.variantId) {
    return {status: 'not_editable', code: 'NO_PLAN'};
  }

  const groupId = await findSellingPlanGroupId(
    graphql,
    lineWithPlan.variantId,
    lineWithPlan.sellingPlanId,
  );

  if (!groupId) {
    return {status: 'not_editable', code: 'NO_PLAN'};
  }

  const group = await loadSellingPlanGroup(graphql, groupId, pricing);

  if (!group) {
    return {status: 'not_editable', code: 'NO_PLAN'};
  }

  const variantPrices = new Map(
    group.products.flatMap((product) =>
      product.variants.map((variant) => [variant.id, variant.price] as const),
    ),
  );

  const lines: EditLine[] = contract.lines.nodes.map((line) => ({
    id: line.id,
    productId: line.productId ?? '',
    variantId: line.variantId ?? '',
    quantity: line.quantity,
    title: line.title,
    variantTitle: line.variantTitle ?? null,
    imageUrl: line.variantImage?.url ?? null,
    unitPrice: String(line.currentPrice.amount),
    basePrice: String(
      line.pricingPolicy?.basePrice.amount ??
        variantPrices.get(line.variantId ?? '') ??
        line.currentPrice.amount,
    ),
  }));

  return {
    status: 'ok',
    context: {
      contractId: contract.id,
      status: contract.status,
      currencyCode: contract.currencyCode,
      sellingPlanId: lineWithPlan.sellingPlanId,
      lines,
      sellingPlans: group.sellingPlans,
      products: group.products,
    },
  };
}

async function findSellingPlanGroupId(
  graphql: GraphQLClient,
  variantId: string,
  sellingPlanId: string,
) {
  const data = await queryJson<CustomerPortalVariantSellingPlanGroupsQueryData>(
    graphql,
    CustomerPortalVariantSellingPlanGroupsQuery,
    {variantId},
  );

  return data?.productVariant?.sellingPlanGroups.nodes.find((group) =>
    group.sellingPlans.nodes.some((plan) => plan.id === sellingPlanId),
  )?.id;
}

type ContractDeliveryMethod = NonNullable<
  CustomerPortalSubscriptionEditQueryData['subscriptionContract']
>['deliveryMethod'];

function deliveryCountry(deliveryMethod: ContractDeliveryMethod) {
  if (!deliveryMethod) {
    return null;
  }

  if ('address' in deliveryMethod) {
    return deliveryMethod.address?.countryCodeV2 ?? null;
  }

  if ('pickupOption' in deliveryMethod) {
    return deliveryMethod.pickupOption?.location?.address?.countryCode ?? null;
  }

  return null;
}

interface VariantPricing {
  /** Price variants for this country's market when set, else shop prices */
  country: string | null;
  currencyCode: string;
}

type GroupData = NonNullable<
  CustomerPortalSellingPlanGroupQueryData['sellingPlanGroup']
>;
type ProductFields = GroupData['products']['nodes'][number];
type VariantFields = ProductFields['variants']['nodes'][number];

async function loadSellingPlanGroup(
  graphql: GraphQLClient,
  groupId: string,
  pricing: VariantPricing,
) {
  const products = new Map<string, EditProduct>();
  let sellingPlans: EditSellingPlan[] = [];
  let productsAfter: string | null = null;

  for (let page = 0; page < MAX_PRODUCT_PAGES; page++) {
    const data: CustomerPortalSellingPlanGroupQueryData | undefined =
      await queryJson<CustomerPortalSellingPlanGroupQueryData>(
        graphql,
        CustomerPortalSellingPlanGroupQuery,
        {
          groupId,
          productsAfter,
          country: pricing.country,
          marketPricing: Boolean(pricing.country),
        },
      );
    const group = data?.sellingPlanGroup;

    if (!group) {
      return null;
    }

    if (page === 0) {
      sellingPlans = group.sellingPlans.nodes.flatMap(toEditSellingPlan);

      // Variants added to the group individually, rather than whole products
      for (const variant of group.productVariants.nodes) {
        addVariant(products, variant.product, variant, pricing);
      }
    }

    // Whole products in the group make all of their variants eligible
    for (const product of group.products.nodes) {
      for (const variant of product.variants.nodes) {
        addVariant(products, product, variant, pricing);
      }
    }

    if (!group.products.pageInfo.hasNextPage) {
      break;
    }

    productsAfter = group.products.pageInfo.endCursor ?? null;
  }

  return {
    sellingPlans,
    products: Array.from(products.values()).map(withEligibleOptionValues),
  };
}

function addVariant(
  products: Map<string, EditProduct>,
  product: Omit<ProductFields, 'variants'>,
  variant: VariantFields,
  pricing: VariantPricing,
) {
  const price = variantPrice(variant, pricing);

  // Variants without a price in the contract currency can't be offered
  if (price === null) {
    return;
  }

  let editProduct = products.get(product.id);

  if (!editProduct) {
    editProduct = {
      id: product.id,
      title: product.title,
      imageUrl: product.featuredMedia?.preview?.image?.url ?? null,
      options: product.options.map(({name, values}) => ({name, values})),
      variants: [],
    };
    products.set(product.id, editProduct);
  }

  if (editProduct.variants.some(({id}) => id === variant.id)) {
    return;
  }

  editProduct.variants.push({
    id: variant.id,
    title: variant.title,
    price,
    availableForSale: variant.availableForSale,
    selectedOptions: variant.selectedOptions.map(({name, value}) => ({
      name,
      value,
    })),
    imageUrl: variant.media.nodes[0]?.preview?.image?.url ?? null,
  });
}

function variantPrice(variant: VariantFields, pricing: VariantPricing) {
  if (!pricing.country) {
    return String(variant.price);
  }

  const marketPrice = variant.contextualPricing?.price;

  return marketPrice?.currencyCode === pricing.currencyCode
    ? String(marketPrice.amount)
    : null;
}

/** Only offer option values that at least one eligible variant has */
function withEligibleOptionValues(product: EditProduct): EditProduct {
  return {
    ...product,
    options: product.options.map((option) => ({
      name: option.name,
      values: option.values.filter((value) =>
        product.variants.some((variant) =>
          variant.selectedOptions.some(
            (selected) =>
              selected.name === option.name && selected.value === value,
          ),
        ),
      ),
    })),
  };
}

function toEditSellingPlan(
  plan: GroupData['sellingPlans']['nodes'][number],
): EditSellingPlan[] {
  const {deliveryPolicy, billingPolicy} = plan;

  if (
    !('interval' in deliveryPolicy) ||
    !deliveryPolicy.interval ||
    !('interval' in billingPolicy) ||
    !billingPolicy.interval
  ) {
    return [];
  }

  const fixedPolicy = plan.pricingPolicies.find(
    (policy) => 'adjustmentType' in policy,
  );
  let adjustment: PlanAdjustment | null = null;

  if (fixedPolicy && 'adjustmentType' in fixedPolicy) {
    const value = fixedPolicy.adjustmentValue;
    adjustment = {
      type: fixedPolicy.adjustmentType as PlanAdjustmentType,
      value: Number('percentage' in value ? value.percentage : value.amount),
    };
  }

  return [
    {
      id: plan.id,
      name: plan.name,
      deliveryInterval: deliveryPolicy.interval,
      deliveryIntervalCount: deliveryPolicy.intervalCount,
      billingPolicy: {
        interval: billingPolicy.interval,
        intervalCount: billingPolicy.intervalCount,
        minCycles: billingPolicy.minCycles,
        maxCycles: billingPolicy.maxCycles,
      },
      adjustment,
    },
  ];
}

export function applyAdjustment(
  price: number,
  adjustment: PlanAdjustment | null,
) {
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
  }
}

function roundMoney(amount: number) {
  return Math.round(amount * 100) / 100;
}

/**
 * The price and pricing policy for a line at a selling plan's discount, the
 * same shape the admin contract editor sends.
 */
export function buildLinePricing(
  basePrice: number,
  plan: EditSellingPlan,
): {currentPrice: number; pricingPolicy?: PricingPolicyInput} {
  const currentPrice = applyAdjustment(basePrice, plan.adjustment);

  if (!plan.adjustment) {
    return {currentPrice};
  }

  const {type, value} = plan.adjustment;

  return {
    currentPrice,
    pricingPolicy: {
      basePrice,
      cycleDiscounts: [
        {
          adjustmentType: type as SellingPlanPricingPolicyAdjustmentType,
          adjustmentValue:
            type === 'PERCENTAGE' ? {percentage: value} : {fixedValue: value},
          afterCycle: 0,
          computedPrice: currentPrice,
        },
      ],
    },
  };
}

export interface EditRequest {
  sellingPlanId: string;
  lines: {id?: string; variantId: string; quantity: number}[];
}

export interface EditOperations {
  updates: {lineId: string; input: UpdateLineInput}[];
  additions: SubscriptionLineInput[];
  removals: string[];
  newPlan: EditSellingPlan | null;
}

export type PlanEditResult =
  | {ok: true; operations: EditOperations}
  | {ok: false; code: EditErrorCode; message: string};

/**
 * Validates the customer's desired state for the contract and works out the
 * draft operations to get there. Only changed lines are repriced: a new
 * variant or new line gets today's price at the plan's discount, and a new
 * plan reprices existing lines from their base price.
 */
export function planEdit(
  context: EditContext,
  request: EditRequest,
): PlanEditResult {
  const fail = (code: EditErrorCode, message: string): PlanEditResult => ({
    ok: false,
    code,
    message,
  });

  const plan = context.sellingPlans.find(
    ({id}) => id === request.sellingPlanId,
  );

  if (!plan) {
    return fail('INVALID_PLAN', 'Selling plan is not available');
  }

  if (!Array.isArray(request.lines) || request.lines.length === 0) {
    return fail('BELOW_MINIMUM', 'A subscription needs at least one item');
  }

  const variants = new Map(
    context.products.flatMap((product) =>
      product.variants.map((variant) => [variant.id, variant] as const),
    ),
  );
  const existingLines = new Map(context.lines.map((line) => [line.id, line]));
  const seenLineIds = new Set<string>();
  let totalQuantity = 0;

  for (const line of request.lines) {
    if (
      !Number.isInteger(line.quantity) ||
      line.quantity < 1 ||
      line.quantity > MAX_LINE_QUANTITY
    ) {
      return fail('INVALID_QUANTITY', 'Quantity is out of range');
    }

    totalQuantity += line.quantity;

    if (line.id !== undefined) {
      if (!existingLines.has(line.id) || seenLineIds.has(line.id)) {
        return fail('INVALID_LINE', 'Line does not belong to the subscription');
      }
      seenLineIds.add(line.id);
    }

    const existing = line.id ? existingLines.get(line.id) : undefined;
    const variantChanged = !existing || existing.variantId !== line.variantId;

    // Unchanged lines may keep a variant that has since left the plan or
    // sold out, so customers can still edit everything else.
    if (variantChanged) {
      const variant = variants.get(line.variantId);

      if (!variant) {
        return fail('INELIGIBLE_VARIANT', 'Product is not in this plan');
      }

      if (!variant.availableForSale) {
        return fail('UNAVAILABLE', 'Product is out of stock');
      }
    }
  }

  if (totalQuantity < MIN_SUBSCRIPTION_QUANTITY) {
    return fail(
      'BELOW_MINIMUM',
      `A subscription needs at least ${MIN_SUBSCRIPTION_QUANTITY} items`,
    );
  }

  const planChanged = plan.id !== context.sellingPlanId;
  const planFields = {sellingPlanId: plan.id, sellingPlanName: plan.name};
  const operations: EditOperations = {
    updates: [],
    additions: [],
    removals: context.lines
      .filter(({id}) => !seenLineIds.has(id))
      .map(({id}) => id),
    newPlan: planChanged ? plan : null,
  };

  for (const line of request.lines) {
    const existing = line.id ? existingLines.get(line.id) : undefined;

    if (!existing) {
      const variant = variants.get(line.variantId)!;
      operations.additions.push({
        productVariantId: line.variantId,
        quantity: line.quantity,
        ...buildLinePricing(Number(variant.price), plan),
        ...planFields,
      });
      continue;
    }

    if (existing.variantId !== line.variantId) {
      const variant = variants.get(line.variantId)!;
      operations.updates.push({
        lineId: existing.id,
        input: {
          productVariantId: line.variantId,
          quantity: line.quantity,
          ...buildLinePricing(Number(variant.price), plan),
          ...planFields,
        },
      });
    } else if (planChanged) {
      operations.updates.push({
        lineId: existing.id,
        input: {
          quantity: line.quantity,
          ...buildLinePricing(Number(existing.basePrice), plan),
          ...planFields,
        },
      });
    } else if (existing.quantity !== line.quantity) {
      operations.updates.push({
        lineId: existing.id,
        input: {quantity: line.quantity},
      });
    }
  }

  return {ok: true, operations};
}

export function hasOperations({
  updates,
  additions,
  removals,
  newPlan,
}: EditOperations) {
  return (
    updates.length > 0 ||
    additions.length > 0 ||
    removals.length > 0 ||
    newPlan !== null
  );
}

/**
 * Applies the operations to a draft of the contract and commits it. Lines are
 * added and updated before any are removed, since a contract can't be left
 * without lines.
 */
export async function applyEdit(
  graphql: GraphQLClient,
  shopDomain: string,
  contractId: string,
  operations: EditOperations,
): Promise<boolean> {
  const draft = await buildDraftFromContract(shopDomain, contractId, graphql);

  for (const {lineId, input} of operations.updates) {
    if (!(await draft.updateLine(lineId, input))) return false;
  }

  for (const line of operations.additions) {
    if (!(await draft.addLine(line))) return false;
  }

  for (const lineId of operations.removals) {
    if (!(await draft.removeLine(lineId))) return false;
  }

  if (operations.newPlan) {
    const {deliveryInterval, deliveryIntervalCount, billingPolicy} =
      operations.newPlan;

    const updated = await draft.update({
      deliveryPolicy: {
        interval: deliveryInterval,
        intervalCount: deliveryIntervalCount,
      },
      billingPolicy: {
        interval: billingPolicy.interval,
        intervalCount: billingPolicy.intervalCount,
      },
    });

    if (!updated) return false;
  }

  const committed = await draft.commit();

  if (!committed) {
    logger.error(
      {shop: shopDomain, subscriptionContractId: contractId},
      'Failed to commit customer portal subscription edit',
    );
  }

  return Boolean(committed);
}

async function queryJson<T>(
  graphql: GraphQLClient,
  query: string,
  variables: Record<string, unknown>,
): Promise<T | undefined> {
  const response = await graphql(query, {variables});
  const {data} = (await response.json()) as {data?: T};
  return data;
}
