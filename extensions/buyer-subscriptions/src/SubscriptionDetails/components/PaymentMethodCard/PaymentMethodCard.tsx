import {useExtensionApi} from 'foundation/Api';
import type {SubscriptionStatus} from 'types';
import {brandLabels} from 'utilities/constants';
import {SuccessToastType, useToast} from 'utilities/hooks/useToast';

import {
  getPaymentMethodModalId,
  PaymentMethodUpdateModal,
} from './PaymentMethodUpdateModal';
import {usePaymentMethod, type PaymentMethod} from './usePaymentMethod';

interface PaymentMethodCardProps {
  contractId: string;
  status: SubscriptionStatus;
}

export function PaymentMethodCard({
  contractId,
  status,
}: PaymentMethodCardProps) {
  const {i18n} = useExtensionApi();
  const {showSuccessToast} = useToast();
  const {paymentMethod, loading, error, sendUpdateEmail} =
    usePaymentMethod(contractId);

  const canUpdate =
    status !== 'CANCELLED' && status !== 'EXPIRED' && Boolean(paymentMethod);

  return (
    <s-section heading={i18n.translate('overviewCard.payment')}>
      <s-stack gap="base">
        {loading ? <s-skeleton-paragraph /> : null}
        {!loading && error ? (
          <s-text tone="critical">
            {i18n.translate('paymentModal.fetchError')}
          </s-text>
        ) : null}
        {!loading && !error && !paymentMethod ? (
          <s-text color="subdued">
            {i18n.translate('paymentMethodCard.noPaymentMethod')}
          </s-text>
        ) : null}
        {!loading && paymentMethod ? (
          <PaymentMethodSummary paymentMethod={paymentMethod} />
        ) : null}
        {canUpdate ? (
          <s-stack direction="inline">
            <s-button
              variant="secondary"
              command="--show"
              commandFor={getPaymentMethodModalId(contractId)}
            >
              {i18n.translate('overviewCard.changePaymentMethodButtonLabel')}
            </s-button>
          </s-stack>
        ) : null}
      </s-stack>
      {canUpdate ? (
        <PaymentMethodUpdateModal
          contractId={contractId}
          sendUpdateEmail={sendUpdateEmail}
          onEmailSent={() =>
            showSuccessToast(SuccessToastType.PaymentUpdateEmailSent)
          }
        />
      ) : null}
    </s-section>
  );
}

function PaymentMethodSummary({paymentMethod}: {paymentMethod: PaymentMethod}) {
  const {i18n} = useExtensionApi();
  const {
    type,
    revoked,
    lastDigits,
    expiryMonth,
    expiryYear,
    expiresSoon,
    paypalAccountEmail,
  } = paymentMethod;

  const name = paymentMethodName(paymentMethod, (key) => i18n.translate(key));

  const title =
    type === 'PAYPAL' || !lastDigits
      ? name
      : i18n.translate('paymentMethodCard.cardEndingIn', {
          brand: name,
          lastDigits,
        });

  return (
    <s-stack gap="small-300">
      {revoked ? (
        <s-banner tone="critical">
          {lastDigits
            ? i18n.translate('paymentMethodInvalidBannerGeneric', {lastDigits})
            : i18n.translate('paymentMethodInvalidBadge')}
        </s-banner>
      ) : null}
      <s-stack direction="inline" gap="small" alignItems="center">
        <s-text>{title}</s-text>
        {revoked ? (
          <s-badge tone="critical">
            {i18n.translate('paymentMethodInvalidBadge')}
          </s-badge>
        ) : null}
      </s-stack>
      {type === 'PAYPAL' && paypalAccountEmail ? (
        <s-text color="subdued">{paypalAccountEmail}</s-text>
      ) : null}
      {expiryMonth && expiryYear ? (
        <s-text
          type="small"
          tone={expiresSoon ? 'warning' : 'auto'}
          color={expiresSoon ? 'base' : 'subdued'}
        >
          {i18n.translate('paymentMethodCard.expires', {
            date: formatExpiry(expiryMonth, expiryYear),
          })}
        </s-text>
      ) : null}
    </s-stack>
  );
}

function paymentMethodName(
  {type, brand, bankName}: PaymentMethod,
  translate: (key: string) => string,
) {
  switch (type) {
    case 'SHOP_PAY':
      return 'Shop Pay';
    case 'PAYPAL':
      return 'PayPal';
    case 'BANK_ACCOUNT':
      return bankName || translate('paymentMethodCard.bankAccount');
    default:
      return formatBrand(brand);
  }
}

export function formatBrand(brand?: string) {
  if (!brand) return '';

  const key = brand.toLowerCase().replace(/[\s_-]/g, '');
  return brandLabels.get(key) ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

export function formatExpiry(month: number, year: number) {
  return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
}
