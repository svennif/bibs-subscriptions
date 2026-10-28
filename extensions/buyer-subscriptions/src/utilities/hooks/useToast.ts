import {useExtensionApi} from 'foundation/Api';

export enum SuccessToastType {
  Paused = 'paused',
  Resumed = 'resumed',
  Cancelled = 'cancelled',
  Skipped = 'skipped',
  PaymentUpdated = 'paymentUpdated',
  PaymentUpdateEmailSent = 'paymentUpdateEmailSent',
  ShippingUpdated = 'shippingUpdated',
  DeliveryUpdated = 'deliveryUpdated',
  SubscriptionUpdated = 'subscriptionUpdated',
  Hidden = 'hidden',
}

export interface SuccessToastProps {
  type: SuccessToastType;
}

export function useToast() {
  const {i18n, toast} = useExtensionApi();

  function showSuccessToast(type: SuccessToastType) {
    const title = i18n.translate(`successBanner.${type}`);

    toast.show(title);
  }

  return {showSuccessToast};
}
