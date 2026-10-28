import {mockApis} from 'tests/mocks/api';
import {mockUseToast} from 'tests/mocks/toast';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  clickButton,
  getButton,
  mountWithAppContext,
  queryButton,
  queryByHeading,
} from 'tests/utilities';
import {screen} from '@testing-library/preact';
import {SuccessToastType} from 'utilities/hooks/useToast';

import {PaymentMethodCard} from '../PaymentMethodCard';
import {getPaymentMethodModalId} from '../PaymentMethodUpdateModal';

const {mockExtensionApi, mockAppFetch} = mockApis();
const {mockShowSuccessToast} = mockUseToast();

const CONTRACT_ID = 'gid://shopify/SubscriptionContract/10';
const MODAL_ID = getPaymentMethodModalId(CONTRACT_ID);

const CREDIT_CARD = {
  type: 'CREDIT_CARD',
  revoked: false,
  brand: 'visa',
  lastDigits: '4242',
  expiryMonth: 5,
  expiryYear: 2027,
  expiresSoon: false,
};

describe('<PaymentMethodCard />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
  });

  it('loads the payment method for the contract in the customer language', async () => {
    const appFetch = mockAppFetch(() => ({body: {paymentMethod: CREDIT_CARD}}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(await screen.findByText('Visa ending in 4242')).toBeInTheDocument();
    expect(appFetch).toHaveBeenCalledWith(
      '/customerAccount/payment-method?contractId=10&locale=en',
    );
  });

  it('shows the card expiry and a button that opens the update modal', async () => {
    mockAppFetch(() => ({body: {paymentMethod: CREDIT_CARD}}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    const expiry = await screen.findByText('Expires 05/27');
    expect(expiry).not.toHaveAttribute('tone', 'warning');

    const button = getButton('Change payment method');
    expect(button).toHaveAttribute('command', '--show');
    expect(button).toHaveAttribute('commandFor', MODAL_ID);
    expect(document.getElementById(MODAL_ID)?.tagName).toBe('S-MODAL');
  });

  it('warns when the card expires soon', async () => {
    mockAppFetch(() => ({
      body: {paymentMethod: {...CREDIT_CARD, expiresSoon: true}},
    }));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(await screen.findByText('Expires 05/27')).toHaveAttribute(
      'tone',
      'warning',
    );
  });

  it.each([
    [
      {
        type: 'SHOP_PAY',
        revoked: false,
        lastDigits: '1111',
        expiryMonth: 1,
        expiryYear: 2028,
      },
      'Shop Pay ending in 1111',
    ],
    [
      {
        type: 'BANK_ACCOUNT',
        revoked: false,
        bankName: 'Danske Bank',
        lastDigits: '9876',
      },
      'Danske Bank ending in 9876',
    ],
    [
      {type: 'BANK_ACCOUNT', revoked: false, lastDigits: '9876'},
      'Bank account ending in 9876',
    ],
    [
      {
        type: 'PAYPAL',
        revoked: false,
        paypalAccountEmail: 'pay@example.com',
      },
      'PayPal',
    ],
  ])('summarizes %o as "%s"', async (paymentMethod, text) => {
    mockAppFetch(() => ({body: {paymentMethod}}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(await screen.findByText(text)).toBeInTheDocument();
  });

  it('shows the PayPal account email', async () => {
    mockAppFetch(() => ({
      body: {
        paymentMethod: {
          type: 'PAYPAL',
          revoked: false,
          paypalAccountEmail: 'pay@example.com',
        },
      },
    }));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(await screen.findByText('pay@example.com')).toBeInTheDocument();
  });

  it('flags a revoked payment method', async () => {
    mockAppFetch(() => ({
      body: {paymentMethod: {...CREDIT_CARD, revoked: true}},
    }));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(
      await screen.findByText('Invalid payment method'),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Card ending in 4242 is invalid/),
    ).toBeInTheDocument();
    expect(getButton('Change payment method')).toBeInTheDocument();
  });

  it('shows an error and no update button when loading fails', async () => {
    mockAppFetch(() => ({body: {error: 'Not found'}, status: 404}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(
      await screen.findByText(
        'Unable to retrieve payment methods, please try again',
      ),
    ).toBeInTheDocument();
    expect(queryButton('Change payment method')).toBeNull();
  });

  it('shows when there is no payment method', async () => {
    mockAppFetch(() => ({body: {paymentMethod: null}}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );

    expect(
      await screen.findByText('No payment method on file'),
    ).toBeInTheDocument();
    expect(queryButton('Change payment method')).toBeNull();
  });

  it('does not offer an update for cancelled subscriptions', async () => {
    mockAppFetch(() => ({body: {paymentMethod: CREDIT_CARD}}));

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="CANCELLED" />,
    );

    expect(await screen.findByText('Visa ending in 4242')).toBeInTheDocument();
    expect(queryButton('Change payment method')).toBeNull();
    expect(document.getElementById(MODAL_ID)).toBeNull();
  });

  it('emails an update link, closes the modal and shows a toast', async () => {
    const showToast = vi.fn();
    mockShowSuccessToast(showToast);
    const appFetch = mockAppFetch((_path, init) =>
      init?.method === 'POST'
        ? {body: {status: 'success'}}
        : {body: {paymentMethod: CREDIT_CARD}},
    );

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );
    await screen.findByText('Visa ending in 4242');

    await clickButton('Email me a link');

    expect(appFetch).toHaveBeenCalledWith(
      '/customerAccount/payment-method?contractId=10&locale=en',
      {method: 'POST', body: JSON.stringify({contractId: '10'})},
    );
    expect(overlays.hiddenOverlayIds()).toEqual([MODAL_ID]);
    expect(showToast).toHaveBeenCalledWith(
      SuccessToastType.PaymentUpdateEmailSent,
    );
  });

  it('keeps the modal open with an error when the email fails', async () => {
    const showToast = vi.fn();
    mockShowSuccessToast(showToast);
    mockAppFetch((_path, init) =>
      init?.method === 'POST'
        ? {body: {error: 'Unable to send email'}, status: 422}
        : {body: {paymentMethod: CREDIT_CARD}},
    );

    await mountWithAppContext(
      <PaymentMethodCard contractId={CONTRACT_ID} status="ACTIVE" />,
    );
    await screen.findByText('Visa ending in 4242');

    await clickButton('Email me a link');

    expect(
      queryByHeading('Unable to update payment method'),
    ).toBeInTheDocument();
    expect(overlays.hideOverlay).not.toHaveBeenCalled();
    expect(showToast).not.toHaveBeenCalled();
  });
});
