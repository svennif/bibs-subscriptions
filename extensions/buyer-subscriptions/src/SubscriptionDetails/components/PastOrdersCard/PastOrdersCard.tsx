import {parseGid} from '@shopify/admin-graphql-api-utilities';
import {useExtensionApi} from 'foundation/Api';

import {useFormatDate} from 'utilities/hooks/useFormatDate';

interface Order {
  id: string;
  createdAt: string;
}

export interface PastOrdersCardProps {
  orders: Order[];
}

export function PastOrdersCard({orders}: PastOrdersCardProps) {
  const {i18n} = useExtensionApi();
  const formatDate = useFormatDate();

  return (
    <s-section heading={i18n.translate('pastOrdersCard.pastOrders')}>
      <s-stack gap="small">
        {orders.map(({id, createdAt}) => (
          <s-grid key={id} gridTemplateColumns="1fr auto">
            <s-text>{formatDate(createdAt)}</s-text>
            <s-link href={`shopify:/customer-account/orders/${parseGid(id)}`}>
              {i18n.translate('pastOrdersCard.view')}
            </s-link>
          </s-grid>
        ))}
      </s-stack>
    </s-section>
  );
}
