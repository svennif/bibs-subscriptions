import {useRef, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import type {Money} from 'types';
import {useFormatDate} from 'utilities/hooks/useFormatDate';

import ActivateSubscriptionContractMutation from './graphql/ActivateSubscriptionMutation';

import type {
  ActivateSubscriptionContractMutation as ActivateSubscriptionContractMutationData,
  ActivateSubscriptionContractMutationVariables,
} from 'generatedTypes/customer.generated';
import {useExtensionApi, useGraphqlApi, useAppRequest} from 'foundation/Api';

interface ResumeSubscriptionModalProps {
  contractId: string;
  resumeDate?: string | null;
  lastOrderPrice?: Money | null;
  nextOrderPrice?: Money | null;
  onResumeSubscription: () => void;
}

export function getResumeModalId(contractId: string) {
  return `resume-subscription-modal-${parseGid(contractId)}`;
}

export function ResumeSubscriptionModal({
  contractId,
  resumeDate,
  lastOrderPrice,
  nextOrderPrice,
  onResumeSubscription,
}: ResumeSubscriptionModalProps) {
  const modalId = getResumeModalId(contractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);
  const {i18n} = useExtensionApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const formatDate = useFormatDate();
  const sendRequest = useAppRequest();

  const [activateSubscriptionContract] = useGraphqlApi<
    ActivateSubscriptionContractMutationData,
    ActivateSubscriptionContractMutationVariables
  >();

  const showPriceChanged =
    lastOrderPrice &&
    nextOrderPrice &&
    lastOrderPrice.amount !== nextOrderPrice.amount;

  function clearErrorState() {
    setError(false);
    setErrorMessage(undefined);
  }

  async function handleResumeSubscription() {
    setLoading(true);
    const result = await activateSubscriptionContract(
      ActivateSubscriptionContractMutation,
      {
        subscriptionContractId: contractId,
      },
    );

    if (result?.subscriptionContractActivate?.contract?.status !== 'ACTIVE') {
      setError(true);

      if (result?.subscriptionContractActivate?.userErrors?.length) {
        setErrorMessage(
          result?.subscriptionContractActivate?.userErrors[0].message,
        );
      }

      setLoading(false);
      return;
    }

    modalRef.current?.hideOverlay();
    clearErrorState();
    setLoading(false);
    onResumeSubscription();
    sendRequest({contractId, operationName: 'RESUME'});
  }

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={i18n.translate('resumeSubscriptionModal.title')}
      padding="base"
      onHide={clearErrorState}
    >
      <s-stack gap="large">
        {error ? (
          <s-banner
            tone="critical"
            heading={i18n.translate('resumeSubscriptionModal.errorBannerTitle')}
          >
            {errorMessage}
          </s-banner>
        ) : null}
        <s-paragraph>
          {resumeDate
            ? i18n.translate('resumeSubscriptionModal.descriptionWithDate', {
                date: formatDate(resumeDate),
              })
            : i18n.translate('resumeSubscriptionModal.description')}
          {showPriceChanged
            ? ` ${i18n.translate(
                'resumeSubscriptionModal.descriptionPriceChanged',
                {
                  price: i18n.formatCurrency(Number(nextOrderPrice.amount), {
                    currency: nextOrderPrice.currencyCode,
                    currencyDisplay: 'narrowSymbol',
                  }),
                },
              )}`
            : ''}
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
        onClick={handleResumeSubscription}
      >
        {i18n.translate('resumeSubscriptionModal.continue')}
      </s-button>
    </s-modal>
  );
}
