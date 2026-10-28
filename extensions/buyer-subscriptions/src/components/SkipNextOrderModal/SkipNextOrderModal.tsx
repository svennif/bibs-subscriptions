import {useRef, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {useFormatDate} from 'utilities/hooks/useFormatDate';

import SkipBillingCycleMutation from './graphql/SkipBillingCycleMutation';

import type {
  SkipBillingCycleMutation as SkipBillingCycleMutationData,
  SkipBillingCycleMutationVariables,
} from 'generatedTypes/customer.generated';
import {useExtensionApi, useGraphqlApi} from 'foundation/Api';

export interface SkipNextOrderModalProps {
  contractId: string;
  cycleIndexToSkip: number;
  resumeDate: string;
  onSkipOrder: () => void;
}

export function getSkipNextOrderModalId(contractId: string) {
  return `skip-next-order-modal-${parseGid(contractId)}`;
}

export function SkipNextOrderModal({
  contractId,
  cycleIndexToSkip,
  resumeDate,
  onSkipOrder,
}: SkipNextOrderModalProps) {
  const modalId = getSkipNextOrderModalId(contractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);
  const {i18n} = useExtensionApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [skipBillingCycle] = useGraphqlApi<
    SkipBillingCycleMutationData,
    SkipBillingCycleMutationVariables
  >();

  const formatDate = useFormatDate();

  function clearErrorState() {
    setError(false);
    setErrorMessage(undefined);
  }

  async function handleSkipNextOrder() {
    setLoading(true);
    const result = await skipBillingCycle(SkipBillingCycleMutation, {
      subscriptionContractId: contractId,
      billingCycleIndex: cycleIndexToSkip,
    });

    if (!result?.subscriptionBillingCycleSkip?.billingCycle?.skipped) {
      setError(true);

      if (result?.subscriptionBillingCycleSkip?.userErrors?.length) {
        setErrorMessage(
          result?.subscriptionBillingCycleSkip?.userErrors[0].message,
        );
      }

      setLoading(false);
      return;
    }

    clearErrorState();
    setLoading(false);
    modalRef.current?.hideOverlay();
    onSkipOrder();
  }

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={i18n.translate('skipNextOrder.text')}
      padding="base"
      onHide={clearErrorState}
    >
      <s-stack gap="large">
        {error && (
          <s-banner
            tone="critical"
            heading={i18n.translate('skipNextOrder.errorBannerTitle')}
          >
            {errorMessage}
          </s-banner>
        )}
        <s-paragraph>
          {resumeDate
            ? i18n.translate('skipNextOrder.date', {
                date: formatDate(resumeDate),
              })
            : i18n.translate('skipNextOrder.generic')}
        </s-paragraph>
      </s-stack>
      <s-button
        slot="secondary-actions"
        variant="secondary"
        command="--hide"
        commandFor={modalId}
      >
        {i18n.translate('close')}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        loading={loading}
        onClick={handleSkipNextOrder}
      >
        {i18n.translate('skip')}
      </s-button>
    </s-modal>
  );
}
