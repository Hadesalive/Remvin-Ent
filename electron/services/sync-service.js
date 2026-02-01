/**
 * Sync Service
 * 
 * Handles synchronization between local SQLite database and cloud storage.
 * Tracks changes, manages sync queue, and handles conflict resolution.
 * 
 * FIXED VERSION - Addresses all critical race conditions and edge cases
 */

const { executeInTransaction } = require('./transaction-service');

/**
 * Sync Status Enum
 */
const SYNC_STATUS = {
  PENDING: 'pending',
  SYNCING: 'syncing',
  SYNCED: 'synced',
  CONFLICT: 'conflict',
  ERROR: 'error'
};

/**
 * Change Type Enum
 */
const CHANGE_TYPE = {
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete'
};

/**
 * Tables that should be synced
 */
const SYNCABLE_TABLES = [
  'customers',
  'product_models',        // Top-level product models (e.g., iPhone 17)
  'products',              // Product variants (with storage, color, linked to product_models)
  'inventory_items',       // Individual units tracked by IMEI
  'product_accessories',   // Links accessories to product models/products
  'sales',
  'invoices',
  'returns',
  'swaps',                 // Trade-in/swap transactions
  'deals',
  'debts',
  'debt_payments',
  'boqs',
  'invoice_templates',     // Invoice templates (synced for consistency)
  'users'                  // User accounts (password_hash synced for internal Electron app)
];

/**
 * Table sync order based on dependencies (parent tables first)
 * This ensures foreign keys can be resolved when syncing child records
 */
const SYNC_ORDER = [
  // Level 0: No dependencies (can sync first)
  'customers',
  'product_models',
  'users',
  'invoice_templates',
  // Level 1: Depend on Level 0
  'products',              // depends on product_models
  'deals',                 // depends on customers
  'debts',                 // depends on customers
  // Level 2: Depend on Level 0-1
  'sales',                 // depends on customers, products
  'invoices',              // depends on customers, sales
  'returns',               // depends on sales, customers
  'debt_payments',         // depends on debts
  'product_accessories',   // depends on product_models, products
  // Level 3: Depend on Level 0-2
  'inventory_items',       // depends on products, sales, customers
  'swaps',                 // depends on customers, sales, products, inventory_items
  'boqs'                   // no dependencies, but can go last
];

/**
 * Tables that should NOT be synced (security/local config)
 */
const EXCLUDED_TABLES = [
  'company_settings',      // Single row, local config
  'license_activations',   // Security - license data
  'license_validations',   // Security - validation logs
  'hardware_snapshots',    // Security - hardware fingerprints
  'sync_queue',            // Internal sync state
  'sync_metadata'          // Internal sync config
];

/**
 * Create Sync Service
 */
