export const accessCategories = {
 general: 'General',
 general_diffusion: 'General Difusión',
 vip: 'VIP',
 backstage: 'Backstage'
};
export function accessCategoryOf(guest) {
 return typeof guest?.accessCategory === 'string' && Object.hasOwn(accessCategories, guest.accessCategory) ? guest.accessCategory : 'general';
}
