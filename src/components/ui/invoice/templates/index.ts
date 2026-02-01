// Export all template configurations
export { remvinClassicTemplate } from './remvin-classic';
export { remvinMinimalTemplate } from './remvin-minimal';

// Export all preview components
export { RemvinClassicPreview } from './remvin-classic';
export { RemvinMinimalPreview } from './remvin-minimal';

// Array of all templates
import { InvoiceTemplate } from '../invoice-templates';
import { remvinClassicTemplate } from './remvin-classic';
import { remvinMinimalTemplate } from './remvin-minimal';

export const allTemplates: InvoiceTemplate[] = [
  remvinClassicTemplate,
  remvinMinimalTemplate,
];

// Templates visible in UI
export const visibleTemplates: InvoiceTemplate[] = [
  remvinClassicTemplate,
  remvinMinimalTemplate,
];
