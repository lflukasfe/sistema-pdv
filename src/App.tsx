/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo, useRef, ChangeEvent, FormEvent, MouseEvent } from 'react';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { QRCodeCanvas } from 'qrcode.react';
import { DashboardView } from './components/DashboardView';
import { 
  TrendingUp, BarChart3, Users, LayoutGrid, Store, CreditCard, 
  Package, UserPlus, Handshake, Boxes, Tag, Truck, Calculator, 
  BadgeDollarSign, Plus, Minus, Search, X, ChevronLeft, ArrowLeft, Trash2, Save, 
  ShoppingBag, Pencil, Image as ImageIcon, Printer, ChevronRight, 
  Zap, Link, Download, Upload, Database, Loader2, Check, History, Lock, Unlock, 
  Receipt, User, ScanLine, QrCode, Barcode, ShieldCheck, Star, AlertCircle,
  Clock, Send, CheckCircle2, RefreshCw, LayoutDashboard, Cake,
  Monitor, Cpu, AlertTriangle, Cloud, CheckCircle, MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  salvarDados, 
  carregarDados, 
  STORAGE_KEYS, 
  salvarBackupArquivo, 
  carregarBackupArquivo,
  exportarBackup,
  importarBackup,
  LocalBackup
} from './lib/persistence';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

import { FinanceView } from './components/FinanceView';

// --- Types ---
interface Product {
  id: string;
  name: string;
  price: number; // Varejo
  costPrice?: number;
  stock: number;
  wholesalePrice?: number; // Atacado
  wholesaleMinQty?: number; // Quantidade mínima para atacado
  category?: string;
  categoryId?: string;
  subcategoryId?: string;
  sku?: string; // Código fornecedor
  barcode?: string;
  imageUrl?: string;
}

interface Category {
  id: string;
  name: string;
}

interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
}

interface Activity {
  id: string;
  type: 'customer' | 'product' | 'sale' | 'system' | 'product_edit' | 'auth' | 'security';
  action: string;
  details: string;
  timestamp: string;
  user: string;
  userRole?: string;
  productId?: string;
  productName?: string;
  field?: string;
  oldValue?: any;
  newValue?: any;
}

interface Customer {
  id: string;
  displayId: string;
  name: string;
  email?: string;
  whatsapp?: string;
  phone?: string; // Backward compatibility
  dob?: string;
  taxId?: string; // CPF/CNPJ
  image?: string; // Base64 image
  address?: {
    cep: string;
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    complement?: string;
  };
  debt: number;
}

interface DeliveryChannel {
  id: string;
  name: string;
}

interface DeliveryMethod {
  id: string;
  name: string;
  isActive: boolean;
}

interface Sale {
  id: string;
  sequentialId?: string; // e.g. "00001"
  items: { 
    productId: string; 
    quantity: number; 
    price: number; 
    cost: number; 
    profit: number 
  }[];
  total: number;
  totalCost: number;
  totalProfit: number;
  date: number;
  customerId?: string;
  deliveryChannelId?: string;
  deliveryMethodId?: string;
  cashierSessionId?: string;
  paymentMethod: string;
  trackingCode?: string;
  deliveryMethod?: string;
  receivedAmount?: number;
  change?: number;
  status?: 'pendente' | 'em_separacao' | 'separado' | 'embalado' | 'enviado' | 'em_transporte' | 'entregue' | 'cancelado';
  notes?: string;
}

interface Revenue {
  id: string;
  saleId: string;
  amount: number;
  status: 'pendente' | 'confirmado' | 'cancelado';
  date: string;
}

interface Purchase {
  id: string;
  date: string;
  itemName: string;
  quantity: number;
  totalValue: number;
}

interface Expense {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
}

interface RawMaterial {
  id: string;
  name: string;
  unitCost: number;
  unit: 'g' | 'ml' | 'unidade';
}

interface ProductIngredient {
  rawMaterialId: string;
  quantity: number;
}

interface ProductRecipe {
  productId: string;
  ingredients: ProductIngredient[];
}

interface CouponConfig {
  format: '58mm' | '80mm' | 'a4' | 'a6' | 'custom';
  customWidth?: number;
  customHeight?: number;
  printerName?: string;
  outputType: 'impressora' | 'pdf';
  printMode: 'browser' | 'auto';
  headerMessage: string;
  footerMessage: string;
  defaultMessage: string;
  // Visibilidade Empresa
  showLogo: boolean;
  showCompanyName: boolean;
  showCompanyId: boolean;
  showCompanyAddress: boolean;
  showIdNumber: boolean; 
  showAddress: boolean;
  // Visibilidade Cliente
  showCustomer: boolean;
  showCustomerName: boolean;
  showCustomerTaxId: boolean;
  showCustomerPhone: boolean;
  showCustomerAddress: boolean;
  showCustomerAddressNumber: boolean;
  showCustomerAddressNeighborhood: boolean;
  showCustomerAddressCity: boolean;
  showCustomerAddressState: boolean;
  showCustomerAddressComplement: boolean;
  showCustomerCep: boolean;
  // Visibilidade Itens
  showItemName: boolean;
  showItemQty: boolean;
  showItemPrice: boolean;
  showItemUnitPrice: boolean;
  showItemSubtotal: boolean;
  // Visibilidade Totais
  showDiscounts: boolean;
  showDiscount: boolean;
  showFinalTotal: boolean;
  // Visibilidade Pagamento
  showPaymentMethod: boolean;
  showChange: boolean;
  // Extras
  showOrderNumber: boolean;
  showDateTime: boolean;
  showOrderQrCode: boolean;
  showPrice: boolean;
}

// --- Helpers ---
const maskCEP = (value: string) => {
  return value.replace(/\D/g, '').replace(/^(\d{5})(\d)/, '$1-$2').substring(0, 9);
};

const maskPhone = (value: string) => {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 10) return nums.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  return nums.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').substring(0, 15);
};

