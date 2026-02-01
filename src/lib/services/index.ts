// Service layer exports
import { CustomerService } from './customer.service';
import { ProductService } from './product.service';
import { ProductModelService } from './product-model.service';
import { InventoryItemService } from './inventory-item.service';
import { SalesService } from './sales.service';
import { SettingsService } from './settings.service';
import { ReturnService } from './return.service';
import { InvoiceService } from './invoice.service';
import { CreditService } from './credit.service';
import { SwapService } from './swap.service';
import { accessoryService } from './accessory.service';
import { syncService } from './sync.service';

// Initialize services
export const customerService = new CustomerService();
export const productService = new ProductService();
export const productModelService = new ProductModelService();
export const inventoryItemService = new InventoryItemService();
export const salesService = new SalesService();
export const settingsService = new SettingsService();
export const returnService = new ReturnService();
export const invoiceService = new InvoiceService();
export const creditService = new CreditService();
export const swapService = new SwapService();
export { accessoryService };

// Export sync service
export { syncService };

// Export service types
export type { CustomerService, ProductService, ProductModelService, InventoryItemService, SalesService, SettingsService, ReturnService, InvoiceService, SwapService };