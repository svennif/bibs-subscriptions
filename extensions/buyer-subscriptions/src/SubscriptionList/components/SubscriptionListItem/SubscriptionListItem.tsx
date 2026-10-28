import {
  BillingCycle,
  DeliveryPolicy,
  Money,
  SubscriptionStatus,
  BillingAttemptErrorType,
} from 'types';
import {useFormatDate} from 'utilities/hooks/useFormatDate';

import {SubscriptionActions} from './components';
import {useExtensionApi} from 'foundation/Api';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {getBillingCycleInfo} from 'utilities';

export interface SubscriptionListItemProps {
  id: string;
  lastBillingAttemptErrorType: BillingAttemptErrorType | null;
  upcomingBillingCycles: BillingCycle[];
  firstLineName: string;
  lineCount: number;
  totalQuantity: number;
  image?: {
    id?: string | null;
    altText?: string | null;
    url: string;
  } | null;
  status: SubscriptionStatus;
  deliveryPolicy: DeliveryPolicy;
  updatedAt: string;
  totalPrice?: Money | null;
  lastOrderPrice?: Money | null;
  refetchSubscriptionListData: () => void;
}

type IconType = NonNullable<HTMLElementTagNameMap['s-icon']['type']>;
const statusIcon: {
  [key in SubscriptionStatus]: IconType;
} = {
  ACTIVE: 'reorder',
  PAUSED: 'disabled',
  CANCELLED: 'alert-circle',
  EXPIRED: 'alert-circle',
  FAILED: 'alert-circle',
  STALE: 'alert-circle',
};

export function SubscriptionListItem({
  upcomingBillingCycles,
  firstLineName,
  lineCount,
  totalQuantity,
  image,
  id,
  status,
  deliveryPolicy,
  updatedAt,
  totalPrice,
  lastOrderPrice,
  refetchSubscriptionListData,
  lastBillingAttemptErrorType,
}: SubscriptionListItemProps) {
  const {i18n} = useExtensionApi();
  const formatDate = useFormatDate();

  const {nextBillingDate, resumeDateIfNextCycleSkipped, cycleIndexToSkip} =
    getBillingCycleInfo(upcomingBillingCycles);

  const title =
    lineCount === 1
      ? firstLineName
      : i18n.translate('listItem.multipleItemsName', {count: totalQuantity});

  const accessibilityLabel = i18n.translate('listItem.accessibilityLabel', {
    title,
  });

  const hasInventoryError =
    lastBillingAttemptErrorType === BillingAttemptErrorType.InventoryError &&
    (status === 'ACTIVE' || status === 'FAILED');

  const nextOrderText = (() => {
    if (hasInventoryError) {
      return i18n.translate('delayed');
    }

    if (status === 'ACTIVE' && nextBillingDate) {
      return i18n.translate('nextOrder', {
        date: formatDate(nextBillingDate),
      });
    }

    return i18n.translate('lastUpdated', {
      date: formatDate(updatedAt),
    });
  })();

  return (
    <s-section accessibilityLabel={accessibilityLabel}>
      <s-stack gap="base">
        <s-clickable
          href={`extension:/subscriptions/${parseGid(id)}`}
          accessibilityLabel={accessibilityLabel}
        >
          <s-stack gap="base">
            <s-box background="subdued" padding="large" borderRadius="base">
              <s-grid
                gridTemplateColumns="auto 1fr"
                gap="small"
                alignItems="center"
              >
                <s-icon type={hasInventoryError ? 'info' : statusIcon[status]} />
                <s-stack gap="none">
                  <s-text type="strong">
                    {hasInventoryError
                      ? i18n.translate('subscriptionStatus.pending')
                      : i18n.translate(
                          `subscriptionStatus.${status.toLowerCase()}`,
                        )}
                  </s-text>
                  <s-text type="small">{nextOrderText}</s-text>
                </s-stack>
              </s-grid>
            </s-box>
            <s-image-group totalItems={1}>
              {image?.url ? (
                <s-image src={image.url} alt={image.altText ?? ''} />
              ) : null}
            </s-image-group>
            <s-stack gap="small-300">
              <s-heading>{title}</s-heading>
              <s-text color="subdued">
                {i18n.translate(
                  `deliveryInterval.${deliveryPolicy.interval.toLowerCase()}.${
                    deliveryPolicy.intervalCount?.count === 1 ? 'one' : 'other'
                  }`,
                  deliveryPolicy.intervalCount?.count === 1
                    ? undefined
                    : {
                        count: deliveryPolicy.intervalCount?.count,
                      },
                )}
              </s-text>
              {totalPrice ? (
                <s-box paddingBlock="small">
                  <s-heading>
                    {i18n.formatCurrency(Number(totalPrice.amount), {
                      currency: totalPrice.currencyCode,
                      currencyDisplay: 'narrowSymbol',
                    })}
                  </s-heading>
                </s-box>
              ) : null}
            </s-stack>
          </s-stack>
        </s-clickable>
        <SubscriptionActions
          id={id}
          status={status}
          cycleIndexToSkip={cycleIndexToSkip}
          refetchSubscriptionListData={refetchSubscriptionListData}
          resumeDate={nextBillingDate}
          lastOrderPrice={lastOrderPrice}
          nextOrderPrice={totalPrice}
          resumeDateIfNextCycleSkipped={resumeDateIfNextCycleSkipped}
        />
      </s-stack>
    </s-section>
  );
}
