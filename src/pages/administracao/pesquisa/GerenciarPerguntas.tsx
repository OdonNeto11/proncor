import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Input } from '../../../components/ui/Input';
import { Title, Description } from '../../../components/ui/Typography';
import { Toast } from '../../../components/ui/Toast';
import { ToastError } from '../../../components/ui/ToastError';
import { Plus, Pencil, Trash2, GripVertical, AlertTriangle, Lock, Unlock, Loader2, ListPlus } from 'lucide-react';

interface Pergunta {
  id: number;
  texto: string;
  tipo: 'escala' | 'texto' | 'sim_nao';
  obrigatoria: boolean;
  ativa: boolean;
  ordem: number;
  bloqueada: boolean;
}

export function GerenciarPerguntas({ onBack }: { onBack?: () => void }) {
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAction, setLoadingAction] = useState(false);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [perguntaToDelete, setPerguntaToDelete] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    texto: '',
    tipo: 'escala' as 'escala' | 'texto' | 'sim_nao',
    obrigatoria: true
  });

  const [toastMsg, setToastMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  useEffect(() => {
    loadPerguntas();
  }, []);

  async function loadPerguntas() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('satisfacao_perguntas')
        .select('*')
        .eq('ativa', true)
        .order('ordem', { ascending: true })
        .order('id', { ascending: true });

      if (error) throw error;
      setPerguntas(data || []);
    } catch (err: any) {
      setErrorMsg('Erro ao carregar perguntas: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSort = async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    let _perguntas = [...perguntas];
    const draggedItemContent = _perguntas.splice(dragItem.current, 1)[0];
    _perguntas.splice(dragOverItem.current, 0, draggedItemContent);

    const updatedPerguntas = _perguntas.map((p, index) => ({ ...p, ordem: index + 1 }));
    setPerguntas(updatedPerguntas);

    dragItem.current = null;
    dragOverItem.current = null;

    setLoadingAction(true);
    try {
      const updates = updatedPerguntas.map(p => ({
        id: p.id,
        texto: p.texto,
        tipo: p.tipo,
        obrigatoria: p.obrigatoria,
        ativa: p.ativa,
        ordem: p.ordem,
        bloqueada: p.bloqueada
      }));
      
      const { error } = await supabase.from('satisfacao_perguntas').upsert(updates);
      if (error) throw error;
      
    } catch (err: any) {
      setErrorMsg('Erro ao salvar nova ordenação no banco.');
      loadPerguntas();
    } finally {
      setLoadingAction(false);
    }
  };

  async function handleToggleBloqueio(id: number, bloqueioAtual: boolean) {
    setLoadingAction(true);
    try {
      const { error } = await supabase
        .from('satisfacao_perguntas')
        .update({ bloqueada: !bloqueioAtual })
        .eq('id', id);

      if (error) throw error;
      
      setPerguntas(prev => prev.map(p => p.id === id ? { ...p, bloqueada: !bloqueioAtual } : p));
      setToastMsg(`Pergunta ${!bloqueioAtual ? 'bloqueada' : 'desbloqueada'} com sucesso.`);
    } catch (err: any) {
      setErrorMsg('Erro ao alterar bloqueio: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  }

  function openDeleteModal(id: number) {
    setPerguntaToDelete(id);
    setIsDeleteModalOpen(true);
  }

  async function confirmDelete() {
    if (perguntaToDelete === null) return;
    
    setLoadingAction(true);
    try {
      const { error } = await supabase
        .from('satisfacao_perguntas')
        .update({ ativa: false })
        .eq('id', perguntaToDelete);

      if (error) throw error;
      
      setPerguntas(prev => prev.filter(p => p.id !== perguntaToDelete));
      setToastMsg('Pergunta removida do painel com sucesso.');
    } catch (err: any) {
      setErrorMsg('Erro ao ocultar pergunta: ' + err.message);
    } finally {
      setLoadingAction(false);
      setIsDeleteModalOpen(false);
      setPerguntaToDelete(null);
    }
  }

  function handleEdit(p: Pergunta) {
    setEditingId(p.id);
    setFormData({
      texto: p.texto,
      tipo: p.tipo,
      obrigatoria: p.obrigatoria
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingId(null);
    setFormData({ texto: '', tipo: 'escala', obrigatoria: true });
  }

  async function handleSavePergunta(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.texto.trim()) {
      setErrorMsg('O texto da pergunta é obrigatório.');
      return;
    }

    setLoadingAction(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from('satisfacao_perguntas')
          .update({
            texto: formData.texto,
            tipo: formData.tipo,
            obrigatoria: formData.obrigatoria
          })
          .eq('id', editingId);

        if (error) throw error;
        setToastMsg('Pergunta atualizada com sucesso.');
      } else {
        const { error } = await supabase
          .from('satisfacao_perguntas')
          .insert([{
            texto: formData.texto,
            tipo: formData.tipo,
            obrigatoria: formData.obrigatoria,
            ordem: perguntas.length + 1,
            ativa: true,
            bloqueada: false
          }]);

        if (error) throw error;
        setToastMsg('Pergunta adicionada com sucesso.');
      }

      handleCancelForm();
      loadPerguntas();
    } catch (err: any) {
      setErrorMsg('Erro ao salvar pergunta: ' + err.message);
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 border border-slate-200 dark:border-slate-800 scale-in-center">
            <div className="flex items-center gap-3 mb-4 text-red-600 dark:text-red-500">
              <AlertTriangle size={24} />
              <h3 className="text-lg font-bold">Remover Pergunta</h3>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Tem certeza que deseja remover esta pergunta? Ela sumirá do painel e do formulário dos pacientes, mas continuará arquivada de forma segura no banco de dados.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setIsDeleteModalOpen(false)} disabled={loadingAction}>
                Cancelar
              </Button>
              <Button onClick={confirmDelete} disabled={loadingAction} className="!bg-red-600 hover:!bg-red-700 text-white border-none">
                {loadingAction ? 'Removendo...' : 'Sim, Remover'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {onBack && (
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="text-slate-500">
            &larr; Voltar ao Painel
          </Button>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Title>Gerenciar Perguntas</Title>
          <Description>Configure e ordene as perguntas da pesquisa de satisfação.</Description>
        </div>
        <Button onClick={() => showForm ? handleCancelForm() : setShowForm(true)} variant={showForm ? "outline" : "primary"}>
          {showForm ? 'Cancelar' : <><Plus size={18} className="mr-2" /> Nova Pergunta</>}
        </Button>
      </div>

      {showForm && (
        <Card className="p-6 border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-900/10 animate-in zoom-in-95 duration-200">
          <form onSubmit={handleSavePergunta} className="space-y-4">
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2 mb-4">
              {editingId ? <Pencil size={18} /> : <ListPlus size={18} />} 
              {editingId ? 'Editar Pergunta' : 'Cadastrar Nova Pergunta'}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-6">
                <Input 
                  label="Texto da Pergunta" 
                  value={formData.texto}
                  onChange={(e) => setFormData({ ...formData, texto: e.target.value })}
                  placeholder="Ex: Como você avalia nosso atendimento?"
                  required
                />
              </div>
              
              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Tipo de Resposta</label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                >
                  <option value="escala">Nota (1 a 10)</option>
                  <option value="sim_nao">Botões (Sim / Não)</option>
                  <option value="texto">Texto Livre</option>
                </select>
              </div>

              <div className="md:col-span-3">
                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Obrigatoriedade</label>
                <select 
                  className="w-full h-11 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                  value={formData.obrigatoria ? 'sim' : 'nao'}
                  onChange={(e) => setFormData({ ...formData, obrigatoria: e.target.value === 'sim' })}
                >
                  <option value="sim">Obrigatória</option>
                  <option value="nao">Opcional</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" disabled={loadingAction} className="!bg-purple-600">
                {loadingAction ? 'Salvando...' : (editingId ? 'Atualizar Pergunta' : 'Salvar Pergunta')}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center items-center">
            <Loader2 className="animate-spin text-purple-600" size={32} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold">
                  <th className="p-4 w-10 text-center"></th>
                  <th className="p-4 w-16">Ord.</th>
                  <th className="p-4">Pergunta</th>
                  <th className="p-4">Tipo</th>
                  <th className="p-4 text-center">Obrigatória</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {perguntas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-500">Nenhuma pergunta ativa cadastrada.</td>
                  </tr>
                ) : (
                  perguntas.map((p, index) => (
                    <tr 
                      key={p.id} 
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors bg-white dark:bg-slate-900 group"
                      draggable
                      onDragStart={() => (dragItem.current = index)}
                      onDragEnter={() => (dragOverItem.current = index)}
                      onDragEnd={handleSort}
                      onDragOver={(e) => e.preventDefault()}
                    >
                      <td className="p-4 text-center cursor-grab active:cursor-grabbing text-slate-300 hover:text-purple-500 transition-colors">
                        <GripVertical size={20} />
                      </td>
                      <td className="p-4 text-sm font-bold text-slate-400">{p.ordem}</td>
                      <td className="p-4 text-sm font-semibold text-slate-800 dark:text-slate-200">{p.texto}</td>
                      
                      {/* AJUSTE 1: whitespace-nowrap adicionado */}
                      <td className="p-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        {p.tipo === 'escala' && 'Nota (1-10)'}
                        {p.tipo === 'sim_nao' && 'Sim / Não'}
                        {p.tipo === 'texto' && 'Texto Livre'}
                      </td>

                      <td className="p-4 text-sm text-center text-slate-600 dark:text-slate-400">
                        {p.obrigatoria ? 'Sim' : 'Não'}
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-bold rounded-full ${p.bloqueada ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                          {p.bloqueada ? 'Bloqueada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                          
                          {/* AJUSTE 2: Reordenação dos botões */}
                          {/* 1. Editar */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleEdit(p)}
                            disabled={loadingAction}
                            title="Editar Pergunta"
                            className="!p-2"
                          >
                            <Pencil size={18} className="text-blue-500" />
                          </Button>
                          
                          {/* 2. Bloquear / Desbloquear */}
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleToggleBloqueio(p.id, p.bloqueada)}
                            disabled={loadingAction}
                            title={p.bloqueada ? "Desbloquear Pergunta" : "Bloquear Pergunta"}
                            className="!p-2"
                          >
                            {p.bloqueada ? <Unlock size={18} className="text-green-500" /> : <Lock size={18} className="text-amber-500" />}
                          </Button>

                          {/* 3. Excluir */}
                          <Button 
                            variant="ghostDanger" 
                            size="sm" 
                            onClick={() => openDeleteModal(p.id)}
                            disabled={loadingAction}
                            title="Excluir Pergunta"
                            className="!p-2"
                          >
                            <Trash2 size={18} className="text-red-500" />
                          </Button>

                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {toastMsg && <Toast message={toastMsg} onClose={() => setToastMsg('')} />}
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}