import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, FileText, Hash, Plus, Trash2, AlertCircle, Activity, Phone, Upload, X 
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

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
  const { podeCriarAmb, podeVerAmb } = usePermissoes();
  
  const [formData, setFormData] = useState({
    atendido_proncor: null as boolean | null,
    cpf: '',
    nome_paciente: '',
    telefone_paciente: '',
    plano_saude: '',
    observacoes: '',
    crm_solicitante: '' 
  });

  const [exames, setExames] = useState<string[]>(['']);
  const [especialidades, setEspecialidades] = useState<string[]>(['']);
  const [anexo, setAnexo] = useState<File | null>(null);
  const [bibliotecaExames, setBibliotecaExames] = useState<any[]>([]);

  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchExames = async () => {
      const { data } = await supabase.from('exames_especialidades').select('id, nome, tipo');
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
          O seu perfil não tem permissão para criar novos encaminhamentos manuais.
        </Description>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
          Voltar para Início
        </Link>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/')) {
      try {
        const options = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1920,
          useWebWorker: true
        };
        const compressedFile = await imageCompression(file, options);
        setAnexo(compressedFile);
      } catch (error) {
        console.error("Erro na compressão:", error);
        setAnexo(file);
      }
    } else {
      setAnexo(file);
    }
  };

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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    if (formData.atendido_proncor === null) {
      setErrorMsg('Informe se o paciente foi atendido no Proncor.');
      setLoading(false);
      return;
    }

    // Validação Condicional
    if (formData.atendido_proncor === false) {
      if (!formData.nome_paciente || !formData.telefone_paciente || !formData.cpf || !formData.plano_saude) {
        setErrorMsg('Preencha todos os campos obrigatórios (Nome, Celular, CPF e Plano).');
        setLoading(false);
        return;
      }
    } else {
      if (!anexo || !formData.crm_solicitante) {
        setErrorMsg('Para pacientes já atendidos, o anexo e o CRM são obrigatórios.');
        setLoading(false);
        return;
      }
    }

    const todosItens = [...exames, ...especialidades].filter(i => i.trim() !== '');
    if (todosItens.length === 0) {
      setErrorMsg('Informe pelo menos um exame ou especialidade.');
      setLoading(false);
      return;
    }

    try {
      let anexoUrl = null;
      if (anexo) {
        const fileExt = anexo.name.split('.').pop();
        const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('anexos').upload(fileName, anexo);
        if (uploadError) throw uploadError;
        anexoUrl = fileName;
      }

      const { data: novoEnc, error: cabecalhoError } = await supabase.from('encaminhamentos_ambulatorio').insert([{
        atendido_proncor: formData.atendido_proncor,
        cpf: formData.cpf || null,
        nome_paciente: formData.nome_paciente || null,
        telefone_paciente: formData.telefone_paciente || null,
        plano_saude: formData.plano_saude || null,
        exames_especialidades: todosItens,
        observacoes: formData.observacoes,
        criado_por: user?.id,
        status_id: 13,
        origem: 'MANUAL', 
        crm_solicitante: formData.crm_solicitante || null,
        anexo_url: anexoUrl
      }]).select().single();
      
      if (cabecalhoError) throw cabecalhoError;
      
      if (novoEnc) {
        const itensParaRelacionar = todosItens.map(texto => {
          const itemNoBanco = bibliotecaExames.find(b => b.nome.toLowerCase() === texto.toLowerCase());
          return {
            encaminhamento_id: novoEnc.id,
            exame_especialidade_id: itemNoBanco ? itemNoBanco.id : null,
            nome_customizado: itemNoBanco ? null : texto
          };
        });
        await supabase.from('encaminhamento_exames').insert(itensParaRelacionar);
      }

      setShowToast(true);
      setFormData({
        atendido_proncor: null, cpf: '', nome_paciente: '', telefone_paciente: '', plano_saude: '', observacoes: '', crm_solicitante: ''
      });
      setExames(['']);
      setEspecialidades(['']);
      setAnexo(null);
      
    } catch (error: any) { 
      setErrorMsg('Erro ao salvar: ' + error.message);
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500 pb-20">
      <div className="flex items-center gap-6 mb-8 border-b border-gray-200 dark:border-slate-800 px-2">
        <Link to="/novo-ambulatorio" className="pb-3 text-sm font-bold border-b-2 border-purple-600 text-purple-600">Novo Encaminhamento</Link>
        {podeVerAmb && <Link to="/ambulatorio" className="pb-3 text-sm font-bold border-transparent text-gray-400">Fila/Pendentes</Link>}
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 text-purple-600 font-bold text-xs uppercase tracking-widest mb-2"><Activity size={16} /> Módulo: Ambulatório</div>
        <Title className="mb-2">Encaminhamento Ambulatório</Title>
        <Description>Preencha os dados para que o setor Concierge realize o agendamento.</Description>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6" noValidate>
          
          {/* Ajuste 4: Botões menores e mais sutis */}
          <div className="space-y-3 border border-slate-200 dark:border-slate-700/50 p-5 rounded-xl bg-slate-50 dark:bg-slate-800/20">
            <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
              Paciente foi atendido no Proncor? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 max-w-xs">
              <button type="button" onClick={() => setFormData({ ...formData, atendido_proncor: true })} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${formData.atendido_proncor === true ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Sim</button>
              <button type="button" onClick={() => setFormData({ ...formData, atendido_proncor: false })} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${formData.atendido_proncor === false ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Não</button>
            </div>
          </div>

          {/* Ajuste 1: Ocultar resto do form até clicar */}
          {formData.atendido_proncor !== null && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              
              {/* Ajuste 2: Campos de imagem e crm primeiro quando "sim" */}
              {formData.atendido_proncor === true && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2"><Upload size={18} /> Anexo (Imagem ou PDF) <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`h-11 flex items-center px-4 rounded-xl border-2 border-dashed transition-all ${anexo ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900'}`}>
                        <span className="text-xs font-medium truncate flex-1">{anexo ? anexo.name : 'Clique para anexar arquivo'}</span>
                        {anexo && <X size={18} className="text-red-500 cursor-pointer" onClick={(e) => { e.stopPropagation(); setAnexo(null); }} />}
                      </div>
                    </div>
                  </div>
                  <Input label="Seu CRM" name="crm_solicitante" value={formData.crm_solicitante} onChange={handleCrmChange} placeholder="Apenas números" icon={<Hash size={20} />} maxLength={5} required />
                </div>
              )}

              {/* Ajuste 3: Lógica de labels opcional e retirada do asterisco manual (deixando apenas o required agir) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label={`Nome do Paciente${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} name="nome_paciente" value={formData.nome_paciente} onChange={handleChange} icon={<User size={20} />} required={formData.atendido_proncor === false} />
                <Input label={`Telefone / WhatsApp${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} name="telefone_paciente" value={formData.telefone_paciente} onChange={handlePhoneChange} placeholder="(xx) xxxxx-xxxx" icon={<Phone size={20} />} maxLength={15} required={formData.atendido_proncor === false} />
                <Input label={`CPF${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} name="cpf" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: maskCPF(e.target.value)})} icon={<FileText size={20} />} maxLength={14} required={formData.atendido_proncor === false} />
                <SelectAutocomplete label={`Plano de Saúde${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} tableName="planos_saude" columnName="nome" value={formData.plano_saude} onChange={val => setFormData({ ...formData, plano_saude: val })} required={formData.atendido_proncor === false} />
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
                <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Exames</label>
                <div className="space-y-3">
                  {exames.map((exame, index) => (
                    <div key={index} className="flex items-center gap-3 relative" style={{ zIndex: 50 - index }}>
                      <div className="flex-1"><SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="EXAME" value={exame} onChange={(val) => { const n = [...exames]; n[index] = val; setExames(n); }} /></div>
                      {exames.length > 1 && <button type="button" onClick={() => setExames(exames.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                    </div>
                  ))}
                  {exames.length < 5 && <button type="button" onClick={() => setExames([...exames, ''])} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar exame</button>}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/20 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 transition-colors">
                <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Especialidades</label>
                <div className="space-y-3">
                  {especialidades.map((esp, index) => (
                    <div key={index} className="flex items-center gap-3 relative" style={{ zIndex: 40 - index }}>
                      <div className="flex-1"><SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="ESPECIALIDADE" value={esp} onChange={(val) => { const n = [...especialidades]; n[index] = val; setEspecialidades(n); }} /></div>
                      {especialidades.length > 1 && <button type="button" onClick={() => setEspecialidades(especialidades.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                    </div>
                  ))}
                  {especialidades.length < 5 && <button type="button" onClick={() => setEspecialidades([...especialidades, ''])} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar especialidade</button>}
                </div>
              </div>

              <Textarea label="Observações" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} icon={<FileText size={20} />} />
              
              {errorMsg && <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-3"><AlertCircle size={20} /> <b>{errorMsg}</b></div>}
              
              <Button type="submit" disabled={loading} fullWidth className="!bg-purple-600">{loading ? 'Salvando...' : 'Enviar para o Concierge'}</Button>
            </div>
          )}
        </form>
      </Card>
      {showToast && <Toast message="Encaminhamento criado com sucesso!" onClose={() => setShowToast(false)} />}
    </div>
  );
}