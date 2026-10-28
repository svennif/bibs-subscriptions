import type {CustomerPortalPaymentMethodQuery as CustomerPortalPaymentMethodQueryData} from 'types/admin.generated';
import CustomerPortalPaymentMethodQuery from '~/graphql/CustomerPortalPaymentMethodQuery';
import type {GraphQLClient} from '~/types';

type Contract = NonNullable<
  CustomerPortalPaymentMethodQueryData['subscriptionContract']
>;
type Instrument = NonNullable<
  NonNullable<Contract['customerPaymentMethod']>['instrument']
>;

export type PortalPaymentMethodType =
  | 'CREDIT_CARD'
  | 'SHOP_PAY'
  | 'PAYPAL'
  | 'BANK_ACCOUNT';

/**
 * The payment method details the customer portal is allowed to show. Only
 * display fields are included, never the payment method id.
 */
export interface PortalPaymentMethod {
  type: PortalPaymentMethodType;
  revoked: boolean;
  brand?: string;
  lastDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  expiresSoon?: boolean;
  paypalAccountEmail?: string | null;
  bankName?: string;
}

export type CustomerContractResult =
  | {status: 'not_found'}
  | {
      status: 'ok';
      contract: Contract;
      shop: CustomerPortalPaymentMethodQueryData['shop'];
    };

/**
 * Loads a subscription contract only if it belongs to the given customer.
 * Contracts owned by another customer are reported as not found, so the
 * portal can't be used to probe which contract ids exist.
 */
export async function findCustomerContract(
  graphql: GraphQLClient,
  contractId: string,
  customerId: string,
): Promise<CustomerContractResult> {
  const response = await graphql(CustomerPortalPaymentMethodQuery, {
    variables: {contractId},
  });

  const {data} = (await response.json()) as {
    data?: CustomerPortalPaymentMethodQueryData;
  };

  const contract = data?.subscriptionContract;

  if (!data || !contract || contract.customer?.id !== customerId) {
    return {status: 'not_found'};
  }

  return {status: 'ok', contract, shop: data.shop};
}

export function toPortalPaymentMethod(
  contract: Contract,
): PortalPaymentMethod | null {
  const paymentMethod = contract.customerPaymentMethod;
  const instrument = paymentMethod?.instrument;

  if (!paymentMethod || !instrument) {
    return null;
  }

  const revoked = Boolean(paymentMethod.revokedAt);

  return formatInstrument(instrument, revoked);
}

function formatInstrument(
  instrument: Instrument,
  revoked: boolean,
): PortalPaymentMethod | null {
  switch (instrument.__typename) {
    case 'CustomerCreditCard':
      return {
        type: 'CREDIT_CARD',
        revoked,
        brand: instrument.brand,
        lastDigits: instrument.lastDigits ?? undefined,
        expiryMonth: instrument.expiryMonth,
        expiryYear: instrument.expiryYear,
        expiresSoon: instrument.expiresSoon,
      };
    case 'CustomerShopPayAgreement':
      return {
        type: 'SHOP_PAY',
        revoked,
        lastDigits: instrument.lastDigits ?? undefined,
        expiryMonth: instrument.expiryMonth,
        expiryYear: instrument.expiryYear,
        expiresSoon: instrument.expiresSoon,
      };
    case 'CustomerPaypalBillingAgreement':
      return {
        type: 'PAYPAL',
        revoked,
        paypalAccountEmail: instrument.paypalAccountEmail,
      };
    case 'BankAccount':
      return {
        type: 'BANK_ACCOUNT',
        revoked,
        bankName: instrument.bankName,
        lastDigits: instrument.lastDigits,
      };
    default:
      return null;
  }
}
