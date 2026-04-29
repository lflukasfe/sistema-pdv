import { useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  PieChart as PieChartIcon,
  ChevronRight,
  Boxes,
  BadgeDollarSign,
  AlertTriangle,
  User,
  Zap,
  Star
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts';

interface Sale {
  id: string;
  date: string | number;
  total: number;
  totalProfit?: number;
  items: any[];
  paymentMethod: string;
  customerName?: string;
  customerId?: string;
  status?: string;
  notes?: string;
}

interface Product {
  id: string;
  name: string;
  stock: number;
  imageUrl?: string;
}

interface Customer {
  id: string;
  name: string;
  whatsapp?: string;
  email?: string;
  address?: string;
}

interface DashboardViewProps {
  sales: Sale[];
  products: Product[];
  customers: Customer[];
  expenses: any[];
  purchases: any[];
  revenues: any[];
  paymentMethods: string[];
  goldCustomerIds?: Set<string>;
  onGoToProduct: (id: string) => void;
  onGoToSale?: (sale: Sale) => void;
  onGoToCustomer?: (id: string) => void;
}

export function DashboardView({ 
  sales, 
  products, 
  customers,
  expenses, 
  purchases, 
  revenues, 
  paymentMethods,
  goldCustomerIds,
  onGoToProduct,
  onGoToSale,
  onGoToCustomer
}: DashboardViewProps) {
  
  // Date helpers
  const today = new Date().toISOString().split('T')[0];
  const now = useMemo(() => new Date(), []);
  const last7Days = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d.toISOString().split('T')[0];
  }).reverse();

  // 1. Calculations - Daily Indicators
  const dailySales = useMemo(() => {
    return sales.filter(s => {
      const saleDate = typeof s.date === 'number' ? new Date(s.date).toISOString() : s.date;
      return saleDate.startsWith(today);
    });
  }, [sales, today]);

  const dailySalesTotal = dailySales.reduce((acc, s) => s.status !== 'cancelado' ? acc + s.total : acc, 0);
  const dailyProfitTotal = dailySales.reduce((acc, s) => s.status !== 'cancelado' ? acc + (s.totalProfit || 0) : acc, 0);
  const dailyOrdersCount = dailySales.filter(s => s.status !== 'cancelado').length;
  const dailyCanceledCount = dailySales.filter(s => s.status === 'cancelado').length;
  const dailyCanceledValue = dailySales.filter(s => s.status === 'cancelado').reduce((acc, s) => acc + s.total, 0);

  // 2. Financial Summary (Overall)
  const totalPdvSales = useMemo(() => sales.reduce((acc, s) => s.status !== 'cancelado' ? acc + s.total : acc, 0), [sales]);
  const totalPdvProfit = useMemo(() => sales.reduce((acc, s) => s.status !== 'cancelado' ? acc + (s.totalProfit || 0) : acc, 0), [sales]);
  const totalFinanceRevenues = useMemo(() => revenues.reduce((acc, r) => r.status === 'confirmado' ? acc + r.amount : acc, 0), [revenues]);
  const totalIncome = totalPdvSales + totalFinanceRevenues;

  const totalFinanceExpenses = useMemo(() => expenses.reduce((acc, e) => acc + e.amount, 0), [expenses]);
  const totalFinancePurchases = useMemo(() => purchases.reduce((acc, p) => acc + p.totalValue, 0), [purchases]);
  const totalOutgo = totalFinanceExpenses + totalFinancePurchases;

  // Real profit from PDV + Extra Revenues - Other Expenses
  const pdvNetProfit = totalPdvProfit + totalFinanceRevenues - totalOutgo;
  const profitMargin = totalIncome > 0 ? (pdvNetProfit / totalIncome) * 100 : 0;

  // 3. Payment Methods Distribution
  const paymentData = useMemo(() => {
    const totals: Record<string, number> = {};
    sales.forEach(s => {
      if (s.status !== 'cancelado') {
        const method = (s.paymentMethod || 'NÃO INFORMADO').toUpperCase();
        totals[method] = (totals[method] || 0) + s.total;
      }
    });

    const data = Object.entries(totals).map(([name, value]) => ({
      name,
      value,
      percentage: totalPdvSales > 0 ? (value / totalPdvSales) * 100 : 0
    })).sort((a, b) => b.value - a.value);

    return data;
  }, [sales, totalPdvSales]);

  // 4. Charts Data - Last 7 Days
  const chartData7Days = useMemo(() => {
    return last7Days.map(date => {
      const daySales = sales.filter(s => {
        const saleDate = typeof s.date === 'number' ? new Date(s.date).toISOString() : s.date;
        return saleDate.startsWith(date) && s.status !== 'cancelado';
      });
      const total = daySales.reduce((acc, s) => acc + s.total, 0);
      const profit = daySales.reduce((acc, s) => acc + (s.totalProfit || 0), 0);
      const count = daySales.length;
      const formattedDate = new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      return { date: formattedDate, total, profit, count };
    });
  }, [sales, last7Days]);

  // 5. Monthly Comparison (Last 6 Months)
  const monthlyData = useMemo(() => {
    const months: Record<string, number> = {};
    sales.forEach(s => {
      if (s.status !== 'cancelado') {
        const saleDateString = typeof s.date === 'number' ? new Date(s.date).toISOString() : s.date;
        const month = saleDateString.substring(0, 7); // YYYY-MM
        months[month] = (months[month] || 0) + s.total;
      }
    });

    return Object.entries(months)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([month, total]) => {
        const [year, m] = month.split('-');
        const date = new Date(parseInt(year), parseInt(m) - 1);
        return {
          name: date.toLocaleString('pt-BR', { month: 'short' }).toUpperCase(),
          total
        };
      });
  }, [sales]);

    // 6. Smart Alerts with Priorities
  const alerts = useMemo(() => {
    const list: any[] = [];
    const nowTime = now.getTime();

    // 1. Pedidos parados (Priority: Critical if > 48h, Medium if > 24h)
    sales.forEach(s => {
      const saleDate = typeof s.date === 'number' ? s.date : new Date(s.date).getTime();
      const diffHours = (nowTime - saleDate) / (1000 * 60 * 60);

      if (s.status !== 'finalizado' && s.status !== 'cancelado' && s.status !== 'entregue') {
         if (diffHours > 48) {
            list.push({
              id: `crit-delay-${s.id}`,
              priority: 1, // Critical
              title: 'Atraso Crítico',
              detail: `${s.customerName || 'Cliente'} - #${s.id.substring(0,6)}`,
              situation: `Parado há ${Math.floor(diffHours)}h`,
              onAction: () => onGoToSale?.(s),
              color: 'bg-red-50 text-red-600 border-red-100',
              icon: <AlertTriangle size={12} />
            });
         } else if (diffHours > 24) {
            list.push({
              id: `med-delay-${s.id}`,
              priority: 2, // Medium
              title: 'Atenção: Pedido',
              detail: `${s.customerName || 'Cliente'} - #${s.id.substring(0,6)}`,
              situation: `Aguardando há ${Math.floor(diffHours)}h`,
              onAction: () => onGoToSale?.(s),
              color: 'bg-amber-50 text-amber-600 border-amber-100',
              icon: <AlertCircle size={12} />
            });
         }
      }
    });

    // 2. Produtos sem estoque (Priority: Critical)
    products.forEach(p => {
      if (p.stock <= 0) {
        list.push({
          id: `crit-stock-${p.id}`,
          priority: 1,
          title: 'Estoque Esgotado',
          detail: p.name,
          situation: 'Reposição Necessária',
          onAction: () => onGoToProduct(p.id),
          color: 'bg-red-100 text-red-700 border-red-200',
          icon: <Boxes size={12} />
        });
      }
    });

    // 3. Clientes com dados incompletos (Priority: Light)
    customers.forEach(c => {
      const isIncomplete = !c.whatsapp || (!c.address && !c.email);
      if (isIncomplete) {
        list.push({
          id: `low-cust-${c.id}`,
          priority: 3, // Light
          title: 'Cadastro Incompleto',
          detail: c.name,
          situation: !c.whatsapp ? 'Falta WhatsApp' : 'Falta Endereço',
          onAction: () => onGoToCustomer?.(c.id),
          color: 'bg-blue-50 text-blue-600 border-blue-100',
          icon: <User size={12} />
        });
      }
    });

    // Sort by priority then limit
    return list.sort((a, b) => a.priority - b.priority).slice(0, 10);
  }, [sales, products, customers, now, onGoToSale, onGoToProduct, onGoToCustomer]);

  // Ranking de Clientes (Top 5)
  const topCustomers = useMemo(() => {
    const stats: Record<string, { name: string, total: number, count: number }> = {};
    sales.forEach(s => {
      if (s.status !== 'cancelado' && s.customerId) {
        if (!stats[s.customerId]) {
           const cust = customers.find(c => c.id === s.customerId);
           stats[s.customerId] = { name: cust?.name || 'Cliente', total: 0, count: 0 };
        }
        stats[s.customerId].total += s.total;
        stats[s.customerId].count += 1;
      }
    });
    return Object.values(stats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [sales, customers]);

  // 7. Inventory Alerts (used in JSX)
  const lowStock = products.filter(p => p.stock > 0 && p.stock < 5);

  // 8. Recent Sales (used in JSX)
  const recentSales = useMemo(() => {
    return [...sales].sort((a, b) => {
      const dateA = typeof a.date === 'number' ? a.date : new Date(a.date).getTime();
      const dateB = typeof b.date === 'number' ? b.date : new Date(b.date).getTime();
      return dateB - dateA;
    }).slice(0, 5);
  }, [sales]);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">

      {/* Header Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPIItem 
          title="Vendas do Dia" 
          value={`R$ ${dailySalesTotal.toFixed(2)}`} 
          icon={<DollarSign size={20} />} 
          color="bg-blue-500" 
          trend={dailyOrdersCount > 0 ? `${dailyOrdersCount} pedidos` : "Nenhum pedido"}
        />
        <KPIItem 
          title="Lucro do Dia" 
          value={`R$ ${dailyProfitTotal.toFixed(2)}`} 
          icon={<TrendingUp size={20} />} 
          color="bg-emerald-500" 
          trend="Baseado nos custos"
        />
        <KPIItem 
          title="Cancelados" 
          value={`R$ ${dailyCanceledValue.toFixed(2)}`} 
          icon={<XCircle size={20} />} 
          color="bg-red-500" 
          trend={`${dailyCanceledCount} pedidos hoje`}
        />
        <KPIItem 
          title="Ticket Médio" 
          value={`R$ ${dailyOrdersCount > 0 ? (dailySalesTotal / dailyOrdersCount).toFixed(2) : '0,00'}`} 
          icon={<BarChart3 size={20} />} 
          color="bg-purple-500" 
          trend="Média por venda"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Main Chart - Sales Last 7 Days */}
        <div className="lg:col-span-2 bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-sm font-black uppercase tracking-widest text-gray-800">Desempenho Semanal</h4>
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-1">Volume de vendas nos últimos 7 dias</p>
            </div>
          </div>

          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData7Days}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                  tickFormatter={(value) => `R$ ${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  name="Vendas"
                  stroke="#3B82F6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="profit" 
                  name="Lucro"
                  stroke="#10B981" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorProfit)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Financial Summary Box */}
        <div className="bg-gray-900 text-white p-8 rounded-[2.5rem] shadow-xl flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 blur-3xl -mr-32 -mt-32"></div>

          <div className="relative z-10">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6">Resumo Financeiro</h4>
            <div className="space-y-6">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Faturamento Bruto</p>
                <p className="text-3xl font-black">R$ {totalIncome.toFixed(2)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-6 border-y border-white/10">
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Despesas/Compras</p>
                  <p className="text-lg font-black text-red-400">R$ {totalOutgo.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Margem Líquida</p>
                  <p className="text-lg font-black text-emerald-400">{profitMargin.toFixed(1)}%</p>
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase">Lucro Líquido Real</p>
                </div>
                <p className="text-4xl font-black text-emerald-400">R$ {pdvNetProfit.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-8 flex items-center gap-3">
             <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${pdvNetProfit >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {pdvNetProfit >= 0 ? 'Saldo Positivo' : 'Saldo Negativo'}
             </div>
             <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">Geral do Período</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        
        {/* Smart Alerts */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Alertas Ativos</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Monitoramento em Tempo Real</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1 custom-scrollbar">
            {alerts.map((alert) => (
              <button 
                key={alert.id}
                onClick={alert.onAction}
                className={`w-full text-left p-4 rounded-2xl border ${alert.color} transition-all hover:scale-[1.02] active:scale-95 flex items-start gap-3`}
              >
                <div className="shrink-0 mt-0.5">{alert.icon}</div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex justify-between items-center">
                    <p className="text-[9px] font-black uppercase tracking-widest leading-none">{alert.title}</p>
                    <ChevronRight size={10} className="opacity-40" />
                  </div>
                  <p className="text-[11px] font-bold truncate leading-tight">{alert.detail}</p>
                  <p className="text-[9px] font-bold opacity-70 uppercase tracking-tighter">{alert.situation}</p>
                </div>
              </button>
            ))}
            {alerts.length === 0 && (
               <div className="flex flex-col items-center justify-center py-20 text-center opacity-30">
                  <CheckCircle2 size={40} className="mb-4 text-emerald-500" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Sem pendências</p>
               </div>
            )}
          </div>
        </div>

        {/* Top Customers Ranking */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-500">
              <Star size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Ranking Cliente Ouro</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Top 5 por Volume de Compras</p>
            </div>
          </div>

          <div className="flex-1 space-y-3">
             {topCustomers.map((cust, idx) => {
               const customerObj = customers.find(c => c.name === cust.name);
               const isGold = customerObj && goldCustomerIds?.has(customerObj.id);
               
               return (
                 <div key={idx} className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50 group hover:border-amber-100 transition-all">
                    <div className="flex items-center gap-4">
                       <span className={`text-xs font-black italic ${idx === 0 ? 'text-amber-500' : 'text-gray-300'}`}>0{idx + 1}</span>
                       <div>
                          <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter">{cust.name}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{cust.count} Pedidos</p>
                       </div>
                    </div>
                    <div className="text-right">
                       <p className="text-xs font-black text-gray-900 tracking-tighter">R$ {cust.total.toFixed(2)}</p>
                       {isGold && (
                          <div className="flex items-center justify-end gap-1 text-amber-500">
                             <Star size={8} fill="currentColor" />
                             <span className="text-[7px] font-black uppercase tracking-widest">Ouro</span>
                          </div>
                       )}
                    </div>
                 </div>
               );
             })}
             {topCustomers.length === 0 && (
               <div className="py-20 text-center opacity-20 italic text-[10px]">Aguardando dados...</div>
             )}
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500">
              <PieChartIcon size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Formas de Pagamento</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Distribuição das vendas PDV</p>
            </div>
          </div>

          <div className="space-y-4">
            {paymentData.map((item, idx) => (
              <div key={item.name} className="space-y-1.5">
                <div className="flex justify-between items-end">
                  <span className="text-[10px] font-black text-gray-600 uppercase tracking-tight">{item.name}</span>
                  <span className="text-[10px] font-black text-gray-800 tracking-tight">R$ {item.value.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-gray-50 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                  />
                </div>
                <p className="text-[8px] text-right text-gray-400 font-bold">{item.percentage.toFixed(1)}% do total</p>
              </div>
            ))}
            {paymentData.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-8">Nenhuma venda realizada</p>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col h-full">
           <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
              <Clock size={20} />
            </div>
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-800">Últimas Vendas</h4>
              <p className="text-[9px] text-gray-400 font-bold uppercase mt-1">Atividade recente do PDV</p>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {recentSales.map((sale) => (
              <button 
                key={sale.id} 
                onClick={() => onGoToSale?.(sale)}
                className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-2xl group hover:bg-gray-100 transition-all text-left"
              >
                 <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                      sale.status === 'cancelado' ? 'bg-red-400' : 
                      sale.status === 'pendente' ? 'bg-orange-400' :
                      sale.status === 'em_separacao' ? 'bg-indigo-400' :
                      ['separado', 'embalado', 'enviado'].includes(sale.status || '') ? 'bg-blue-400' : 'bg-emerald-400'
                    }`}>
                       <ShoppingCart size={14} />
                    </div>
                    <div className="min-w-0">
                       <p className="text-[10px] font-black text-gray-800 uppercase tracking-tighter truncate">
                         {sale.customerName || 'Cliente Balcão'}
                       </p>
                       <p className="text-[9px] text-gray-400 font-bold uppercase">
                         {new Date(sale.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} • R$ {sale.total.toFixed(2)}
                       </p>
                    </div>
                 </div>
                 <div className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-widest ${
                    sale.status === 'cancelado' ? 'text-red-500 bg-red-100' : 
                    ['pendente', 'em_separacao', 'separado', 'embalado', 'enviado'].includes(sale.status || '') ? 'text-blue-500 bg-blue-100' :
                    'text-emerald-500 bg-emerald-100'
                 }`}>
                    {sale.status === 'cancelado' ? 'Estorno' : 
                     sale.status === 'pendente' ? 'Pendente' :
                     sale.status === 'em_separacao' ? 'Separação' :
                     ['separado', 'embalado', 'enviado'].includes(sale.status || '') ? 'Processo' : 'OK'}
                 </div>
              </button>
            ))}
            {recentSales.length === 0 && (
               <p className="text-xs text-gray-300 italic text-center py-12">Nenhuma atividade recente</p>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Comparativo Mensal</h4>
              <p className="text-xl font-black text-gray-800 mt-1">Histórico de Faturamento</p>
            </div>
          </div>
          
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#9CA3AF' }}
                />
                <YAxis hide />
                <Tooltip 
                  cursor={{ fill: '#F9FAFB' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[6, 6, 0, 0]} 
                  fill="#E5E7EB"
                  activeBar={<Cell fill="#3B82F6" />}
                >
                   {monthlyData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === monthlyData.length - 1 ? '#3B82F6' : '#F3F4F6'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
      </div>

    </div>
  );
}

function KPIItem({ title, value, icon, color, trend }: { title: string, value: string, icon: any, color: string, trend: string }) {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex flex-col justify-between group hover:shadow-xl transition-all">
      <div className="flex items-center justify-between mb-6">
        <div className={`w-10 h-10 ${color} rounded-2xl flex items-center justify-center text-white shadow-lg shadow-${color.split('-')[1]}-100 group-hover:scale-110 transition-transform`}>
          {icon}
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{title}</p>
        </div>
      </div>
      <div>
        <p className="text-xl font-black text-gray-800 mb-1">{value}</p>
        <div className="flex items-center gap-1.5">
           <CheckCircle2 size={10} className="text-emerald-500" />
           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">{trend}</p>
        </div>
      </div>
    </div>
  );
}
