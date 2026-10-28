import type {SubscriptionStatus} from 'types';

/**
 * Response of the app's `GET /customerAccount/subscription-edit` route.
 */
export interface SubscriptionEditData {
  contract: {
    id: string;
    status: SubscriptionStatus;
    currencyCode: string;
    sellingPlanId: string | null;
  };
  minQuantity: number;
  maxQuantity: number;
  sellingPlans: EditSellingPlan[];
  lines: EditLine[];
  products: EditProduct[];
}

export interface PlanAdjustment {
  type: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'PRICE';
  value: number;
}

export interface EditSellingPlan {
  id: string;
  name: string;
  deliveryInterval: 'DAY' | 'WEEK' | 'MONTH' | 'YEAR';
  deliveryIntervalCount: number;
  adjustment: PlanAdjustment | null;
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

export interface SelectedOption {
  name: string;
  value: string;
}

export interface EditVariant {
  id: string;
  title: string;
  price: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  imageUrl: string | null;
}

export interface EditProduct {
  id: string;
  title: string;
  imageUrl: string | null;
  options: {name: string; values: string[]}[];
  variants: EditVariant[];
}

/**
 * A line as the customer is editing it. `id` is set for lines that already
 * exist on the contract, and missing for lines the customer added.
 */
export interface DraftLine {
  key: string;
  id?: string;
  productId: string;
  variantId: string;
  quantity: number;
}

export type SaveErrorCode =
  | 'BELOW_MINIMUM'
  | 'INELIGIBLE_VARIANT'
  | 'UNAVAILABLE'
  | 'INVALID_PLAN'
  | 'INVALID_QUANTITY'
  | 'NOT_EDITABLE'
  | 'UPDATE_FAILED';
