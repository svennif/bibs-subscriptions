import type {Address} from '@shopify/address';

import type {DeliveryOption, UserError} from 'types';
import {useMemo, useState} from 'preact/hooks';

import {useSelectDeliveryOption} from '../../hooks/useSelectDeliveryOption';
import {
  deliveryOptionIsLocalDelivery,
  deliveryOptionIsLocalPickup,
} from '../../utilities/helpers';

import {InlineAddress} from './components';
import {useExtensionApi} from 'foundation/Api';

interface DeliveryMethodSelectModalProps {
  selectedDeliveryHandle: string;
  address: Address;
  deliveryOptions: DeliveryOption[];
  deliveryOptionsToken?: string;
  subscriptionContractId: string;
  onSelectionChange: (newDeliveryHandle: string) => void;
  onSuccess: () => void;
  onClose: () => void;
}

/**
 * The delivery method step of the delivery modal. Renders its content and its
 * slotted actions as direct children of the parent s-modal.
 */
export function DeliveryMethodSelectModal({
  deliveryOptions,
  address,
  selectedDeliveryHandle,
  deliveryOptionsToken,
  subscriptionContractId,
  onSelectionChange,
  onSuccess,
  onClose,
}: DeliveryMethodSelectModalProps) {
  const {i18n} = useExtensionApi();
  const selectDeliveryOption = useSelectDeliveryOption();

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<UserError[]>([]);

  const [deliveryPhoneNumber, setDeliveryPhoneNumber] = useState<string>(
    address.phone || '',
  );
  const [deliveryInstructions, setDeliveryInstructions] = useState<string>('');

  const selectedDeliveryOption = useMemo(
    () =>
      deliveryOptions.find((option) => option.code === selectedDeliveryHandle),
    [deliveryOptions, selectedDeliveryHandle],
  );

  const displayLocalDeliveryInputs =
    selectedDeliveryOption &&
    deliveryOptionIsLocalDelivery(selectedDeliveryOption);

  const choices = deliveryOptions.map((deliveryOption) => {
    const {code, price, presentmentTitle} = deliveryOption;

    const isLocalPickup = deliveryOptionIsLocalPickup(deliveryOption);
    const choiceTitle = isLocalPickup
      ? i18n.translate('deliveryMethodSelectModal.localPickupOption', {
          location: presentmentTitle,
        })
      : presentmentTitle;

    // if it doesn't have a price it must be free...
    const priceText =
      price && Number(price.amount) !== 0
        ? i18n.formatCurrency(Number(price.amount), {
            currency: price?.currencyCode,
            currencyDisplay: 'narrowSymbol',
          })
        : i18n.translate('deliveryMethodSelectModal.free');

    return (
      <s-choice key={code} value={code} disabled={loading}>
        {choiceTitle}
        <s-stack slot="details" gap="small-300">
          {isLocalPickup
            ? (() => {
                const pickupAddress = {
                  country: deliveryOption.pickupAddress.countryCode,
                  province: deliveryOption.pickupAddress.provinceCode,
                  ...deliveryOption.pickupAddress,
                } as Address;

                return (
                  <InlineAddress address={pickupAddress} color="subdued" />
                );
              })()
            : null}
          <s-text color="subdued">{priceText}</s-text>
        </s-stack>
      </s-choice>
    );
  });

  async function handleSave() {
    if (deliveryOptionsToken && selectedDeliveryOption) {
      setLoading(true);

      const {deliveryMethod, errors} = await selectDeliveryOption(
        selectedDeliveryOption,
        subscriptionContractId,
        deliveryOptionsToken,
        address,
        deliveryPhoneNumber,
        deliveryInstructions,
      );

      setLoading(false);

      if (errors && errors.length > 0) {
        setErrors(errors);
        return;
      }

      if (deliveryMethod) {
        onSuccess();
      }
    }
  }

  const errorMessageDisplay = useMemo(
    () => errors.map(({message}) => message).join('\n'),
    [errors],
  );

  return (
    <>
      <s-stack gap="base">
        {errorMessageDisplay ? (
          <s-banner tone="critical">{errorMessageDisplay}</s-banner>
        ) : null}
        <s-choice-list
          name="deliveryOptionsChoiceList"
          label={i18n.translate('deliveryMethodSelectModal.title')}
          labelAccessibilityVisibility="exclusive"
          values={[selectedDeliveryHandle]}
          onChange={(event: Event) => {
            const [value] =
              (event.currentTarget as HTMLElementTagNameMap['s-choice-list'])
                .values ?? [];
            if (value) {
              onSelectionChange(value);
            }
          }}
        >
          {choices}
        </s-choice-list>
        {displayLocalDeliveryInputs ? (
          <s-stack gap="base">
            <s-phone-field
              value={deliveryPhoneNumber}
              onChange={(event: Event) =>
                setDeliveryPhoneNumber(
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
              label={i18n.translate(
                'deliveryMethodSelectModal.localDeliveryPhoneLabel',
              )}
            />
            <s-text color="subdued">
              {i18n.translate(
                'deliveryMethodSelectModal.localDeliveryPhoneDetails',
              )}
            </s-text>
            <s-text-field
              value={deliveryInstructions}
              onChange={(event: Event) =>
                setDeliveryInstructions(
                  (event.currentTarget as HTMLInputElement).value,
                )
              }
              label={i18n.translate(
                'deliveryMethodSelectModal.localDeliveryInstructionsLabel',
              )}
            />
            <s-text color="subdued">
              {i18n.translate(
                'deliveryMethodSelectModal.localDeliveryInstructionsDetails',
              )}
            </s-text>
          </s-stack>
        ) : null}
      </s-stack>
      <s-button slot="secondary-actions" variant="secondary" onClick={onClose}>
        {i18n.translate('cancel')}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={handleSave}
        loading={loading}
      >
        {i18n.translate('save')}
      </s-button>
    </>
  );
}
