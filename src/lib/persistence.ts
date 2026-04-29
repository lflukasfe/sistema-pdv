
// Chaves para o LocalStorage
export const STORAGE_KEYS = {
  PRODUCTS: 'pdv_products',
  SALES: 'pdv_sales',
  CUSTOMERS: 'pdv_customers',
  CATEGORIES: 'pdv_categories',
  SUBCATEGORIES: 'pdv_subcategories',
  PAYMENT_METHODS: 'pdv_payment_methods',
  CUSTOM_PAYMENT_METHODS: 'pdv_custom_payment_methods',
  DELIVERY_CHANNELS: 'pdv_delivery_channels',
  DELIVERY_METHODS: 'pdv_delivery_methods',
  CLOSED_SESSIONS: 'pdv_closed_sessions',
  CASHIER_SESSION: 'pdv_cashier_session',
  COMPANY_INFO: 'pdv_company_info',
  COUPON_CONFIG: 'pdv_coupon_config',
  LABEL_CONFIG: 'pdv_label_config',
  PRINTERS: 'pdv_printers',
  USERS: 'pdv_users',
  ROLES: 'pdv_roles',
  ACTIVITIES: 'pdv_activities',
  HIDDEN_PAYMENT_METHODS: 'pdv_hidden_payment_methods',
  SELECTED_PRINTER: 'pdv_selected_printer',
  REVENUES: 'pdv_revenues',
  PURCHASES: 'pdv_purchases',
  EXPENSES: 'pdv_expenses',
  INVENTORIES: 'pdv_inventories',
  PRODUCT_RECIPES: 'pdv_product_recipes',
  RAW_MATERIALS: 'pdv_raw_materials_structured',
  LOCAL_BACKUPS: 'pdv_local_backups',
  LAST_AUTO_BACKUP: 'pdv_last_auto_backup_date'
};

export interface LocalBackup {
  id: string;
  date: string;
  data: any;
  size: number;
}

/**
 * Salva um objeto sob uma chave específica no armazenamento local.
 * Funciona tanto no navegador quanto no Electron.
 */
export function salvarDados(key: string, data: any): boolean {
  try {
    if (!key) throw new Error('Chave de armazenamento não fornecida.');
    console.log("SALVANDO DADOS");
    console.log(`[Persistência] SALVANDO DADOS - Chave: ${key}`);
    const serializedData = JSON.stringify(data);
    localStorage.setItem(key, serializedData);
    return true;
  } catch (error) {
    console.error(`[Persistência] Erro ao salvar dados na chave "${key}":`, error);
    return false;
  }
}

/**
 * Carrega e faz o parse de um objeto do armazenamento local.
 * Retorna o valor padrão se não encontrar a chave ou houver erro.
 */
export function carregarDados<T>(key: string, defaultValue: T): T {
  try {
    console.log("CARREGANDO DADOS");
    console.log(`[Persistência] CARREGANDO DADOS - Chave: ${key}`);
    const serializedData = localStorage.getItem(key);
    if (serializedData === null) {
      return defaultValue;
    }
    const parsedData = JSON.parse(serializedData);
    
    // Pequena validação para garantir que o tipo retornado não é nulo/undefined 
    // se o defaultValue for um objeto/array
    if (typeof defaultValue === 'object' && defaultValue !== null && parsedData === null) {
      return defaultValue;
    }
    
    return parsedData as T;
  } catch (error) {
    console.error(`[Persistência] Erro ao carregar dados da chave "${key}":`, error);
    return defaultValue;
  }
}

/**
 * Salva o backup em arquivo (Electron)
 */
export async function salvarBackupArquivo(data: any): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.saveBackup) {
    console.log('[Backup] Salvando backup em arquivo...');
    await electronAPI.saveBackup(data);
  }
}

/**
 * Carrega o backup do arquivo (Electron)
 */
export async function carregarBackupArquivo(): Promise<any | null> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.loadBackup) {
    console.log('[Backup] Carregando backup do arquivo...');
    return await electronAPI.loadBackup();
  }
  return null;
}

/**
 * Exporta o backup via diálogo (Electron) ou download (Browser)
 */
export async function exportarBackup(data: any): Promise<void> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.exportBackup) {
    const result = await electronAPI.exportBackup(data);
    if (result && result.success) {
      alert('Backup exportado com sucesso!');
    } else if (result && result.error) {
      alert('Erro ao exportar backup: ' + result.error);
    }
  } else {
    // Browser fallback
    try {
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }).replace(':', '-');
      const fileName = `backup_${dateStr}_{timeStr}.json`.replace('{timeStr}', timeStr);
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert('Backup gerado e baixado com sucesso!');
    } catch (error) {
      console.error('[Backup] Erro ao exportar no navegador:', error);
      alert('Erro ao exportar backup.');
    }
  }
}

/**
 * Importa o backup via diálogo (Electron) ou input (Browser)
 */
export async function importarBackup(): Promise<any | null> {
  const electronAPI = (window as any).electronAPI;
  if (electronAPI && electronAPI.importBackup) {
    return await electronAPI.importBackup();
  } else {
    // Browser fallback
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      
      input.onchange = (e: any) => {
        const file = e.target.files?.[0];
        if (!file) {
          resolve(null);
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target?.result as string);
            resolve(data);
          } catch (err) {
            console.error('[Backup] Erro ao ler arquivo:', err);
            alert('Arquivo inválido ou corrompido.');
            resolve(null);
          }
        };
        reader.onerror = () => {
          alert('Erro ao ler o arquivo.');
          resolve(null);
        };
        reader.readAsText(file);
      };

      input.click();
    });
  }
}

/**
 * Limpa uma chave específica ou todo o armazenamento
 */
export function limparDados(key?: string): void {
  try {
    if (key) {
      localStorage.removeItem(key);
    } else {
      localStorage.clear();
    }
  } catch (error) {
    console.error('[Persistência] Erro ao limpar dados:', error);
  }
}
