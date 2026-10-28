import {useExtensionApi} from 'foundation/Api';

export function SubscriptionListEmptyState() {
  const {i18n} = useExtensionApi();

  return (
    <s-page heading={i18n.translate('subscriptions')}>
      <s-section>
        <s-stack alignItems="center" gap="base">
          <s-heading>{i18n.translate('emptyState.title')}</s-heading>
          <s-text>{i18n.translate('emptyState.description')}</s-text>
        </s-stack>
      </s-section>
    </s-page>
  );
}
