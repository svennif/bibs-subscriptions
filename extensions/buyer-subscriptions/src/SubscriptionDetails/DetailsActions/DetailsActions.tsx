import type {Money, SubscriptionStatus} from 'types';
import {
  PauseSubscriptionModal,
  ResumeSubscriptionModal,
  CancelSubscriptionModal,
} from 'components';
import {getPauseModalId} from 'components/PauseSubscriptionModal';
import {getResumeModalId} from 'components/ResumeSubscriptionModal';
import {getCancelModalId} from 'components/CancelSubscriptionModal';
import {useExtensionApi} from 'foundation/Api';
import {SuccessToastType, useToast} from 'utilities/hooks/useToast';

export interface DetailsActionsProps {
  contractId: string;
  status: SubscriptionStatus;
  nextBillingDate?: string;
  lastOrderPrice?: Money | null;
  nextOrderPrice?: Money | null;
  refetchSubscriptionContract: () => void;
}

/**
 * Page actions for the subscription details page. Renders slotted buttons, so
 * it must be a direct child of s-page.
 */
export function DetailsActions({
  contractId,
  status,
  lastOrderPrice,
  nextOrderPrice,
  refetchSubscriptionContract,
  nextBillingDate,
}: DetailsActionsProps) {
  const {i18n} = useExtensionApi();
  const {showSuccessToast} = useToast();

  function onPauseSubscription() {
    refetchSubscriptionContract();
    showSuccessToast(SuccessToastType.Paused);
  }

  function onResumeSubscription() {
    refetchSubscriptionContract();
    showSuccessToast(SuccessToastType.Resumed);
  }

  function onCancelSubscription() {
    refetchSubscriptionContract();
    showSuccessToast(SuccessToastType.Cancelled);
  }

  if (status === 'CANCELLED') {
    return null;
  }

  return (
    <>
      {status === 'ACTIVE' ? (
        <>
          <s-button
            slot="primary-action"
            commandFor={getPauseModalId(contractId)}
            command="--show"
          >
            {i18n.translate('subscriptionActions.pause')}
          </s-button>
          <PauseSubscriptionModal
            contractId={contractId}
            onPauseSubscription={onPauseSubscription}
          />
        </>
      ) : null}
      {status === 'PAUSED' ? (
        <>
          <s-button
            slot="primary-action"
            commandFor={getResumeModalId(contractId)}
            command="--show"
          >
            {i18n.translate('subscriptionActions.resume')}
          </s-button>
          <ResumeSubscriptionModal
            contractId={contractId}
            resumeDate={nextBillingDate}
            lastOrderPrice={lastOrderPrice}
            nextOrderPrice={nextOrderPrice}
            onResumeSubscription={onResumeSubscription}
          />
        </>
      ) : null}
      <s-button
        slot="secondary-actions"
        commandFor={getCancelModalId(contractId)}
        command="--show"
      >
        {i18n.translate('cancel')}
      </s-button>
      <CancelSubscriptionModal
        contractId={contractId}
        onCancelSubscription={onCancelSubscription}
      />
    </>
  );
}
