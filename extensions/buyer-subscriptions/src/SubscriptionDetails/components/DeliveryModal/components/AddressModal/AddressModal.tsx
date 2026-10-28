import {useMemo} from 'preact/hooks';

import type {Address as AddressType, FieldName} from '@shopify/address';
import {buildOrderedFields} from '@shopify/address';
import type {UserError} from 'types';

import {useCountries} from '../../hooks/useCountries';
import {AddressLine} from '../AddressLine';
import {formatUserErrorsForFields} from '../../utilities/helpers';
import {useExtensionApi} from 'foundation/Api';

interface AddressModalProps {
  address: AddressType;
  addressModalOpen: boolean;
  errors: UserError[];
  handleAddressChange: (newValue: Partial<AddressType>) => void;
  loading: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
}

/**
 * The address step of the delivery modal. Renders its fields and its
 * slotted actions as direct children of the parent s-modal.
 */
export function AddressModal({
  address,
  addressModalOpen,
  errors,
  handleAddressChange,
  loading,
  onClose,
  onSave,
}: AddressModalProps) {
  const {i18n} = useExtensionApi();

  const errorMessageDisplay = useMemo(
    () => errors.map(({message}) => message).join('\n'),
    [errors],
  );

  const {data: countries, loading: countriesLoading} = useCountries({
    skip: !addressModalOpen,
  });

  const countrySelectOptions = useMemo(
    () =>
      countries.map(({code, name}) => {
        return {value: code, label: name};
      }),
    [countries],
  );

  if (countriesLoading) {
    return (
      <s-stack gap="large" data-testid="address-modal-loading-state">
        {new Array(4).fill(0).map((_, index) => (
          // eslint-disable-next-line react/no-array-index-key
          <s-skeleton-paragraph key={index} />
        ))}
      </s-stack>
    );
  }

  const {country} = address;

  const currentCountry = countries?.find(({code}) => code === country);

  const defaultOrderedFields = [
    ['country'],
    ['firstName', 'lastName'],
  ] as FieldName[][];

  const orderedFields = currentCountry
    ? buildOrderedFields(currentCountry)
    : defaultOrderedFields;

  const zoneSelectOptions = currentCountry
    ? currentCountry.zones.map(({code, name}) => {
        return {value: code, label: name};
      })
    : [];

  return (
    <>
      <s-stack gap="base">
        {errorMessageDisplay ? (
          <s-banner tone="critical" heading={errorMessageDisplay} />
        ) : null}
        {orderedFields.map((line, index) => {
          return (
            <AddressLine
              i18n={i18n}
              // eslint-disable-next-line react/no-array-index-key
              key={`$line-${index}`}
              line={line}
              countries={countries}
              country={currentCountry ?? null}
              address={address}
              countrySelectOptions={countrySelectOptions}
              zoneSelectOptions={zoneSelectOptions}
              onChange={handleAddressChange}
              formErrors={formatUserErrorsForFields([])}
              disabled={loading}
            />
          );
        })}
      </s-stack>
      <s-button slot="secondary-actions" variant="secondary" onClick={onClose}>
        {i18n.translate('cancel')}
      </s-button>
      <s-button
        slot="primary-action"
        variant="primary"
        onClick={onSave}
        loading={loading}
      >
        {i18n.translate('addressModal.continue')}
      </s-button>
    </>
  );
}
