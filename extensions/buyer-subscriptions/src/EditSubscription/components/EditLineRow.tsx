import {useExtensionApi} from 'foundation/Api';

import type {DraftLine, EditLine, EditProduct, EditVariant} from '../types';
import {
  isOptionValueAvailable,
  variantForOptionChange,
  variantForProductChange,
} from '../utilities';

interface EditLineRowProps {
  draftLine: DraftLine;
  products: EditProduct[];
  product?: EditProduct;
  variant?: EditVariant;
  originalLine?: EditLine;
  unitPrice: number;
  /** The selected variant is out of stock and was changed or added */
  unavailable: boolean;
  currencyCode: string;
  maxQuantity: number;
  onChange: (draftLine: DraftLine) => void;
  onRemove: () => void;
}

function eventValue(event: Event) {
  return (event.currentTarget as HTMLInputElement).value;
}

/**
 * Products without real options have a single "Title" option with the value
 * "Default Title", which isn't worth showing as a choice.
 */
function hasRealOptions(product: EditProduct) {
  return !(
    product.options.length === 1 &&
    product.options[0].values.length === 1 &&
    product.options[0].values[0] === 'Default Title'
  );
}

export function EditLineRow({
  draftLine,
  products,
  product,
  variant,
  originalLine,
  unitPrice,
  unavailable,
  currencyCode,
  maxQuantity,
  onChange,
  onRemove,
}: EditLineRowProps) {
  const {i18n} = useExtensionApi();

  const title = product?.title ?? originalLine?.title ?? '';
  const imageUrl =
    variant?.imageUrl ?? product?.imageUrl ?? originalLine?.imageUrl ?? '';
  const outOfStockLabel = i18n.translate('editSubscription.outOfStock');

  function handleProductChange(event: Event) {
    const nextProduct = products.find(({id}) => id === eventValue(event));
    if (!nextProduct) return;

    const nextVariant = variantForProductChange(
      nextProduct,
      variant?.selectedOptions ?? [],
    );
    if (!nextVariant) return;

    onChange({
      ...draftLine,
      productId: nextProduct.id,
      variantId: nextVariant.id,
    });
  }

  function handleOptionChange(optionName: string) {
    return (event: Event) => {
      if (!product) return;

      const nextVariant = variantForOptionChange(
        product,
        variant,
        optionName,
        eventValue(event),
      );
      if (!nextVariant) return;

      onChange({...draftLine, variantId: nextVariant.id});
    };
  }

  function handleQuantityChange(event: Event) {
    const quantity = Number.parseInt(eventValue(event), 10);
    onChange({...draftLine, quantity: Number.isNaN(quantity) ? 0 : quantity});
  }

  return (
    <s-box padding="base" border="base" borderRadius="base">
      <s-stack direction="inline" gap="base">
        {imageUrl ? <s-product-thumbnail src={imageUrl} alt={title} /> : null}
        <s-stack gap="base" inlineSize="100%">
          {product ? (
            <>
              <s-select
                label={i18n.translate('editSubscription.product')}
                value={product.id}
                onChange={handleProductChange}
              >
                {products.map((option) => (
                  <s-option key={option.id} value={option.id}>
                    {option.variants.some(
                      ({availableForSale}) => availableForSale,
                    )
                      ? option.title
                      : `${option.title} (${outOfStockLabel})`}
                  </s-option>
                ))}
              </s-select>
              {hasRealOptions(product)
                ? product.options.map((option) => (
                    <s-select
                      key={option.name}
                      label={option.name}
                      value={
                        variant?.selectedOptions.find(
                          ({name}) => name === option.name,
                        )?.value ?? ''
                      }
                      onChange={handleOptionChange(option.name)}
                    >
                      {option.values.map((value) => (
                        <s-option key={value} value={value}>
                          {isOptionValueAvailable(
                            product,
                            variant,
                            option.name,
                            value,
                          )
                            ? value
                            : `${value} (${outOfStockLabel})`}
                        </s-option>
                      ))}
                    </s-select>
                  ))
                : null}
            </>
          ) : (
            <s-stack gap="small-300">
              <s-text type="strong">{title}</s-text>
              {originalLine?.variantTitle ? (
                <s-text color="subdued">{originalLine.variantTitle}</s-text>
              ) : null}
              <s-text color="subdued">
                {i18n.translate('editSubscription.unavailableProduct')}
              </s-text>
            </s-stack>
          )}
          {unavailable ? (
            <s-text tone="critical">
              {i18n.translate('editSubscription.unavailableVariant', {
                title,
              })}
            </s-text>
          ) : null}
          <s-stack direction="inline" gap="base" alignItems="end">
            <s-number-field
              label={i18n.translate('editSubscription.quantity')}
              value={String(draftLine.quantity)}
              min={1}
              max={maxQuantity}
              step={1}
              inputMode="numeric"
              onChange={handleQuantityChange}
            />
            <s-button
              variant="secondary"
              tone="critical"
              accessibilityLabel={i18n.translate(
                'editSubscription.removeAccessibilityLabel',
                {title},
              )}
              onClick={onRemove}
            >
              {i18n.translate('editSubscription.remove')}
            </s-button>
          </s-stack>
          <s-text>
            {i18n.formatCurrency(unitPrice * draftLine.quantity, {
              currency: currencyCode,
            })}
          </s-text>
        </s-stack>
      </s-stack>
    </s-box>
  );
}
