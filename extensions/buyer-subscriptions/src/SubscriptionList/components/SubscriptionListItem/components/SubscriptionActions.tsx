import {
  PauseSubscriptionModal,
  SkipNextOrderModal,
  ResumeSubscriptionModal,
} from 'components';
import {getPauseModalId} from 'components/PauseSubscriptionModal';
import {getSkipNextOrderModalId} from 'components/SkipNextOrderModal';
import {getResumeModalId} from 'components/ResumeSubscriptionModal';
import {useExtensionApi} from 'foundation/Api';
import type {Money, SubscriptionStatus} from 'types';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {SuccessToastType, useToast} from 'utilities/hooks/useToast';

export interface SubscriptionActionsProps {
  id: string;
  status: SubscriptionStatus;
  resumeDate?: string | null;
  resumeDateIfNextCycleSkipped?: string | null;
  cycleIndexToSkip?: number | null;
  lastOrderPrice?: Money | null;
  nextOrderPrice?: Money | null;
  refetchSubscriptionListData: () => void;
}

export function getSubscriptionActionsMenuId(contractId: string) {
  return `subscription-actions-menu-${parseGid(contractId)}`;
}

export function SubscriptionActions({
  id,
  status,
  resumeDate,
  resumeDateIfNextCycleSkipped,
  cycleIndexToSkip,
  lastOrderPrice,
  nextOrderPrice,
  refetchSubscriptionListData,
}: SubscriptionActionsProps) {
  const {i18n} = useExtensionApi();

  const {showSuccessToast} = useToast();

  const subscriptionDetailsUrl = `extension:/subscriptions/${parseGid(id)}`;
  const menuId = getSubscriptionActionsMenuId(id);

  const viewDetailsButton = (
    <s-button variant="secondary" href={subscriptionDetailsUrl}>
      {i18n.translate('subscriptionActions.viewSubscriptionDetails')}
    </s-button>
  );

  if (!['ACTIVE', 'PAUSED'].includes(status)) {
    return viewDetailsButton;
  }

  function onSkipOrder() {
    showSuccessToast(SuccessToastType.Skipped);
    refetchSubscriptionListData();
  }

  function onPauseSubscription() {
    showSuccessToast(SuccessToastType.Paused);
    refetchSubscriptionListData();
  }

  function onResumeSubscription() {
    showSuccessToast(SuccessToastType.Resumed);
    refetchSubscriptionListData();
  }

  const canSkip = Boolean(cycleIndexToSkip && resumeDateIfNextCycleSkipped);

  return (
    <>
      <s-stack direction="inline" gap="small">
        {viewDetailsButton}
        <s-button variant="secondary" commandFor={menuId}>
          {i18n.translate('subscriptionActions.manage')}
        </s-button>
      </s-stack>
      <s-menu
        id={menuId}
        accessibilityLabel={i18n.translate('subscriptionActions.manage')}
      >
        {status === 'ACTIVE' && canSkip ? (
          <s-button command="--show" commandFor={getSkipNextOrderModalId(id)}>
            {i18n.translate('subscriptionActions.skip')}
          </s-button>
        ) : null}
        {status === 'ACTIVE' ? (
          <s-button command="--show" commandFor={getPauseModalId(id)}>
            {i18n.translate('subscriptionActions.pause')}
          </s-button>
        ) : null}
        {status === 'PAUSED' ? (
          <s-button command="--show" commandFor={getResumeModalId(id)}>
            {i18n.translate('subscriptionActions.resume')}
          </s-button>
        ) : null}
      </s-menu>
      {status === 'ACTIVE' && canSkip ? (
        <SkipNextOrderModal
          contractId={id}
          onSkipOrder={onSkipOrder}
          resumeDate={resumeDateIfNextCycleSkipped!}
          cycleIndexToSkip={cycleIndexToSkip!}
        />
      ) : null}
      {status === 'ACTIVE' ? (
        <PauseSubscriptionModal
          contractId={id}
          onPauseSubscription={onPauseSubscription}
        />
      ) : null}
      {status === 'PAUSED' ? (
        <ResumeSubscriptionModal
          contractId={id}
          resumeDate={resumeDate}
          lastOrderPrice={lastOrderPrice}
          nextOrderPrice={nextOrderPrice}
          onResumeSubscription={onResumeSubscription}
        />
      ) : null}
    </>
  );
}
