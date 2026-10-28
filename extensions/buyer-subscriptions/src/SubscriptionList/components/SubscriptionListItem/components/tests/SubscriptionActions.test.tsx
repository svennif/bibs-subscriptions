import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {mockUseToast} from 'tests/mocks/toast';
import {beforeEach} from 'vitest';
import {getButton, mountWithAppContext, queryButton} from 'tests/utilities';
import type {SubscriptionContractSubscriptionStatus} from 'generatedTypes/customer.types';

import type {SubscriptionActionsProps} from '../SubscriptionActions';
import {
  SubscriptionActions,
  getSubscriptionActionsMenuId,
} from '../SubscriptionActions';
import {getPauseModalId} from 'components/PauseSubscriptionModal';
import {getResumeModalId} from 'components/ResumeSubscriptionModal';
import {getSkipNextOrderModalId} from 'components/SkipNextOrderModal';
import {
  subscriptionListPauseContract,
  subscriptionListResumeContract,
  subscriptionListSkipNextOrder,
} from '../../tests/TestActions';

import {SuccessToastType} from 'utilities/hooks/useToast';

const {mockExtensionApi, mockCustomerApiGraphQL} = mockApis();
const {mockShowSuccessToast} = mockUseToast();

const defaultProps: SubscriptionActionsProps = {
  id: '1',
  status: 'ACTIVE',
  resumeDateIfNextCycleSkipped: '2024-01-01',
  cycleIndexToSkip: 1,
  refetchSubscriptionListData: vi.fn(),
};

describe('<SubscriptionActions />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('renders actions for active subscriptions', async () => {
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      status: 'ACTIVE',
    };

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    expect(getButton('View details')).toBeInTheDocument();
    expect(getButton('Pause')).toBeInTheDocument();
    expect(getButton('Skip next order')).toBeInTheDocument();
  });

  it('does not render skip next order action when there is no resume date or cycle index to skip', async () => {
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      status: 'ACTIVE',
      resumeDateIfNextCycleSkipped: undefined,
      cycleIndexToSkip: undefined,
    };

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    expect(getButton('View details')).toBeInTheDocument();
    expect(getButton('Pause')).toBeInTheDocument();
    expect(queryButton('Skip next order')).not.toBeInTheDocument();
  });

  it('renders actions for paused subscriptions', async () => {
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      status: 'PAUSED',
    };

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    expect(getButton('View details')).toBeInTheDocument();
    expect(getButton('Resume')).toBeInTheDocument();
  });

  it('renders actions for cancelled subscriptions', async () => {
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      status: 'CANCELLED',
    };

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    expect(getButton('View details')).toBeInTheDocument();
    expect(queryButton('Pause')).not.toBeInTheDocument();
  });

  it('calls refetchSubscriptionContract, showToast, and closes the modal when onPauseSubscription is called', async () => {
    const refetchSpy = vi.fn();
    const toastSpy = vi.fn();

    mockShowSuccessToast(toastSpy);

    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      refetchSubscriptionListData: refetchSpy,
    };

    mockCustomerApiGraphQL({
      data: {
        subscriptionContractPause: {
          contract: {
            status: 'PAUSED',
          },
        },
      },
      loading: false,
    });

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    await subscriptionListPauseContract();

    expect(refetchSpy).toHaveBeenCalled();
    expect(overlays.hiddenOverlayIds()).toEqual([
      getPauseModalId(mockProps.id),
    ]);
    expect(toastSpy).toHaveBeenCalledWith(SuccessToastType.Paused);
  });

  it('calls refetchSubscriptionContract, showToast and closes the modal when onResumeSubscription is called', async () => {
    const refetchSpy = vi.fn();
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      status: 'PAUSED' as SubscriptionContractSubscriptionStatus,
      refetchSubscriptionListData: refetchSpy,
    };
    const showToastSpy = vi.fn();

    mockShowSuccessToast(showToastSpy);

    mockCustomerApiGraphQL({
      data: {
        subscriptionContractActivate: {
          contract: {
            status: 'ACTIVE',
          },
        },
      },
      loading: false,
    });

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    await subscriptionListResumeContract();

    expect(refetchSpy).toHaveBeenCalled();
    expect(overlays.hiddenOverlayIds()).toEqual([
      getResumeModalId(mockProps.id),
    ]);
    expect(showToastSpy).toHaveBeenCalledWith(SuccessToastType.Resumed);
  });

  it('calls refetchSubscriptionContract, showToast and closes the modal when onSkipOrder is called', async () => {
    const refetchSpy = vi.fn();
    const mockProps: SubscriptionActionsProps = {
      ...defaultProps,
      refetchSubscriptionListData: refetchSpy,
    };
    const showToastSpy = vi.fn();

    mockShowSuccessToast(showToastSpy);

    mockCustomerApiGraphQL({
      data: {
        subscriptionBillingCycleSkip: {
          billingCycle: {
            skipped: true,
          },
        },
      },
      loading: false,
    });

    await mountWithAppContext(<SubscriptionActions {...mockProps} />);

    await subscriptionListSkipNextOrder();

    expect(refetchSpy).toHaveBeenCalled();
    expect(overlays.hiddenOverlayIds()).toEqual([
      getSkipNextOrderModalId(mockProps.id),
    ]);
    expect(showToastSpy).toHaveBeenCalledWith(SuccessToastType.Skipped);
  });

  it('opens the actions menu from the Manage button', async () => {
    await mountWithAppContext(<SubscriptionActions {...defaultProps} />);

    const menuId = getSubscriptionActionsMenuId(defaultProps.id);
    expect(getButton('Manage')).toHaveAttribute('commandFor', menuId);
    expect(document.getElementById(menuId)?.tagName).toBe('S-MENU');
  });

  it('opens the matching modal from each menu action', async () => {
    await mountWithAppContext(<SubscriptionActions {...defaultProps} />);

    expect(getButton('Pause')).toHaveAttribute(
      'commandFor',
      getPauseModalId(defaultProps.id),
    );
    expect(getButton('Pause')).toHaveAttribute('command', '--show');
    expect(getButton('Skip next order')).toHaveAttribute(
      'commandFor',
      getSkipNextOrderModalId(defaultProps.id),
    );
  });

  it('links View details to the subscription details page', async () => {
    await mountWithAppContext(<SubscriptionActions {...defaultProps} />);

    expect(getButton('View details')).toHaveAttribute(
      'href',
      'extension:/subscriptions/1',
    );
  });
});
