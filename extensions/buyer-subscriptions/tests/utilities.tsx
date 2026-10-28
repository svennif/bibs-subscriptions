import type {VNode} from 'preact';
import {act, fireEvent, render} from '@testing-library/preact';

export async function mountWithAppContext(component: VNode) {
  return render(component);
}

const CLICKABLE_SELECTOR = 's-button, s-link, s-clickable';

function matches(text: string | null | undefined, name: string | RegExp) {
  if (text == null) return false;
  const normalized = text.replace(/\s+/g, ' ').trim();
  return typeof name === 'string' ? normalized === name : name.test(normalized);
}

/**
 * Finds Polaris web component buttons/links by their visible text or
 * accessibility label.
 */
export function queryAllButtons(name: string | RegExp) {
  return Array.from(
    document.querySelectorAll<HTMLElement>(CLICKABLE_SELECTOR),
  ).filter(
    (element) =>
      matches(element.textContent, name) ||
      matches(element.getAttribute('accessibilityLabel'), name),
  );
}

export function queryButton(name: string | RegExp) {
  return queryAllButtons(name)[0] ?? null;
}

export function getButton(name: string | RegExp) {
  const button = queryButton(name);
  if (!button) {
    throw new Error(`Unable to find a button with the name "${name}"`);
  }
  return button;
}

/**
 * Clicks an element and waits for any async handlers to settle.
 */
export async function click(element: Element) {
  await act(async () => {
    fireEvent.click(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

export async function clickButton(name: string | RegExp) {
  await click(getButton(name));
}

/**
 * Dispatches a change event the way Polaris form components do, with the new
 * value set on the element.
 */
export async function changeValue(element: Element, value: string) {
  await act(async () => {
    (element as HTMLInputElement).value = value;
    fireEvent.change(element);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

/**
 * Elements such as s-modal and s-banner expose their title as `heading`.
 */
export function queryByHeading(heading: string) {
  return document.querySelector<HTMLElement>(
    `[heading="${heading.replace(/"/g, '\\"')}"]`,
  );
}

/**
 * Stubs `hideOverlay` on all elements, since happy-dom doesn't implement
 * Polaris web components. Use `hiddenOverlayIds` to see which were closed.
 */
export function mockHideOverlay() {
  const hideOverlay = vi.fn(function (this: HTMLElement) {});
  (HTMLElement.prototype as any).hideOverlay = hideOverlay;

  return {
    hideOverlay,
    hiddenOverlayIds: () =>
      hideOverlay.mock.contexts.map((element) => (element as HTMLElement).id),
  };
}
