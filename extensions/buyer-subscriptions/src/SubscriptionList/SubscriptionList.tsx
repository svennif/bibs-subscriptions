import {useSubscriptionListData} from './hooks/useSubscriptionListData';
import {SubscriptionListEmptyState, SubscriptionListItem} from './components';
import {useExtensionApi} from 'foundation/Api';
import type {BillingAttemptErrorType} from 'types';

// One column on narrow containers, two from 500px, three from 750px.
// The first matching condition wins, so the widest one comes first.
export const SUBSCRIPTION_GRID_COLUMNS =
  '@container (inline-size > 750px) 1fr 1fr 1fr, (inline-size > 500px) 1fr 1fr, 1fr';

export function SubscriptionList() {
  const {i18n} = useExtensionApi();
  const {data, loading, error, refetchSubscriptionListData} =
    useSubscriptionListData();

  if (loading && !data) {
    return <SubscriptionListLoadingState />;
  }

  if (error) {
    return <SubscriptionListErrorState />;
  }

  if (data?.subscriptionContracts.length === 0) {
    return <SubscriptionListEmptyState />;
  }

  const listItems = data?.subscriptionContracts.length
    ? data.subscriptionContracts.map(
        ({
          lines,
          id,
          status,
          lastBillingAttemptErrorType,
          upcomingBillingCycles,
          deliveryPolicy,
          updatedAt,
          totalQuantity,
          lastOrderPrice,
          priceBreakdownEstimate,
        }) => {
          const {name, image} = lines[0];

          return (
            <SubscriptionListItem
              key={id}
              id={id}
              upcomingBillingCycles={upcomingBillingCycles}
              firstLineName={name}
              lineCount={lines.length}
              totalQuantity={totalQuantity}
              image={image}
              status={status}
              lastBillingAttemptErrorType={
                lastBillingAttemptErrorType as BillingAttemptErrorType | null
              }
              deliveryPolicy={deliveryPolicy}
              updatedAt={updatedAt}
              lastOrderPrice={lastOrderPrice}
              refetchSubscriptionListData={refetchSubscriptionListData}
              totalPrice={priceBreakdownEstimate?.totalPrice}
            />
          );
        },
      )
    : null;

  return (
    <s-page heading={i18n.translate('subscriptions')}>
      <s-query-container>
        <s-grid gridTemplateColumns={SUBSCRIPTION_GRID_COLUMNS} gap="large">
          {listItems}
        </s-grid>
      </s-query-container>
    </s-page>
  );
}

export function SubscriptionListLoadingState() {
  const {i18n} = useExtensionApi();

  return (
    <s-page heading={i18n.translate('subscriptions')}>
      <s-query-container>
        <s-grid gridTemplateColumns={SUBSCRIPTION_GRID_COLUMNS} gap="large">
          <s-section id="loading-state">
            <s-stack gap="base">
              <s-skeleton-paragraph />
              <s-spinner accessibilityLabel={i18n.translate('subscriptions')} />
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
            </s-stack>
          </s-section>
        </s-grid>
      </s-query-container>
    </s-page>
  );
}

function SubscriptionListErrorState() {
  const {i18n} = useExtensionApi();

  return (
    <s-banner tone="critical">
      {i18n.translate('subscriptionList.fetchError')}
    </s-banner>
  );
}
