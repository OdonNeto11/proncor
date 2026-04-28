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
import { ToastError } from '../../components/ui/ToastError';
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
  
  // PADRÃO DE ERRO
  const [errors, setErrors] = useState<Record<string, string>>({});
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
        setErrors(prev => ({ ...prev, anexo: '' }));
        setErrorMsg('');
      } catch (error) {
        console.error("Erro na compressão:", error);
        setAnexo(file);
        setErrors(prev => ({ ...prev, anexo: '' }));
        setErrorMsg('');
      }
    } else {
      setAnexo(file);
      setErrors(prev => ({ ...prev, anexo: '' }));
      setErrorMsg('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: name === 'nome_paciente' ? capitalizeName(value) : value }));
    setErrorMsg('');
    setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, telefone_paciente: maskPhone(e.target.value) }));
    setErrorMsg('');
    setErrors(prev => ({ ...prev, telefone_paciente: '' }));
  };

  const handleCrmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setFormData(prev => ({ ...prev, crm_solicitante: value }));
    setErrorMsg('');
    setErrors(prev => ({ ...prev, crm_solicitante: '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setErrors({});

    const novosErros: Record<string, string> = {};

// 1. Validação do Bloco Inicial
    if (formData.atendido_proncor === null) {
      novosErros.atendido_proncor = 'Este campo é obrigatório';
    } else if (formData.atendido_proncor === false) {
      // 2. Validação para Não Atendidos
      if (!formData.nome_paciente) {
        novosErros.nome_paciente = 'Este campo é obrigatório';
      }
      
      if (!formData.telefone_paciente) {
        novosErros.telefone_paciente = 'Este campo é obrigatório';
      } else if (formData.telefone_paciente.length < 15) {
        novosErros.telefone_paciente = 'Telefone incompleto. Informe 11 dígitos (com DDD)';
      }
      
      if (!formData.plano_saude) {
        novosErros.plano_saude = 'Este campo é obrigatório';
      }
    } else {
      // 3. Validação para Já Atendidos (Sim)
      if (!anexo) novosErros.anexo = 'Este campo é obrigatório';
      if (!formData.crm_solicitante) novosErros.crm_solicitante = 'Este campo é obrigatório';
    }

    // 4. Validação de Exames/Especialidades
    const todosItens = [...exames, ...especialidades].filter(i => i.trim() !== '');
    if (formData.atendido_proncor !== null && todosItens.length === 0) {
      novosErros.exames_especialidades = 'Informe pelo menos um exame ou especialidade';
    }

    // 5. Acionamento do Padrão de Erro
    if (Object.keys(novosErros).length > 0) {
      setErrors(novosErros);
      setErrorMsg('Por favor, preencha corretamente os campos em vermelho.');
      setLoading(false);
      return; // ToastError faz o auto-scroll a partir daqui
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
      setErrorMsg('Erro ao salvar no banco de dados: ' + error.message);
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
          
          <div id="atendido_proncor" className={`space-y-3 border p-5 rounded-xl transition-colors ${errors.atendido_proncor ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20'}`}>
            <label className={`text-sm font-semibold flex items-center gap-2 ${errors.atendido_proncor ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
              Paciente foi atendido no Proncor? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 max-w-xs">
              <button type="button" onClick={() => { setFormData({ ...formData, atendido_proncor: true }); setErrors(prev => ({ ...prev, atendido_proncor: '' })); setErrorMsg(''); }} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${formData.atendido_proncor === true ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Sim</button>
              <button type="button" onClick={() => { setFormData({ ...formData, atendido_proncor: false }); setErrors(prev => ({ ...prev, atendido_proncor: '' })); setErrorMsg(''); }} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${formData.atendido_proncor === false ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Não</button>
            </div>
            {errors.atendido_proncor && <span className="text-xs text-red-500 font-medium">{errors.atendido_proncor}</span>}
          </div>

          {formData.atendido_proncor !== null && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              
              {formData.atendido_proncor === true && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800">
                  <div className="space-y-2" id="anexo">
                    <label className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2"><Upload size={18} /> Anexo (Imagem ou PDF) <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`h-11 flex items-center px-4 rounded-xl border-2 border-dashed transition-all ${anexo ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : errors.anexo ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900'}`}>
                        <span className="text-xs font-medium truncate flex-1">{anexo ? anexo.name : 'Clique para anexar arquivo'}</span>
                        {anexo && <X size={18} className="text-red-500 cursor-pointer z-20 relative" onClick={(e) => { e.stopPropagation(); setAnexo(null); }} />}
                      </div>
                    </div>
                    {errors.anexo && <span className="text-xs text-red-500 font-medium mt-1 block">{errors.anexo}</span>}
                  </div>
                  <div id="crm_solicitante">
                    <Input label="Seu CRM" name="crm_solicitante" value={formData.crm_solicitante} onChange={handleCrmChange} placeholder="Apenas números" icon={<Hash size={20} />} maxLength={5} required error={errors.crm_solicitante} />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div id="nome_paciente">
                  <Input label={`Nome do Paciente${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} name="nome_paciente" value={formData.nome_paciente} onChange={handleChange} icon={<User size={20} />} required={formData.atendido_proncor === false} error={errors.nome_paciente} />
                </div>
                <div id="telefone_paciente">
                  <Input label={`Telefone / WhatsApp${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} name="telefone_paciente" value={formData.telefone_paciente} onChange={handlePhoneChange} placeholder="(xx) xxxxx-xxxx" icon={<Phone size={20} />} maxLength={15} required={formData.atendido_proncor === false} error={errors.telefone_paciente} />
                </div>
                <div id="cpf">
                  <Input label="CPF (Opcional)" name="cpf" value={formData.cpf} onChange={(e) => setFormData({...formData, cpf: maskCPF(e.target.value)})} icon={<FileText size={20} />} maxLength={14} />                
                </div>
                <div id="plano_saude">
                  <SelectAutocomplete label={`Plano de Saúde${formData.atendido_proncor === true ? ' (Opcional)' : ''}`} tableName="planos_saude" columnName="nome" value={formData.plano_saude} onChange={val => { setFormData({ ...formData, plano_saude: val }); setErrors(prev => ({ ...prev, plano_saude: '' })); setErrorMsg(''); }} required={formData.atendido_proncor === false} error={errors.plano_saude} />
                </div>
              </div>

              {/* WRAPPER COM ID PARA OS EXAMES E ESPECIALIDADES (VALIAÇÃO) */}
              <div id="exames_especialidades" className={`p-1 rounded-2xl transition-all ${errors.exames_especialidades ? 'border border-red-500 bg-red-50/50 dark:bg-red-900/10 shadow-sm shadow-red-500/20' : 'border border-transparent'}`}>
                {errors.exames_especialidades && (
                  <span className="text-sm text-red-500 font-bold flex items-center gap-2 mb-2 px-2 pt-2"><AlertCircle size={18} /> {errors.exames_especialidades}</span>
                )}
                
                <div className={`p-5 rounded-2xl border transition-colors mb-4 ${errors.exames_especialidades ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'}`}>
                  <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Exames</label>
                  <div className="space-y-3">
                    {exames.map((exame, index) => (
                      <div key={index} className="flex items-center gap-3 relative" style={{ zIndex: 50 - index }}>
                        <div className="flex-1"><SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="EXAME" value={exame} onChange={(val) => { const n = [...exames]; n[index] = val; setExames(n); setErrors(prev => ({ ...prev, exames_especialidades: '' })); setErrorMsg(''); }} /></div>
                        {exames.length > 1 && <button type="button" onClick={() => setExames(exames.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                      </div>
                    ))}
                    {exames.length < 5 && <button type="button" onClick={() => setExames([...exames, ''])} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar exame</button>}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border transition-colors ${errors.exames_especialidades ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'}`}>
                  <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Especialidades</label>
                  <div className="space-y-3">
                    {especialidades.map((esp, index) => (
                      <div key={index} className="flex items-center gap-3 relative" style={{ zIndex: 40 - index }}>
                        <div className="flex-1"><SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="ESPECIALIDADE" value={esp} onChange={(val) => { const n = [...especialidades]; n[index] = val; setEspecialidades(n); setErrors(prev => ({ ...prev, exames_especialidades: '' })); setErrorMsg(''); }} /></div>
                        {especialidades.length > 1 && <button type="button" onClick={() => setEspecialidades(especialidades.filter((_, i) => i !== index))} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                      </div>
                    ))}
                    {especialidades.length < 5 && <button type="button" onClick={() => setEspecialidades([...especialidades, ''])} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar especialidade</button>}
                  </div>
                </div>
              </div>

              <Textarea label="Observações" name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} icon={<FileText size={20} />} />
              
              <Button type="submit" disabled={loading} fullWidth className="!bg-purple-600">{loading ? 'Salvando...' : 'Enviar para o Concierge'}</Button>
            </div>
          )}
        </form>
      </Card>
      
      {showToast && <Toast message="Encaminhamento criado com sucesso!" onClose={() => setShowToast(false)} />}
      
      <ToastError 
        message={errorMsg} 
        errors={errors} 
        onClose={() => setErrorMsg('')} 
      />
    </div>
  );
}