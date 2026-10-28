import {useRef, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {useGraphqlApi, useExtensionApi} from 'foundation/Api';

import CancelSubscriptionMutation from './graphql/CancelSubscriptionMutation';
import type {
  CancelSubscriptionContractMutation as CancelSubscriptionContractMutationData,
  CancelSubscriptionContractMutationVariables,
} from 'generatedTypes/customer.generated';

interface CancelSubscriptionModalProps {
  contractId: string;
  onCancelSubscription: () => void;
}

export function getCancelModalId(contractId: string) {
  return `cancel-subscription-modal-${parseGid(contractId)}`;
}

export function CancelSubscriptionModal({
  contractId,
  onCancelSubscription,
}: CancelSubscriptionModalProps) {
  const modalId = getCancelModalId(contractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const {i18n} = useExtensionApi();

  const [cancelSubscriptionContract] = useGraphqlApi<
    CancelSubscriptionContractMutationData,
    CancelSubscriptionContractMutationVariables
  >();

  function clearErrorState() {
    setError(false);
    setErrorMessage(undefined);
  }

  async function handleCancelSubscription() {
    setLoading(true);
    const result = await cancelSubscriptionContract(
      CancelSubscriptionMutation,
      {
        subscriptionContractId: contractId,
      },
    );

    if (result?.subscriptionContractCancel?.contract?.status !== 'CANCELLED') {
      setError(true);

      if (result?.subscriptionContractCancel?.userErrors?.length) {
        setErrorMessage(
          result?.subscriptionContractCancel?.userErrors[0].message,
        );
      }

      setLoading(false);
      return;
    }

    clearErrorState();
    setLoading(false);
    modalRef.current?.hideOverlay();
    onCancelSubscription();
  }

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={i18n.translate('cancelSubscriptionModal.title')}
      padding="base"
      onHide={clearErrorState}
    >
      <s-stack gap="large">
        {error ? (
          <s-banner
            tone="critical"
            heading={i18n.translate('cancelSubscriptionModal.errorBannerTitle')}
          >
            {errorMessage}
          </s-banner>
        ) : null}
        <s-paragraph>
          {i18n.translate('cancelSubscriptionModal.description')}
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
        tone="critical"
        loading={loading}
        onClick={handleCancelSubscription}
      >
        {i18n.translate('cancelSubscriptionModal.action')}
      </s-button>
    </s-modal>
  );
}
