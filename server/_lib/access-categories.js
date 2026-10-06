export const accessCategories = {
 general: 'General',
 general_diffusion: 'General Difusión',
 vip: 'VIP',
 backstage: 'Backstage'
};
export function accessCategoryOf(guest) {
 return Object.hasOwn(accessCategories, guest?.accessCategory) ? guest.accessCategory : 'general';
}
