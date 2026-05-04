import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  User, FileText, Hash, Plus, Trash2, AlertCircle, Activity, Phone, Upload, X 
} from 'lucide-react';
import imageCompression from 'browser-image-compression';

import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller, useFieldArray } from 'react-hook-form';

// IMPORT DAS REGRAS PADRONIZADAS
import { zObrigatorio } from '../../utils/validations';

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

// === 1. SCHEMA DE VALIDAÇÃO DINÂMICO COM PADRÃO DE MENSAGENS ===
const formSchema = z.object({
  atendido_proncor: z.any().refine((val) => typeof val === 'boolean', {
    message: 'O campo "Paciente foi atendido no Proncor?" é obrigatório'
  }),
  cpf: z.string().optional(),
  nome_paciente: z.string().optional(),
  telefone_paciente: z.string().optional(),
  plano_saude: z.string().optional(),
  observacoes: z.string().optional(),
  crm_solicitante: z.string().optional(),
  exames: z.array(z.object({ value: z.string() })),
  especialidades: z.array(z.object({ value: z.string() })),
  exames_especialidades: z.string().optional(),
}).superRefine((data, ctx) => {
  
  if (data.atendido_proncor === false) {
    if (!data.nome_paciente) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Nome do Paciente" é obrigatório', path: ['nome_paciente'] });
    }
    
    if (!data.telefone_paciente) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Telefone / WhatsApp" é obrigatório', path: ['telefone_paciente'] });
    } else if (data.telefone_paciente.length < 15) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Telefone / WhatsApp" está incompleto', path: ['telefone_paciente'] });
    }
    
    if (!data.plano_saude) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Plano de Saúde" é obrigatório', path: ['plano_saude'] });
    }
  }

  if (data.atendido_proncor === true) {
    if (!data.crm_solicitante) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Seu CRM" é obrigatório', path: ['crm_solicitante'] });
    } else if (data.crm_solicitante.length < 4) {
      ctx.addIssue({ code: 'custom', message: 'O campo "Seu CRM" está incompleto', path: ['crm_solicitante'] });
    }
  }
  
  const temExame = data.exames.some(e => e.value.trim() !== "");
  const temEspecialidade = data.especialidades.some(e => e.value.trim() !== "");
  if (!temExame && !temEspecialidade) {
    ctx.addIssue({ code: 'custom', message: 'O campo "Exames ou Especialidades" é obrigatório', path: ['exames_especialidades'] });
  }
});

type AmbulatorioFormType = z.infer<typeof formSchema>;

