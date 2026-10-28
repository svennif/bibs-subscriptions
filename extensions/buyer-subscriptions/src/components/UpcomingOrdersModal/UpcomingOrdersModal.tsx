import {parseGid} from '@shopify/admin-graphql-api-utilities';

import type {BillingCycle} from 'types';

import {useFormatDate} from 'utilities/hooks/useFormatDate';

import {useToggleSkipOrder} from './hooks/useToggleOrderSkipped';
import {useExtensionApi} from 'foundation/Api';

export interface UpcomingOrdersModalProps {
  contractId: string;
  upcomingBillingCycles: BillingCycle[];
  refetchLoading: boolean;
  refetchSubscriptionContract: () => void;
}

export function getUpcomingOrdersModalId(contractId: string) {
  return `upcoming-orders-modal-${parseGid(contractId)}`;
}

export function UpcomingOrdersModal({
  contractId,
  upcomingBillingCycles,
  refetchLoading,
  refetchSubscriptionContract,
}: UpcomingOrdersModalProps) {
  const modalId = getUpcomingOrdersModalId(contractId);
  const {i18n} = useExtensionApi();
  const formatDate = useFormatDate();

  const upcomingBillingCyclesToDisplay = upcomingBillingCycles.slice(
    0,
    upcomingBillingCycles.length - 1,
  );
  const {
    bannerStatus,
    bannerText,
    cycleIndexLoading,
    toggleSkipOrder,
    onCloseModal,
  } = useToggleSkipOrder({
    contractId,
    refetchSubscriptionContract,
    refetchLoading,
  });

  return (
    <s-modal
      id={modalId}
      heading={i18n.translate('upcomingOrdersModal.title')}
      padding="base"
      onHide={onCloseModal}
    >
      <s-stack gap="large">
        {bannerText && bannerStatus && (
          <s-banner tone={bannerStatus}>{bannerText}</s-banner>
        )}
        <s-stack gap="base">
          {upcomingBillingCyclesToDisplay.map(
            ({cycleIndex, skipped, billingAttemptExpectedDate}) => {
              const orderDate = formatDate(billingAttemptExpectedDate);
              return (
                <s-grid
                  key={cycleIndex}
                  gap="base"
                  gridTemplateColumns="1fr auto"
                  alignItems="center"
                >
                  <s-text color={skipped ? 'subdued' : undefined}>
                    {skipped
                      ? ` ${i18n.translate(
                          'upcomingOrdersModal.skippedOrderLabel',
                          {
                            skippedOrderDate: orderDate,
                          },
                        )}`
                      : orderDate}
                  </s-text>
                  <s-button
                    variant="secondary"
                    loading={cycleIndexLoading === cycleIndex}
                    onClick={() => toggleSkipOrder(cycleIndex, skipped)}
                    accessibilityLabel={i18n.translate(
                      skipped
                        ? 'upcomingOrdersModal.unskipOrderAccessibilityLabel'
                        : 'upcomingOrdersModal.skipOrderAccessibilityLabel',
                      {orderDate},
                    )}
                  >
                    {i18n.translate(
                      skipped
                        ? 'upcomingOrdersModal.unSkipOrder'
                        : 'upcomingOrdersModal.skipOrder',
                    )}
                  </s-button>
                </s-grid>
              );
            },
          )}
        </s-stack>
      </s-stack>
      <s-button
        slot="primary-action"
        variant="primary"
        command="--hide"
        commandFor={modalId}
      >
        {i18n.translate('close')}
      </s-button>
    </s-modal>
  );
}
