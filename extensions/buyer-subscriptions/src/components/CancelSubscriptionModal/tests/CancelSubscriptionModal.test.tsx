import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  clickButton,
  getButton,
  mountWithAppContext,
  queryByHeading,
} from 'tests/utilities';
import type {SubscriptionContractSubscriptionStatus} from 'generatedTypes/customer.types';

import {
  getCancelModalId,
  CancelSubscriptionModal,
} from '../CancelSubscriptionModal';

const {mockExtensionApi, mockCustomerApiGraphQL} = mockApis();

const defaultProps = {
  contractId: 'gid://shopify/SubscriptionContract/1',
  onCancelSubscription: vi.fn(),
};

const CANCEL_MODAL_ID = getCancelModalId(defaultProps.contractId);

describe('<CancelSubscriptionModal />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('renders with a cancel and close button', async () => {
    await mountWithAppContext(<CancelSubscriptionModal {...defaultProps} />);

    expect(queryByHeading('Cancel subscription')).toBeInTheDocument();
    expect(getButton('Cancel subscription')).toBeInTheDocument();
    expect(getButton('Close')).toBeInTheDocument();
  });

  it('uses a modal id that is unique to the contract', async () => {
    await mountWithAppContext(<CancelSubscriptionModal {...defaultProps} />);

    expect(document.getElementById(CANCEL_MODAL_ID)?.tagName).toBe('S-MODAL');
    expect(CANCEL_MODAL_ID).toBe('cancel-subscription-modal-1');
  });

  it('closes the modal from the close button', async () => {
    await mountWithAppContext(<CancelSubscriptionModal {...defaultProps} />);

    const closeButton = getButton('Close');
    expect(closeButton).toHaveAttribute('command', '--hide');
    expect(closeButton).toHaveAttribute('commandFor', CANCEL_MODAL_ID);
  });

  it('calls onCancelSubscription and closes the modal after successfully cancelling a contract', async () => {
    const onCancelSubscriptionSpy = vi.fn();
    mockCancelSubscriptionMutation({success: true});

    await mountWithAppContext(
      <CancelSubscriptionModal
        {...defaultProps}
        onCancelSubscription={onCancelSubscriptionSpy}
      />,
    );

    await clickButton('Cancel subscription');

    expect(onCancelSubscriptionSpy).toHaveBeenCalled();
    expect(overlays.hiddenOverlayIds()).toEqual([CANCEL_MODAL_ID]);
  });

  it('does not call onCancelSubscription or close the modal after failing to cancel a contract', async () => {
    const onCancelSubscriptionSpy = vi.fn();
    mockCancelSubscriptionMutation({success: false});

    await mountWithAppContext(
      <CancelSubscriptionModal
        {...defaultProps}
        onCancelSubscription={onCancelSubscriptionSpy}
      />,
    );

    await clickButton('Cancel subscription');

    expect(onCancelSubscriptionSpy).not.toHaveBeenCalled();
    expect(overlays.hideOverlay).not.toHaveBeenCalled();
  });

  it('does not render an error banner by default', async () => {
    mockCancelSubscriptionMutation({success: true});
    await mountWithAppContext(<CancelSubscriptionModal {...defaultProps} />);

    expect(
      queryByHeading('Unable to cancel subscription'),
    ).not.toBeInTheDocument();
  });

  it('renders an error banner when there is an error', async () => {
    mockCancelSubscriptionMutation({success: false});
    await mountWithAppContext(<CancelSubscriptionModal {...defaultProps} />);

    await clickButton('Cancel subscription');

    expect(queryByHeading('Unable to cancel subscription')).toBeInTheDocument();
  });
});

function mockCancelSubscriptionMutation({success = true}: {success: boolean}) {
  mockCustomerApiGraphQL({
    data: {
      subscriptionContractCancel: {
        __typename: 'SubscriptionContractCancelPayload',
        contract: {
          __typename: 'SubscriptionContract',
          id: 'gid://shopify/SubscriptionContract/1',
          status: success
            ? ('CANCELLED' as SubscriptionContractSubscriptionStatus)
            : ('ACTIVE' as SubscriptionContractSubscriptionStatus),
        },
        userErrors: success
          ? []
          : [
              {
                __typename: 'SubscriptionContractStatusUpdateUserError',
                message: 'Cannot cancel subscriptiuon because of some reason',
              },
            ],
      },
    },
  });
}
