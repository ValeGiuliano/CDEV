export let visualFatigueDisabled = false;
export function setVisualFatigueDisabled(v) {
  visualFatigueDisabled = v;
}

export let currentContact = null;
export function setCurrentContact(v) {
  currentContact = v;
}

export const dayRestarted = { value: false };
export function setDayRestarted(v) {
  dayRestarted.value = v;
}
