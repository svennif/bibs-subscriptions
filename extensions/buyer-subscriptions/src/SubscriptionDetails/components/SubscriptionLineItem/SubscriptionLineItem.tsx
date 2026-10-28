import {useExtensionApi} from 'foundation/Api';
import type {SubscriptionLine} from 'types';

export function SubscriptionLineItem({line}: {line: SubscriptionLine}) {
  const {i18n} = useExtensionApi();

  const currentPrice = Number(line.currentPrice.amount);
  const discountedPrice = Number(line.lineDiscountedPrice.amount);
  const currency = line.currentPrice.currencyCode;

  const isDiscounted = discountedPrice < currentPrice * line.quantity;

  return (
    <s-grid gridTemplateColumns="auto 1fr auto" gap="base" alignItems="center">
      <s-product-thumbnail
        src={line.image?.url}
        alt={line.image?.altText ?? line.title}
        totalItems={line.quantity}
      />
      <s-stack gap="small-300">
        <s-text>{line.title}</s-text>
        {line.variantTitle && (
          <s-text color="subdued">{line.variantTitle}</s-text>
        )}
        {line.quantity > 1 ? (
          <s-text type="small" color="subdued">
            {i18n.translate('priceSummary.quantity', {
              quantity: i18n.formatCurrency(currentPrice, {
                currency,
                compactDisplay: 'short',
                currencyDisplay: 'narrowSymbol',
              }),
            })}
          </s-text>
        ) : null}
      </s-stack>

      <s-stack gap="none" alignItems="end">
        <s-text
          type={isDiscounted ? 'redundant' : undefined}
          color={isDiscounted ? 'subdued' : 'base'}
        >
          {i18n.formatCurrency(currentPrice * line.quantity, {
            currency,
            compactDisplay: 'short',
            currencyDisplay: 'narrowSymbol',
          })}
        </s-text>

        {isDiscounted && (
          <s-text>
            {i18n.formatCurrency(discountedPrice, {
              currency,
              compactDisplay: 'short',
              currencyDisplay: 'narrowSymbol',
            })}
          </s-text>
        )}
      </s-stack>
    </s-grid>
  );
}