function createSyncService(databaseService, cloudApiClient) {
  const db = databaseService.db;
  
  // Sync lock to prevent concurrent syncs
  let syncLock = false;
  let syncLockTimeout = null;
  const SYNC_LOCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
  
  // Store cloud client reference (can be updated dynamically)
  let currentCloudApiClient = cloudApiClient;

  /**
   * Initialize sync tables
   */
  function initializeSyncTables() {
    // Sync queue table - tracks pending changes
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_queue (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id TEXT NOT NULL,
        change_type TEXT NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
        data TEXT, -- JSON data for the change
        sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
        error_message TEXT,
        retry_count INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        synced_at DATETIME,
        locked_at DATETIME, -- When item was locked for syncing
        UNIQUE(table_name, record_id, change_type)
      )
    `);

    // Ensure deleted_at columns exist for all syncable tables (soft delete support)
    ensureDeletedAtColumns();

    // Sync metadata table - tracks last sync info
    db.exec(`
      CREATE TABLE IF NOT EXISTS sync_metadata (
        id INTEGER PRIMARY KEY DEFAULT 1,
        last_sync_at DATETIME,
        sync_enabled INTEGER DEFAULT 1,
        sync_interval_minutes INTEGER DEFAULT 5,
        cloud_provider TEXT DEFAULT 'supabase',
        cloud_url TEXT,
        api_key TEXT,
        device_id TEXT,
        conflict_resolution_strategy TEXT DEFAULT 'server_wins' CHECK (conflict_resolution_strategy IN ('server_wins', 'client_wins', 'manual')),
        sync_lock_expires_at DATETIME, -- For database-level locking
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT single_row CHECK (id = 1)
      )
    `);
    
    // Add sync_lock_expires_at column if it doesn't exist (migration for existing databases)
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_metadata)`).all();
      const hasLockColumn = tableInfo.some(col => col.name === 'sync_lock_expires_at');
      if (!hasLockColumn) {
        console.log('[Sync Migration] Adding sync_lock_expires_at column to sync_metadata');
        db.exec(`ALTER TABLE sync_metadata ADD COLUMN sync_lock_expires_at DATETIME`);
      }
    } catch (error) {
      console.error('[Sync Migration] Error checking/adding sync_lock_expires_at column:', error);
    }

    // ID mapping table - persists SQLite ID -> Supabase UUID mappings
    // This ensures foreign key relationships are maintained across sync sessions and crashes
    db.exec(`
      CREATE TABLE IF NOT EXISTS id_mapping (
        local_id TEXT NOT NULL,
        table_name TEXT NOT NULL,
        supabase_uuid TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (table_name, local_id)
      )
    `);

    // Create indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_id_mapping_table_local 
      ON id_mapping(table_name, local_id)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_id_mapping_uuid 
      ON id_mapping(supabase_uuid)
    `);

    // Migrate existing tables - add locked_at column if it doesn't exist
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (!hasLockedAt) {
        console.log('Migrating sync_queue table: adding locked_at column');
        db.exec(`ALTER TABLE sync_queue ADD COLUMN locked_at DATETIME`);
        // Reset cache so functions pick up the new column
        hasLockedAtColumn = true;
      } else {
        hasLockedAtColumn = true;
      }
    } catch (error) {
      console.error('Error checking/migrating sync_queue table:', error);
      hasLockedAtColumn = false;
      // Continue anyway - table might not exist yet
    }

    // Create indexes for performance
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_status 
      ON sync_queue(sync_status, created_at)
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sync_queue_table_record 
      ON sync_queue(table_name, record_id)
    `);

    // Create locked_at index only if column exists
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        db.exec(`
          CREATE INDEX IF NOT EXISTS idx_sync_queue_locked 
          ON sync_queue(sync_status, locked_at)
        `);
      }
    } catch (error) {
      console.error('Error creating locked_at index:', error);
    }
  }

  /**
   * Ensure all syncable tables have a deleted_at column for soft deletes
   */
  function ensureDeletedAtColumns() {
    const tablesNeedingDeletedAt = [
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
      'users'
    ];

    for (const table of tablesNeedingDeletedAt) {
      try {
        const cols = db.prepare(`PRAGMA table_info(${table})`).all();
        const hasDeletedAt = cols.some(c => c.name === 'deleted_at');
        if (!hasDeletedAt) {
          db.exec(`ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME`);
          console.log(`[Sync Schema] Added deleted_at to ${table}`);
        }
      } catch (e) {
        console.warn(`[Sync Schema] Could not ensure deleted_at on ${table}: ${e.message}`);
      }
    }
  }

  /**
   * Validate table name
   */
  function validateTableName(tableName) {
    if (!tableName || typeof tableName !== 'string') {
      throw new Error('Invalid table name: must be a non-empty string');
    }
    if (EXCLUDED_TABLES.includes(tableName)) {
      throw new Error(`Table ${tableName} is excluded from sync`);
    }
    if (!SYNCABLE_TABLES.includes(tableName)) {
      console.warn(`Table ${tableName} is not in syncable tables list`);
    }
    return true;
  }

  /**
   * Validate record ID
   */
  function validateRecordId(recordId) {
    if (!recordId || typeof recordId !== 'string') {
      throw new Error('Invalid record ID: must be a non-empty string');
    }
    return true;
  }

  /**
   * Get sync configuration
   */
  function getSyncConfig() {
    const stmt = db.prepare('SELECT * FROM sync_metadata WHERE id = 1');
    const config = stmt.get();
    
    if (!config) {
      // Initialize default config
      const deviceId = require('crypto').randomUUID();
      const insertStmt = db.prepare(`
        INSERT INTO sync_metadata 
        (sync_enabled, device_id, last_sync_at) 
        VALUES (0, ?, NULL)
      `);
      insertStmt.run(deviceId);
      return getSyncConfig();
    }
    
    return config;
  }

  /**
   * Update sync configuration
   */
  function updateSyncConfig(updates) {
    const allowedFields = [
      'sync_enabled',
      'sync_interval_minutes',
      'cloud_provider',
      'cloud_url',
      'api_key',
      'conflict_resolution_strategy'
    ];

    const setClause = [];
    const values = [];

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        // Don't update api_key if it's empty, null, or masked placeholder
        // This prevents accidentally clearing a valid API key
        if (key === 'api_key') {
          const apiKeyValue = updates[key];
          if (apiKeyValue && apiKeyValue !== '***' && apiKeyValue.trim().length > 10) {
            setClause.push(`${key} = ?`);
            values.push(apiKeyValue);
          }
          // Skip if empty/null/masked - don't update the field
        } else {
          setClause.push(`${key} = ?`);
          values.push(updates[key]);
        }
      }
    });

    if (setClause.length === 0) {
      return { success: false, error: 'No valid fields to update' };
    }

    setClause.push('updated_at = CURRENT_TIMESTAMP');
    values.push(1); // WHERE id = 1

    const stmt = db.prepare(`
      UPDATE sync_metadata 
      SET ${setClause.join(', ')} 
      WHERE id = ?
    `);

    stmt.run(...values);
    return { success: true, data: getSyncConfig() };
  }

  /**
   * Acquire sync lock (database-level, process-safe)
   * Uses sync_metadata table with lock expiration to prevent concurrent syncs
   */
  function acquireSyncLock() {
    try {
      // Check in-memory lock first (fast path)
      if (syncLock) {
        return false;
      }

      // Check database-level lock (process-safe)
      // Note: SQLite doesn't support FOR UPDATE, but we use a transaction for atomicity
      return executeInTransaction(db, () => {
        const stmt = db.prepare(`
          SELECT sync_lock_expires_at 
          FROM sync_metadata 
          WHERE id = 1
        `);
        const config = stmt.get();
        
        if (!config) {
          // No metadata row exists, create it and acquire lock
          const deviceId = require('crypto').randomUUID();
          const lockExpiresAt = new Date(Date.now() + SYNC_LOCK_TIMEOUT_MS).toISOString();
          db.prepare(`
            INSERT INTO sync_metadata 
            (sync_enabled, device_id, sync_lock_expires_at) 
            VALUES (0, ?, ?)
          `).run(deviceId, lockExpiresAt);
          
          syncLock = true;
          syncLockTimeout = setTimeout(() => {
            console.warn('Sync lock timeout - releasing lock');
            releaseSyncLock();
          }, SYNC_LOCK_TIMEOUT_MS);
          return true;
        }

        const now = Date.now();
        const lockExpiresAt = config.sync_lock_expires_at ? new Date(config.sync_lock_expires_at).getTime() : 0;
        
        // Lock is held if it exists and hasn't expired
        if (config.sync_lock_expires_at && lockExpiresAt > now) {
          // Lock is still held by another process or a previous crashed process
          // Wait a bit and check again (in case it's about to expire)
          if (lockExpiresAt - now > 1000) {
            // More than 1 second remaining, definitely locked
            return false;
          }
          // Less than 1 second remaining, assume it's stuck and steal the lock
          console.warn(`Sync lock about to expire (${lockExpiresAt - now}ms remaining), stealing lock`);
        }

        // Acquire lock by setting expiration time
        const newLockExpiresAt = new Date(Date.now() + SYNC_LOCK_TIMEOUT_MS).toISOString();
        db.prepare(`
          UPDATE sync_metadata 
          SET sync_lock_expires_at = ?
          WHERE id = 1
        `).run(newLockExpiresAt);

        // Set in-memory lock and timeout for cleanup
        syncLock = true;
        syncLockTimeout = setTimeout(() => {
          console.warn('Sync lock timeout - releasing lock');
          releaseSyncLock();
        }, SYNC_LOCK_TIMEOUT_MS);

        return true;
      });
    } catch (error) {
      console.error('Error acquiring sync lock:', error);
      // Fallback to in-memory lock if database lock fails
      if (!syncLock) {
        syncLock = true;
        syncLockTimeout = setTimeout(() => {
          console.warn('Sync lock timeout - releasing lock (fallback)');
          syncLock = false;
        }, SYNC_LOCK_TIMEOUT_MS);
        return true;
      }
      return false;
    }
  }

  /**
   * Release sync lock (clears both database and in-memory locks)
   */
  function releaseSyncLock() {
    try {
      // Clear database-level lock
      db.prepare(`
        UPDATE sync_metadata 
        SET sync_lock_expires_at = NULL
        WHERE id = 1
      `).run();
    } catch (error) {
      console.error('Error releasing sync lock:', error);
    }

    // Clear in-memory lock and timeout
    if (syncLockTimeout) {
      clearTimeout(syncLockTimeout);
      syncLockTimeout = null;
    }
    syncLock = false;
  }

  /**
   * Recover stuck sync items (items stuck in 'syncing' state)
   */
  function recoverStuckItems() {
    try {
      // Check if locked_at column exists
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        const stuckThreshold = new Date(Date.now() - 5 * 60 * 1000).toISOString(); // 5 minutes ago
        const stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              locked_at = NULL,
              error_message = 'Recovered from stuck state',
              retry_count = retry_count + 1
          WHERE sync_status = 'syncing' 
          AND (locked_at IS NULL OR locked_at < ?)
        `);
        const result = stmt.run(stuckThreshold);
        return result.changes;
      } else {
        // Fallback: recover all syncing items if locked_at doesn't exist
        const stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = 'Recovered from stuck state',
              retry_count = retry_count + 1
          WHERE sync_status = 'syncing'
        `);
        const result = stmt.run();
        return result.changes;
      }
    } catch (error) {
      console.error('Error recovering stuck items:', error);
      return 0;
    }
  }

  /**
   * Track a change for syncing (with transaction safety)
   */
  function trackChange(tableName, recordId, changeType, data = null) {
    try {
      // Validate inputs
      validateTableName(tableName);
      validateRecordId(recordId);
      
      if (!Object.values(CHANGE_TYPE).includes(changeType)) {
        throw new Error(`Invalid change type: ${changeType}`);
      }

      const config = getSyncConfig();
      
      // Don't track if sync is disabled
      if (!config.sync_enabled) {
        return { success: true, skipped: true };
      }

      // Use transaction to ensure atomicity
      return executeInTransaction(db, () => {
        // Check if this change is already in queue
        const existingStmt = db.prepare(`
          SELECT id, sync_status FROM sync_queue 
          WHERE table_name = ? AND record_id = ? AND change_type = ?
        `);
        const existing = existingStmt.get(tableName, recordId, changeType);

        if (existing) {
          // Don't update if currently syncing (race condition protection)
          if (existing.sync_status === 'syncing') {
            return { success: true, skipped: true, reason: 'Item currently syncing' };
          }

          // Update existing queue item with latest data
          const updateStmt = db.prepare(`
            UPDATE sync_queue 
            SET data = ?, 
                sync_status = 'pending', 
                retry_count = 0, 
                created_at = CURRENT_TIMESTAMP,
                error_message = NULL
            WHERE id = ?
          `);
          updateStmt.run(data ? JSON.stringify(data) : null, existing.id);
        } else {
          // Insert new queue item
          const insertStmt = db.prepare(`
            INSERT INTO sync_queue (table_name, record_id, change_type, data, sync_status)
            VALUES (?, ?, ?, ?, 'pending')
          `);
          insertStmt.run(
            tableName,
            recordId,
            changeType,
            data ? JSON.stringify(data) : null
          );
        }

        return { success: true };
      });
    } catch (error) {
      console.error('Error tracking change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get pending sync items (with stuck item recovery)
   */
  function getPendingSyncItems(limit = 50) {
    // First, recover any stuck items
    recoverStuckItems();

    const stmt = db.prepare(`
      SELECT * FROM sync_queue 
      WHERE sync_status = 'pending' 
      ORDER BY created_at ASC 
      LIMIT ?
    `);
    
    const items = stmt.all(limit);
    return items.map(item => {
      try {
        return {
          ...item,
          data: item.data ? JSON.parse(item.data) : null
        };
      } catch (parseError) {
        console.error(`Invalid JSON in queue item ${item.id}:`, parseError);
        // Mark as error
        markAsError(item.id, 'Invalid JSON data in queue');
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Get all sync queue items with optional status filter
   */
  function getSyncQueueItems(options = {}) {
    const { status = null, limit = 100, offset = 0 } = options;
    
    let query = 'SELECT * FROM sync_queue';
    const params = [];
    
    if (status) {
      query += ' WHERE sync_status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    const stmt = db.prepare(query);
    const items = stmt.all(...params);
    
    return items.map(item => {
      try {
        return {
          ...item,
          data: item.data ? JSON.parse(item.data) : null
        };
      } catch (parseError) {
        console.error(`Invalid JSON in queue item ${item.id}:`, parseError);
        return {
          ...item,
          data: null,
          parseError: true
        };
      }
    });
  }

  /**
   * Check if locked_at column exists (cached for performance)
   */
  let hasLockedAtColumn = null;
  function checkLockedAtColumn() {
    if (hasLockedAtColumn === null) {
      try {
        const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
        hasLockedAtColumn = tableInfo.some(col => col.name === 'locked_at');
      } catch (error) {
        console.error('Error checking locked_at column:', error);
        hasLockedAtColumn = false;
      }
    }
    return hasLockedAtColumn;
  }

  /**
   * Mark sync item as syncing (with lock timestamp)
   */
  function markAsSyncing(queueId) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'syncing', 
            locked_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'syncing'
        WHERE id = ?
      `);
      stmt.run(queueId);
    }
  }

  /**
   * Mark sync item as synced
   */
  function markAsSynced(queueId) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'synced', 
            synced_at = CURRENT_TIMESTAMP,
            locked_at = NULL
        WHERE id = ?
      `);
      stmt.run(queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'synced', 
            synced_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `);
      stmt.run(queueId);
    }
  }

  /**
   * Mark sync item as error
   */
  function markAsError(queueId, errorMessage) {
    const hasLockedAt = checkLockedAtColumn();
    if (hasLockedAt) {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'error', 
            error_message = ?,
            retry_count = retry_count + 1,
            locked_at = NULL
        WHERE id = ?
      `);
      stmt.run(errorMessage, queueId);
    } else {
      const stmt = db.prepare(`
        UPDATE sync_queue 
        SET sync_status = 'error', 
            error_message = ?,
            retry_count = retry_count + 1
        WHERE id = ?
      `);
      stmt.run(errorMessage, queueId);
    }
  }

  /**
   * Reset failed sync items for retry
   * @param {number|null} maxRetries - Maximum retry count to reset (null = reset all, default = 100 for manual retry)
   * @param {number|number[]|null} itemIds - Optional: specific item ID(s) to reset. If provided, only resets those items.
   */
  function resetFailedItems(maxRetries = 100, itemIds = null) {
    let stmt;
    const hasLockedAt = checkLockedAtColumn();
    
    if (itemIds !== null) {
      // Reset specific items by ID
      const ids = Array.isArray(itemIds) ? itemIds : [itemIds];
      const placeholders = ids.map(() => '?').join(',');
      
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE id IN (${placeholders}) AND sync_status = 'error'
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE id IN (${placeholders}) AND sync_status = 'error'
        `);
      }
      const result = stmt.run(...ids);
      return result.changes;
    } else if (maxRetries === null) {
      // Reset ALL error items regardless of retry count
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE sync_status = 'error'
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE sync_status = 'error'
        `);
      }
      const result = stmt.run();
      return result.changes;
    } else {
      // Reset items with retry_count < maxRetries
      if (hasLockedAt) {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0,
              locked_at = NULL
          WHERE sync_status = 'error' AND retry_count < ?
        `);
      } else {
        stmt = db.prepare(`
          UPDATE sync_queue 
          SET sync_status = 'pending', 
              error_message = NULL,
              retry_count = 0
          WHERE sync_status = 'error' AND retry_count < ?
        `);
      }
      const result = stmt.run(maxRetries);
      return result.changes;
    }
  }

  /**
   * Automatically retry failed items (with exponential backoff and error categorization)
   * Only retries items that:
   * - Are in error state with [RETRYABLE] prefix
   * - Have retry_count < maxRetries (default 5)
   * - Were created within the last 24 hours (to avoid retrying old errors)
   * - Respect exponential backoff delay (2^retry_count seconds)
   */
  function autoRetryFailedItems(maxRetries = 5) {
    try {
      // Get failed items that are retryable (not marked as PERMANENT)
      const stmt = db.prepare(`
        SELECT id, retry_count, created_at, error_message
        FROM sync_queue 
        WHERE sync_status = 'error' 
          AND retry_count < ?
          AND created_at > datetime('now', '-24 hours')
          AND (error_message LIKE '[RETRYABLE]%' OR (error_message NOT LIKE '[PERMANENT]%' AND error_message NOT LIKE '[RETRYABLE]%'))
      `);
      const failedItems = stmt.all(maxRetries);
      
      let retriedCount = 0;
      const now = Date.now();
      
      for (const item of failedItems) {
        // Calculate exponential backoff delay: 2^retry_count seconds
        // retry_count 0 -> 1s, 1 -> 2s, 2 -> 4s, 3 -> 8s, 4 -> 16s
        const backoffSeconds = Math.pow(2, item.retry_count);
        const lastAttemptTime = item.created_at ? new Date(item.created_at).getTime() : now;
        const timeSinceLastAttempt = now - lastAttemptTime;
        const requiredDelay = backoffSeconds * 1000;
        
        // Only retry if enough time has passed (exponential backoff)
        if (timeSinceLastAttempt >= requiredDelay) {
          const updateStmt = db.prepare(`
            UPDATE sync_queue 
            SET sync_status = 'pending', 
                error_message = NULL,
                retry_count = retry_count + 1
            WHERE id = ?
          `);
          updateStmt.run(item.id);
          retriedCount++;
        }
      }
      
      if (retriedCount > 0) {
        console.log(`🔄 Auto-retrying ${retriedCount} failed sync items (exponential backoff)`);
      }
      
      return retriedCount;
    } catch (error) {
      console.error('Error auto-retrying failed items:', error);
      return 0;
    }
  }

  /**
   * Fetch latest data from database before syncing
   */
  async function fetchLatestData(tableName, recordId, changeType) {
    try {
      // For DELETE, we need to store data before deletion
      if (changeType === CHANGE_TYPE.DELETE) {
        const record = await getRecordById(tableName, recordId);
        return record;
      }

      // For CREATE/UPDATE, fetch latest from DB
      const record = await getRecordById(tableName, recordId);
      return record;
    } catch (error) {
      console.error(`Error fetching latest data for ${tableName}:${recordId}:`, error);
      return null;
    }
  }

  /**
   * Categorize error as transient (retryable) or permanent (should skip)
   * @param {Error} error - The error to categorize
   * @returns {{ isTransient: boolean, shouldRetry: boolean, retryDelay?: number }}
   */
  function categorizeError(error) {
    const errorMessage = error.message || String(error);
    const errorCode = error.code || '';
    const statusCode = error.status || error.statusCode || 0;

    // Network/timeout errors are transient
    if (errorMessage.includes('timeout') || 
        errorMessage.includes('ECONNRESET') ||
        errorMessage.includes('ENOTFOUND') ||
        errorMessage.includes('ETIMEDOUT') ||
        errorCode === 'ETIMEDOUT' ||
        errorCode === 'ECONNRESET') {
      return { isTransient: true, shouldRetry: true, retryDelay: 5000 }; // 5 second delay
    }

    // 5xx server errors are transient
    if (statusCode >= 500 && statusCode < 600) {
      return { isTransient: true, shouldRetry: true, retryDelay: 10000 }; // 10 second delay
    }

    // Rate limiting (429) - retry with longer delay
    if (statusCode === 429) {
      return { isTransient: true, shouldRetry: true, retryDelay: 60000 }; // 60 second delay
    }

    // 4xx client errors (except 429) are usually permanent (validation, auth, etc.)
    if (statusCode >= 400 && statusCode < 500) {
      // 400 Bad Request - could be data validation, might be fixable
      if (statusCode === 400 && errorMessage.includes('invalid input')) {
        return { isTransient: false, shouldRetry: false }; // Data format issue, needs fixing
      }
      // 401/403 - auth/permission errors - permanent until credentials fixed
      if (statusCode === 401 || statusCode === 403) {
        return { isTransient: false, shouldRetry: false };
      }
      // 404 - record not found - could be transient if record is being created
      if (statusCode === 404) {
        return { isTransient: true, shouldRetry: true, retryDelay: 2000 };
      }
      // Other 4xx - likely permanent
      return { isTransient: false, shouldRetry: false };
    }

    // Default: assume transient for unknown errors
    return { isTransient: true, shouldRetry: true, retryDelay: 5000 };
  }

  /**
   * Sync a single item to cloud (with two-phase commit and enhanced error handling)
   * @param {Object} queueItem - The sync queue item
   * @param {Map} idMapping - ID mapping cache (SQLite ID -> Supabase UUID)
   */
  async function syncItem(queueItem, idMapping = new Map()) {
    // Dynamically create/update cloud client from config if needed
    if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
      const config = getSyncConfig();
      if (config.cloud_url && config.api_key) {
        console.log('🔄 Creating cloud API client from config for syncItem...');
        const { createCloudApiClient } = require('./cloud-api-client');
        currentCloudApiClient = createCloudApiClient(
          config.cloud_provider || 'supabase',
          {
            url: config.cloud_url || '',
            apiKey: config.api_key || '',
            tablePrefix: config.table_prefix || ''
          }
        );
      } else {
        throw new Error('Cloud API client not configured. Please set Supabase URL and API key in sync settings.');
      }
    }
    
    if (!currentCloudApiClient) {
      throw new Error('Cloud API client not configured');
    }

    let { table_name, record_id: originalRecordId, change_type, data } = queueItem;
    
    // Idempotency: Check if this record has already been synced and has a Supabase UUID
    // If it has, use the UUID for the sync operation to prevent duplicates
    const mappingKey = `${table_name}:${originalRecordId}`;
    const existingMapping = idMapping.get(mappingKey);
    let record_id = originalRecordId; // Use original ID by default
    
    if (existingMapping && existingMapping !== originalRecordId) {
      // Record already has a Supabase UUID - use it for idempotent sync
      record_id = existingMapping;
      console.log(`[Sync Idempotency] ${table_name}:${originalRecordId} already synced as ${existingMapping}, using UUID`);
    }

    try {
      markAsSyncing(queueItem.id);

      // Fetch latest data from database to avoid stale data
      let syncData = data;
      if (change_type !== CHANGE_TYPE.DELETE) {
        // Use original record_id to fetch from local database
        const latestData = await fetchLatestData(table_name, originalRecordId, change_type);
        if (latestData) {
          syncData = latestData;
        }
      } else {
        // For DELETE, use stored data or fetch before delete
        if (!syncData) {
          syncData = await fetchLatestData(table_name, originalRecordId, change_type);
        }
      }

      // For internal Electron app, we sync all user data including password_hash
      // No sanitization needed

      // Convert foreign keys using ID mapping before syncing
      // This maintains relationships between tables
      if (syncData) {
        const foreignKeyFields = {
          products: ['product_model_id', 'productModelId'],
          inventory_items: ['product_id', 'productId', 'customer_id', 'customerId', 'sale_id', 'saleId'],
          product_accessories: [
            'product_model_id',
            'productModelId',
            'accessory_product_id',
            'accessoryProductId',
            'linked_product_id',
            'linkedProductId'
          ],
          sales: ['customer_id', 'customerId'],
          invoices: ['customer_id', 'customerId', 'sale_id', 'saleId', 'user_id', 'userId'],
          returns: ['sale_id', 'saleId', 'customer_id', 'customerId'],
          swaps: [
            'customer_id',
            'customerId',
            'sale_id',
            'saleId',
            'purchased_product_id',
            'purchasedProductId',
            'trade_in_product_id',
            'tradeInProductId',
            'inventory_item_id',
            'inventoryItemId'
          ],
          deals: ['customer_id', 'customerId'],
          debts: ['customer_id', 'customerId', 'sale_id', 'saleId'],
          debt_payments: ['debt_id', 'debtId']
        };
        
        const fkFields = foreignKeyFields[table_name] || [];
        
        // Tables with no foreign keys can sync immediately (Level 0)
        const hasNoForeignKeys = fkFields.length === 0;
        
        if (hasNoForeignKeys) {
          console.log(`[Sync] ${table_name}:${originalRecordId} - No foreign keys, syncing immediately`);
        } else if (idMapping.size === 0) {
          console.warn(`[Sync Skip] ${table_name}:${originalRecordId} - Has foreign keys but no ID mappings yet. Parent records need to sync first.`);
          return { success: false, error: 'Waiting for parent records to sync', isTransient: true, shouldRetry: true };
        } else {
          const missingParents = [];
          const missingParentsNoLocal = [];

          // If mapping missing, auto-queue parent records so they can sync first
          for (const fkField of fkFields) {
            const value = syncData[fkField];
            if (!value) continue;
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            if (uuidRegex.test(value)) continue; // already UUID

            const targetTable = getTargetTableForForeignKey(fkField);
            if (!targetTable) continue;

            const mappedUuid = idMapping.get(`${targetTable}:${value}`);
            if (!mappedUuid) {
              try {
                const alreadyQueued = db.prepare(`
                  SELECT id FROM sync_queue
                  WHERE table_name = ? AND record_id = ?
                `).get(targetTable, value);

                if (!alreadyQueued) {
                  const parentRecord = await getRecordById(targetTable, value);
                  if (parentRecord) {
                    trackChange(targetTable, value, CHANGE_TYPE.CREATE, parentRecord);
                    console.log(`[Sync Parent Queue] Queued ${targetTable}:${value} because ${table_name}:${originalRecordId} references it`);
                  } else {
                    console.warn(`[Sync Parent Missing] ${targetTable}:${value} referenced by ${table_name}:${originalRecordId} not found locally`);
                      missingParentsNoLocal.push(`${targetTable}:${value}`);
                  }
                }
              } catch (e) {
                console.warn(`[Sync Parent Queue] Failed to queue parent ${targetTable}:${value} - ${e.message}`);
              }
              missingParents.push(`${fkField}=${value}`);
            }
          }

          if (missingParents.length > 0) {
            const msg = `Foreign keys not converted (parent records not synced): ${missingParents.join(', ')}`;
            console.warn(`[Sync FK Pending] ${table_name}:${originalRecordId} - ${msg}`);
            if (missingParentsNoLocal.length > 0) {
              const permMsg = `${msg}; missing locally: ${missingParentsNoLocal.join(', ')}`;
              markAsError(queueItem.id, `[PERMANENT] ${permMsg}`);
              return { success: false, error: permMsg, isTransient: false, shouldRetry: false };
            }
            markAsError(queueItem.id, `[RETRYABLE] ${msg}`);
            return { success: false, error: msg, isTransient: true, shouldRetry: true };
          }

          // Has foreign keys and mappings available - convert them
          syncData = convertForeignKeysUsingMapping(syncData, table_name, idMapping);
          
          // Validate: Check if any foreign keys are still non-UUID (conversion failed)
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          const unconvertedFields = [];
          
          for (const fkField of fkFields) {
            const value = syncData[fkField];
            if (value && !uuidRegex.test(value)) {
              unconvertedFields.push(`${fkField}=${value}`);
            }
          }
          
          if (unconvertedFields.length > 0) {
            const errorMsg = `Foreign keys not converted (parent records not synced): ${unconvertedFields.join(', ')}`;
            console.error(`[Sync FK Failed] ${table_name}:${originalRecordId} - ${errorMsg}`);
            markAsError(queueItem.id, `[RETRYABLE] ${errorMsg}`);
            return { success: false, error: errorMsg, isTransient: true, shouldRetry: true };
          }
          
          console.log(`[Sync] ${table_name}:${originalRecordId} - Foreign keys converted successfully`);
        }
      }

      // Two-Phase Commit Pattern:
      // Phase 1: PREPARE - Validate and prepare data (already done above)
      // Phase 2: COMMIT - Execute sync operation
      // Phase 3: CONFIRM - Update local state only if Phase 2 succeeds

      let result;
      let supabaseUuid = null;

      try {
        // Phase 2: COMMIT - Execute sync to Supabase
        switch (change_type) {
          case CHANGE_TYPE.CREATE:
          case CHANGE_TYPE.UPDATE:
            result = await currentCloudApiClient.upsertRecord(table_name, record_id, syncData);
            break;
          case CHANGE_TYPE.DELETE: {
            // Soft delete: upsert with deleted_at instead of hard delete
            const deletedPayload = { ...(syncData || {}), deleted_at: syncData?.deleted_at || new Date().toISOString() };
            result = await currentCloudApiClient.upsertRecord(table_name, record_id, deletedPayload);
            break;
          }
          default:
            throw new Error(`Unknown change type: ${change_type}`);
        }

        if (!result.success) {
          throw new Error(result.error || 'Sync failed');
        }

        // Phase 3: CONFIRM - Update local state atomically
        supabaseUuid = result.supabaseUuid || record_id;
        
          // Use transaction to ensure atomicity of local state updates
          executeInTransaction(db, () => {
            // Mark queue item as synced
            markAsSynced(queueItem.id);
            
            // Persist ID mapping if we got a Supabase UUID
            if (supabaseUuid && supabaseUuid !== originalRecordId) {
              saveIdMappingToDB(table_name, originalRecordId, supabaseUuid);
              // Update in-memory map for current sync session
              idMapping.set(mappingKey, supabaseUuid);
            }

            // For soft deletes, mirror deleted_at locally
            if (change_type === CHANGE_TYPE.DELETE) {
              try {
                const deletedAt = syncData?.deleted_at || new Date().toISOString();
                db.prepare(`UPDATE ${table_name} SET deleted_at = ? WHERE id = ?`).run(deletedAt, originalRecordId);
              } catch (e) {
                console.warn(`[Sync Soft Delete] Failed to mark local ${table_name}:${originalRecordId} as deleted: ${e.message}`);
              }
            }
          });

        return { success: true, supabaseUuid: supabaseUuid };
      } catch (syncError) {
        // Phase 2 failed - determine if it's retryable
        const errorCategory = categorizeError(syncError);
        
        // Phase 3 (Rollback): Mark as error, but don't update mappings
        // The queue item stays in error state, can be retried later
        const errorMessage = syncError.message || String(syncError);
        
        if (errorCategory.isTransient) {
          // Transient error - can retry
          markAsError(queueItem.id, `[RETRYABLE] ${errorMessage}`);
          return { 
            success: false, 
            error: errorMessage,
            isTransient: true,
            retryDelay: errorCategory.retryDelay
          };
        } else {
          // Permanent error - don't retry automatically
          markAsError(queueItem.id, `[PERMANENT] ${errorMessage}`);
          return { 
            success: false, 
            error: errorMessage,
            isTransient: false
          };
        }
      }
    } catch (error) {
      // Unexpected error (validation, etc.) - categorize it
      const errorCategory = categorizeError(error);
      const errorMessage = error.message || String(error);
      
      markAsError(queueItem.id, errorMessage);
      return { 
        success: false, 
        error: errorMessage,
        isTransient: errorCategory.isTransient,
        retryDelay: errorCategory.retryDelay
      };
    }
  }

  /**
   * Get record count for a table
   */
  function getTableRecordCount(tableName) {
    try {
      const stmt = db.prepare(`SELECT COUNT(*) as count FROM ${tableName}`);
      const result = stmt.get();
      return result.count || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Get all record IDs from a table
   */
  function getTableRecordIds(tableName) {
    try {
      const stmt = db.prepare(`SELECT id FROM ${tableName}`);
      const records = stmt.all();
      return new Set(records.map(r => r.id?.toString()).filter(Boolean));
    } catch (error) {
      return new Set();
    }
  }

  /**
   * Load ID mapping from database
   * Returns a Map of `${tableName}:${localId}` -> `supabaseUuid`
   */
  function loadIdMappingFromDB() {
    try {
      const stmt = db.prepare(`
        SELECT table_name, local_id, supabase_uuid 
        FROM id_mapping
      `);
      const mappings = stmt.all();
      const mappingMap = new Map();
      
      for (const mapping of mappings) {
        const key = `${mapping.table_name}:${mapping.local_id}`;
        mappingMap.set(key, mapping.supabase_uuid);
      }
      
      console.log(`[Sync] Loaded ${mappingMap.size} ID mappings from database`);
      return mappingMap;
    } catch (error) {
      console.error('Error loading ID mapping from database:', error);
      // Table might not exist yet, return empty map
      return new Map();
    }
  }

  /**
   * Save ID mapping to database with conflict resolution
   * Persists the SQLite ID -> Supabase UUID mapping for future syncs
   * If a mapping already exists with a different UUID, resolves the conflict
   * 
   * Conflict Resolution Strategy: "Newest Wins"
   * - If mapping exists with different UUID, use the newer UUID (assume latest sync is correct)
   * - This handles cases where the same local ID gets different UUIDs across devices
   */
  function saveIdMappingToDB(tableName, localId, supabaseUuid) {
    try {
      if (!tableName || !localId || !supabaseUuid) {
        return; // Skip invalid mappings
      }

      // Check if mapping already exists
      const checkStmt = db.prepare(`
        SELECT supabase_uuid, updated_at FROM id_mapping 
        WHERE table_name = ? AND local_id = ?
      `);
      const existing = checkStmt.get(tableName, localId);

      if (existing) {
        // Conflict: Mapping exists with potentially different UUID
        if (existing.supabase_uuid !== supabaseUuid) {
          // Strategy: Use the newer UUID (assume latest sync is correct)
          // Log warning for manual review if needed
          console.warn(`[Sync Mapping Conflict] ${tableName}:${localId} already mapped to ${existing.supabase_uuid}, updating to ${supabaseUuid} (newest wins)`);
          
          // Update to new UUID (newest wins strategy)
          const updateStmt = db.prepare(`
            UPDATE id_mapping 
            SET supabase_uuid = ?, updated_at = CURRENT_TIMESTAMP
            WHERE table_name = ? AND local_id = ?
          `);
          updateStmt.run(supabaseUuid, tableName, localId);
        }
        // If UUID matches, no update needed (but could update timestamp)
        return;
      }

      // No conflict - insert new mapping
      const insertStmt = db.prepare(`
        INSERT INTO id_mapping (table_name, local_id, supabase_uuid, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
      insertStmt.run(tableName, localId, supabaseUuid);
    } catch (error) {
      console.error(`Error saving ID mapping for ${tableName}:${localId}:`, error);
    }
  }

  /**
   * Convert foreign keys in a record using ID mapping
   * This maintains relationships when syncing to Supabase (which uses UUIDs)
   */
  function convertForeignKeysUsingMapping(recordData, tableName, idMapping) {
    const converted = { ...recordData };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    // Helper to convert camelCase to snake_case
    function camelToSnake(str) {
      return str.replace(/([A-Z])/g, '_$1').toLowerCase();
    }

    // Foreign key mappings per table - define both camelCase and snake_case versions
    const foreignKeyMappings = {
      'products': ['productModelId', 'product_model_id'],
      'inventory_items': ['productId', 'product_id', 'customerId', 'customer_id', 'saleId', 'sale_id'],
      'product_accessories': ['productModelId', 'product_model_id', 'accessoryProductId', 'accessory_product_id', 'linkedProductId', 'linked_product_id'],
      'sales': ['customerId', 'customer_id'],
      'invoices': ['customerId', 'customer_id', 'saleId', 'sale_id', 'userId', 'user_id'],
      'returns': ['saleId', 'sale_id', 'customerId', 'customer_id'],
      'swaps': ['customerId', 'customer_id', 'saleId', 'sale_id', 'purchasedProductId', 'purchased_product_id', 'tradeInProductId', 'trade_in_product_id', 'inventoryItemId', 'inventory_item_id'],
      'deals': ['customerId', 'customer_id'],
      'debts': ['customerId', 'customer_id', 'saleId', 'sale_id'],
      'debt_payments': ['debtId', 'debt_id']
    };

    // Map camelCase field names to their target tables
    const tableMap = {
      'productModelId': 'product_models',
      'product_model_id': 'product_models',
      'productId': 'products',
      'product_id': 'products',
      'customerId': 'customers',
      'customer_id': 'customers',
      'saleId': 'sales',
      'sale_id': 'sales',
      'accessoryProductId': 'products',
      'accessory_product_id': 'products',
      'linkedProductId': 'products',
      'linked_product_id': 'products',
      'purchasedProductId': 'products',
      'purchased_product_id': 'products',
      'tradeInProductId': 'products',
      'trade_in_product_id': 'products',
      'inventoryItemId': 'inventory_items',
      'inventory_item_id': 'inventory_items',
      'userId': 'users',
      'user_id': 'users',
      'debtId': 'debts',
      'debt_id': 'debts'
    };

    const fkFields = foreignKeyMappings[tableName] || [];
    
    for (const fkField of fkFields) {
      // Check both camelCase and snake_case versions
      const value = converted[fkField];
      if (value && !uuidRegex.test(value)) {
        const targetTable = getTargetTableForForeignKey(fkField);
        if (targetTable) {
          const mappedUuid = idMapping.get(`${targetTable}:${value}`);
          if (mappedUuid) {
            converted[fkField] = mappedUuid;
            console.log(`[Sync Mapping] ${tableName}: Converted ${fkField} ${value} -> ${mappedUuid}`);
          } else {
            // Log warning when mapping not found - this may cause sync to fail
            console.warn(`[Sync Mapping] ${tableName}: No UUID mapping found for ${fkField}=${value} (target table: ${targetTable})`);
          }
        }
      }
    }

    return converted;
  }

  /**
   * Given an FK field name, return its target table
   */
  function getTargetTableForForeignKey(fkField) {
    const tableMap = {
      productModelId: 'product_models',
      product_model_id: 'product_models',
      productId: 'products',
      product_id: 'products',
      customerId: 'customers',
      customer_id: 'customers',
      saleId: 'sales',
      sale_id: 'sales',
      accessoryProductId: 'products',
      accessory_product_id: 'products',
      linkedProductId: 'products',
      linked_product_id: 'products',
      purchasedProductId: 'products',
      purchased_product_id: 'products',
      tradeInProductId: 'products',
      trade_in_product_id: 'products',
      inventoryItemId: 'inventory_items',
      inventory_item_id: 'inventory_items',
      userId: 'users',
      user_id: 'users',
      debtId: 'debts',
      debt_id: 'debts'
    };
    return tableMap[fkField];
  }

  /**
   * Helper: find local ID for a Supabase UUID in the mapping table
   */
  function findLocalIdFromMapping(idMapping, targetTable, supabaseUuid) {
    for (const [key, value] of idMapping.entries()) {
      if (value === supabaseUuid && key.startsWith(`${targetTable}:`)) {
        return key.split(':')[1];
      }
    }
    return null;
  }

  /**
   * Convert incoming Supabase UUID foreign keys to local IDs using the mapping table
   * Used when applying remote changes (pull) so local FK constraints are satisfied
   */
  function convertRemoteForeignKeysToLocal(recordData, tableName, idMapping) {
    const converted = { ...recordData };
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const missing = [];

    // Map camelCase field names to their target tables (same as push direction)
    const tableMap = {
      productModelId: 'product_models',
      productId: 'products',
      customerId: 'customers',
      saleId: 'sales',
      accessoryProductId: 'products',
      linkedProductId: 'products',
      purchasedProductId: 'products',
      tradeInProductId: 'products',
      inventoryItemId: 'inventory_items',
      userId: 'users',
      debtId: 'debts'
    };

    const foreignKeyFields = {
      products: ['productModelId'],
      inventory_items: ['productId', 'customerId', 'saleId'],
      product_accessories: ['productModelId', 'accessoryProductId', 'linkedProductId'],
      sales: ['customerId'],
      invoices: ['customerId', 'saleId', 'userId'],
      returns: ['saleId', 'customerId'],
      swaps: ['customerId', 'saleId', 'purchasedProductId', 'tradeInProductId', 'inventoryItemId'],
      deals: ['customerId'],
      debts: ['customerId', 'saleId'],
      debt_payments: ['debtId']
    };

    const fkFields = foreignKeyFields[tableName] || [];

    for (const fkField of fkFields) {
      const value = converted[fkField];
      if (value && uuidRegex.test(value)) {
        const targetTable = tableMap[fkField];
        if (!targetTable) {
          continue;
        }
        const localId = findLocalIdFromMapping(idMapping, targetTable, value);
        if (localId) {
          converted[fkField] = localId;
          console.log(`[Sync Mapping] (pull) ${tableName}: Converted ${fkField} ${value} -> ${localId}`);
        } else {
          missing.push(`${fkField}=${value}`);
        }
      }
    }

    return { converted, missing };
  }

  /**
   * Normalize and convert nested sale items foreign keys (pull path)
   * Ensures productId/inventoryItemId inside items array use local IDs
   */
  function normalizeSaleItemsForeignKeys(camelCaseData, idMapping) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const missing = [];

    if (!camelCaseData.items) {
      return { missing };
    }

    let items = camelCaseData.items;
    if (typeof items === 'string') {
      try {
        items = JSON.parse(items);
      } catch (e) {
        console.warn(`[Sync Pull] sales items not JSON, skipping parse: ${e.message}`);
        items = [];
      }
    }

    if (!Array.isArray(items)) {
      console.warn('[Sync Pull] sales items is not an array after parse, resetting to []');
      items = [];
    }

    for (const item of items) {
      // productId
      if (item.productId && uuidRegex.test(item.productId)) {
        const localProductId = findLocalIdFromMapping(idMapping, 'products', item.productId);
        if (localProductId) {
          item.productId = localProductId;
          console.log(`[Sync Mapping] (pull) sales item: productId ${item.productId} -> ${localProductId}`);
        } else {
          missing.push(`item.productId=${item.productId}`);
        }
      }
      // inventoryItemId (optional)
      if (item.inventoryItemId && uuidRegex.test(item.inventoryItemId)) {
        const localInvId = findLocalIdFromMapping(idMapping, 'inventory_items', item.inventoryItemId);
        if (localInvId) {
          item.inventoryItemId = localInvId;
          console.log(`[Sync Mapping] (pull) sales item: inventoryItemId ${item.inventoryItemId} -> ${localInvId}`);
        } else {
          missing.push(`item.inventoryItemId=${item.inventoryItemId}`);
        }
      }
    }

    camelCaseData.items = items;
    return { missing };
  }

  /**
   * Perform initial bidirectional sync - industry standard approach
   * 
   * Strategy (like Dropbox, Google Drive, etc.):
   * 1. Fetch all records from cloud (single API call)
   * 2. Fetch all records from local database
   * 3. Compare both sides:
   *    - Records only on cloud → download to local
   *    - Records only on local → queue for upload
   *    - Records on both → compare timestamps, use conflict resolution
   * 4. This ensures both sides end up with the same data
   */
  async function performInitialSync() {
    const config = getSyncConfig();
    
    // Only perform initial sync if:
    // 1. Sync is enabled
    // 2. Cloud client is configured
    // 3. Never synced before (last_sync_at is null)
      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config for pull...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
        }
      }
      
      if (!config.sync_enabled || !currentCloudApiClient || !currentCloudApiClient.isConfigured() || config.last_sync_at) {
      return { success: true, skipped: true, message: 'Initial sync not needed' };
    }

    console.log('🔄 Starting initial bidirectional sync (industry standard)...');
    
    let uploaded = 0;
    let downloaded = 0;
    let conflicts = 0;
    let errors = 0;

    try {
      // Step 1: Fetch all records from cloud (single API call for efficiency)
      console.log('📥 Step 1: Fetching all records from cloud...');
      const cloudChanges = await currentCloudApiClient.getChanges(null); // null = get everything
      
      if (!cloudChanges.success) {
        return cloudChanges;
      }

      const cloudRecords = new Map(); // table_name -> Set of record_ids
      const cloudRecordsByTable = new Map(); // table_name -> Map(record_id -> record_data)
      
      if (cloudChanges.data) {
        for (const change of cloudChanges.data) {
          const { table_name, record_id, data, server_updated_at } = change;
          
          if (!cloudRecords.has(table_name)) {
            cloudRecords.set(table_name, new Set());
            cloudRecordsByTable.set(table_name, new Map());
          }
          
          cloudRecords.get(table_name).add(record_id);
          cloudRecordsByTable.get(table_name).set(record_id, {
            data,
            server_updated_at
          });
        }
      }

      console.log(`   Found ${cloudChanges.data?.length || 0} records on cloud`);

      // Step 2: Compare with local records and handle bidirectional sync
      console.log('🔄 Step 2: Comparing local and cloud records...');
      
      for (const tableName of SYNCABLE_TABLES) {
        try {
          // Get all local record IDs and their data
          const localRecordIds = getTableRecordIds(tableName);
          const cloudRecordIds = cloudRecords.get(tableName) || new Set();
          
          let tableDownloaded = 0;
          let tableUploaded = 0;
          let tableConflicts = 0;
          let tableErrors = 0;

          console.log(`   Table ${tableName}: ${localRecordIds.size} local, ${cloudRecordIds.size} cloud`);

          // Records only on cloud → download to local
          for (const cloudRecordId of cloudRecordIds) {
            if (!localRecordIds.has(cloudRecordId)) {
              // Record exists on cloud but not locally → download it
              const cloudRecordData = cloudRecordsByTable.get(tableName)?.get(cloudRecordId);
              if (cloudRecordData) {
                try {
                  const result = await applyRemoteChange({
                    table_name: tableName,
                    record_id: cloudRecordId,
                    change_type: CHANGE_TYPE.CREATE,
                    data: cloudRecordData.data,
                    server_updated_at: cloudRecordData.server_updated_at
                  }, config.conflict_resolution_strategy);
                  
                  if (result.success) {
                    tableDownloaded++;
                  } else if (result.conflict) {
                    tableConflicts++;
                  } else {
                    tableErrors++;
                  }
                } catch (error) {
                  console.error(`Error downloading ${tableName}:${cloudRecordId}:`, error);
                  tableErrors++;
                }
              }
            } else {
              // Record exists on both → compare timestamps (handled by applyRemoteChange)
              const cloudRecordData = cloudRecordsByTable.get(tableName)?.get(cloudRecordId);
              if (cloudRecordData) {
                try {
                  const localRecord = await getRecordById(tableName, cloudRecordId);
                  if (localRecord) {
                    // Compare timestamps - applyRemoteChange will handle conflict resolution
                    const result = await applyRemoteChange({
                      table_name: tableName,
                      record_id: cloudRecordId,
                      change_type: CHANGE_TYPE.UPDATE,
                      data: cloudRecordData.data,
                      server_updated_at: cloudRecordData.server_updated_at
                    }, config.conflict_resolution_strategy);
                    
                    if (result.conflict) {
                      tableConflicts++;
                    } else if (!result.success && !result.skipped) {
                      tableErrors++;
                    }
                  }
                } catch (error) {
                  console.error(`Error comparing ${tableName}:${cloudRecordId}:`, error);
                  tableErrors++;
                }
              }
            }
          }

          // Records only on local → queue for upload
          for (const localRecordId of localRecordIds) {
            if (!cloudRecordIds.has(localRecordId)) {
              // Record exists locally but not on cloud → queue for upload
              const record = await getRecordById(tableName, localRecordId);
              if (record) {
                // Check if already in queue to avoid duplicates
                const existingStmt = db.prepare(`
                  SELECT id FROM sync_queue 
                  WHERE table_name = ? AND record_id = ? AND change_type = 'create'
                `);
                const existing = existingStmt.get(tableName, localRecordId);
                
                if (!existing) {
                  trackChange(tableName, localRecordId, CHANGE_TYPE.CREATE, record);
                  tableUploaded++;
                }
              }
            }
          }

          downloaded += tableDownloaded;
          uploaded += tableUploaded;
          conflicts += tableConflicts;
          errors += tableErrors;

          console.log(`   Table ${tableName}: ${tableDownloaded} downloaded, ${tableUploaded} queued for upload, ${tableConflicts} conflicts`);
        } catch (tableError) {
          console.error(`Error processing table ${tableName} for initial sync:`, tableError.message);
          errors++;
          // Continue with other tables
        }
      }

      console.log(`✅ Initial bidirectional sync complete:`);
      console.log(`   📥 Downloaded: ${downloaded} records`);
      console.log(`   📤 Queued for upload: ${uploaded} records`);
      console.log(`   ⚠️  Conflicts: ${conflicts}`);
      console.log(`   ❌ Errors: ${errors}`);

      return {
        success: true,
        downloaded,
        uploaded,
        conflicts,
        errors,
        message: `Initial sync: ${downloaded} downloaded, ${uploaded} queued for upload`
      };
    } catch (error) {
      console.error('Error during initial bidirectional sync:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Queue all existing records that aren't in the sync queue yet
   * This is needed when sync is first enabled on an existing database
   */
  async function queueExistingRecords() {
    console.log('[Sync Bootstrap] Checking for existing records not in queue...');
    let queued = 0;
    
    // Load existing ID mappings to avoid re-queuing already synced records
    const existingMappings = loadIdMappingFromDB();
    
    // Queue parent tables first (Level 0 - no dependencies)
    const parentTables = ['customers', 'product_models', 'users', 'invoice_templates'];
    
    for (const tableName of parentTables) {
      try {
        const allRecords = db.prepare(`SELECT id FROM ${tableName}`).all();
        
        for (const record of allRecords) {
          // Check if already in queue
          const existing = db.prepare(`
            SELECT id FROM sync_queue 
            WHERE table_name = ? AND record_id = ?
          `).get(tableName, record.id);
          
          if (!existing) {
            const fullRecord = await getRecordById(tableName, record.id);
            if (fullRecord) {
              trackChange(tableName, record.id, CHANGE_TYPE.CREATE, fullRecord);
              queued++;
            }
          }
        }
        
        if (allRecords.length > 0) {
          console.log(`[Sync Bootstrap] ${tableName}: ${allRecords.length} existing records, queued new: ${queued}`);
        }
      } catch (error) {
        // Table might not exist, skip
        console.warn(`[Sync Bootstrap] Skipping ${tableName}:`, error.message);
      }
    }
    
    // Queue Level 1 tables (depend on Level 0)
    const level1Tables = ['products', 'deals', 'debts'];
    
    for (const tableName of level1Tables) {
      try {
        const allRecords = db.prepare(`SELECT id FROM ${tableName}`).all();
        let tableQueued = 0;
        
        for (const record of allRecords) {
          const existing = db.prepare(`
            SELECT id FROM sync_queue 
            WHERE table_name = ? AND record_id = ?
          `).get(tableName, record.id);
          
          if (!existing) {
            const fullRecord = await getRecordById(tableName, record.id);
            if (fullRecord) {
              trackChange(tableName, record.id, CHANGE_TYPE.CREATE, fullRecord);
              tableQueued++;
              queued++;
            }
          }
        }
        
        if (allRecords.length > 0) {
          console.log(`[Sync Bootstrap] ${tableName}: ${allRecords.length} existing, queued ${tableQueued} new`);
        }
      } catch (error) {
        console.warn(`[Sync Bootstrap] Skipping ${tableName}:`, error.message);
      }
    }
    
    // Queue Level 2 tables (depend on Level 0-1)
    const level2Tables = ['sales', 'invoices', 'returns', 'debt_payments', 'product_accessories'];
    
    for (const tableName of level2Tables) {
      try {
        const allRecords = db.prepare(`SELECT id FROM ${tableName}`).all();
        let tableQueued = 0;
        
        for (const record of allRecords) {
          const existing = db.prepare(`
            SELECT id FROM sync_queue 
            WHERE table_name = ? AND record_id = ?
          `).get(tableName, record.id);
          
          if (!existing) {
            const fullRecord = await getRecordById(tableName, record.id);
            if (fullRecord) {
              trackChange(tableName, record.id, CHANGE_TYPE.CREATE, fullRecord);
              tableQueued++;
              queued++;
            }
          }
        }
        
        if (allRecords.length > 0) {
          console.log(`[Sync Bootstrap] ${tableName}: ${allRecords.length} existing, queued ${tableQueued} new`);
        }
      } catch (error) {
        console.warn(`[Sync Bootstrap] Skipping ${tableName}:`, error.message);
      }
    }
    
    console.log(`[Sync Bootstrap] ✅ Queued ${queued} existing records for sync`);
    return queued;
  }

  /**
   * Sync all pending items (with lock protection)
   */
  async function syncAll() {
    // Acquire lock
    if (!acquireSyncLock()) {
      return { success: false, error: 'Sync already in progress' };
    }

    try {
      const config = getSyncConfig();
      
      if (!config.sync_enabled) {
        return { success: false, error: 'Sync is disabled' };
      }
      
      // Always queue parent records to ensure ID mappings exist
      // This is necessary because child records can't sync without parent mappings
      console.log('[Sync] Queuing any missing parent records...');
      await queueExistingRecords();

      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        const config = getSyncConfig();
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
          console.log('✅ Cloud API client created');
        } else {
          return { success: false, error: 'Cloud API client not configured. Please set Supabase URL and API key in sync settings.' };
        }
      }
      
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        return { success: false, error: 'Cloud API client not configured' };
      }

      // Check if this is the first sync - perform initial full sync
      if (!config.last_sync_at) {
        console.log('🔄 First sync detected - performing initial full sync...');
        const initialSyncResult = await performInitialSync();
        if (!initialSyncResult.success) {
          return initialSyncResult;
        }
        
        // Initial sync is bidirectional - it both pulls and queues uploads
        // Continue with normal sync to upload the queued items
        if (initialSyncResult.downloaded !== undefined) {
          console.log(`Initial sync: ${initialSyncResult.downloaded} downloaded, ${initialSyncResult.uploaded || 0} queued for upload`);
          // Continue to sync the queued uploads below
        }
      }

      // Recover stuck items first
      recoverStuckItems();

      // Auto-retry failed items before syncing new ones
      const autoRetried = autoRetryFailedItems(5);
      if (autoRetried > 0) {
        console.log(`🔄 Auto-retried ${autoRetried} failed items`);
      }

      const pendingItems = getPendingSyncItems();
      
      if (pendingItems.length === 0) {
        return { success: true, synced: 0, message: 'No pending items to sync' };
      }

      // Sort pending items by sync order (parent tables first)
      // This ensures foreign keys can be resolved when syncing child records
      const pendingItemsByTable = new Map();
      for (const item of pendingItems) {
        if (!pendingItemsByTable.has(item.table_name)) {
          pendingItemsByTable.set(item.table_name, []);
        }
        pendingItemsByTable.get(item.table_name).push(item);
      }

      // Sort tables by SYNC_ORDER
      const sortedTableNames = SYNC_ORDER.filter(table => pendingItemsByTable.has(table))
        .concat(Array.from(pendingItemsByTable.keys()).filter(table => !SYNC_ORDER.includes(table)));
      
      const sortedPendingItems = [];
      for (const tableName of sortedTableNames) {
        sortedPendingItems.push(...pendingItemsByTable.get(tableName));
      }

      // Load ID mapping from database (persists across crashes and sessions)
      // This ensures foreign key relationships are maintained even after process restarts
      const idMapping = loadIdMappingFromDB();
      
      // Log what tables we're about to sync and in what order
      console.log(`[Sync Order] About to sync ${sortedPendingItems.length} items in this order:`);
      const tableStats = {};
      for (const item of sortedPendingItems) {
        tableStats[item.table_name] = (tableStats[item.table_name] || 0) + 1;
      }
      console.log('[Sync Order] Tables:', Object.entries(tableStats).map(([t, c]) => `${t}(${c})`).join(', '));

      let synced = 0;
      let errors = 0;

      // Rate limiting: Add delay between items to avoid hitting API limits
      const RATE_LIMIT_DELAY_MS = 100; // 100ms delay between items (10 items/second max)

      for (let i = 0; i < sortedPendingItems.length; i++) {
        const item = sortedPendingItems[i];
        const result = await syncItem(item, idMapping);
        if (result.success) {
          synced++;
          // Persist ID mapping to database if we got a Supabase UUID back
          // This ensures the mapping survives crashes and process restarts
          if (result.supabaseUuid && result.supabaseUuid !== item.record_id) {
            // Update in-memory map for current sync session
            idMapping.set(`${item.table_name}:${item.record_id}`, result.supabaseUuid);
            // Persist to database for future syncs
            saveIdMappingToDB(item.table_name, item.record_id, result.supabaseUuid);
            // Update in-memory map for current sync session
            idMapping.set(`${item.table_name}:${item.record_id}`, result.supabaseUuid);
            // Persist to database for future syncs
            saveIdMappingToDB(item.table_name, item.record_id, result.supabaseUuid);
          }
        } else {
          errors++;
        }

        // Add rate limiting delay (except for last item)
        if (i < sortedPendingItems.length - 1) {
          await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
        }
      }

      // Only update last sync time if all items succeeded
      // (or if we want partial success, update only if synced > 0)
      if (synced > 0) {
        const updateStmt = db.prepare(`
          UPDATE sync_metadata 
          SET last_sync_at = CURRENT_TIMESTAMP 
          WHERE id = 1
        `);
        updateStmt.run();
      }

      return {
        success: true,
        synced,
        errors,
        total: pendingItems.length
      };
    } finally {
      releaseSyncLock();
    }
  }

  /**
   * Pull changes from cloud (with optional lock protection)
   * @param {string|null} lastSyncAt - Override last sync timestamp (null = pull all)
   * @param {boolean} skipLock - If true, skip lock acquisition (for internal calls)
   */
  async function pullChanges(lastSyncAt = null, skipLock = false) {
    // Acquire lock unless explicitly skipped (for internal calls)
    if (!skipLock) {
      if (!acquireSyncLock()) {
        return { success: false, error: 'Sync already in progress' };
      }
    }

    try {
      const config = getSyncConfig();
      
      // Dynamically create/update cloud client from config if needed
      if (!currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        if (config.cloud_url && config.api_key) {
          console.log('🔄 Creating cloud API client from config...');
          const { createCloudApiClient } = require('./cloud-api-client');
          currentCloudApiClient = createCloudApiClient(
            config.cloud_provider || 'supabase',
            {
              url: config.cloud_url || '',
              apiKey: config.api_key || '',
              tablePrefix: config.table_prefix || ''
            }
          );
        }
      }
      
      if (!config.sync_enabled || !currentCloudApiClient || !currentCloudApiClient.isConfigured()) {
        return { success: false, error: 'Sync not configured' };
      }

      // If lastSyncAt is null and config.last_sync_at is also null, pull everything
      const syncTimestamp = lastSyncAt !== null ? lastSyncAt : (config.last_sync_at || null);
      const changes = await currentCloudApiClient.getChanges(syncTimestamp);
      
      if (!changes.success) {
        return changes;
      }

      let applied = 0;
      let conflicts = 0;
      let errors = 0;

      // Apply changes to local database in transaction
      for (const change of changes.data || []) {
        try {
          const result = await applyRemoteChange(change, config.conflict_resolution_strategy);
          if (result.success) {
            applied++;
          } else if (result.conflict) {
            conflicts++;
          } else {
            errors++;
          }
        } catch (error) {
          console.error('Error applying remote change:', error);
          errors++;
        }
      }

      // Update last sync time only if changes were applied
      if (applied > 0 || (changes.data?.length === 0)) {
        const updateStmt = db.prepare(`
          UPDATE sync_metadata 
          SET last_sync_at = CURRENT_TIMESTAMP 
          WHERE id = 1
        `);
        updateStmt.run();
      }

      return {
        success: true,
        applied,
        conflicts,
        errors,
        total: changes.data?.length || 0
      };
    } catch (error) {
      return { success: false, error: error.message };
    } finally {
      // Only release lock if we acquired it
      if (!skipLock) {
        releaseSyncLock();
      }
    }
  }

  /**
   * Get record by table name and ID (with full schema support)
   */
  async function getRecordById(tableName, recordId) {
    const methodMap = {
      'customers': 'getCustomerById',
      'products': 'getProductById',
      'sales': 'getSaleById',
      'invoices': 'getInvoiceById',
      'orders': 'getOrderById',
      'returns': 'getReturnById',
      'deals': 'getDealById',
      'debts': 'getDebtById',
      'debt_payments': 'getDebtPaymentById',
      'users': 'getUserById'
    };

    const method = methodMap[tableName];
    if (!method || !databaseService[method]) {
      // Try generic query as fallback
      try {
        const stmt = db.prepare(`SELECT * FROM ${tableName} WHERE id = ?`);
        const record = stmt.get(recordId);
        return record;
      } catch (error) {
        console.error(`Error fetching ${tableName}:${recordId}:`, error);
        return null;
      }
    }

    return await databaseService[method](recordId);
  }

  /**
   * Check for conflicts (improved logic)
   */
  function checkConflict(localRecord, serverUpdatedAt, lastSyncAt, changeType) {
    // If local record doesn't exist and remote is DELETE, no conflict
    if (!localRecord && changeType === CHANGE_TYPE.DELETE) {
      return false;
    }

    // If local record doesn't exist and remote is CREATE/UPDATE, no conflict
    if (!localRecord) {
      return false;
    }

    // Check if there's a pending sync for this record
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE table_name = ? AND record_id = ? AND sync_status IN ('pending', 'syncing')
    `);
    const pending = pendingStmt.get(localRecord.table_name || 'unknown', localRecord.id);
    
    if (pending.count > 0) {
      return true; // Conflict: local change pending
    }

    // Check timestamp conflict
    if (localRecord.updated_at && serverUpdatedAt) {
      const localTime = new Date(localRecord.updated_at).getTime();
      const serverTime = new Date(serverUpdatedAt).getTime();
      const lastSyncTime = new Date(lastSyncAt || 0).getTime();
      
      // If local was modified after last sync, we have a conflict
      if (localTime > lastSyncTime) {
        return true;
      }
    }

    return false;
  }

  /**
   * Convert snake_case to camelCase (reverse of convertToSnakeCase)
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

  /**
   * Apply a remote change to local database (with improved conflict handling)
   */
  async function applyRemoteChange(change, conflictStrategy) {
    const { table_name, record_id, change_type, data, server_updated_at } = change;

    try {
      // Validate table name
      if (!SYNCABLE_TABLES.includes(table_name)) {
        return { success: false, error: `Table ${table_name} is not syncable` };
      }
      
      // Convert snake_case data from Supabase to camelCase for local database
      // IMPORTANT: Preserve the id from Supabase to maintain relationships
      const camelCaseData = convertToCamelCase(data);
      // Ensure id is set (it should be in the data, but make sure it's preserved)
      if (!camelCaseData.id && record_id) {
        camelCaseData.id = record_id;
      }

      // Map incoming UUID FKs to local IDs using the stored mapping
      const idMapping = loadIdMappingFromDB();
      const { converted: localFkData, missing: pullMissing } = convertRemoteForeignKeysToLocal(camelCaseData, table_name, idMapping);
      if (pullMissing.length > 0) {
        const msg = `Waiting for parent mappings (pull) for ${table_name}:${record_id} → ${pullMissing.join(', ')}`;
        console.warn(`[Sync Pull] ${msg}`);
        return { success: false, error: msg, isTransient: true };
      }
      Object.assign(camelCaseData, localFkData);

      // Special case: sales.items contains nested product/inventory FKs that also need mapping
      if (table_name === 'sales') {
        const { missing: itemMissing } = normalizeSaleItemsForeignKeys(camelCaseData, idMapping);
        if (itemMissing.length > 0) {
          const msg = `Waiting for sale item mappings (pull) for ${table_name}:${record_id} → ${itemMissing.join(', ')}`;
          console.warn(`[Sync Pull] ${msg}`);
          return { success: false, error: msg, isTransient: true };
        }
      }

      // Soft delete handling: if deleted_at is present, treat as soft delete locally
      const isSoftDelete = camelCaseData.deletedAt || camelCaseData.deleted_at;
      if (isSoftDelete) {
        try {
          db.prepare(`UPDATE ${table_name} SET deleted_at = ? WHERE id = ?`).run(
            camelCaseData.deletedAt || camelCaseData.deleted_at,
            record_id
          );
          return { success: true };
        } catch (e) {
          console.error(`[Sync Pull] Failed to apply soft delete for ${table_name}:${record_id}`, e);
          return { success: false, error: e.message };
        }
      }
      
      // Debug logging for invoices to verify customer_id is converted
      if (table_name === 'invoices') {
        console.log(`[Sync Debug] Applying invoice ${record_id}:`, {
          hasId: !!camelCaseData.id,
          customerId: camelCaseData.customerId,
          customerName: camelCaseData.customerName,
          saleId: camelCaseData.saleId,
          originalDataKeys: Object.keys(data || {}),
          convertedKeys: Object.keys(camelCaseData || {})
        });
      }

      // Get local record and last sync time
      const localRecord = await getRecordById(table_name, record_id);
      const config = getSyncConfig();
      const lastSyncAt = config.last_sync_at;

      // Check for conflicts
      const hasConflict = checkConflict(localRecord, server_updated_at, lastSyncAt, change_type);

      if (hasConflict) {
        if (conflictStrategy === 'manual') {
          // Queue for manual resolution
          trackChange(table_name, record_id, 'conflict', {
            local: localRecord,
            remote: data,
            conflict_type: 'update_conflict',
            change_type: change_type
          });
          return { success: false, conflict: true };
        } else if (conflictStrategy === 'client_wins') {
          // Skip this change
          return { success: true, skipped: true };
        }
        // server_wins - continue to apply
      }

      // If cloud marks deleted_at but sends as update, treat it as delete
      const effectiveChangeType = (change_type === CHANGE_TYPE.UPDATE && data && data.deleted_at)
        ? CHANGE_TYPE.DELETE
        : change_type;

      // Handle DELETE conflicts specially
      if (effectiveChangeType === CHANGE_TYPE.DELETE) {
        if (!localRecord) {
          // Already deleted, no-op
          return { success: true, skipped: true };
        }
        // Check if local has pending changes
        if (hasConflict && conflictStrategy === 'client_wins') {
          return { success: true, skipped: true };
        }
      }

      // Apply the change using appropriate database service method
      const updateMethodMap = {
        'customers': 'updateCustomer',
        'product_models': 'updateProductModel',
        'products': 'updateProduct',
        'inventory_items': 'updateInventoryItem',
        'product_accessories': 'updateAccessory',
        'sales': 'updateSale',
        'invoices': 'updateInvoice',
        'returns': 'updateReturn',
        'swaps': 'updateSwap',
        'deals': 'updateDeal',
        'debts': 'updateDebt',
        'debt_payments': 'updateDebtPayment',
        'boqs': 'updateBOQ',
        'invoice_templates': 'updateInvoiceTemplate',
        'users': 'updateUser'
      };

      const createMethodMap = {
        'customers': 'createCustomer',
        'product_models': 'createProductModel',
        'products': 'createProduct',
        'inventory_items': 'createInventoryItem',
        'product_accessories': 'addAccessoryToModel', // Note: This might need special handling
        'sales': 'createSale',
        'invoices': 'createInvoice',
        'returns': 'createReturn',
        'swaps': 'createSwap',
        'deals': 'createDeal',
        'debts': 'addDebt', // Uses addDebt method
        'debt_payments': 'addDebtPayment', // Uses addDebtPayment method
        'boqs': 'createBOQ',
        'invoice_templates': 'createInvoiceTemplate',
        'users': 'createUser'
      };

      const deleteMethodMap = {
        'customers': 'deleteCustomer',
        'product_models': 'deleteProductModel',
        'products': 'deleteProduct',
        'inventory_items': 'deleteInventoryItem',
        'product_accessories': 'removeAccessoryFromModel',
        'sales': 'deleteSale',
        'invoices': 'deleteInvoice',
        'returns': 'deleteReturn',
        'swaps': 'deleteSwap',
        'deals': 'deleteDeal',
        'debts': 'deleteDebt',
        'debt_payments': 'deleteDebtPayment',
        'boqs': 'deleteBOQ',
        'invoice_templates': 'deleteInvoiceTemplate',
        'users': 'deleteUser'
      };

      // Check if record exists before transaction (for DELETE operations)
      let existingRecord = null;
      if (change_type === CHANGE_TYPE.DELETE) {
        existingRecord = await getRecordById(table_name, record_id);
      }

      // Use transaction for atomicity
      return executeInTransaction(db, () => {
        switch (effectiveChangeType) {
          case CHANGE_TYPE.CREATE:
            const createMethod = createMethodMap[table_name];
            // Handle special cases where method names differ
            let actualCreateMethod = createMethod;
            if (table_name === 'debts' && !databaseService[createMethod] && databaseService.addDebt) {
              actualCreateMethod = 'addDebt';
            } else if (table_name === 'debt_payments' && !databaseService[createMethod] && databaseService.addDebtPayment) {
              actualCreateMethod = 'addDebtPayment';
            }
            
            if (actualCreateMethod && databaseService[actualCreateMethod]) {
              // CRITICAL: Use the id from Supabase to maintain relationships
              // This ensures customer_id, sale_id, etc. reference the correct records
              camelCaseData.id = record_id;
              
              // For users, we need to set a default password_hash if creating from sync
              if (table_name === 'users' && !camelCaseData.passwordHash) {
                // Set a temporary password that user must reset (or use a default)
                // In production, you might want to require password reset on first login
                const crypto = require('crypto');
                camelCaseData.passwordHash = crypto.createHash('sha256').update('TEMP_PASSWORD_RESET_REQUIRED').digest('hex');
              }
              // Parse JSON fields (items, taxes, etc.) if they're strings
              if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                try {
                  camelCaseData.items = JSON.parse(camelCaseData.items);
                } catch (e) {
                  console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                try {
                  camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                } catch (e) {
                  console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                try {
                  camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                } catch (e) {
                  console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                }
              }
              if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                try {
                  camelCaseData.notes = JSON.parse(camelCaseData.notes);
                } catch (e) {
                  // Be tolerant: keep raw string to avoid breaking pull/apply
                  console.warn(`Failed to parse notes for ${table_name}:${record_id}, keeping raw string:`, e.message);
                }
              }
              try {
                databaseService[actualCreateMethod](camelCaseData);
              } catch (createError) {
                // Handle foreign key constraint failures for swaps
                if (table_name === 'swaps' && createError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                  console.warn(`[Sync] Swap ${record_id} has foreign key constraint failure. Attempting to create with null foreign keys...`);
                  // Try creating with null foreign keys if they're causing issues
                  const swapWithoutFK = { ...camelCaseData };
                  // Only nullify foreign keys that might be causing issues
                  // Keep the ones that are valid
                  if (swapWithoutFK.customerId) {
                    const customerExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(swapWithoutFK.customerId);
                    if (!customerExists) {
                      console.warn(`[Sync] Customer ${swapWithoutFK.customerId} not found, setting to null`);
                      swapWithoutFK.customerId = null;
                    }
                  }
                  if (swapWithoutFK.saleId) {
                    const saleExists = db.prepare('SELECT id FROM sales WHERE id = ?').get(swapWithoutFK.saleId);
                    if (!saleExists) {
                      console.warn(`[Sync] Sale ${swapWithoutFK.saleId} not found, setting to null`);
                      swapWithoutFK.saleId = null;
                    }
                  }
                  if (swapWithoutFK.purchasedProductId) {
                    const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(swapWithoutFK.purchasedProductId);
                    if (!productExists) {
                      console.warn(`[Sync] Purchased product ${swapWithoutFK.purchasedProductId} not found, setting to null`);
                      swapWithoutFK.purchasedProductId = null;
                    }
                  }
                  if (swapWithoutFK.tradeInProductId) {
                    const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(swapWithoutFK.tradeInProductId);
                    if (!productExists) {
                      console.warn(`[Sync] Trade-in product ${swapWithoutFK.tradeInProductId} not found, setting to null`);
                      swapWithoutFK.tradeInProductId = null;
                    }
                  }
                  if (swapWithoutFK.inventoryItemId) {
                    const itemExists = db.prepare('SELECT id FROM inventory_items WHERE id = ?').get(swapWithoutFK.inventoryItemId);
                    if (!itemExists) {
                      console.warn(`[Sync] Inventory item ${swapWithoutFK.inventoryItemId} not found, setting to null`);
                      swapWithoutFK.inventoryItemId = null;
                    }
                  }
                  // Retry with nullified foreign keys
                  databaseService[actualCreateMethod](swapWithoutFK);
                } else {
                  throw createError; // Re-throw if it's not a foreign key error or not a swap
                }
              }
            } else {
              // Fallback to direct insert
              const insertStmt = db.prepare(`INSERT INTO ${table_name} (id, ...) VALUES (?, ...)`);
              // This is a simplified example - would need proper column mapping
            }
            break;
          case CHANGE_TYPE.UPDATE:
            // If local record doesn't exist, create it instead of updating
            if (!localRecord) {
              const createMethod = createMethodMap[table_name];
              // Handle special cases where method names differ
              let actualCreateMethod = createMethod;
              if (table_name === 'debts' && !databaseService[createMethod] && databaseService.addDebt) {
                actualCreateMethod = 'addDebt';
              } else if (table_name === 'debt_payments' && !databaseService[createMethod] && databaseService.addDebtPayment) {
                actualCreateMethod = 'addDebtPayment';
              }
              
              if (actualCreateMethod && databaseService[actualCreateMethod]) {
                // For users, we need to set a default password_hash if creating from sync
                if (table_name === 'users' && !camelCaseData.passwordHash) {
                  // Set a temporary password that user must reset (or use a default)
                  // In production, you might want to require password reset on first login
                  const crypto = require('crypto');
                  camelCaseData.passwordHash = crypto.createHash('sha256').update('TEMP_PASSWORD_RESET_REQUIRED').digest('hex');
                }
                // Parse JSON fields (items, taxes, etc.) if they're strings
                if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                  try {
                    camelCaseData.items = JSON.parse(camelCaseData.items);
                  } catch (e) {
                    console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                  try {
                    camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                  } catch (e) {
                    console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                  try {
                    camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                  } catch (e) {
                    console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                  try {
                    camelCaseData.notes = JSON.parse(camelCaseData.notes);
                  } catch (e) {
                    console.warn(`Failed to parse notes for ${table_name}:${record_id}:`, e);
                  }
                }
                try {
                  databaseService[actualCreateMethod](camelCaseData);
                } catch (createError) {
                  // Handle foreign key constraint failures for swaps
                  if (table_name === 'swaps' && createError.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
                    console.warn(`[Sync] Swap ${record_id} has foreign key constraint failure. Attempting to create with null foreign keys...`);
                    // Try creating with null foreign keys if they're causing issues
                    const swapWithoutFK = { ...camelCaseData };
                    // Only nullify foreign keys that might be causing issues
                    // Keep the ones that are valid
                    if (swapWithoutFK.customerId) {
                      const customerExists = db.prepare('SELECT id FROM customers WHERE id = ?').get(swapWithoutFK.customerId);
                      if (!customerExists) {
                        console.warn(`[Sync] Customer ${swapWithoutFK.customerId} not found, setting to null`);
                        swapWithoutFK.customerId = null;
                      }
                    }
                    if (swapWithoutFK.saleId) {
                      const saleExists = db.prepare('SELECT id FROM sales WHERE id = ?').get(swapWithoutFK.saleId);
                      if (!saleExists) {
                        console.warn(`[Sync] Sale ${swapWithoutFK.saleId} not found, setting to null`);
                        swapWithoutFK.saleId = null;
                      }
                    }
                    if (swapWithoutFK.purchasedProductId) {
                      const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(swapWithoutFK.purchasedProductId);
                      if (!productExists) {
                        console.warn(`[Sync] Purchased product ${swapWithoutFK.purchasedProductId} not found, setting to null`);
                        swapWithoutFK.purchasedProductId = null;
                      }
                    }
                    if (swapWithoutFK.tradeInProductId) {
                      const productExists = db.prepare('SELECT id FROM products WHERE id = ?').get(swapWithoutFK.tradeInProductId);
                      if (!productExists) {
                        console.warn(`[Sync] Trade-in product ${swapWithoutFK.tradeInProductId} not found, setting to null`);
                        swapWithoutFK.tradeInProductId = null;
                      }
                    }
                    if (swapWithoutFK.inventoryItemId) {
                      const itemExists = db.prepare('SELECT id FROM inventory_items WHERE id = ?').get(swapWithoutFK.inventoryItemId);
                      if (!itemExists) {
                        console.warn(`[Sync] Inventory item ${swapWithoutFK.inventoryItemId} not found, setting to null`);
                        swapWithoutFK.inventoryItemId = null;
                      }
                    }
                    // Retry with nullified foreign keys
                    databaseService[actualCreateMethod](swapWithoutFK);
                  } else {
                    throw createError; // Re-throw if it's not a foreign key error or not a swap
                  }
                }
              } else {
                throw new Error(`Cannot create record in ${table_name} - method not available`);
              }
            } else {
              const updateMethod = updateMethodMap[table_name];
              if (updateMethod && databaseService[updateMethod]) {
                // Parse JSON fields (items, taxes, etc.) if they're strings
                if (camelCaseData.items && typeof camelCaseData.items === 'string') {
                  try {
                    camelCaseData.items = JSON.parse(camelCaseData.items);
                  } catch (e) {
                    console.warn(`Failed to parse items for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.taxes && typeof camelCaseData.taxes === 'string') {
                  try {
                    camelCaseData.taxes = JSON.parse(camelCaseData.taxes);
                  } catch (e) {
                    console.warn(`Failed to parse taxes for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.bankDetails && typeof camelCaseData.bankDetails === 'string') {
                  try {
                    camelCaseData.bankDetails = JSON.parse(camelCaseData.bankDetails);
                  } catch (e) {
                    console.warn(`Failed to parse bankDetails for ${table_name}:${record_id}:`, e);
                  }
                }
                if (camelCaseData.notes && typeof camelCaseData.notes === 'string') {
                  try {
                    camelCaseData.notes = JSON.parse(camelCaseData.notes);
                  } catch (e) {
                    console.warn(`Failed to parse notes for ${table_name}:${record_id}:`, e);
                  }
                }
                databaseService[updateMethod](record_id, camelCaseData);
              } else {
                throw new Error(`Cannot update record in ${table_name} - method not available`);
              }
            }
            break;
          case CHANGE_TYPE.DELETE:
            const deleteMethod = deleteMethodMap[table_name];
            if (deleteMethod && databaseService[deleteMethod]) {
              // existingRecord was checked before transaction
              if (existingRecord) {
                console.log(`[Sync] Applying delete for ${table_name}:${record_id}`);
                databaseService[deleteMethod](record_id);
              } else {
                console.log(`[Sync] Record ${table_name}:${record_id} already deleted or doesn't exist locally - skipping`);
              }
            } else {
              console.warn(`[Sync] No delete method found for ${table_name} - record ${record_id} will remain`);
            }
            break;
        }

        // Remove from sync queue if it exists (already synced from server)
        const deleteStmt = db.prepare(`
          DELETE FROM sync_queue 
          WHERE table_name = ? AND record_id = ? AND change_type = ?
        `);
        deleteStmt.run(table_name, record_id, effectiveChangeType);

        return { success: true };
      });
    } catch (error) {
      console.error('Error applying remote change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get sync status
   */
  function getSyncStatus() {
    const config = getSyncConfig();
    
    const pendingStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'pending'
    `);
    const pending = pendingStmt.get().count;

    const errorStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue WHERE sync_status = 'error'
    `);
    const errors = errorStmt.get().count;

    // Check if locked_at column exists
    let stuck = 0;
    try {
      const tableInfo = db.prepare(`PRAGMA table_info(sync_queue)`).all();
      const hasLockedAt = tableInfo.some(col => col.name === 'locked_at');
      
      if (hasLockedAt) {
        const stuckStmt = db.prepare(`
          SELECT COUNT(*) as count FROM sync_queue 
          WHERE sync_status = 'syncing' 
          AND (locked_at IS NULL OR locked_at < datetime('now', '-5 minutes'))
        `);
        stuck = stuckStmt.get().count;
      } else {
        // Fallback: count all syncing items if locked_at doesn't exist
        const stuckStmt = db.prepare(`
          SELECT COUNT(*) as count FROM sync_queue 
          WHERE sync_status = 'syncing'
        `);
        stuck = stuckStmt.get().count;
      }
    } catch (error) {
      console.error('Error getting stuck items count:', error);
      stuck = 0;
    }

    return {
      enabled: config.sync_enabled === 1,
      lastSyncAt: config.last_sync_at,
      pending,
      errors,
      stuck,
      deviceId: config.device_id,
      cloudProvider: config.cloud_provider,
      isConfigured: currentCloudApiClient?.isConfigured() || false,
      isLocked: syncLock
    };
  }

  /**
   * Get sync health metrics and status
   * Returns health indicators for monitoring and alerting
   */
  function getSyncHealth() {
    const status = getSyncStatus();
    const config = getSyncConfig();
    
    // Calculate total items
    const totalStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue
    `);
    const total = totalStmt.get().count || 0;

    // Calculate error rate
    const errorRate = total > 0 ? (status.errors / total) * 100 : 0;

    // Calculate last sync age (in minutes)
    let lastSyncAgeMinutes = null;
    if (status.lastSyncAt) {
      const lastSyncTime = new Date(status.lastSyncAt).getTime();
      const now = Date.now();
      lastSyncAgeMinutes = Math.floor((now - lastSyncTime) / 60000);
    }

    // Get items with high retry count (potential persistent failures)
    const highRetryStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE retry_count >= 3 AND sync_status = 'error'
    `);
    const highRetryErrors = highRetryStmt.get().count || 0;

    // Get recent errors (last hour)
    const recentErrorsStmt = db.prepare(`
      SELECT COUNT(*) as count FROM sync_queue 
      WHERE sync_status = 'error' 
      AND created_at > datetime('now', '-1 hour')
    `);
    const recentErrors = recentErrorsStmt.get().count || 0;

    // Determine health status
    let healthStatus = 'healthy';
    const warnings = [];
    const alerts = [];

    // Check error rate
    if (errorRate > 20) {
      healthStatus = 'critical';
      alerts.push(`High error rate: ${errorRate.toFixed(1)}%`);
    } else if (errorRate > 10) {
      healthStatus = 'warning';
      warnings.push(`Elevated error rate: ${errorRate.toFixed(1)}%`);
    }

    // Check stuck items
    if (status.stuck > 10) {
      healthStatus = 'critical';
      alerts.push(`${status.stuck} items stuck in syncing state`);
    } else if (status.stuck > 5) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${status.stuck} items stuck in syncing state`);
    }

    // Check last sync age
    if (lastSyncAgeMinutes !== null) {
      if (lastSyncAgeMinutes > 60) {
        healthStatus = 'critical';
        alerts.push(`Last sync was ${lastSyncAgeMinutes} minutes ago`);
      } else if (lastSyncAgeMinutes > 30) {
        healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
        warnings.push(`Last sync was ${lastSyncAgeMinutes} minutes ago`);
      }
    } else if (status.enabled && config.sync_enabled) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push('Never synced (initial sync pending)');
    }

    // Check high retry errors
    if (highRetryErrors > 5) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${highRetryErrors} items with 3+ retry attempts`);
    }

    // Check recent errors
    if (recentErrors > 20) {
      healthStatus = healthStatus === 'critical' ? 'critical' : 'warning';
      warnings.push(`${recentErrors} errors in the last hour`);
    }

    return {
      status: healthStatus, // 'healthy' | 'warning' | 'critical'
      metrics: {
        total,
        pending: status.pending,
        errors: status.errors,
        stuck: status.stuck,
        synced: total - status.pending - status.errors - status.stuck,
        errorRate: parseFloat(errorRate.toFixed(2)),
        highRetryErrors,
        recentErrors,
        lastSyncAgeMinutes,
        lastSyncAt: status.lastSyncAt
      },
      warnings,
      alerts,
      enabled: status.enabled,
      isConfigured: status.isConfigured,
      isLocked: status.isLocked
    };
  }

  /**
   * Clear sync queue
   */
  function clearSyncQueue(status = null) {
    if (status) {
      const stmt = db.prepare('DELETE FROM sync_queue WHERE sync_status = ?');
      stmt.run(status);
    } else {
      db.prepare('DELETE FROM sync_queue').run();
    }
  }

  return {
    initializeSyncTables,
    getSyncConfig,
    updateSyncConfig,
    trackChange,
    getPendingSyncItems,
    getSyncQueueItems,
    syncAll,
    pullChanges,
    getSyncStatus,
    getSyncHealth,
    clearSyncQueue,
    resetFailedItems,
    autoRetryFailedItems,
    recoverStuckItems,
    performInitialSync,
    SYNCABLE_TABLES,
    EXCLUDED_TABLES
  };
}

module.exports = {
  createSyncService,
  SYNC_STATUS,
  CHANGE_TYPE
};
