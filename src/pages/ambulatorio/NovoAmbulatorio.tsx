import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, FileText, Hash, Plus, Trash2, AlertCircle, Activity, Phone 
} from 'lucide-react';

import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete';
import { Title, Description } from '../../components/ui/Typography';

import { maskPhone, capitalizeName, maskCPF } from '../../utils/formUtils'; 
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissoes } from '../../hooks/usePermissoes';

export function NovoAmbulatorio() {
  const { user } = useAuth();
  // ADICIONADO: Extraí a permissão podeVerAmb aqui
  const { podeCriarAmb, podeVerAmb } = usePermissoes();
  
  const [formData, setFormData] = useState({
    atendido_proncor: null as boolean | null,
    cpf: '',
    numero_atendimento: '',
    nome_paciente: '',
    telefone_paciente: '',
    plano_saude: '',
    observacoes: '',
    crm_solicitante: '' 
  });

  const [exames, setExames] = useState<string[]>(['']);
  
  // Guardamos a lista original de exames do banco só para saber se o que o usuário digitou já existia lá ou é novo
  const [bibliotecaExames, setBibliotecaExames] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Busca silenciosa da biblioteca para podermos mapear IDs na hora do Submit
  useEffect(() => {
    const fetchExames = async () => {
      const { data } = await supabase.from('exames_especialidades').select('id, nome');
      if (data) setBibliotecaExames(data);
    };
    fetchExames();
  }, []);

  if (!podeCriarAmb) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white dark:bg-slate-900 rounded-xl border border-red-100 dark:border-red-900/30 shadow-sm mt-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={48} className="text-red-400 dark:text-red-500" />
        </div>
        <Title className="mb-2">Acesso Negado</Title>
        <Description className="max-w-sm mx-auto">
          O seu perfil não tem permissão para criar novos encaminhamentos manuais para o Ambulatório.
        </Description>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Voltar para Início
        </Link>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'nome_paciente' ? capitalizeName(value) : value }));
    setErrorMsg('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, telefone_paciente: maskPhone(e.target.value) }));
    setErrorMsg('');
  };

  const handleCrmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setFormData(prev => ({ ...prev, crm_solicitante: value }));
    setErrorMsg('');
  };

  const handleExameChange = (index: number, value: string) => {
    const novosExames = [...exames];
    novosExames[index] = value;
    setExames(novosExames);
    setErrorMsg('');
  };

  const addExameField = () => {
    if (exames.length < 5) {
      setExames([...exames, '']);
    }
  };

  const removeExameField = (index: number) => {
    const novosExames = exames.filter((_, i) => i !== index);
    setExames(novosExames.length ? novosExames : ['']);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (formData.atendido_proncor === null) {
      setErrorMsg('Por favor, informe se o paciente já foi atendido no Proncor.');
      setLoading(false);
      return;
    }

    if (!formData.nome_paciente.trim() || !formData.plano_saude.trim() || !formData.telefone_paciente.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios.');
      setLoading(false);
      return;
    }

    const examesPreenchidos = exames.filter(e => e.trim() !== '');
    if (examesPreenchidos.length === 0) {
      setErrorMsg('Informe pelo menos um exame ou especialidade.');
      setLoading(false);
      return;
    }

    try {
      // 1. Inserção na Tabela Principal
      const { data: novoEnc, error: cabecalhoError } = await supabase.from('encaminhamentos_ambulatorio').insert([{
        atendido_proncor: formData.atendido_proncor,
        cpf: formData.cpf || null,
        numero_atendimento: formData.numero_atendimento || null,
        nome_paciente: formData.nome_paciente,
        telefone_paciente: formData.telefone_paciente,
        plano_saude: formData.plano_saude,
        exames_especialidades: examesPreenchidos, // Mantemos por garantia/retrocompatibilidade
        observacoes: formData.observacoes,
        criado_por: user?.id,
        status_id: 13,
        origem: 'MANUAL', 
        crm_solicitante: formData.crm_solicitante || null
      }]).select().single();
      
      if (cabecalhoError) throw cabecalhoError;
      
      // 2. Inserção na Tabela Relacional (N:N)
      if (novoEnc) {
        const itensParaRelacionar = examesPreenchidos.map(texto => {
          const itemNoBanco = bibliotecaExames.find(b => b.nome.toLowerCase() === texto.toLowerCase());
          return {
            encaminhamento_id: novoEnc.id,
            exame_especialidade_id: itemNoBanco ? itemNoBanco.id : null,
            nome_customizado: itemNoBanco ? null : texto
          };
        });

        const { error: relError } = await supabase.from('encaminhamento_exames').insert(itensParaRelacionar);
        if (relError) console.error("Erro ao salvar relação N:N", relError);
      }

      setShowToast(true);
      setFormData({
        atendido_proncor: null,
        cpf: '',
        numero_atendimento: '',
        nome_paciente: '',
        telefone_paciente: '',
        plano_saude: '',
        observacoes: '',
        crm_solicitante: ''
      });
      setExames(['']);
      
    } catch (error: any) { 
      setErrorMsg('Erro ao salvar no banco: ' + error.message);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo-ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
          Novo Encaminhamento
        </Link>
        {/* ADICIONADO: A trava de segurança para esconder o menu da Fila se o cara não tiver a permissão */}
        {podeVerAmb && (
          <Link to="/ambulatorio" className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 dark:border-purple-500 text-purple-600 dark:text-purple-400' : 'border-transparent text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:border-gray-300 dark:hover:border-slate-600'}`}>
            Fila/Pendentes
          </Link>
        )}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 font-bold text-xs uppercase tracking-widest mb-2">
           <Activity size={16} /> Módulo: Ambulatório
        </div>
        <Title className="mb-2">Encaminhamento Manual</Title>
        <Description>Preencha os dados para que o setor Concierge realize o agendamento de exames/consultas.</Description>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nome do Paciente" name="nome_paciente" value={formData.nome_paciente} onChange={handleChange} icon={<User size={20} />} required />
            
            <div className="space-y-4 border border-slate-200 dark:border-slate-700/50 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/20">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                Paciente já foi atendido no Proncor? <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, atendido_proncor: true, cpf: '' })}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all ${formData.atendido_proncor === true ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                  Sim
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, atendido_proncor: false, numero_atendimento: '' })}
                  className={`flex-1 py-2 rounded-lg font-bold border transition-all ${formData.atendido_proncor === false ? 'bg-purple-600 text-white border-purple-600' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                  Não
                </button>
              </div>

              {formData.atendido_proncor === true && (
                <div className="animate-in slide-in-from-top-2 duration-300 pt-2">
                  <Input 
                    label="Nº do Atendimento (Opcional)" 
                    name="numero_atendimento" 
                    value={formData.numero_atendimento} 
                    onChange={(e) => setFormData({...formData, numero_atendimento: e.target.value.replace(/\D/g, "")})} 
                    icon={<Hash size={20} />} 
                    maxLength={10} 
                  />
                </div>
              )}

              {formData.atendido_proncor === false && (
                <div className="animate-in slide-in-from-top-2 duration-300 pt-2">
                  <Input 
                    label="CPF (Opcional)" 
                    name="cpf" 
                    value={formData.cpf} 
                    onChange={(e) => setFormData({...formData, cpf: maskCPF(e.target.value)})} 
                    icon={<FileText size={20} />} 
                    maxLength={14} 
                    placeholder="000.000.000-00"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-[70]">
            <Input label="Telefone / WhatsApp" name="telefone_paciente" value={formData.telefone_paciente} onChange={handlePhoneChange} placeholder="(xx) xxxxx-xxxx" icon={<Phone size={20} />} maxLength={15} required />
            
            <div className="relative">
              <SelectAutocomplete 
                label="Plano de Saúde" 
                tableName="planos_saude" 
                columnName="nome" 
                value={formData.plano_saude} 
                onChange={val => { setFormData({ ...formData, plano_saude: val }); }} 
                placeholder="Ex: Unimed... ou digite outro"
                required
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 dark:bg-slate-800 my-2"></div>

          <Input 
            label="Seu CRM (Opcional)" 
            name="crm_solicitante" 
            value={formData.crm_solicitante} 
            onChange={handleCrmChange} 
            placeholder="Apenas números" 
            icon={<User size={20} />} 
            maxLength={5}  
          />

          <div className="bg-purple-50 dark:bg-purple-900/10 p-5 rounded-2xl border border-purple-100 dark:border-purple-900/30 transition-colors relative z-[60]">
            <label className="text-sm font-semibold text-purple-900 dark:text-purple-300 mb-3 flex items-center gap-2">
              <Activity size={18} className="text-purple-600 dark:text-purple-400" />
              Exames ou Especialidades
            </label>
            
            <div className="space-y-3">
              {exames.map((exame, index) => (
                <div key={index} className="flex items-center gap-3 relative" style={{ zIndex: 50 - index }}>
                  <span className="text-xs font-bold text-purple-400 dark:text-purple-500 w-4">{index + 1}.</span>
                  
                  <div className="flex-1">
                    {/* UTILIZANDO O SEU SELECT AUTOCOMPLETE AQUI TAMBÉM */}
                    <SelectAutocomplete 
                      tableName="exames_especialidades" 
                      columnName="nome" 
                      value={exame} 
                      onChange={(val) => handleExameChange(index, val)} 
                      placeholder="Selecione na lista ou digite..."
                    />
                  </div>

                  {exames.length > 1 && (
                    <button type="button" onClick={() => removeExameField(index)} className="p-2 text-purple-300 dark:text-purple-500/50 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-colors">
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            {exames.length < 5 && (
              <button type="button" onClick={addExameField} className="mt-4 flex items-center gap-2 text-sm font-bold text-purple-600 dark:text-purple-400 bg-white dark:bg-slate-800 px-4 py-2 rounded-lg border border-purple-100 dark:border-purple-800/50 shadow-sm hover:bg-purple-50 dark:hover:bg-slate-700 transition-colors">
                <Plus size={16} /> Adicionar outro
              </button>
            )}
          </div>

          <Textarea label="Observações / Detalhes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} icon={<FileText size={20} />} />

          {errorMsg && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl text-sm flex items-center gap-3 animate-in fade-in transition-colors">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} fullWidth className="!bg-purple-600 hover:!bg-purple-700 dark:!bg-purple-600 dark:hover:!bg-purple-500 border-none">
            {loading ? 'Salvando...' : 'Enviar para o Concierge'}
          </Button>
        </form>
      </Card>
      {showToast && <Toast message="Encaminhamento criado com sucesso!" onClose={() => setShowToast(false)} />}
    </div>
  );
}