const maskCPF_CNPJ = (value: string) => {
  const nums = value.replace(/\D/g, '');
  if (nums.length <= 11) {
    return nums.replace(/^(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').substring(0, 14);
  }
  return nums.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').substring(0, 18);
};

const validateEmail = (email: string) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

interface CompanyInfo {
  logo?: string;
  name: string;
  tradeName?: string;
  slogan?: string;
  idNumber: string; // CPF/CNPJ
  stateRegistration?: string;
  email: string;
  website: string;
  address: {
    logradouro: string;
    cep: string;
    numero: string;
    bairro: string;
    cidade: string;
    estado: string;
  };
  pix: string;
  phone: string;
}

interface LabelConfig {
  width: number; // mm
  height: number; // mm
  format: 'a4' | 'a6' | 'custom' | 'thermal';
  showProductName: boolean;
  showBarcode: boolean;
  showCodeNumber: boolean;
  showPrice: boolean;
  showPrintDate: boolean;
  printerName: string;
  printMode: 'browser' | 'auto';
  sheetType?: 'a4' | 'thermal';
  labelsPerSheet?: number;
}

interface SystemUser {
  id: string;
  username: string;
  name: string;
  password?: string;
  roleId?: string;
  isActive?: boolean;
  deactivatedAt?: string;
}

type AccessLevel = 'total' | 'limitado' | 'nenhum';

interface ModulePermissions {
  dashboard: AccessLevel;
  pdv: AccessLevel;
  separacao: AccessLevel;
  estoque: AccessLevel;
  financeiro: AccessLevel;
  historico: AccessLevel;
  ajustes: AccessLevel;
}

interface Role {
  id: string;
  name: string;
  isDefault?: boolean;
  permissions: ModulePermissions;
}

const DEFAULT_PERMISSIONS: ModulePermissions = {
  dashboard: 'nenhum',
  pdv: 'nenhum',
  separacao: 'nenhum',
  estoque: 'nenhum',
  financeiro: 'nenhum',
  historico: 'nenhum',
  ajustes: 'nenhum'
};

const INITIAL_ROLES: Role[] = [
  {
    id: 'role-gerente',
    name: 'Gerente',
    isDefault: true,
    permissions: {
      dashboard: 'total',
      pdv: 'total',
      separacao: 'total',
      estoque: 'total',
      financeiro: 'total',
      historico: 'total',
      ajustes: 'total',
    }
  },
  {
    id: 'role-caixa',
    name: 'Operador de caixa',
    isDefault: true,
    permissions: {
      dashboard: 'limitado',
      pdv: 'total',
      separacao: 'nenhum',
      estoque: 'limitado',
      financeiro: 'nenhum',
      historico: 'nenhum',
      ajustes: 'nenhum',
    }
  },
  {
    id: 'role-separador',
    name: 'Separador',
    isDefault: true,
    permissions: {
      dashboard: 'nenhum',
      pdv: 'nenhum',
      separacao: 'total',
      estoque: 'limitado',
      financeiro: 'nenhum',
      historico: 'nenhum',
      ajustes: 'nenhum',
    }
  },
  {
    id: 'role-estoquista',
    name: 'Estoquista',
    isDefault: true,
    permissions: {
      dashboard: 'nenhum',
      pdv: 'nenhum',
      separacao: 'nenhum',
      estoque: 'total',
      financeiro: 'nenhum',
      historico: 'nenhum',
      ajustes: 'nenhum',
    }
  },
  {
    id: 'role-financeiro',
    name: 'Financeiro',
    isDefault: true,
    permissions: {
      dashboard: 'total',
      pdv: 'nenhum',
      separacao: 'nenhum',
      estoque: 'nenhum',
      financeiro: 'total',
      historico: 'total',
      ajustes: 'nenhum',
    }
  }
];

interface CashierSession {
  id: string;
  isOpen: boolean;
  openedAt: string;
  closedAt?: string;
  userId?: string;
  userName?: string;
  openingBalance: number;
  closingBalance?: number;
  totalSales: number;
  totalCanceled: number;
  salesCount: number;
  canceledCount: number;
  salesByMethod: Record<string, number>;
  reforsos?: number;
  sangrias?: number;
  estornos?: number;
  descontos?: number;
  acrescimos?: number;
  taxaEntrega?: number;
}


type View = 'dashboard' | 'summary' | 'adjust' | 'payments' | 'add-product' | 'add-customer' | 'movement' | 'delivery' | 'cashier' | 'finance' | 'sales-history' | 'pos' | 'separation' | 'results';

interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'desktop';
  connection: 'usb' | 'network' | 'bluetooth';
}

// --- Main App ---
export default function App() {
  const [view, setView] = useState<View>('dashboard');
  const [selectedPrinter, setSelectedPrinter] = useState<string>('thermal-01');
  
  const performUnifiedPrint = async (type: string, content: string, printer: string, mode: string) => {
    console.log(`[Impressão] Solicitando impressão de ${type} em ${printer} (Modo: ${mode})`);
    if (mode === 'auto' && window.parent) {
      // Mock logic or bridge logic
      window.parent.postMessage({ type: 'print', contentType: type, content, printer }, '*');
      return true;
    }
    
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(content);
      win.document.close();
      return true;
    }
    return false;
  };
  const [printers, setPrinters] = useState<PrinterConfig[]>([
    { id: 'thermal-01', name: 'Impressora Balcão (58mm)', type: 'thermal', connection: 'usb' },
    { id: 'thermal-02', name: 'Impressora Cozinha (80mm)', type: 'thermal', connection: 'network' }
  ]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [deliveryChannels, setDeliveryChannels] = useState<DeliveryChannel[]>([]);
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [closedSessions, setClosedSessions] = useState<CashierSession[]>([]);
  
  const [payments, setPayments] = useState<any[]>([]);

  const generateReceiptHTML = async (sale: Sale, products: Product[], customers: Customer[], company: CompanyInfo, config: CouponConfig) => {
    const customer = customers.find(c => c.id === sale.customerId);
    const itemsHtml = sale.items.map(item => {
      const p = products.find(prod => prod.id === item.productId);
      const originalPrice = p?.price || item.price;
      const discountPerUnit = originalPrice - item.price;
      const hasDiscount = config.showDiscount && discountPerUnit > 0;

      return `
        <div style="display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px;">
          <span>${item.quantity}x ${p?.name || 'Item'}</span>
          <span>R$ ${(item.price * item.quantity).toFixed(2)}</span>
        </div>
        ${(config.showPrice || hasDiscount) ? `
          <div style="font-size: 8px; font-style: italic; opacity: 0.7;">
            ${config.showPrice ? `Unit: R$ ${item.price.toFixed(2)}` : ''}
            ${hasDiscount ? `<span style="color: #e67e22;"> (Economia: R$ ${(discountPerUnit * item.quantity).toFixed(2)})</span>` : ''}
          </div>
        ` : ''}
      `;
    }).join('');

    let qrCodeImg = '';
    if (config.showOrderQrCode) {
      try {
        const qrDataUrl = await QRCode.toDataURL(sale.sequentialId?.toString() || sale.id);
        qrCodeImg = `<div style="text-align: center; margin-top: 15px;"><img src="${qrDataUrl}" style="width: 100px; height: 100px;" /><div style="font-size: 8px; margin-top: 4px;">REFERÊNCIA DO PEDIDO</div></div>`;
      } catch (e) {
        console.error(e);
      }
    }

    const paperWidth = config.format === '58mm' ? '58mm' : config.format === '80mm' ? '80mm' : config.format === 'custom' ? `${config.customWidth}mm` : '210mm';

    return `
      <html>
        <head>
          <title>Cupom #${sale.sequentialId}</title>
          <style>
            @page { margin: 0; size: ${paperWidth} auto; }
            body { 
              font-family: 'Courier New', Courier, monospace; 
              padding: 5mm;
              margin: 0;
              width: ${paperWidth};
              background: white;
            }
            .header { text-align: center; margin-bottom: 15px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .header img { max-width: 50px; margin-bottom: 5px; }
            .header h3 { margin: 5px 0; font-size: 14px; text-transform: uppercase; }
            .header div { font-size: 9px; line-height: 1.2; }
            .items { margin: 10px 0; border-bottom: 1px dashed #000; padding-bottom: 10px; }
            .total { font-weight: bold; font-size: 14px; text-align: right; margin-top: 10px; }
            .footer { text-align: center; margin-top: 20px; font-size: 9px; border-top: 1px dashed #000; padding-top: 10px; }
            @media print { .no-print { display: none; } }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            ${company.logo && config.showLogo ? `<img src="${company.logo}" />` : ''}
            ${config.showCompanyName ? `<h3>${company.tradeName || company.name || 'EMPRESA'}</h3>` : ''}
            ${config.showIdNumber ? `<div>CPF/CNPJ: ${company.idNumber || '---'}${company.stateRegistration ? ` | IE: ${company.stateRegistration}` : ''}</div>` : ''}
            ${config.showAddress ? `
              <div>${company.address.logradouro}, ${company.address.numero} - ${company.address.bairro}</div>
              <div>${company.address.cidade}/${company.address.estado}</div>
            ` : ''}
          </div>
          ${config.headerMessage ? `<div style="text-align: center; margin-bottom: 10px; border-bottom: 1px dashed #000; padding-bottom: 5px; font-size: 9px;">${config.headerMessage}</div>` : ''}
          <div class="items">${itemsHtml}</div>
          <div class="total">TOTAL: R$ ${sale.total.toFixed(2)}</div>
          <div style="font-size: 10px; margin-top: 5px;">PAGAMENTO: ${sale.paymentMethod}</div>
          ${customer && config.showCustomer && (config.showCustomerName || config.showCustomerPhone || config.showCustomerTaxId || config.showCustomerAddress) ? `
            <div style="margin-top: 10px; font-size: 10px; border-top: 1px dashed #000; padding-top: 5px;">
              <b style="text-transform: uppercase;">Dados do Cliente:</b><br>
              ${config.showCustomerName ? `<b>NOME:</b> ${customer.name}<br>` : ''}
              ${config.showCustomerPhone && (customer.whatsapp || customer.phone) ? `<b>FONE:</b> ${customer.whatsapp || customer.phone}<br>` : ''}
              ${config.showCustomerTaxId && customer.taxId ? `<b>DOC:</b> ${customer.taxId}<br>` : ''}
              ${config.showCustomerAddress && customer.address ? `
                <b>END:</b> ${customer.address.street}${config.showCustomerAddressNumber ? `, ${customer.address.number}` : ''}<br>
                ${config.showCustomerAddressNeighborhood ? `<b>BAIRRO:</b> ${customer.address.neighborhood}<br>` : ''}
                ${config.showCustomerAddressCity ? `<b>CIDADE:</b> ${customer.address.city} - ${customer.address.state || ''}<br>` : ''}
                ${config.showCustomerCep ? `<b>CEP:</b> ${customer.address.cep}<br>` : ''}
                ${config.showCustomerAddressComplement && customer.address.complement ? `<b>COMPL:</b> ${customer.address.complement}<br>` : ''}
              ` : ''}
            </div>
          ` : ''}
          <div class="footer">
            <p>${config.footerMessage || config.defaultMessage}</p>
            ${qrCodeImg}
            <p style="font-size: 8px; margin-top: 10px;">PEDIDO: #${sale.sequentialId} | ${new Date(sale.date).toLocaleString('pt-BR')}</p>
          </div>
        </body>
      </html>
    `;
  };

  const imprimirCupom = async (saleOrHtml: Sale | string) => {
    const html = typeof saleOrHtml === 'string' 
      ? saleOrHtml 
      : await generateReceiptHTML(saleOrHtml, products, customers, company, couponConfig);
    return performUnifiedPrint('cupom', html, couponConfig.printerName || '', couponConfig.printMode);
  };

  const imprimirEtiqueta = async (product: Product, quantity: number) => {
    // Reutilizando lógica do LabelPrintModal de forma simplificada para chamada direta
    const generateLabelHtml = (p: Product, config: LabelConfig) => `
      <div class="label" style="
        width: ${config.width}mm; 
        height: ${config.height}mm; 
        padding: 2mm; 
        box-sizing: border-box; 
        display: flex; 
        flex-direction: column; 
        align-items: center; 
        justify-content: center; 
        text-align: center;
        overflow: hidden;
        position: relative;
        background: white;
        ${config.sheetType === 'a4' ? 'border: 0.1mm solid #eee;' : ''}
      ">
        ${config.showProductName ? `<div style="font-size: 8pt; font-weight: 900; text-transform: uppercase; margin-bottom: 1mm; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${p.name}</div>` : ''}
        ${config.showBarcode ? `
          <div style="display: flex; flex-direction: column; items: center;">
            <svg class="barcode"></svg>
            ${config.showCodeNumber ? `<div style="font-size: 6pt; font-family: monospace; margin-top: 0.5mm;">${p.sku || ''}</div>` : ''}
          </div>
        ` : ''}
        <div style="display: flex; justify-content: space-between; width: 100%; margin-top: auto; align-items: flex-end;">
          ${config.showPrintDate ? `<div style="font-size: 5pt; font-family: monospace;">${new Date().toLocaleDateString('pt-BR')}</div>` : '<div></div>'}
          ${config.showPrice ? `<div style="font-size: 10pt; font-weight: 900; font-style: italic;">R$ ${Number(p.price).toFixed(2)}</div>` : ''}
        </div>
      </div>
    `;

    const labels = Array.from({ length: quantity }).map(() => generateLabelHtml(product, labelConfig)).join('');

    const paperSize = labelConfig.sheetType === 'a4' ? 'A4' : labelConfig.format === 'a6' ? 'A6' : labelConfig.format === 'custom' ? `${labelConfig.width}mm ${labelConfig.height}mm` : `${labelConfig.width}mm ${labelConfig.height}mm`;

    const fullHtml = `
      <html>
        <head>
          <title>Etiquetas - ${product.name}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <style>
            @page { margin: 0; size: ${paperSize}; }
            body { margin: 0; padding: 0; background: white; }
            .sheet {
              display: flex;
              flex-wrap: wrap;
              width: ${labelConfig.sheetType === 'a4' ? '210mm' : 'auto'};
              ${labelConfig.sheetType === 'a4' ? 'padding: 5mm;' : ''}
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="sheet">
            ${labels}
          </div>
          <script>
            window.onload = () => {
              const barcodes = document.querySelectorAll('.barcode');
              barcodes.forEach(el => {
                JsBarcode(el, "${product.sku || '123456789012'}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 30,
                  displayValue: false,
                  margin: 0
                });
              });
              setTimeout(() => { if(${labelConfig.printMode !== 'auto'}) window.print(); }, 500);
            };
          </script>
        </body>
      </html>
    `;

    return performUnifiedPrint('etiqueta', fullHtml, labelConfig.printerName || '', labelConfig.printMode);
  };

  const addActivity = (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => {
    const userRole = currentUser ? roles.find(r => r.id === currentUser.roleId)?.name : 'Sistema';
    const newActivity: Activity = {
      id: crypto.randomUUID(),
      type,
      action,
      details,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || 'Sistema',
      userRole,
      ...extra
    };
    setActivities(prev => [newActivity, ...prev].slice(0, 1000));
  };
  const [sales, setSales] = useState<Sale[]>([]);

  // Gold Customer Logic - Shared
  const goldCustomerIds = useMemo(() => {
    const stats: Record<string, { totalSpent: number, orderCount: number }> = {};
    sales.forEach(s => {
      if (s.status !== 'cancelado' && s.customerId) {
        if (!stats[s.customerId]) stats[s.customerId] = { totalSpent: 0, orderCount: 0 };
        stats[s.customerId].totalSpent += s.total;
        stats[s.customerId].orderCount += 1;
      }
    });

    const ids = new Set<string>();
    const LIMIT_VALUE = 1000;
    const MIN_ORDERS = 3;

    Object.entries(stats).forEach(([id, s]: [string, any]) => {
      if (s.orderCount >= MIN_ORDERS || s.totalSpent >= LIMIT_VALUE) {
        ids.add(id);
      }
    });
    return ids;
  }, [sales]);

  const [company, setCompany] = useState<CompanyInfo>({
    name: '',
    tradeName: '',
    slogan: '',
    idNumber: '',
    stateRegistration: '',
    email: '',
    website: '',
    address: { logradouro: '', cep: '', numero: '', bairro: '', cidade: '', estado: '' },
    pix: '',
    phone: ''
  });
  const [revenues, setRevenues] = useState<Revenue[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [rawMaterialsStructured, setRawMaterialsStructured] = useState<RawMaterial[]>([]);
  const [productRecipes, setProductRecipes] = useState<ProductRecipe[]>([]);

  const [couponConfig, setCouponConfig] = useState<CouponConfig>({
    format: '80mm',
    outputType: 'impressora',
    printMode: 'browser',
    printerName: '',
    customWidth: 80,
    customHeight: 300,
    headerMessage: 'CUPOM DE VENDA',
    footerMessage: 'Obrigado pela preferência!',
    defaultMessage: 'Obrigado pela preferência! Volte sempre.',
    // Visibilidade Empresa
    showLogo: true,
    showCompanyName: true,
    showCompanyId: true,
    showCompanyAddress: true,
    showIdNumber: true,
    showAddress: true,
    // Visibilidade Cliente
    showCustomer: true,
    showCustomerName: true,
    showCustomerTaxId: true,
    showCustomerPhone: true,
    showCustomerAddress: true,
    showCustomerAddressNumber: true,
    showCustomerAddressNeighborhood: true,
    showCustomerAddressCity: true,
    showCustomerAddressState: true,
    showCustomerAddressComplement: true,
    showCustomerCep: true,
    // Visibilidade Itens
    showItemName: true,
    showItemQty: true,
    showItemPrice: true,
    showItemUnitPrice: true,
    showItemSubtotal: true,
    // Visibilidade Totais
    showDiscounts: true,
    showDiscount: true,
    showFinalTotal: true,
    // Visibilidade Pagamento
    showPaymentMethod: true,
    showChange: true,
    // Extras
    showOrderNumber: true,
    showDateTime: true,
    showOrderQrCode: true,
    showPrice: true
  });
  const [labelConfig, setLabelConfig] = useState<LabelConfig>({
    width: 50,
    height: 30,
    format: 'thermal',
    showProductName: true,
    showBarcode: true,
    showCodeNumber: true,
    showPrice: true,
    showPrintDate: false,
    sheetType: 'thermal',
    labelsPerSheet: 1,
    printMode: 'browser',
    printerName: ''
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [roles, setRoles] = useState<Role[]>(() => carregarDados(STORAGE_KEYS.ROLES, INITIAL_ROLES));
  const [paymentMethods, setPaymentMethods] = useState<string[]>(['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO']);
  const [customPaymentMethods, setCustomPaymentMethods] = useState<string[]>([]);
  const [hiddenPaymentMethods, setHiddenPaymentMethods] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  
  const [cashierSession, setCashierSession] = useState<CashierSession>({
    id: '',
    isOpen: false,
    openedAt: '',
    openingBalance: 0,
    totalSales: 0,
    totalCanceled: 0,
    salesCount: 0,
    canceledCount: 0,
    salesByMethod: {}
  });
  
  
// Persistence
useEffect(() => {
  const initData = async () => {
    console.log("%c[Persistência] INICIANDO CARREGAMENTO DE DADOS...", "color: #5d5dff; font-weight: bold;");
    
    // Tenta carregar do backup de arquivo primeiro (Electron)
    let backupData = await carregarBackupArquivo();
    
    const productsData = backupData?.products || carregarDados(STORAGE_KEYS.PRODUCTS, []);
    const customersData = backupData?.customers || carregarDados(STORAGE_KEYS.CUSTOMERS, []);
    const salesData = backupData?.sales || carregarDados(STORAGE_KEYS.SALES, []);
    const activitiesData = backupData?.activities || carregarDados(STORAGE_KEYS.ACTIVITIES, []);
    const categoriesData = backupData?.categories || carregarDados(STORAGE_KEYS.CATEGORIES, []);
    const subcategoriesData = backupData?.subcategories || carregarDados(STORAGE_KEYS.SUBCATEGORIES, []);
    const deliveryChannelsData = backupData?.delivery_channels || carregarDados(STORAGE_KEYS.DELIVERY_CHANNELS, []);
    const deliveryMethodsData = backupData?.delivery_methods || carregarDados(STORAGE_KEYS.DELIVERY_METHODS, [
      { id: '1', name: 'Correios', isActive: true },
      { id: '2', name: 'Motoboy', isActive: true },
      { id: '3', name: 'Retirada', isActive: true },
      { id: '4', name: 'Shopee', isActive: true },
      { id: '5', name: 'Outros', isActive: true }
    ]);
    const closedSessionsData = backupData?.closed_sessions || carregarDados(STORAGE_KEYS.CLOSED_SESSIONS, []);
    const usersData = backupData?.users || carregarDados(STORAGE_KEYS.USERS, []);
    const rolesData = backupData?.roles || carregarDados(STORAGE_KEYS.ROLES, INITIAL_ROLES);
    
    // Ensure default roles exist and have correct permissions
    const mergedRoles = [...rolesData];
    INITIAL_ROLES.forEach(initRole => {
      if (!mergedRoles.find(r => r.id === initRole.id)) {
        mergedRoles.push(initRole);
      }
    });

    const paymentMethodsData = (backupData?.paymentMethods || carregarDados(STORAGE_KEYS.PAYMENT_METHODS, ['DINHEIRO', 'PIX', 'CARTÃO DE CRÉDITO', 'CARTÃO DE DÉBITO'])).filter((m: string) => m !== 'OUTROS');
    const customPaymentMethodsData = (backupData?.customPaymentMethods || carregarDados(STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, [])).filter((m: string) => m !== 'OUTROS');
    const hiddenPaymentMethodsData = backupData?.hiddenPaymentMethods || carregarDados(STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, []);
    const printersData = backupData?.printers || carregarDados(STORAGE_KEYS.PRINTERS, [
      { id: 'thermal-01', name: 'Impressora Balcão (58mm)', type: 'thermal', connection: 'usb' },
      { id: 'thermal-02', name: 'Impressora Cozinha (80mm)', type: 'thermal', connection: 'network' }
    ]);
    
    const companyData = backupData?.company || carregarDados(STORAGE_KEYS.COMPANY_INFO, {
      name: '', tradeName: '', slogan: '', idNumber: '', stateRegistration: '', email: '', website: '', address: { logradouro: '', cep: '', numero: '', bairro: '', cidade: '', estado: '' }, pix: '', phone: ''
    });
    
    const couponConfigData = backupData?.couponConfig || carregarDados(STORAGE_KEYS.COUPON_CONFIG, {
      format: '80mm',
      headerMessage: 'CUPOM DE VENDA',
      footerMessage: 'Obrigado pela preferência!',
      showLogo: true,
      showCompanyName: true,
      showCompanyId: true,
      showCompanyAddress: true,
      showCustomerName: true,
      showCustomerId: true,
      showCustomerPhone: true,
      showCustomerAddress: true,
      showCustomerCep: true,
      showItemName: true,
      showItemQty: true,
      showItemPrice: true,
      showItemUnitPrice: true,
      showItemSubtotal: true,
      showDiscounts: true,
      showFinalTotal: true,
      showPaymentMethod: true,
      showChange: true,
      showOrderNumber: true,
      showDateTime: true,
    });
    
    const revenuesData = backupData?.revenues || carregarDados(STORAGE_KEYS.REVENUES, []);
    const purchasesData = backupData?.purchases || carregarDados(STORAGE_KEYS.PURCHASES, []);
    const expensesData = backupData?.expenses || carregarDados(STORAGE_KEYS.EXPENSES, []);
    const rawMaterialsStructuredData = backupData?.rawMaterialsStructured || carregarDados(STORAGE_KEYS.RAW_MATERIALS, []);
    const productRecipesData = backupData?.productRecipes || carregarDados(STORAGE_KEYS.PRODUCT_RECIPES, []);

    setRevenues(revenuesData);
    setPurchases(purchasesData);
    setExpenses(expensesData);
    setRawMaterialsStructured(rawMaterialsStructuredData);
    setProductRecipes(productRecipesData);
    
    const labelConfigData = backupData?.labelConfig || carregarDados(STORAGE_KEYS.LABEL_CONFIG, {
      format: '50x30', showBarcode: true, showCodeNumber: true, showPrice: true, showDate: true, printMode: 'browser'
    });
    
    const cashierSessionData = backupData?.cashierSession || carregarDados(STORAGE_KEYS.CASHIER_SESSION, {
      id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}
    });

    const selectedPrinterData = backupData?.selectedPrinter || carregarDados(STORAGE_KEYS.SELECTED_PRINTER, 'thermal-01');

    setProducts(productsData);
    setCustomers(customersData);
    setSales(salesData);
    setActivities(activitiesData);
    setCategories(categoriesData);
    setSubcategories(subcategoriesData);
    setDeliveryChannels(deliveryChannelsData);
    setDeliveryMethods(deliveryMethodsData);
    setClosedSessions(closedSessionsData);
    setUsers(usersData);
    
    // Auto-cleanup for inactive users (> 15 days)
    const now = new Date();
    const fifteenDaysInMs = 15 * 24 * 60 * 60 * 1000;
    const finalUsers = usersData.filter((u: SystemUser) => {
      if (!u.isActive && u.deactivatedAt) {
        const deactivationDate = new Date(u.deactivatedAt);
        if (now.getTime() - deactivationDate.getTime() > fifteenDaysInMs) {
          console.log(`[Segurança] Usuário ${u.name} excluído automaticamente por inatividade.`);
          return false;
        }
      }
      return true;
    });
    if (finalUsers.length !== usersData.length) {
      setUsers(finalUsers);
    }

    setRoles(mergedRoles);
    setPaymentMethods(paymentMethodsData);
    setCustomPaymentMethods(customPaymentMethodsData);
    setHiddenPaymentMethods(hiddenPaymentMethodsData);
    setPrinters(printersData);
    setCompany(companyData);
    setCouponConfig(couponConfigData);
    setLabelConfig(labelConfigData);
    setCashierSession(cashierSessionData);
    setSelectedPrinter(selectedPrinterData);

    console.log("CARREGANDO DADOS");
    setIsLoaded(true);
  };

  initData();
}, []);

useEffect(() => {
  if (!isLoaded) return;

  const saveAll = async () => {
    console.log("SALVANDO DADOS");
    
    // Salva no LocalStorage
    salvarDados(STORAGE_KEYS.PRODUCTS, products);
    salvarDados(STORAGE_KEYS.CUSTOMERS, customers);
    salvarDados(STORAGE_KEYS.SALES, sales);
    salvarDados(STORAGE_KEYS.ACTIVITIES, activities);
    salvarDados(STORAGE_KEYS.CATEGORIES, categories);
    salvarDados(STORAGE_KEYS.SUBCATEGORIES, subcategories);
    salvarDados(STORAGE_KEYS.DELIVERY_CHANNELS, deliveryChannels);
    salvarDados(STORAGE_KEYS.DELIVERY_METHODS, deliveryMethods);
    salvarDados(STORAGE_KEYS.CLOSED_SESSIONS, closedSessions);
    salvarDados(STORAGE_KEYS.USERS, users);
    salvarDados(STORAGE_KEYS.ROLES, roles);
    salvarDados(STORAGE_KEYS.PAYMENT_METHODS, paymentMethods);
    salvarDados(STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, customPaymentMethods);
    salvarDados(STORAGE_KEYS.HIDDEN_PAYMENT_METHODS, hiddenPaymentMethods);
    salvarDados(STORAGE_KEYS.PRINTERS, printers);
    salvarDados(STORAGE_KEYS.COMPANY_INFO, company);
    salvarDados(STORAGE_KEYS.COUPON_CONFIG, couponConfig);
    salvarDados(STORAGE_KEYS.LABEL_CONFIG, labelConfig);
    salvarDados(STORAGE_KEYS.CASHIER_SESSION, cashierSession);
    salvarDados(STORAGE_KEYS.SELECTED_PRINTER, selectedPrinter);
    salvarDados(STORAGE_KEYS.REVENUES, revenues);
    salvarDados(STORAGE_KEYS.PURCHASES, purchases);
    salvarDados(STORAGE_KEYS.EXPENSES, expenses);
    salvarDados(STORAGE_KEYS.RAW_MATERIALS, rawMaterialsStructured);
    salvarDados(STORAGE_KEYS.PRODUCT_RECIPES, productRecipes);

    // Salva Backup em Arquivo (Electron)
    const backupObj = {
      products, customers, sales, activities, categories, subcategories,
      delivery_channels: deliveryChannels, 
      delivery_methods: deliveryMethods,
      closed_sessions: closedSessions,
      users, roles, paymentMethods,
      customPaymentMethods, hiddenPaymentMethods, printers, company, couponConfig, labelConfig,
      cashierSession, selectedPrinter,
      revenues, purchases, expenses, rawMaterialsStructured, productRecipes
    };
    await salvarBackupArquivo(backupObj);
  };

  saveAll();
}, [
  isLoaded, products, customers, sales, activities, categories, subcategories, 
  deliveryChannels, deliveryMethods, closedSessions, users, roles, paymentMethods, customPaymentMethods, hiddenPaymentMethods,
  printers, company, couponConfig, labelConfig, cashierSession, selectedPrinter,
  revenues, purchases, expenses, rawMaterialsStructured, productRecipes
]);

  const calculateProductCost = (productId: string) => {
    const recipe = productRecipes.find(r => r.productId === productId);
    if (!recipe) {
      const product = products.find(p => p.id === productId);
      return product?.costPrice || 0;
    }

    return recipe.ingredients.reduce((total, ing) => {
      const material = rawMaterialsStructured.find(m => m.id === ing.rawMaterialId);
      if (!material) return total;
      return total + (ing.quantity * material.unitCost);
    }, 0);
  };

  const createRevenueForSale = (sale: Sale) => {
    const newRevenue: Revenue = {
      id: crypto.randomUUID(),
      saleId: sale.id,
      amount: sale.total,
      status: 'pendente',
      date: new Date().toISOString()
    };
    setRevenues(prev => [...prev, newRevenue]);
  };

  const addSaleToCashier = (sale: Sale) => {
    if (cashierSession.isOpen) {
      setCashierSession(prev => ({
        ...prev,
        totalSales: prev.totalSales + sale.total,
        salesCount: prev.salesCount + 1,
        salesByMethod: {
          ...prev.salesByMethod,
          [sale.paymentMethod]: (prev.salesByMethod[sale.paymentMethod] || 0) + sale.total
        }
      }));
    }
  };

  const addCancellationToCashier = (amount: number) => {
    if (cashierSession.isOpen) {
      setCashierSession(prev => ({
        ...prev,
        totalCanceled: prev.totalCanceled + amount,
        canceledCount: prev.canceledCount + 1
      }));
    }
  };

  const handleLogin = () => {
    if (loginUsername.toUpperCase() === 'ADM' && loginPassword === '1234') {
      const adminUser: SystemUser = {
        id: 'admin',
        username: 'ADM',
        name: 'Administrador',
        roleId: 'role-gerente'
      };
      setCurrentUser(adminUser);
      setIsLogged(true);
      return;
    }

    const user = users.find(u => u.username.toUpperCase() === loginUsername.toUpperCase() && u.password === loginPassword);
    if (user) {
      setCurrentUser(user);
      setIsLogged(true);
      addActivity('auth', 'Login Realizado', `O usuário ${user.name} acessou o sistema.`);
    } else {
      alert('Credenciais Incorretas!');
    }
  };

  const handleLogout = () => {
    if (currentUser) {
      addActivity('auth', 'Logout Realizado', `O usuário ${currentUser.name} saiu do sistema.`);
    }
    setIsLogged(false);
    setCurrentUser(null);
    setLoginUsername('');
    setLoginPassword('');
    setView('dashboard');
  };

  const getUserPermissions = () => {
    if (!currentUser) return DEFAULT_PERMISSIONS;
    const role = roles.find(r => r.id === currentUser.roleId);
    return role ? role.permissions : DEFAULT_PERMISSIONS;
  };

  const canAccess = (module: keyof ModulePermissions) => {
    return getUserPermissions()[module] !== 'nenhum';
  };

  const canEdit = (module: keyof ModulePermissions) => {
    return getUserPermissions()[module] === 'total';
  };

  // Dashboard Menu Items
  const menuItems = [
    { id: 'pos', icon: ShoppingBag, label: 'PDV / VENDAS', color: 'bg-[#5d5dff] text-white shadow-lg shadow-blue-100', module: 'pdv' },
    { id: 'summary', icon: LayoutDashboard, label: 'DASHBOARD', color: 'bg-indigo-100 text-indigo-600', module: 'dashboard' },
    { id: 'sales-history', icon: History, label: 'HISTÓRICO', color: 'bg-indigo-100 text-indigo-600', module: 'historico' },
    { id: 'payments', icon: CreditCard, label: 'PAGAMENTOS', color: 'bg-teal-100 text-teal-600', module: 'financeiro' },
    { id: 'add-product', icon: Package, label: 'ESTOQUE', color: 'bg-emerald-100 text-white shadow-lg shadow-emerald-50', module: 'estoque' },
    { id: 'add-customer', icon: UserPlus, label: '+ CLIENTE', color: 'bg-indigo-100 text-indigo-600', module: 'pdv' },
    { id: 'delivery', icon: Truck, label: '+ ENTREGA', color: 'bg-emerald-100 text-emerald-600', module: 'pdv' },
    { id: 'cashier', icon: Calculator, label: cashierSession.isOpen ? 'FECHAR CAIXA' : 'ABRIR CAIXA', color: cashierSession.isOpen ? 'bg-red-100 text-red-600' : 'bg-sky-100 text-sky-600', module: 'pdv' },
    { id: 'historico_caixa', icon: History, label: 'HISTÓRICO CAIXA', color: 'bg-amber-100 text-amber-600', module: 'ajustes' },
  ].filter(item => {
    // Hidden condition for Admin only
    if (item.id === 'historico_caixa') {
      const isAdmin = currentUser?.roleId === 'admin';
      return isAdmin;
    }
    return canAccess(item.module as keyof ModulePermissions);
  });

  const adjustItem = { id: 'adjust', icon: Store, label: 'AJUSTE', color: 'bg-orange-100 text-orange-600', module: 'ajustes' };
  const financeItem = { id: 'finance', icon: BadgeDollarSign, label: 'FINANCEIRO', color: 'bg-green-100 text-green-600', module: 'financeiro' };
  const separationItem = { id: 'separation', icon: Handshake, label: 'SEPARAÇÃO', color: 'bg-orange-100 text-orange-600', module: 'separacao' };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 min-h-screen flex flex-col items-center relative">
      
      {!isLogged ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-gray-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white p-10 rounded-[3rem] shadow-2xl border border-gray-100 max-w-sm w-full space-y-8 flex flex-col items-center">
             <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 shadow-inner">
                <ShieldCheck size={42} />
             </div>
             <div className="text-center space-y-1">
                <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter">Acesso Restrito</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Insira as Credenciais</p>
             </div>
             <div className="w-full space-y-4">
                <Input label="USUÁRIO" value={loginUsername} onChange={setLoginUsername} placeholder="ADM" />
                <Input label="Senha" value={loginPassword} onChange={setLoginPassword} type="password" placeholder="****" onKeyDown={(e: any) => e.key === 'Enter' && handleLogin()} />
                <button 
                  onClick={handleLogin}
                  className="w-full bg-[#5d5dff] text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95"
                >
                  Entrar no Sistema
                </button>
             </div>
             <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest pt-4">Padrão: ADM / 1234</p>
          </motion.div>
        </div>
      ) : null}

      {/* Top Corner Menus - Only in Dashboard */}
      {view === 'dashboard' && isLogged && (
        <div className="fixed top-6 left-6 z-20 flex flex-col gap-4">
          {canAccess('ajustes') && (
            <button
              onClick={() => setView('adjust')}
              className="flex flex-col items-center group transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all group-hover:shadow-md group-active:scale-95 ${adjustItem.color}`}>
                <adjustItem.icon size={24} />
              </div>
              <span className="text-[8px] font-black tracking-widest text-gray-400 group-hover:text-orange-500 transition-colors uppercase">
                {adjustItem.label}
              </span>
            </button>
          )}

          {canAccess('financeiro') && (
            <button
              onClick={() => setView('finance')}
              className="flex flex-col items-center group transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all group-hover:shadow-md group-active:scale-95 ${financeItem.color}`}>
                <financeItem.icon size={24} />
              </div>
              <span className="text-[8px] font-black tracking-widest text-gray-400 group-hover:text-green-600 transition-colors uppercase">
                {financeItem.label}
              </span>
            </button>
          )}
        </div>
      )}

      {view === 'dashboard' && isLogged && (
        <div className="fixed top-6 right-6 z-20 flex flex-col items-end gap-4">
          {canAccess('separacao') && (
            <button
              onClick={() => setView('separation')}
              className="flex flex-col items-center group transition-all"
            >
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all group-hover:shadow-md group-active:scale-95 ${separationItem.color}`}>
                <separationItem.icon size={24} />
              </div>
              <span className="text-[8px] font-black tracking-widest text-gray-400 group-hover:text-orange-600 transition-colors uppercase">
                {separationItem.label}
              </span>
            </button>
          )}

          <button
            onClick={handleLogout}
            className="flex flex-col items-center group transition-all"
          >
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-1 shadow-sm transition-all group-hover:shadow-md group-active:scale-95 bg-gray-100 text-gray-400 group-hover:bg-red-50 group-hover:text-red-500">
              <Zap size={24} />
            </div>
            <span className="text-[8px] font-black tracking-widest text-gray-400 group-hover:text-red-500 transition-colors uppercase">
              Sair
            </span>
          </button>
        </div>
      )}

      {/* Logo Section */}
      {view === 'dashboard' && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16 space-y-2 flex flex-col items-center"
        >
          {company.logo ? (
            <div className="relative inline-block mb-4">
              <img 
                src={company.logo} 
                alt="Logo" 
                className="max-h-32 w-auto mx-auto object-contain" 
              />
            </div>
          ) : null}
          <h2 className="text-2xl font-bold font-display tracking-tight text-gray-800 uppercase">
            {company.name}
          </h2>
          <p className="text-[10px] font-bold tracking-[0.3em] text-[#5d5dff] uppercase">
            {company.slogan}
          </p>
        </motion.div>
      )}

      {/* Main Content Area */}
      <AnimatePresence mode="wait">
        {view === 'dashboard' ? (
          <motion.div 
            key="dashboard"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="grid grid-cols-3 md:grid-cols-6 gap-x-6 gap-y-12 w-full px-4"
          >
            {menuItems.map((item) => (
              <button
                id={`menu-${item.id}`}
                key={item.id}
                onClick={() => setView(item.id as View)}
                className="flex flex-col items-center group cursor-pointer transition-transform duration-200"
              >
                <div className={`w-20 h-20 md:w-24 md:h-24 rounded-full flex items-center justify-center mb-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all group-hover:shadow-lg group-hover:-translate-y-1 group-active:scale-95 ${item.color}`}>
                  <item.icon size={36} />
                </div>
                <span className="text-[11px] font-extrabold tracking-[0.1em] text-gray-500 group-hover:text-[#5d5dff] transition-colors text-center leading-tight">
                  {item.label}
                </span>
              </button>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="sub-view"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="w-full bg-white rounded-3xl shadow-xl overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <button 
                onClick={() => setView('dashboard')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ChevronLeft size={24} />
              </button>
              <h3 className="text-lg font-bold uppercase tracking-widest text-gray-500">
                {menuItems.find(m => m.id === view)?.label}
              </h3>
              <div className="w-10"></div>
            </div>

            <div className="p-6 min-h-[400px]">
              {view === 'add-product' && (
                <ProductView 
                  products={products} 
                  setProducts={setProducts} 
                  setView={setView} 
                  categories={categories}
                  setCategories={setCategories}
                  subcategories={subcategories}
                  setSubcategories={setSubcategories}
                  addActivity={addActivity}
                  labelConfig={labelConfig}
                  imprimirEtiqueta={imprimirEtiqueta}
                  calculateProductCost={calculateProductCost}
                />
              )}
              {view === 'movement' && (
                <ActivityView 
                  activities={activities}
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                  onCancelSale={(saleId) => {
                    const sale = sales.find(s => s.id === saleId);
                    if (sale && confirm('Deseja realmente CANCELAR esta venda? Esta ação não pode ser desfeita.')) {
                      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'cancelado' } : s));
                      addCancellationToCashier(sale.total);
                      addActivity('sale', 'Venda Cancelada', `Venda #${sale.sequentialId || sale.id.substring(0, 8)} de R$ ${sale.total.toFixed(2)} foi cancelada.`);
                    }
                  }}
                />
              )}
              {view === 'sales-history' && (
                <ActivityView 
                  activities={activities}
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                  onCancelSale={(saleId) => {
                    const sale = sales.find(s => s.id === saleId);
                    if (sale && confirm('Deseja realmente CANCELAR esta venda?')) {
                      setSales(prev => prev.map(s => s.id === saleId ? { ...s, status: 'cancelado' } : s));
                      addCancellationToCashier(sale.total);
                      addActivity('sale', 'Venda Cancelada', `Venda #${sale.sequentialId || sale.id.substring(0, 8)} de R$ ${sale.total.toFixed(2)} foi cancelada.`);
                    }
                  }}
                />
              )}
              {view === 'pos' && (
                <POSView 
                  sales={sales}
                  products={products} 
                  setSales={setSales} 
                  setProducts={setProducts} 
                  paymentMethods={paymentMethods} 
                  addActivity={addActivity}
                  cashierSession={cashierSession}
                  addSaleToCashier={addSaleToCashier}
                  customers={customers}
                  setCustomers={setCustomers}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  company={company}
                  couponConfig={couponConfig}
                  setView={setView}
                  imprimirCupom={imprimirCupom}
                  calculateProductCost={calculateProductCost}
                  createRevenueForSale={createRevenueForSale}
                  goldCustomerIds={goldCustomerIds}
                />
              )}
              {view === 'separation' && (
                <SeparationView 
                  sales={sales}
                  setSales={setSales}
                  products={products}
                  setProducts={setProducts}
                  addActivity={addActivity}
                  customers={customers}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  revenues={revenues}
                  setRevenues={setRevenues}
                />
              )}
              {view === 'finance' && (
                <FinanceView 
                  revenues={revenues}
                  setRevenues={setRevenues}
                  purchases={purchases}
                  setPurchases={setPurchases}
                  expenses={expenses}
                  setExpenses={setExpenses}
                  rawMaterials={rawMaterialsStructured}
                  setRawMaterials={setRawMaterialsStructured}
                  productRecipes={productRecipes}
                  setProductRecipes={setProductRecipes}
                  products={products}
                  addActivity={addActivity}
                  setView={setView}
                />
              )}
              {view === 'delivery' && (
                <DeliveryView 
                  sales={sales}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  products={products}
                  customers={customers}
                  company={company}
                  couponConfig={couponConfig}
                  addActivity={addActivity}
                  setSales={setSales}
                  imprimirCupom={imprimirCupom}
                />
              )}
              {view === 'cashier' && (
                <CashierView 
                  cashierSession={cashierSession}
                  setCashierSession={setCashierSession}
                  sales={sales}
                  closedSessions={closedSessions}
                  setClosedSessions={setClosedSessions}
                  addActivity={addActivity}
                  users={users}
                  couponConfig={couponConfig}
                  imprimirCupom={imprimirCupom}
                />
              )}
              {view === 'historico_caixa' && (
                <CashierHistoryView 
                  closedSessions={closedSessions}
                  imprimirCupom={imprimirCupom}
                  couponConfig={couponConfig}
                />
              )}
              {view === 'summary' && (
                <DashboardView 
                  sales={sales} 
                  products={products} 
                  customers={customers}
                  expenses={expenses}
                  purchases={purchases}
                  revenues={revenues}
                  paymentMethods={paymentMethods} 
                  goldCustomerIds={goldCustomerIds}
                  onGoToProduct={(productId) => {
                    setView('add-product');
                    setTimeout(() => {
                      const element = document.getElementById(`product-${productId}`);
                      if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('ring-4', 'ring-blue-400', 'ring-offset-2');
                        setTimeout(() => element.classList.remove('ring-4', 'ring-blue-400', 'ring-offset-2'), 3000);
                      }
                    }, 500);
                  }}
                />
              )}
              {view === 'add-customer' && (
                <CustomerView 
                  customers={customers} 
                  setCustomers={setCustomers} 
                  addActivity={addActivity} 
                  sales={sales}
                  imprimirCupom={imprimirCupom}
                  company={company}
                  couponConfig={couponConfig}
                  products={products}
                  goldCustomerIds={goldCustomerIds}
                />
              )}
              {view === 'payments' && (
                <PaymentsView 
                  paymentMethods={paymentMethods} 
                  setPaymentMethods={setPaymentMethods} 
                  customPaymentMethods={customPaymentMethods} 
                  setCustomPaymentMethods={setCustomPaymentMethods} 
                  hiddenPaymentMethods={hiddenPaymentMethods}
                  setHiddenPaymentMethods={setHiddenPaymentMethods}
                  sales={sales} 
                  addActivity={addActivity}
                />
              )}
              {view === 'adjust' && (
                <SettingsView 
                  currentUser={currentUser}
                  addActivity={addActivity}
                  company={company} 
                  setCompany={setCompany} 
                  couponConfig={couponConfig}
                  setCouponConfig={setCouponConfig}
                  users={users}
                  setUsers={setUsers}
                  roles={roles}
                  setRoles={setRoles}
                  labelConfig={labelConfig}
                  setLabelConfig={setLabelConfig}
                  onBack={() => setView('dashboard')} 
                  setView={setView}
                  printers={printers}
                  setPrinters={setPrinters}
                  selectedPrinter={selectedPrinter}
                  setSelectedPrinter={setSelectedPrinter}
                  products={products}
                  customers={customers}
                  sales={sales}
                  activities={activities}
                  categories={categories}
                  subcategories={subcategories}
                  deliveryChannels={deliveryChannels}
                  deliveryMethods={deliveryMethods}
                  setDeliveryMethods={setDeliveryMethods}
                  paymentMethods={paymentMethods}
                  customPaymentMethods={customPaymentMethods}
                  cashierSession={cashierSession}
                  revenues={revenues}
                  purchases={purchases}
                  expenses={expenses}
                  rawMaterials={[]}
                  rawMaterialsStructured={rawMaterialsStructured}
                  productRecipes={productRecipes}
                />
              )}
              {view === 'results' && (
                <ResultsView 
                  sales={sales}
                  products={products}
                  customers={customers}
                  cashierSession={cashierSession}
                />
              )}
              {/* Other views as placeholders for now */}
              {!['add-product', 'add-customer', 'cashier', 'summary', 'adjust', 'payments', 'pos', 'sales-history', 'delivery', 'movement', 'separation', 'results'].includes(view) && (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 py-20">
                  <Package size={64} className="mb-4 opacity-20" />
                  <p className="font-medium italic">Funcionalidade em desenvolvimento...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Sub Components ---

function ActivityView({ 
  activities,
  sales,
  products,
  customers,
  company,
  couponConfig,
  imprimirCupom,
  onCancelSale
}: { 
  activities: Activity[],
  sales: Sale[],
  products: Product[],
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  imprimirCupom: (sale: Sale) => Promise<boolean>,
  onCancelSale: (id: string) => void
}) {
  const [activeTab, setActiveTab] = useState<'all' | 'modifications' | 'vendas'>('all');
  const [userFilter, setUserFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos' | Activity['type']>('todos');
  const [dateFilter, setDateFilter] = useState('');

  const filteredActivities = useMemo(() => {
    let list = [...activities];

    if (activeTab === 'modifications') {
      list = list.filter(a => a.type === 'product_edit');
    }

    if (userFilter) {
      list = list.filter(a => a.user.toLowerCase().includes(userFilter.toLowerCase()));
    }

    if (typeFilter !== 'todos') {
      list = list.filter(a => a.type === typeFilter);
    }

    if (dateFilter) {
      const [year, month, day] = dateFilter.split('-').map(Number);
      list = list.filter(a => {
        const cleanTimestamp = a.timestamp.replace(',', '');
        const [datePart] = cleanTimestamp.split(' ');
        const [d, m, y] = datePart.split('/').map(Number);
        return d === day && m === month && y === year;
      });
    }

    return list;
  }, [activities, activeTab, userFilter, typeFilter, dateFilter]);

  const getActivityTypeLabel = (type: Activity['type']) => {
    switch (type) {
      case 'customer': return 'Cliente';
      case 'product': return 'Produto';
      case 'product_edit': return 'Edição';
      case 'sale': return 'Venda';
      case 'auth': return 'Acesso';
      case 'security': return 'Segurança';
      case 'system': return 'Sistema';
      default: return 'Geral';
    }
  };

  const getActivityTypeColor = (type: Activity['type']) => {
    switch (type) {
      case 'customer': return 'bg-indigo-50 text-indigo-500';
      case 'product': return 'bg-amber-50 text-amber-500';
      case 'product_edit': return 'bg-purple-50 text-purple-500';
      case 'sale': return 'bg-green-50 text-green-500';
      case 'auth': return 'bg-blue-50 text-blue-500';
      case 'security': return 'bg-red-50 text-red-500';
      default: return 'bg-gray-100 text-gray-500';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex gap-4 border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('all')}
            className={`pb-4 px-6 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'all' ? 'text-[#5d5dff] border-b-2 border-[#5d5dff]' : 'text-gray-400'
            }`}
          >
            Log De Ações
          </button>
          <button 
            onClick={() => setActiveTab('vendas')}
            className={`pb-4 px-6 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'vendas' ? 'text-[#5d5dff] border-b-2 border-[#5d5dff]' : 'text-gray-400'
            }`}
          >
            Vendas (Histórico)
          </button>
          <button 
            onClick={() => setActiveTab('modifications')}
            className={`pb-4 px-6 text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'modifications' ? 'text-[#5d5dff] border-b-2 border-[#5d5dff]' : 'text-gray-400'
            }`}
          >
            Alterações
          </button>
        </div>

        {activeTab !== 'vendas' && (
          <div className="flex flex-wrap gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Data</label>
              <input 
                type="date"
                value={dateFilter}
                onChange={e => setDateFilter(e.target.value)}
                className="p-2 border border-gray-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo</label>
              <select
                value={typeFilter}
                onChange={e => setTypeFilter(e.target.value as any)}
                className="p-2 border border-gray-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-400 bg-white"
              >
                <option value="todos">Todos</option>
                <option value="sale">Vendas</option>
                <option value="product">Produtos</option>
                <option value="customer">Clientes</option>
                <option value="auth">Acesso</option>
                <option value="security">Segurança</option>
                <option value="system">Sistema</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Usuário</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input 
                  placeholder="BUSCAR USUÁRIO..."
                  value={userFilter}
                  onChange={e => setUserFilter(e.target.value)}
                  className="pl-9 p-2 border border-gray-100 rounded-xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                />
              </div>
            </div>
            { (dateFilter || userFilter || typeFilter !== 'todos') && (
              <button 
                onClick={() => { setDateFilter(''); setUserFilter(''); setTypeFilter('todos'); }}
                className="self-end p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                title="Limpar Filtros"
              >
                <X size={16} />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        {activeTab === 'vendas' ? (
          <SalesHistoryView 
            sales={sales}
            products={products}
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            imprimirCupom={imprimirCupom}
            onCancel={onCancelSale}
          />
        ) : (
          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto overflow-y-auto max-h-[600px] no-scrollbar">
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10">
                  <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Data/Hora</th>
                    <th className="px-6 py-4">Usuário</th>
                    <th className="px-6 py-4">Função</th>
                    <th className="px-6 py-4">Ação</th>
                    <th className="px-6 py-4">Detalhes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredActivities.length > 0 ? (
                    filteredActivities.map((activity) => (
                      <tr key={activity.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-xs font-bold text-gray-700">{activity.timestamp}</p>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-[10px]">
                              {activity.user.charAt(0)}
                            </div>
                            <p className="text-xs font-black text-gray-800 uppercase">{activity.user}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-2 py-0.5 rounded-full">
                            {activity.userRole || 'SISTEMA'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1">
                            <span className={`w-fit text-[8px] font-black uppercase px-2 py-0.5 rounded-lg ${getActivityTypeColor(activity.type)}`}>
                              {getActivityTypeLabel(activity.type)}
                            </span>
                            <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">
                              {activity.action}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {activity.type === 'product_edit' ? (
                            <div className="flex flex-col gap-1">
                              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                                Campo: {activity.field}
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-red-500 line-through opacity-50">{activity.oldValue}</span>
                                <ChevronRight size={10} className="text-gray-300" />
                                <span className="text-xs font-bold text-emerald-500">{activity.newValue}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-xs font-medium text-gray-500 max-w-sm">{activity.details}</p>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-20 text-center">
                        <History size={40} className="mx-auto text-gray-100 mb-4" />
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Nenhuma atividade registrada</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SettingsView({ 
  currentUser,
  addActivity,
  company, 
  setCompany, 
  couponConfig, 
  setCouponConfig, 
  users, 
  setUsers, 
  roles,
  setRoles,
  labelConfig,
  setLabelConfig,
  onBack,
  setView,
  printers,
  setPrinters,
  selectedPrinter,
  setSelectedPrinter,
  products,
  customers,
  sales,
  activities,
  categories,
  subcategories,
  deliveryChannels,
  deliveryMethods,
  setDeliveryMethods,
  paymentMethods,
  customPaymentMethods,
  cashierSession,
  revenues,
  purchases,
  expenses,
  rawMaterials,
  rawMaterialsStructured,
  productRecipes
}: { 
  currentUser: SystemUser | null,
  addActivity: (type: Activity['type'], action: string, details: string) => void,
  company: CompanyInfo, 
  setCompany: any, 
  couponConfig: CouponConfig, 
  setCouponConfig: any, 
  users: SystemUser[], 
  setUsers: any, 
  roles: Role[],
  setRoles: any,
  labelConfig: LabelConfig,
  setLabelConfig: any,
  onBack: () => void,
  setView: any,
  printers: PrinterConfig[],
  setPrinters: any,
  selectedPrinter: string,
  setSelectedPrinter: any,
  products: Product[],
  customers: Customer[],
  sales: Sale[],
  activities: Activity[],
  categories: Category[],
  subcategories: Subcategory[],
  deliveryChannels: DeliveryChannel[],
  deliveryMethods: DeliveryMethod[],
  setDeliveryMethods: any,
  paymentMethods: string[],
  customPaymentMethods: string[],
  cashierSession: CashierSession,
  revenues: Revenue[],
  purchases: Purchase[],
  expenses: Expense[],
  rawMaterials: RawMaterial[],
  rawMaterialsStructured: RawMaterial[],
  productRecipes: ProductRecipe[]
}) {
  const [activeTab, setActiveTab] = useState('empresa');
  const [localCompany, setLocalCompany] = useState<CompanyInfo>(company);
  const [localCoupon, setLocalCoupon] = useState<CouponConfig>(couponConfig);
  const [simulatedCustomer, setSimulatedCustomer] = useState<Customer | null>(null);
  const [localRoles, setLocalRoles] = useState<Role[]>(roles);
  const [localLabel, setLocalLabel] = useState<LabelConfig>(labelConfig);
  
  // User Management Extension States
  const [userTab, setUserTab] = useState<'ativos' | 'inativos'>('ativos');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingUser, setResettingUser] = useState<SystemUser | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivatingUser, setDeactivatingUser] = useState<SystemUser | null>(null);

  const [newUser, setNewUser] = useState({ name: '', username: '', password: '', roleId: '' });
  const [newRole, setNewRole] = useState({ name: '' });
  const [isEditingRole, setIsEditingRole] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isFetchingCEP, setIsFetchingCEP] = useState(false);
  
  const [localBackups, setLocalBackups] = useState<LocalBackup[]>(() => carregarDados(STORAGE_KEYS.LOCAL_BACKUPS, []));

  useEffect(() => {
    const lastBackupDate = carregarDados(STORAGE_KEYS.LAST_AUTO_BACKUP, '');
    const today = new Date().toISOString().split('T')[0];

    if (lastBackupDate !== today) {
      const dataToBackup = {
        products, customers, sales, activities, categories, subcategories,
        delivery_channels: deliveryChannels, users, roles, paymentMethods,
        customPaymentMethods, printers, company, couponConfig, labelConfig,
        cashierSession, selectedPrinter, revenues, purchases, expenses,
        rawMaterials, productRecipes
      };

      const newBackup: LocalBackup = {
        id: Date.now().toString() + Math.random().toString(36).substring(2),
        date: new Date().toISOString(),
        data: dataToBackup,
        size: JSON.stringify(dataToBackup).length
      };

      setLocalBackups(prev => {
        const updated = [newBackup, ...prev].slice(0, 10);
        salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updated);
        return updated;
      });
      salvarDados(STORAGE_KEYS.LAST_AUTO_BACKUP, today);
      console.log('[Backup] Backup automático realizado.');
    }
  }, []);
  
  const handleRestoreFromData = (imported: any) => {
    try {
      salvarDados(STORAGE_KEYS.PRODUCTS, imported.products || []);
      salvarDados(STORAGE_KEYS.CUSTOMERS, imported.customers || []);
      salvarDados(STORAGE_KEYS.SALES, imported.sales || []);
      salvarDados(STORAGE_KEYS.ACTIVITIES, imported.activities || []);
      salvarDados(STORAGE_KEYS.CATEGORIES, imported.categories || []);
      salvarDados(STORAGE_KEYS.SUBCATEGORIES, imported.subcategories || []);
      salvarDados(STORAGE_KEYS.DELIVERY_CHANNELS, imported.delivery_channels || []);
      salvarDados(STORAGE_KEYS.USERS, imported.users || []);
      salvarDados(STORAGE_KEYS.ROLES, imported.roles || []);
      salvarDados(STORAGE_KEYS.PAYMENT_METHODS, imported.paymentMethods || []);
      salvarDados(STORAGE_KEYS.CUSTOM_PAYMENT_METHODS, imported.customPaymentMethods || []);
      salvarDados(STORAGE_KEYS.PRINTERS, imported.printers || []);
      salvarDados(STORAGE_KEYS.COMPANY_INFO, imported.company || {});
      salvarDados(STORAGE_KEYS.COUPON_CONFIG, imported.couponConfig || {});
      salvarDados(STORAGE_KEYS.LABEL_CONFIG, imported.labelConfig || {});
      salvarDados(STORAGE_KEYS.CASHIER_SESSION, imported.cashierSession || {});
      salvarDados(STORAGE_KEYS.SELECTED_PRINTER, imported.selectedPrinter || 'thermal-01');
      salvarDados(STORAGE_KEYS.REVENUES, imported.revenues || []);
      salvarDados(STORAGE_KEYS.PURCHASES, imported.purchases || []);
      salvarDados(STORAGE_KEYS.EXPENSES, imported.expenses || []);
      salvarDados(STORAGE_KEYS.RAW_MATERIALS, imported.rawMaterialsStructured || imported.rawMaterials || []);
      salvarDados(STORAGE_KEYS.PRODUCT_RECIPES, imported.productRecipes || []);
      
      alert('Dados restaurados com sucesso! O sistema será reiniciado.');
      window.location.reload();
    } catch (err: any) {
      alert('Erro ao restaurar dados: ' + err.message);
    }
  };

  const handleCreateManualBackup = () => {
    if(confirm('Isso criará um novo ponto de restauração local agora. Continuar?')) {
      try {
        const dataToBackup = {
          products, customers, sales, activities, categories, subcategories,
          delivery_channels: deliveryChannels, users, roles, paymentMethods,
          customPaymentMethods, printers, company, couponConfig, labelConfig,
          cashierSession, selectedPrinter, revenues, purchases, expenses,
          rawMaterialsStructured, productRecipes
        };
        const newBackup: LocalBackup = {
          id: Date.now().toString() + Math.random().toString(36).substring(2),
          date: new Date().toISOString(),
          data: dataToBackup,
          size: JSON.stringify(dataToBackup).length
        };
        
        setLocalBackups(prev => {
          const updated = [newBackup, ...prev].slice(0, 10);
          salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updated);
          return updated;
        });
        alert('Ponto de restauração criado com sucesso!');
      } catch (err: any) {
        alert('Erro ao criar backup local: ' + err.message);
      }
    }
  };

  const handleDeleteBackup = (id: string) => {
    if(confirm('Deseja excluir permanentemente este ponto de restauração?')) {
      setLocalBackups(prev => {
        const updated = prev.filter(b => b.id !== id);
        salvarDados(STORAGE_KEYS.LOCAL_BACKUPS, updated);
        return updated;
      });
    }
  };

  const [newPrinter, setNewPrinter] = useState<{ name: string; type: 'thermal' | 'desktop' }>({
    name: '',
    type: 'thermal'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const couponRef = useRef<HTMLDivElement>(null);

  const handleSave = () => {
    if (localCompany.email && !validateEmail(localCompany.email)) {
      alert('E-mail inválido!');
      return;
    }
    setCompany(localCompany);
    setCouponConfig(localCoupon);
    setRoles(localRoles);
    setLabelConfig(localLabel);
    
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      setView('dashboard');
    }, 2000);
  };

  const addPrinter = () => {
    if (!newPrinter.name) return;
    const printer: PrinterConfig = {
      id: crypto.randomUUID(),
      name: newPrinter.name,
      type: newPrinter.type,
      connection: 'usb'
    };
    setPrinters([...printers, printer]);
    setNewPrinter({ name: '', type: 'thermal' });
  };

  const handleCancel = () => {
    onBack();
  };

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLocalCompany({ ...localCompany, logo: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const addUser = () => {
    if (!newUser.username || !newUser.name) return;
    const user: SystemUser = {
      id: crypto.randomUUID(),
      username: newUser.username,
      name: newUser.name,
      password: newUser.password,
      roleId: newUser.roleId,
      isActive: true
    };
    setUsers([...users, user]);
    addActivity('security', 'Cadastro de Usuário', `Novo usuário ${user.name} (@${user.username}) cadastrado.`);
    setNewUser({ name: '', username: '', password: '', roleId: '' });
  };

  const addRole = () => {
    if (!newRole.name) return;
    const role: Role = {
      id: crypto.randomUUID(),
      name: newRole.name,
      permissions: { ...DEFAULT_PERMISSIONS }
    };
    setLocalRoles([...localRoles, role]);
    setNewRole({ name: '' });
  };

  const setPermissionLevel = (roleId: string, module: keyof ModulePermissions, level: AccessLevel) => {
    const role = localRoles.find(r => r.id === roleId);
    setLocalRoles(localRoles.map(r => r.id === roleId ? {
      ...r,
      permissions: { ...r.permissions, [module]: level }
    } : r));
    if (role) {
      addActivity('security', 'Alteração de Permissões', `Permissão do módulo "${module}" alterada para ${level} na função ${role.name}.`);
    }
  };

  const handleCEPChange = async (cep: string) => {
    const masked = maskCEP(cep);
    setLocalCompany(prev => ({ ...prev, address: { ...prev.address, cep: masked } }));

    if (masked.length === 9) {
      const cleanCEP = masked.replace(/\D/g, '');
      setIsFetchingCEP(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        
        if (data.erro) {
          alert('CEP não encontrado!');
        } else {
          setLocalCompany(prev => ({
            ...prev,
            address: {
              ...prev.address,
              logradouro: data.logradouro || prev.address.logradouro,
              bairro: data.bairro || prev.address.bairro,
              cidade: data.localidade || prev.address.cidade,
              estado: data.uf || prev.address.estado
            }
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
        alert('Erro ao buscar CEP. Verifique sua conexão.');
      } finally {
        setIsFetchingCEP(false);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-4 border-b border-gray-100 pb-4 overflow-x-auto">
        {[
          { id: 'empresa', label: 'Empresa' },
          { id: 'cupons', label: 'Cupom' },
          { id: 'etiquetas', label: 'Etiquetas' },
          { id: 'entrega', label: 'Entrega' },
          { id: 'impressao', label: 'Impressão' },
          { id: 'seguranca', label: 'Segurança' },
          { id: 'backup', label: 'Backup' }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-2 px-4 text-xs font-black tracking-widest uppercase transition-all whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'empresa' && (
          <div className="space-y-8">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleLogoUpload} 
              className="hidden" 
              accept="image/*"
            />
            
            {/* Header: Logo */}
            <div className="flex flex-col items-center">
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="w-32 h-32 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 group hover:border-blue-300 transition-all cursor-pointer overflow-hidden relative"
              >
                 {localCompany.logo ? (
                   <>
                     <img src={localCompany.logo} alt="Logo" className="w-full h-full object-contain p-2" />
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <RefreshCw className="text-white animate-spin-slow" size={24} />
                     </div>
                   </>
                 ) : (
                   <Store size={40} className="text-gray-300 group-hover:text-blue-400" />
                 )}
              </div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-3">Logo da Empresa</p>
            </div>

            {/* Section: Dados da Empresa */}
            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                  <Store size={16} />
                </div>
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Dados da Empresa</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  label="RAZÃO SOCIAL / NOME" 
                  value={localCompany.name} 
                  onChange={v => setLocalCompany({...localCompany, name: v})} 
                  placeholder="Nome oficial da empresa"
                />
                <Input 
                  label="NOME FANTASIA (OPCIONAL)" 
                  value={localCompany.tradeName || ''} 
                  onChange={v => setLocalCompany({...localCompany, tradeName: v})} 
                  placeholder="Nome comercial"
                />
                <Input 
                  label="SLOGAN DA EMPRESA" 
                  value={localCompany.slogan || ''} 
                  onChange={v => setLocalCompany({...localCompany, slogan: v})} 
                  placeholder="Ex: Qualidade e Inovação"
                />
                <Input 
                  label="CPF / CNPJ" 
                  value={localCompany.idNumber} 
                  onChange={v => setLocalCompany({...localCompany, idNumber: maskCPF_CNPJ(v)})} 
                  placeholder="00.000.000/0001-00"
                />
                <Input 
                  label="INSCRIÇÃO ESTADUAL (OPCIONAL)" 
                  value={localCompany.stateRegistration || ''} 
                  onChange={v => setLocalCompany({...localCompany, stateRegistration: v})} 
                  placeholder="Ex: 000.000.000.000"
                />
                <Input 
                  label="WEBSITE" 
                  value={localCompany.website} 
                  onChange={v => setLocalCompany({...localCompany, website: v})} 
                  placeholder="www.empresa.com"
                />
              </div>
            </div>

            {/* Section: Endereço */}
            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                  <Truck size={16} />
                </div>
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Endereço</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <Input 
                    label="CEP" 
                    value={localCompany.address.cep} 
                    onChange={handleCEPChange} 
                    placeholder="00000-000"
                  />
                  {isFetchingCEP && (
                    <div className="absolute right-3 bottom-4">
                      <Loader2 size={16} className="text-blue-500 animate-spin" />
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <Input 
                    label="LOGRADOURO (RUA / AV)" 
                    value={localCompany.address.logradouro} 
                    onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, logradouro: v}})} 
                    placeholder="Rua, Av..."
                  />
                </div>
                <Input 
                  label="NÚMERO" 
                  value={localCompany.address.numero} 
                  onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, numero: v}})} 
                  placeholder="123"
                />
                <Input 
                  label="BAIRRO" 
                  value={localCompany.address.bairro} 
                  onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, bairro: v}})} 
                  placeholder="Bairro"
                />
                <Input 
                  label="CIDADE" 
                  value={localCompany.address.cidade} 
                  onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, cidade: v}})} 
                  placeholder="Cidade"
                />
                <Input 
                  label="ESTADO (UF)" 
                  value={localCompany.address.estado} 
                  onChange={v => setLocalCompany({...localCompany, address: {...localCompany.address, estado: v.toUpperCase().substring(0, 2)}})} 
                  placeholder="UF"
                />
              </div>
            </div>

            {/* Section: Contato & Pagamento */}
            <div className="bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                  <CreditCard size={16} />
                </div>
                <h3 className="text-xs font-black text-gray-700 uppercase tracking-widest">Contato & Pagamento</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input 
                  label="EMAIL" 
                  value={localCompany.email} 
                  onChange={v => setLocalCompany({...localCompany, email: v})} 
                  placeholder="contato@empresa.com"
                />
                <Input 
                  label="TELEFONE" 
                  value={localCompany.phone} 
                  onChange={v => setLocalCompany({...localCompany, phone: maskPhone(v)})} 
                  placeholder="(00) 00000-0000"
                />
                <Input 
                  label="CHAVE PIX" 
                  value={localCompany.pix} 
                  onChange={v => setLocalCompany({...localCompany, pix: v})} 
                  placeholder="CPF, CNPJ, Email ou Celular"
                />
              </div>
            </div>

            {showSuccess && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500 text-white p-4 rounded-2xl flex items-center justify-center gap-3"
              >
                <CheckCircle2 size={24} />
                <span className="font-bold text-xs uppercase tracking-widest">Dados salvos com sucesso!</span>
              </motion.div>
            )}
          </div>
        )}

        {activeTab === 'cupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Lado Esquerdo: Configurações */}
            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-4 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Estrutura & Formato</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Configure as dimensões base do cupom</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Formato Papel</label>
                    <select 
                      value={localCoupon.format ?? '58mm'}
                      onChange={e => setLocalCoupon({...localCoupon, format: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    >
                      <option value="58mm">Térmica 58mm</option>
                      <option value="80mm">Térmica 80mm</option>
                      <option value="a4">Folha A4</option>
                      <option value="a6">Folha A6</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Modo Impressão</label>
                    <select 
                      value={localCoupon.printMode}
                      onChange={e => setLocalCoupon({...localCoupon, printMode: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    >
                      <option value="browser">Navegador (PDF)</option>
                      <option value="app">App Desktop (Direto)</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Impressora Venda</label>
                  <select 
                    value={localCoupon.vendaPrinter}
                    onChange={e => setLocalCoupon({...localCoupon, vendaPrinter: e.target.value})}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                  >
                    <option value="">Nenhuma Selecionada</option>
                    {printers.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Visibilidade de Dados</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">O que deve aparecer no cupom final</p>
                </div>
                
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600" /> Dados da Empresa
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Checkbox label="Ver Logo" checked={localCoupon.showLogo} onChange={v => setLocalCoupon({...localCoupon, showLogo: v})} />
                      <Checkbox label="Nome Empresa" checked={localCoupon.showCompanyName} onChange={v => setLocalCoupon({...localCoupon, showCompanyName: v})} />
                      <Checkbox label="CPF / CNPJ" checked={localCoupon.showIdNumber} onChange={v => setLocalCoupon({...localCoupon, showIdNumber: v})} />
                      <Checkbox label="Endereço" checked={localCoupon.showAddress} onChange={v => setLocalCoupon({...localCoupon, showAddress: v})} />
                    </div>
                  </div>

                  <div className="w-full border-t border-gray-50"></div>

                  <div className="space-y-4">
                    <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600" /> Dados do Cliente
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-6">
                      <Checkbox label="Ver Nome Cliente" checked={localCoupon.showCustomerName} onChange={v => setLocalCoupon({...localCoupon, showCustomerName: v})} />
                      <Checkbox label="Ver WhatsApp" checked={localCoupon.showCustomerPhone} onChange={v => setLocalCoupon({...localCoupon, showCustomerPhone: v})} />
                      <Checkbox label="Ver CPF / CNPJ" checked={localCoupon.showCustomerTaxId} onChange={v => setLocalCoupon({...localCoupon, showCustomerTaxId: v})} />
                      <Checkbox label="Rua / Logradouro" checked={localCoupon.showCustomerAddress} onChange={v => setLocalCoupon({...localCoupon, showCustomerAddress: v})} />
                      <Checkbox label="Número" checked={localCoupon.showCustomerAddressNumber} onChange={v => setLocalCoupon({...localCoupon, showCustomerAddressNumber: v})} />
                      <Checkbox label="Bairro" checked={localCoupon.showCustomerAddressNeighborhood} onChange={v => setLocalCoupon({...localCoupon, showCustomerAddressNeighborhood: v})} />
                      <Checkbox label="Cidade / Estado" checked={localCoupon.showCustomerAddressCity} onChange={v => setLocalCoupon({...localCoupon, showCustomerAddressCity: v})} />
                      <Checkbox label="Complemento" checked={localCoupon.showCustomerAddressComplement} onChange={v => setLocalCoupon({...localCoupon, showCustomerAddressComplement: v})} />
                      <Checkbox label="CEP" checked={localCoupon.showCustomerCep} onChange={v => setLocalCoupon({...localCoupon, showCustomerCep: v})} />
                    </div>
                  </div>

                  <div className="w-full border-t border-gray-50"></div>

                  <div className="space-y-4">
                    <div className="text-[9px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                      <div className="w-1 h-1 rounded-full bg-blue-600" /> Itens & Totais
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Checkbox label="Preço Unitário" checked={localCoupon.showItemUnitPrice} onChange={v => setLocalCoupon({...localCoupon, showItemUnitPrice: v})} />
                      <Checkbox label="Subtotal Item" checked={localCoupon.showItemSubtotal} onChange={v => setLocalCoupon({...localCoupon, showItemSubtotal: v})} />
                      <Checkbox label="Descontos" checked={localCoupon.showDiscount} onChange={v => setLocalCoupon({...localCoupon, showDiscount: v})} />
                      <Checkbox label="Total Final" checked={localCoupon.showFinalTotal} onChange={v => setLocalCoupon({...localCoupon, showFinalTotal: v})} />
                      <Checkbox label="Pagamento / Troco" checked={localCoupon.showChange} onChange={v => setLocalCoupon({...localCoupon, showChange: v})} />
                      <Checkbox label="Data / Hora" checked={localCoupon.showDateTime} onChange={v => setLocalCoupon({...localCoupon, showDateTime: v})} />
                      <Checkbox label="Nº do Pedido" checked={localCoupon.showOrderNumber} onChange={v => setLocalCoupon({...localCoupon, showOrderNumber: v})} />
                      <Checkbox label="QR Code do Pedido" checked={localCoupon.showOrderQrCode} onChange={v => setLocalCoupon({...localCoupon, showOrderQrCode: v})} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Mensagens</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Textos adicionais para o topo e rodapé</p>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Cabeçalho (Header)</label>
                    <textarea 
                      value={localCoupon.headerMessage}
                      onChange={e => setLocalCoupon({...localCoupon, headerMessage: e.target.value})}
                      placeholder="Ex: SEJA BEM VINDO À NOSSA LOJA!"
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium transition-all min-h-[80px] resize-none"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Rodapé (Footer)</label>
                    <textarea 
                      value={localCoupon.footerMessage}
                      onChange={e => setLocalCoupon({...localCoupon, footerMessage: e.target.value})}
                      placeholder="Ex: OBRIGADO PELA PREFERÊNCIA!"
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-medium transition-all min-h-[80px] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setLocalCoupon(couponConfig)}
                  className="flex-1 p-5 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Descartar Alterações
                </button>
                <button 
                  onClick={() => {
                    setCouponConfig(localCoupon);
                    salvarDados(STORAGE_KEYS.COUPON_CONFIG, localCoupon);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                  }}
                  className="flex-1 p-5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Salvar Configurações
                </button>
              </div>
            </div>

            {/* Lado Direito: Prévia do Cupom */}
            <div className="sticky top-6 h-fit hidden lg:block">
              <div className="bg-gray-50 rounded-[3rem] p-12 border border-gray-100 shadow-inner flex flex-col items-center">
                <div className="flex items-center gap-3 mb-10 bg-white px-6 py-2.5 rounded-full border border-gray-100 shadow-sm">
                   <div className="v-ping w-2 h-2 rounded-full bg-blue-500" />
                   <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">Live Preview</span>
                </div>

                {/* Simulated Thermal Receipt */}
                <div 
                  className={`bg-white shadow-2xl transition-all duration-500 overflow-hidden font-mono text-gray-900 ${
                    localCoupon.format === '58mm' ? 'w-[250px]' : 
                    localCoupon.format === '80mm' ? 'w-[320px]' : 
                    localCoupon.format === 'a4' ? 'w-[400px] aspect-[1/1.41]' : 
                    'w-[280px] aspect-[1/1.41]'
                  }`}
                >
                  <div className="p-8 space-y-6 leading-tight text-[10px]">
                    {/* Header: Company Info */}
                    <div className="flex flex-col items-center text-center space-y-3">
                      {localCoupon.showLogo && localCompany.logo && (
                        <img src={localCompany.logo} alt="Logo" className="max-h-20 object-contain mb-2 grayscale" />
                      )}
                      
                      <div className="space-y-1">
                        {localCoupon.showCompanyName && (
                          <h6 className="font-black text-sm uppercase tracking-tighter">{localCompany.tradeName || localCompany.name || 'MINHA EMPRESA'}</h6>
                        )}
                        
                        {(localCoupon.showIdNumber || localCoupon.showAddress) && (
                          <div className="text-[9px] uppercase space-y-0.5">
                            {localCoupon.showIdNumber && localCompany.idNumber && (
                              <p>CPF/CNPJ: {localCompany.idNumber}</p>
                            )}
                            {localCoupon.showAddress && (
                              <p className="px-4 italic opacity-70">
                                {localCompany.address.logradouro}, {localCompany.address.numero}<br/>
                                {localCompany.address.bairro}, {localCompany.address.cidade}/{localCompany.address.estado}
                              </p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {localCoupon.headerMessage && (
                      <p className="text-center border-y border-dashed border-gray-400 py-3 uppercase font-bold text-[9px] tracking-wider">{localCoupon.headerMessage}</p>
                    )}

                    {/* Metadata: Order & Date */}
                    <div className="flex justify-between font-bold border-b border-gray-100 pb-2 text-[9px]">
                       {localCoupon.showOrderNumber && <span>PEDIDO: #2351</span>}
                       {localCoupon.showDateTime && <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString().slice(0, 5)}</span>}
                    </div>

                    {/* Customer Info Section */}
                    {(localCoupon.showCustomerName || localCoupon.showCustomerPhone || localCoupon.showCustomerTaxId || localCoupon.showCustomerAddress) && (
                      <div className="space-y-1 text-[9px] border border-gray-100 p-3 rounded-lg">
                        <p className="font-black uppercase border-b border-gray-50 pb-1 mb-2">Cliente</p>
                        {localCoupon.showCustomerName && <p>NOME: {simulatedCustomer?.name || 'JOÃO DA SILVA TESTE'}</p>}
                        {localCoupon.showCustomerPhone && <p>FONE: {simulatedCustomer?.whatsapp || simulatedCustomer?.phone || '(11) 98765-4321'}</p>}
                        {localCoupon.showCustomerTaxId && <p>DOC: {simulatedCustomer?.taxId || '123.456.789-00'}</p>}
                        {localCoupon.showCustomerAddress && (
                           <div className="opacity-80">
                             <p>END: {simulatedCustomer?.address?.street || 'RUA DAS PALMEIRAS'}{localCoupon.showCustomerAddressNumber ? `, ${simulatedCustomer?.address?.number || '450'}` : ''}</p>
                             {localCoupon.showCustomerAddressNeighborhood && <p>BAIRRO: {simulatedCustomer?.address?.neighborhood || 'CENTRO'}</p>}
                             {localCoupon.showCustomerAddressCity && <p>CIDADE: {simulatedCustomer?.address?.city || 'SÃO PAULO'} / {simulatedCustomer?.address?.state || 'SP'}</p>}
                             {localCoupon.showCustomerCep && <p>CEP: {simulatedCustomer?.address?.cep || '01234-567'}</p>}
                           </div>
                        )}
                      </div>
                    )}

                    {/* Items Table */}
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between font-black uppercase text-[9px] border-b-2 border-gray-900 pb-1">
                        <span>Descrição</span>
                        <span>Total</span>
                      </div>
                      <div className="space-y-4">
                        <div className="space-y-1">
                           <div className="flex justify-between uppercase font-bold">
                             <span>CAMISETA DRI-FIT GG</span>
                             <span>R$ 89,90</span>
                           </div>
                           {(localCoupon.showItemUnitPrice || localCoupon.showItemQty) && (
                             <p className="text-[8px] italic opacity-60">
                               {localCoupon.showItemQty && '2.0 UN'} {localCoupon.showItemUnitPrice && 'x R$ 44,95'}
                             </p>
                           )}
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between uppercase font-bold">
                             <span>CANETA PERSONALIZADA</span>
                             <span>R$ 25,00</span>
                           </div>
                           {(localCoupon.showItemUnitPrice || localCoupon.showItemQty) && (
                             <p className="text-[8px] italic opacity-60">
                               {localCoupon.showItemQty && '5.0 UN'} {localCoupon.showItemUnitPrice && 'x R$ 5,00'}
                             </p>
                           )}
                        </div>
                      </div>
                    </div>

                    <div className="w-full border-t-2 border-gray-900 mt-6"></div>

                    {/* Totals Section */}
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between font-bold">
                        <span>SUBTOTAL</span>
                        <span>R$ 114,90</span>
                      </div>
                      {localCoupon.showDiscount && (
                        <div className="flex justify-between opacity-70">
                          <span>DESCONTOS</span>
                          <span>- R$ 14,90</span>
                        </div>
                      )}
                      {localCoupon.showFinalTotal && (
                        <div className="flex justify-between font-black text-base pt-2 border-t border-dashed border-gray-300">
                          <span>TOTAL</span>
                          <span>R$ 100,00</span>
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    {(localCoupon.showPaymentMethod || localCoupon.showChange) && (
                       <div className="space-y-1.5 pt-4 border-t border-gray-100">
                         {localCoupon.showPaymentMethod && (
                           <div className="flex justify-between uppercase opacity-80">
                             <span>FORMA PAGTO:</span>
                             <span className="font-bold">PIX / DINHEIRO</span>
                           </div>
                         )}
                         {localCoupon.showChange && (
                            <div className="flex justify-between uppercase">
                              <span>TROCO:</span>
                              <span className="font-bold">R$ 0,00</span>
                            </div>
                         )}
                       </div>
                    )}

                    {/* Footer: Messages & QR Code */}
                    <div className="flex flex-col items-center text-center space-y-6 pt-10 border-t border-dashed border-gray-300">
                      {localCoupon.footerMessage && (
                        <p className="text-[10px] font-black uppercase tracking-widest opacity-60 px-6">
                          {localCoupon.footerMessage}
                        </p>
                      )}
                      
                      {localCoupon.showOrderQrCode && (
                        <div className="flex flex-col items-center gap-2">
                           <div className="p-4 border-2 border-gray-900 rounded-3xl bg-white">
                              <QRCodeCanvas 
                                value="2351" 
                                size={localCoupon.format === '58mm' ? 80 : 100}
                                level="M"
                                includeMargin={false}
                              />
                           </div>
                           <span className="text-[8px] font-black uppercase tracking-widest text-gray-400">Order ID Verification</span>
                        </div>
                      )}

                      <div className="text-[7px] font-black uppercase tracking-widest opacity-30 mt-4">
                        Sistema PDV Profissional
                      </div>
                    </div>
                  </div>
                </div>

                {/* Simulation Control */}
                <div className="mt-8 flex gap-4 w-full max-w-[320px]">
                   <div className="flex-1 space-y-1">
                     <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest ml-1">Simular Perfil de Cliente</label>
                     <select 
                       className="w-full p-3 bg-white rounded-xl border border-gray-200 text-[10px] font-bold outline-none uppercase shadow-sm focus:ring-2 focus:ring-blue-400 transition-all"
                       onChange={(e) => {
                         const c = customers.find(cust => cust.id === e.target.value);
                         setSimulatedCustomer(c || null);
                       }}
                       value={simulatedCustomer?.id || ""}
                     >
                        <option value="">Consumidor Final (Padrão)</option>
                        {customers.slice(0, 10).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                     </select>
                   </div>
                   <button 
                     onClick={() => setSimulatedCustomer(null)}
                     className="self-end p-3 bg-white border border-gray-200 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm"
                     title="Resetar Simulação"
                   >
                      <RefreshCw size={14} />
                   </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'seguranca' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Roles Section */}
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
                      <ShieldCheck size={20} />
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Gestão de Funções</h4>
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Configure permissões por cargo</p>
                   </div>
                </div>
                <div className="flex gap-2">
                  <input 
                    placeholder="Nova Função..." 
                    className="p-2.5 bg-white rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-blue-400 text-xs font-bold uppercase w-48"
                    value={newRole.name ?? ''}
                    onChange={e => setNewRole({name: e.target.value})}
                  />
                  <button onClick={addRole} className="bg-blue-600 text-white px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2">
                    <Plus size={14} /> Cadastrar Nova Função
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6">
                {localRoles.map(role => (
                  <div key={role.id} className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 flex items-center justify-between bg-gray-50/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                          <Lock size={20} />
                        </div>
                        <div>
                          <h5 className="font-bold text-gray-800 uppercase tracking-tight">{role.name}</h5>
                          {role.isDefault && <span className="text-[7px] bg-indigo-600 text-white px-1.5 py-0.5 rounded-full font-black uppercase tracking-widest">Função Padrão</span>}
                        </div>
                      </div>
                      {!role.isDefault && (
                        <button 
                          onClick={() => setLocalRoles(localRoles.filter(r => r.id !== role.id))}
                          className="text-red-200 hover:text-red-500 p-2 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                    <div className="p-6 grid grid-cols-1 gap-4">
                      {[
                        { id: 'dashboard', label: 'Dashboard' },
                        { id: 'pdv', label: 'PDV / Vendas' },
                        { id: 'separacao', label: 'Separação' },
                        { id: 'estoque', label: 'Estoque' },
                        { id: 'financeiro', label: 'Financeiro' },
                        { id: 'historico', label: 'Histórico' },
                        { id: 'ajustes', label: 'Ajustes' },
                      ].map(mod => (
                        <div key={mod.id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/30 px-2 rounded-xl transition-colors">
                           <div className="flex flex-col">
                             <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">{mod.label}</span>
                           </div>
                           <div className="flex gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100">
                              {[
                                { id: 'total', label: 'Acesso Total', activeClass: 'bg-emerald-500 text-white shadow-emerald-100' },
                                { id: 'limitado', label: 'Acesso Limitado', activeClass: 'bg-amber-500 text-white shadow-amber-100' },
                                { id: 'nenhum', label: 'Sem Acesso', activeClass: 'bg-gray-500 text-white shadow-gray-100' },
                              ].map(level => {
                                 const isActive = role.permissions[mod.id as keyof ModulePermissions] === level.id;
                                 return (
                                   <button
                                     key={level.id}
                                     onClick={() => setPermissionLevel(role.id, mod.id as keyof ModulePermissions, level.id as AccessLevel)}
                                     className={`px-3 py-2 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all ${isActive ? `${level.activeClass} shadow-md scale-105` : 'text-gray-400 hover:bg-white hover:text-gray-600'}`}
                                   >
                                     {level.label}
                                   </button>
                                 );
                              })}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="w-full border-t border-gray-100 my-8"></div>

            {/* Users Section */}
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                   <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-600">
                      <UserPlus size={20} />
                   </div>
                   <div>
                      <h4 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Gestão de Usuários</h4>
                      <p className="text-[9px] text-gray-400 uppercase font-bold tracking-tight">Controle de acesso ao sistema</p>
                   </div>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-2xl border border-gray-200">
                  <button 
                    onClick={() => setUserTab('ativos')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userTab === 'ativos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Ativos
                  </button>
                  <button 
                    onClick={() => setUserTab('inativos')}
                    className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${userTab === 'inativos' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    Inativos
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100 shadow-inner">
                <Input label="NOME COMPLETO" value={newUser.name} onChange={v => setNewUser({...newUser, name: v})} placeholder="Ex: João Silva" />
                <Input label="LOGIN DE ACESSO" value={newUser.username} onChange={v => setNewUser({...newUser, username: v})} placeholder="Ex: joao.vendas" />
                <Input label="SENHA" value={newUser.password} onChange={v => setNewUser({...newUser, password: v})} placeholder="****" />
                <div>
                  <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1 block mb-1">Função / Cargo</label>
                  <select 
                    value={newUser.roleId ?? ''} 
                    onChange={e => setNewUser({...newUser, roleId: e.target.value})}
                    className="w-full p-4 bg-white rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold transition-all appearance-none uppercase shadow-sm"
                  >
                    <option value="">Sem Função</option>
                    {localRoles.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={addUser}
                  className="md:col-span-4 bg-gray-900 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl active:scale-95"
                >
                  <UserPlus size={18} /> Confirmar Cadastro
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.filter(u => userTab === 'ativos' ? (u.isActive !== false) : (u.isActive === false)).map(u => {
                  const role = localRoles.find(r => r.id === u.roleId);
                  return (
                    <div key={u.id} className="p-6 bg-white rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition-all">
                      <div className="flex items-center gap-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xs uppercase shadow-sm ${u.isActive !== false ? 'bg-blue-50 text-blue-600' : 'bg-gray-50 text-gray-400'}`}>
                          {u.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-black text-gray-800 uppercase tracking-tight">{u.name}</p>
                          <div className="flex flex-col gap-0.5">
                             <div className="flex items-center gap-2">
                               <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">User: {u.username}</p>
                               {role && <span className="text-[8px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-black uppercase tracking-widest">{role.name}</span>}
                             </div>
                             {!u.isActive && u.deactivatedAt && (
                               <p className="text-[8px] font-bold text-red-400 uppercase">Desativado em: {new Date(u.deactivatedAt).toLocaleDateString('pt-BR')}</p>
                             )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        {u.isActive !== false ? (
                          <>
                            <button 
                              onClick={() => {
                                setResettingUser(u);
                                setVerificationCode(Math.floor(100000 + Math.random() * 900000).toString());
                                setShowResetModal(true);
                              }}
                              title="Redefinir Senha"
                              className="p-2 text-blue-400 hover:bg-blue-50 rounded-xl"
                            >
                              <Lock size={18} />
                            </button>
                            <button 
                              onClick={() => {
                                if (u.id === currentUser?.id) {
                                  alert('Você não pode desativar seu próprio usuário!');
                                  return;
                                }
                                if (u.username === 'admin') {
                                  alert('O administrador principal não pode ser desativado!');
                                  return;
                                }
                                setDeactivatingUser(u);
                                setShowDeactivateModal(true);
                              }}
                              title="Desativar Usuário"
                              className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl"
                            >
                              <Trash2 size={18} />
                            </button>
                          </>
                        ) : (
                          <button 
                            onClick={() => {
                              setUsers(users.map(usr => usr.id === u.id ? { ...usr, isActive: true, deactivatedAt: undefined } : usr));
                              addActivity('security', 'Usuário Reativado', `O usuário ${u.name} foi reativado no sistema.`);
                              alert('Usuário reativado com sucesso');
                            }}
                            className="bg-emerald-500 text-white px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all flex items-center gap-2"
                          >
                            <RefreshCw size={12} /> Reativar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Password Reset Modal */}
            {showResetModal && resettingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                   <div className="flex flex-col items-center text-center space-y-4 mb-8">
                      <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-2">
                        <Lock size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Redefinir Senha</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Usuário: {resettingUser.name}</p>
                   </div>

                   <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-6 text-center">
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Código de Verificação</p>
                      <p className="text-3xl font-black text-blue-600 tracking-[0.5em]">{verificationCode}</p>
                   </div>

                   <div className="space-y-4">
                      <Input 
                        label="NOVA SENHA" 
                        type="password"
                        value={newPassword} 
                        onChange={setNewPassword} 
                        placeholder="Mínimo 6 caracteres" 
                      />
                      <Input 
                        label="CONFIRMAR NOVA SENHA" 
                        type="password"
                        value={confirmPassword} 
                        onChange={setConfirmPassword} 
                        placeholder="Digite novamente" 
                      />
                   </div>

                   <div className="grid grid-cols-2 gap-4 mt-8">
                      <button 
                        onClick={() => {
                          setShowResetModal(false);
                          setResettingUser(null);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="p-4 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          if (newPassword !== confirmPassword) {
                            alert('As senhas não coincidem!');
                            return;
                          }
                          if (newPassword.length < 4) {
                            alert('Senha muito curta!');
                            return;
                          }
                          setUsers(users.map(u => u.id === resettingUser.id ? { ...u, password: newPassword } : u));
                          addActivity('security', 'Senha Redefinida', `Senha do usuário ${resettingUser.name} foi redefinida manualmente.`);
                          alert('Senha redefinida com sucesso');
                          setShowResetModal(false);
                          setResettingUser(null);
                          setNewPassword('');
                          setConfirmPassword('');
                        }}
                        className="p-4 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700"
                      >
                        Salvar Nova Senha
                      </button>
                   </div>
                </div>
              </div>
            )}

            {/* Deactivation Modal */}
            {showDeactivateModal && deactivatingUser && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                <div className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-200">
                   <div className="flex flex-col items-center text-center space-y-4 mb-8">
                      <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-2">
                        <Trash2 size={32} />
                      </div>
                      <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Desativar Usuário?</h3>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                        Tem certeza que deseja desativar este usuário? Ele será movido para a lista de inativos.
                      </p>
                   </div>

                   <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100 mb-8">
                      <div className="flex items-center gap-4">
                         <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-gray-400 border border-gray-100">
                           {deactivatingUser.name.charAt(0)}
                         </div>
                         <div className="text-left">
                            <p className="text-sm font-black text-gray-800 uppercase">{deactivatingUser.name}</p>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                              {localRoles.find(r => r.id === deactivatingUser.roleId)?.name || 'Sem Função'}
                            </p>
                         </div>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => {
                          setShowDeactivateModal(false);
                          setDeactivatingUser(null);
                        }}
                        className="p-4 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={() => {
                          setUsers(users.map(u => u.id === deactivatingUser.id ? { ...u, isActive: false, deactivatedAt: new Date().toISOString() } : u));
                          addActivity('security', 'Usuário Desativado', `O usuário ${deactivatingUser.name} foi desativado.`);
                          alert('Usuário desativado com sucesso');
                          setShowDeactivateModal(false);
                          setDeactivatingUser(null);
                        }}
                        className="p-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700"
                      >
                        Confirmar
                      </button>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'etiquetas' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Lado Esquerdo: Configurações */}
            <div className="space-y-6 overflow-y-auto max-h-[calc(100vh-250px)] pr-4 scrollbar-thin scrollbar-thumb-gray-200">
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Dimensões da Etiqueta</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Configure o tamanho físico da etiqueta em milímetros</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Largura (mm)</label>
                    <input 
                      type="number"
                      value={localLabel.width ?? 0}
                      onChange={e => setLocalLabel({...localLabel, width: parseInt(e.target.value) || 0})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-black uppercase transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Altura (mm)</label>
                    <input 
                      type="number"
                      value={localLabel.height ?? 0}
                      onChange={e => setLocalLabel({...localLabel, height: parseInt(e.target.value) || 0})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-black uppercase transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Campos Visíveis</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Selecione as informações que aparecerão na etiqueta</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Checkbox label="Nome do Produto" checked={localLabel.showProductName} onChange={v => setLocalLabel({...localLabel, showProductName: v})} />
                  <Checkbox label="Preço de Venda" checked={localLabel.showPrice} onChange={v => setLocalLabel({...localLabel, showPrice: v})} />
                  <Checkbox label="Código de Barras" checked={localLabel.showBarcode} onChange={v => setLocalLabel({...localLabel, showBarcode: v})} />
                  <Checkbox label="Texto do Código" checked={localLabel.showCodeNumber} onChange={v => setLocalLabel({...localLabel, showCodeNumber: v})} />
                  <Checkbox label="Data de Impressão" checked={localLabel.showPrintDate} onChange={v => setLocalLabel({...localLabel, showPrintDate: v})} />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Simulação de Folha</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Como as etiquetas serão distribuídas na impressão</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Tipo de Folha</label>
                    <select 
                      value={localLabel.sheetType ?? 'thermal'}
                      onChange={e => setLocalLabel({...localLabel, sheetType: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    >
                      <option value="thermal">Autoadesiva (Térmica)</option>
                      <option value="a4">Folha Office A4</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Qtd. Selecionada (Preview)</label>
                    <input 
                      type="number"
                      value={localLabel.labelsPerSheet ?? 1}
                      onChange={e => setLocalLabel({...localLabel, labelsPerSheet: Math.max(1, parseInt(e.target.value) || 1)})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-black uppercase transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => setLocalLabel(labelConfig)}
                  className="flex-1 p-5 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Descartar
                </button>
                <button 
                  onClick={() => {
                    setLabelConfig(localLabel);
                    salvarDados(STORAGE_KEYS.LABEL_CONFIG, localLabel);
                    setShowSuccess(true);
                    setTimeout(() => setShowSuccess(false), 3000);
                  }}
                  className="flex-1 p-5 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all"
                >
                  Salvar
                </button>
              </div>
            </div>

            {/* Lado Direito: Preview Dinâmico */}
            <div className="sticky top-6 h-fit hidden lg:block">
              <div className="bg-gray-50 rounded-[3rem] p-8 border border-gray-100 shadow-inner space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 bg-white px-6 py-2.5 rounded-full border border-gray-100 shadow-sm">
                    <div className="v-ping w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-[10px] font-black text-gray-700 uppercase tracking-[0.2em]">Prévia Real-time</span>
                  </div>
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{localLabel.width}x{localLabel.height}mm</p>
                </div>

                {/* Individual Label Preview */}
                <div className="flex flex-col items-center gap-4">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Etiqueta Unitária</p>
                  <div 
                    className="bg-white shadow-2xl flex flex-col items-center justify-center p-2 border border-gray-200 overflow-hidden"
                    style={{ 
                      width: `${localLabel.width * 3}px`, 
                      height: `${localLabel.height * 3}px`,
                      maxWidth: '300px',
                      maxHeight: '200px'
                    }}
                  >
                    {localLabel.showProductName && (
                      <p className="text-[10px] font-black text-center truncate w-full uppercase mb-1">Camiseta Nike Dry G</p>
                    )}
                    
                    {localLabel.showBarcode && (
                      <div className="w-full flex flex-col items-center">
                        <Barcode size={32} className="text-gray-800" />
                        {localLabel.showCodeNumber && <p className="text-[7px] font-mono leading-none mt-1">789123456789</p>}
                      </div>
                    )}
                    
                    <div className="flex justify-between w-full items-center mt-auto">
                      {localLabel.showPrintDate && <p className="text-[7px] font-mono opacity-40">{new Date().toLocaleDateString('pt-BR')}</p>}
                      {localLabel.showPrice && <p className="text-[12px] font-black italic">R$ 159,90</p>}
                    </div>
                  </div>
                </div>

                {/* Sheet Layout Simulation */}
                <div className="flex flex-col items-center gap-4 pt-8 border-t border-gray-200">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">Distribuição na Folha {localLabel.sheetType === 'a4' ? '(A4)' : '(Rolo)'}</p>
                  <div 
                    className={`bg-white border-2 border-gray-200 rounded-lg shadow-inner overflow-hidden p-2 grid gap-1 ${
                      localLabel.sheetType === 'a4' ? 'w-[210px] aspect-[1/1.41] grid-cols-4' : 'w-[150px] grid-cols-1'
                    }`}
                  >
                    {Array.from({ length: localLabel.sheetType === 'a4' ? Math.min(24, localLabel.labelsPerSheet) : Math.min(4, localLabel.labelsPerSheet) }).map((_, i) => (
                      <div 
                        key={i} 
                        className="bg-gray-50 border border-gray-100 rounded-sm aspect-video flex items-center justify-center"
                      >
                         <div className="w-full h-full border border-gray-200/50 flex flex-col items-center justify-center scale-50 opacity-20">
                           <div className="w-3/4 h-1 bg-gray-400 mb-0.5" />
                           <div className="w-1/2 h-2 bg-gray-400" />
                         </div>
                      </div>
                    ))}
                    {localLabel.sheetType === 'a4' && localLabel.labelsPerSheet > 24 && (
                      <div className="col-span-4 text-center py-1 opacity-40">
                        <p className="text-[7px] font-black uppercase">+{localLabel.labelsPerSheet - 24} etiquetas...</p>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                    <Printer size={12} /> Exibindo {localLabel.labelsPerSheet} etiquetas
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'entrega' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center gap-3 text-emerald-600">
                <Truck size={24} />
                <h3 className="text-xs font-black uppercase tracking-widest">Configuração de Entrega</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Adicionar Novo Tipo</label>
                    <div className="flex gap-2">
                       <input 
                         type="text" 
                         id="new-delivery-method"
                         placeholder="NOME DO TIPO (EX: MOTOBOY)" 
                         className="flex-1 p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold uppercase"
                       />
                       <button 
                         onClick={() => {
                           const input = document.getElementById('new-delivery-method') as HTMLInputElement;
                           if (input.value.trim()) {
                             setDeliveryMethods([...deliveryMethods, { id: crypto.randomUUID(), name: input.value.trim(), isActive: true }]);
                             input.value = '';
                           }
                         }}
                         className="bg-emerald-500 text-white p-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100"
                       >
                         <Plus size={20} />
                       </button>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-100 rounded-3xl overflow-hidden border border-gray-100">
                  <div className="p-4 border-b border-gray-100 flex justify-between bg-white">
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Tipos de Entrega</span>
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {deliveryMethods.map(method => (
                      <div key={method.id} className="p-4 flex items-center justify-between bg-white/50 hover:bg-white transition-colors">
                        <div className="flex items-center gap-3">
                          <Truck size={16} className={method.isActive ? 'text-emerald-500' : 'text-gray-300'} />
                          <span className={`text-sm font-bold uppercase ${method.isActive ? 'text-gray-700' : 'text-gray-400 italic'}`}>{method.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <button 
                            onClick={() => {
                              setDeliveryMethods(deliveryMethods.map(m => m.id === method.id ? { ...m, isActive: !m.isActive } : m));
                            }}
                            className={`p-2 rounded-xl transition-all ${method.isActive ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                          >
                            {method.isActive ? <Unlock size={16} /> : <Lock size={16} />}
                          </button>
                          <button 
                            onClick={() => {
                              if(confirm('Excluir este método?')) {
                                setDeliveryMethods(deliveryMethods.filter(m => m.id !== method.id));
                              }
                            }}
                            className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'impressao' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="space-y-6">
              {/* Modo de Impressão Global */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-6">
                <div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase mb-1">Modo de Operação</h4>
                  <p className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">Defina como o sistema deve disparar as impressões</p>
                </div>
                <div className="flex gap-4">
                  {[
                    { id: 'browser', label: 'Navegador (Padrão)', icon: <Monitor size={14} /> },
                    { id: 'auto', label: 'Automático (Desktop)', icon: <Cpu size={14} /> }
                  ].map(mode => (
                    <button 
                      key={mode.id}
                      onClick={() => {
                        setLocalCoupon({ ...localCoupon, printMode: mode.id as any });
                        setLocalLabel({ ...localLabel, printMode: mode.id as any });
                      }}
                      className={`flex-1 p-5 rounded-2xl border-2 transition-all flex flex-col items-center gap-3 ${
                        localCoupon.printMode === mode.id ? 'border-blue-600 bg-blue-50 text-blue-600 shadow-lg shadow-blue-100' : 'border-gray-50 bg-gray-50 text-gray-400 hover:border-gray-200'
                      }`}
                    >
                      <div className={localCoupon.printMode === mode.id ? 'text-blue-600' : 'text-gray-300'}>{mode.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest">{mode.label}</span>
                    </button>
                  ))}
                </div>
                {localCoupon.printMode === 'auto' && (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                    <div className="text-amber-500 shrink-0"><AlertTriangle size={18} /></div>
                    <p className="text-[9px] font-bold text-amber-700 uppercase leading-relaxed">
                      O modo automático requer o <span className="underline">AisPrint App</span> instalado e rodando em seu computador para funcionar.
                    </p>
                  </div>
                )}
              </div>

              {/* Configurações de Cupom */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center">
                    <Printer size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase">Impressão: Cupom</h4>
                </div>

                <div className="space-y-4">
                  <Input 
                    label="Nome da Impressora" 
                    value={localCoupon.printerName || ''} 
                    onChange={v => setLocalCoupon({...localCoupon, printerName: v})} 
                    placeholder="Ex: MP-4200 TH / EPSON TM-T20"
                  />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Formato do Papel</label>
                    <select 
                      value={localCoupon.format ?? '58mm'}
                      onChange={e => setLocalCoupon({...localCoupon, format: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    >
                      <option value="58mm">Térmica 58mm</option>
                      <option value="80mm">Térmica 80mm</option>
                      <option value="a4">Folha A4</option>
                      <option value="a6">Folha A6</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  {localCoupon.format === 'custom' && (
                    <div className="grid grid-cols-2 gap-4 animate-in fade-in zoom-in-95">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Largura (mm)</label>
                        <input 
                          type="number" 
                          value={localCoupon.customWidth ?? 80} 
                          onChange={e => setLocalCoupon({...localCoupon, customWidth: parseInt(e.target.value) || 80})}
                          className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none text-sm font-black"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Altura (mm)</label>
                        <input 
                          type="number" 
                          value={localCoupon.customHeight ?? 300} 
                          onChange={e => setLocalCoupon({...localCoupon, customHeight: parseInt(e.target.value) || 300})}
                          className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none text-sm font-black"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              {/* Configurações de Etiquetas */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center">
                    <Tag size={20} />
                  </div>
                  <h4 className="text-[11px] font-black text-gray-900 tracking-[0.2em] uppercase">Impressão: Etiquetas</h4>
                </div>

                <div className="space-y-4">
                  <Input 
                    label="Nome da Impressora" 
                    value={localLabel.printerName || ''} 
                    onChange={v => setLocalLabel({...localLabel, printerName: v})} 
                    placeholder="Ex: Zebra GC420t / Argox"
                  />
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">Tipo de Suporte</label>
                    <select 
                      value={localLabel.format}
                      onChange={e => setLocalLabel({...localLabel, format: e.target.value as any})}
                      className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    >
                      <option value="thermal">Rolo Térmico (Individual)</option>
                      <option value="a4">Folha Office A4</option>
                      <option value="a6">Folha Office A6</option>
                      <option value="custom">Personalizado</option>
                    </select>
                  </div>

                  <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Dimensões Atuais: <span className="text-blue-600">{localLabel.width}x{localLabel.height}mm</span></p>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setActiveTab('etiquetas')}
                        className="flex-1 p-3 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:border-blue-200 hover:text-blue-600 transition-all shadow-sm"
                      >
                        Ajustar Medidas
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-xl shadow-indigo-100 text-white space-y-6">
                <div>
                  <h4 className="text-[11px] font-black tracking-[0.2em] uppercase opacity-60 mb-2">Status da Integração</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><Cloud size={24} /></div>
                    <div>
                      <p className="text-xl font-black">Navegador</p>
                      <p className="text-[10px] font-bold uppercase opacity-60">Pronto para imprimir via Ctrl+P</p>
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-400" />
                    <span className="text-[9px] font-black uppercase tracking-widest">Sistema Ativo</span>
                  </div>
                  <button className="text-[9px] font-black uppercase tracking-widest px-4 py-2 bg-white/10 rounded-full hover:bg-white/20 transition-all">Testar Impressora</button>
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === 'backup' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-blue-50 border border-blue-200 p-8 rounded-[2.5rem] space-y-6 shadow-sm">
              <div className="flex items-center gap-4 text-blue-700">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-blue-100 shadow-xl">
                   <ShieldCheck size={28} />
                </div>
                <div>
                  <h4 className="text-xl font-black uppercase tracking-widest">Segurança de Dados</h4>
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mt-1">Proteção e pontos de restauração do sistema</p>
                </div>
              </div>
              <p className="text-sm text-blue-800 font-medium leading-relaxed max-w-2xl">
                O sistema realiza backups automáticos locais diariamente para garantir pontos de restauração seguros. Recomendamos também exportar backups manuais regularmente para armazenamento externo.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <button 
                  id="btn-export-backup"
                  onClick={() => exportarBackup({
                    products, customers, sales, activities, categories, subcategories,
                    delivery_channels: deliveryChannels, users, roles, paymentMethods,
                    customPaymentMethods, printers, company, couponConfig, labelConfig,
                    cashierSession, selectedPrinter, revenues, purchases, expenses,
                    rawMaterials, productRecipes
                  })}
                  className="bg-blue-600 text-white p-6 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-200 group"
                >
                  <Download size={20} className="group-hover:translate-y-0.5 transition-transform" /> Exportar Backup Manual (.json)
                </button>
                <button 
                  id="btn-import-backup"
                  onClick={async () => {
                    const imported = await importarBackup();
                    if (imported) {
                      if (confirm('Deseja realmente importar este backup? Isso irá sobrescrever todos os dados atuais do sistema.')) {
                        handleRestoreFromData(imported);
                      }
                    }
                  }}
                  className="bg-white text-gray-700 p-6 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-gray-100 hover:border-blue-200 hover:text-blue-600 transition-all flex items-center justify-center gap-3 shadow-sm group"
                >
                  <Upload size={20} className="group-hover:-translate-y-0.5 transition-transform" /> Importar Arquivo de Backup
                </button>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400">
                    <History size={24} />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase tracking-widest text-gray-800">Histórico de Backups Locais</h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Últimos 10 pontos de restauração salvos</p>
                  </div>
                </div>
                <button 
                  onClick={handleCreateManualBackup}
                  className="px-6 py-3 bg-gray-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-gray-100 flex items-center gap-2"
                >
                  <Database size={14} /> Criar Ponto Agora
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {localBackups.length === 0 ? (
                  <div className="p-16 border-4 border-dashed border-gray-50 rounded-[3rem] flex flex-col items-center justify-center text-gray-300">
                    <Database size={48} className="mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest">Nenhum backup local encontrado</p>
                  </div>
                ) : (
                  localBackups.map((bak) => (
                    <div key={bak.id} className="group p-5 bg-gray-50 hover:bg-white hover:shadow-xl rounded-[1.5rem] border border-transparent hover:border-gray-100 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm group-hover:scale-110 transition-transform">
                          <Database size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-800 uppercase tracking-tighter">
                            {new Date(bak.date).toLocaleDateString('pt-BR')} • {new Date(bak.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                             <p className="text-[9px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-black uppercase tracking-wider">
                               {(bak.size / 1024).toFixed(1)} KB
                             </p>
                             <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wider">
                               LocalStorage
                             </p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button 
                          onClick={() => exportarBackup(bak.data)}
                          className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                          title="Fazer Download do Arquivo"
                        >
                          <Download size={18} />
                        </button>
                        <button 
                          onClick={() => {
                            if(confirm('ATENÇÃO: Restaurar este ponto irá sobrescrever TODOS os dados atuais. O sistema será reiniciado. Deseja continuar?')) {
                               handleRestoreFromData(bak.data);
                            }
                          }}
                          className="p-3 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl transition-all"
                          title="Restaurar este Backup"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button 
                          onClick={() => handleDeleteBackup(bak.id)}
                          className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            
            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 space-y-4 shadow-sm">
              <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Informações Técnicas</h5>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-400 uppercase">Local do Backup:</span>
                  <span className="text-gray-600">Navegador (LocalStorage)</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-400 uppercase">Frequência:</span>
                  <span className="text-gray-600">Diária (Automático)</span>
                </div>
                <div className="flex justify-between text-[10px] font-bold">
                  <span className="text-gray-400 uppercase">Formato:</span>
                  <span className="text-gray-600">JSON (Estruturado)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-8">
        <button 
          onClick={handleCancel}
          className="flex-1 bg-white text-gray-400 py-4 rounded-2xl font-black text-xs tracking-widest uppercase border border-gray-200 hover:bg-gray-50 transition-all"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSave}
          className="flex-1 bg-[#5d5dff] text-white py-4 rounded-2xl font-black text-xs tracking-widest uppercase shadow-lg shadow-blue-100 hover:bg-[#4a4aff] transition-all"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
}

function Checkbox({ label, checked, onChange }: { label: string, checked: boolean, onChange: (v: boolean) => void }) {
  return (
    <button 
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 cursor-pointer group bg-white hover:bg-gray-50 transition-colors p-2 rounded-xl"
    >
      <div 
        className={`w-6 h-6 rounded-lg flex items-center justify-center transition-all shadow-sm ${checked ? 'bg-blue-600' : 'bg-gray-100'}`}
      >
        <Plus size={14} className={`transition-all ${checked ? 'text-white' : 'text-gray-400'}`} />
      </div>
      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest select-none group-hover:text-gray-600 transition-colors">{label}</span>
    </button>
  );
}

function PaymentsView({ 
  paymentMethods, 
  setPaymentMethods, 
  customPaymentMethods, 
  setCustomPaymentMethods,
  hiddenPaymentMethods,
  setHiddenPaymentMethods,
  sales,
  addActivity
}: { 
  paymentMethods: string[], 
  setPaymentMethods: any, 
  customPaymentMethods: string[], 
  setCustomPaymentMethods: any,
  hiddenPaymentMethods: string[],
  setHiddenPaymentMethods: any,
  sales: Sale[],
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void
}) {
  const [newMethodName, setNewMethodName] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [methodToDelete, setMethodToDelete] = useState<{id: string, name: string} | null>(null);
  
  const staticMethods = [
    { id: 'DINHEIRO', label: 'DINHEIRO', icon: BadgeDollarSign, color: 'text-green-600 bg-green-50' },
    { id: 'PIX', label: 'PIX', icon: Zap, color: 'text-teal-600 bg-teal-50' },
    { id: 'CARTÃO DE CRÉDITO', label: 'CARTÃO DE CRÉDITO', icon: CreditCard, color: 'text-blue-600 bg-blue-50' },
    { id: 'CARTÃO DE DÉBITO', label: 'CARTÃO DE DÉBITO', icon: CreditCard, color: 'text-indigo-600 bg-indigo-50' },
  ];

  const isUsed = (methodId: string) => sales.some(s => s.paymentMethod === methodId);

  // Compute the full list of manageable payment methods
  const allMethodsList = useMemo(() => {
    const list = [
      ...staticMethods.map(m => ({
        id: m.id,
        name: m.label,
        icon: m.icon,
        color: m.color,
        isCustom: false,
        isHidden: hiddenPaymentMethods.includes(m.id),
        isActive: paymentMethods.includes(m.id)
      })),
      ...customPaymentMethods.map(name => ({
        id: name,
        name: name,
        icon: CreditCard,
        color: 'text-blue-600 bg-blue-50',
        isCustom: true,
        isHidden: false,
        isActive: paymentMethods.includes(name)
      }))
    ];
    // Filter out hidden static ones to keep the list clean
    return list.filter(item => !item.isHidden);
  }, [paymentMethods, customPaymentMethods, hiddenPaymentMethods]);

  const toggleMethod = (methodId: string) => {
    setPaymentMethods((prev: string[]) => {
      const active = prev.includes(methodId);
      if (active) {
        if (prev.length <= 1) {
          alert('Mantenha pelo menos um meio de pagamento ativo para o PDV.');
          return prev;
        }
        return prev.filter(m => m !== methodId);
      }
      return [...prev, methodId];
    });
  };

  const handleAdd = () => {
    const name = newMethodName.trim().toUpperCase();
    if (!name) return;

    // Check duplicates
    const alreadyExists = allMethodsList.some(m => m.name === name);
    if (alreadyExists) {
      alert('Este meio de pagamento já está na lista.');
      return;
    }

    // Check if it's a hidden static method being "restored"
    if (hiddenPaymentMethods.includes(name)) {
      setHiddenPaymentMethods((prev: string[]) => prev.filter(id => id !== name));
      setPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
    } else {
      setCustomPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
      setPaymentMethods((prev: string[]) => prev.includes(name) ? prev : [...prev, name]);
    }

    setNewMethodName('');
    setShowAddForm(false);
    addActivity('system', 'Pagamento Adicionado', `Meio de pagamento "${name}" criado.`);
  };

  const confirmDelete = () => {
    if (!methodToDelete) return;

    const { id } = methodToDelete;
    
    // 1. Remove from the active payment methods (PDV list)
    setPaymentMethods((prev: string[]) => prev.filter(m => m !== id));
    
    // 2. Remove from custom list
    setCustomPaymentMethods((prev: string[]) => prev.filter(m => m !== id));
    
    if (addActivity) {
      addActivity('system', 'Pagamento Excluído', `Meio de pagamento "${id}" removido.`);
    }

    setShowDeleteModal(false);
    setMethodToDelete(null);
  };

  const handleDeleteClick = (e: MouseEvent, method: any) => {
    e.stopPropagation();
    if (!method.isCustom) {
      alert('Não é permitido excluir meios de pagamento padrão.');
      return;
    }
    setMethodToDelete({ id: method.id, name: method.name });
    setShowDeleteModal(true);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Delete Confirmation Modal */}
      {showDeleteModal && methodToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[3rem] w-full max-w-md p-8 shadow-2xl border border-gray-100"
          >
            <div className="flex flex-col items-center text-center space-y-4 mb-8">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center text-red-600 mb-2">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Excluir Meio de Pagamento?</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
                Tem certeza que deseja excluir o meio de pagamento <span className="text-red-500">"{methodToDelete.name}"</span>? Esta ação não afetará o histórico de vendas passadas.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => {
                  setShowDeleteModal(false);
                  setMethodToDelete(null);
                }}
                className="p-4 rounded-2xl border border-gray-100 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={confirmDelete}
                className="p-4 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
              >
                Confirmar Exclusão
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4 md:px-0">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shadow-sm border border-blue-100">
              <CreditCard size={28} />
            </div>
            <div>
              <h2 className="text-3xl font-black text-gray-800 tracking-tighter uppercase leading-none">Pagamentos</h2>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1">Configuração de Meios de Recebimento</p>
            </div>
          </div>
        </div>

        {!showAddForm ? (
          <button 
            onClick={() => setShowAddForm(true)}
            className="bg-[#5d5dff] text-white px-8 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-3 w-full md:w-auto"
          >
            <Plus size={20} /> Novo Meio de Pagamento
          </button>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex gap-2 bg-gray-50 p-2 rounded-2xl border border-gray-100 w-full md:w-96 shadow-sm"
          >
            <input 
              autoFocus
              value={newMethodName}
              onChange={e => setNewMethodName(e.target.value)}
              placeholder="Digite o nome..."
              className="flex-1 bg-transparent px-4 font-black uppercase text-xs outline-none placeholder:text-gray-300"
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <button 
              onClick={handleAdd}
              className="bg-emerald-500 text-white p-3 rounded-xl hover:bg-emerald-600 transition-all active:scale-90"
            >
              <Check size={20} />
            </button>
            <button 
              onClick={() => { setShowAddForm(false); setNewMethodName(''); }}
              className="bg-gray-200 text-gray-500 p-3 rounded-xl hover:bg-gray-300 transition-all active:scale-90"
            >
              <X size={20} />
            </button>
          </motion.div>
        )}
      </div>

      {/* Main List Layout */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden mx-4 md:mx-0">
        <div className="grid grid-cols-1 divide-y divide-gray-50">
          <div className="bg-gray-50/50 px-8 py-4 hidden md:grid grid-cols-12 gap-4 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
            <div className="col-span-1 text-center">#</div>
            <div className="col-span-5">Meio de Pagamento</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-4 text-right">Ações Gerenciais</div>
          </div>

          {allMethodsList.map((method, idx) => (
            <div 
              key={method.id} 
              className={`px-4 md:px-8 py-6 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-4 items-center transition-all group ${!method.isActive ? 'bg-gray-50/30' : 'hover:bg-blue-50/20'}`}
            >
              <div className="hidden md:flex col-span-1 justify-center">
                <span className="text-[10px] font-black text-gray-300">{(idx + 1).toString().padStart(2, '0')}</span>
              </div>
              
              <div className="col-span-1 md:col-span-5 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm ${method.isActive ? method.color : 'bg-gray-100 text-gray-300'}`}>
                  <method.icon size={24} />
                </div>
                <div>
                  <p className={`text-sm font-black uppercase tracking-tight ${method.isActive ? 'text-gray-800' : 'text-gray-400'}`}>
                    {method.name}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                    {method.isCustom ? 'Personalizado' : 'Sistema'}
                  </p>
                </div>
              </div>

              <div className="col-span-1 md:col-span-2 flex justify-start md:justify-center">
                <span className={`text-[9px] font-black uppercase px-3 py-1.5 rounded-full border transition-all ${
                  method.isActive 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : 'bg-gray-100 text-gray-400 border-gray-200'
                }`}>
                  {method.isActive ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div className="col-span-1 md:col-span-4 flex justify-start md:justify-end gap-3 mt-2 md:mt-0">
                <button
                  onClick={() => toggleMethod(method.id)}
                  className={`flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all ${
                    method.isActive
                      ? 'bg-orange-50 text-orange-600 hover:bg-orange-100 border border-orange-100'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-100'
                  }`}
                >
                  {method.isActive ? 'Desativar' : 'Ativar'}
                </button>
                {method.isCustom && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, method)}
                    className="p-3 text-gray-400 hover:text-white hover:bg-red-500 rounded-xl transition-all border border-transparent hover:border-red-600 active:scale-90 shadow-sm"
                    title="Excluir Permanentemente"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
          ))}

          {allMethodsList.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <CreditCard size={48} className="mx-auto text-gray-100" />
              <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Nenhum meio de pagamento configurado</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100 flex items-start gap-6">
        <div className="p-4 bg-white rounded-2xl shadow-sm text-indigo-500">
          <ShieldCheck size={32} />
        </div>
        <div className="space-y-2">
          <h4 className="text-sm font-black text-indigo-900 uppercase tracking-tight">Regras de Negócio & Segurança</h4>
          <p className="text-[11px] font-medium text-indigo-700/70 leading-relaxed italic">
            Para garantir a integridade dos seus relatórios financeiros, meios de pagamento que já possuem movimentação no histórico de vendas não podem ser excluídos permanentemente. Caso deseje parar de usá-los, utilize a função <span className="font-black text-indigo-900 uppercase">Desativar</span>. Eles ficarão ocultos no PDV e na finalização de novas vendas, mas serão preservados nos registros antigos.
          </p>
        </div>
      </div>
    </div>
  );
}

function Input({ label, value, onChange, placeholder = "", type = 'text', onKeyDown, autoFocus }: { label: string, value: any, onChange: (v: string) => void, placeholder?: string, type?: string, onKeyDown?: (e: any) => void, autoFocus?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[9px] font-black text-gray-400 tracking-wider uppercase ml-1">{label}</label>
      <input 
        type={type}
        autoFocus={autoFocus}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        className="p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold transition-all uppercase"
      />
    </div>
  );
}

function LabelPrintModal({ product, labelConfig, onClose, imprimirEtiqueta }: { product: Product, labelConfig: LabelConfig, onClose: () => void, imprimirEtiqueta: (product: Product, qty: number) => Promise<boolean> }) {
  const [quantity, setQuantity] = useState('1');

  const handlePrint = async () => {
    const qty = parseInt(quantity) || 1;
    await imprimirEtiqueta(product, qty);
    onClose();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-[3rem] max-w-sm w-full space-y-8 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-8 right-8 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
          <X size={20} />
        </button>
        
        <div className="text-center space-y-3">
          <div className="w-20 h-20 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white shadow-xl">
            <Tag size={32} />
          </div>
          <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Gerar Etiquetas</h4>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
            {product.name}<br/>
            <span className="text-blue-500">{labelConfig.width}x{labelConfig.height}mm • {labelConfig.sheetType === 'a4' ? 'Folha A4' : 'Térmica'}</span>
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Quantidade de Etiquetas</label>
            <input 
              type="number"
              value={quantity}
              onChange={e => setQuantity(e.target.value)}
              className="w-full p-5 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-4 focus:ring-blue-100 text-lg font-black text-center transition-all"
              placeholder="1"
              autoFocus
            />
          </div>

          <div className="flex gap-4">
            <button onClick={onClose} className="flex-1 p-5 rounded-2xl bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all">
              Cancelar
            </button>
            <button 
              onClick={handlePrint} 
              className="flex-1 p-5 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
            >
              <Printer size={18} /> Imprimir
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ProductView({ 
  products, 
  setProducts, 
  setView, 
  categories,
  setCategories,
  subcategories,
  setSubcategories,
  addActivity,
  labelConfig,
  imprimirEtiqueta,
  calculateProductCost
}: { 
  products: Product[], 
  setProducts: any, 
  setView: (v: View) => void, 
  categories: Category[],
  setCategories: any,
  subcategories: Subcategory[],
  setSubcategories: any,
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  labelConfig: LabelConfig,
  imprimirEtiqueta: (product: Product, qty: number) => Promise<boolean>,
  calculateProductCost: (productId: string) => number
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedLabelProduct, setSelectedLabelProduct] = useState<Product | null>(null);
  const [showWholesaleFields, setShowWholesaleFields] = useState(false);
  const [newProduct, setNewProduct] = useState({ 
    name: '', 
    price: '', 
    costPrice: '', 
    stock: '', 
    wholesalePrice: '',
    wholesaleMinQty: '',
    categoryId: '', 
    subcategoryId: '', 
    sku: '', 
    imageUrl: '' 
  });
  const [searchTerm, setSearchTerm] = useState('');
  
  // Category management state
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newSubCatName, setNewSubCatName] = useState('');
  const [selectedCatId, setSelectedCatId] = useState('');

  const addCategory = () => {
    if (!newCatName) return;
    const cat: Category = { id: crypto.randomUUID(), name: newCatName };
    setCategories([...categories, cat]);
    setNewCatName('');
  };

  const removeCategory = (id: string) => {
    if (confirm('Remover esta categoria removerá também todas as suas subcategorias. Continuar?')) {
      setCategories(categories.filter(c => c.id !== id));
      setSubcategories(subcategories.filter(s => s.categoryId !== id));
    }
  };

  const addSubcategory = () => {
    if (!newSubCatName || !selectedCatId) return;
    const sub: Subcategory = { id: crypto.randomUUID(), categoryId: selectedCatId, name: newSubCatName };
    setSubcategories([...subcategories, sub]);
    setNewSubCatName('');
  };

  const removeSubcategory = (id: string) => {
    setSubcategories(subcategories.filter(s => s.id !== id));
  };

  const generateBarcode = () => {
    const randomCode = Math.floor(100000000000 + Math.random() * 900000000000).toString();
    setNewProduct({ ...newProduct, sku: randomCode });
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const saveProduct = () => {
    if (!newProduct.name || !newProduct.price) return;
    
    if (!newProduct.sku) {
      alert('⚠️ CÓDIGO DE BARRAS OBRIGATÓRIO! Por favor, gere ou insira um código de barras antes de salvar.');
      return;
    }
    
    if (editingId) {
      const oldProduct = products.find(p => p.id === editingId);
      if (oldProduct) {
        const fields = [
          { key: 'name', label: 'Nome' },
          { key: 'price', label: 'Preço' },
          { key: 'costPrice', label: 'Custo' },
          { key: 'stock', label: 'Estoque' },
          { key: 'categoryId', label: 'Categoria' },
          { key: 'subcategoryId', label: 'Subcategoria' },
          { key: 'sku', label: 'SKU' },
          { key: 'wholesalePrice', label: 'Preço Atacado' },
          { key: 'wholesaleMinQty', label: 'Qtd Mín. Atacado' },
        ];

        fields.forEach(field => {
          const newVal = newProduct[field.key as keyof typeof newProduct];
          const oldVal = String(oldProduct[field.key as keyof Product] || '');
          const compareVal = String(newVal || '');
          
          if (compareVal !== oldVal) {
            addActivity('product_edit', 'Edição de Produto', `Alterado ${field.label} de "${oldProduct.name}"`, {
              productId: editingId,
              productName: oldProduct.name,
              field: field.label,
              oldValue: oldVal,
              newValue: compareVal
            });
          }
        });
      }

      setProducts(products.map(p => p.id === editingId ? {
        ...p,
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        stock: parseInt(newProduct.stock) || 0,
        wholesalePrice: parseFloat(newProduct.wholesalePrice) || undefined,
        wholesaleMinQty: parseInt(newProduct.wholesaleMinQty) || undefined,
        categoryId: newProduct.categoryId,
        subcategoryId: newProduct.subcategoryId,
        sku: newProduct.sku,
        imageUrl: newProduct.imageUrl
      } : p));
      setEditingId(null);
      setShowForm(false);
      alert('Produto atualizado com sucesso');
    } else {
      const product: Product = {
        id: crypto.randomUUID(),
        name: newProduct.name,
        price: parseFloat(newProduct.price),
        costPrice: parseFloat(newProduct.costPrice) || 0,
        stock: parseInt(newProduct.stock) || 0,
        wholesalePrice: parseFloat(newProduct.wholesalePrice) || undefined,
        wholesaleMinQty: parseInt(newProduct.wholesaleMinQty) || undefined,
        categoryId: newProduct.categoryId,
        subcategoryId: newProduct.subcategoryId,
        sku: newProduct.sku,
        imageUrl: newProduct.imageUrl
      };
      setProducts([...products, product]);
      addActivity('product', 'Novo Produto', `O produto ${product.name} foi cadastrado.`);
      setShowForm(false);
      alert('Produto cadastrado com sucesso');
    }
    setNewProduct({ name: '', price: '', costPrice: '', stock: '', wholesalePrice: '', wholesaleMinQty: '', categoryId: '', subcategoryId: '', sku: '', imageUrl: '' });
  };

  const editProduct = (p: Product) => {
    setEditingId(p.id);
    setNewProduct({
      name: p.name,
      price: p.price.toString(),
      costPrice: p.costPrice?.toString() || '',
      stock: p.stock.toString(),
      wholesalePrice: p.wholesalePrice?.toString() || '',
      wholesaleMinQty: p.wholesaleMinQty?.toString() || '',
      categoryId: p.categoryId || '',
      subcategoryId: p.subcategoryId || '',
      sku: p.sku || '',
      imageUrl: p.imageUrl || ''
    });
    setShowForm(true);
  };

  const removeProduct = (id: string) => {
    const product = products.find(p => p.id === id);
    if (confirm('Tem certeza que deseja remover este item?')) {
      if (product) {
        addActivity('product', 'Produto Excluído', `O produto ${product.name} foi removido do estoque.`);
      }
      setProducts(products.filter(p => p.id !== id));
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const filteredProducts = products.filter(p => {
    const catName = categories.find(c => c.id === p.categoryId)?.name || p.category || '';
    const subCatName = subcategories.find(s => s.id === p.subcategoryId)?.name || '';
    const searchLower = searchTerm.toLowerCase();
    return (
      p.name.toLowerCase().includes(searchLower) || 
      p.sku?.toLowerCase().includes(searchLower) ||
      catName.toLowerCase().includes(searchLower) ||
      subCatName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
            <Boxes size={24} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter leading-none">Estoque</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Gestão de produtos e saldos</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCategoryManager(!showCategoryManager)}
            className="flex items-center gap-2 text-[10px] font-black text-gray-500 uppercase tracking-widest bg-gray-50 px-4 py-3 rounded-2xl hover:bg-gray-100 transition-colors border border-gray-100"
          >
            <LayoutGrid size={16} />
            Categorias
          </button>
          
          <button 
            onClick={() => {
              setEditingId(null);
              setNewProduct({ name: '', price: '', costPrice: '', stock: '', wholesalePrice: '', wholesaleMinQty: '', categoryId: '', subcategoryId: '', sku: '', imageUrl: '' });
              setShowForm(true);
            }}
            className="flex items-center gap-2 text-[10px] font-black text-white uppercase tracking-widest bg-[#5d5dff] px-6 py-3 rounded-2xl hover:bg-blue-600 transition-all shadow-lg shadow-blue-100"
          >
            <Plus size={16} /> Novo Produto
          </button>
        </div>
      </div>

      {/* Category Manager */}
      <AnimatePresence>
        {showCategoryManager && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden bg-white rounded-3xl border border-gray-100 shadow-sm"
          >
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Categories */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Categorias Principais</label>
                <div className="flex gap-2">
                  <input 
                    placeholder="Nome da categoria..." 
                    className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                  />
                  <button onClick={addCategory} className="bg-[#5d5dff] text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {categories.map(c => (
                    <div key={c.id} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${selectedCatId === c.id ? 'border-[#5d5dff] bg-blue-50' : 'border-gray-50 bg-gray-50/50 hover:bg-gray-100'}`} onClick={() => setSelectedCatId(c.id)}>
                      <span className="text-[10px] font-bold uppercase">{c.name}</span>
                      <button onClick={(e) => { e.stopPropagation(); removeCategory(c.id); }} className="text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhuma categoria criada.</p>}
                </div>
              </div>

              {/* Subcategories */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">
                  Subcategorias {selectedCatId ? `de ${categories.find(c => c.id === selectedCatId)?.name}` : ''}
                </label>
                <div className="flex gap-2">
                  <input 
                    placeholder="Nome da subcategoria..." 
                    className="flex-1 p-3 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all disabled:opacity-50"
                    value={newSubCatName}
                    onChange={e => setNewSubCatName(e.target.value)}
                    disabled={!selectedCatId}
                  />
                  <button onClick={addSubcategory} disabled={!selectedCatId} className="bg-[#5d5dff] text-white px-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all disabled:opacity-50">
                    <Plus size={16} />
                  </button>
                </div>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {subcategories.filter(s => s.categoryId === selectedCatId).map(s => {
                    const cat = categories.find(c => c.id === selectedCatId);
                    return (
                      <div key={s.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-50 bg-gray-50/50">
                        <span className="text-[10px] font-bold uppercase">{cat?.name} &gt; {s.name}</span>
                        <button onClick={() => removeSubcategory(s.id)} className="text-gray-300 hover:text-red-500 transition-colors">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {!selectedCatId && <p className="text-[10px] text-gray-400 italic text-center py-4">Selecione uma categoria para gerenciar subcategorias.</p>}
                  {selectedCatId && subcategories.filter(s => s.categoryId === selectedCatId).length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-4">Nenhuma subcategoria para esta categoria.</p>}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[3rem] shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-8 custom-scrollbar relative"
            >
              <button 
                onClick={() => {
                  setShowForm(false);
                  setEditingId(null);
                  setNewProduct({ name: '', price: '', costPrice: '', stock: '', wholesalePrice: '', wholesaleMinQty: '', categoryId: '', subcategoryId: '', sku: '', imageUrl: '' });
                }}
                className="absolute top-8 right-8 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
              >
                <X size={24} />
              </button>

              <div className="mb-8">
                <h4 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
                  {editingId ? 'Editar Produto' : 'Novo Produto'}
                </h4>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                  Preencha as informações abaixo para {editingId ? 'atualizar o item' : 'cadastrar no estoque'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {/* Left Column: Image */}
                <div className="md:col-span-1 flex flex-col items-center gap-4">
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full aspect-square bg-gray-50 rounded-[2.5rem] border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#5d5dff] hover:bg-blue-50/30 text-gray-400 overflow-hidden relative group transition-all"
                  >
                    {newProduct.imageUrl ? (
                      <>
                        <img src={newProduct.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px] font-black uppercase">
                          Alterar Foto
                        </div>
                      </>
                    ) : (
                      <>
                        <ImageIcon size={32} className="mb-2 opacity-50" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Foto</span>
                      </>
                    )}
                    <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
                  </div>
                </div>

                {/* Right Column: Fields */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="md:col-span-2 lg:col-span-2">
                    <Input label="NOME DO PRODUTO" value={newProduct.name} onChange={v => setNewProduct({...newProduct, name: v})} placeholder="Ex: Camiseta Oversized" />
                  </div>

                  <div className="col-span-1">
                    <Input label="CUSTO (R$)" value={newProduct.costPrice} onChange={v => setNewProduct({...newProduct, costPrice: v})} placeholder="0.00" type="number" />
                  </div>

                  <div className="col-span-1">
                    <Input label="VENDAVAREJO (R$)" value={newProduct.price} onChange={v => setNewProduct({...newProduct, price: v})} placeholder="0.00" type="number" />
                  </div>

                  <div className="md:col-span-1 lg:col-span-1">
                    <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase mb-2 block ml-1">CÓD. BARRAS / EAN *</label>
                    <div className="relative group">
                      <input 
                        placeholder="DIGITE OU BIPE" 
                        className="w-full p-4 pr-12 bg-gray-100 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#5d5dff] text-sm font-black uppercase transition-all"
                        value={newProduct.sku}
                        onChange={e => setNewProduct({...newProduct, sku: e.target.value})}
                      />
                      <button 
                        onClick={generateBarcode} 
                        type="button"
                        className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-white shadow-sm flex items-center justify-center text-[#5d5dff] hover:bg-[#5d5dff] hover:text-white transition-all group/btn"
                      >
                        <ScanLine size={16} />
                      </button>
                    </div>
                  </div>

                  <div className="col-span-1">
                    <Input label="ESTOQUE ATUAL" value={newProduct.stock} onChange={v => setNewProduct({...newProduct, stock: v})} placeholder="0" type="number" />
                  </div>

                  <div className="md:col-span-1 flex flex-col justify-end">
                    <button 
                       onClick={() => setShowWholesaleFields(!showWholesaleFields)}
                       className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${showWholesaleFields ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      <BadgeDollarSign size={14} /> Atacado {showWholesaleFields ? 'On' : 'Off'}
                    </button>
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-blue-400 tracking-[0.2em] uppercase mb-2 block ml-1">CATEGORIA</label>
                    <select 
                      value={newProduct.categoryId} 
                      onChange={e => setNewProduct({...newProduct, categoryId: e.target.value, subcategoryId: ''})}
                      className="w-full p-4 bg-blue-50/50 rounded-2xl border border-blue-100 outline-none focus:ring-2 focus:ring-[#5d5dff] text-sm font-bold uppercase cursor-pointer"
                    >
                      <option value="">Sem Categoria</option>
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-1">
                    <label className="text-[10px] font-black text-rose-400 tracking-[0.2em] uppercase mb-2 block ml-1">SUBCATEGORIA</label>
                    <select 
                      value={newProduct.subcategoryId} 
                      onChange={e => setNewProduct({...newProduct, subcategoryId: e.target.value})}
                      disabled={!newProduct.categoryId}
                      className="w-full p-4 bg-rose-50/50 rounded-2xl border border-rose-100 outline-none focus:ring-2 focus:ring-[#5d5dff] text-sm font-bold uppercase cursor-pointer disabled:opacity-50"
                    >
                      <option value="">Sem Subcategoria</option>
                      {subcategories.filter(s => s.categoryId === newProduct.categoryId).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  {showWholesaleFields && (
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="lg:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-orange-50/50 rounded-3xl border border-orange-100 mt-2">
                      <Input label="PREÇO ATACADO (R$)" value={newProduct.wholesalePrice} onChange={v => setNewProduct({...newProduct, wholesalePrice: v})} placeholder="0.00" type="number" />
                      <Input label="MÍNIMO ATACADO" value={newProduct.wholesaleMinQty} onChange={v => setNewProduct({...newProduct, wholesaleMinQty: v})} placeholder="Quantidade" type="number" />
                    </motion.div>
                  )}
                </div>
              </div>

              <div className="mt-12 flex justify-end gap-4 border-t border-gray-100 pt-8">
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setNewProduct({ name: '', price: '', costPrice: '', stock: '', wholesalePrice: '', wholesaleMinQty: '', categoryId: '', subcategoryId: '', sku: '', imageUrl: '' });
                  }}
                  className="px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest text-gray-400 hover:bg-gray-100 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveProduct} 
                  className="bg-[#5d5dff] text-white px-10 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl shadow-blue-100 flex items-center gap-3"
                >
                  <Save size={16} /> {editingId ? 'Salvar Alterações' : 'Finalizar Cadastro'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stock List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              placeholder="Pesquisar no estoque..." 
              className="w-full pl-12 pr-4 py-3 bg-white rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-[#5d5dff] text-sm font-medium"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {filteredProducts.map(p => (
            <div key={p.id} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-col sm:flex-row items-center gap-6 hover:shadow-md transition-shadow group">
              {/* Product Thumbnail */}
              <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden shrink-0 border border-gray-100">
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <Package size={24} className="text-gray-300" />
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0 text-center sm:text-left">
                <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                  <h4 className="font-black text-gray-800 uppercase tracking-tight truncate max-w-[200px]">{p.name}</h4>
                  <button onClick={() => editProduct(p)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                    <Pencil size={14} />
                  </button>
                </div>
                <div className="flex flex-wrap justify-center sm:justify-start gap-x-4 gap-y-1">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest whitespace-nowrap">SKU: {p.sku || 'N/A'}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-black bg-blue-50 text-blue-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                      {categories.find(c => c.id === p.categoryId)?.name || p.category || 'Geral'}
                    </span>
                    {p.subcategoryId && (
                      <span className="text-[9px] font-black bg-rose-50 text-rose-500 px-2 py-0.5 rounded-full uppercase tracking-widest">
                        {subcategories.find(s => s.id === p.subcategoryId)?.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Prices */}
              <div className="flex items-center gap-8 text-center sm:text-left">
                <div>
                  <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest mb-0.5">Custo</p>
                  <p className="font-bold text-gray-600 text-sm italic">R$ {calculateProductCost(p.id).toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-blue-300 uppercase tracking-widest mb-0.5">Venda</p>
                  <div className="flex items-center gap-1 justify-center sm:justify-start">
                    <p className="font-black text-blue-600">R$ {p.price.toFixed(2)}</p>
                    <button onClick={() => editProduct(p)} className="p-1 text-gray-300 hover:text-blue-500 transition-colors">
                      <Pencil size={12} />
                    </button>
                  </div>
                </div>
                <div className="px-6 py-2 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 text-center">Saldo</p>
                  <p className={`font-black text-lg leading-tight text-center ${p.stock < 5 ? 'text-red-500' : 'text-gray-800'}`}>{p.stock}</p>
                </div>
              </div>

              <div className="flex gap-2 w-full sm:w-auto items-center">
                <button 
                  onClick={() => removeProduct(p.id)}
                  className="p-3 text-gray-300 hover:text-red-500 transition-colors flex items-center justify-center"
                >
                  <Trash2 size={20} />
                </button>
                <button 
                  onClick={() => setSelectedLabelProduct(p)}
                  className="p-3 text-blue-300 hover:text-blue-500 transition-colors flex items-center justify-center"
                  title="Imprimir Etiqueta"
                >
                  <Tag size={20} />
                </button>
              </div>
            </div>
          ))}
          {filteredProducts.length === 0 && (
            <div className="py-20 text-center">
              <Package size={64} className="mx-auto mb-4 text-gray-100" />
              <p className="text-gray-400 font-medium italic">Nenhum produto cadastrado no estoque.</p>
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {selectedLabelProduct && (
          <LabelPrintModal 
            product={selectedLabelProduct} 
            labelConfig={labelConfig} 
            onClose={() => setSelectedLabelProduct(null)} 
            imprimirEtiqueta={imprimirEtiqueta}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CustomerView({ 
  customers, 
  setCustomers, 
  addActivity, 
  sales, 
  imprimirCupom, 
  company, 
  couponConfig,
  products,
  goldCustomerIds
}: { 
  customers: Customer[], 
  setCustomers: any, 
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  sales: Sale[],
  imprimirCupom: (sale: Sale | string) => Promise<boolean>,
  company: any,
  couponConfig: CouponConfig,
  products: Product[],
  goldCustomerIds: Set<string>
}) {
  const [showForm, setShowForm] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingSale, setViewingSale] = useState<Sale | null>(null);
  const [newCustomer, setNewCustomer] = useState({ 
    name: '', 
    email: '', 
    whatsapp: '', 
    dob: '', 
    taxId: '',
    image: '',
    address: {
      cep: '',
      street: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
      complement: ''
    }
  });

  const [isDeleting, setIsDeleting] = useState(false);
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

  const checkBirthday = (dob: string) => {
    if (!dob) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const parts = dob.split('/');
    if (parts.length < 2) return false;
    
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]);
    if (isNaN(day) || isNaN(month)) return false;
    
    // Check for this year
    let bday = new Date(today.getFullYear(), month - 1, day);
    
    // If it already passed more than 7 days ago this year, consider next year
    // But for "coming in 7 days", we check window [today, today + 7]
    
    const diffTime = bday.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // If birthday is in the past this year, check if it's very close (next year case for Dec -> Jan)
    if (diffDays < 0) {
      const bdayNext = new Date(today.getFullYear() + 1, month - 1, day);
      const diffTimeNext = bdayNext.getTime() - today.getTime();
      const diffDaysNext = Math.ceil(diffTimeNext / (1000 * 60 * 60 * 24));
      return diffDaysNext >= 0 && diffDaysNext <= 7;
    }

    return diffDays >= 0 && diffDays <= 7;
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCustomer({ ...newCustomer, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDobChange = (v: string) => {
    // Remove non-digits
    const digits = v.replace(/\D/g, '');
    let formatted = '';
    
    if (digits.length <= 2) {
      formatted = digits;
    } else if (digits.length <= 4) {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
    } else {
      formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4, 8)}`;
    }
    
    setNewCustomer({ ...newCustomer, dob: formatted });
  };

  const addCustomer = () => {
    if (!newCustomer.name) return alert('O nome do cliente é obrigatório.');
    
    if (newCustomer.dob) {
      if (checkBirthday(newCustomer.dob)) {
        alert(`🎉 ALERTA DE ANIVERSÁRIO!\nO aniversário de ${newCustomer.name} é nos próximos 7 dias!`);
      }
    }

    let clientToSelect: Customer | null = null;

    if (editingId) {
      setCustomers((prev: Customer[]) => prev.map(c => {
        if (c.id === editingId) {
          const updated = { ...c, ...newCustomer };
          clientToSelect = updated;
          addActivity('customer', 'Cliente Editado', `Dados de ${updated.name} atualizados.`);
          return updated;
        }
        return c;
      }));
      setEditingId(null);
    } else {
      const uuid = crypto.randomUUID();
      const client: Customer = {
        id: uuid,
        displayId: `CUST-${uuid.substring(0, 4).toUpperCase()}`,
        ...newCustomer,
        debt: 0
      };
      setCustomers((prev: Customer[]) => [...prev, client]);
      addActivity('customer', 'Novo Cliente', `Cliente ${client.name} cadastrado com ID ${client.displayId}.`);
    }

    setNewCustomer({ 
      name: '', email: '', whatsapp: '', dob: '', taxId: '', image: '',
      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' }
    });
    setShowForm(false);
    setSelectedCustomer(clientToSelect);
  };

  const handleEdit = (customer: Customer) => {
    setNewCustomer({
      name: customer.name || '',
      email: customer.email || '',
      whatsapp: customer.whatsapp || customer.phone || '',
      dob: customer.dob || '',
      taxId: customer.taxId || '',
      image: customer.image || '',
      address: {
        cep: customer.address?.cep || '',
        street: customer.address?.street || '',
        number: customer.address?.number || '',
        neighborhood: customer.address?.neighborhood || '',
        city: customer.address?.city || '',
        state: customer.address?.state || '',
        complement: customer.address?.complement || ''
      }
    });
    setEditingId(customer.id);
    setShowForm(true);
    setSelectedCustomer(null);
  };

  const confirmDelete = () => {
    if (selectedCustomer) {
      addActivity('customer', 'Cliente Excluído', `Cliente ${selectedCustomer.name} (${selectedCustomer.displayId}) removido do sistema.`);
      setCustomers((prev: Customer[]) => prev.filter(c => c.id !== selectedCustomer.id));
      setSelectedCustomer(null);
      setIsDeleting(false);
    }
  };

  const filteredCustomers = customers.filter(c => {
    const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      c.whatsapp?.includes(searchTerm) || 
      c.phone?.includes(searchTerm) || 
      c.taxId?.includes(searchTerm);
    
    const matchesLetter = activeLetter ? c.name.toUpperCase().startsWith(activeLetter) : true;
    
    return matchesSearch && matchesLetter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">
          {selectedCustomer ? `Perfil: ${selectedCustomer.name}` : showForm ? (editingId ? 'Editar Cliente' : 'Cadastro de Cliente') : 'Gestão de Clientes'}
        </h3>
        <button 
          onClick={() => {
            if (selectedCustomer) {
              setSelectedCustomer(null);
            } else if (showForm) {
              setShowForm(false);
              setEditingId(null);
              setNewCustomer({
                name: '', email: '', whatsapp: '', dob: '', taxId: '', image: '',
                address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' }
              });
            }
          }}
          className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-sm ${
            showForm || selectedCustomer
            ? 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100' 
            : 'hidden'
          }`}
        >
          <ArrowLeft size={16} /> Voltar para Lista
        </button>
        {!showForm && !selectedCustomer && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-[#5d5dff] text-white hover:bg-blue-700 shadow-lg shadow-blue-100"
          >
            <Plus size={16} /> Novo Cliente
          </button>
        )}
      </div>

      {/* Birthday Alert Section */}
      {!showForm && !selectedCustomer && (
        <div className="space-y-2">
          {customers.filter(c => checkBirthday(c.dob || '')).map(c => (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              key={`bday-alert-${c.id}`}
              className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center text-red-500">
                  <Cake size={20} />
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest leading-none mb-1">Alerta de Aniversário</h4>
                  <p className="text-xs font-bold text-gray-700">O cliente <span className="text-red-600">{c.name}</span> faz aniversário em breve!</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedCustomer(c)}
                className="px-4 py-2 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-red-700 transition-all"
              >
                Ver Perfil
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence mode="wait">
        {selectedCustomer ? (
          <motion.div
            key="profile"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="relative group">
                    {selectedCustomer.image ? (
                      <img 
                        src={selectedCustomer.image} 
                        className="w-32 h-32 rounded-3xl object-cover border-4 border-white shadow-xl"
                        alt={selectedCustomer.name}
                      />
                    ) : (
                      <div className="w-32 h-32 rounded-3xl bg-blue-50 text-[#5d5dff] flex items-center justify-center font-black text-3xl uppercase border-4 border-white shadow-xl">
                        {selectedCustomer.name.substring(0, 2)}
                      </div>
                    )}
                    <div className="absolute -bottom-2 right-0 bg-[#5d5dff] text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg">
                      {selectedCustomer.displayId || 'REF-N/A'}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-3">
                      <h4 className="font-black text-2xl text-gray-800 uppercase tracking-tighter">{selectedCustomer.name}</h4>
                      {goldCustomerIds.has(selectedCustomer.id) && (
                        <div className="flex items-center gap-1 bg-amber-500 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg shadow-amber-100">
                          <Star size={10} fill="currentColor" />
                          CLIENTE OURO
                        </div>
                      )}
                    </div>
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-1">UUID: {selectedCustomer.id.substring(0, 18)}...</p>
                  </div>
                  <div className="w-full pt-4 border-t border-gray-50">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dívida Total</p>
                    <p className={`text-2xl font-black ${selectedCustomer.debt > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      R$ {selectedCustomer.debt.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase border-b border-gray-50 pb-2">Informações de Contato</h5>
                    <div className="space-y-4">
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">E-mail</p>
                        <p className="text-sm font-bold text-gray-700">{selectedCustomer.email || 'Nenhum e-mail cadastrado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">WhatsApp / Telefone</p>
                        <p className="text-sm font-bold text-gray-700">{selectedCustomer.whatsapp || selectedCustomer.phone || 'Nenhum contato cadastrado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">CPF / CNPJ</p>
                        <p className="text-sm font-bold text-gray-700">{selectedCustomer.taxId || 'Não informado'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Data de Nascimento</p>
                        <p className="text-sm font-bold text-gray-700">{selectedCustomer.dob || 'Não informado'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h5 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase border-b border-gray-50 pb-2">Endereço de Entrega</h5>
                    {selectedCustomer.address?.street ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">CEP</p>
                            <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.cep}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Número</p>
                            <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.number}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Logradouro</p>
                          <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.street}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Bairro</p>
                          <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.neighborhood}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Cidade</p>
                            <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.city}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Estado</p>
                            <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.state}</p>
                          </div>
                        </div>
                        {selectedCustomer.address.complement && (
                          <div>
                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Complemento</p>
                            <p className="text-sm font-bold text-gray-700">{selectedCustomer.address.complement}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center text-center p-8 bg-gray-50 rounded-2xl">
                        <p className="text-xs font-black text-gray-300 uppercase tracking-widest">Nenhum endereço cadastrado</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Purchase History */}
              <div className="mt-12 pt-12 border-t border-gray-50 space-y-6">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">Histórico de Compras</h4>
                  <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{sales.filter(s => s.customerId === selectedCustomer.id).length} Pedidos localizados</p>
                </div>

                <div className="bg-gray-50/50 rounded-3xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100/50 text-[8px] font-black text-gray-400 uppercase tracking-[0.2em]">
                        <th className="px-6 py-4">Data</th>
                        <th className="px-6 py-4">Itens</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Total</th>
                        <th className="px-6 py-4 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {sales.filter(s => s.customerId === selectedCustomer.id)
                        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map(sale => (
                        <tr key={sale.id} className="hover:bg-white transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-gray-600 block">{new Date(sale.date).toLocaleDateString('pt-BR')}</span>
                            <span className="text-[8px] font-black text-gray-400 uppercase">{new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter truncate max-w-[200px]">
                              {sale.items.length} {sale.items.length === 1 ? 'Produto' : 'Produtos'}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest ${
                              sale.status === 'cancelado' ? 'bg-red-50 text-red-500' : 
                              sale.status === 'entregue' || !sale.status ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-500'
                            }`}>
                              {sale.status || 'Finalizado'}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-[10px] font-black text-gray-900">R$ {sale.total.toFixed(2)}</p>
                          </td>
                          <td className="px-6 py-4 text-right">
                             <button 
                               onClick={() => setViewingSale(sale)}
                               className="p-2.5 bg-white border border-gray-100 text-gray-400 rounded-xl hover:text-blue-600 hover:border-blue-100 transition-all shadow-sm group-hover:scale-110"
                               title="Ver Detalhes"
                             >
                               <Tag size={14} />
                             </button>
                          </td>
                        </tr>
                      ))}
                      {sales.filter(s => s.customerId === selectedCustomer.id).length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-6 py-12 text-center opacity-30">
                            <div className="flex flex-col items-center gap-2">
                              <ShoppingBag size={32} />
                              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma compra realizada</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-12 pt-8 border-t border-gray-50 flex flex-wrap justify-between gap-4">
                <div className="flex items-center gap-4">
                  {isDeleting ? (
                    <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-xl border border-red-100">
                      <p className="text-[10px] font-black text-red-600 uppercase px-3">Confirmar exclusão?</p>
                      <button 
                        onClick={confirmDelete}
                        className="bg-red-500 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-red-600 transition-all"
                      >
                        Sim
                      </button>
                      <button 
                        onClick={() => setIsDeleting(false)}
                        className="bg-gray-200 text-gray-500 px-4 py-2 rounded-lg font-black text-[10px] uppercase hover:bg-gray-300 transition-all"
                      >
                        Não
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setIsDeleting(true)}
                      className="px-6 py-4 rounded-xl border border-red-100 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-50 transition-all flex items-center gap-2"
                    >
                      <Trash2 size={16} /> Excluir Cliente
                    </button>
                  )}
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={() => {
                      if (selectedCustomer) handleEdit(selectedCustomer);
                    }}
                    className="bg-gray-100 text-gray-500 px-6 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2"
                  >
                    <UserPlus size={16} /> Editar Dados
                  </button>
                  <button className="bg-[#5d5dff] text-white px-8 py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
                    <Zap size={16} /> Registrar Venda
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        ) : showForm ? (
          <motion.div 
            key="form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="p-6 space-y-8">
              <div className="flex flex-col md:flex-row gap-8 items-start">
                <div className="shrink-0 space-y-4">
                  <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase block">Foto do Cliente (Estilo 3x4)</label>
                  <div className="relative group w-40 h-48 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center overflow-hidden hover:border-[#5d5dff] transition-all cursor-pointer">
                    {newCustomer.image ? (
                      <>
                        <img src={newCustomer.image} className="w-full h-full object-cover" alt="Preview" />
                        <button 
                          onClick={() => setNewCustomer({...newCustomer, image: ''})}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X size={12} />
                        </button>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-400">
                          <UserPlus size={20} />
                        </div>
                        <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-4 text-center">Clique para subir foto 3x4</p>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex-1 space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase block">Dados Pessoais (Obrigatório: Nome)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <Input label="Nome Completo *" value={newCustomer.name} onChange={v => setNewCustomer({...newCustomer, name: v})} placeholder="Ex: João Silva" />
                      </div>
                      <Input label="E-mail" value={newCustomer.email} onChange={v => setNewCustomer({...newCustomer, email: v})} placeholder="joao@email.com" />
                      <Input label="WhatsApp" value={newCustomer.whatsapp} onChange={v => setNewCustomer({...newCustomer, whatsapp: v})} placeholder="(11) 99999-9999" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Input label="Data de Nasc." value={newCustomer.dob} onChange={handleDobChange} placeholder="DD/MM/AAAA" />
                <Input label="CPF / CNPJ" value={newCustomer.taxId} onChange={v => setNewCustomer({...newCustomer, taxId: v})} placeholder="000.000.000-00" />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase block">Endereço (Opcional)</label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Input label="CEP" value={newCustomer.address.cep} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, cep: v}})} placeholder="00000-000" />
                  <div className="md:col-span-2">
                    <Input label="Logradouro" value={newCustomer.address.street} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, street: v}})} placeholder="Rua, Avenida, etc." />
                  </div>
                  <Input label="Número" value={newCustomer.address.number} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, number: v}})} placeholder="123" />
                  <Input label="Bairro" value={newCustomer.address.neighborhood} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, neighborhood: v}})} placeholder="Ex: Centro" />
                  <Input label="Cidade" value={newCustomer.address.city} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, city: v}})} placeholder="Sua Cidade" />
                  <Input label="Estado" value={newCustomer.address.state} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, state: v}})} placeholder="UF" />
                  <Input label="Complemento" value={newCustomer.address.complement} onChange={v => setNewCustomer({...newCustomer, address: {...newCustomer.address, complement: v}})} placeholder="Apto, Sala, etc." />
                </div>
              </div>

              <div className="flex justify-end items-center gap-4 pt-4">
                <button 
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setNewCustomer({
                      name: '', email: '', whatsapp: '', dob: '', taxId: '', image: '',
                      address: { cep: '', street: '', number: '', neighborhood: '', city: '', state: '', complement: '' }
                    });
                  }}
                  className="px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={addCustomer}
                  className="bg-[#5d5dff] text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center gap-2"
                >
                  {editingId ? <Check size={18} /> : <Plus size={18} />}
                  {editingId ? 'Salvar Alterações' : 'Salvar Cliente'}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="list"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            <div className="flex flex-wrap gap-1 justify-center py-2 border-b border-gray-50">
              <button 
                onClick={() => setActiveLetter(null)}
                className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${!activeLetter ? 'bg-[#5d5dff] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
              >
                TUDO
              </button>
              {alphabet.map(l => (
                <button 
                  key={l}
                  onClick={() => setActiveLetter(activeLetter === l ? null : l)}
                  className={`w-8 h-8 rounded-lg text-[10px] font-black transition-all ${activeLetter === l ? 'bg-[#5d5dff] text-white shadow-md' : 'text-gray-400 hover:bg-gray-100'}`}
                >
                  {l}
                </button>
              ))}
            </div>

            <div className="relative">
              <input 
                type="text"
                placeholder="BUSCAR CLIENTE POR NOME, TELEFONE OU CPF..."
                className="w-full p-6 bg-gray-50 border border-gray-100 rounded-3xl outline-none focus:ring-2 focus:ring-blue-400 text-xs font-black uppercase tracking-widest transition-all pr-14"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-300">
                <UserPlus size={20} />
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50 text-[8px] font-black text-gray-400 uppercase tracking-widest">
                      <th className="px-6 py-4">Cliente</th>
                      <th className="px-6 py-4">Whatsapp / Telefone</th>
                      <th className="px-6 py-4">CPF / CNPJ</th>
                      <th className="px-6 py-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredCustomers.map(c => (
                      <tr 
                        key={c.id} 
                        onClick={() => setSelectedCustomer(c)}
                        className="hover:bg-blue-50/20 transition-colors cursor-pointer group"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-3">
                            {c.image ? (
                              <img 
                                src={c.image} 
                                className="w-8 h-8 rounded-lg object-cover shrink-0 border border-gray-100 shadow-sm"
                                alt={c.name}
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#5d5dff] flex items-center justify-center font-black text-[10px] uppercase shrink-0 border border-gray-100">
                                {c.name.substring(0, 2)}
                              </div>
                            )}
                            <div className="flex flex-col">
                              <div className="flex items-center gap-2">
                                <h4 className="font-black text-gray-800 uppercase tracking-tighter text-xs leading-none mb-1 group-hover:text-[#5d5dff] transition-colors">{c.name}</h4>
                                {goldCustomerIds.has(c.id) && (
                                  <Star size={10} className="text-amber-500 fill-amber-500" />
                                )}
                              </div>
                              <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">{c.displayId || 'NEW'}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2">
                            <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest">WhatsApp</span>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.whatsapp || c.phone || '---'}</p>
                          </div>
                        </td>
                        <td className="px-6 py-3">
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{c.taxId || '---'}</p>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(c);
                            }}
                            className="bg-gray-50 text-gray-400 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-[#5d5dff] hover:text-white transition-all border border-gray-100"
                          >
                            Ver Perfil
                          </button>
                        </td>
                      </tr>
                    ))}
                    {filteredCustomers.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center">
                          <UserPlus size={40} className="mx-auto text-gray-200 mb-4" />
                          <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Nenhum cliente encontrado</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingSale && (
          <OrderDetailsModal 
            sale={viewingSale} 
            onClose={() => setViewingSale(null)} 
            company={company}
            couponConfig={couponConfig}
            imprimirCupom={imprimirCupom}
            products={products}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function OrderDetailsModal({ 
  sale, 
  onClose, 
  company, 
  couponConfig, 
  imprimirCupom, 
  products 
}: { 
  sale: Sale, 
  onClose: () => void, 
  company: any, 
  couponConfig: CouponConfig, 
  imprimirCupom: (sale: Sale) => Promise<boolean>,
  products: Product[]
}) {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-sm rounded-[3rem] shadow-2xl overflow-hidden relative"
      >
        <button onClick={onClose} className="absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-all">
          <X size={20} />
        </button>

        <div className="p-8 space-y-6">
          <div className="text-center space-y-1">
            <h4 className="text-lg font-black text-gray-800 uppercase tracking-widest">Detalhes do Pedido</h4>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">#{sale.sequentialId || sale.id.substring(0,8)}</p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 space-y-4 font-mono text-[10px]">
            <div className="text-center border-b border-dashed border-gray-200 pb-3 mb-3">
              <p className="font-bold uppercase">{company.tradeName || company.name}</p>
              <p className="text-[8px] opacity-60">{new Date(sale.date).toLocaleString('pt-BR')}</p>
            </div>

            <div className="space-y-2">
              {sale.items.map((item, idx) => {
                const p = products.find(prod => prod.id === item.productId);
                return (
                  <div key={idx} className="flex justify-between">
                    <span className="truncate pr-4">{item.quantity}x {p?.name || 'Produto'}</span>
                    <span className="shrink-0">R$ {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div className="border-t border-dashed border-gray-200 pt-3 mt-3 flex justify-between font-black text-sm">
              <span>TOTAL</span>
              <span>R$ {sale.total.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-[9px] uppercase pt-2">
              <span className="font-bold">Forma de Pgto:</span>
              <span>{sale.paymentMethod}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => imprimirCupom(sale)}
              className="flex-1 bg-amber-500 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-100 flex items-center justify-center gap-2"
            >
              <Printer size={16} /> Imprimir
            </button>
            <button 
              onClick={onClose}
              className="flex-1 bg-gray-50 text-gray-400 p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center"
            >
              Fechar
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReceiptModal({ 
  sale, 
  products, 
  onClose, 
  customers,
  company,
  couponConfig,
  onConfirm,
  isFinalized = true,
  imprimirCupom,
  onGoToSeparation
}: { 
  sale: Sale, 
  products: Product[], 
  onClose: () => void, 
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  onConfirm?: () => void,
  isFinalized?: boolean,
  imprimirCupom: (sale: Sale | string) => Promise<boolean>,
  onGoToSeparation?: () => void
}) {
  const customer = customers.find(c => c.id === sale.customerId);

  const handlePrint = async (type: 'pdf' | 'print') => {
    const isPDF = type === 'pdf' || (type === 'print' && couponConfig.outputType === 'pdf');

    if (isPDF) {
      const doc = new jsPDF({
        unit: 'mm',
        format: couponConfig.format === '58mm' ? [58, 200] : couponConfig.format === '80mm' ? [80, 297] : couponConfig.format
      });

      let y = 10;

      if (company.logo) {
        try {
          doc.addImage(company.logo, 'PNG', doc.internal.pageSize.getWidth() / 2 - 6, y, 12, 12);
          y += 14;
        } catch (e) {
          console.error("Error adding logo to PDF", e);
        }
      }

      doc.setFontSize(12);
      const displayNameSource = company.tradeName || company.name || 'EMPRESA';
      doc.text(displayNameSource, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 6;

      doc.setFontSize(8);
      let idStr = `CPF/CNPJ: ${company.idNumber || '---'}`;
      if (company.stateRegistration) {
        idStr += ` | IE: ${company.stateRegistration}`;
      }
      doc.text(idStr, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 4;

      const addr = `${company.address.logradouro}, ${company.address.numero} - ${company.address.bairro}`;
      doc.setFontSize(7);
      doc.text(addr, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 4;
      doc.text(`${company.address.cidade}/${company.address.estado}`, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      y += 6;

      doc.setLineDashPattern([1, 1], 0);
      doc.line(5, y, doc.internal.pageSize.getWidth() - 5, y);
      y += 6;

      doc.setFontSize(9);
      doc.text('ITEM', 5, y);
      doc.text('TOTAL', doc.internal.pageSize.getWidth() - 5, y, { align: 'right' });
      y += 5;

      sale.items.forEach(item => {
        const p = products.find(prod => prod.id === item.productId);
        const originalPrice = p?.price || item.price;
        const discountPerUnit = originalPrice - item.price;

        doc.setFontSize(8);
        doc.text(`${item.quantity}x ${p?.name || 'Item'}`, 5, y);
        doc.text(`R$ ${(item.price * item.quantity).toFixed(2)}`, doc.internal.pageSize.getWidth() - 5, y, { align: 'right' });
        y += 4;
        
        if (couponConfig.showPrice || (couponConfig.showDiscount && discountPerUnit > 0)) {
          doc.setFontSize(6);
          let extraInfo = '';
          if (couponConfig.showPrice) extraInfo += `Unit: R$ ${item.price.toFixed(2)}`;
          if (couponConfig.showDiscount && discountPerUnit > 0) {
            extraInfo += ` (Desc: R$ ${(discountPerUnit * item.quantity).toFixed(2)})`;
          }
          doc.text(extraInfo, 7, y);
          y += 4;
        }
      });

      y += 2;
      doc.line(5, y, doc.internal.pageSize.getWidth() - 5, y);
      y += 6;

      doc.setFontSize(10);
      doc.text('TOTAL GERAL', 5, y);
      doc.text(`R$ ${sale.total.toFixed(2)}`, doc.internal.pageSize.getWidth() - 5, y, { align: 'right' });
      y += 6;
      doc.setFontSize(8);
      doc.text(`PAGAMENTO: ${sale.paymentMethod}`, 5, y);
      y += 8;

      if (couponConfig.showCustomer && customer) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.text('CLIENTE:', 5, y);
        doc.setFont('helvetica', 'normal');
        y += 4;

        if (couponConfig.showCustomerName) {
          doc.text(`NOME: ${customer.name}`, 5, y);
          y += 4;
        }
        if (couponConfig.showCustomerPhone && (customer.whatsapp || customer.phone)) {
          doc.text(`WHATSAPP: ${customer.whatsapp || customer.phone}`, 5, y);
          y += 4;
        }
        if (couponConfig.showCustomerTaxId && customer.taxId) {
          doc.text(`DOC: ${customer.taxId}`, 5, y);
          y += 4;
        }
        if (couponConfig.showCustomerAddress && customer.address) {
          doc.setFontSize(7);
          let addrLine = `END: ${customer.address.street}`;
          if (couponConfig.showCustomerAddressNumber && customer.address.number) addrLine += `, ${customer.address.number}`;
          doc.text(addrLine, 5, y);
          y += 3.5;
          if (couponConfig.showCustomerAddressNeighborhood && customer.address.neighborhood) {
            doc.text(`BAIRRO: ${customer.address.neighborhood}`, 5, y);
            y += 3.5;
          }
          if (couponConfig.showCustomerAddressCity && customer.address.city) {
            doc.text(`CIDADE: ${customer.address.city} - ${customer.address.state || ''}`, 5, y);
            y += 3.5;
          }
          if (couponConfig.showCustomerCep && customer.address.cep) {
            doc.text(`CEP: ${customer.address.cep}`, 5, y);
            y += 3.5;
          }
          if (couponConfig.showCustomerAddressComplement && customer.address.complement) {
            doc.text(`COMPL: ${customer.address.complement}`, 5, y);
            y += 3.5;
          }
          y += 2;
        }
      }

      if (couponConfig.showOrderQrCode) {
        try {
          const qrDataUrl = await QRCode.toDataURL(sale.sequentialId.toString() || sale.id);
          doc.addImage(qrDataUrl, 'PNG', doc.internal.pageSize.getWidth() / 2 - 10, y, 20, 20);
          y += 22;
        } catch (err) {
          console.error("Error generating QR code for PDF", err);
        }
      }

      y += 10;
      doc.setFontSize(8);
      doc.text(couponConfig.defaultMessage, doc.internal.pageSize.getWidth() / 2, y, { align: 'center' });
      
      if (type === 'print' && couponConfig.printMode === 'auto') {
        const base64PDF = doc.output('datauristring').split(',')[1];
        const handled = await imprimirCupom(base64PDF);
        if (handled) return;
      }

      doc.save(`cupom-${sale.id.substring(0, 8)}.pdf`);
    } else {
      await imprimirCupom(sale);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} 
        animate={{ scale: 1, y: 0 }} 
        className="bg-white p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl relative overflow-hidden"
      >
        <div className={`absolute top-0 left-0 w-full h-2 ${isFinalized ? 'bg-blue-500' : 'bg-amber-500'}`} />
        
        {!onConfirm || isFinalized ? (
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        ) : null}

        <div className="text-center space-y-2">
          {company.logo && (
            <img src={company.logo} className="w-16 h-16 object-contain mx-auto mb-2" />
          )}
          <h4 className="text-lg font-black text-gray-800 uppercase tracking-widest">
            {isFinalized ? 'Cupom de Venda' : 'Confirmar Venda'}
          </h4>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">
            {company.tradeName || company.name}
          </p>
          <p className={`text-[10px] font-black uppercase tracking-widest ${isFinalized ? 'text-emerald-500' : 'text-indigo-600'}`}>
            {isFinalized ? `PEDIDO CRIADO COM SUCESSO` : 'REVISE OS ITENS ABAIXO'}
          </p>
        </div>

        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 max-h-64 overflow-y-auto font-mono text-[10px] space-y-2">
           <p className="text-center font-bold uppercase">{company.tradeName || company.name}</p>
           <p className="text-center text-[8px]">
             CPF/CNPJ: {company.idNumber || '---'}
             {company.stateRegistration && ` | IE: ${company.stateRegistration}`}
           </p>
           <p className="text-center text-[8px]">{company.address.logradouro}, {company.address.numero}</p>
           
           <div className="border-t border-dashed border-gray-300 my-2"></div>
           
           {sale.items.map((item, idx) => {
             const p = products.find(prod => prod.id === item.productId);
             const originalPrice = p?.price || item.price;
             const discount = originalPrice - item.price;
             return (
               <div key={idx} className="space-y-0.5">
                 <div className="flex justify-between">
                   <span className="truncate">{item.quantity}x {p?.name || 'Item'}</span>
                   <span>R$ {(item.price * item.quantity).toFixed(2)}</span>
                 </div>
                 {couponConfig.showDiscount && discount > 0 && (
                   <div className="flex justify-between text-[8px] text-orange-500 italic">
                     <span>DESCONTO ATACADO</span>
                     <span>- R$ {(discount * item.quantity).toFixed(2)}</span>
                   </div>
                 )}
               </div>
             );
           })}
           
           <div className="border-t border-dashed border-gray-300 my-2"></div>
           
           <div className="flex justify-between font-bold text-xs">
             <span>TOTAL</span>
             <span>R$ {sale.total.toFixed(2)}</span>
           </div>

           <div className="flex justify-between text-[9px] uppercase mt-1">
             <span className="font-bold">Pagamento</span>
             <span>{sale.paymentMethod}</span>
           </div>

           {(sale.receivedAmount || 0) > 0 && (
             <div className="flex justify-between text-[9px] uppercase">
               <span className="font-bold">Recebido</span>
               <span>R$ {(sale.receivedAmount || 0).toFixed(2)}</span>
             </div>
           )}

           {(sale.change || 0) > 0 && (
             <div className="flex justify-between text-[9px] uppercase text-emerald-600 font-black">
               <span>Troco</span>
               <span>R$ {(sale.change || 0).toFixed(2)}</span>
             </div>
           )}

           {customer && couponConfig.showCustomer && (
             <div className="mt-4 pt-2 border-t border-gray-100 italic space-y-0.5 text-[9px]">
               <p className="font-black uppercase">Destinatário:</p>
               <p>{customer.name}</p>
               {customer.whatsapp && <p>Whats: {customer.whatsapp}</p>}
               {customer.address && (
                 <>
                   <p>{customer.address.street}, {customer.address.number}</p>
                   <p>{customer.address.neighborhood} - {customer.address.city}/{customer.address.state}</p>
                   <p>CEP: {customer.address.cep}</p>
                 </>
               )}
             </div>
           )}

           <div className="text-center pt-4 opacity-50 uppercase text-[8px]">
             {couponConfig.defaultMessage}
           </div>
        </div>

        <div className="flex flex-col gap-3">
          {!isFinalized && onConfirm ? (
            <button 
              onClick={onConfirm}
              className="w-full p-4 rounded-2xl bg-amber-500 text-white font-black text-xs uppercase shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
            >
              <Check size={20} /> Confirmar e Finalizar
            </button>
          ) : (
            <div className="flex gap-2">
               <button 
                 onClick={() => handlePrint('print')}
                 className="flex-1 p-4 rounded-2xl bg-[#5d5dff] text-white font-black text-[10px] uppercase shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
               >
                 <Printer size={16} /> Imprimir
               </button>
               <button 
                 onClick={() => handlePrint('pdf')}
                 className="flex-1 p-4 rounded-2xl bg-gray-100 text-gray-600 font-black text-[10px] uppercase hover:bg-gray-200 transition-all flex items-center justify-center gap-2"
               >
                 <Download size={16} /> PDF
               </button>
            </div>
          )}
          
          {isFinalized && onGoToSeparation && (
            <button 
              onClick={onGoToSeparation}
              className="w-full p-4 rounded-2xl bg-indigo-50 text-indigo-600 font-black text-[10px] uppercase transition-all hover:bg-indigo-100 flex items-center justify-center gap-2"
            >
              <Clock size={16} /> Ir para Separação
            </button>
          )}

          {isFinalized && (
            <button 
              onClick={onClose}
              className="w-full p-4 rounded-2xl bg-emerald-500 text-white font-black text-[10px] uppercase transition-all hover:bg-emerald-600 flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
            >
              <ShoppingBag size={16} /> Nova Venda / Voltar ao PDV
            </button>
          )}

          {(!onConfirm || isFinalized) && (
            <button 
              onClick={onClose}
              className="w-full p-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-[10px] uppercase transition-all hover:bg-gray-100"
            >
              Fechar
            </button>
          )}

          {onConfirm && !isFinalized && (
            <button 
              onClick={onClose}
              className="w-full p-4 rounded-2xl border border-gray-100 text-gray-400 font-black text-[10px] uppercase transition-all hover:bg-gray-50"
            >
              Cancelar
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function SalesHistoryView({ 
  sales, 
  products, 
  onCancel, 
  customers,
  company,
  couponConfig,
  imprimirCupom
}: { 
  sales: Sale[], 
  products: Product[], 
  onCancel?: (id: string) => void, 
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  imprimirCupom: (sale: Sale) => Promise<boolean>
}) {
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [statusFilter, setStatusFilter] = useState<'todos' | Sale['status']>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSales = useMemo(() => {
    let list = [...sales];
    
    // Status Filter
    if (statusFilter !== 'todos') {
      list = list.filter(s => (s.status || 'pendente') === statusFilter);
    }

    // Search Term Filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      list = list.filter(s => {
        const customer = customers.find(c => c.id === s.customerId);
        return (
          s.sequentialId?.toLowerCase().includes(lowerSearch) ||
          customer?.name.toLowerCase().includes(lowerSearch) ||
          s.items.some(item => {
            const p = products.find(prod => prod.id === item.productId);
            return p?.name.toLowerCase().includes(lowerSearch) || p?.sku?.toLowerCase().includes(lowerSearch);
          })
        );
      });
    }

    return list.sort((a, b) => b.date - a.date);
  }, [sales, statusFilter, searchTerm, customers, products]);

  const getStatusLabel = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'Pendente';
      case 'em_separacao': return 'Em Separação';
      case 'separado': return 'Separado';
      case 'embalado': return 'Embalado';
      case 'enviado': return 'Enviado';
      case 'entregue': return 'Entregue';
      case 'cancelado': return 'Cancelado';
      default: return 'Pendente';
    }
  };

  const getStatusColor = (status: Sale['status']) => {
    switch (status) {
      case 'pendente': return 'bg-orange-50 text-orange-600 border-orange-100';
      case 'em_separacao': return 'bg-indigo-50 text-indigo-600 border-indigo-100';
      case 'separado': return 'bg-blue-50 text-blue-600 border-blue-100';
      case 'embalado': return 'bg-purple-50 text-purple-600 border-purple-100';
      case 'enviado': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'entregue': return 'bg-gray-800 text-white border-transparent';
      case 'cancelado': return 'bg-red-50 text-red-600 border-red-100';
      default: return 'bg-orange-50 text-orange-600 border-orange-100';
    }
  };

  return (
    <div className="space-y-6">
      <AnimatePresence>
        {selectedSale && (
          <ReceiptModal 
            sale={selectedSale} 
            products={products} 
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            onClose={() => setSelectedSale(null)} 
            imprimirCupom={imprimirCupom}
          />
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar w-full md:w-auto">
          {[
            { id: 'todos', label: 'Todas' },
            { id: 'pendente', label: 'Pendentes' },
            { id: 'em_separacao', label: 'Em Separação' },
            { id: 'separado', label: 'Separado' },
            { id: 'embalado', label: 'Embalado' },
            { id: 'enviado', label: 'Enviado' },
            { id: 'entregue', label: 'Entregue' },
            { id: 'cancelado', label: 'Canceladas' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id as any)}
              className={`px-4 py-2 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all whitespace-nowrap border ${
                statusFilter === f.id 
                  ? 'bg-gray-800 text-white border-transparent shadow-md' 
                  : 'bg-white border-gray-100 text-gray-400 hover:border-gray-200'
              }`}
            >
              {f.label}
              <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[8px] ${statusFilter === f.id ? 'bg-white/20' : 'bg-gray-100'}`}>
                {f.id === 'todos' ? sales.length : sales.filter(s => (s.status || 'pendente') === f.id).length}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input 
            type="text"
            placeholder="Buscar pedido ou cliente..."
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-xs shadow-sm"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-6 py-4">Pedido / Data</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Itens</th>
                <th className="px-6 py-4">Pagamento</th>
                <th className="px-6 py-4 text-right">Total</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSales.length > 0 ? (
                filteredSales.map((sale) => {
                  const customer = customers.find(c => c.id === sale.customerId);
                  return (
                    <tr key={sale.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <p className="text-[10px] font-black text-indigo-600 mb-0.5">#{sale.sequentialId || sale.id.substring(0, 8)}</p>
                        <p className="text-[9px] font-medium text-gray-400">{new Date(sale.date).toLocaleString('pt-BR')}</p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-black text-gray-700 uppercase">{customer?.name || 'Cliente de Balcão'}</p>
                        {customer?.whatsapp && <p className="text-[9px] text-gray-400 font-medium">{customer.whatsapp}</p>}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg border ${getStatusColor(sale.status)}`}>
                          {getStatusLabel(sale.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {sale.items.map((item, idx) => {
                            const p = products.find(prod => prod.id === item.productId);
                            return (
                              <p key={idx} className="text-[10px] font-medium text-gray-500 line-clamp-1">
                                {item.quantity}x {p?.name || 'Produto Removido'}
                              </p>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[8px] font-black uppercase px-2 py-1 rounded-lg bg-blue-50 text-blue-500 border border-blue-100">
                          {sale.paymentMethod}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="text-xs font-black text-gray-900">R$ {sale.total.toFixed(2)}</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => setSelectedSale(sale)}
                            className="p-2 text-gray-400 hover:text-blue-500 transition-colors flex items-center gap-1 text-[10px] font-black uppercase tracking-widest"
                          >
                            <Receipt size={14} /> Cupom
                          </button>
                          {onCancel && (sale.status === 'pendente' || sale.status === 'em_separacao') && (
                            <button 
                              onClick={() => onCancel(sale.id)}
                              className="p-2 text-gray-300 hover:text-red-500 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <History size={40} className="text-gray-100" />
                      <p className="text-sm font-black text-gray-300 uppercase tracking-widest">Nenhum pedido encontrado</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function POSView({ 
  sales,
  products, 
  setSales, 
  setProducts, 
  paymentMethods, 
  addActivity,
  cashierSession,
  addSaleToCashier,
  customers,
  setCustomers,
  deliveryChannels,
  deliveryMethods,
  company,
  couponConfig,
  setView,
  imprimirCupom,
  calculateProductCost,
  createRevenueForSale,
  goldCustomerIds
}: { 
  products: Product[], 
  sales: Sale[],
  setSales: any, 
  setProducts: any, 
  paymentMethods: string[], 
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  cashierSession: CashierSession,
  addSaleToCashier: (sale: Sale) => void,
  customers: Customer[],
  setCustomers: any,
  deliveryChannels: DeliveryChannel[],
  deliveryMethods: DeliveryMethod[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  setView: (v: View) => void,
  imprimirCupom: (saleOrHtml: Sale | string) => Promise<boolean>,
  calculateProductCost: (productId: string) => number,
  createRevenueForSale: (sale: Sale) => void,
  goldCustomerIds: Set<string>
}) {
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentMethod, setPaymentMethod] = useState(paymentMethods[0] || 'DINHEIRO');
  const [receivedAmount, setReceivedAmount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [deliveryChannelId, setDeliveryChannelId] = useState<string | null>(null);
  const [deliveryMethodId, setDeliveryMethodId] = useState<string | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  
  // States for confirmation flow
  const [checkoutPreview, setCheckoutPreview] = useState<Sale | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    return customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || (c.whatsapp && c.whatsapp.includes(customerSearch)));
  }, [customers, customerSearch]);

  // Registration fields for unified shortcut
  const [newCustName, setNewCustName] = useState('');
  const [newCustWhats, setNewCustWhats] = useState('');
  const [newCustDoc, setNewCustDoc] = useState('');

  // Search input ref to focus back
  const searchInputRef = useRef<HTMLInputElement>(null);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return products.filter(p => 
      p.name.toLowerCase().includes(lowerTerm) || 
      (p.sku && p.sku.toLowerCase() === lowerTerm) ||
      (p.barcode && p.barcode === lowerTerm)
    );
  }, [products, searchTerm]);

  const addToCart = (p: Product) => {
    if (p.stock <= 0) return alert('Produto sem estoque!');
    const existing = cart.find(item => item.product.id === p.id);
    if (existing) {
      if (existing.quantity >= p.stock) return alert('Quantidade máxima no estoque atingida!');
      setCart(cart.map(item => item.product.id === p.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product: p, quantity: 1 }]);
    }
    setSearchTerm('');
    searchInputRef.current?.focus();
  };

  const handleSearchKeyPress = (e: any) => {
    if (e.key === 'Enter') {
      if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
      } else if (filteredProducts.length > 1) {
        // Try to match exactly by SKU or Barcode if multiple but one is exact
        const exactMatch = filteredProducts.find(p => p.sku === searchTerm || p.barcode === searchTerm);
        if (exactMatch) addToCart(exactMatch);
      }
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stock) {
          alert('Quantidade máxima no estoque atingida!');
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const calculateItemPrice = (item: { product: Product, quantity: number }) => {
    if (item.product.wholesalePrice && item.product.wholesaleMinQty && item.quantity >= item.product.wholesaleMinQty) {
      return item.product.wholesalePrice;
    }
    return item.product.price;
  };

  const total = cart.reduce((acc, item) => acc + calculateItemPrice(item) * item.quantity, 0);

  const handleCheckout = () => {
    if (cart.length === 0) return;
    
    // Prepare the sale object for preview
    const total = cart.reduce((acc, item) => acc + (calculateItemPrice(item) * item.quantity), 0);
    
    // Find highest sequential ID to increment
    const maxSeq = sales.reduce((max, s) => {
      const seqNum = parseInt(s.sequentialId || '0');
      return seqNum > max ? seqNum : max;
    }, 0);
    const nextSeq = (maxSeq + 1).toString().padStart(5, '0');

    const sale: Sale = {
      id: crypto.randomUUID(),
      sequentialId: nextSeq,
      date: Date.now(),
      total,
      totalCost: cart.reduce((acc, i) => acc + (calculateProductCost(i.product.id) * i.quantity), 0),
      totalProfit: 0, // Calculated below
      paymentMethod,
      receivedAmount: receivedAmount || total,
      change: Math.max(0, (receivedAmount || total) - total),
      items: cart.map(i => {
        const cost = calculateProductCost(i.product.id);
        const price = calculateItemPrice(i);
        const profit = price - cost;
        return { 
          productId: i.product.id, 
          quantity: i.quantity, 
          price,
          cost,
          profit
        };
      }),
      customerId: selectedCustomerId || undefined,
      deliveryChannelId: deliveryChannelId || undefined,
      deliveryMethodId: deliveryMethodId || undefined,
      cashierSessionId: cashierSession.id,
      status: 'pendente'
    };
    
    sale.totalProfit = sale.total - sale.totalCost;
    
    setCheckoutPreview(sale);
    setIsFinalized(false);
  };

  const confirmSale = async () => {
    if (!checkoutPreview) return;
    if (!cashierSession.isOpen) {
      alert('⚠️ O CAIXA ESTÁ FECHADO. Abra o caixa no menu CAIXA para realizar vendas.');
      return;
    }
    
    const subtotal = cart.reduce((acc, i) => acc + (i.product.price * i.quantity), 0);
    const total = checkoutPreview.total;
    const discount = subtotal - total;

    // Save sale
    setSales((prev: Sale[]) => [...prev, checkoutPreview]);
    addSaleToCashier(checkoutPreview);
    createRevenueForSale(checkoutPreview);
    
    let msg = `Venda de R$ ${checkoutPreview.total.toFixed(2)} via ${checkoutPreview.paymentMethod}`;
    if (checkoutPreview.deliveryChannelId) msg += ` (Canal: ${deliveryChannels.find(d => d.id === checkoutPreview.deliveryChannelId)?.name})`;
    if (checkoutPreview.deliveryMethodId) msg += ` (Entrega: ${deliveryMethods.find(m => m.id === checkoutPreview.deliveryMethodId)?.name})`;
    addActivity('sale', 'Venda Realizada', msg);

    if (discount > 0.01) {
      addActivity('sale', 'Aplicação de Desconto', `Desconto de R$ ${discount.toFixed(2)} aplicado na venda #${checkoutPreview.sequentialId}.`);
    }
    
    setIsFinalized(true);
    
    // Auto print if configured
    if (couponConfig.printMode === 'auto') {
      imprimirCupom(checkoutPreview);
    }

    setCart([]);
    setSelectedCustomerId(null);
    setDeliveryChannelId(null);
    setDeliveryMethodId(null);
    setReceivedAmount(0);
  };

  const closeCheckout = () => {
    setCheckoutPreview(null);
    setIsFinalized(false);
  };

  if (!cashierSession.isOpen) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
        <div className="w-20 h-20 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center">
          <Lock size={32} />
        </div>
        <div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">Caixa Fechado</h3>
          <p className="text-sm text-gray-400 font-bold mt-2 mb-6">Você precisa abrir o caixa antes de realizar vendas.</p>
          <button 
            onClick={() => setView('cashier')}
            className="bg-[#5d5dff] text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-600 transition-all flex items-center gap-3 mx-auto"
          >
            <Unlock size={18} /> Ir Abrir Caixa
          </button>
        </div>
      </div>
    );
  }

  const selectedCustomer = customers.find(c => c.id === selectedCustomerId);

  return (
    <div className="flex flex-col lg:flex-row gap-8 animate-in fade-in duration-500">
      {!cashierSession.isOpen && (
        <div className="fixed inset-0 z-[100] bg-white/90 backdrop-blur-md flex items-center justify-center p-8">
          <div className="max-w-md w-full bg-white p-10 rounded-[3rem] border border-gray-100 shadow-2xl space-y-8 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock size={48} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-900 uppercase tracking-widest mb-2">Caixa Fechado</h2>
              <p className="text-sm font-bold text-gray-400 uppercase tracking-tight">Você precisa abrir o caixa para realizar vendas e movimentações financeiras.</p>
            </div>
            <button 
              onClick={() => setView('cashier')}
              className="w-full bg-indigo-600 text-white p-6 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100"
            >
              Ir para o Caixa
            </button>
          </div>
        </div>
      )}
      {/* Left Column: Selection */}
      <div className="flex-1 space-y-6">
        {/* Customer bar */}
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => setShowCustomerModal(true)}
            className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${selectedCustomerId ? 'border-indigo-400 bg-indigo-50 text-indigo-700' : 'border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200'}`}
          >
            <div className={`p-2 rounded-xl ${selectedCustomerId ? 'bg-indigo-500 text-white' : 'bg-white text-gray-400'}`}>
              <UserPlus size={18} />
            </div>
            <div className="text-left overflow-hidden flex-1">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-[10px] font-black uppercase tracking-widest leading-none">Cliente</p>
                {selectedCustomerId && goldCustomerIds.has(selectedCustomerId) && (
                  <span className="bg-amber-500 text-white text-[7px] font-black px-1.5 py-0.5 rounded-sm uppercase tracking-tighter shadow-sm flex items-center gap-0.5 animate-bounce">
                    <Star size={7} fill="currentColor" /> OURO
                  </span>
                )}
              </div>
              <p className="text-xs font-bold truncate">{selectedCustomer ? selectedCustomer.name : 'Selecionar Cliente'}</p>
            </div>
            {selectedCustomerId && (
              <X 
                size={16} 
                className="ml-auto text-indigo-400 hover:text-indigo-600" 
                onClick={(e) => { e.stopPropagation(); setSelectedCustomerId(null); }} 
              />
            )}
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Canal de Venda</label>
               <select 
                 value={deliveryChannelId || ''} 
                 onChange={e => setDeliveryChannelId(e.target.value || null)}
                 className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase"
               >
                 <option value="">Selecione o Canal (Opcional)</option>
                 {deliveryChannels.map(d => (
                   <option key={d.id} value={d.id}>{d.name}</option>
                 ))}
               </select>
             </div>
             <div className="space-y-2">
               <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Entrega</label>
               <select 
                 value={deliveryMethodId || ''} 
                 onChange={e => setDeliveryMethodId(e.target.value || null)}
                 className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 text-sm font-bold uppercase transition-all"
               >
                 <option value="">Selecione a Entrega (Opcional)</option>
                 {deliveryMethods.filter(m => m.isActive).map(m => (
                   <option key={m.id} value={m.id}>{m.name}</option>
                 ))}
               </select>
             </div>
          </div>
        </div>

        {/* Product Search */}
        <div className="relative">
          <Search className="absolute left-4 top-4 text-gray-400" size={20} />
          <input 
            ref={searchInputRef}
            placeholder="Nome, código ou barras + Enter..." 
            className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 font-bold"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            onKeyDown={handleSearchKeyPress}
            autoFocus
          />
          {searchTerm && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 max-h-60 overflow-y-auto">
              {filteredProducts.map(p => (
                <button key={p.id} onClick={() => addToCart(p)} className="w-full p-4 text-left hover:bg-gray-50 flex justify-between border-b last:border-0 items-center">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-800">{p.name}</p>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Estoque: {p.stock}</p>
                  </div>
                  <span className="text-[#5d5dff] font-black">R$ {p.price.toFixed(2)}</span>
                </button>
              ))}
              {filteredProducts.length === 0 && (
                <div className="p-4 text-center text-gray-400 italic text-xs">Produto não encontrado</div>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.slice(0, 6).map(p => (
            <button key={p.id} onClick={() => addToCart(p)} className="p-4 rounded-2xl border border-gray-100 bg-gray-50 text-left hover:border-blue-400 transition-all hover:bg-blue-50 group">
              <p className="font-bold truncate text-sm mb-1 group-hover:text-blue-700">{p.name}</p>
              <div className="flex justify-between items-center">
                <p className="text-blue-600 font-extrabold text-xs">R$ {p.price.toFixed(2)}</p>
                <span className="text-[9px] font-black text-gray-300">QTD: {p.stock}</span>
              </div>
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Pagamento</label>
            <div className="flex flex-wrap gap-2">
              {paymentMethods.map(method => (
                <button 
                  key={method}
                  onClick={() => setPaymentMethod(method)}
                  className={`px-4 py-3 rounded-xl text-[10px] font-bold uppercase transition-all ${paymentMethod === method ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                >
                  {method}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Valor Recebido (R$)</label>
              <input 
                type="number"
                placeholder="0,00"
                className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-blue-400 font-black text-lg"
                value={receivedAmount || ''}
                onChange={e => setReceivedAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Troco (R$)</label>
              <div className="w-full p-4 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100 font-black text-lg">
                {(receivedAmount > total ? receivedAmount - total : 0).toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Cart */}
      <div className="w-full lg:w-96 shrink-0 bg-gray-50 rounded-3xl p-6 border border-gray-100 flex flex-col h-[650px] shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
        <div className="flex items-center gap-2 mb-6 text-gray-800">
          <ShoppingBag className="text-blue-500" />
          <h4 className="font-black text-xs uppercase tracking-widest">Resumo do Pedido</h4>
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-2">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-300">
              <ShoppingBag size={48} className="mb-4 opacity-5" />
              <p className="text-xs font-black uppercase tracking-widest">Carrinho Vazio</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="flex justify-between items-start group bg-white p-3 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <p className="font-bold text-sm truncate text-gray-800">{item.product.name}</p>
                  <p className="text-[10px] font-bold text-gray-400">{item.quantity}x R$ {item.product.price.toFixed(2)}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
                    <button 
                      onClick={() => updateQuantity(item.product.id, -1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Minus size={12} />
                    </button>
                    <span className="text-[10px] font-black w-6 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, 1)}
                      className="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm text-gray-400 hover:text-blue-500 transition-colors"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-black text-blue-600">R$ {(calculateItemPrice(item) * item.quantity).toFixed(2)}</span>
                    {calculateItemPrice(item) < item.product.price && (
                      <span className="text-[8px] font-black uppercase text-orange-500 bg-orange-50 px-1 rounded tracking-tighter">Preço de Atacado</span>
                    )}
                  </div>
                  <button onClick={() => setCart(cart.filter(i => i.product.id !== item.product.id))} className="text-gray-300 hover:text-red-500 transition-colors">
                     <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="pt-6 border-t border-gray-200 space-y-6">
          {selectedCustomer && (
            <div className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-xl">
               <Check size={12} />
               <span className="text-[10px] font-black uppercase tracking-widest">Cliente Vinculado</span>
            </div>
          )}
          
          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Subtotal</span>
              <span className="text-sm font-bold text-gray-600">R$ {cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0).toFixed(2)}</span>
            </div>
            {cart.some(i => calculateItemPrice(i) < i.product.price) && (
              <div className="flex justify-between items-center text-orange-500">
                <span className="text-[10px] font-black uppercase tracking-widest">Desconto Atacado</span>
                <span className="text-sm font-bold italic">- R$ {(cart.reduce((acc, i) => acc + i.product.price * i.quantity, 0) - total).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center text-[#5d5dff]">
              <span className="text-xs font-black uppercase tracking-widest">Total Geral</span>
              <span className="text-3xl font-black tracking-tighter">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              onClick={() => setCart([])}
              className="p-4 bg-white text-gray-400 rounded-2xl hover:bg-gray-100 transition-all active:scale-95 border border-gray-200"
            >
              <Trash2 size={24} />
            </button>
            <button 
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="flex-1 bg-[#5d5dff] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-200 hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all"
            >
              Finalizar Venda
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation & Post-Sale Modal */}
      <AnimatePresence>
        {checkoutPreview && (
          <ReceiptModal 
            sale={checkoutPreview}
            products={products}
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            onClose={closeCheckout}
            onConfirm={confirmSale}
            isFinalized={isFinalized}
            imprimirCupom={imprimirCupom}
            onGoToSeparation={() => {
              closeCheckout();
              setView('separation');
            }}
          />
        )}
      </AnimatePresence>

      {/* Customer Modal */}
      <AnimatePresence>
        {showCustomerModal && (
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            exit={{ opacity: 0 }} 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.95, y: 20 }} 
              animate={{ scale: 1, y: 0 }} 
              className="bg-white p-8 rounded-3xl max-w-lg w-full space-y-6 shadow-2xl relative"
            >
              <button 
                onClick={() => setShowCustomerModal(false)}
                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>

              <div className="text-center space-y-2">
                <UserPlus size={48} className="mx-auto text-indigo-500 mb-2" />
                <h4 className="text-xl font-black text-gray-800 uppercase tracking-widest">Vincular Cliente</h4>
                <p className="text-xs text-gray-400 font-bold">Busque ou crie um novo cliente para esta venda.</p>
              </div>

              <div className="space-y-4">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button onClick={() => setIsRegistering(false)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${!isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Pesquisar</button>
                  <button onClick={() => setIsRegistering(true)} className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${isRegistering ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400'}`}>Novo Cliente</button>
                </div>

                {!isRegistering ? (
                  <>
                    <div className="relative">
                      <Search className="absolute left-4 top-4 text-gray-400" size={20} />
                      <input 
                        placeholder="Nome, Telefone ou CPF..." 
                        className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-sm"
                        value={customerSearch}
                        onChange={e => setCustomerSearch(e.target.value)}
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-gray-50 border rounded-2xl bg-gray-50/50">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map(c => (
                          <button 
                            key={c.id} 
                            onClick={() => {
                              setSelectedCustomerId(c.id);
                              setShowCustomerModal(false);
                            }}
                            className="w-full p-4 text-left hover:bg-indigo-50 flex justify-between items-center group transition-colors"
                          >
                             <div className="min-w-0">
                               <p className="font-bold text-gray-800">{c.name}</p>
                               <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{c.whatsapp || 'Sem contato'}</p>
                             </div>
                             <Check size={16} className="text-indigo-500 opacity-0 group-hover:opacity-100" />
                          </button>
                        ))
                      ) : (
                        <div className="p-8 text-center"><p className="text-xs font-bold text-gray-400 italic">Cliente não encontrado</p></div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <Input label="Nome Completo" value={newCustName} onChange={setNewCustName} placeholder="Nome do cliente" />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label="WhatsApp" value={newCustWhats} onChange={setNewCustWhats} placeholder="(00) 00000-0000" />
                      <Input label="CPF/CNPJ" value={newCustDoc} onChange={setNewCustDoc} placeholder="000.000.000-00" />
                    </div>
                    <button 
                      onClick={() => {
                        if (!newCustName.trim()) return alert('Nome é obrigatório.');
                        const uuid = crypto.randomUUID();
                        const newCust: Customer = {
                          id: uuid,
                          displayId: `PDV-${Math.floor(1000 + Math.random() * 9000)}`,
                          name: newCustName,
                          whatsapp: newCustWhats,
                          debt: 0
                        };
                        setCustomers((prev: Customer[]) => [...prev, newCust]);
                        addActivity('customer', 'Atalho PDV', `Novo cliente ${newCustName} cadastrado via PDV.`);
                        setSelectedCustomerId(uuid);
                        setShowCustomerModal(false);
                        setNewCustName(''); setNewCustWhats(''); setNewCustDoc('');
                        setIsRegistering(false);
                      }}
                      className="w-full p-5 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus size={18} /> Salvar e Vincular
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DeliveryView({ 
  sales, 
  deliveryChannels, 
  deliveryMethods,
  products, 
  customers,
  company,
  couponConfig,
  addActivity,
  setSales,
  imprimirCupom
}: { 
  sales: Sale[], 
  deliveryChannels: DeliveryChannel[], 
  deliveryMethods: DeliveryMethod[],
  products: Product[],
  customers: Customer[],
  company: CompanyInfo,
  couponConfig: CouponConfig,
  addActivity: any,
  setSales: any,
  imprimirCupom: (sale: Sale) => Promise<boolean>
}) {
  const [activeTab, setActiveTab] = useState<'pending' | 'shipping' | 'delivered'>('pending');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  const deliverySales = useMemo(() => {
    let status: Sale['status'] = 'enviado';
    if (activeTab === 'shipping') status = 'em_transporte';
    if (activeTab === 'delivered') status = 'entregue';
    
    return sales
      .filter(s => s.status === status)
      .sort((a, b) => b.date - a.date);
  }, [sales, activeTab]);

  const handleStatusUpdate = (saleId: string, status: Sale['status']) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { ...s, status } : s));
    
    let actionLabel = '';
    if (status === 'em_transporte') actionLabel = 'Entrega Iniciada';
    if (status === 'entregue') actionLabel = 'Entrega Concluída';
    
    addActivity('sale', 'Logística', `Pedido #${sale.sequentialId || sale.id.substring(0, 8)} - ${actionLabel}`);
  };

  const getDeliveryMethodName = (id?: string) => {
    if (!id) return 'Não Definido';
    return deliveryMethods.find(m => m.id === id)?.name || 'Outros';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex bg-gray-100 p-1.5 rounded-[2rem] w-fit shadow-inner">
        {[
          { id: 'pending', label: 'Aguardando Envio', color: 'text-amber-600', icon: <Package size={16} /> },
          { id: 'shipping', label: 'Em Transporte', color: 'text-blue-600', icon: <Truck size={16} /> },
          { id: 'delivered', label: 'Entregues', color: 'text-emerald-600', icon: <CheckCircle size={16} /> }
        ].map(tab => (
          <button 
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${activeTab === tab.id ? 'bg-white shadow-xl ' + tab.color : 'text-gray-400 hover:text-gray-600'}`}
          >
            {tab.icon}
            {tab.label}
            <span className={`ml-2 px-2 py-0.5 rounded-full text-[9px] ${activeTab === tab.id ? 'bg-gray-100' : 'bg-gray-200 text-gray-500'}`}>
              {sales.filter(s => {
                if (tab.id === 'pending') return s.status === 'enviado';
                if (tab.id === 'shipping') return s.status === 'em_transporte';
                if (tab.id === 'delivered') return s.status === 'entregue';
                return false;
              }).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {deliverySales.length > 0 ? (
          deliverySales.map((sale) => {
            const customer = customers.find(c => c.id === sale.customerId);
            return (
              <div key={sale.id} className="bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all group flex flex-col h-full relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity">
                   <Truck size={120} />
                </div>
                
                <div className="flex justify-between items-start mb-6">
                   <div>
                     <div className="flex items-center gap-2 mb-1">
                       <QrCode size={12} className="text-indigo-400" />
                       <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest leading-none">#{sale.sequentialId || '00000'}</p>
                     </div>
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">{new Date(sale.date).toLocaleDateString()} {new Date(sale.date).toLocaleTimeString().slice(0, 5)}</p>
                   </div>
                   <div className="flex gap-2">
                     <button 
                       onClick={() => setSelectedSale(sale)}
                       className="p-3 bg-gray-50 text-gray-400 rounded-2xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"
                     >
                       <Receipt size={18} />
                     </button>
                   </div>
                </div>

                <div className="space-y-6 flex-1">
                   <div>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 leading-none">Destinatário</p>
                      <h4 className="text-sm font-black text-gray-800 uppercase">{customer?.name || 'Cliente de Balcão'}</h4>
                      <p className="text-xs font-bold text-gray-500 mt-1">{customer?.phone || customer?.whatsapp || 'Sem Telefone'}</p>
                   </div>

                   <div className="p-5 bg-gray-50 rounded-3xl border border-gray-100 space-y-4">
                      <div className="flex items-start gap-3">
                         <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-gray-400 shrink-0">
                            <MapPin size={16} />
                         </div>
                         <div className="min-w-0">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Endereço</p>
                            <p className="text-[10px] font-bold text-gray-700 uppercase leading-relaxed line-clamp-3">
                               {customer?.address ? (
                                 `${customer.address.street}, ${customer.address.number}${customer.address.complement ? ` - ${customer.address.complement}` : ''}\n${customer.address.neighborhood}, ${customer.address.city}/${customer.address.state}\nCEP: ${customer.address.cep}`
                               ) : 'Endereço não cadastrado'}
                            </p>
                         </div>
                      </div>

                      <div className="flex items-center gap-3">
                         <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center text-gray-400 shrink-0">
                            <Truck size={16} />
                         </div>
                         <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1 leading-none">Tipo de Entrega</p>
                            <span className="text-[10px] font-black text-emerald-600 uppercase">
                               {getDeliveryMethodName(sale.deliveryMethodId)}
                            </span>
                         </div>
                      </div>
                   </div>
                </div>

                <div className="pt-6 border-t border-gray-50 mt-6">
                   {activeTab === 'pending' && (
                     <button 
                       onClick={() => handleStatusUpdate(sale.id, 'em_transporte')}
                       className="w-full bg-blue-600 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-3"
                     >
                       <Truck size={20} />
                       Iniciar Entrega
                     </button>
                   )}
                   {activeTab === 'shipping' && (
                     <button 
                       onClick={() => handleStatusUpdate(sale.id, 'entregue')}
                       className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3"
                     >
                       <CheckCircle size={20} />
                       Marcar como Entregue
                     </button>
                   )}
                   {activeTab === 'delivered' && (
                     <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                        <CheckCircle size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pedido Entregue</span>
                     </div>
                   )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="col-span-full py-32 text-center">
             <div className="w-20 h-20 bg-gray-50 text-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
                {activeTab === 'pending' ? <Package size={32} /> : activeTab === 'shipping' ? <Truck size={32} /> : <CheckCircle size={32} />}
             </div>
             <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Nenhum pedido nesta etapa</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedSale && (
          <ReceiptModal 
            sale={selectedSale} 
            products={products} 
            customers={customers}
            company={company}
            couponConfig={couponConfig}
            onClose={() => setSelectedSale(null)} 
            isFinalized={true}
            imprimirCupom={imprimirCupom}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
function CashierView({ 
  cashierSession,
  setCashierSession,
  sales,
  closedSessions,
  setClosedSessions,
  addActivity,
  users,
  couponConfig,
  imprimirCupom
}: { 
  cashierSession: CashierSession,
  setCashierSession: any,
  sales: Sale[],
  closedSessions: CashierSession[],
  setClosedSessions: any,
  addActivity: (type: Activity['type'], action: string, details: string, extra?: Partial<Activity>) => void,
  users: SystemUser[],
  couponConfig: CouponConfig,
  imprimirCupom: (sale: Sale | string) => Promise<boolean>
}) {
  const [openingBalanceInput, setOpeningBalanceInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [reportData, setReportData] = useState<CashierSession | null>(null);

  const handleOpenCashier = () => {
    const val = parseFloat(openingBalanceInput);
    if (isNaN(val)) return alert('Informe um valor válido.');
    
    setCashierSession({
      id: crypto.randomUUID(),
      isOpen: true,
      openedAt: new Date().toLocaleString('pt-BR'),
      openingBalance: val,
      totalSales: 0,
      totalCanceled: 0,
      salesCount: 0,
      canceledCount: 0,
      salesByMethod: {}
    });
    addActivity('system', 'Caixa Aberto', `Saldo inicial: R$ ${val.toFixed(2)}.`);
  };

  const handlePrintReport = async () => {
    if (!reportData) return;
    
    const reportHtml = `
      <html>
        <head>
          <title>Fechamento de Caixa</title>
          <style>
            body { font-family: monospace; width: ${couponConfig.format === '58mm' ? '58mm' : '80mm'}; margin: 0; padding: 5mm; }
            .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
            .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
            .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>FECHAMENTO DE CAIXA</h3>
            <p>${reportData.closedAt}</p>
          </div>
          <div class="item"><span>INICIAL</span><span>R$ ${reportData.openingBalance.toFixed(2)}</span></div>
          <div class="item"><span>ENTRADAS</span><span>R$ ${reportData.totalSales.toFixed(2)}</span></div>
          ${Object.entries(reportData.salesByMethod).map(([method, amount]) => `
            <div class="item" style="padding-left: 10px; font-size: 10px;">
              <span>- ${method}</span><span>R$ ${(Number(amount) || 0).toFixed(2)}</span>
            </div>
          `).join('')}
          <div class="item"><span>REFORÇOS</span><span>R$ ${(reportData.reforsos || 0).toFixed(2)}</span></div>
          <div class="item"><span>SANGRIAS</span><span>R$ ${(reportData.sangrias || 0).toFixed(2)}</span></div>
          <div class="item"><span>SAIDAS/CANCEL</span><span>R$ ${reportData.totalCanceled.toFixed(2)}</span></div>
          <div class="total">
            <div class="item"><span>RESUMO FINAL</span><span>R$ ${((reportData.closingBalance ?? 0)).toFixed(2)}</span></div>
          </div>
        </body>
      </html>
    `;

    if (couponConfig.printMode === 'auto') {
      const handled = await imprimirCupom(reportHtml);
      if (handled) return;
    }
    
    window.print();
  };

  const handleCloseCashier = () => {
    const isMasterPassword = passwordInput === '1234';
    const user = users.find(u => u.password === passwordInput || (isMasterPassword && u.roleId === 'admin'));
    
    if (!isMasterPassword && !user) return alert('Senha inválida!');

    const userName = user?.name || 'Administrador';

    // Recalculate totals based on actual sales linked to this session
    const sessionSales = sales.filter(s => s.cashierSessionId === cashierSession.id && s.status !== 'cancelado');
    const totalSalesCalculated = sessionSales.reduce((acc, s) => acc + s.total, 0);
    const salesCountCalculated = sessionSales.length;
    
    // Group sales by method
    const salesByMethodCalculated = sessionSales.reduce((acc, s) => {
      acc[s.paymentMethod] = (acc[s.paymentMethod] || 0) + s.total;
      return acc;
    }, {} as Record<string, number>);

    const canceledSales = sales.filter(s => s.cashierSessionId === cashierSession.id && s.status === 'cancelado');
    const totalCanceledCalculated = canceledSales.reduce((acc, s) => acc + s.total, 0);
    const canceledCountCalculated = canceledSales.length;

    const closedSession: CashierSession = {
      ...cashierSession,
      isOpen: false,
      userId: user?.id,
      userName: userName,
      closedAt: new Date().toLocaleString('pt-BR'),
      totalSales: totalSalesCalculated,
      salesCount: salesCountCalculated,
      salesByMethod: salesByMethodCalculated,
      totalCanceled: totalCanceledCalculated,
      canceledCount: canceledCountCalculated,
      closingBalance: cashierSession.openingBalance + totalSalesCalculated - (cashierSession.sangrias || 0) + (cashierSession.reforsos || 0)
    };
    
    setReportData(closedSession);
    setClosedSessions((prev: CashierSession[]) => [...prev, closedSession]);
    setCashierSession({
      id: '', isOpen: false, openedAt: '', openingBalance: 0, totalSales: 0, totalCanceled: 0, salesCount: 0, canceledCount: 0, salesByMethod: {}, reforsos: 0, sangrias: 0, estornos: 0, descontos: 0, acrescimos: 0, taxaEntrega: 0
    });
    addActivity('system', 'Caixa Fechado', `Fechado por ${userName}. Saldo final: R$ ${closedSession.closingBalance?.toFixed(2)}.`);
    setShowCloseConfirm(false);
    setPasswordInput('');
  };

  if (reportData) {
    return (
      <div className="max-w-md mx-auto bg-[#fffbd5] p-8 rounded-3xl border border-amber-100 shadow-xl space-y-6 animate-in fade-in zoom-in-95 duration-500 font-mono text-gray-800">
        <div className="text-center space-y-1 relative">
          <button onClick={() => setReportData(null)} className="absolute -top-4 -right-4 bg-white text-gray-400 p-2 rounded-full hover:text-red-500 shadow-sm border border-gray-100"><X size={16} /></button>
          <h3 className="text-lg font-black uppercase tracking-widest border-b border-gray-300 pb-2 mb-4">Fechamento do Caixa</h3>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-1 text-[9px] border-b border-gray-200 pb-4">
            <div className="flex justify-between"><span>ABERTURA:</span><span className="font-bold">{reportData.openedAt}</span></div>
            <div className="flex justify-between"><span>FECHAMENTO:</span><span className="font-bold">{reportData.closedAt}</span></div>
            <div className="flex justify-between"><span>ID SESSÃO:</span><span className="font-bold">#{reportData.id.substring(0, 8).toUpperCase()}</span></div>
          </div>

          <div className="space-y-2 pt-2 text-[10px]">
            <div className="flex justify-between font-bold"><span>(+) SALDO INICIAL</span><span>R$ {reportData.openingBalance.toFixed(2)}</span></div>
            
            <div className="border-t border-gray-100 my-2"></div>
            
            <div className="flex justify-between font-bold text-emerald-600"><span>(+) TOTAL ENTRADAS</span><span>R$ {reportData.totalSales.toFixed(2)}</span></div>
            
            {/* Payment methods detail - grouping for clearer report */}
            <div className="pl-4 space-y-1">
              {Object.entries(reportData.salesByMethod).map(([method, amount]) => (
                <div key={method} className="flex justify-between text-[9px] text-gray-500 uppercase italic">
                  <span>- {method}</span>
                  <span>R$ {(Number(amount) || 0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            
            {reportData.reforsos ? (
              <div className="flex justify-between"><span>(+) REFORÇOS</span><span>R$ {reportData.reforsos.toFixed(2)}</span></div>
            ) : null}

            <div className="border-t border-gray-100 my-2"></div>

            <div className="flex justify-between text-red-500"><span>(-) SANGRIAS</span><span>R$ {(reportData.sangrias || 0).toFixed(2)}</span></div>
            <div className="flex justify-between text-red-500"><span>(-) ESTORNOS/CANCEL</span><span>R$ {(reportData.totalCanceled || 0).toFixed(2)}</span></div>
          </div>

          <div className="flex justify-between pt-6 border-t border-gray-400 font-black text-lg text-indigo-700 bg-white/50 p-2 rounded-xl">
            <span>RESUMO FINAL</span>
            <span>R$ {reportData.closingBalance?.toFixed(2)}</span>
          </div>

          <div className="pt-4 text-center border-t border-dashed border-gray-300">
             <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{reportData.salesCount} Vendas Processadas</p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-[8px] font-black uppercase text-gray-400 tracking-widest mb-2 italic">Formato: {couponConfig.format}</p>
        </div>

        <div className="flex gap-4 pt-4 no-print">
          <button onClick={handlePrintReport} className="flex-1 bg-white text-gray-800 p-4 rounded-2xl font-black text-[10px] uppercase border border-gray-200 flex items-center justify-center gap-2 shadow-sm"><Printer size={16} /> Imprimir</button>
          <button onClick={() => setReportData(null)} className="flex-1 bg-gray-900 text-white p-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all">Sair</button>
        </div>
      </div>
    );
  }

  if (!cashierSession.isOpen) {
    return (
      <div className="max-w-md mx-auto bg-white p-10 rounded-3xl border border-gray-100 shadow-xl space-y-8 animate-in fade-in slide-in-from-bottom-4">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto text-[#5d5dff]"><Unlock size={32} /></div>
          <div><h3 className="text-xl font-black text-gray-800 uppercase tracking-widest">Abrir Caixa</h3><p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">Sessão Financeira</p></div>
        </div>
        <div className="space-y-6">
          <div className="relative">
            <Input 
              label="Valor Inicial em Caixa" 
              value={openingBalanceInput} 
              onChange={setOpeningBalanceInput} 
              placeholder="0,00"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleOpenCashier();
              }}
            />
          </div>
          <button onClick={handleOpenCashier} className="w-full bg-[#5d5dff] text-white p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"><Zap size={16} fill="white" /> Iniciar Sessão</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
             <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status da Sessão</p>
             <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /><span className="text-lg font-black text-gray-800 uppercase tracking-tighter">Caixa Aberto</span></div>
          </div>
          <Lock size={24} className="text-green-500" />
        </div>
        
        <div className="grid grid-cols-2 gap-4 border-y border-gray-50 py-6 text-center">
          <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Aberto em</p><p className="text-xs font-black text-gray-800">{cashierSession.openedAt}</p></div>
          <div><p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Saldo Inicial</p><p className="text-xs font-black text-gray-800">R$ {cashierSession.openingBalance.toFixed(2)}</p></div>
        </div>

        <div className="space-y-4">
           <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Vendas Acumuladas</span><span className="text-lg font-black text-green-600 tracking-tighter">R$ {cashierSession.totalSales.toFixed(2)}</span></div>
           <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Cancelamentos</span><span className="text-lg font-black text-red-500 tracking-tighter">- R$ {cashierSession.totalCanceled.toFixed(2)}</span></div>
        </div>

        <button onClick={() => setShowCloseConfirm(true)} className="w-full bg-red-50 text-red-500 p-5 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-100 hover:bg-red-100 transition-all flex items-center justify-center gap-2"><Lock size={16} /> Encerrar Sessão</button>
      </div>

      <AnimatePresence>
        {showCloseConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-3xl max-w-sm w-full space-y-6 shadow-2xl">
              <div className="text-center"><Trash2 size={48} className="text-red-500 mx-auto mb-4" /><h4 className="text-lg font-black text-gray-800 uppercase tracking-widest">Fechar Caixa</h4><p className="text-xs text-gray-500 font-bold mt-2">Insira sua senha para confirmar o fechamento.</p></div>
              <div className="space-y-4"><Input label="Senha" value={passwordInput} onChange={setPasswordInput} type="password" placeholder="****" /><div className="flex gap-3"><button onClick={() => setShowCloseConfirm(false)} className="flex-1 p-4 rounded-2xl bg-gray-50 text-gray-400 font-black text-[10px] uppercase">Cancelar</button><button onClick={handleCloseCashier} className="flex-1 p-4 rounded-2xl bg-red-500 text-white font-black text-[10px] uppercase shadow-lg shadow-red-100">CONFIRMAR</button></div></div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CashierHistoryView({ 
  closedSessions,
  imprimirCupom,
  couponConfig
}: { 
  closedSessions: CashierSession[],
  imprimirCupom: (s: string) => Promise<boolean>,
  couponConfig: CouponConfig
}) {
  const [selectedSession, setSelectedSession] = useState<CashierSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSessions = useMemo(() => {
    return closedSessions
      .filter(s => 
        s.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.closedAt?.includes(searchTerm)
      )
      .sort((a, b) => {
        // Simple date comparison for pt-BR string "DD/MM/YYYY, HH:MM:SS"
        const parseDate = (d?: string) => {
          if (!d) return 0;
          try {
            const [datePart, timePart] = d.split(', ');
            const [day, month, year] = datePart.split('/');
            return new Date(`${year}-${month}-${day}T${timePart}`).getTime();
          } catch { return 0; }
        };
        return parseDate(b.closedAt) - parseDate(a.closedAt);
      });
  }, [closedSessions, searchTerm]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-gray-800 uppercase tracking-widest">Histórico de Caixas</h2>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">Visualize o registro de todos os fechamentos realizados</p>
        </div>
        
        <div className="relative w-full md:w-72">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="BUSCAR POR USUÁRIO OU DATA..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border border-gray-100 rounded-2xl outline-none focus:ring-2 focus:ring-amber-400 text-[10px] font-black uppercase tracking-widest transition-all"
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                <th className="px-8 py-5">Sessão / Data</th>
                <th className="px-8 py-5">Usuário</th>
                <th className="px-8 py-5 text-right">Saldo Final</th>
                <th className="px-8 py-5 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredSessions.map((session) => (
                <tr key={session.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center shrink-0">
                          <Calculator size={20} />
                       </div>
                       <div>
                         <p className="text-[10px] font-black text-gray-800 uppercase">#{session.id.substring(0, 8)}</p>
                         <p className="text-[9px] font-bold text-gray-400 uppercase">{session.closedAt}</p>
                       </div>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-100/80 px-3 py-1.5 rounded-full inline-flex items-center gap-2">
                      <User size={12} className="text-gray-400" />
                      {session.userName || 'ADMINISTRADOR'}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <p className="text-sm font-black text-gray-900 tracking-tighter">R$ {session.closingBalance?.toFixed(2)}</p>
                    <p className="text-[9px] font-bold text-emerald-500 uppercase">Vendas: R$ {session.totalSales.toFixed(2)}</p>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex justify-center gap-2">
                       <button 
                         onClick={() => setSelectedSession(session)}
                         className="p-3 bg-white border border-gray-100 text-gray-400 rounded-xl hover:bg-amber-50 hover:text-amber-600 transition-all shadow-sm group-hover:border-amber-100 flex items-center gap-2"
                         title="Ver Relatório"
                       >
                         <Receipt size={18} />
                         <span className="text-[10px] font-black uppercase tracking-widest px-1">Ver</span>
                       </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSessions.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-24 text-center">
                    <div className="flex flex-col items-center justify-center space-y-4 opacity-20">
                      <History size={64} />
                      <p className="text-sm font-black uppercase tracking-[0.2em]">Nenhuma sessão concluída</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedSession && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-100">
                      <Receipt size={24} />
                   </div>
                   <div>
                     <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Relatório de Fechamento</h3>
                     <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tight">Sessão #{selectedSession.id.substring(0, 8)}</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedSession(null)}
                  className="p-3 hover:bg-white rounded-2xl transition-all text-gray-400 hover:text-gray-900 shadow-sm"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 bg-gray-50/30">
                 <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
                    <div className="text-center space-y-2 border-b border-dashed border-gray-200 pb-6 mb-6">
                       <h4 className="text-lg font-black text-gray-800 uppercase">Resumo da Movimentação</h4>
                       <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Operador: {selectedSession.userName || 'ADMINISTRADOR'}</p>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-1 text-[9px] border-b border-gray-100 pb-4">
                        <div className="flex justify-between"><span>ABERTURA:</span><span className="font-bold">{selectedSession.openedAt}</span></div>
                        <div className="flex justify-between"><span>FECHAMENTO:</span><span className="font-bold">{selectedSession.closedAt}</span></div>
                        <div className="flex justify-between"><span>SESSÃO ID:</span><span className="font-bold uppercase">#{selectedSession.id.substring(0, 8)}</span></div>
                      </div>

                      <div className="space-y-2 pt-2 text-[10px]">
                        <div className="flex justify-between font-bold"><span>(+) SALDO INICIAL</span><span>R$ {selectedSession.openingBalance.toFixed(2)}</span></div>
                        
                        <div className="border-t border-gray-100 my-2"></div>
                        
                        <div className="flex justify-between font-bold text-emerald-600"><span>(+) TOTAL ENTRADAS</span><span>R$ {selectedSession.totalSales.toFixed(2)}</span></div>
                        
                        <div className="pl-4 space-y-1">
                          {Object.entries(selectedSession.salesByMethod || {}).map(([method, amount]) => (
                            <div key={method} className="flex justify-between text-[9px] text-gray-500 uppercase italic">
                              <span>- {method}</span>
                              <span>R$ {(Number(amount) || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                        
                        {selectedSession.reforsos ? (
                          <div className="flex justify-between opacity-70"><span>(+) REFORÇOS</span><span>R$ {selectedSession.reforsos.toFixed(2)}</span></div>
                        ) : null}

                        <div className="border-t border-gray-100 my-2"></div>

                        <div className="flex justify-between text-red-500 opacity-70"><span>(-) SANGRIAS</span><span>R$ {(selectedSession.sangrias || 0).toFixed(2)}</span></div>
                        <div className="flex justify-between text-red-500 opacity-70"><span>(-) ESTORNOS/CANCEL</span><span>R$ {(selectedSession.totalCanceled || 0).toFixed(2)}</span></div>
                      </div>

                      <div className="flex justify-between pt-6 border-t border-gray-400 font-black text-lg text-indigo-700 bg-indigo-50/50 p-4 rounded-2xl">
                        <span>RESUMO FINAL</span>
                        <span>R$ {selectedSession.closingBalance?.toFixed(2)}</span>
                      </div>
                      
                      <div className="pt-4 text-center">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{selectedSession.salesCount} Vendas Processadas</p>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
                 <button 
                   onClick={() => setSelectedSession(null)}
                   className="flex-1 py-5 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-[0.2em] text-gray-400 hover:bg-white transition-all shadow-sm"
                 >
                   Fechar
                 </button>
                 <button 
                   onClick={async () => {
                     const reportHtml = `
                       <html>
                         <head>
                           <title>Relatório de Sessão</title>
                           <style>
                             body { font-family: monospace; width: ${couponConfig.format === '58mm' ? '58mm' : '80mm'}; margin: 0; padding: 5mm; }
                             .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 5px; margin-bottom: 10px; }
                             .item { display: flex; justify-content: space-between; margin-bottom: 2px; }
                             .total { font-weight: bold; font-size: 14px; border-top: 1px solid #000; padding-top: 5px; margin-top: 10px; }
                           </style>
                         </head>
                         <body onload="window.print()">
                           <div class="header">
                             <h3>HISTÓRICO DE FECHAMENTO</h3>
                             <p>Sessão: #${selectedSession.id.substring(0, 8).toUpperCase()}</p>
                           </div>
                           <div class="item"><span>OPERADOR</span><span>${selectedSession.userName || 'ADMINISTRADOR'}</span></div>
                           <div class="item"><span>FECHADO EM</span><span>${selectedSession.closedAt}</span></div>
                           <div class="item"><span>SALDO INICIAL</span><span>R$ ${selectedSession.openingBalance.toFixed(2)}</span></div>
                           <div class="item"><span>ENTRADAS</span><span>R$ ${selectedSession.totalSales.toFixed(2)}</span></div>
                           <div class="total"><span>SALDO FINAL</span><span>R$ ${selectedSession.closingBalance?.toFixed(2)}</span></div>
                         </body>
                       </html>
                     `;
                     imprimirCupom(reportHtml);
                   }}
                   className="flex-1 py-5 rounded-2xl bg-amber-500 text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-amber-100 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                 >
                   <Printer size={16} />
                   Imprimir Cupom
                 </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function SeparationView({ 
  sales, 
  setSales, 
  products, 
  setProducts, 
  addActivity,
  customers,
  deliveryChannels,
  deliveryMethods,
  revenues,
  setRevenues
}: { 
  sales: Sale[], 
  setSales: any, 
  products: Product[], 
  setProducts: any, 
  addActivity: any,
  customers: Customer[],
  deliveryChannels: DeliveryChannel[],
  deliveryMethods: DeliveryMethod[],
  revenues: Revenue[],
  setRevenues: any
}) {
  const [activeTab, setActiveTab] = useState<'pendente' | 'em_separacao' | 'separado' | 'embalado' | 'enviado' | 'entregue'>('pendente');
  const [scanningSaleId, setScanningSaleId] = useState<string | null>(null);
  const [scannedItems, setScannedItems] = useState<{ productId: string, quantity: number }[]>([]);
  const [scanInput, setScanInput] = useState('');
  const [manualQty, setManualQty] = useState('1');
  
  const [shippingModalSaleId, setShippingModalSaleId] = useState<string | null>(null);
  const [shippingInfo, setShippingInfo] = useState({ trackingCode: '', deliveryChannelId: '', deliveryMethodId: '' });
  const [lastScannedProduct, setLastScannedProduct] = useState<Product | null>(null);
  const [orderSearch, setOrderSearch] = useState('');

  const handleOrderSearch = (e: FormEvent) => {
    e.preventDefault();
    const cleanSearch = orderSearch.trim();
    if (!cleanSearch) return;

    // Search by sequentialId (padded or not) or ID
    const sale = sales.find(s => 
      s.sequentialId === cleanSearch || 
      (s.sequentialId && parseInt(s.sequentialId) === parseInt(cleanSearch)) ||
      s.id.startsWith(cleanSearch)
    );

    if (sale) {
      if (sale.status === 'cancelado') {
        alert('Este pedido foi cancelado!');
      } else {
        startSeparation(sale.id);
        setOrderSearch('');
      }
    } else {
      alert('Pedido não encontrado!');
    }
  };

  useEffect(() => {
    if (lastScannedProduct) {
      const timer = setTimeout(() => {
        setLastScannedProduct(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [lastScannedProduct]);

  const filteredSales = sales.filter(s => (s.status || 'pendente') === activeTab);

  // Status flow mapping
  const nextStatusMap: Record<string, Sale['status']> = {
    'pendente': 'em_separacao',
    'em_separacao': 'separado',
    'separado': 'embalado',
    'embalado': 'enviado',
    'enviado': 'entregue'
  };

  const handleStatusUpdate = (saleId: string, nextStatus: Sale['status'], extra?: Partial<Sale>) => {
    const saleToUpdate = sales.find(s => s.id === saleId);
    if (!saleToUpdate) return;

    // Logic for stock reduction only when finishing conference
    if (nextStatus === 'separado') {
      // Prevent negative stock
      const insufficientStock = saleToUpdate.items.some(item => {
        const p = products.find(prod => prod.id === item.productId);
        return p && p.stock < item.quantity;
      });

      if (insufficientStock) {
        alert('Impossível mover: Um ou mais itens não possuem estoque suficiente.');
        return;
      }

      setProducts((prev: Product[]) => prev.map(p => {
        const item = saleToUpdate.items.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        return p;
      }));

      // Confirm revenue and sync amount if changed
      setRevenues((prev: Revenue[]) => prev.map(r => 
        r.saleId === saleId ? { ...r, status: 'confirmado' as const, amount: saleToUpdate.total } : r
      ));
    }

    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { ...s, status: nextStatus, ...extra } : s));
    addActivity('sale', 'Pedido Atualizado', `Venda ${saleToUpdate.sequentialId} movida para ${nextStatus}.`);
  };

  const startSeparation = (saleId: string) => {
    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { ...s, status: 'em_separacao' } : s));
    setScanningSaleId(saleId);
    setScannedItems([]);
    setActiveTab('em_separacao');
  };

  const handleCancelOrder = (saleId: string) => {
    if (!confirm('Deseja realmente cancelar este pedido?')) return;
    
    setSales((prev: Sale[]) => prev.map(s => s.id === saleId ? { ...s, status: 'cancelado' as const } : s));
    setRevenues((prev: Revenue[]) => prev.map(r => 
      r.saleId === saleId ? { ...r, status: 'cancelado' as const } : r
    ));
    addActivity('sale', 'Pedido Cancelado', `Venda ${saleId.substring(0, 8)} cancelada.`);
    setScanningSaleId(null);
  };

  const finishSeparation = (saleId: string) => {
    const sale = sales.find(s => s.id === saleId);
    if (!sale) return;

    const itemsPending = sale.items.filter(item => {
      const scanned = scannedItems.find(si => si.productId === item.productId)?.quantity || 0;
      return scanned < item.quantity;
    });

    const performFinalization = (finalItems: { productId: string, quantity: number, price: number, cost: number, profit: number }[], isPartial: boolean) => {
      const newTotal = finalItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
      const newTotalCost = finalItems.reduce((acc, item) => acc + (item.cost * item.quantity), 0);
      const newTotalProfit = newTotal - newTotalCost;

      // 1. Update Stock for separated items
      setProducts((prev: Product[]) => prev.map(p => {
        const item = finalItems.find(i => i.productId === p.id);
        if (item) return { ...p, stock: Math.max(0, p.stock - item.quantity) };
        return p;
      }));

      // 2. Update Sale Status, Items, and Total
      setSales((prev: Sale[]) => prev.map(s => {
        if (s.id === saleId) {
          return { 
            ...s, 
            status: 'separado', 
            items: finalItems,
            total: newTotal,
            totalCost: newTotalCost,
            totalProfit: newTotalProfit,
            notes: isPartial ? `${s.notes || ''} [Cancelamento Parcial na Separação - Itens não atendidos]`.trim() : s.notes
          };
        }
        return s;
      }));

      // 3. Sync Revenue Status and Amount
      setRevenues((prev: Revenue[]) => prev.map(r => 
        r.saleId === saleId ? { ...r, status: 'confirmado' as const, amount: newTotal } : r
      ));

      addActivity('sale', isPartial ? 'Pedido Separado (Ajustado)' : 'Pedido Separado', `Venda ${sale.sequentialId} finalizada com ${isPartial ? 'ajuste de itens faltantes' : 'sucesso'}.`);
      setScanningSaleId(null);
      setScannedItems([]);
      setActiveTab('separado');
    };

    if (itemsPending.length > 0) {
      if (confirm('Existem produtos não separados. Deseja continuar? O pedido será ajustado para conter apenas o que foi bipado e os itens faltantes serão registrados como não atendidos.')) {
        const adjustedItems = sale.items.map(item => {
          const scanned = scannedItems.find(si => si.productId === item.productId)?.quantity || 0;
          return { ...item, quantity: scanned };
        }).filter(item => item.quantity > 0);

        if (adjustedItems.length === 0) {
          alert('Não é possível finalizar sem nenhum item separado. Cancele o pedido se necessário.');
          return;
        }

        performFinalization(adjustedItems as any, true);
      }
    } else {
      performFinalization(sale.items, false);
    }
  };

  const handleScan = (e?: FormEvent) => {
    e?.preventDefault();
    if (!scanningSaleId || !scanInput.trim()) return;

    const sale = sales.find(s => s.id === scanningSaleId);
    if (!sale) return;

    const query = scanInput.trim();
    // Search in products by barcode or SKU
    const product = products.find(p => p.barcode === query || p.sku === query || p.id === query);
    
    if (!product) {
      alert('Produto não encontrado no catálogo!');
      setScanInput('');
      return;
    }

    const itemInSale = sale.items.find(i => i.productId === product.id);
    if (!itemInSale) {
      alert('Produto não pertence ao pedido!');
      setScanInput('');
      return;
    }

    const qtyToAdd = parseInt(manualQty) || 1;
    const currentlyScanned = scannedItems.find(si => si.productId === product.id)?.quantity || 0;

    if (currentlyScanned + qtyToAdd > itemInSale.quantity) {
      alert(`Quantidade bipada (${currentlyScanned + qtyToAdd}) excede o pedido (${itemInSale.quantity})!`);
      setScanInput('');
      return;
    }

    setLastScannedProduct(product);
    setScannedItems(prev => {
      const existing = prev.find(i => i.productId === product.id);
      if (existing) {
        return prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + qtyToAdd } : i);
      }
      return [...prev, { productId: product.id, quantity: qtyToAdd }];
    });

    setScanInput('');
    setManualQty('1');
  };

  const isScanningFull = () => {
    if (!scanningSaleId) return false;
    const sale = sales.find(s => s.id === scanningSaleId);
    if (!sale) return false;
    return sale.items.every(item => {
      const scanned = scannedItems.find(s => s.productId === item.productId);
      return scanned && scanned.quantity === item.quantity;
    });
  };

  const getConferenceProgress = () => {
    if (!scanningSaleId) return { current: 0, total: 0 };
    const sale = sales.find(s => s.id === scanningSaleId);
    if (!sale) return { current: 0, total: 0 };
    const totalItems = sale.items.reduce((acc, i) => acc + i.quantity, 0);
    const currentScanned = scannedItems.reduce((acc, i) => acc + i.quantity, 0);
    return { current: currentScanned, total: totalItems };
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full aria-hidden flex items-center justify-center">
            <Boxes size={20} />
          </div>
          <div>
            <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Fluxo de Separação</h3>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Gestão de Logística Interna</p>
          </div>
        </div>
      </div>

      {/* Buscar Pedido */}
      <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleOrderSearch} className="flex gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Digite ou bipe o número do pedido (Ex: 00001)..."
              value={orderSearch}
              onChange={e => setOrderSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 text-sm font-bold uppercase transition-all"
            />
          </div>
          <button 
            type="submit"
            className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <QrCode size={14} /> Buscar Pedido
          </button>
        </form>
      </div>

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        {[
          { id: 'pendente', label: 'Pendentes', icon: Clock, color: 'text-orange-500' },
          { id: 'em_separacao', label: 'Separando', icon: ScanLine, color: 'text-indigo-500' },
          { id: 'separado', label: 'Separado', icon: Handshake, color: 'text-blue-500' },
          { id: 'embalado', label: 'Embalado', icon: Package, color: 'text-purple-500' },
          { id: 'enviado', label: 'Enviado', icon: Send, color: 'text-emerald-500' },
          { id: 'entregue', label: 'Entregue', icon: CheckCircle2, color: 'text-gray-500' }
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id as any)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shrink-0 border ${
              activeTab === t.id 
                ? 'bg-white border-gray-200 shadow-sm ' + t.color 
                : 'bg-transparent border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            <t.icon size={14} className={activeTab === t.id ? t.color : 'text-gray-300'} />
            {t.label}
            <span className={`ml-1 px-2 py-0.5 rounded-full text-[9px] ${activeTab === t.id ? 'bg-gray-100' : 'bg-gray-50'}`}>
              {sales.filter(s => (s.status || 'pendente') === t.id).length}
            </span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4">
        {filteredSales.length > 0 ? filteredSales.map(sale => {
          const customer = customers.find(c => c.id === sale.customerId);
          return (
            <div key={sale.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm space-y-4 hover:shadow-md transition-shadow relative overflow-hidden group">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black bg-gray-50 text-gray-500 px-3 py-1 rounded-full uppercase tracking-widest">PEDIDO #{sale.sequentialId}</span>
                    {sale.deliveryChannelId && (
                      <span className="text-[9px] font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md uppercase tracking-wider">
                         {deliveryChannels.find(dc => dc.id === sale.deliveryChannelId)?.name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-black text-gray-800 uppercase">{customer?.name || 'Cliente Casual'}</p>
                  <p className="text-[10px] text-gray-400 font-bold">{new Date(sale.date).toLocaleString('pt-BR')}</p>
                </div>

                <div className="flex gap-2">
                  {activeTab === 'pendente' && (
                    <button 
                      onClick={() => startSeparation(sale.id)}
                      className="bg-indigo-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                    >
                      <ScanLine size={14} /> Iniciar Separação
                    </button>
                  )}
                  {activeTab === 'em_separacao' && (
                    <button 
                      onClick={() => {
                        setScanningSaleId(sale.id);
                        // Maintain current scanned items if re-opening
                      }}
                      className="bg-indigo-50 text-indigo-600 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-100 transition-all flex items-center gap-2"
                    >
                      <ScanLine size={14} /> Abrir Separação
                    </button>
                  )}
                  {activeTab === 'separado' && (
                    <button 
                      onClick={() => handleStatusUpdate(sale.id, 'embalado')}
                      className="bg-purple-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-purple-700 transition-all shadow-lg shadow-purple-100 flex items-center gap-2"
                    >
                      <Package size={14} /> Marcar como Embalado
                    </button>
                  )}
                  {activeTab === 'embalado' && (
                    <button 
                      onClick={() => {
                        setShippingModalSaleId(sale.id);
                        setShippingInfo({ 
                          trackingCode: sale.trackingCode || '', 
                          deliveryChannelId: sale.deliveryChannelId || '', 
                          deliveryMethodId: sale.deliveryMethodId || '' 
                        });
                      }}
                      className="bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                    >
                      <Send size={14} /> Despachar Pedido
                    </button>
                  )}
                  {activeTab === 'enviado' && (
                    <button 
                      onClick={() => handleStatusUpdate(sale.id, 'entregue')}
                      className="bg-gray-800 text-white px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg shadow-gray-200 flex items-center gap-2"
                    >
                      <CheckCircle2 size={14} /> Confirmar Entrega
                    </button>
                  )}
                  <button 
                    onClick={() => handleCancelOrder(sale.id)}
                    className="p-3 text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Items Summary */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                {sale.items.map(item => {
                  const product = products.find(p => p.id === item.productId);
                  return (
                    <div key={item.productId} className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
                          {product?.imageUrl ? <img src={product.imageUrl} className="w-full h-full object-cover" /> : <Package size={12} className="text-gray-300" />}
                        </div>
                        <span className="font-bold text-gray-700">{product?.name || 'Produto Excluído'}</span>
                      </div>
                      <span className="font-black text-gray-900">QTD: {item.quantity}</span>
                    </div>
                  );
                })}
              </div>

              {activeTab === 'enviado' && sale.trackingCode && (
                <div className="pt-2 flex items-center gap-4 text-[10px] font-bold text-indigo-600">
                   <div className="flex items-center gap-1"><Truck size={12} /> {sale.deliveryMethod}</div>
                   <div className="flex items-center gap-1"><Barcode size={12} /> {sale.trackingCode}</div>
                </div>
              )}
            </div>
          );
        }) : (
          <div className="py-20 text-center flex flex-col items-center justify-center text-gray-400 space-y-4 bg-gray-50/50 rounded-3xl border-2 border-dashed border-gray-100">
            <Boxes size={48} className="opacity-10" />
            <p className="text-sm font-black uppercase tracking-widest italic opacity-40">Nenhum pedido nesta etapa</p>
          </div>
        )}
      </div>

      {/* Conference Modal */}
      <AnimatePresence>
        {scanningSaleId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} className="bg-white p-8 rounded-[2.5rem] max-w-2xl w-full shadow-2xl space-y-8 relative overflow-hidden flex flex-col max-h-[90vh]">
              <div className="absolute top-0 left-0 w-full h-2 bg-indigo-500" />
              <button onClick={() => setScanningSaleId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500 transition-colors"><X size={24} /></button>
              
              <div className="text-center space-y-2">
                <ScanLine size={48} className="mx-auto text-indigo-500" />
                <h4 className="text-2xl font-black text-gray-800 uppercase tracking-widest">Separação de Pedido</h4>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Escaneie ou digite os produtos para validar</p>
              </div>

              {/* Progress */}
              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Status da Separação</p>
                    <p className="text-xl font-black text-indigo-600">{getConferenceProgress().current} / {getConferenceProgress().total} Itens</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Progresso</p>
                    <p className="text-xl font-black text-indigo-600">
                      {getConferenceProgress().total > 0 ? Math.round((getConferenceProgress().current / getConferenceProgress().total) * 100) : 0}%
                    </p>
                  </div>
                </div>
                <div className="w-full h-3 bg-white rounded-full overflow-hidden border border-indigo-100">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${getConferenceProgress().total > 0 ? (getConferenceProgress().current / getConferenceProgress().total) * 100 : 0}%` }} className="h-full bg-indigo-500" />
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-24">
                  <Input label="QTD" value={manualQty} onChange={setManualQty} placeholder="1" type="number" />
                </div>
                <form onSubmit={handleScan} className="flex-1">
                  <Input label="BIPAR OU DIGITAR CÓDIGO" autoFocus placeholder="CÓDIGO DE BARRAS / SKU" value={scanInput} onChange={setScanInput} />
                </form>
              </div>

              {lastScannedProduct && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center gap-4">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center border border-emerald-100 overflow-hidden">
                    {lastScannedProduct.imageUrl ? <img src={lastScannedProduct.imageUrl} className="w-full h-full object-cover" /> : <Package className="text-emerald-500" />}
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Item Identificado</p>
                    <p className="text-sm font-black text-gray-800 uppercase">{lastScannedProduct.name}</p>
                  </div>
                </motion.div>
              )}

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[400px] max-h-[60vh] space-y-3">
                {sales.find(s => s.id === scanningSaleId)?.items
                  .map(item => {
                    const product = products.find(p => p.id === item.productId);
                    const scanned = scannedItems.find(si => si.productId === item.productId)?.quantity || 0;
                    const isDone = scanned >= item.quantity;
                    const pending = item.quantity - scanned;

                    return { ...item, product, scanned, isDone, pending };
                  })
                  .sort((a, b) => (a.isDone === b.isDone ? 0 : a.isDone ? 1 : -1)) // Pending items first
                  .map(item => (
                    <div 
                      key={item.productId} 
                      className={`p-4 rounded-2xl border transition-all duration-300 ${
                        item.isDone 
                          ? 'bg-gray-50/50 border-gray-100 opacity-40 scale-[0.98]' 
                          : 'bg-white border-gray-100 shadow-sm hover:shadow-md ring-1 ring-transparent hover:ring-indigo-100'
                      }`}
                    >
                      <div className="flex items-center gap-5">
                        {/* Image Section */}
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border overflow-hidden shrink-0 shadow-inner ${
                          item.isDone ? 'bg-gray-100 border-gray-200' : 'bg-gray-50 border-gray-100'
                        }`}>
                          {item.product?.imageUrl ? (
                            <img 
                              src={item.product.imageUrl} 
                              className="w-full h-full object-cover transition-transform duration-500 hover:scale-110" 
                              referrerPolicy="no-referrer"
                            />
                          ) : (
                            <ImageIcon size={28} className="text-gray-300" />
                          )}
                        </div>

                        {/* Info Section */}
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-black uppercase truncate ${item.isDone ? 'text-gray-400' : 'text-gray-800'}`}>
                            {item.product?.name || 'Produto Sem Nome'}
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <Barcode size={14} className={item.isDone ? 'text-gray-300' : 'text-gray-400'} />
                            <p className={`text-[10px] font-black uppercase tracking-widest bg-gray-50 px-2 py-1 rounded-lg ${
                              item.isDone ? 'text-gray-300' : 'text-gray-500'
                            }`}>
                              {item.product?.barcode || item.product?.sku || 'SEM CÓDIGO'}
                            </p>
                          </div>
                        </div>

                        {/* Quantity Section */}
                        <div className="text-right shrink-0">
                          <div className="flex items-baseline justify-end gap-1.5">
                            <span className={`text-2xl font-black ${item.isDone ? 'text-gray-300' : 'text-indigo-600'}`}>
                              {item.scanned}
                            </span>
                            <span className="text-xs font-bold text-gray-400 italic">/ {item.quantity}</span>
                          </div>
                          <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Qtde. Separada</p>
                          {item.isDone && (
                            <div className="flex items-center justify-end gap-1 text-emerald-500 mt-1">
                              <CheckCircle2 size={12} />
                              <span className="text-[8px] font-black uppercase">OK</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                
                {sales.find(s => s.id === scanningSaleId)?.items.length === 0 && (
                  <div className="py-10 text-center flex flex-col items-center justify-center text-gray-400">
                    <Package size={32} className="opacity-20 mb-2" />
                    <p className="text-xs font-black uppercase tracking-widest">Nenhum item neste pedido</p>
                  </div>
                )}
                
                {sales.find(s => s.id === scanningSaleId)?.items.every(item => (scannedItems.find(si => si.productId === item.productId)?.quantity || 0) === item.quantity) && (
                  <div className="py-20 text-center flex flex-col items-center justify-center space-y-4">
                    <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-inner">
                       <CheckCircle2 size={40} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-emerald-600 uppercase tracking-widest">Separação Concluída!</p>
                      <p className="text-xs text-gray-400 font-bold mt-1 uppercase">Clique em finalizar para confirmar</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-4 pt-4 border-t border-gray-100">
                <button onClick={() => handleCancelOrder(scanningSaleId)} className="flex-1 p-5 rounded-2xl bg-red-50 text-red-500 font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all flex items-center justify-center gap-2"><Trash2 size={16} /> Cancelar Pedido</button>
                <button 
                  onClick={() => finishSeparation(scanningSaleId!)}
                  className={`flex-[2] p-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all shadow-xl ${
                    getConferenceProgress().current > 0 
                    ? 'bg-indigo-600 text-white shadow-indigo-100 hover:bg-indigo-700' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                  }`}
                >
                  FINALIZAR SEPARAÇÃO
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Shipping Info Modal */}
      <AnimatePresence>
        {shippingModalSaleId && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="bg-white p-8 rounded-[3rem] max-w-sm w-full space-y-6 shadow-2xl relative">
              <button onClick={() => setShippingModalSaleId(null)} className="absolute top-6 right-6 text-gray-400 hover:text-red-500"><X size={20} /></button>
              
              <div className="text-center space-y-2">
                <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-2"><Send size={28} /></div>
                <h4 className="text-lg font-black text-gray-800 uppercase tracking-widest">Informações de Envio</h4>
                <p className="text-xs text-gray-400 font-bold">Vincule o rastreio e canal ao pedido</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-4">Canal de Venda</label>
                  <select 
                    value={shippingInfo.deliveryChannelId}
                    onChange={e => setShippingInfo(prev => ({ ...prev, deliveryChannelId: e.target.value }))}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-400 font-bold text-xs"
                  >
                    <option value="">Nenhum</option>
                    {deliveryChannels.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Entrega</label>
                  <select 
                    value={shippingInfo.deliveryMethodId} 
                    onChange={e => setShippingInfo(prev => ({ ...prev, deliveryMethodId: e.target.value }))}
                    className="w-full p-4 bg-gray-50 rounded-2xl border border-gray-100 outline-none focus:ring-2 focus:ring-emerald-400 text-sm font-bold uppercase transition-all"
                  >
                    <option value="">Selecione o Tipo de Entrega</option>
                    {deliveryMethods.filter(m => m.isActive).map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                
                <Input 
                  label="Código de Rastreio" 
                  value={shippingInfo.trackingCode} 
                  onChange={(v) => setShippingInfo(prev => ({ ...prev, trackingCode: v }))} 
                  placeholder="Ex: BR123456789"
                />
                
                <button 
                  onClick={() => {
                    handleStatusUpdate(shippingModalSaleId, 'enviado', shippingInfo);
                    setShippingModalSaleId(null);
                  }}
                  className="w-full bg-emerald-500 text-white p-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-100 hover:bg-emerald-600 transition-all font-sans"
                >
                  Confirmar Envio
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ResultsView({ 
  sales, 
  products, 
  customers, 
  cashierSession 
}: { 
  sales: Sale[], 
  products: Product[], 
  customers: Customer[], 
  cashierSession: any 
}) {
  const [tab, setTab] = useState<'billing' | 'cashier' | 'bestsellers' | 'customers'>('billing');
  const now = new Date();
  const [filterYear, setFilterYear] = useState(now.getFullYear().toString());
  const [filterMonth, setFilterMonth] = useState((now.getMonth() + 1).toString().padStart(2, '0'));
  const [filterDay, setFilterDay] = useState(now.getDate().toString().padStart(2, '0'));

  const filteredSales = sales.filter(s => {
    const d = new Date(s.date);
    const y = d.getFullYear().toString() === filterYear;
    const m = (d.getMonth() + 1).toString().padStart(2, '0') === filterMonth;
    const dayMatch = filterDay ? d.getDate().toString().padStart(2, '0') === filterDay : true;
    return y && m && dayMatch;
  });

  const billingData = useMemo(() => {
    const data: any[] = [];
    const daysInMonth = new Date(parseInt(filterYear), parseInt(filterMonth), 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
        const dayStr = i.toString().padStart(2, '0');
        const daySales = filteredSales.filter(s => new Date(s.date).getDate() === i);
        const total = daySales.reduce((acc, s) => acc + s.total, 0);
        data.push({ name: dayStr, total });
    }
    return data;
  }, [filteredSales, filterYear, filterMonth]);

  const bestSellersData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredSales.forEach(s => {
        s.items.forEach(item => {
            counts[item.productId] = (counts[item.productId] || 0) + item.quantity;
        });
    });
    return Object.entries(counts)
        .map(([id, qty]) => {
            const p = products.find(prod => prod.id === id);
            return { name: p?.name || 'Inexistente', value: qty };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredSales, products]);

  const customerProfitData = useMemo(() => {
    const profits: Record<string, number> = {};
    filteredSales.forEach(s => {
        if (s.customerId) {
            profits[s.customerId] = (profits[s.customerId] || 0) + s.total;
        }
    });
    return Object.entries(profits)
        .map(([id, profit]) => {
            const c = customers.find(cust => cust.id === id);
            return { name: c?.name || 'Venda Avulsa', value: profit };
        })
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
  }, [filteredSales, customers]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-black text-gray-800 uppercase tracking-tighter">Resultados do Negócio</h3>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic">Análise de Performance</p>
        </div>
        
        <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
           <select value={filterYear ?? new Date().getFullYear().toString()} onChange={e => setFilterYear(e.target.value)} className="p-2 text-[10px] font-black uppercase outline-none">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
           </select>
           <select value={filterMonth ?? (new Date().getMonth() + 1).toString().padStart(2, '0')} onChange={e => setFilterMonth(e.target.value)} className="p-2 text-[10px] font-black uppercase outline-none">
              {['01','02','03','04','05','06','07','08','09','10','11','12'].map(m => (
                  <option key={m} value={m}>{m}</option>
              ))}
           </select>
           <div className="w-12">
             <input 
              type="text" 
              value={filterDay} 
              onChange={e => setFilterDay(e.target.value)} 
              placeholder="Dia" 
              className="w-full p-2 text-[10px] font-black uppercase outline-none text-center"
             />
           </div>
        </div>
      </div>

      <div className="flex overflow-x-auto gap-2 pb-2">
        {( [
          { id: 'billing', label: 'Faturamento', icon: TrendingUp },
          { id: 'cashier', label: 'Caixa', icon: Calculator },
          { id: 'bestsellers', label: 'Mais Vendidos', icon: Package },
          { id: 'customers', label: 'Clientes', icon: Users }
        ] as const).map(t => (
          <button 
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all whitespace-nowrap ${tab === t.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-gray-400 border border-gray-100 hover:border-gray-200'}`}
          >
            <t.icon size={14} /> {t.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Vendas Totais</p>
            <p className="text-2xl font-black text-gray-900 tracking-tighter">R$ {filteredSales.reduce((acc, s) => acc + s.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Qtd Vendas</p>
            <p className="text-2xl font-black text-gray-600 tracking-tighter">{filteredSales.length}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Ticket Médio</p>
            <p className="text-2xl font-black text-blue-600 tracking-tighter">R$ {filteredSales.length > 0 ? (filteredSales.reduce((acc, s) => acc + s.total, 0) / filteredSales.length).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
            <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Itens Vendidos</p>
            <p className="text-2xl font-black text-orange-600 tracking-tighter">{filteredSales.reduce((acc, s) => acc + s.items.reduce((a, i) => a + i.quantity, 0), 0)}</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm min-h-[400px]">
        {tab === 'billing' && (
           <div className="h-[350px] w-full">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Evolução de Faturamento Diário</h4>
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={billingData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" fontSize={10} fontStyle="italic" />
                    <YAxis fontSize={10} fontStyle="italic" />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                    <Bar dataKey="total" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                 </BarChart>
              </ResponsiveContainer>
           </div>
        )}

        {tab === 'bestsellers' && (
           <div className="h-[350px] w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div>
                <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Top 10 Produtos (Volume)</h4>
                <div className="space-y-4">
                  {bestSellersData.length > 0 ? bestSellersData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                       <span className="text-[10px] font-bold text-gray-600 uppercase truncate w-32">{item.name}</span>
                       <div className="flex-1 mx-4 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${bestSellersData[0]?.value ? (item.value / bestSellersData[0].value) * 100 : 0}%` }}></div>
                       </div>
                       <span className="text-[10px] font-black text-gray-900">{item.value} unid</span>
                    </div>
                  )) : (
                    <p className="text-center text-gray-400 italic text-[10px] py-10">Sem vendas registradas</p>
                  )}
                </div>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={bestSellersData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {bestSellersData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>
        )}

        {tab === 'customers' && (
           <div className="h-[350px] w-full flex flex-col">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Ranking de Clientes (Mais Rentáveis)</h4>
              <div className="grid grid-cols-1 gap-4">
                 {customerProfitData.length > 0 ? customerProfitData.map((item, idx) => (
                   <div key={idx} className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${idx < 3 ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-200 text-gray-600'}`}>
                         {idx + 1}
                      </div>
                      <div className="flex-1">
                         <p className="text-[10px] font-black uppercase text-gray-800">{item.name}</p>
                         <p className="text-[8px] font-bold text-gray-400 uppercase italic">Participação na Receita</p>
                      </div>
                      <p className="text-[12px] font-black text-blue-600">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                   </div>
                 )) : (
                   <p className="text-center text-gray-400 italic text-[10px] py-20">Nenhum dado de cliente disponível</p>
                 )}
              </div>
           </div>
        )}

        {tab === 'cashier' && (
           <div className="h-[350px] w-full flex flex-col">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Resumo de Movimentação de Caixa</h4>
              <div className="flex-1 flex flex-col items-center justify-center text-gray-400 italic text-[10px] space-y-4">
                 <Calculator size={48} className="opacity-20" />
                 <p className="text-center max-w-[200px]">Fluxo de caixa consolidado para {filterMonth}/{filterYear}.</p>
                 <div className="w-full max-w-xs space-y-2 mt-4">
                    <div className="flex justify-between bg-blue-50 text-blue-600 p-3 rounded-xl font-black">
                       <span>ENTRADAS</span>
                       <span>R$ {filteredSales.reduce((acc, s) => acc + s.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between bg-red-50 text-red-600 p-3 rounded-xl font-black">
                       <span>SAÍDAS / CANC.</span>
                       <span>R$ 0,00</span>
                    </div>
                 </div>
              </div>
           </div>
        )}
      </div>
    </div>
  );
}

