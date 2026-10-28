import {useRef, useState} from 'preact/hooks';
import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {useExtensionApi} from 'foundation/Api';

export function getPaymentMethodModalId(contractId: string) {
  return `payment-method-modal-${parseGid(contractId)}`;
}

interface PaymentMethodUpdateModalProps {
  contractId: string;
  sendUpdateEmail: () => Promise<boolean>;
  onEmailSent: () => void;
}

export function PaymentMethodUpdateModal({
  contractId,
  sendUpdateEmail,
  onEmailSent,
}: PaymentMethodUpdateModalProps) {
  const modalId = getPaymentMethodModalId(contractId);
  const modalRef = useRef<HTMLElementTagNameMap['s-modal']>(null);
  const {i18n} = useExtensionApi();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  async function handleSendLink() {
    setLoading(true);
    const sent = await sendUpdateEmail();
    setLoading(false);

    if (!sent) {
      setError(true);
      return;
    }

    setError(false);
    modalRef.current?.hideOverlay();
    onEmailSent();
  }

  return (
    <s-modal
      ref={modalRef}
      id={modalId}
      heading={i18n.translate('paymentModal.title')}
      padding="base"
      onHide={() => setError(false)}
    >
      <s-stack gap="large">
        {error ? (
          <s-banner
            tone="critical"
            heading={i18n.translate('paymentModal.errorBannerTitle')}
          />
        ) : null}
        <s-paragraph>
          {i18n.translate('paymentModal.emailDescription')}
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
        onClick={handleSendLink}
      >
        {i18n.translate('paymentModal.sendLink')}
      </s-button>
    </s-modal>
  );
}
