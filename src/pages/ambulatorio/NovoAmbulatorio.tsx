import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardList, User, FileText, Hash, Building2, Plus, Trash2, AlertCircle, Activity, Phone 
} from 'lucide-react';

// IMPORTAÇÕES DA NOSSA ARQUITETURA
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Card } from '../../components/ui/Card';
import { Toast } from '../../components/ui/Toast';
import { SelectAutocomplete } from '../../components/ui/SelectAutocomplete'; // <-- IMPORT DO AUTOCOMPLETE
import { maskPhone, capitalizeName } from '../../utils/formUtils';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissoes } from '../../hooks/usePermissoes';

export function NovoAmbulatorio() {
  const { user } = useAuth();
  
  // TRAZENDO O HOOK DE PERMISSÕES PARA O AMBULATÓRIO
  const { podeCriarAmb } = usePermissoes();
  
  const [formData, setFormData] = useState({
    numero_atendimento: '',
    nome_paciente: '',
    telefone_paciente: '',
    plano_saude: '',
    observacoes: '',
    crm_solicitante: '' 
  });

  const [exames, setExames] = useState<string[]>(['']);
  
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // PROTEÇÃO DE PÁGINA: Se não tem a permissão, bloqueia a renderização total
  if (!podeCriarAmb) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20 bg-white rounded-xl border border-red-100 shadow-sm mt-8 animate-in zoom-in-95 duration-300">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <AlertCircle size={48} className="text-red-400" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Acesso Negado</h2>
        <p className="text-slate-500 max-w-sm mx-auto">
          O seu perfil não tem permissão para criar novos encaminhamentos manuais para o Ambulatório.
        </p>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 transition-colors">
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

    if (!formData.nome_paciente.trim() || !formData.numero_atendimento.trim() || !formData.plano_saude.trim() || !formData.telefone_paciente.trim()) {
      setErrorMsg('Por favor, preencha todos os campos obrigatórios (incluindo o Plano de Saúde).');
      setLoading(false);
      return;
    }

    if (formData.telefone_paciente.length < 14) {
      setErrorMsg('Informe um telefone válido com DDD.');
      setLoading(false);
      return;
    }

    // REGRA NOVA: Valida o CRM apenas se ele tiver sido preenchido
    if (formData.crm_solicitante && !/^[0-9]{4,5}$/.test(formData.crm_solicitante)) {
      setErrorMsg('Se informado, o CRM deve conter 4 ou 5 números.');
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
      const { error } = await supabase.from('encaminhamentos_ambulatorio').insert([{
        numero_atendimento: formData.numero_atendimento,
        nome_paciente: formData.nome_paciente,
        telefone_paciente: formData.telefone_paciente,
        plano_saude: formData.plano_saude,
        exames_especialidades: examesPreenchidos,
        observacoes: formData.observacoes,
        criado_por: user?.id,
        status_id: 1,
        origem: 'MANUAL', 
        crm_solicitante: formData.crm_solicitante || null // Se tiver vazio, manda nulo pro banco
      }]);
      
      if (error) throw error;
      
      setShowToast(true);
      
      setFormData({
        numero_atendimento: '',
        nome_paciente: '',
        telefone_paciente: '',
        plano_saude: '',
        observacoes: '',
        crm_solicitante: ''
      });
      setExames(['']);
      
    } catch (error: any) { 
      if (error.code === '42501') {
        setErrorMsg('Você não tem permissão no banco de dados para criar encaminhamentos.');
      } else {
        setErrorMsg('Erro ao salvar no banco: ' + error.message);
      }
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 px-2">
        {podeCriarAmb && (
          <Link 
            to="/novo-ambulatorio" 
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/novo-ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
          >
            Novo Encaminhamento
          </Link>
        )}
        <Link 
          to="/ambulatorio" 
          className={`pb-3 text-sm font-bold border-b-2 transition-colors ${window.location.pathname === '/ambulatorio' ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-400 hover:text-gray-600 hover:border-gray-300'}`}
        >
          Fila/Pendentes
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Encaminhamento Ambulatório</h1>
        <p className="text-gray-600">Preencha os dados para que o setor Concierge realize o agendamento no laboratório/especialista.</p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Nome do Paciente *" name="nome_paciente" value={formData.nome_paciente} onChange={handleChange} icon={<User size={20} />} required />
            <Input label="Nº do Atendimento *" name="numero_atendimento" value={formData.numero_atendimento} onChange={(e) => { const val = e.target.value.replace(/\D/g, ""); setFormData(prev => ({ ...prev, numero_atendimento: val })); setErrorMsg(''); }} icon={<Hash size={20} />} maxLength={10} required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Input label="Telefone / WhatsApp *" name="telefone_paciente" value={formData.telefone_paciente} onChange={handlePhoneChange} placeholder="(xx) xxxxx-xxxx" icon={<Phone size={20} />} maxLength={15} required />
            
            {/* NOVO CAMPO: Select Autocomplete com z-index alto para a lista suspensa */}
            <div className="relative z-50">
              <SelectAutocomplete 
                label="Plano de Saúde *" 
                tableName="planos_saude" 
                columnName="nome" 
                value={formData.plano_saude} 
                onChange={val => { setFormData({ ...formData, plano_saude: val }); setErrorMsg(''); }} 
                placeholder="Ex: Unimed, Cassems..."
              />
            </div>
          </div>

          <div className="h-px bg-slate-100 my-2"></div>

          <Input 
            label="Seu CRM (Opcional)" 
            name="crm_solicitante" 
            value={formData.crm_solicitante} 
            onChange={handleCrmChange} 
            placeholder="Apenas números. Ex: 12345" 
            icon={<User size={20} />} 
            maxLength={5}  
          />

          <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100">
            <label className="text-sm font-semibold text-purple-900 mb-3 flex items-center gap-2">
              <Activity size={18} className="text-purple-600" />
              Exames ou Especialidades <span className="text-red-500">*</span>
            </label>
            
            <div className="space-y-3">
              {exames.map((exame, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-purple-400 w-4">{index + 1}.</span>
                  <input type="text" value={exame} onChange={(e) => handleExameChange(index, e.target.value)} placeholder="Ex: Ressonância Magnética, Cardiologista..." className="flex-1 h-11 border border-purple-200 bg-white rounded-xl px-3 outline-none focus:ring-2 focus:ring-purple-500/20" />
                  {exames.length > 1 && (
                    <button type="button" onClick={() => removeExameField(index)} className="p-3 text-purple-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><Trash2 size={18} /></button>
                  )}
                </div>
              ))}
            </div>

            {exames.length < 5 && (
              <button type="button" onClick={addExameField} className="mt-3 flex items-center gap-2 text-sm font-bold text-purple-600 hover:text-purple-800 transition-colors bg-white px-4 py-2 rounded-lg shadow-sm border border-purple-100"><Plus size={16} /> Adicionar outro exame ({exames.length}/5)</button>
            )}
          </div>

          <Textarea label="Observações / Detalhes" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} icon={<FileText size={20} />} placeholder="Algum recado específico para o concierge?" />

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm flex items-center gap-3 animate-in fade-in">
              <AlertCircle size={20} className="flex-shrink-0" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          <Button type="submit" disabled={loading} fullWidth className="!bg-purple-600 hover:!bg-purple-700 shadow-purple-200">
            {loading ? 'Salvando...' : 'Enviar para o Concierge'}
          </Button>
        </form>
      </Card>
      {showToast && <Toast message="Encaminhamento criado com sucesso!" onClose={() => setShowToast(false)} />}
    </div>
  );
}