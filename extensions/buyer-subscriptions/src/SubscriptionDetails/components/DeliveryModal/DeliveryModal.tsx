import {useCallback, useRef, useState} from 'preact/hooks';
import type {Address} from '@shopify/address';
import type {DeliveryOption, UserError} from 'types';

import {DeliveryMethodSelectModal, AddressModal} from './components';
import {useFetchDeliveryOptions} from './hooks/useFetchDeliveryOptions';
import {getDeliveryModalId} from './types';
import {useExtensionApi} from 'foundation/Api';
import {SuccessToastType, useToast} from 'utilities/hooks/useToast';

enum DeliveryModalState {
  AddressInput = 0,
  DeliveryMethodSelect = 1,
}

interface DeliveryModalProps {
  currentAddress: Address;
  subscriptionContractId: string;
  refetchSubscriptionContract: () => void;
}

export function DeliveryModal({
  currentAddress,
  subscriptionContractId,
  refetchSubscriptionContract,
}: DeliveryModalProps) {
  const {i18n} = useExtensionApi();
  const modalId = getDeliveryModalId(subscriptionContractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);

  // Countries are only loaded once the modal has been opened
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<DeliveryModalState>(
    DeliveryModalState.AddressInput,
  );
  const [newAddress, setNewAddress] = useState<Address>(currentAddress);
  const [errors, setErrors] = useState<UserError[]>([]);
  const [deliveryOptions, setDeliveryOptions] = useState<DeliveryOption[]>([]);
  const [token, setToken] = useState<string>();
  const [selectedDeliveryHandle, setSelectedDeliveryHandle] =
    useState<string>();
  const {showSuccessToast} = useToast();

  const getDeliveryOptions = useFetchDeliveryOptions();

  const handleAddressChange = useCallback((newValue: Partial<Address>) => {
    setNewAddress((cur) => ({...cur, ...newValue}));
  }, []);

  // The modal stays mounted between openings, so start from the contract's
  // current address every time it is shown.
  const resetModal = useCallback(() => {
    setNewAddress(currentAddress);
    setErrors([]);
    setModalState(DeliveryModalState.AddressInput);
  }, [currentAddress]);

  const handleShow = useCallback(() => {
    resetModal();
    setAddressModalOpen(true);
  }, [resetModal]);

  const closeModal = useCallback(() => {
    modalRef.current?.hideOverlay();
  }, []);

  const onSuccess = useCallback(() => {
    showSuccessToast(SuccessToastType.DeliveryUpdated);
    closeModal();
    refetchSubscriptionContract();
  }, [closeModal, refetchSubscriptionContract, showSuccessToast]);

  const handleAddressSave = useCallback(async () => {
    setLoading(true);

    const {
      deliveryOptions,
      deliveryOptionsToken,
      errors: deliveryOptionErrors,
    } = await getDeliveryOptions(newAddress, subscriptionContractId);

    setLoading(false);

    if (deliveryOptionErrors.length === 0 && deliveryOptions.length > 0) {
      setDeliveryOptions(deliveryOptions);
      setSelectedDeliveryHandle(deliveryOptions[0].code);
      setModalState(DeliveryModalState.DeliveryMethodSelect);
      setToken(deliveryOptionsToken);
    }

    setErrors(deliveryOptionErrors);
  }, [getDeliveryOptions, newAddress, subscriptionContractId]);

  const modalContent = (() => {
    switch (modalState) {
      case DeliveryModalState.AddressInput:
        return (
          <AddressModal
            address={newAddress}
            addressModalOpen={addressModalOpen}
            errors={errors}
            handleAddressChange={handleAddressChange}
            onSave={handleAddressSave}
            onClose={closeModal}
            loading={loading}
          />
        );
      case DeliveryModalState.DeliveryMethodSelect:
        return (
          <DeliveryMethodSelectModal
            selectedDeliveryHandle={selectedDeliveryHandle ?? ''}
            address={newAddress}
            deliveryOptionsToken={token}
            deliveryOptions={deliveryOptions}
            subscriptionContractId={subscriptionContractId}
            onSelectionChange={setSelectedDeliveryHandle}
            onClose={resetModal}
            onSuccess={onSuccess}
          />
        );
    }
  })();

  const modalTitle = i18n.translate(
    modalState === DeliveryModalState.AddressInput
      ? 'addressModal.title'
      : 'deliveryMethodSelectModal.title',
  );

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      padding="base"
      heading={modalTitle}
      onShow={handleShow}
    >
      {modalContent}
    </s-modal>
  );
}
