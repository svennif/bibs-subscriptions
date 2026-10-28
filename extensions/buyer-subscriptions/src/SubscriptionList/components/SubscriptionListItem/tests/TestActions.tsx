import {clickButton} from 'tests/utilities';

// Modals are always rendered with Polaris web components, so the trigger button
// only opens them in the browser. Clicking it still keeps these flows readable.
export async function subscriptionListPauseContract() {
  await clickButton('Pause');
  await clickButton('Pause subscription');
}

export async function subscriptionListResumeContract() {
  await clickButton('Resume');
  await clickButton('Continue');
}

export async function subscriptionListSkipNextOrder() {
  await clickButton('Skip next order');
  await clickButton('Skip');
}

export async function clickCloseButton() {
  await clickButton('Close');
}
