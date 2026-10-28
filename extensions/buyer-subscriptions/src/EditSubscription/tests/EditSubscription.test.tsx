import {mockApis} from 'tests/mocks/api';
import {mockUseToast} from 'tests/mocks/toast';
import {mockUiExtensionComponents} from 'tests/mocks/components';
import {
  changeValue,
  changeValues,
  click,
  clickButton,
  getButton,
  mockNavigation,
  mountWithAppContext,
  queryAllButtons,
  queryByHeading,
} from 'tests/utilities';
import {screen} from '@testing-library/preact';
import {SuccessToastType} from 'utilities/hooks/useToast';

import {EditSubscription} from '../EditSubscription';
import type {SubscriptionEditData} from '../types';
import {APRICOT, PLAN_4_WEEKS, PLAN_6_WEEKS, createEditData} from './Fixtures';

const {mockExtensionApi, mockAppFetch} = mockApis();
const {mockShowSuccessToast} = mockUseToast();

const EDIT_PATH = '/customerAccount/subscription-edit?contractId=10&locale=en';

function mockEditApi({
  data = createEditData(),
  getStatus = 200,
  getBody,
  saveResponse = {body: {status: 'success'}},
}: {
  data?: SubscriptionEditData;
  getStatus?: number;
  getBody?: object;
  saveResponse?: {body: object; status?: number};
} = {}) {
  return mockAppFetch((_path, init) =>
    init?.method === 'POST'
      ? saveResponse
      : {body: getBody ?? data, status: getStatus},
  );
}

function postedBody(appFetch: ReturnType<typeof mockEditApi>) {
  const call = appFetch.mock.calls.find(([, init]) => init?.method === 'POST');
  return call ? JSON.parse(call[1]!.body as string) : undefined;
}

function selects(label: string) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(`s-select[label="${label}"]`),
  );
}

function quantityFields() {
  return Array.from(
    document.querySelectorAll<HTMLElement>('s-number-field[label="Quantity"]'),
  );
}

function saveButton() {
  return getButton('Save changes');
}

async function mountEditPage() {
  await mountWithAppContext(<EditSubscription id="10" />);
  await screen.findByText('Save changes');
}

