import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  clickButton,
  getButton,
  mountWithAppContext,
  queryByHeading,
} from 'tests/utilities';
import {screen, waitFor} from '@testing-library/preact';

import type {SubscriptionContractSubscriptionStatus} from 'generatedTypes/customer.types';

import {
  getResumeModalId,
  ResumeSubscriptionModal,
} from '../ResumeSubscriptionModal';

const {mockExtensionApi, mockCustomerApiGraphQL, mockAppRequest} = mockApis();

const defaultProps = {
  contractId: 'gid://shopify/SubscriptionContract/1',
  resumeDate: '2021-05-07T00:00:00',
  lastOrderPrice: {
    amount: '10.00',
    currencyCode: 'CAD',
  },
  nextOrderPrice: {
    amount: '10.00',
    currencyCode: 'CAD',
  },
  onResumeSubscription: vi.fn(),
};

const RESUME_MODAL_ID = getResumeModalId(defaultProps.contractId);

describe('<ResumeSubscriptionModal />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('renders', async () => {
    await mountWithAppContext(<ResumeSubscriptionModal {...defaultProps} />);

    expect(queryByHeading('Resume subscription')).toBeInTheDocument();
    expect(getButton('Continue')).toBeInTheDocument();
    expect(getButton('Close')).toBeInTheDocument();
  });

  it('uses a modal id that is unique to the contract', async () => {
    await mountWithAppContext(<ResumeSubscriptionModal {...defaultProps} />);

    expect(document.getElementById(RESUME_MODAL_ID)?.tagName).toBe('S-MODAL');
    expect(RESUME_MODAL_ID).toBe('resume-subscription-modal-1');
  });

  it('renders with resume date when passed', async () => {
    await mountWithAppContext(
      <ResumeSubscriptionModal
        {...defaultProps}
        resumeDate="2021-05-07T12:00:00"
      />,
    );

    expect(
      screen.getByText(
        'If you resume this subscription, billing will resume on May 7, 2021.',
      ),
    ).toBeInTheDocument();
  });

  it('renders generic description if no resume date is passed', async () => {
    await mountWithAppContext(
      <ResumeSubscriptionModal {...defaultProps} resumeDate={undefined} />,
    );

    expect(
      screen.getByText(
        'If you resume this subscription, billing will resume immediately.',
      ),
    ).toBeInTheDocument();
  });

  it('renders price changed message if next order price is different from last order price', async () => {
    await mountWithAppContext(
      <ResumeSubscriptionModal
        {...defaultProps}
        resumeDate={undefined}
        lastOrderPrice={{
          amount: '10.00',
          currencyCode: 'CAD',
        }}
        nextOrderPrice={{
          amount: '20.00',
          currencyCode: 'CAD',
        }}
      />,
    );

    expect(
      screen.getByText(
        'If you resume this subscription, billing will resume immediately. The price for this subscription has changed and you will be charged $20.00 per upcoming order.',
      ),
    ).toBeInTheDocument();
  });

  it('does not render price if it has not changed since the last order', async () => {
    await mountWithAppContext(
      <ResumeSubscriptionModal
        {...defaultProps}
        resumeDate={undefined}
        lastOrderPrice={{
          amount: '10.00',
          currencyCode: 'CAD',
        }}
        nextOrderPrice={{
          amount: '10.00',
          currencyCode: 'CAD',
        }}
      />,
    );

    expect(screen.queryByText('$10.00')).not.toBeInTheDocument();
  });

  it('closes the modal from the close button', async () => {
    await mountWithAppContext(<ResumeSubscriptionModal {...defaultProps} />);

    const closeButton = getButton('Close');
    expect(closeButton).toHaveAttribute('command', '--hide');
    expect(closeButton).toHaveAttribute('commandFor', RESUME_MODAL_ID);
  });

  it('calls onResumeSubscription, closes the modal and sends a request to the app after successfully activating a contract', async () => {
    const onResumeSpy = vi.fn();
    const appRequestSpy = vi.fn();

    mockActivateSubscriptionMutation({success: true});
    mockAppRequest(appRequestSpy);

    await mountWithAppContext(
      <ResumeSubscriptionModal
        {...defaultProps}
        onResumeSubscription={onResumeSpy}
      />,
    );

    await clickButton('Continue');

    expect(overlays.hiddenOverlayIds()).toEqual([RESUME_MODAL_ID]);
    expect(onResumeSpy).toHaveBeenCalled();
    expect(appRequestSpy).toHaveBeenCalledWith({
      operationName: 'RESUME',
      contractId: 'gid://shopify/SubscriptionContract/1',
    });
  });

  it('does not close the modal, call onResumeSubscription or send a request to the app after failing to activate a contract', async () => {
    const onResumeSpy = vi.fn();
    const appRequestSpy = vi.fn();

    mockAppRequest(appRequestSpy);
    mockActivateSubscriptionMutation({success: false});

    await mountWithAppContext(
      <ResumeSubscriptionModal
        {...defaultProps}
        onResumeSubscription={onResumeSpy}
      />,
    );

    await clickButton('Continue');

    expect(overlays.hideOverlay).not.toHaveBeenCalled();
    expect(onResumeSpy).not.toHaveBeenCalled();
    expect(appRequestSpy).not.toHaveBeenCalled();
  });

  it('does not render an error banner by default', async () => {
    mockActivateSubscriptionMutation({success: true});
    await mountWithAppContext(<ResumeSubscriptionModal {...defaultProps} />);

    expect(
      queryByHeading('Unable to resume subscription'),
    ).not.toBeInTheDocument();
  });

  it('renders an error banner when there is an error', async () => {
    mockActivateSubscriptionMutation({success: false});

    await mountWithAppContext(<ResumeSubscriptionModal {...defaultProps} />);

    await clickButton('Continue');

    await waitFor(() => {
      expect(
        queryByHeading('Unable to resume subscription'),
      ).toBeInTheDocument();
    });
  });
});

function mockActivateSubscriptionMutation({
  success = true,
}: {
  success: boolean;
}) {
  mockCustomerApiGraphQL({
    data: {
      subscriptionContractActivate: {
        __typename: 'SubscriptionContractActivatePayload',
        contract: {
          __typename: 'SubscriptionContract',
          id: 'gid://shopify/SubscriptionContract/1',
          status: success
            ? ('ACTIVE' as SubscriptionContractSubscriptionStatus)
            : ('PAUSED' as SubscriptionContractSubscriptionStatus),
        },
        userErrors: success
          ? []
          : [
              {
                __typename: 'SubscriptionContractStatusUpdateUserError',
                message:
                  'Cannot resume subscription for very important reasons',
              },
            ],
      },
    },
  });
}
