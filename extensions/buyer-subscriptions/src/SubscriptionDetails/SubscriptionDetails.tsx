import {getBillingCycleInfo} from 'utilities';

import {useSubscriptionContract} from './hooks/useSubscriptionContract';
import {
  UpcomingOrderCard,
  OverviewCard,
  PastOrdersCard,
  PriceSummaryCard,
  NotFound,
} from './components';
import {OverviewCardDeliveryModal} from './components/OverviewCard';
import {useExtensionApi} from 'foundation/Api';
import {BillingAttemptErrorType} from 'types';
import {useToast, SuccessToastType} from 'utilities/hooks/useToast';
import {DetailsActions} from './DetailsActions';
import {PaymentMethodCard} from './components/PaymentMethodCard';

interface SubscriptionDetailsProps {
  id: string;
}

// Two columns from the "medium" breakpoint of the previous layout
const GRID_COLUMNS = '@container (inline-size > 750px) 7fr 5fr, 1fr';
const SHOW_WHEN_WIDE = '@container (inline-size > 750px) auto, none';
const SHOW_WHEN_NARROW = '@container (inline-size > 750px) none, auto';

export function SubscriptionDetails({id}: SubscriptionDetailsProps) {
  const {data, loading, error, refetchSubscriptionContract, refetchLoading} =
    useSubscriptionContract({id});
  const {i18n} = useExtensionApi();
  const {showSuccessToast} = useToast();

  if (!data?.subscriptionContract && loading) {
    return <SubscriptionDetailsSkeleton />;
  }

  if (error) {
    return <SubscriptionDetailsErrorState />;
  }

  if (data?.subscriptionContract === null || !data) {
    return <NotFound />;
  }

  const {
    id: contractId,
    deliveryPolicy,
    lines,
    orders,
    shippingAddress,
    shippingMethodTitle,
    pickupAddress,
    priceBreakdownEstimate,
    status,
    upcomingBillingCycles,
    lastOrderPrice,
    lastBillingAttemptErrorType,
  } = data.subscriptionContract;

  const {nextBillingDate} = getBillingCycleInfo(upcomingBillingCycles);

  const hasInventoryError =
    (lastBillingAttemptErrorType as BillingAttemptErrorType | null) ===
    BillingAttemptErrorType.InventoryError;

  function onSkipOrder() {
    showSuccessToast(SuccessToastType.Skipped);
    refetchSubscriptionContract();
  }

  const pageTitle =
    status === 'CANCELLED'
      ? i18n.translate('subscriptionDetails')
      : i18n.translate('manageSubscription');

  // The overview card is rendered twice and shown depending on the available
  // width, so its delivery modal is rendered once below instead.
  const overviewCard = (
    <OverviewCard
      contractId={contractId}
      deliveryPolicy={deliveryPolicy}
      shippingAddress={shippingAddress}
      shippingMethodTitle={shippingMethodTitle}
      pickupAddress={pickupAddress}
      status={status}
      refetchSubscriptionContract={refetchSubscriptionContract}
      renderDeliveryModal={false}
    />
  );

  return (
    <s-page heading={pageTitle}>
      <s-button
        slot="breadcrumb-actions"
        href="extension:/"
        accessibilityLabel="Go back to subscription list"
      />
      <DetailsActions
        contractId={contractId}
        status={status}
        refetchSubscriptionContract={refetchSubscriptionContract}
        lastOrderPrice={lastOrderPrice}
        nextOrderPrice={priceBreakdownEstimate?.totalPrice}
        nextBillingDate={nextBillingDate}
      />
      <s-query-container>
        <s-grid gridTemplateColumns={GRID_COLUMNS} gap="large">
          <s-stack gap="large">
            {status === 'ACTIVE' || hasInventoryError ? (
              <UpcomingOrderCard
                onSkipOrder={onSkipOrder}
                refetchSubscriptionContract={refetchSubscriptionContract}
                refetchLoading={refetchLoading}
                contractId={contractId}
                upcomingBillingCycles={upcomingBillingCycles}
                hasInventoryError={hasInventoryError}
              />
            ) : null}
            <s-box display={SHOW_WHEN_WIDE}>{overviewCard}</s-box>
          </s-stack>
          <s-stack gap="large">
            {priceBreakdownEstimate ? (
              <PriceSummaryCard price={priceBreakdownEstimate} lines={lines} />
            ) : null}
            <s-box display={SHOW_WHEN_NARROW}>{overviewCard}</s-box>
            <PaymentMethodCard contractId={contractId} status={status} />
            <PastOrdersCard orders={orders} />
          </s-stack>
        </s-grid>
      </s-query-container>
      <OverviewCardDeliveryModal
        contractId={contractId}
        shippingAddress={shippingAddress}
        pickupAddress={pickupAddress}
        status={status}
        refetchSubscriptionContract={refetchSubscriptionContract}
      />
    </s-page>
  );
}

function SubscriptionDetailsSkeleton() {
  return (
    <s-page heading="">
      <s-query-container>
        <s-grid gridTemplateColumns={GRID_COLUMNS} gap="large">
          <s-stack gap="large">
            <s-section>
              <s-skeleton-paragraph />
            </s-section>
            <s-section>
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
            </s-section>
          </s-stack>
          <s-stack gap="large">
            <s-section>
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
            </s-section>
            <s-section>
              <s-skeleton-paragraph />
              <s-skeleton-paragraph />
            </s-section>
          </s-stack>
        </s-grid>
      </s-query-container>
    </s-page>
  );
}

function SubscriptionDetailsErrorState() {
  const {i18n} = useExtensionApi();

  return (
    <s-banner tone="critical">
      {i18n.translate('subscriptionDetailsError')}
    </s-banner>
  );
}
