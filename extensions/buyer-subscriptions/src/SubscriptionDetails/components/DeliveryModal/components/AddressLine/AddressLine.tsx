import {useCallback} from 'preact/hooks';
import type {Country, Address as AddressType} from '@shopify/address';
import {FieldName} from '@shopify/address';
import type {I18n} from '@shopify/ui-extensions';

interface SelectOption {
  label: string;
  value: string;
}

interface AddressLineProps {
  i18n: I18n;
  countries: Country[];
  country: Country | null;
  line: FieldName[];
  address: AddressType;
  countrySelectOptions: SelectOption[];
  zoneSelectOptions: SelectOption[];
  onChange(newValue: Partial<AddressType>): void;
  formErrors: {[key in FieldName]?: string};
  disabled?: boolean;
}

function eventValue(event: Event) {
  return (event.currentTarget as HTMLInputElement).value;
}

export function AddressLine({
  i18n,
  line,
  countries,
  country,
  address,
  countrySelectOptions,
  zoneSelectOptions,
  onChange,
  formErrors,
  disabled,
}: AddressLineProps) {
  const displayLine = [...line];

  const handleChange = useCallback(
    (field: FieldName) => {
      return (event: Event) => {
        onChange({[field]: eventValue(event)});
      };
    },
    [onChange],
  );

  const handleCountryChange = useCallback(
    (event: Event) => {
      const nextCountryCode = eventValue(event);
      const country = countries.find(
        (country) => country.code === nextCountryCode,
      );
      onChange({
        zip: '',
        city: '',
        phone: '',
        address1: '',
        address2: '',
        country: nextCountryCode,
        province:
          country && country.zones.length > 0 ? country.zones[0].code : '',
      });
    },
    [countries, onChange],
  );

  const fields = displayLine
    .map((field) => {
      switch (field) {
        case FieldName.FirstName:
          return (
            <s-text-field
              key={field}
              label={
                country
                  ? country.labels.firstName
                  : i18n.translate('addressModal.firstName')
              }
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.LastName:
          return (
            <s-text-field
              key={field}
              label={
                country
                  ? country.labels.lastName
                  : i18n.translate('addressModal.lastName')
              }
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Country:
          return (
            <s-select
              key={field}
              label={
                country
                  ? country.labels.country
                  : i18n.translate('addressModal.country')
              }
              value={address[field]}
              onChange={handleCountryChange}
              error={formErrors[field]}
              disabled={disabled}
              placeholder={i18n.translate('addressModal.country')}
            >
              {countrySelectOptions.map(({value, label}) => (
                <s-option key={value} value={value}>
                  {label}
                </s-option>
              ))}
            </s-select>
          );
        case FieldName.Address1:
          if (!country) {
            return null;
          }
          return (
            <s-text-field
              key={field}
              label={country.labels.address1}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Address2:
          if (!country) {
            return null;
          }
          return (
            <s-text-field
              key={field}
              label={country.optionalLabels.address2}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Zone:
          if (!country) {
            return null;
          }
          return (
            <s-select
              key={field}
              label={country.labels.zone}
              value={address[field]}
              onChange={handleChange(field)}
              error={formErrors[field]}
              disabled={disabled}
            >
              {zoneSelectOptions.map(({value, label}) => (
                <s-option key={value} value={value}>
                  {label}
                </s-option>
              ))}
            </s-select>
          );
        case FieldName.PostalCode:
          if (!country) {
            return null;
          }
          return (
            <s-text-field
              key={field}
              label={country.labels.postalCode}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.City:
          if (!country) {
            return null;
          }
          return (
            <s-text-field
              key={field}
              label={country.labels.city}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        case FieldName.Phone:
          if (!country) {
            return null;
          }
          return (
            <s-phone-field
              key={field}
              label={country.labels.phone}
              onChange={handleChange(field)}
              value={address[field]}
              error={formErrors[field]}
              disabled={disabled}
            />
          );
        default:
          return null;
      }
    })
    .filter((field) => field !== null);

  const columns = new Array(fields.length).fill('1fr').join(' ');

  return fields.length > 0 ? (
    <s-query-container>
      <s-grid
        gridTemplateColumns={`@container (inline-size > 500px) ${columns}, 1fr`}
        gap="base"
      >
        {fields}
      </s-grid>
    </s-query-container>
  ) : null;
}
