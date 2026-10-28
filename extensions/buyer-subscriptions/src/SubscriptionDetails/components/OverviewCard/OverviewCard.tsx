import type {Address as AddressType} from '@shopify/address';
import {Address} from 'components';
import type {DeliveryPolicy, SubscriptionStatus} from 'types';

import {useExtensionApi} from 'foundation/Api';
import {DeliveryModal} from '../DeliveryModal';
import {getDeliveryModalId} from '../DeliveryModal/types';
import {createBlankAddress} from '../DeliveryModal/utilities/helpers';
import type {CountryCode} from 'generatedTypes/customer.types';

export interface OverviewCardProps {
  contractId: string;
  deliveryPolicy: DeliveryPolicy;
  shippingAddress?: AddressType;
  shippingMethodTitle?: string | null;
  pickupAddress?: AddressType | null;
  status: SubscriptionStatus;
  refetchSubscriptionContract: () => void;
  /**
   * Set to false when the card is rendered more than once (for different
   * viewport sizes), and render `OverviewCardDeliveryModal` a single time
   * outside of the cards instead.
   */
  renderDeliveryModal?: boolean;
}

export function OverviewCard({
  contractId,
  deliveryPolicy,
  shippingAddress,
  shippingMethodTitle,
  pickupAddress,
  status,
  refetchSubscriptionContract,
  renderDeliveryModal = true,
}: OverviewCardProps) {
  const {i18n} = useExtensionApi();
  const isCancelled = status === 'CANCELLED';
  const deliveryModalId = getDeliveryModalId(contractId);

  return (
    <s-section>
      <s-query-container>
        <s-grid
          gridTemplateColumns="@container (inline-size > 500px) 1fr 1fr, 1fr"
          gap="large"
          alignItems="start"
        >
          <s-stack gap="small">
            <s-text type="strong">
              {i18n.translate('overviewCard.deliveryFrequency')}
            </s-text>
            <s-text>
              {i18n.translate(
                `deliveryInterval.${deliveryPolicy.interval.toLowerCase()}.${
                  deliveryPolicy.intervalCount?.count === 1 ? 'one' : 'other'
                }`,
                deliveryPolicy.intervalCount?.count === 1
                  ? undefined
                  : {
                      count: deliveryPolicy.intervalCount?.count,
                    },
              )}
            </s-text>
          </s-stack>

          {shippingAddress ? (
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-text type="strong">
                  {i18n.translate('overviewCard.shippingAddress')}
                </s-text>
                {!isCancelled ? (
                  <s-link
                    accessibilityLabel={i18n.translate(
                      'overviewCard.editShippingAddressButtonLabel',
                    )}
                    commandFor={deliveryModalId}
                    command="--show"
                  >
                    <s-icon type="edit" size="small" />
                  </s-link>
                ) : null}
              </s-stack>
              <Address address={shippingAddress} />
            </s-stack>
          ) : null}
          {pickupAddress ? (
            <s-stack gap="small">
              <s-stack direction="inline" gap="small" alignItems="center">
                <s-text type="strong">
                  {i18n.translate('overviewCard.pickupLocation')}
                </s-text>
                {!isCancelled ? (
                  <s-link
                    accessibilityLabel={i18n.translate(
                      'overviewCard.editPickupAddressButtonLabel',
                    )}
                    commandFor={deliveryModalId}
                    command="--show"
                  >
                    <s-icon type="edit" size="small" />
                  </s-link>
                ) : null}
              </s-stack>
              <Address address={pickupAddress} />
            </s-stack>
          ) : null}

          {shippingMethodTitle ? (
            <s-stack gap="small">
              <s-text type="strong">
                {i18n.translate('overviewCard.shippingMethod')}
              </s-text>
              <s-text>{shippingMethodTitle}</s-text>
            </s-stack>
          ) : null}
        </s-grid>
      </s-query-container>
      {renderDeliveryModal ? (
        <OverviewCardDeliveryModal
          contractId={contractId}
          shippingAddress={shippingAddress}
          pickupAddress={pickupAddress}
          status={status}
          refetchSubscriptionContract={refetchSubscriptionContract}
        />
      ) : null}
    </s-section>
  );
}

export type OverviewCardDeliveryModalProps = Pick<
  OverviewCardProps,
  | 'contractId'
  | 'shippingAddress'
  | 'pickupAddress'
  | 'status'
  | 'refetchSubscriptionContract'
>;

/**
 * The modal opened by the edit buttons in OverviewCard.
 */
export function OverviewCardDeliveryModal({
  contractId,
  shippingAddress,
  pickupAddress,
  status,
  refetchSubscriptionContract,
}: OverviewCardDeliveryModalProps) {
  if (status === 'CANCELLED') {
    return null;
  }

  const currentAddress = shippingAddress
    ? shippingAddress
    : pickupAddress
      ? createBlankAddress(pickupAddress.country as CountryCode)
      : null;

  if (!currentAddress) {
    return null;
  }

  return (
    <DeliveryModal
      currentAddress={currentAddress}
      subscriptionContractId={contractId}
      refetchSubscriptionContract={refetchSubscriptionContract}
    />
  );
}
