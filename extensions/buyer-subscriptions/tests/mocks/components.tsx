import type {AddressProps} from 'components/Address';
import {mockHideOverlay} from 'tests/utilities';

// In production, the full province / state is displayed
// since we are mocking the address formatter in tests,
// only the code is displayed
function MockAddress({address}: AddressProps) {
  return (
    <div>
      <s-text>{address.address1}</s-text>
      <s-text>{address.address2}</s-text>
      <s-text>{`${address.city} ${address.province} ${address.zip}`}</s-text>
    </div>
  );
}

/**
 * Polaris web components render as plain elements in happy-dom, so the only
 * things that need mocking are the address formatter (which loads country data
 * over the network) and the overlay methods on s-modal.
 */
export function mockUiExtensionComponents() {
  vi.mock('components/Address', async () => ({
    ...(await vi.importActual('components/Address')),
    Address: (props: any) => <MockAddress {...props} />,
  }));

  return mockHideOverlay();
}
