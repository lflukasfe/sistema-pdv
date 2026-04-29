/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  ShoppingCart, 
  Plus, 
  Trash2, 
  Calendar,
  DollarSign,
  ArrowUpCircle,
  ArrowDownCircle,
  Target,
  Check,
  X,
  PieChart as PieChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
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
  Legend
} from 'recharts';

interface FinanceViewProps {
  revenues: any[];
  setRevenues: (r: any[]) => void;
  purchases: any[];
  setPurchases: (p: any[]) => void;
  expenses: any[];
  setExpenses: (e: any[]) => void;
  rawMaterials: any[];
  setRawMaterials: (rm: any[]) => void;
  productRecipes: any[];
  setProductRecipes: (pr: any[]) => void;
  products: any[];
  addActivity: any;
  setView: (v: any) => void;
}

export function FinanceView({ 
  revenues, 
  setRevenues, 
  purchases, 
  setPurchases, 
  expenses, 
  setExpenses,
  rawMaterials,
  setRawMaterials,
  productRecipes,
  setProductRecipes,
  products,
  addActivity,
  setView
}: FinanceViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'revenues' | 'purchases' | 'expenses' | 'costs' | 'materials'>('overview');
  
  // Date filter (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().substring(0, 7));

  // Add state for forms
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [newPurchase, setNewPurchase] = useState({ itemName: '', quantity: 0, totalValue: 0, rawMaterialId: '' });
  
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [newExpense, setNewExpense] = useState({ description: '', amount: 0, category: 'Outros' });

  // Materials form
  const [showMaterialForm, setShowMaterialForm] = useState(false);
  const [newMaterial, setNewMaterial] = useState({ name: '', unitCost: 0, unit: 'g' as any });

  // Recipe selection
  const [editingRecipeProductId, setEditingRecipeProductId] = useState<string | null>(null);

  // Filtering data by month
  const filteredRevenues = useMemo(() => revenues.filter(r => r.date.startsWith(selectedMonth)), [revenues, selectedMonth]);
  const filteredPurchases = useMemo(() => purchases.filter(p => p.date.startsWith(selectedMonth)), [purchases, selectedMonth]);
  const filteredExpenses = useMemo(() => expenses.filter(e => e.date.startsWith(selectedMonth)), [expenses, selectedMonth]);

  // Calculations
  const totalRevenues = useMemo(() => filteredRevenues.reduce((acc, r) => acc + (r.status === 'confirmado' ? r.amount : 0), 0), [filteredRevenues]);
  const pendingRevenues = useMemo(() => filteredRevenues.reduce((acc, r) => acc + (r.status === 'pendente' ? r.amount : 0), 0), [filteredRevenues]);
  const totalPurchases = useMemo(() => filteredPurchases.reduce((acc, p) => acc + p.totalValue, 0), [filteredPurchases]);
  const totalExpenses = useMemo(() => filteredExpenses.reduce((acc, e) => acc + e.amount, 0), [filteredExpenses]);
  const netProfit = totalRevenues - totalPurchases - totalExpenses;

  const handleAddPurchase = () => {
    if (!newPurchase.itemName || newPurchase.quantity <= 0 || newPurchase.totalValue <= 0) return;
    
    const purchase = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...newPurchase
    };
    setPurchases([purchase, ...purchases]);

    // If purchase is linked to a raw material, update its unit cost
    if (newPurchase.rawMaterialId) {
      const unitCost = newPurchase.totalValue / newPurchase.quantity;
      setRawMaterials(rawMaterials.map(m => 
        m.id === newPurchase.rawMaterialId ? { ...m, unitCost } : m
      ));
      addActivity('system', 'Custo Atualizado', `Custo do insumo ${newPurchase.itemName} atualizado via compra.`);
    }

    addActivity('system', 'Nova Compra', `Compra de ${newPurchase.itemName} registrada.`);
    setNewPurchase({ itemName: '', quantity: 0, totalValue: 0, rawMaterialId: '' });
    setShowPurchaseForm(false);
  };

  const handleAddExpense = () => {
    if (!newExpense.description || newExpense.amount <= 0) return;
    const expense = {
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      ...newExpense
    };
    setExpenses([expense, ...expenses]);
    addActivity('system', 'Nova Despesa', `Despesa ${newExpense.description} registrada.`);
    setNewExpense({ description: '', amount: 0, category: 'Outros' });
    setShowExpenseForm(false);
  };

  const handleAddMaterial = () => {
    if (!newMaterial.name || newMaterial.unitCost <= 0) return;
    const material = {
      id: crypto.randomUUID(),
      ...newMaterial
    };
    setRawMaterials([...rawMaterials, material]);
    setNewMaterial({ name: '', unitCost: 0, unit: 'g' });
    setShowMaterialForm(false);
  };

  const updateRecipe = (productId: string, rawMaterialId: string, quantity: number) => {
    const existingRecipe = productRecipes.find(r => r.productId === productId);
    let newRecipes = [];
    
    if (existingRecipe) {
      const existingIngredient = existingRecipe.ingredients.find((i: any) => i.rawMaterialId === rawMaterialId);
      let newIngredients = [];
      
      if (quantity === 0) {
        newIngredients = existingRecipe.ingredients.filter((i: any) => i.rawMaterialId !== rawMaterialId);
      } else if (existingIngredient) {
        newIngredients = existingRecipe.ingredients.map((i: any) => i.rawMaterialId === rawMaterialId ? { ...i, quantity } : i);
      } else {
        newIngredients = [...existingRecipe.ingredients, { rawMaterialId, quantity }];
      }
      
      newRecipes = productRecipes.map(r => r.productId === productId ? { ...r, ingredients: newIngredients } : r);
    } else {
      if (quantity > 0) {
        newRecipes = [...productRecipes, { productId, ingredients: [{ rawMaterialId, quantity }] }];
      } else {
        newRecipes = productRecipes;
      }
    }
    setProductRecipes(newRecipes);
  };

  const COLORS = ['#5d5dff', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  const chartData = useMemo(() => [
    { name: 'Receitas', value: totalRevenues },
    { name: 'Compras', value: totalPurchases },
    { name: 'Despesas', value: totalExpenses }
  ], [totalRevenues, totalPurchases, totalExpenses]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex gap-2 bg-gray-100 p-1 rounded-2xl w-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Visão Geral', icon: TrendingUp },
            { id: 'revenues', label: 'Receitas', icon: ArrowUpCircle },
            { id: 'purchases', label: 'Compras', icon: ShoppingCart },
            { id: 'expenses', label: 'Despesas', icon: ArrowDownCircle },
            { id: 'materials', label: 'Insumos', icon: Package },
            { id: 'costs', label: 'Custos/Lucro', icon: Target }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === t.id ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-2xl border border-gray-100">
          <Calendar size={14} className="text-gray-400" />
          <input 
            type="month" 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="text-xs font-black uppercase tracking-widest outline-none bg-transparent"
          />
        </div>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-6 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Receita Confirmada</p>
              <p className="text-2xl font-black text-green-600 tracking-tighter">R$ {totalRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              <p className="text-[9px] font-bold text-gray-400 mt-2">Pendente: R$ {pendingRevenues.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Compras</p>
              <p className="text-2xl font-black text-orange-600 tracking-tighter">R$ {totalPurchases.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Despesas</p>
              <p className="text-2xl font-black text-red-600 tracking-tighter">R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Lucro Líquido</p>
              <p className={`text-2xl font-black tracking-tighter ${netProfit >= 0 ? 'text-blue-600' : 'text-red-500'}`}>
                R$ {netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm min-h-[350px]">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Distribuição Financeira</h4>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Legend verticalAlign="bottom" height={36}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm h-full">
              <h4 className="text-[10px] font-black uppercase text-gray-400 mb-6 tracking-widest">Atividade Recente ({selectedMonth})</h4>
              <div className="space-y-4">
                {[...filteredPurchases, ...filteredExpenses].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${(item as any).itemName ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
                        {(item as any).itemName ? <ShoppingCart size={16} /> : <ArrowDownCircle size={16} />}
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase text-gray-800">{(item as any).itemName || (item as any).description}</p>
                        <p className="text-[10px] font-bold text-gray-400">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <p className={`text-xs font-black ${(item as any).itemName ? 'text-orange-600' : 'text-red-500'}`}>
                      R$ {((item as any).totalValue || (item as any).amount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'revenues' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Receitas ({selectedMonth})</h4>
            <div className="flex gap-2">
               <span className="bg-green-100 text-green-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">CONFIRMADO: R$ {totalRevenues.toFixed(2)}</span>
               <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">PENDENTE: R$ {pendingRevenues.toFixed(2)}</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Data</th>
                  <th className="px-6 py-4">ID Pedido</th>
                  <th className="px-6 py-4">Valor</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRevenues.length > 0 ? filteredRevenues.map(r => (
                  <tr key={r.id}>
                    <td className="px-6 py-4 text-xs font-bold text-gray-700">{new Date(r.date).toLocaleString('pt-BR')}</td>
                    <td className="px-6 py-4 text-xs font-black text-blue-600 uppercase">#{r.saleId.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-xs font-black text-gray-900">R$ {r.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg ${
                        r.status === 'confirmado' ? 'bg-green-50 text-green-600 border border-green-100' :
                        r.status === 'cancelado' ? 'bg-red-50 text-red-600 border border-red-100' :
                        'bg-orange-50 text-orange-600 border border-orange-100'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-300 italic text-xs">Nenhuma receita para este mês</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'purchases' && (
        <div className="space-y-6">
          <button 
            onClick={() => setShowPurchaseForm(true)}
            className="bg-orange-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Registrar Compra
          </button>

          <AnimatePresence>
            {showPurchaseForm && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-6 rounded-3xl border border-orange-100 shadow-md grid grid-cols-1 md:grid-cols-4 gap-4 border-l-4 border-l-orange-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Vincular Insumo (Opcional)</label>
                  <select 
                    className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-orange-400 font-bold text-xs uppercase"
                    value={newPurchase.rawMaterialId}
                    onChange={e => {
                      const material = rawMaterials.find(m => m.id === e.target.value);
                      setNewPurchase({
                        ...newPurchase, 
                        rawMaterialId: e.target.value,
                        itemName: material ? material.name : newPurchase.itemName
                      });
                    }}
                  >
                    <option value="">Nenhum (Item Avulso)</option>
                    {rawMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Item / Matéria-Prima</label>
                  <input className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-orange-400 font-bold" value={newPurchase.itemName ?? ''} onChange={e => setNewPurchase({...newPurchase, itemName: e.target.value})} placeholder="Ex: Filamento PLA" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Quantidade</label>
                  <input type="number" className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-orange-400 font-bold" value={newPurchase.quantity ?? 0} onChange={e => setNewPurchase({...newPurchase, quantity: parseFloat(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Valor Total</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-orange-400 font-bold" value={newPurchase.totalValue ?? 0} onChange={e => setNewPurchase({...newPurchase, totalValue: parseFloat(e.target.value)})} />
                    <button onClick={handleAddPurchase} className="bg-orange-500 text-white p-4 rounded-xl hover:bg-orange-600 transition-colors"><Check size={20} /></button>
                    <button onClick={() => setShowPurchaseForm(false)} className="bg-gray-100 text-gray-400 p-4 rounded-xl hover:bg-gray-200 transition-colors"><X size={20} /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Compras ({selectedMonth})</h4>
              <span className="bg-orange-100 text-orange-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">TOTAL: R$ {totalPurchases.toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Item</th>
                    <th className="px-6 py-4 text-center">Insumo</th>
                    <th className="px-6 py-4">Quantidade</th>
                    <th className="px-6 py-4">Valor Total</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredPurchases.length > 0 ? filteredPurchases.map(p => (
                    <tr key={p.id}>
                      <td className="px-6 py-4 text-xs font-bold text-gray-700">{new Date(p.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-gray-800">{p.itemName}</td>
                      <td className="px-6 py-4 text-center">
                        {p.rawMaterialId ? (
                           <span className="text-[8px] font-black uppercase bg-blue-50 text-blue-500 px-2 py-1 rounded border border-blue-100">VINCULADO</span>
                        ) : (
                           <span className="text-[8px] font-black uppercase bg-gray-50 text-gray-400 px-2 py-1 rounded border border-gray-100">AVULSO</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-bold text-gray-600">{p.quantity}</td>
                      <td className="px-6 py-4 text-xs font-black text-orange-600">R$ {p.totalValue.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setPurchases(purchases.filter(x => x.id !== p.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} className="px-6 py-20 text-center text-gray-300 italic text-xs">Nenhuma compra para este mês</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'expenses' && (
        <div className="space-y-6">
          <button 
            onClick={() => setShowExpenseForm(true)}
            className="bg-red-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Registrar Despesa
          </button>

          <AnimatePresence>
            {showExpenseForm && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-6 rounded-3xl border border-red-100 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-l-red-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Descrição</label>
                  <input className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-400 font-bold" value={newExpense.description ?? ''} onChange={e => setNewExpense({...newExpense, description: e.target.value})} placeholder="Ex: Aluguel, Luz, etc." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Categoria</label>
                  <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-400 font-bold text-xs uppercase" value={newExpense.category ?? 'Outros'} onChange={e => setNewExpense({...newExpense, category: e.target.value})}>
                    <option>Fixa</option>
                    <option>Variável</option>
                    <option>Impostos</option>
                    <option>Outros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Valor</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-red-400 font-bold" value={newExpense.amount ?? 0} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                    <button onClick={handleAddExpense} className="bg-red-500 text-white p-4 rounded-xl hover:bg-red-600 transition-colors"><Check size={20} /></button>
                    <button onClick={() => setShowExpenseForm(false)} className="bg-gray-100 text-gray-400 p-4 rounded-xl hover:bg-gray-200 transition-colors"><X size={20} /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 flex justify-between items-center bg-gray-50/50">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Histórico de Despesas ({selectedMonth})</h4>
              <span className="bg-red-100 text-red-600 text-[9px] font-black px-2 py-1 rounded-lg uppercase">TOTAL: R$ {totalExpenses.toFixed(2)}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Data</th>
                    <th className="px-6 py-4">Descrição</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Valor</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredExpenses.length > 0 ? filteredExpenses.map(e => (
                    <tr key={e.id}>
                      <td className="px-6 py-4 text-xs font-bold text-gray-700">{new Date(e.date).toLocaleDateString('pt-BR')}</td>
                      <td className="px-6 py-4 text-xs font-black uppercase text-gray-800">{e.description}</td>
                      <td className="px-6 py-4"><span className="text-[8px] font-black uppercase bg-gray-100 text-gray-500 px-2 py-1 rounded">{e.category}</span></td>
                      <td className="px-6 py-4 text-xs font-black text-red-500">R$ {e.amount.toFixed(2)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setExpenses(expenses.filter(x => x.id !== e.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-6 py-20 text-center text-gray-300 italic text-xs">Nenhuma despesa para este mês</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'materials' && (
        <div className="space-y-6">
          <button 
            onClick={() => setShowMaterialForm(true)}
            className="bg-indigo-500 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Cadastrar Insumo (Matéria-prima)
          </button>

          <AnimatePresence>
            {showMaterialForm && (
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-md grid grid-cols-1 md:grid-cols-3 gap-4 border-l-4 border-l-indigo-500">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome do Insumo</label>
                  <input className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 font-bold" value={newMaterial.name ?? ''} onChange={e => setNewMaterial({...newMaterial, name: e.target.value})} placeholder="Ex: PLA Branco, Resina, etc." />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Unidade</label>
                  <select className="w-full p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 font-bold text-xs uppercase" value={newMaterial.unit ?? 'g'} onChange={e => setNewMaterial({...newMaterial, unit: e.target.value as any})}>
                    <option value="g">Grama (g)</option>
                    <option value="kg">Quilo (kg)</option>
                    <option value="ml">Mililitro (ml)</option>
                    <option value="l">Litro (l)</option>
                    <option value="un">Unidade (un)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Custo p/ Unidade</label>
                  <div className="flex gap-2">
                    <input type="number" className="flex-1 p-4 bg-gray-50 rounded-xl border border-gray-100 outline-none focus:ring-2 focus:ring-indigo-400 font-bold" value={newMaterial.unitCost ?? 0} onChange={e => setNewMaterial({...newMaterial, unitCost: parseFloat(e.target.value)})} />
                    <button onClick={handleAddMaterial} className="bg-indigo-500 text-white p-4 rounded-xl hover:bg-indigo-600 transition-colors"><Check size={20} /></button>
                    <button onClick={() => setShowMaterialForm(false)} className="bg-gray-100 text-gray-400 p-4 rounded-xl hover:bg-gray-200 transition-colors"><X size={20} /></button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Insumo</th>
                    <th className="px-6 py-4">Unidade</th>
                    <th className="px-6 py-4">Custo Unitário</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {rawMaterials.length > 0 ? rawMaterials.map(m => (
                    <tr key={m.id}>
                      <td className="px-6 py-4 text-xs font-black uppercase text-gray-800">{m.name}</td>
                      <td className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest">{m.unit}</td>
                      <td className="px-6 py-4 text-xs font-black text-indigo-600">R$ {m.unitCost.toFixed(4)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => setRawMaterials(rawMaterials.filter(x => x.id !== m.id))} className="text-gray-300 hover:text-red-500 transition-colors"><Trash2 size={16} /></button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={4} className="px-6 py-20 text-center text-gray-300 italic text-xs">Nenhum insumo cadastrado</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'costs' && (
        <div className="space-y-6">
           <div className="bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
             <div className="flex justify-between items-center mb-6">
               <h4 className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Lucratividade e Receitas (Ficha Técnica)</h4>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {products.map(p => {
                 const recipe = productRecipes.find(r => r.productId === p.id);
                 const isEditing = editingRecipeProductId === p.id;
                 
                 let calculatedCost = 0;
                 if (recipe) {
                   calculatedCost = recipe.ingredients.reduce((acc: number, ing: any) => {
                     const material = rawMaterials.find(m => m.id === ing.rawMaterialId);
                     return acc + (material ? material.unitCost * ing.quantity : 0);
                   }, 0);
                 } else {
                   calculatedCost = p.costPrice || 0;
                 }
                 const profit = p.price - calculatedCost;
                 const margin = p.price > 0 ? (profit / p.price) * 100 : 0;

                 return (
                   <div key={p.id} className={`p-6 rounded-3xl border transition-all ${isEditing ? 'bg-white border-blue-200 ring-2 ring-blue-50' : 'bg-gray-50 border-gray-100'}`}>
                     <div className="flex justify-between items-start mb-4">
                        <div className="min-w-0">
                          <p className="font-black text-gray-800 uppercase text-xs truncate">{p.name}</p>
                          <p className="text-[9px] font-bold text-gray-400 mt-1">Preço Venda: R$ {p.price.toFixed(2)}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-[10px] font-black px-2 py-1 rounded-lg ${margin > 30 ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                            {margin.toFixed(1)}%
                          </span>
                          <button 
                            onClick={() => setEditingRecipeProductId(isEditing ? null : p.id)}
                            className="text-[9px] font-black p-1 text-blue-500 uppercase tracking-widest hover:underline"
                          >
                            {isEditing ? 'Fechar' : 'Editar Receita'}
                          </button>
                        </div>
                     </div>

                     {isEditing ? (
                       <div className="space-y-4 pt-4 border-t border-gray-200">
                         <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Configuração da Ficha Técnica</p>
                         <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                           {rawMaterials.map(m => {
                             const ing = recipe?.ingredients.find((i: any) => i.rawMaterialId === m.id);
                             const qty = ing?.quantity || 0;
                             
                             return (
                               <div key={m.id} className="flex items-center justify-between gap-2 p-2 bg-white rounded-xl border border-gray-100">
                                 <span className="text-[10px] font-bold text-gray-600 uppercase truncate flex-1">{m.name}</span>
                                 <div className="flex items-center gap-1">
                                   <input 
                                     type="number" 
                                     value={qty ?? 0} 
                                     onChange={(e) => updateRecipe(p.id, m.id, parseFloat(e.target.value) || 0)}
                                     className="w-16 p-1 text-[10px] font-black text-right border-b border-gray-200 outline-none focus:border-blue-500"
                                   />
                                   <span className="text-[8px] font-bold text-gray-400 uppercase w-4">{m.unit}</span>
                                 </div>
                               </div>
                             );
                           })}
                         </div>
                       </div>
                     ) : (
                       <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-4">
                          <div>
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Custo Base</p>
                             <p className="text-xs font-black text-gray-800">R$ {calculatedCost.toFixed(2)}</p>
                          </div>
                          <div>
                             <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest mb-1">Margem Unit.</p>
                             <p className="text-xs font-black text-blue-600">R$ {profit.toFixed(2)}</p>
                          </div>
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
