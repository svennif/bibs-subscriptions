import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';

import {faker} from '@faker-js/faker';
import {clickButton, mountWithAppContext} from 'tests/utilities';
import {fireEvent, screen, waitFor} from '@testing-library/preact';

import {createMockDeliveryOptions} from '../../../tests/mocks/deliveryOptionMocks';
import {DeliveryMethodSelectModal} from '../DeliveryMethodSelectModal';
import * as useSelectDeliveryOptionHook from '../../../hooks/useSelectDeliveryOption';
import {createMockAddress} from 'tests/mocks/address';
import type {InlineAddressProps} from '../components/InlineAddress';

vi.mock('../../../hooks/useSelectDeliveryOption', () => ({
  useSelectDeliveryOption: vi.fn().mockReturnValue(() => ({
    deliveryMethod: {},
    errors: [],
  })),
}));

function MockInlineAddress(props: InlineAddressProps) {
  return <div>{JSON.stringify(props.address)}</div>;
}

vi.mock('../components/InlineAddress', async () => ({
  ...(await vi.importActual('../components/InlineAddress')),
  InlineAddress: (props: any) => <MockInlineAddress {...props} />,
}));

const {mockExtensionApi} = mockApis();

async function clickSaveButton() {
  await clickButton('Save');
}

describe('<DeliveryMethodSelectModal />', () => {
  const mockDeliveryOptions = createMockDeliveryOptions();
  const defaultProps = {
    selectedDeliveryHandle: mockDeliveryOptions[0].code,
    address: createMockAddress(),
    deliveryOptions: mockDeliveryOptions,
    deliveryOptionsToken: faker.string.uuid(),
    subscriptionContractId: faker.string.uuid(),
    onSelectionChange: vi.fn(),
    onSuccess: vi.fn(),
    onClose: vi.fn(),
  };

  beforeEach(() => {
    mockExtensionApi();
    mockUiExtensionComponents();
  });

  describe('display delivery options', () => {
    it('shows the delivery option titles', async () => {
      await mountWithAppContext(
        <DeliveryMethodSelectModal {...defaultProps} />,
      );

      mockDeliveryOptions.forEach((deliveryOption) => {
        expect(
          screen.getByText(new RegExp(deliveryOption.presentmentTitle!)),
        ).toBeInTheDocument();
      });
    });

    it('selects the current delivery option and reports changes', async () => {
      const onSelectionChange = vi.fn();
      await mountWithAppContext(
        <DeliveryMethodSelectModal
          {...defaultProps}
          onSelectionChange={onSelectionChange}
        />,
      );

      const choiceList = document.querySelector('s-choice-list')!;
      expect(
        Array.from(choiceList.querySelectorAll('s-choice')).map((choice) =>
          choice.getAttribute('value'),
        ),
      ).toEqual(mockDeliveryOptions.map(({code}) => code));

      (choiceList as any).values = [mockDeliveryOptions[1].code];
      fireEvent.change(choiceList);

      expect(onSelectionChange).toHaveBeenCalledWith(
        mockDeliveryOptions[1].code,
      );
    });
  });

  describe('actions', () => {
    it('calls selectDeliveryOption when the save button is clicked', async () => {
      const selectDeliverySpy = vi.fn();

      // calling hook returns a function -> expect that function to be called
      vi.spyOn(
        useSelectDeliveryOptionHook,
        'useSelectDeliveryOption',
      ).mockReturnValueOnce(
        selectDeliverySpy.mockResolvedValue({
          deliveryOptions: [],
          errors: [],
        }),
      );
      await mountWithAppContext(
        <DeliveryMethodSelectModal {...defaultProps} />,
      );

      await clickSaveButton();

      expect(selectDeliverySpy).toHaveBeenCalledWith(
        mockDeliveryOptions.find(
          (option) => option.code === defaultProps.selectedDeliveryHandle,
        ),
        defaultProps.subscriptionContractId,
        defaultProps.deliveryOptionsToken,
        defaultProps.address,
        defaultProps.address.phone,
        '',
      );
    });

    it('calls onSuccess when a delivery method is returned', async () => {
      const onSuccess = vi.fn();
      vi.spyOn(
        useSelectDeliveryOptionHook,
        'useSelectDeliveryOption',
      ).mockReturnValueOnce(
        vi.fn().mockResolvedValue({deliveryMethod: {}, errors: []}),
      );
      await mountWithAppContext(
        <DeliveryMethodSelectModal {...defaultProps} onSuccess={onSuccess} />,
      );

      await clickSaveButton();

      expect(onSuccess).toHaveBeenCalled();
    });

    it('calls onClose when the cancel button is clicked', async () => {
      const onClose = vi.fn();
      await mountWithAppContext(
        <DeliveryMethodSelectModal {...defaultProps} onClose={onClose} />,
      );

      await clickButton('Cancel');

      expect(onClose).toHaveBeenCalled();
    });

    it('displays errors', async () => {
      const mockError = faker.word.words();

      vi.spyOn(
        useSelectDeliveryOptionHook,
        'useSelectDeliveryOption',
      ).mockReturnValue(
        vi.fn().mockResolvedValue({
          deliveryOptions: [],
          errors: [
            {
              message: mockError,
            },
          ],
        }),
      );
      await mountWithAppContext(
        <DeliveryMethodSelectModal {...defaultProps} />,
      );

      await clickSaveButton();

      await waitFor(() => {
        expect(screen.getByText(mockError)).toBeInTheDocument();
      });
    });
  });
});
