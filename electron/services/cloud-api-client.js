/**
 * Cloud API Client
 * 
 * Abstract interface for cloud storage providers (Supabase, Firebase, etc.)
 * Handles authentication, data sync, and conflict detection.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');

/**
 * Node.js fetch replacement using built-in https/http modules
 */
async function nodeFetch(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: options.headers || {},
      timeout: options.timeout || 10000
    };

    // Handle timeout
    const timeout = setTimeout(() => {
      req.destroy();
      reject(new Error('Request timeout'));
    }, requestOptions.timeout);

    const req = httpModule.request(requestOptions, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        clearTimeout(timeout);
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          statusText: res.statusMessage,
          headers: res.headers,
          text: async () => data,
          json: async () => {
            try {
              return JSON.parse(data);
            } catch (e) {
              throw new Error('Invalid JSON response');
            }
          }
        });
      });
    });

    req.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Send body if provided
    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

/**
 * Create Cloud API Client
 * Supports multiple providers: supabase, firebase, custom
 */
function createCloudApiClient(provider = 'supabase', config = {}) {
  let client = null;
  let isConfigured = false;

  /**
   * Initialize client based on provider
   */
  function initialize() {
    if (!config.url || !config.apiKey) {
      isConfigured = false;
      return { success: false, error: 'Missing cloud configuration' };
    }

    try {
      switch (provider.toLowerCase()) {
        case 'supabase':
          client = createSupabaseClient(config);
          break;
        case 'firebase':
          client = createFirebaseClient(config);
          break;
        case 'custom':
          client = createCustomClient(config);
          break;
        default:
          return { success: false, error: `Unknown provider: ${provider}` };
      }

      isConfigured = true;
      return { success: true };
    } catch (error) {
      isConfigured = false;
      return { success: false, error: error.message };
    }
  }

  /**
   * Supabase Client Implementation
   * Uses Supabase REST API (PostgREST)
   */
  function createSupabaseClient(config) {
    const baseUrl = config.url.replace(/\/$/, '');
    const apiKey = config.apiKey;
    const tablePrefix = config.tablePrefix || '';

    // Helper to build table URL
    const getTableUrl = (tableName) => {
      return `${baseUrl}/rest/v1/${tablePrefix}${tableName}`;
    };

    // Helper to get standard headers
    const getHeaders = () => ({
      'apikey': apiKey,
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation' // Return the inserted/updated row
    });

    /**
     * Convert camelCase field names to snake_case for Supabase
     */
    function convertToSnakeCase(obj) {
      if (!obj || typeof obj !== 'object') return obj;
      if (Array.isArray(obj)) return obj.map(convertToSnakeCase);
      
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        // Handle special cases first
        if (key === 'minStock') converted['min_stock'] = value;
        else if (key === 'isActive') converted['is_active'] = value !== undefined ? (value ? 1 : 0) : 1;
        else if (key === 'createdAt') converted['created_at'] = value;
        else if (key === 'updatedAt') converted['updated_at'] = value;
        else if (key === 'customerId') converted['customer_id'] = value;
        else if (key === 'customerName') converted['customer_name'] = value;
        else if (key === 'customerEmail') converted['customer_email'] = value;
        else if (key === 'customerAddress') converted['customer_address'] = value;
        else if (key === 'customerPhone') converted['customer_phone'] = value;
        else if (key === 'invoiceId') converted['invoice_id'] = value;
        else if (key === 'invoiceNumber') converted['invoice_number'] = value;
        else if (key === 'invoiceType') converted['invoice_type'] = value;
        else if (key === 'paidAmount') converted['paid_amount'] = value;
        else if (key === 'dueDate') converted['due_date'] = value;
        else if (key === 'bankDetails') converted['bank_details'] = value;
        else if (key === 'saleId') converted['sale_id'] = value;
        else if (key === 'userId') converted['user_id'] = value;
        else if (key === 'salesRepName') converted['sales_rep_name'] = value || null;
        else if (key === 'salesRepId') converted['sales_rep_id'] = value || null;
        else if (key === 'salesRep') converted['sales_rep_name'] = value || null; // Handle 'salesRep' alias (from getInvoiceById)
        else if (key === 'cashierName') converted['cashier_name'] = value;
        else if (key === 'cashierEmployeeId') converted['cashier_employee_id'] = value;
        else if (key === 'hasBackorder') converted['has_backorder'] = value !== undefined ? (value ? 1 : 0) : 0;
        else if (key === 'backorderDetails') converted['backorder_details'] = value;
        else if (key === 'storeCredit') converted['store_credit'] = value;
        else if (key === 'debtPayments') converted['debt_payments'] = value;
        else if (key === 'paymentMethod') converted['payment_method'] = value;
        else if (key === 'refundMethod') converted['refund_method'] = value;
        else if (key === 'paymentStatus') converted['payment_status'] = value;
        else if (key === 'expectedDeliveryDate') converted['expected_delivery_date'] = value;
        else if (key === 'actualDeliveryDate') converted['actual_delivery_date'] = value;
        else if (key === 'returnNumber') converted['return_number'] = value;
        else if (key === 'orderNumber') converted['order_number'] = value;
        else if (key === 'supplierId') converted['supplier_id'] = value;
        else if (key === 'supplierName') converted['supplier_name'] = value;
        else if (key === 'processedBy') converted['processed_by'] = value;
        else if (key === 'fullName') converted['full_name'] = value;
        else if (key === 'passwordHash') converted['password_hash'] = value;
        else if (key === 'employeeId') converted['employee_id'] = value;
        else if (key === 'lastLogin') converted['last_login'] = value;
        // New architecture fields
        else if (key === 'productModelId') converted['product_model_id'] = value;
        else if (key === 'storageOptions') converted['storage_options'] = value;
        else if (key === 'minStock') converted['min_stock'] = value;
        else if (key === 'productId') converted['product_id'] = value;
        else if (key === 'soldDate') converted['sold_date'] = value;
        else if (key === 'purchaseCost') converted['purchase_cost'] = value;
        else if (key === 'warrantyExpiry') converted['warranty_expiry'] = value;
        else if (key === 'accessoryProductId') converted['accessory_product_id'] = value;
        else if (key === 'linkedProductId') converted['linked_product_id'] = value;
        else if (key === 'isMandatory') converted['is_mandatory'] = value !== undefined ? (value ? 1 : 0) : 0;
        else if (key === 'defaultQuantity') converted['default_quantity'] = value;
        else if (key === 'displayOrder') converted['display_order'] = value;
        else if (key === 'swapNumber') converted['swap_number'] = value;
        else if (key === 'purchasedProductId') converted['purchased_product_id'] = value;
        else if (key === 'purchasedProductName') converted['purchased_product_name'] = value;
        else if (key === 'purchasedProductPrice') converted['purchased_product_price'] = value;
        else if (key === 'tradeInProductId') converted['trade_in_product_id'] = value;
        else if (key === 'tradeInProductName') converted['trade_in_product_name'] = value;
        else if (key === 'tradeInImei') converted['trade_in_imei'] = value;
        else if (key === 'tradeInCondition') converted['trade_in_condition'] = value;
        else if (key === 'tradeInNotes') converted['trade_in_notes'] = value;
        else if (key === 'tradeInValue') converted['trade_in_value'] = value;
        else if (key === 'differencePaid') converted['difference_paid'] = value;
        else if (key === 'inventoryItemId') converted['inventory_item_id'] = value;
        else {
          // Convert camelCase to snake_case for other fields
          const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
          converted[snakeKey] = convertToSnakeCase(value);
        }
      }
      return converted;
    }

    /**
     * Convert snake_case to camelCase (for data coming from Supabase)
     * Needed when pulling data from Supabase (snake_case) to local DB (camelCase)
     */
    function convertToCamelCase(obj) {
      if (obj === null || obj === undefined) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(convertToCamelCase);
      }
      
      if (typeof obj !== 'object' || obj instanceof Date) {
        return obj;
      }
      
      const converted = {};
      for (const [key, value] of Object.entries(obj)) {
        // Handle specific known conversions
        let camelKey = key;
        if (key === 'customer_id') camelKey = 'customerId';
        else if (key === 'customer_name') camelKey = 'customerName';
        else if (key === 'customer_email') camelKey = 'customerEmail';
        else if (key === 'customer_address') camelKey = 'customerAddress';
        else if (key === 'customer_phone') camelKey = 'customerPhone';
        else if (key === 'sale_id') camelKey = 'saleId';
        else if (key === 'user_id') camelKey = 'userId';
        else if (key === 'sales_rep_name') camelKey = 'salesRepName';
        else if (key === 'sales_rep_id') camelKey = 'salesRepId';
        else if (key === 'invoice_id') camelKey = 'invoiceId';
        else if (key === 'invoice_number') camelKey = 'invoiceNumber';
        else if (key === 'invoice_type') camelKey = 'invoiceType';
        else if (key === 'paid_amount') camelKey = 'paidAmount';
        else if (key === 'due_date') camelKey = 'dueDate';
        else if (key === 'bank_details') camelKey = 'bankDetails';
        else if (key === 'created_at') camelKey = 'createdAt';
        else if (key === 'updated_at') camelKey = 'updatedAt';
        else if (key === 'order_number') camelKey = 'orderNumber';
        else if (key === 'supplier_id') camelKey = 'supplierId';
        else if (key === 'supplier_name') camelKey = 'supplierName';
        else if (key === 'payment_method') camelKey = 'paymentMethod';
        else if (key === 'payment_status') camelKey = 'paymentStatus';
        else if (key === 'expected_delivery_date') camelKey = 'expectedDeliveryDate';
        else if (key === 'actual_delivery_date') camelKey = 'actualDeliveryDate';
        else if (key === 'return_number') camelKey = 'returnNumber';
        else if (key === 'refund_method') camelKey = 'refundMethod';
        else if (key === 'processed_by') camelKey = 'processedBy';
        else if (key === 'debt_id') camelKey = 'debtId';
        else if (key === 'full_name') camelKey = 'fullName';
        else if (key === 'password_hash') camelKey = 'passwordHash';
        else if (key === 'employee_id') camelKey = 'employeeId';
        else if (key === 'last_login') camelKey = 'lastLogin';
        else if (key === 'is_active') camelKey = 'isActive';
        else if (key === 'store_credit') camelKey = 'storeCredit';
        else if (key === 'has_backorder') camelKey = 'hasBackorder';
        else if (key === 'backorder_details') camelKey = 'backorderDetails';
        else if (key === 'cashier_name') camelKey = 'cashierName';
        else if (key === 'cashier_employee_id') camelKey = 'cashierEmployeeId';
        // New architecture fields
        else if (key === 'product_model_id') camelKey = 'productModelId';
        else if (key === 'storage_options') camelKey = 'storageOptions';
        else if (key === 'min_stock') camelKey = 'minStock';
        else if (key === 'product_id') camelKey = 'productId';
        else if (key === 'sold_date') camelKey = 'soldDate';
        else if (key === 'purchase_cost') camelKey = 'purchaseCost';
        else if (key === 'warranty_expiry') camelKey = 'warrantyExpiry';
        else if (key === 'accessory_product_id') camelKey = 'accessoryProductId';
        else if (key === 'linked_product_id') camelKey = 'linkedProductId';
        else if (key === 'is_mandatory') camelKey = 'isMandatory';
        else if (key === 'default_quantity') camelKey = 'defaultQuantity';
        else if (key === 'display_order') camelKey = 'displayOrder';
        else if (key === 'swap_number') camelKey = 'swapNumber';
        else if (key === 'purchased_product_id') camelKey = 'purchasedProductId';
        else if (key === 'purchased_product_name') camelKey = 'purchasedProductName';
        else if (key === 'purchased_product_price') camelKey = 'purchasedProductPrice';
        else if (key === 'trade_in_product_id') camelKey = 'tradeInProductId';
        else if (key === 'trade_in_product_name') camelKey = 'tradeInProductName';
        else if (key === 'trade_in_imei') camelKey = 'tradeInImei';
        else if (key === 'trade_in_condition') camelKey = 'tradeInCondition';
        else if (key === 'trade_in_notes') camelKey = 'tradeInNotes';
        else if (key === 'trade_in_value') camelKey = 'tradeInValue';
        else if (key === 'difference_paid') camelKey = 'differencePaid';
        else if (key === 'inventory_item_id') camelKey = 'inventoryItemId';
        else {
          // Generic snake_case to camelCase conversion
          camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        }
        
        converted[camelKey] = convertToCamelCase(value);
      }
      return converted;
    }

    return {
      /**
       * Helper function to look up Supabase UUID by SQLite ID using alternative unique fields
       * This maintains relationships when syncing records with foreign keys
       */
      async lookupSupabaseUuid(sqliteId, tableName, uniqueFields = {}) {
        if (!sqliteId) return null;
        
        // If already a UUID, return as-is
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(sqliteId)) return sqliteId;
        
        // Build query based on unique fields
        let query = '';
        const queryParams = [];
        
        if (tableName === 'customers' && uniqueFields.phone && uniqueFields.name) {
          query = `phone=eq.${encodeURIComponent(uniqueFields.phone)}&name=eq.${encodeURIComponent(uniqueFields.name)}`;
        } else if (tableName === 'products' && uniqueFields.sku) {
          query = `sku=eq.${encodeURIComponent(uniqueFields.sku)}`;
        } else if (tableName === 'products' && uniqueFields.name) {
          query = `name=eq.${encodeURIComponent(uniqueFields.name)}`;
        } else if (tableName === 'sales' && uniqueFields.invoice_number) {
          query = `invoice_number=eq.${encodeURIComponent(uniqueFields.invoice_number)}`;
        } else if (tableName === 'inventory_items' && uniqueFields.imei) {
          query = `imei=eq.${encodeURIComponent(uniqueFields.imei)}`;
        } else if (tableName === 'swaps' && uniqueFields.swap_number) {
          query = `swap_number=eq.${encodeURIComponent(uniqueFields.swap_number)}`;
        }
        
        if (!query) return null; // Can't look up without unique fields
        
        try {
          const url = `${getTableUrl(tableName)}?${query}&select=id&limit=1`;
          const response = await nodeFetch(url, {
            method: 'GET',
            headers: getHeaders(),
            timeout: 5000
          });
          
          if (response.ok) {
            const text = await response.text();
            if (text) {
              const records = JSON.parse(text);
              if (Array.isArray(records) && records.length > 0 && records[0].id) {
                return records[0].id;
              }
            }
          }
        } catch (error) {
          console.warn(`[Sync] Failed to lookup UUID for ${tableName}:${sqliteId}:`, error.message);
        }
        
        return null;
      },

      async upsertRecord(tableName, recordId, data, retries = 3) {
        // UUID format regex for validation
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            // Define valid columns for each table (matching SQLite/Supabase schema exactly)
            const tableColumns = {
              'customers': ['id', 'name', 'email', 'phone', 'address', 'created_at', 'updated_at', 'avatar', 'city', 'state', 'zip', 'country', 'company', 'notes', 'is_active', 'store_credit'],
              'product_models': ['id', 'name', 'brand', 'category', 'description', 'image', 'colors', 'storage_options', 'is_active', 'created_at', 'updated_at'],
              'products': ['id', 'name', 'description', 'price', 'cost', 'sku', 'category', 'stock', 'min_stock', 'product_model_id', 'storage', 'color', 'created_at', 'updated_at', 'image', 'is_active'],
              'inventory_items': ['id', 'product_id', 'imei', 'status', 'condition', 'sale_id', 'customer_id', 'sold_date', 'purchase_cost', 'warranty_expiry', 'notes', 'created_at', 'updated_at'],
              'product_accessories': ['id', 'product_model_id', 'accessory_product_id', 'linked_product_id', 'is_mandatory', 'default_quantity', 'display_order', 'created_at', 'updated_at'],
              'sales': ['id', 'customer_id', 'customer_name', 'items', 'subtotal', 'tax', 'taxes', 'discount', 'total', 'status', 'payment_method', 'notes', 'has_backorder', 'backorder_details', 'created_at', 'updated_at', 'invoice_id', 'invoice_number', 'user_id', 'cashier_name', 'cashier_employee_id'],
              'invoices': ['id', 'number', 'customer_id', 'customer_name', 'customer_email', 'customer_address', 'customer_phone', 'items', 'subtotal', 'tax', 'taxes', 'discount', 'total', 'paid_amount', 'status', 'invoice_type', 'currency', 'due_date', 'notes', 'terms', 'bank_details', 'created_at', 'updated_at', 'sale_id', 'user_id', 'sales_rep_name', 'sales_rep_id'],
              'returns': ['id', 'return_number', 'sale_id', 'customer_id', 'customer_name', 'items', 'subtotal', 'tax', 'total', 'refund_amount', 'refund_method', 'status', 'processed_by', 'notes', 'created_at', 'updated_at'],
              'swaps': ['id', 'swap_number', 'customer_id', 'customer_name', 'customer_phone', 'customer_email', 'customer_address', 'sale_id', 'purchased_product_id', 'purchased_product_name', 'purchased_product_price', 'trade_in_product_id', 'trade_in_product_name', 'trade_in_imei', 'trade_in_condition', 'trade_in_notes', 'trade_in_value', 'difference_paid', 'payment_method', 'status', 'inventory_item_id', 'notes', 'created_at', 'updated_at'],
              'deals': ['id', 'title', 'customer_id', 'customer_name', 'value', 'probability', 'stage', 'expected_close_date', 'actual_close_date', 'source', 'priority', 'tags', 'notes', 'negotiation_history', 'stakeholders', 'competitor_info', 'created_at', 'updated_at'],
              'debts': ['id', 'customer_id', 'amount', 'paid', 'created_at', 'status', 'description', 'items', 'sale_id'], // NO customer_name, customer_phone, payments
              'debt_payments': ['id', 'debt_id', 'amount', 'date', 'method'], // NO updated_at
              'users': ['id', 'username', 'password_hash', 'full_name', 'email', 'phone', 'role', 'employee_id', 'is_active', 'created_at', 'updated_at', 'last_login'],
              'boqs': ['id', 'boq_number', 'date', 'project_title', 'company_name', 'company_address', 'company_phone', 'client_name', 'client_address', 'items', 'notes', 'manager_signature', 'total_le', 'total_usd', 'created_at', 'updated_at'],
              'invoice_templates': ['id', 'name', 'description', 'preview', 'colors_primary', 'colors_secondary', 'colors_accent', 'colors_background', 'colors_text', 'fonts_primary', 'fonts_secondary', 'fonts_size', 'layout_header_style', 'layout_show_logo', 'layout_show_border', 'layout_item_table_style', 'layout_footer_style', 'custom_schema', 'is_default', 'created_at', 'updated_at']
            };
            
            // Prepare data with updated_at timestamp and ensure id is included
            // Remove id from data spread to avoid duplication
            // Also remove nested relationships (arrays/objects that aren't columns)
            const { id, payments, ...dataWithoutId } = data;
            
            // Convert camelCase to snake_case for Supabase
            const convertedData = convertToSnakeCase(dataWithoutId);
            
            // Get valid columns for this table
            const validColumns = tableColumns[tableName] || [];
            
            // Filter to only include valid columns for this table (removes JOIN fields, nested objects, etc.)
            const cleanedData = {};
            for (const [key, value] of Object.entries(convertedData)) {
              // Only include if it's a valid column for this table
              if (validColumns.includes(key)) {
                // Handle JSONB fields - Supabase expects actual JSON objects/arrays, not strings
                const jsonbFields = ['items', 'notes', 'tags', 'negotiation_history', 'stakeholders', 'bank_details', 'taxes', 'backorder_details', 'colors', 'storage_options', 'custom_schema'];
                if (jsonbFields.includes(key)) {
                  // If it's already a string (from SQLite), parse it; if it's an object/array, use it directly
                  if (typeof value === 'string') {
                    try {
                      cleanedData[key] = JSON.parse(value);
                    } catch (e) {
                      // If parsing fails, try to use as-is or default to empty array
                      cleanedData[key] = value === '' ? [] : value;
                    }
                  } else if (Array.isArray(value) || (typeof value === 'object' && value !== null && !(value instanceof Date))) {
                    // Already a JSON object/array, use directly
                    cleanedData[key] = value;
                  } else {
                    cleanedData[key] = value !== undefined ? value : null;
                  }
                } else if (key === 'is_active' || key === 'is_mandatory' || key === 'has_backorder' || key === 'onboarding_completed') {
                  // Convert boolean fields - Supabase expects true/false, not 1/0
                  if (value === 1 || value === '1' || value === true) {
                    cleanedData[key] = true;
                  } else if (value === 0 || value === '0' || value === false) {
                    cleanedData[key] = false;
                  } else {
                    cleanedData[key] = value !== undefined ? value : null;
                  }
                } else if (!Array.isArray(value) && (typeof value !== 'object' || value === null || value instanceof Date || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean')) {
                  // Ensure null/undefined values are preserved as null (not filtered out)
                  cleanedData[key] = value !== undefined ? value : null;
                }
              }
            }
            
            // Debug logging for troubleshooting 400 errors
            if (tableName === 'product_models' || tableName === 'inventory_items' || tableName === 'swaps' || tableName === 'product_accessories') {
              console.log(`[Sync Debug] ${tableName} ${recordId}:`, {
                keys: Object.keys(cleanedData),
                colors: cleanedData.colors,
                storage_options: cleanedData.storage_options,
                is_active: cleanedData.is_active,
                is_mandatory: cleanedData.is_mandatory,
                dataTypes: Object.fromEntries(Object.entries(cleanedData).map(([k, v]) => [k, typeof v]))
              });
            }
            if (tableName === 'invoices') {
              console.log(`[Sync Debug] Invoice ${recordId} - sales_rep_name:`, cleanedData.sales_rep_name, 'user_id:', cleanedData.user_id);
            }
            if (tableName === 'users') {
              console.log(`[Sync Debug] User ${recordId} - username:`, cleanedData.username, 'full_name:', cleanedData.full_name, 'has password_hash:', !!cleanedData.password_hash);
            }
            
            // Ensure required NOT NULL fields have default values
            if (tableName === 'sales') {
              if (!cleanedData.items || (Array.isArray(cleanedData.items) && cleanedData.items.length === 0)) {
                cleanedData.items = []; // Default empty array (JSONB expects array, not string)
              }
              if (cleanedData.subtotal === undefined || cleanedData.subtotal === null) {
                cleanedData.subtotal = 0;
              }
              if (cleanedData.tax === undefined || cleanedData.tax === null) {
                cleanedData.tax = 0;
              }
              // Ensure discount is always set (NOT NULL constraint in Supabase)
              if (cleanedData.discount === undefined || cleanedData.discount === null) {
                cleanedData.discount = 0;
              }
            }
            
            // Handle JSONB fields for product_models (colors, storage_options) - ensure they're arrays, not strings
            if (tableName === 'product_models') {
              if (!cleanedData.colors || (Array.isArray(cleanedData.colors) && cleanedData.colors.length === 0)) {
                cleanedData.colors = []; // Default empty array (JSONB expects array, not string)
              }
              if (!cleanedData.storage_options || (Array.isArray(cleanedData.storage_options) && cleanedData.storage_options.length === 0)) {
                cleanedData.storage_options = []; // Default empty array (JSONB expects array, not string)
              }
            }
            
            // Note: Foreign key conversion should already be done by convertForeignKeysUsingMapping in sync-service.js
            // If we still have non-UUID foreign keys here, it means the mapping wasn't found
            // For product_accessories, check required fields (product_model_id, accessory_product_id are NOT NULL)
            // For inventory_items, product_id is required
            if (tableName === 'product_accessories') {
              const missingFields = [];
              if (!cleanedData.product_model_id || !uuidRegex.test(cleanedData.product_model_id)) {
                missingFields.push('product_model_id');
              }
              if (!cleanedData.accessory_product_id || !uuidRegex.test(cleanedData.accessory_product_id)) {
                missingFields.push('accessory_product_id');
              }
              // linked_product_id is nullable, so we can convert to null if needed
              if (cleanedData.linked_product_id && !uuidRegex.test(cleanedData.linked_product_id)) {
                console.warn(`[Sync Warning] product_accessories ${recordId}: linked_product_id ${cleanedData.linked_product_id} is not UUID format, converting to null`);
                cleanedData.linked_product_id = null;
              }
              if (missingFields.length > 0) {
                return {
                  success: false,
                  error: `Missing required UUID fields (${missingFields.join(', ')}) - parent records may not have synced yet. Will retry after parent sync.`,
                  isTransient: true
                };
              }
            }
            
            // Check required foreign keys for inventory_items
            if (tableName === 'inventory_items') {
              if (cleanedData.product_id && !uuidRegex.test(cleanedData.product_id)) {
                return {
                  success: false,
                  error: `product_id ${cleanedData.product_id} is not a valid UUID - parent product may not have synced yet. Will retry after parent sync.`,
                  isTransient: true
                };
              }
            }
            
            // Also handle product_model_id for products table
            if (tableName === 'products' && cleanedData.product_model_id) {
              if (!uuidRegex.test(cleanedData.product_model_id)) {
                console.warn(`[Sync Warning] products ${recordId}: product_model_id ${cleanedData.product_model_id} is not UUID format, converting to null`);
                cleanedData.product_model_id = null;
              }
            }
            
            // Ensure required NOT NULL fields for swaps table
            if (tableName === 'swaps') {
              if (!cleanedData.swap_number) {
                // Generate swap number if missing (shouldn't happen, but safety check)
                cleanedData.swap_number = `SWAP-${Date.now()}`;
              }
              if (!cleanedData.status) {
                cleanedData.status = 'completed'; // Default status
              }
              if (cleanedData.difference_paid === undefined || cleanedData.difference_paid === null) {
                cleanedData.difference_paid = 0;
              }
              
              // Look up Supabase UUIDs for foreign keys using available unique fields
              // This maintains relationships when syncing
              // Note: We can't use await here as this is not in an async context
              // Foreign keys with SQLite IDs will be kept - they'll work if parent records sync first
              // The sync service should sync in dependency order: customers/products -> sales -> swaps/inventory_items
            }
            
            // Ensure required NOT NULL fields for inventory_items
            if (tableName === 'inventory_items') {
              if (!cleanedData.status) {
                cleanedData.status = 'in_stock'; // Default status
              }
              if (!cleanedData.condition) {
                cleanedData.condition = 'new'; // Default condition
              }
              
              // Look up Supabase UUIDs for foreign keys to maintain relationships
              // Note: We can't look up these foreign keys without additional context,
              // so they'll remain as SQLite IDs for now and may need parent records synced first
              // The sync service should sync parent records (customers, products, sales) before child records
            }
            
            // Ensure required NOT NULL fields for users table
            if (tableName === 'users') {
              // If any required field is missing, skip this record (don't sync incomplete users)
              if (!cleanedData.username || !cleanedData.password_hash || !cleanedData.full_name) {
                console.error(`[Sync Error] User ${recordId} missing required fields - username: ${!!cleanedData.username}, password_hash: ${!!cleanedData.password_hash}, full_name: ${!!cleanedData.full_name}`);
                throw new Error(`Cannot sync user ${recordId}: missing required fields (username, password_hash, or full_name)`);
              }
              // Ensure role has default value
              if (!cleanedData.role || cleanedData.role === '') {
                cleanedData.role = 'cashier'; // Default role
              }
              // Ensure is_active has default value
              if (cleanedData.is_active === undefined || cleanedData.is_active === null) {
                cleanedData.is_active = 1; // Default to active
              }
            }
            
            const recordData = {
              id: recordId,
              ...cleanedData
            };
            
            // Only add updated_at if the table supports it (not debts or debt_payments)
            const tablesWithoutUpdatedAt = ['debts', 'debt_payments'];
            if (!tablesWithoutUpdatedAt.includes(tableName)) {
              recordData.updated_at = new Date().toISOString();
            }

            // PostgREST upsert strategy: Try PATCH first (update if exists)
            // If no rows affected, then POST (insert new)
            
            // Check if recordId is a valid UUID format
            const isUUID = uuidRegex.test(recordId);
            
            // For tables with SQLite-style IDs (non-UUID), use alternative unique identifiers
            let patchUrl;
            if (!isUUID) {
              // Use alternative unique fields for tables that don't have UUID IDs in SQLite
              if (tableName === 'swaps' && cleanedData.swap_number) {
                patchUrl = `${getTableUrl(tableName)}?swap_number=eq.${encodeURIComponent(cleanedData.swap_number)}`;
              } else if (tableName === 'inventory_items' && cleanedData.imei) {
                patchUrl = `${getTableUrl(tableName)}?imei=eq.${encodeURIComponent(cleanedData.imei)}`;
              } else {
                // For other tables without UUID and no alternative unique field, skip PATCH and go straight to POST
                patchUrl = null;
              }
            } else {
              // Use standard id lookup for UUID format
              patchUrl = `${getTableUrl(tableName)}?id=eq.${encodeURIComponent(recordId)}`;
            }
            
            // Try PATCH first (update existing record) - skip if patchUrl is null
            if (!patchUrl) {
              console.log(`PATCH: Skipping for ${tableName}:${recordId} (non-UUID ID, no alternative unique field), will insert via POST`);
            }
            
            // Only try PATCH if we have a valid URL
            let patchResponse = null;
            if (patchUrl) {
              patchResponse = await nodeFetch(patchUrl, {
                method: 'PATCH',
                headers: {
                  ...getHeaders(),
                  'Prefer': 'return=representation'
                },
                body: JSON.stringify(recordData),
                timeout: 10000
              });
            }

            // Check if PATCH updated any rows (only if PATCH was attempted)
            if (patchResponse && patchResponse.ok) {
              try {
                // PATCH succeeded - check if any rows were actually updated
                const responseText = await patchResponse.text();
                if (responseText) {
                  const updatedRows = JSON.parse(responseText);
                  // If rows were updated, we're done
                  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
                    // Return UUID if we have it (for mapping)
                    const supabaseUuid = updatedRows[0].id || recordId;
                    return { success: true, supabaseUuid: supabaseUuid };
                  }
                }
                // If no rows updated or empty response, record doesn't exist - fall through to POST
              } catch (parseError) {
                // If parsing fails, check status code
                // 204 means success with no content (update succeeded)
                if (patchResponse.status === 204) {
                  return { success: true, supabaseUuid: recordId };
                }
                // Otherwise, fall through to POST
              }
            } else if (patchResponse && (patchResponse.status === 400 || patchResponse.status === 404)) {
              // Check if it's PGRST204/PGRST205 (no rows found) - this means record doesn't exist, not an error
              const patchErrorText = await patchResponse.text().catch(() => '');
              let patchErrorJson = null;
              try {
                patchErrorJson = JSON.parse(patchErrorText);
              } catch (e) {
                // Not JSON, check as text
              }
              
              // PGRST204/PGRST205 can appear in:
              // 1. Response body JSON: {"code":"PGRST204","details":...}
              // 2. proxy-status header: "PostgREST; error=PGRST204" or "PostgREST; error=PGRST205"
              // 3. 404 status code itself indicates record not found
              const isRecordNotFound = 
                patchResponse.status === 404 || // 404 always means not found
                (patchErrorJson && (patchErrorJson.code === 'PGRST204' || patchErrorJson.code === 'PGRST205')) ||
                patchErrorText.includes('PGRST204') ||
                patchErrorText.includes('PGRST205') ||
                (patchResponse.headers && 
                 (patchResponse.headers['proxy-status']?.includes('PGRST204') ||
                  patchResponse.headers['proxy-status']?.includes('PGRST205') ||
                  patchResponse.headers['proxy_status']?.includes('PGRST204') ||
                  patchResponse.headers['proxy_status']?.includes('PGRST205')));
              
              if (isRecordNotFound) {
                // PGRST204/PGRST205 or 404 means no rows matched - record doesn't exist, fall through to POST
                // This is expected behavior, not an error
                console.log(`PATCH: Record ${recordId} not found in ${tableName} (${patchResponse.status}), will insert via POST`);
              } else {
                // Other 400 errors are real errors (validation, etc.)
                console.error(`[Sync Error] PATCH ${tableName}:${recordId} - 400 Error:`, patchErrorText);
                console.error(`[Sync Error] Data being sent:`, JSON.stringify(cleanedData, null, 2));
                throw new Error(`Supabase error (${patchResponse.status}): ${patchErrorText}`);
              }
            } else if (patchResponse && patchResponse.status >= 401 && patchResponse.status < 500) {
              // Other client errors (401-403, 405-499) - don't try POST, return error
              const patchErrorText = await patchResponse.text().catch(() => patchResponse.statusText);
              throw new Error(`Supabase error (${patchResponse.status}): ${patchErrorText}`);
            }
            // For 5xx errors or PGRST204 (400), try POST to insert

            // Record doesn't exist - use POST to insert
            const postUrl = getTableUrl(tableName);
            console.log(`POST: Attempting to insert ${tableName}:${recordId}`);
            
            // For non-UUID IDs, remove id from recordData so Supabase generates a proper UUID
            // We'll need to map the Supabase UUID back to the SQLite ID after insert
            const postData = { ...recordData };
            if (!isUUID) {
              delete postData.id; // Let Supabase generate UUID
            }
            
            const postResponse = await nodeFetch(postUrl, {
              method: 'POST',
              headers: {
                ...getHeaders(),
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(postData),
              timeout: 10000
            });

            if (!postResponse.ok) {
              const postErrorText = await postResponse.text().catch(() => postResponse.statusText);
              console.error(`POST: Failed to insert ${tableName}:${recordId} - Status: ${postResponse.status}, Error: ${postErrorText}`);
              
              // Check if POST also returns PGRST204 (unusual but possible)
              let postErrorJson = null;
              try {
                postErrorJson = JSON.parse(postErrorText);
              } catch (e) {
                // Not JSON
              }
              
              const isPostPGRST204 = 
                (postErrorJson && postErrorJson.code === 'PGRST204') ||
                postErrorText.includes('PGRST204') ||
                (postResponse.headers && 
                 (postResponse.headers['proxy-status']?.includes('PGRST204') ||
                  postResponse.headers['proxy_status']?.includes('PGRST204')));
              
              // Check for specific error codes
              const errorCode = postErrorJson?.code || (postErrorText.includes('23502') ? '23502' : null);
              
              if (errorCode === '23502' || postErrorText.includes('23502')) {
                // NOT NULL constraint violation
                console.error(`[Sync Error] NOT NULL constraint violation for ${tableName}:${recordId}`);
                console.error('[Sync Error] Data being sent:', JSON.stringify(postData, null, 2));
                console.error('[Sync Error] Missing required fields - check schema for NOT NULL columns');
                throw new Error(`Supabase error: Missing required field (NOT NULL constraint) for ${tableName}. Error: ${postErrorText}`);
              } else if (isPostPGRST204 && postResponse.status === 400) {
                // PGRST204 on POST usually means constraint violation or data format issue
                console.error(`[Sync Error] POST PGRST204 error for ${tableName}:${recordId}`);
                console.error('[Sync Error] Data being sent:', JSON.stringify(postData, null, 2));
                throw new Error(`Supabase error: Failed to insert ${tableName} record. PGRST204 usually indicates a constraint violation or missing required field. Error: ${postErrorText}`);
              } else if (postResponse.status === 400) {
                // General 400 error - log full details
                console.error(`[Sync Error] POST 400 error for ${tableName}:${recordId}`);
                console.error('[Sync Error] Error response:', postErrorText);
                console.error('[Sync Error] Data being sent:', JSON.stringify(postData, null, 2));
                console.error('[Sync Error] Data types:', Object.fromEntries(Object.entries(postData).map(([k, v]) => [k, typeof v])));
              }
              
              throw new Error(`Supabase error (${postResponse.status}): ${postErrorText}`);
            }

            // Capture the returned UUID from Supabase if record was created
            let supabaseUuid = recordId;
            if (postResponse.ok) {
              try {
                const responseText = await postResponse.text();
                if (responseText) {
                  const createdRecords = JSON.parse(responseText);
                  if (Array.isArray(createdRecords) && createdRecords.length > 0 && createdRecords[0].id) {
                    supabaseUuid = createdRecords[0].id;
                    if (!isUUID) {
                      console.log(`[Sync Mapping] ${tableName}: SQLite ID ${recordId} -> Supabase UUID ${supabaseUuid}`);
                    }
                  }
                }
              } catch (e) {
                // Ignore parse errors
              }
            }
            
            console.log(`POST: Successfully inserted ${tableName}:${recordId}${!isUUID ? ` (UUID: ${supabaseUuid})` : ''}`);
            return { success: true, supabaseUuid: supabaseUuid };
          } catch (error) {
            if (attempt === retries - 1) {
              return { success: false, error: error.message };
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
        return { success: false, error: 'Max retries exceeded' };
      },

      async deleteRecord(tableName, recordId, retries = 3) {
        // Use soft delete: set deleted_at instead of actually deleting
        for (let attempt = 0; attempt < retries; attempt++) {
          try {
            // Check if recordId is a valid UUID format
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recordId);
            
            let url;
            if (!isUUID) {
              // For non-UUID IDs, we can't reliably delete by ID without a mapping
              // Skip delete for tables with non-UUID IDs (this is a limitation)
              // In practice, deletes are less common and usually done by alternative unique fields
              console.warn(`[Sync Warning] Cannot delete ${tableName}:${recordId} - non-UUID ID without mapping. Skipping.`);
              return { success: false, error: 'Cannot delete records with non-UUID IDs without alternative unique identifier mapping' };
            } else {
              url = `${getTableUrl(tableName)}?id=eq.${encodeURIComponent(recordId)}`;
            }
            
            const now = new Date().toISOString();
            
            // PATCH to set deleted_at instead of DELETE
            const response = await nodeFetch(url, {
              method: 'PATCH',
              headers: {
                'apikey': apiKey,
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
              },
              body: JSON.stringify({ deleted_at: now }),
              timeout: 10000
            });

            if (response.ok) {
              try {
                const responseText = await response.text();
                if (responseText) {
                  const updatedRows = JSON.parse(responseText);
                  if (Array.isArray(updatedRows) && updatedRows.length > 0) {
                    // Successfully soft deleted
                    return { success: true };
                  } else if (Array.isArray(updatedRows) && updatedRows.length === 0) {
                    // Record doesn't exist - but that's okay for delete, consider it success
                    console.log(`Delete: Record ${recordId} not found in ${tableName} (already deleted or doesn't exist)`);
                    return { success: true };
                  }
                }
                // Empty response but 200 - consider success
                return { success: true };
              } catch (parseError) {
                // If parsing fails but status is 200, consider it success
                return { success: true };
              }
            } else {
              // Error response
              const errorText = await response.text().catch(() => response.statusText);
              throw new Error(`Supabase error (${response.status}): ${errorText}`);
            }
          } catch (error) {
            if (attempt === retries - 1) {
              return { success: false, error: error.message };
            }
            // Exponential backoff
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
        return { success: false, error: 'Max retries exceeded' };
      },

      async getChanges(lastSyncAt) {
        try {
          // Get all tables that have changes (full schema coverage)
          // Tables without updated_at use created_at instead
          const tablesWithoutUpdatedAt = ['debts', 'debt_payments'];
          
          const tables = [
            'customers',
            'product_models',
            'products',
            'inventory_items',
            'product_accessories',
            'sales',
            'invoices',
            'returns',
            'swaps',
            'deals',
            'debts',
            'debt_payments',
            'boqs',
            'invoice_templates',
            'users',
          ];
          const allChanges = [];

          // Format timestamp for Supabase query
          const syncTimestamp = lastSyncAt 
            ? new Date(lastSyncAt).toISOString() 
            : '1970-01-01T00:00:00.000Z';

          for (const table of tables) {
            try {
              // Determine timestamp column based on table schema
              let timestampColumn;
              if (table === 'debt_payments') {
                // debt_payments uses 'date' column instead of 'created_at'
                timestampColumn = 'date';
              } else if (tablesWithoutUpdatedAt.includes(table)) {
                // Tables without updated_at use created_at
                timestampColumn = 'created_at';
              } else {
                // Most tables use updated_at
                timestampColumn = 'updated_at';
              }
              
              // Query 1: Get records that were updated/created (not deleted)
              // Build query based on table's timestamp columns
              let activeUrl;
              if (table === 'debt_payments') {
                // debt_payments only has 'date' column, no created_at
                activeUrl = `${getTableUrl(table)}?date.gt.${encodeURIComponent(syncTimestamp)}&deleted_at.is.null&order=date.asc&select=*`;
              } else if (tablesWithoutUpdatedAt.includes(table)) {
                // Tables without updated_at use only created_at
                activeUrl = `${getTableUrl(table)}?created_at.gt.${encodeURIComponent(syncTimestamp)}&deleted_at.is.null&order=created_at.asc&select=*`;
              } else {
                // Most tables have both updated_at and created_at
                activeUrl = `${getTableUrl(table)}?or=(${timestampColumn}.gt.${encodeURIComponent(syncTimestamp)},created_at.gt.${encodeURIComponent(syncTimestamp)})&deleted_at.is.null&order=${timestampColumn}.asc&select=*`;
              }
              
              const activeResponse = await nodeFetch(activeUrl, {
                headers: getHeaders(),
                timeout: 15000
              });

              if (activeResponse.ok) {
                const activeRecords = await activeResponse.json();
                for (const record of activeRecords) {
                  // Convert snake_case to camelCase for local database compatibility
                  const convertedRecord = convertToCamelCase(record);
                  allChanges.push({
                    table_name: table,
                    record_id: record.id,
                    change_type: 'update', // Supabase doesn't track create/update separately
                    data: convertedRecord, // Use converted camelCase data
                    server_updated_at: record.updated_at || record.created_at || record.date
                  });
                }
              } else if (activeResponse.status !== 404) {
                const errorText = await activeResponse.text().catch(() => activeResponse.statusText);
                console.error(`Error fetching active records from ${table}: ${errorText}`);
              }
              
              // Query 2: Get records that were deleted (soft delete)
              // deleted_at > timestamp
              const deletedUrl = `${getTableUrl(table)}?deleted_at=gt.${encodeURIComponent(syncTimestamp)}&order=deleted_at.asc&select=*`;
              
              const deletedResponse = await nodeFetch(deletedUrl, {
                headers: getHeaders(),
                timeout: 15000
              });

              if (deletedResponse.ok) {
                const deletedRecords = await deletedResponse.json();
                for (const record of deletedRecords) {
                  // Convert snake_case to camelCase for local database compatibility
                  const convertedRecord = convertToCamelCase(record);
                  allChanges.push({
                    table_name: table,
                    record_id: record.id,
                    change_type: 'delete', // Mark as delete
                    data: convertedRecord, // Use converted camelCase data
                    server_updated_at: record.deleted_at // Use deleted_at as the timestamp
                  });
                }
              } else if (deletedResponse.status === 404) {
                // Table doesn't exist yet - skip it
                console.warn(`Table ${table} not found in Supabase - skipping`);
              } else if (deletedResponse.status !== 400) {
                // 400 might mean deleted_at column doesn't exist yet (old schema)
                const errorText = await deletedResponse.text().catch(() => deletedResponse.statusText);
                console.warn(`Error fetching deleted records from ${table} (may need schema update): ${errorText}`);
              }
            } catch (tableError) {
              console.error(`Error fetching changes from ${table}:`, tableError.message);
              // Continue with other tables
            }
          }

          return { success: true, data: allChanges };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      /**
       * Test connection to Supabase
       */
      async testConnection() {
        try {
          // Test by querying a table (customers is most likely to exist)
          // Use limit=0 to just test connection without fetching data
          const url = `${getTableUrl('customers')}?limit=0`;
          
          const response = await nodeFetch(url, {
            headers: getHeaders(),
            timeout: 5000
          });

          if (response.ok) {
            return { success: true, message: 'Connection successful' };
          } else if (response.status === 401 || response.status === 403) {
            return { success: false, error: 'Invalid API key or insufficient permissions' };
          } else if (response.status === 404) {
            return { success: false, error: 'Table not found. Please create tables in Supabase first.' };
          } else {
            const errorText = await response.text().catch(() => response.statusText);
            return { success: false, error: `Connection failed: ${errorText}` };
          }
        } catch (error) {
          if (error.message.includes('timeout')) {
            return { success: false, error: 'Connection timeout - check your internet connection' };
          }
          if (error.message.includes('fetch') || error.message.includes('ENOTFOUND') || error.message.includes('ECONNREFUSED')) {
            return { success: false, error: 'Network error - check your internet connection and Supabase URL' };
          }
          return { success: false, error: error.message };
        }
      }
    };
  }

  /**
   * Firebase Client Implementation
   */
  function createFirebaseClient(config) {
    // Placeholder for Firebase implementation
    // Would use Firebase Admin SDK or REST API
    return {
      async upsertRecord(tableName, recordId, data) {
        return { success: false, error: 'Firebase not yet implemented' };
      },
      async deleteRecord(tableName, recordId) {
        return { success: false, error: 'Firebase not yet implemented' };
      },
      async getChanges(lastSyncAt) {
        return { success: false, error: 'Firebase not yet implemented' };
      }
    };
  }

  /**
   * Custom REST API Client
   */
  function createCustomClient(config) {
    const baseUrl = config.url.replace(/\/$/, '');

    return {
      async upsertRecord(tableName, recordId, data) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/${tableName}/${recordId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(data),
            timeout: 10000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      async deleteRecord(tableName, recordId) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/${tableName}/${recordId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            },
            timeout: 10000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          return { success: true };
        } catch (error) {
          return { success: false, error: error.message };
        }
      },

      async getChanges(lastSyncAt) {
        try {
          const response = await nodeFetch(`${baseUrl}/api/sync/changes?since=${lastSyncAt || ''}`, {
            headers: {
              'Authorization': `Bearer ${config.apiKey}`
            },
            timeout: 15000
          });

          if (!response.ok) {
            throw new Error(`API error: ${response.statusText}`);
          }

          const data = await response.json();
          return { success: true, data: data.changes || [] };
        } catch (error) {
          return { success: false, error: error.message };
        }
      }
    };
  }

  // Initialize on creation
  if (config.url && config.apiKey) {
    initialize();
  }

  return {
    isConfigured: () => isConfigured,
    initialize,
    upsertRecord: async (tableName, recordId, data) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.upsertRecord(tableName, recordId, data);
    },
    deleteRecord: async (tableName, recordId) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.deleteRecord(tableName, recordId);
    },
    getChanges: async (lastSyncAt) => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      return client.getChanges(lastSyncAt);
    },
    testConnection: async () => {
      if (!isConfigured || !client) {
        return { success: false, error: 'Client not configured' };
      }
      if (client.testConnection) {
        return client.testConnection();
      }
      return { success: false, error: 'Connection test not supported' };
    }
  };
}

module.exports = {
  createCloudApiClient
};