describe('<EditSubscription />', () => {
  let navigate: ReturnType<typeof mockNavigation>['navigate'];

  beforeEach(() => {
    mockExtensionApi();
    mockUiExtensionComponents();
    ({navigate} = mockNavigation());
  });

  it('loads the edit options for the subscription in the customer language', async () => {
    const appFetch = mockEditApi();

    await mountEditPage();

    expect(appFetch).toHaveBeenCalledWith(EDIT_PATH);
    expect(selects('Product')).toHaveLength(2);
  });

  it('preselects the current delivery frequency', async () => {
    mockEditApi();

    await mountEditPage();

    const choiceList = document.querySelector('s-choice-list');
    expect(choiceList).toHaveAttribute('values', PLAN_4_WEEKS);
    expect(
      screen.getByText('Deliver every 6 weeks, 15% off'),
    ).toBeInTheDocument();
  });

  it('shows the item count and estimated price, and disables save without changes', async () => {
    mockEditApi();

    await mountEditPage();

    expect(screen.getByText('3 items')).toBeInTheDocument();
    expect(screen.getByText('$120.00')).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('disabled');
  });

  it('blocks saving below the minimum number of items', async () => {
    mockEditApi();

    await mountEditPage();
    await click(queryAllButtons('Remove')[0]);

    expect(
      screen.getByText('Subscriptions require a minimum of 3 items.'),
    ).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('disabled');
  });

  it('swaps a colour while keeping the selected options, and saves the full state', async () => {
    const appFetch = mockEditApi();

    await mountEditPage();
    await changeValue(selects('Product')[0], APRICOT.id);
    await clickButton('Save changes');

    expect(postedBody(appFetch)).toEqual({
      contractId: '10',
      sellingPlanId: 'gid://shopify/SellingPlan/4',
      lines: [
        {
          id: 'gid://shopify/SubscriptionLine/1',
          variantId: 'gid://shopify/ProductVariant/32',
          quantity: 1,
        },
        {
          id: 'gid://shopify/SubscriptionLine/2',
          variantId: 'gid://shopify/ProductVariant/21',
          quantity: 2,
        },
      ],
    });
  });

  it('removes and adds lines in the saved state', async () => {
    const appFetch = mockEditApi();

    await mountEditPage();
    await changeValue(quantityFields()[1], '3');
    await click(queryAllButtons('Remove')[0]);
    await clickButton('Add product');
    await clickButton('Save changes');

    expect(postedBody(appFetch).lines).toEqual([
      {
        id: 'gid://shopify/SubscriptionLine/2',
        variantId: 'gid://shopify/ProductVariant/21',
        quantity: 3,
      },
      {variantId: 'gid://shopify/ProductVariant/11', quantity: 1},
    ]);
  });

  it('changes the delivery frequency and updates the estimate', async () => {
    const appFetch = mockEditApi();

    await mountEditPage();
    await changeValues(document.querySelector<HTMLElement>('s-choice-list')!, [
      PLAN_6_WEEKS,
    ]);

    expect(screen.getByText('$127.50')).toBeInTheDocument();

    await clickButton('Save changes');

    expect(postedBody(appFetch).sellingPlanId).toBe(PLAN_6_WEEKS);
  });

  it('marks out of stock options and blocks saving them', async () => {
    mockEditApi();

    await mountEditPage();

    expect(screen.getByText('Symmetrical (out of stock)')).toBeInTheDocument();

    await changeValue(selects('Shape')[1], 'Symmetrical');

    expect(
      screen.getByText(/Colour - Lavender is out of stock in this option/),
    ).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('disabled');
  });

  it('blocks saving invalid quantities', async () => {
    mockEditApi();

    await mountEditPage();
    await changeValue(quantityFields()[0], '11');

    expect(
      screen.getByText('Quantities must be between 1 and 10.'),
    ).toBeInTheDocument();
    expect(saveButton()).toHaveAttribute('disabled');
  });

  it('shows a toast and goes back to the subscription after saving', async () => {
    const showToast = vi.fn();
    mockShowSuccessToast(showToast);
    mockEditApi();

    await mountEditPage();
    await changeValue(quantityFields()[0], '2');
    await clickButton('Save changes');

    expect(showToast).toHaveBeenCalledWith(
      SuccessToastType.SubscriptionUpdated,
    );
    expect(navigate).toHaveBeenCalledWith('extension:/subscriptions/10');
  });

  it('shows the error for the code returned by the app and keeps the form', async () => {
    mockEditApi({
      saveResponse: {
        body: {error: 'Out of stock', code: 'UNAVAILABLE'},
        status: 422,
      },
    });

    await mountEditPage();
    await changeValue(quantityFields()[0], '2');
    await clickButton('Save changes');

    expect(queryByHeading('Unable to update subscription')).not.toBeNull();
    expect(
      screen.getByText('One of the selected products is out of stock.'),
    ).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
    expect(selects('Product')).toHaveLength(2);
  });

  it('falls back to a generic error for unknown codes', async () => {
    mockEditApi({saveResponse: {body: {error: 'Boom'}, status: 500}});

    await mountEditPage();
    await changeValue(quantityFields()[0], '2');
    await clickButton('Save changes');

    expect(
      screen.getByText("We couldn't save your changes. Please try again."),
    ).toBeInTheDocument();
  });

  it('explains when the subscription cannot be edited', async () => {
    mockEditApi({
      getStatus: 422,
      getBody: {error: 'Not editable', code: 'NOT_EDITABLE'},
    });

    await mountWithAppContext(<EditSubscription id="10" />);

    expect(
      await screen.findByText(/This subscription can't be edited online/),
    ).toBeInTheDocument();
    expect(selects('Product')).toHaveLength(0);
  });

  it('does not allow editing cancelled subscriptions', async () => {
    const data = createEditData();
    mockEditApi({
      data: {...data, contract: {...data.contract, status: 'CANCELLED'}},
    });

    await mountWithAppContext(<EditSubscription id="10" />);

    expect(
      await screen.findByText(/This subscription can't be edited online/),
    ).toBeInTheDocument();
  });

  it('shows an error when loading fails', async () => {
    mockEditApi({getStatus: 404, getBody: {error: 'Not found'}});

    await mountWithAppContext(<EditSubscription id="10" />);

    expect(
      await screen.findByText(
        "We couldn't load your subscription. Please try again.",
      ),
    ).toBeInTheDocument();
  });
});
