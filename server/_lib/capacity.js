export function requestStatus(attending, capacity, confirmed) {
  if (!attending) return 'not_attending';
  return capacity > 0 && confirmed >= capacity ? 'waitlist' : 'pending';
}
export function hasSpace(capacity, confirmed) {
  return capacity === 0 || confirmed < capacity;
}
