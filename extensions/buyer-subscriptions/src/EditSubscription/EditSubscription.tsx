import {useRef, useState} from 'preact/hooks';
import {useExtensionApi} from 'foundation/Api';
import {SuccessToastType, useToast} from 'utilities/hooks/useToast';

import {EditLineRow} from './components/EditLineRow';
import {
  useSubscriptionEditData,
  type SaveResult,
} from './hooks/useSubscriptionEditData';
import type {DraftLine, SaveErrorCode, SubscriptionEditData} from './types';
import {
  findVariant,
  hasChanges,
  previewUnitPrice,
  toDraftLines,
} from './utilities';

const EDITABLE_STATUSES = ['ACTIVE', 'PAUSED'];

const SAVE_ERROR_CODES: SaveErrorCode[] = [
  'BELOW_MINIMUM',
  'INELIGIBLE_VARIANT',
  'UNAVAILABLE',
  'INVALID_PLAN',
  'INVALID_QUANTITY',
  'NOT_EDITABLE',
  'UPDATE_FAILED',
];

export function getSubscriptionDetailsUrl(id: string) {
  return `extension:/subscriptions/${id}`;
}

export function getEditSubscriptionUrl(id: string) {
  return `extension:/subscriptions/${id}/edit`;
}

interface EditSubscriptionProps {
  /** Numeric subscription contract id */
  id: string;
}

export function EditSubscription({id}: EditSubscriptionProps) {
  const {data, loading, error, save} = useSubscriptionEditData(id);

  if (loading) {
    return <EditSubscriptionSkeleton id={id} />;
  }

  if (error?.kind === 'not_editable') {
    return <EditSubscriptionUnavailable id={id} notEditable />;
  }

  if (error || !data) {
    return <EditSubscriptionUnavailable id={id} notEditable={false} />;
  }

  if (!EDITABLE_STATUSES.includes(data.contract.status)) {
    return <EditSubscriptionUnavailable id={id} notEditable />;
  }

  return <EditSubscriptionForm id={id} data={data} save={save} />;
}

interface EditSubscriptionFormProps {
  id: string;
  data: SubscriptionEditData;
  save: (input: {
    sellingPlanId: string;
    lines: DraftLine[];
  }) => Promise<SaveResult>;
}

