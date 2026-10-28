import {useExtensionApi} from 'foundation/Api';
export function NotFound() {
  const {i18n} = useExtensionApi();
  return (
    <s-section>
      <s-stack alignItems="center">
        <s-heading>{i18n.translate('notFound.title')}</s-heading>
        <s-text>{i18n.translate('notFound.description')}</s-text>
      </s-stack>
    </s-section>
  );
}
