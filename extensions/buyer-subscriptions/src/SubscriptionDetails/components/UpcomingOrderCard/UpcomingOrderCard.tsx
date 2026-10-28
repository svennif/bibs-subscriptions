import {useState} from 'preact/hooks';
import {isLessThanOneYearAway} from '@shopify/dates';
import type {BillingCycle} from 'types';
import {SkipNextOrderModal, UpcomingOrdersModal} from 'components';
import {getSkipNextOrderModalId} from 'components/SkipNextOrderModal';
import {getUpcomingOrdersModalId} from 'components/UpcomingOrdersModal';
import {getBillingCycleInfo} from 'utilities';
import {useFormatDate} from 'utilities/hooks/useFormatDate';
import {useExtensionApi} from 'foundation/Api';

export interface UpcomingOrderCardProps {
  contractId: string;
  upcomingBillingCycles: BillingCycle[];
  onSkipOrder: () => void;
  refetchSubscriptionContract: () => void;
  refetchLoading: boolean;
  hasInventoryError: boolean;
}

export function UpcomingOrderCard({
  contractId,
  onSkipOrder,
  upcomingBillingCycles,
  refetchSubscriptionContract,
  refetchLoading,
  hasInventoryError,
}: UpcomingOrderCardProps) {
  const {i18n} = useExtensionApi();
  const formatDate = useFormatDate();
  const [showBanner, setShowBanner] = useState(hasInventoryError);

  const {
    nextBillingDate,
    canSkipNextBillingCycle,
    cycleIndexToSkip,
    resumeDateIfNextCycleSkipped,
  } = getBillingCycleInfo(upcomingBillingCycles);

  if (!nextBillingDate) return null;

  const canOpenSkipModal = Boolean(
    canSkipNextBillingCycle && cycleIndexToSkip && resumeDateIfNextCycleSkipped,
  );

  return (
    <s-section>
      <s-stack gap="base">
        {showBanner ? (
          <s-banner
            dismissible
            onDismiss={() => {
              setShowBanner(false);
            }}
          >
            <s-text color="subdued">
              {i18n.translate('overviewCard.inventoryError')}
            </s-text>
          </s-banner>
        ) : null}
        <s-grid gridTemplateColumns="3fr 1fr" alignItems="center">
          <s-stack gap="small">
            <s-heading>{i18n.translate('upcomingOrder')}</s-heading>
            <s-text color="subdued">{formatDate(nextBillingDate)}</s-text>
          </s-stack>
          <s-button
            variant="secondary"
            disabled={!canSkipNextBillingCycle}
            commandFor={
              canOpenSkipModal ? getSkipNextOrderModalId(contractId) : undefined
            }
            command={canOpenSkipModal ? '--show' : undefined}
          >
            {i18n.translate('skip')}
          </s-button>
        </s-grid>
        {canOpenSkipModal ? (
          <SkipNextOrderModal
            contractId={contractId}
            onSkipOrder={onSkipOrder}
            cycleIndexToSkip={cycleIndexToSkip!}
            resumeDate={resumeDateIfNextCycleSkipped!}
          />
        ) : null}
        <s-stack direction="inline">
          <s-link
            commandFor={getUpcomingOrdersModalId(contractId)}
            command="--show"
          >
            {i18n.translate('showUpcomingOrders')}
          </s-link>
        </s-stack>
        <UpcomingOrdersModal
          contractId={contractId}
          refetchSubscriptionContract={refetchSubscriptionContract}
          refetchLoading={refetchLoading}
          upcomingBillingCycles={upcomingBillingCycles}
        />
        {canSkipNextBillingCycle ? null : (
          <s-text color="subdued">
            {isLessThanOneYearAway(new Date(nextBillingDate))
              ? i18n.translate('maxOrdersSkipped')
              : i18n.translate('skipOrderOverYear')}
          </s-text>
        )}
      </s-stack>
    </s-section>
  );
}
