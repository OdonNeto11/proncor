import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/Button';
import { CheckCircle2, Loader2, Star } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout'; // <-- IMPORT DO SEU COMPONENTE DE BASE

interface Pergunta {
  id: number;
  texto: string;
  tipo: 'escala' | 'texto';
  obrigatoria: boolean;
}

export function PaginaSatisfacao() {
  const { agendamentoId } = useParams<{ agendamentoId: string }>();
  
  const [perguntas, setPerguntas] = useState<Pergunta[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function loadPerguntas() {
      try {
        const { data, error } = await supabase
          .from('satisfacao_perguntas')
          .select('id, texto, tipo, obrigatoria')
          .eq('ativa', true)
          .order('id', { ascending: true });

        if (error) throw error;
        setPerguntas(data || []);
      } catch (err: any) {
        setErrorMsg('Não foi possível carregar a pesquisa.');
      } finally {
        setLoading(false);
      }
    }
    loadPerguntas();
  }, []);

  const handleSetNota = (perguntaId: number, nota: number) => {
    setRespostas(prev => ({ ...prev, [perguntaId]: String(nota) }));
  };

  const handleSetTexto = (perguntaId: number, texto: string) => {
    setRespostas(prev => ({ ...prev, [perguntaId]: texto }));
  };

  const handleSubmitPesquisa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agendamentoId) return;

    for (const p of perguntas) {
      if (p.obrigatoria && !respostas[p.id]) {
        setErrorMsg(`Por favor, responda à pergunta: "${p.texto}"`);
        return;
      }
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = perguntas
        .filter(p => respostas[p.id] !== undefined && respostas[p.id].trim() !== '')
        .map(p => ({
          agendamento_id: Number(agendamentoId),
          pergunta_id: p.id,
          resposta: respostas[p.id]
        }));

      if (payload.length === 0) {
        throw new Error('Nenhuma resposta preenchida.');
      }

      const { error } = await supabase.from('satisfacao_respostas').insert(payload);
      if (error) {
        if (error.code === '23505') {
          throw new Error('Esta pesquisa já foi respondida anteriormente.');
        }
        throw error;
      }

      setSucesso(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro ao enviar respostas.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (sucesso) {
    return (
      <AuthLayout>
        <div className="w-full bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-center space-y-4 shadow-sm animate-in zoom-in-95 duration-300">
          <div className="flex justify-center text-green-500">
            <CheckCircle2 size={56} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Obrigado!</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Sua opinião é fundamental para melhorarmos continuamente nossos serviços e fluxos de atendimento.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="w-full bg-white dark:bg-slate-900 p-6 md:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-6 shadow-sm">
        <div className="text-center space-y-1">
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Pesquisa de Satisfação</h1>
          <p className="text-xs text-slate-400 dark:text-slate-500">Ajude-nos a entender como foi sua experiência.</p>
        </div>

        {errorMsg && (
          <div className="p-3 text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/50">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmitPesquisa} className="space-y-6">
          {perguntas.map((p) => (
            <div key={p.id} className="space-y-3 pt-2">
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200">
                {p.texto} {p.obrigatoria && <span className="text-red-500">*</span>}
              </label>

              {p.tipo === 'escala' ? (
                <div className="flex justify-between gap-1 max-w-sm mx-auto">
                  {[1, 2, 3, 4, 5].map((nota) => {
                    const ativo = respostas[p.id] === String(nota);
                    return (
                      <button type="button" key={nota} onClick={() => handleSetNota(p.id, nota)} className={`flex-1 py-3 rounded-xl border font-bold transition-all flex flex-col items-center gap-1 ${ativo ? 'bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-500/20 scale-105' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'}`}>
                        <Star size={16} className={ativo ? 'fill-white' : 'text-slate-400'} />
                        <span className="text-xs">{nota}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <textarea rows={3} value={respostas[p.id] || ''} onChange={(e) => handleSetTexto(p.id, e.target.value)} placeholder="Digite sua resposta aqui..." className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" />
              )}
            </div>
          ))}

          <Button type="submit" variant="primary" fullWidth disabled={submitting} className="mt-4">
            {submitting ? 'Enviando...' : 'Enviar Avaliação'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
}