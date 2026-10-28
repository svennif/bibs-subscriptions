import {click} from 'tests/utilities';

/**
 * Polaris form fields expose their label as an attribute rather than text.
 */
export function queryField(label: string) {
  return document.querySelector<HTMLElement>(
    `[label="${label.replace(/"/g, '\\"')}"]`,
  );
}

export function getField(label: string) {
  const field = queryField(label);
  if (!field) {
    throw new Error(`Unable to find a field labelled "${label}"`);
  }
  return field;
}

function textOf(element: Element) {
  return element.textContent?.replace(/\s+/g, ' ').trim();
}

/**
 * Finds a button or link with the given text inside `root`. Modals are always
 * rendered, so scoping to a modal avoids matching buttons in other modals.
 */
export function getButtonWithin(root: Element | null, name: string) {
  if (!root) {
    throw new Error(`Unable to search for "${name}" in a missing element`);
  }

  const button = Array.from(
    root.querySelectorAll('s-button, s-link, s-clickable'),
  ).find((element) => textOf(element) === name);

  if (!button) {
    throw new Error(`Unable to find a button with the name "${name}"`);
  }

  return button as HTMLElement;
}

export async function clickButtonWithin(root: Element | null, name: string) {
  await click(getButtonWithin(root, name));
}

export function getModal(id: string) {
  return document.getElementById(id);
}

/**
 * Page level actions are slotted buttons that are direct children of s-page.
 */
export function queryPageAction(name: string) {
  return (
    Array.from(
      document.querySelectorAll<HTMLElement>('s-page > s-button[slot]'),
    ).find((element) => textOf(element) === name) ?? null
  );
}
