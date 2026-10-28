import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  clickButton,
  getButton,
  mountWithAppContext,
  queryByHeading,
} from 'tests/utilities';
import {screen} from '@testing-library/preact';
import type {SubscriptionContractSubscriptionStatus} from 'generatedTypes/customer.types';

import {
  getPauseModalId,
  PauseSubscriptionModal,
} from '../PauseSubscriptionModal';

const {mockExtensionApi, mockCustomerApiGraphQL, mockAppRequest} = mockApis();

const defaultProps = {
  contractId: 'gid://shopify/SubscriptionContract/1',
  onPauseSubscription: vi.fn(),
};

const PAUSE_MODAL_ID = getPauseModalId(defaultProps.contractId);

describe('<PauseSubscriptionModal />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('renders with the pause button', async () => {
    await mountWithAppContext(<PauseSubscriptionModal {...defaultProps} />);

    expect(queryByHeading('Pause subscription')).toBeInTheDocument();
    expect(getButton('Pause subscription')).toBeInTheDocument();
  });

  it('uses a modal id that is unique to the contract', async () => {
    await mountWithAppContext(<PauseSubscriptionModal {...defaultProps} />);

    expect(document.getElementById(PAUSE_MODAL_ID)?.tagName).toBe('S-MODAL');
    expect(PAUSE_MODAL_ID).toBe('pause-subscription-modal-1');
  });

  it('closes the modal from the close button', async () => {
    await mountWithAppContext(<PauseSubscriptionModal {...defaultProps} />);

    const closeButton = getButton('Close');
    expect(closeButton).toHaveAttribute('command', '--hide');
    expect(closeButton).toHaveAttribute('commandFor', PAUSE_MODAL_ID);
  });

  it('calls onPauseSubscription, closes the modal and sends a request to the app after successfully pausing a contract', async () => {
    const onPauseSpy = vi.fn();
    const appRequestSpy = vi.fn();

    mockPauseSubscriptionMutation({success: true});
    mockAppRequest(appRequestSpy);

    await mountWithAppContext(
      <PauseSubscriptionModal
        {...defaultProps}
        onPauseSubscription={onPauseSpy}
      />,
    );

    await clickButton('Pause subscription');

    expect(onPauseSpy).toHaveBeenCalled();
    expect(overlays.hiddenOverlayIds()).toEqual([PAUSE_MODAL_ID]);
    expect(appRequestSpy).toHaveBeenCalledWith({
      operationName: 'PAUSE',
      contractId: 'gid://shopify/SubscriptionContract/1',
    });
  });

  it('does not call onPauseSubscription or send a request to the app after failing to pause a contract', async () => {
    mockPauseSubscriptionMutation({success: false});
    const onPauseSpy = vi.fn();
    const appRequestSpy = vi.fn();

    mockAppRequest(appRequestSpy);

    await mountWithAppContext(
      <PauseSubscriptionModal
        {...defaultProps}
        onPauseSubscription={onPauseSpy}
      />,
    );

    await clickButton('Pause subscription');

    expect(onPauseSpy).not.toHaveBeenCalled();
    expect(appRequestSpy).not.toHaveBeenCalled();
  });

  it('does not close the modal or call onPauseSubscription and shows an error banner after failing to pause a contract', async () => {
    const onPauseSpy = vi.fn();
    mockPauseSubscriptionMutation({success: false});

    await mountWithAppContext(
      <PauseSubscriptionModal
        {...defaultProps}
        onPauseSubscription={onPauseSpy}
      />,
    );

    await clickButton('Pause subscription');

    expect(onPauseSpy).not.toHaveBeenCalled();
    expect(overlays.hideOverlay).not.toHaveBeenCalled();

    expect(queryByHeading('Unable to pause subscription')).toBeInTheDocument();
    expect(
      screen.getByText('Cannot pause contract with future cycle edits'),
    ).toBeInTheDocument();
  });

  it('does not render error banner by default', async () => {
    mockPauseSubscriptionMutation({success: true});

    await mountWithAppContext(<PauseSubscriptionModal {...defaultProps} />);

    expect(
      queryByHeading('Unable to pause subscription'),
    ).not.toBeInTheDocument();
  });
});

function mockPauseSubscriptionMutation({success = true}: {success: boolean}) {
  mockCustomerApiGraphQL({
    data: {
      subscriptionContractPause: {
        __typename: 'SubscriptionContractPausePayload',
        contract: {
          __typename: 'SubscriptionContract',
          id: 'gid://shopify/SubscriptionContract/1',
          status: success
            ? ('PAUSED' as SubscriptionContractSubscriptionStatus)
            : ('ACTIVE' as SubscriptionContractSubscriptionStatus),
        },
        userErrors: success
          ? []
          : [
              {
                __typename: 'SubscriptionContractStatusUpdateUserError',
                message: 'Cannot pause contract with future cycle edits',
              },
            ],
      },
    },
  });
}
