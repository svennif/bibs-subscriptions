import {useCallback, useEffect, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {useAppFetch, useExtensionApi} from 'foundation/Api';

export type PaymentMethodType =
  | 'CREDIT_CARD'
  | 'SHOP_PAY'
  | 'PAYPAL'
  | 'BANK_ACCOUNT';

/**
 * Display summary of a contract's payment method, as returned by the app's
 * `/customerAccount/payment-method` route.
 */
export interface PaymentMethod {
  type: PaymentMethodType;
  revoked: boolean;
  brand?: string;
  lastDigits?: string;
  expiryMonth?: number;
  expiryYear?: number;
  expiresSoon?: boolean;
  paypalAccountEmail?: string | null;
  bankName?: string;
}

const PAYMENT_METHOD_PATH = '/customerAccount/payment-method';

export function usePaymentMethod(contractId: string) {
  const appFetch = useAppFetch();
  const {localization} = useExtensionApi();
  const locale = localization.extensionLanguage.current.isoCode;

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const query = new URLSearchParams({
    contractId: parseGid(contractId),
    locale,
  }).toString();

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      try {
        const response = await appFetch(`${PAYMENT_METHOD_PATH}?${query}`);

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const body = (await response.json()) as {
          paymentMethod: PaymentMethod | null;
        };

        if (!cancelled) {
          setPaymentMethod(body.paymentMethod);
          setError(false);
        }
      } catch (err) {
        console.error('Failed to load payment method:', err);

        if (!cancelled) {
          setError(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [appFetch, query]);

  /**
   * Asks the app to email the customer a secure link to update the payment
   * method. Resolves to whether the email was sent.
   */
  const sendUpdateEmail = useCallback(async () => {
    try {
      const response = await appFetch(`${PAYMENT_METHOD_PATH}?${query}`, {
        method: 'POST',
        body: JSON.stringify({contractId: parseGid(contractId)}),
      });

      return response.ok;
    } catch (err) {
      console.error('Failed to send payment method update email:', err);
      return false;
    }
  }, [appFetch, contractId, query]);

  return {paymentMethod, loading, error, sendUpdateEmail};
}
