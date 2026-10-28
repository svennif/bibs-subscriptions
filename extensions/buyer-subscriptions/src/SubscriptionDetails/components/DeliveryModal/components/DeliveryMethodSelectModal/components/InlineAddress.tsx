import type {Address} from '@shopify/address';
import {useFormattedAddress} from 'components/Address';

export interface InlineAddressProps {
  address: Address;
  color?: 'base' | 'subdued';
}

export function InlineAddress({address, color}: InlineAddressProps) {
  const formattedAddress = useFormattedAddress(address);
  const inlineAddress = formattedAddress?.join(', ');

  if (!inlineAddress) {
    return null;
  }

  return <s-text color={color}>{inlineAddress}</s-text>;
}
