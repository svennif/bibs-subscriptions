import {parseGid} from '@shopify/admin-graphql-api-utilities';

export function getDeliveryModalId(contractId: string) {
  return `delivery-modal-${parseGid(contractId)}`;
}
