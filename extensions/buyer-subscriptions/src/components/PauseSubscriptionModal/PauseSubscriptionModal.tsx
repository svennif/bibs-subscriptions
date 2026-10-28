import {useRef, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';

import type {
  PauseSubscriptionContractMutation as PauseSubscriptionContractMutationData,
  PauseSubscriptionContractMutationVariables,
} from 'generatedTypes/customer.generated';
import PauseSubscriptionContractMutation from './graphql/PauseSubscriptionContractMutation';
import {useExtensionApi, useGraphqlApi, useAppRequest} from 'foundation/Api';

interface PauseSubscriptionModalProps {
  contractId: string;
  onPauseSubscription: () => void;
}

export function getPauseModalId(contractId: string) {
  return `pause-subscription-modal-${parseGid(contractId)}`;
}

export function PauseSubscriptionModal({
  contractId,
  onPauseSubscription,
}: PauseSubscriptionModalProps) {
  const modalId = getPauseModalId(contractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);
  const [loading, setLoading] = useState(false);
  const {i18n} = useExtensionApi();
  const sendRequest = useAppRequest();
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const [pauseSubscriptionContract] = useGraphqlApi<
    PauseSubscriptionContractMutationData,
    PauseSubscriptionContractMutationVariables
  >();

  function clearErrorState() {
    setError(false);
    setErrorMessage(undefined);
  }

  async function handlePauseSubscription() {
    setLoading(true);
    const result = await pauseSubscriptionContract(
      PauseSubscriptionContractMutation,
      {
        subscriptionContractId: contractId,
      },
    );

    if (result?.subscriptionContractPause?.contract?.status !== 'PAUSED') {
      setError(true);

      if (result?.subscriptionContractPause?.userErrors?.length) {
        setErrorMessage(
          result?.subscriptionContractPause?.userErrors[0].message,
        );
      }

      setLoading(false);
      return;
    }

    setLoading(false);
    clearErrorState();
    modalRef.current?.hideOverlay();

    onPauseSubscription();
    sendRequest({contractId, operationName: 'PAUSE'});
  }

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={i18n.translate('pauseSubscriptionModal.title')}
      padding="base"
      onHide={clearErrorState}
    >
      <s-stack gap="large">
        {error ? (
          <s-banner
            tone="critical"
            heading={i18n.translate('pauseSubscriptionModal.errorBannerTitle')}
          >
            {errorMessage}
          </s-banner>
        ) : null}
        <s-paragraph>
          {i18n.translate('pauseSubscriptionModal.description')}
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
        onClick={handlePauseSubscription}
      >
        {i18n.translate('pauseSubscriptionModal.action')}
      </s-button>
    </s-modal>
  );
}