export function NovoAmbulatorio() {
  const { user } = useAuth();
  const { podeCriarAmb, podeVerAmb } = usePermissoes();
  
  const [anexo, setAnexo] = useState<File | null>(null);
  const [bibliotecaExames, setBibliotecaExames] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { register, handleSubmit, control, setValue, watch, reset, formState: { errors } } = useForm<AmbulatorioFormType>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      atendido_proncor: undefined,
      exames: [{ value: '' }],
      especialidades: [{ value: '' }]
    }
  });

  const { fields: fieldsExames, append: appendExame, remove: removeExame } = useFieldArray({ control, name: "exames" });
  const { fields: fieldsEspecialidades, append: appendEspecialidade, remove: removeEspecialidade } = useFieldArray({ control, name: "especialidades" });

  const atendidoProncor = watch('atendido_proncor');

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
        <Description className="max-w-sm mx-auto">O seu perfil não tem permissão para criar novos encaminhamentos manuais.</Description>
        <Link to="/" className="inline-block mt-8 px-6 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-lg font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">Voltar para Início</Link>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressedFile = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1920, useWebWorker: true });
      setAnexo(compressedFile);
    } catch (error) { setAnexo(file); }
  };

  const onSubmit = async (data: AmbulatorioFormType) => {
    if (data.atendido_proncor === true && !anexo) {
        setErrorMsg('O campo "Anexo" é obrigatório para pacientes atendidos no Proncor.');
        return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      let anexoUrl = null;
      if (anexo) {
        const fileExt = anexo.name.split('.').pop();
        const fileName = `${Math.random()}_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage.from('anexos').upload(fileName, anexo);
        if (uploadError) throw uploadError;
        anexoUrl = fileName;
      }

      const todosItens = [...data.exames, ...data.especialidades].map(i => i.value).filter(v => v.trim() !== "");

      const { data: novoEnc, error: cabecalhoError } = await supabase.from('encaminhamentos_ambulatorio').insert([{
        atendido_proncor: data.atendido_proncor,
        cpf: data.cpf || null,
        nome_paciente: data.nome_paciente || null,
        telefone_paciente: data.telefone_paciente || null,
        plano_saude: data.plano_saude || null,
        exames_especialidades: todosItens,
        observacoes: data.observacoes,
        criado_por: user?.id,
        status_id: 13, 
        origem: 'MANUAL', 
        crm_solicitante: data.crm_solicitante || null,
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
      reset();
      setAnexo(null);
      
    } catch (error: any) { setErrorMsg('Erro ao salvar no banco: ' + error.message); }
    finally { setLoading(false); }
  };

  const onError = (erros: any) => {
    const firstError = Object.keys(erros)[0];
    document.getElementById(firstError)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setErrorMsg('Por favor, preencha corretamente os campos em vermelho.');
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
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 p-6" noValidate>
          
          <div id="atendido_proncor" className={`space-y-3 border p-5 rounded-xl transition-colors ${errors.atendido_proncor ? 'border-red-500 bg-red-50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-700/50 bg-slate-50 dark:bg-slate-800/20'}`}>
            <label className={`text-sm font-semibold flex items-center gap-2 ${errors.atendido_proncor ? 'text-red-500' : 'text-slate-700 dark:text-slate-300'}`}>
              Paciente foi atendido no Proncor? <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-3 max-w-xs">
              <button type="button" onClick={() => setValue('atendido_proncor', true, { shouldValidate: true })} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${atendidoProncor === true ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Sim</button>
              <button type="button" onClick={() => setValue('atendido_proncor', false, { shouldValidate: true })} className={`flex-1 py-2 text-sm rounded-lg font-medium border transition-all ${atendidoProncor === false ? 'bg-purple-600 text-white border-purple-600 shadow-sm' : 'bg-white dark:bg-slate-900 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800'}`}>Não</button>
            </div>
            {errors.atendido_proncor && <span className="text-xs text-red-500 font-medium">{errors.atendido_proncor.message as string}</span>}
          </div>

          {atendidoProncor !== undefined && (
            <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-500">
              
              {atendidoProncor === true && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-5 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-dashed border-purple-200 dark:border-purple-800">
                  <div className="space-y-2" id="anexo">
                    <label className="text-sm font-bold text-purple-900 dark:text-purple-300 flex items-center gap-2"><Upload size={18} /> Anexo (Imagem ou PDF) <span className="text-red-500">*</span></label>
                    <div className="relative group">
                      <input type="file" accept="image/*,.pdf" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                      <div className={`h-11 flex items-center px-4 rounded-xl border-2 border-dashed transition-all ${anexo ? 'border-green-500 bg-green-50 dark:bg-green-900/10' : 'border-purple-200 dark:border-purple-800 bg-white dark:bg-slate-900'}`}>
                        <span className="text-xs font-medium truncate flex-1">{anexo ? anexo.name : 'Clique para anexar arquivo'}</span>
                        {anexo && <X size={18} className="text-red-500 cursor-pointer z-20 relative" onClick={(e) => { e.stopPropagation(); setAnexo(null); }} />}
                      </div>
                    </div>
                  </div>
                  <div id="crm_solicitante">
                    <Input 
                      label="Seu CRM" 
                      icon={<Hash size={20} />} 
                      maxLength={5} 
                      required={true}
                      error={errors.crm_solicitante?.message || ''} 
                      {...register('crm_solicitante')} 
                      onChange={e => setValue('crm_solicitante', e.target.value.replace(/\D/g, ''), { shouldValidate: true })} 
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div id="nome_paciente">
                  <Input 
                    label={`Nome do Paciente${atendidoProncor === true ? ' (Opcional)' : ''}`} 
                    icon={<User size={20} />} 
                    required={atendidoProncor === false}
                    error={errors.nome_paciente?.message || ''} 
                    {...register('nome_paciente')} 
                    onChange={e => setValue('nome_paciente', capitalizeName(e.target.value), { shouldValidate: true })} 
                  />
                </div>
                <div id="telefone_paciente">
                  <Input 
                    label={`Telefone / WhatsApp${atendidoProncor === true ? ' (Opcional)' : ''}`} 
                    placeholder="(xx) xxxxx-xxxx" 
                    icon={<Phone size={20} />} 
                    maxLength={15} 
                    required={atendidoProncor === false}
                    error={errors.telefone_paciente?.message || ''} 
                    {...register('telefone_paciente')} 
                    onChange={e => setValue('telefone_paciente', maskPhone(e.target.value), { shouldValidate: true })} 
                  />
                </div>
                <div id="cpf">
                  <Input 
                    label="CPF (Opcional)" 
                    icon={<FileText size={20} />} 
                    maxLength={14} 
                    error={errors.cpf?.message || ''} 
                    {...register('cpf')} 
                    onChange={e => setValue('cpf', maskCPF(e.target.value))} 
                  />
                </div>
                <div id="plano_saude">
                  <Controller control={control} name="plano_saude" render={({ field }) => (
                    <SelectAutocomplete 
                      label={`Plano de Saúde${atendidoProncor === true ? ' (Opcional)' : ''}`} 
                      tableName="planos_saude" 
                      columnName="nome" 
                      value={field.value || ''} 
                      required={atendidoProncor === false}
                      error={errors.plano_saude?.message || ''} 
                      onChange={field.onChange} 
                    />
                  )} />
                </div>
              </div>

              <div id="exames_especialidades" className={`p-1 rounded-2xl transition-all ${errors.exames_especialidades ? 'border border-red-500 bg-red-50/50 dark:bg-red-900/10 shadow-sm shadow-red-500/20' : 'border border-transparent'}`}>
                {errors.exames_especialidades && (
                  <span className="text-sm text-red-500 font-bold flex items-center gap-2 mb-2 px-2 pt-2"><AlertCircle size={18} /> {errors.exames_especialidades.message as string}</span>
                )}
                
                <div className={`p-5 rounded-2xl border transition-colors mb-4 ${errors.exames_especialidades ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'}`}>
                  <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Exames</label>
                  <div className="space-y-3">
                    {fieldsExames.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 relative" style={{ zIndex: 50 - index }}>
                        <div className="flex-1">
                          <Controller control={control} name={`exames.${index}.value`} render={({ field: f }) => (
                            <SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="EXAME" value={f.value || ''} onChange={f.onChange} />
                          )} />
                        </div>
                        {fieldsExames.length > 1 && <button type="button" onClick={() => removeExame(index)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                      </div>
                    ))}
                    {fieldsExames.length < 5 && <button type="button" onClick={() => appendExame({ value: '' })} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar exame</button>}
                  </div>
                </div>

                <div className={`p-5 rounded-2xl border transition-colors ${errors.exames_especialidades ? 'bg-white dark:bg-slate-900 border-red-200 dark:border-red-800/50' : 'bg-slate-50 dark:bg-slate-800/20 border-slate-200 dark:border-slate-800'}`}>
                  <label className="text-sm font-semibold mb-3 flex items-center gap-2"><Activity size={18} className="text-purple-600" /> Especialidades</label>
                  <div className="space-y-3">
                    {fieldsEspecialidades.map((field, index) => (
                      <div key={field.id} className="flex items-center gap-3 relative" style={{ zIndex: 40 - index }}>
                        <div className="flex-1">
                           <Controller control={control} name={`especialidades.${index}.value`} render={({ field: f }) => (
                            <SelectAutocomplete tableName="exames_especialidades" columnName="nome" filterColumn="tipo" filterValue="ESPECIALIDADE" value={f.value || ''} onChange={f.onChange} />
                          )} />
                        </div>
                        {fieldsEspecialidades.length > 1 && <button type="button" onClick={() => removeEspecialidade(index)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={20} /></button>}
                      </div>
                    ))}
                    {fieldsEspecialidades.length < 5 && <button type="button" onClick={() => appendEspecialidade({ value: '' })} className="text-xs font-bold text-purple-600 flex items-center gap-1 mt-2"><Plus size={14} /> Adicionar especialidade</button>}
                  </div>
                </div>
              </div>

              <Textarea label="Observações" rows={3} icon={<FileText size={20} />} error={errors.observacoes?.message || ''} {...register('observacoes')} />
              
              <Button type="submit" disabled={loading} fullWidth className="!bg-purple-600">{loading ? 'Salvando...' : 'Enviar para o Concierge'}</Button>
            </div>
          )}
        </form>
      </Card>
      
      {showToast && <Toast message="Encaminhamento criado com sucesso!" onClose={() => setShowToast(false)} />}
      
      <ToastError message={errorMsg} onClose={() => setErrorMsg('')} />
    </div>
  );
}