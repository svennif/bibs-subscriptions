import {mockApis} from 'tests/mocks/api';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {clickButton, mountWithAppContext} from 'tests/utilities';
import {screen} from '@testing-library/preact';

import {AddressModal} from '../..';
import * as useCountries from '../../../hooks/useCountries';
import {MockAddressFormHooks, createMockAddress} from 'tests/mocks/address';
import {getField, queryField} from '../../../../../tests/helpers';

const {mockExtensionApi} = mockApis();

describe('<AddressModal />', () => {
  beforeEach(() => {
    mockExtensionApi();
    mockUiExtensionComponents();
    MockAddressFormHooks();
  });

  const mockAddress = createMockAddress({country: 'CA', province: 'ON'});
  const defaultProps = {
    address: mockAddress,
    addressModalOpen: true,
    errors: [],
    loading: false,
    onClose: vi.fn(),
    onSave: vi.fn(),
    handleAddressChange: vi.fn(),
  };

  const mockAddressWithoutCountry = createMockAddress({
    country: '',
    province: '',
  });

  const defaultPropsWithoutCountry = {
    ...defaultProps,
    address: mockAddressWithoutCountry,
  };

  it('renders address lines', async () => {
    await mountWithAppContext(<AddressModal {...defaultProps} />);

    expect(queryField('Country/region')).toBeInTheDocument();
    expect(queryField('First name')).toBeInTheDocument();
    expect(queryField('Last name')).toBeInTheDocument();
    expect(queryField('City')).toBeInTheDocument();
    expect(queryField('Province')).toBeInTheDocument();
    expect(queryField('Postal code')).toBeInTheDocument();
  });

  it('renders default address lines when country is not set', async () => {
    await mountWithAppContext(<AddressModal {...defaultPropsWithoutCountry} />);

    expect(queryField('Country/region')).toBeInTheDocument();
    expect(queryField('First name')).toBeInTheDocument();
    expect(queryField('Last name')).toBeInTheDocument();
    expect(queryField('City')).not.toBeInTheDocument();
    expect(queryField('Province')).not.toBeInTheDocument();
    expect(queryField('Postal code')).not.toBeInTheDocument();
  });

  it('shows different countries in the dropdown', async () => {
    await mountWithAppContext(<AddressModal {...defaultProps} />);

    const countrySelect = getField('Country/region');
    const options = Array.from(countrySelect.querySelectorAll('s-option')).map(
      (option) => option.textContent,
    );

    expect(options).toEqual(['Canada', 'United States', 'Vatican City']);
  });

  it('renders its actions in the modal action slots', async () => {
    const onClose = vi.fn();
    const onSave = vi.fn();
    await mountWithAppContext(
      <AddressModal {...defaultProps} onClose={onClose} onSave={onSave} />,
    );

    expect(screen.getByText('Cancel')).toHaveAttribute(
      'slot',
      'secondary-actions',
    );
    expect(screen.getByText('Continue')).toHaveAttribute(
      'slot',
      'primary-action',
    );

    await clickButton('Cancel');
    expect(onClose).toHaveBeenCalled();

    await clickButton('Continue');
    expect(onSave).toHaveBeenCalled();
  });

  describe('loading state', () => {
    it('renders skeleton text while countries are loading', async () => {
      vi.spyOn(useCountries, 'useCountries').mockImplementation(() => ({
        data: [],
        loading: true,
        error: undefined,
      }));

      await mountWithAppContext(<AddressModal {...defaultProps} />);

      expect(
        screen.getByTestId('address-modal-loading-state'),
      ).toBeInTheDocument();
    });

    it('disables the text inputs while loading', async () => {
      await mountWithAppContext(<AddressModal {...defaultProps} loading />);

      expect(getField('First name')).toHaveAttribute('disabled');
    });
  });
});
