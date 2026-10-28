import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {getButton, mountWithAppContext, queryByHeading} from 'tests/utilities';
import type {CountryCode} from 'generatedTypes/customer.types';

import type {OverviewCardProps} from './OverviewCard';
import {OverviewCard} from './OverviewCard';
import {getDeliveryModalId} from '../DeliveryModal/types';
import {MockAddressFormHooks} from 'tests/mocks/address';

const mockProps: OverviewCardProps = {
  contractId: 'gid://shopify/SubscriptionContract/1',
  deliveryPolicy: {
    interval: 'MONTH',
    intervalCount: {
      count: 1,
      precision: 'EXACT',
    },
  },
  shippingAddress: {
    address1: '150 Elgin Street',
    address2: '8th Floor',
    firstName: 'John',
    lastName: 'Smith',
    city: 'Ottawa',
    province: 'ON',
    country: 'CA' as CountryCode,
    zip: 'K2P1L4',
  },
  status: 'ACTIVE',
  refetchSubscriptionContract: vi.fn(),
};

const DELIVERY_MODAL_ID = getDeliveryModalId(mockProps.contractId);

const {mockExtensionApi, mockCustomerApiGraphQL} = mockApis();

describe('<OverviewCard />', () => {
  beforeEach(() => {
    mockUiExtensionComponents();
    mockExtensionApi();
    MockAddressFormHooks();
    mockCustomerApiGraphQL({});
  });

  it('shows a button to edit the shipping address', async () => {
    await mountWithAppContext(<OverviewCard {...mockProps} />);

    expect(getButton('Edit shipping address')).toBeInTheDocument();
  });

  it('opens the delivery modal when the edit shipping address button is clicked', async () => {
    await mountWithAppContext(<OverviewCard {...mockProps} />);

    const editButton = getButton('Edit shipping address');
    expect(editButton).toHaveAttribute('command', '--show');
    expect(editButton).toHaveAttribute('commandFor', DELIVERY_MODAL_ID);

    const modal = document.getElementById(DELIVERY_MODAL_ID);
    expect(modal?.tagName).toBe('S-MODAL');
    expect(modal).toBe(queryByHeading('Edit shipping address'));
  });

  it('shows a button to edit the pickup address', async () => {
    const mockPropsWithPickupAddress = {
      ...mockProps,
      pickupAddress: mockProps.shippingAddress,
      shippingAddress: undefined,
    };
    await mountWithAppContext(<OverviewCard {...mockPropsWithPickupAddress} />);

    expect(getButton('Edit pickup address')).toBeInTheDocument();
  });

  it('opens the delivery modal when the edit pickup address button is clicked', async () => {
    const mockPropsWithPickupAddress = {
      ...mockProps,
      pickupAddress: mockProps.shippingAddress,
      shippingAddress: undefined,
    };
    await mountWithAppContext(<OverviewCard {...mockPropsWithPickupAddress} />);

    const editButton = getButton('Edit pickup address');
    expect(editButton).toHaveAttribute('command', '--show');
    expect(editButton).toHaveAttribute('commandFor', DELIVERY_MODAL_ID);

    expect(document.getElementById(DELIVERY_MODAL_ID)).toBe(
      queryByHeading('Edit shipping address'),
    );
  });

  it('does not render the delivery modal when renderDeliveryModal is false', async () => {
    await mountWithAppContext(
      <OverviewCard {...mockProps} renderDeliveryModal={false} />,
    );

    expect(getButton('Edit shipping address')).toHaveAttribute(
      'commandFor',
      DELIVERY_MODAL_ID,
    );
    expect(document.getElementById(DELIVERY_MODAL_ID)).toBeNull();
  });

  it('does not show edit buttons or the delivery modal for cancelled contracts', async () => {
    await mountWithAppContext(
      <OverviewCard {...mockProps} status="CANCELLED" />,
    );

    expect(document.querySelector('s-link')).toBeNull();
    expect(document.getElementById(DELIVERY_MODAL_ID)).toBeNull();
  });
});
