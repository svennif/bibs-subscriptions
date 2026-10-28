import {useExtensionApi} from 'foundation/Api';
import type {Money, SubscriptionLine} from 'types';
import {SubscriptionLineItem} from '../SubscriptionLineItem';

export interface PriceSummaryCardProps {
  lines: SubscriptionLine[];
  price: {
    subtotalPrice: Money;
    totalTax?: Money;
    totalShippingPrice: Money;
    totalPrice: Money;
  };
}

export function PriceSummaryCard({price, lines}: PriceSummaryCardProps) {
  const {i18n} = useExtensionApi();

  return (
    <s-section>
      <s-stack gap="large">
        <s-stack gap="small">
          {lines.map((line) => (
            <SubscriptionLineItem key={line.id} line={line} />
          ))}
        </s-stack>
        <s-stack gap="small">
          <s-grid gridTemplateColumns="1fr auto">
            <s-text>{i18n.translate('priceSummary.subtotal')}</s-text>
            <s-text>
              {i18n.formatCurrency(Number(price.subtotalPrice.amount), {
                currency: price.subtotalPrice.currencyCode,
                currencyDisplay: 'narrowSymbol',
              })}
            </s-text>
          </s-grid>
          <s-grid gridTemplateColumns="1fr auto">
            <s-text>{i18n.translate('priceSummary.shipping')}</s-text>
            <s-text>
              {i18n.formatCurrency(Number(price.totalShippingPrice.amount), {
                currency: price.totalShippingPrice.currencyCode,
                currencyDisplay: 'narrowSymbol',
              })}
            </s-text>
          </s-grid>
          {price.totalTax ? (
            <s-grid gridTemplateColumns="1fr auto">
              <s-text>{i18n.translate('priceSummary.taxes')}</s-text>
              <s-text>
                {i18n.formatCurrency(Number(price.totalTax.amount), {
                  currency: price.totalTax.currencyCode,
                  currencyDisplay: 'narrowSymbol',
                })}
              </s-text>
            </s-grid>
          ) : null}
        </s-stack>
        <s-grid gridTemplateColumns="1fr auto" alignItems="center">
          <s-heading>{i18n.translate('priceSummary.total')}</s-heading>
          <s-stack direction="inline" gap="small" alignItems="center">
            <s-text type="small" color="subdued">
              {price.totalPrice.currencyCode}
            </s-text>
            <s-heading>
              {i18n.formatCurrency(Number(price.totalPrice.amount), {
                currency: price.totalPrice.currencyCode,
                compactDisplay: 'short',
                currencyDisplay: 'narrowSymbol',
              })}
            </s-heading>
          </s-stack>
        </s-grid>
      </s-stack>
    </s-section>
  );
}
