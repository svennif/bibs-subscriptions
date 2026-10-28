import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  clickButton,
  getButton,
  mountWithAppContext,
  queryByHeading,
} from 'tests/utilities';
import {waitFor} from '@testing-library/preact';

import type {SkipNextOrderModalProps} from '../SkipNextOrderModal';
import {
  getSkipNextOrderModalId,
  SkipNextOrderModal,
} from '../SkipNextOrderModal';

const {mockExtensionApi, mockCustomerApiGraphQL} = mockApis();

const defaultProps: SkipNextOrderModalProps = {
  contractId: 'gid://shopify/SubscriptionContract/1',
  cycleIndexToSkip: 2,
  resumeDate: '2021-01-01',
  onSkipOrder: vi.fn(),
};

const SKIP_NEXT_ORDER_MODAL_ID = getSkipNextOrderModalId(
  defaultProps.contractId,
);

describe('<SkipNextOrderModal />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('renders with a skip and close button', async () => {
    await mountWithAppContext(<SkipNextOrderModal {...defaultProps} />);

    expect(queryByHeading('Skip next order')).toBeInTheDocument();
    expect(getButton('Skip')).toBeInTheDocument();
    expect(getButton('Close')).toBeInTheDocument();
  });

  it('uses a modal id that is unique to the contract', async () => {
    await mountWithAppContext(<SkipNextOrderModal {...defaultProps} />);

    expect(document.getElementById(SKIP_NEXT_ORDER_MODAL_ID)?.tagName).toBe(
      'S-MODAL',
    );
    expect(SKIP_NEXT_ORDER_MODAL_ID).toBe('skip-next-order-modal-1');
  });

  it('closes the modal from the close button', async () => {
    await mountWithAppContext(<SkipNextOrderModal {...defaultProps} />);

    const closeButton = getButton('Close');
    expect(closeButton).toHaveAttribute('command', '--hide');
    expect(closeButton).toHaveAttribute('commandFor', SKIP_NEXT_ORDER_MODAL_ID);
  });

  it('calls onSkipOrder and closes the modal after successfully skipping an order', async () => {
    const onSkipOrderSpy = vi.fn();

    mockSkipBillingCycleMutation({success: true});

    await mountWithAppContext(
      <SkipNextOrderModal {...defaultProps} onSkipOrder={onSkipOrderSpy} />,
    );

    await clickButton('Skip');

    expect(overlays.hiddenOverlayIds()).toEqual([SKIP_NEXT_ORDER_MODAL_ID]);
    expect(onSkipOrderSpy).toHaveBeenCalled();
  });

  it('does not call onSkipOrder or close the modal after failing to skip an order', async () => {
    const onSkipOrderSpy = vi.fn();

    mockSkipBillingCycleMutation({success: false});

    await mountWithAppContext(
      <SkipNextOrderModal {...defaultProps} onSkipOrder={onSkipOrderSpy} />,
    );

    await clickButton('Skip');

    expect(onSkipOrderSpy).not.toHaveBeenCalled();
    expect(overlays.hideOverlay).not.toHaveBeenCalled();
  });

  it('does not render an error banner by default', async () => {
    mockSkipBillingCycleMutation({success: true});

    await mountWithAppContext(<SkipNextOrderModal {...defaultProps} />);

    expect(queryByHeading('Unable to skip next order')).not.toBeInTheDocument();
  });

  it('renders an error banner when there is an error', async () => {
    mockSkipBillingCycleMutation({success: false});
    await mountWithAppContext(<SkipNextOrderModal {...defaultProps} />);

    await clickButton('Skip');

    await waitFor(() => {
      expect(queryByHeading('Unable to skip next order')).toBeInTheDocument();
    });
  });
});

function mockSkipBillingCycleMutation({success = true}: {success: boolean}) {
  mockCustomerApiGraphQL({
    data: {
      subscriptionBillingCycleSkip: {
        __typename: 'SubscriptionBillingCycleSkipPayload',
        billingCycle: {
          __typename: 'SubscriptionBillingCycle',
          cycleIndex: 2,
          skipped: success,
        },
        userErrors: success
          ? []
          : [
              {
                __typename: 'SubscriptionBillingCycleSkipUserError',
                message:
                  'There were so many errors when skipping the next order',
              },
            ],
      },
    },
  });
}
