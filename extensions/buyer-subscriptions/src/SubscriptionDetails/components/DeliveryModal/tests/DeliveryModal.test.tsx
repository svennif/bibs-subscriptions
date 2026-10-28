import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  changeValue,
  clickButton,
  mountWithAppContext,
  queryByHeading,
} from 'tests/utilities';

import {waitFor} from '@testing-library/preact';

import {faker} from '@faker-js/faker';
import type {CurrencyCode} from 'generatedTypes/customer.types';

import {DeliveryModal} from '../DeliveryModal';
import {getDeliveryModalId} from '../types';
import * as useFetchDeliveryOptionsHook from '../hooks/useFetchDeliveryOptions';
import {MockAddressFormHooks, createMockAddress} from 'tests/mocks/address';
import {getField, queryField} from '../../../tests/helpers';

const {mockExtensionApi} = mockApis();

vi.mock('../hooks/useFetchDeliveryOptions', () => ({
  useFetchDeliveryOptions: vi.fn().mockReturnValue(
    vi.fn().mockReturnValue({
      deliveryOptions: [
        {
          __typename: 'SubscriptionShippingOption',
          code: 'delivery-123',
          title: 'Delivery Option 123',
          presentmentTitle: 'Delivery Option 123 presentment title',
          phoneRequired: false,
          price: {
            __typename: 'MoneyV2',
            amount: '10.00',
            currencyCode: 'CAD' as CurrencyCode,
          },
        },
      ],
      deliveryOptionsToken: faker.string.uuid(),
      errors: [],
    }),
  ),
}));

async function clickContinueButton() {
  await clickButton('Continue');
}

async function clickCancelButton() {
  await clickButton('Cancel');
}

describe('<DeliveryModal />', () => {
  let overlays: ReturnType<typeof mockUiExtensionComponents>;

  beforeEach(() => {
    mockExtensionApi();
    overlays = mockUiExtensionComponents();
    MockAddressFormHooks();
  });

  const defaultProps = {
    currentAddress: createMockAddress({country: 'CA', province: 'ON'}),
    subscriptionContractId: '123',
    refetchSubscriptionContract: vi.fn(),
  };

  describe('state', () => {
    it('shows the address modal initially', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      expect(queryByHeading('Edit shipping address')).toBeInTheDocument();
    });

    it('uses a modal id that is unique to the contract', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      expect(document.getElementById(getDeliveryModalId('123'))).toBe(
        queryByHeading('Edit shipping address'),
      );
    });

    it('switches to the delivery method selection modal once continue is clicked', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      await clickContinueButton();

      await waitFor(() => {
        expect(queryByHeading('Select delivery method')).toBeInTheDocument();
      });
    });

    it('switches back to the address modal once cancel is clicked in the delivery method selection modal', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      await clickContinueButton();
      await waitFor(() => {
        expect(queryByHeading('Select delivery method')).toBeInTheDocument();
      });

      await clickCancelButton();
      await waitFor(() => {
        expect(queryByHeading('Edit shipping address')).toBeInTheDocument();
      });
      expect(overlays.hideOverlay).not.toHaveBeenCalled();
    });

    it('does not proceed to delivery selection and displays an error when there are no delivery options', async () => {
      const mockError = faker.word.words();
      vi.spyOn(
        useFetchDeliveryOptionsHook,
        'useFetchDeliveryOptions',
      ).mockReturnValue(
        vi.fn().mockResolvedValue({
          deliveryOptions: [],
          errors: [{message: mockError}],
        }),
      );

      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      await clickContinueButton();

      expect(queryByHeading(mockError)).toBeInTheDocument();
      expect(queryByHeading('Edit shipping address')).toBeInTheDocument();
    });
  });

  describe('buttons', () => {
    it('fetches delivery options when the continue button is clicked', async () => {
      const fetchDeliverySpy = vi.fn();

      vi.spyOn(
        useFetchDeliveryOptionsHook,
        'useFetchDeliveryOptions',
      ).mockReturnValue(
        fetchDeliverySpy.mockResolvedValue({
          deliveryOptions: [],
          deliveryOptionsToken: faker.string.uuid(),
          errors: [],
        }),
      );

      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      await clickContinueButton();

      expect(fetchDeliverySpy).toHaveBeenCalled();
    });

    it('closes the modal when the cancel button is clicked', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      await clickCancelButton();

      expect(overlays.hiddenOverlayIds()).toEqual([getDeliveryModalId('123')]);
    });
  });

  describe('address fields', () => {
    it('changes the field set depending on which country is selected', async () => {
      await mountWithAppContext(<DeliveryModal {...defaultProps} />);

      const currentFieldLabels = [
        'First name',
        'Last name',
        'Address',
        'City',
        'Postal code',
      ];

      const newFieldLabels = ['First name', 'Last name', 'Address'];
      const removedFieldLabels = ['City', 'Postal code'];

      currentFieldLabels.forEach((field) => {
        expect(queryField(field)).toBeInTheDocument();
      });

      await changeValue(getField('Country/region'), 'VA');

      newFieldLabels.forEach((field) => {
        expect(queryField(field)).toBeInTheDocument();
      });

      removedFieldLabels.forEach((field) => {
        expect(queryField(field)).not.toBeInTheDocument();
      });
    });
  });
});