function EditSubscriptionForm({id, data, save}: EditSubscriptionFormProps) {
  const {i18n} = useExtensionApi();
  const {showSuccessToast} = useToast();
  const {contract, products, sellingPlans, minQuantity, maxQuantity} = data;

  const [sellingPlanId, setSellingPlanId] = useState(
    contract.sellingPlanId ?? sellingPlans[0]?.id ?? '',
  );
  const [lines, setLines] = useState(() => toDraftLines(data.lines));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<SaveErrorCode | 'generic' | null>(
    null,
  );
  const nextLineKey = useRef(0);

  const plan = sellingPlans.find(({id: planId}) => planId === sellingPlanId);
  const planChanged = sellingPlanId !== contract.sellingPlanId;
  const detailsUrl = getSubscriptionDetailsUrl(id);

  const rows = lines.map((draftLine) => {
    const found = findVariant(products, draftLine.variantId);
    const product =
      found?.product ?? products.find(({id}) => id === draftLine.productId);
    const variant = found?.variant;
    const originalLine = data.lines.find(({id}) => id === draftLine.id);
    const variantChanged = originalLine?.variantId !== draftLine.variantId;

    return {
      draftLine,
      product,
      variant,
      originalLine,
      unavailable: Boolean(
        variant && !variant.availableForSale && variantChanged,
      ),
      unitPrice: previewUnitPrice({
        draftLine,
        originalLine,
        variant,
        plan,
        planChanged,
      }),
    };
  });

  const totalItems = lines.reduce((total, line) => total + line.quantity, 0);
  const estimatedTotal = rows.reduce(
    (total, row) => total + row.unitPrice * row.draftLine.quantity,
    0,
  );
  const belowMinimum = totalItems < minQuantity;
  const hasUnavailable = rows.some((row) => row.unavailable);
  const invalidQuantity = lines.some(
    ({quantity}) =>
      !Number.isInteger(quantity) || quantity < 1 || quantity > maxQuantity,
  );
  const changed = hasChanges(data.lines, lines, planChanged);
  const canSave =
    changed &&
    Boolean(plan) &&
    lines.length > 0 &&
    !belowMinimum &&
    !hasUnavailable &&
    !invalidQuantity &&
    !saving;

  const productToAdd = products.find((product) =>
    product.variants.some(({availableForSale}) => availableForSale),
  );

  function updateLine(key: string, nextLine: DraftLine) {
    setLines((current) =>
      current.map((line) => (line.key === key ? nextLine : line)),
    );
  }

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  function addLine() {
    const variant = productToAdd?.variants.find(
      ({availableForSale}) => availableForSale,
    );
    if (!productToAdd || !variant) return;

    nextLineKey.current += 1;
    setLines((current) => [
      ...current,
      {
        key: `new-${nextLineKey.current}`,
        productId: productToAdd.id,
        variantId: variant.id,
        quantity: 1,
      },
    ]);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError(null);

    const result = await save({sellingPlanId, lines});

    setSaving(false);

    if (!result.ok) {
      setSaveError(
        result.code && SAVE_ERROR_CODES.includes(result.code)
          ? result.code
          : 'generic',
      );
      return;
    }

    showSuccessToast(SuccessToastType.SubscriptionUpdated);
    navigation.navigate(detailsUrl);
  }

  return (
    <s-page heading={i18n.translate('editSubscription.title')}>
      <s-button
        slot="breadcrumb-actions"
        href={detailsUrl}
        accessibilityLabel={i18n.translate(
          'editSubscription.backToSubscription',
        )}
      />
      <s-stack gap="large">
        {saveError ? (
          <s-banner
            tone="critical"
            heading={i18n.translate('editSubscription.errorBannerTitle')}
          >
            {i18n.translate(`editSubscription.errors.${saveError}`, {
              count: minQuantity,
            })}
          </s-banner>
        ) : null}
        <s-section heading={i18n.translate('editSubscription.frequency')}>
          <s-choice-list
            label={i18n.translate('editSubscription.frequency')}
            labelAccessibilityVisibility="exclusive"
            values={[sellingPlanId]}
            onChange={(event: Event) => {
              const value = (
                event.currentTarget as HTMLElementTagNameMap['s-choice-list']
              ).values?.[0];

              if (value) {
                setSellingPlanId(value);
              }
            }}
          >
            {sellingPlans.map((sellingPlan) => (
              <s-choice key={sellingPlan.id} value={sellingPlan.id}>
                {sellingPlan.name}
              </s-choice>
            ))}
          </s-choice-list>
        </s-section>
        <s-section heading={i18n.translate('editSubscription.products')}>
          <s-stack gap="base">
            {rows.map((row) => (
              <EditLineRow
                key={row.draftLine.key}
                draftLine={row.draftLine}
                products={products}
                product={row.product}
                variant={row.variant}
                originalLine={row.originalLine}
                unitPrice={row.unitPrice}
                unavailable={row.unavailable}
                currencyCode={contract.currencyCode}
                maxQuantity={maxQuantity}
                onChange={(nextLine) => updateLine(row.draftLine.key, nextLine)}
                onRemove={() => removeLine(row.draftLine.key)}
              />
            ))}
            <s-stack direction="inline">
              <s-button
                variant="secondary"
                disabled={!productToAdd}
                onClick={addLine}
              >
                {i18n.translate('editSubscription.addProduct')}
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
        <s-section heading={i18n.translate('editSubscription.summary')}>
          <s-stack gap="base">
            {belowMinimum ? (
              <s-banner tone="warning">
                {i18n.translate('editSubscription.minimumItems', {
                  count: minQuantity,
                })}
              </s-banner>
            ) : null}
            {invalidQuantity ? (
              <s-banner tone="critical">
                {i18n.translate('editSubscription.invalidQuantity', {
                  max: maxQuantity,
                })}
              </s-banner>
            ) : null}
            <s-stack direction="inline" justifyContent="space-between">
              <s-text>
                {i18n.translate('editSubscription.totalItems', {
                  count: totalItems,
                })}
              </s-text>
            </s-stack>
            <s-stack direction="inline" justifyContent="space-between">
              <s-text>
                {i18n.translate('editSubscription.estimatedTotal')}
              </s-text>
              <s-text type="strong">
                {i18n.formatCurrency(estimatedTotal, {
                  currency: contract.currencyCode,
                })}
              </s-text>
            </s-stack>
            <s-text type="small" color="subdued">
              {i18n.translate('editSubscription.estimateNote')}
            </s-text>
            <s-stack direction="inline" gap="base" justifyContent="end">
              <s-button variant="secondary" href={detailsUrl}>
                {i18n.translate('editSubscription.discard')}
              </s-button>
              <s-button
                variant="primary"
                disabled={!canSave}
                loading={saving}
                onClick={handleSave}
              >
                {i18n.translate('editSubscription.save')}
              </s-button>
            </s-stack>
          </s-stack>
        </s-section>
      </s-stack>
    </s-page>
  );
}

function EditSubscriptionSkeleton({id}: {id: string}) {
  const {i18n} = useExtensionApi();

  return (
    <s-page heading={i18n.translate('editSubscription.title')}>
      <s-button
        slot="breadcrumb-actions"
        href={getSubscriptionDetailsUrl(id)}
        accessibilityLabel={i18n.translate(
          'editSubscription.backToSubscription',
        )}
      />
      <s-stack gap="large">
        <s-section id="edit-subscription-loading">
          <s-skeleton-paragraph />
          <s-skeleton-paragraph />
        </s-section>
        <s-section>
          <s-skeleton-paragraph />
          <s-skeleton-paragraph />
          <s-skeleton-paragraph />
        </s-section>
      </s-stack>
    </s-page>
  );
}

function EditSubscriptionUnavailable({
  id,
  notEditable,
}: {
  id: string;
  notEditable: boolean;
}) {
  const {i18n} = useExtensionApi();
  const detailsUrl = getSubscriptionDetailsUrl(id);

  return (
    <s-page heading={i18n.translate('editSubscription.title')}>
      <s-button
        slot="breadcrumb-actions"
        href={detailsUrl}
        accessibilityLabel={i18n.translate(
          'editSubscription.backToSubscription',
        )}
      />
      <s-stack gap="base">
        <s-banner tone={notEditable ? 'info' : 'critical'}>
          {i18n.translate(
            notEditable
              ? 'editSubscription.notEditable'
              : 'editSubscription.loadError',
          )}
        </s-banner>
        <s-link href={detailsUrl}>
          {i18n.translate('editSubscription.backToSubscription')}
        </s-link>
      </s-stack>
    </s-page>
  );
}
