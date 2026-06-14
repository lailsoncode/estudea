import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  BookOpen01Icon,
  AddCircleIcon,
  Alert01Icon,
  Tick01Icon,
  PlayCircleIcon,
  Delete02Icon,
  Edit01Icon,
  Settings01Icon,
  CheckmarkCircle02Icon,
  ArrowLeft01Icon,
  ArrowRight01Icon,
  Cancel01Icon,
  SparklesIcon,
  NotebookIcon,
  Quiz01Icon
} from '@hugeicons/core-free-icons';

// Types corresponding to our database tables
interface Curso {
  id: string;
  titulo: string;
  descricao: string | null;
  imagem_capa: string | null;
  categoria: string | null;
  nivel: string | null;
  duracao: string | null;
  created_at: string;
}

interface Modulo {
  id: string;
  curso_id: string;
  titulo: string;
  ordem: number;
  created_at: string;
  aulas?: Aula[];
}

interface Aula {
  id: string;
  numero_aula: number;
  titulo: string;
  conteudo: string;
  created_at: string;
  modulo_id: string | null;
  tipo: 'video' | 'texto' | 'quiz' | 'arquivo';
  duracao: string | null;
  ordem: number;
  video_url: string | null;
  arquivo_url: string | null;
  pontos: number;
  nota_aprovacao: number;
  obrigatorio: boolean;
  embaralhar_questoes: boolean;
  permite_arena?: boolean;
  tempo_limite: number | null;
  questoes?: Questao[];
  atividades?: {
    id: string;
    aula_id: string;
    enunciado: string;
    tipo_entrega: 'texto' | 'imagem' | 'quiz' | 'multipla';
  }[];
}

interface Questao {
  id?: string;
  aula_id?: string;
  enunciado: string;
  opcoes: string[];
  resposta_correta: string;
  ordem: number;
  tipo?: 'multipla_escolha' | 'verdadeiro_falso' | 'aberta' | 'multipla_selecao';
  para_arena?: boolean;
  atividade_id?: string | null;
}

const renderFormattedText = (text: string) => {
  if (!text) return '';
  // Split by bold (**text**) or inline code (`code`)
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-extrabold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="bg-slate-100 text-pink-600 px-1.5 py-0.5 rounded font-mono text-xs border border-slate-200">{part.slice(1, -1)}</code>;
    }
    return part;
  });
};

const parseLessonConteudo = (rawConteudo: string, tipo?: string) => {
  if (!rawConteudo) {
    return { descricao: '', conteudo: '' };
  }
  if (rawConteudo.includes('===DESCRIPTION_END===')) {
    const parts = rawConteudo.split('===DESCRIPTION_END===');
    return {
      descricao: parts[0] || '',
      conteudo: parts.slice(1).join('===DESCRIPTION_END===') || ''
    };
  }
  if (tipo && tipo !== 'texto') {
    return {
      descricao: rawConteudo,
      conteudo: ''
    };
  }
  return {
    descricao: '',
    conteudo: rawConteudo
  };
};

export const CourseBuilder: React.FC = () => {
  // Navigation & View State
  const [view, setView] = useState<'courses' | 'builder' | 'lesson_creator'>('courses');
  
  // Data States
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Curso | null>(null);
  const [selectedModule, setSelectedModule] = useState<Modulo | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<Aula | null>(null);
  const [editingCourse, setEditingCourse] = useState<Curso | null>(null);
  
  // Loading & Feedback States
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);



  // Forms States - Course
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [courseForm, setCourseForm] = useState({
    titulo: '',
    descricao: '',
    imagem_capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAtFIMvkZnyEfatqV4viqIQ0qouFfUsJFbC047wwUyKILQPYzvsK0uPEnyeHRBj7thqqT5pUBZs-hPqMChs2xyFalhqbF89Qt4YqROVx_lATJeZjsjgTRp6e4wWqQ9ByL5xdT1O9rVr51uW58HcPkBKc6vjuxE42HVBFtUd95tIDwhUEaCi5fBdaAqo7pgM4uORSEB3vOTuflxF9REKz_rlWJDzJU-q6MF0KI25Tl4xALwMnEYC--UAeWWcwOmYCbgYCs1Ns1tVD4',
    categoria: 'Design UI/UX',
    nivel: 'Iniciante',
    duracao: '20h'
  });

  // Forms States - Module
  const [newModuleTitle, setNewModuleTitle] = useState('');
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const [editingModuleTitle, setEditingModuleTitle] = useState('');

  // Forms States - Lesson / Quiz
  const [lessonForm, setLessonForm] = useState({
    titulo: '',
    descricao: '',
    tipo: 'texto' as 'video' | 'texto' | 'quiz' | 'arquivo',
    conteudo: '',
    video_url: '',
    arquivo_url: '',
    pontos: 100,
    nota_aprovacao: 70,
    obrigatorio: true,
    embaralhar_questoes: true,
    permite_arena: true,
    tempo_limite_enabled: false,
    tempo_limite: 15,
    has_atividade: false,
    atividade_enunciado: '',
    atividade_tipo_entrega: 'texto' as 'texto' | 'imagem' | 'quiz' | 'multipla',
    atividade_pontua: true,
    atividade_permite_refazer: true,
    atividade_quiz_proprio: false
  });

  const [quizSubTab, setQuizSubTab] = useState<'standard' | 'arena' | 'atividade'>('standard');
  const [aiMaterial, setAiMaterial] = useState<string>('');
  const [aiGeneratingArena, setAiGeneratingArena] = useState<boolean>(false);

  const [editorTab, setEditorTab] = useState<'write' | 'preview'>('write');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const insertMarkdown = (type: 'bold' | 'h2' | 'h3' | 'list' | 'code') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    let replacement = '';
    switch (type) {
      case 'bold':
        replacement = `**${selectedText || 'texto em negrito'}**`;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || 'Título Secundário'}\n`;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || 'Subtítulo'}\n`;
        break;
      case 'list':
        replacement = `\n- ${selectedText || 'Item da lista'}`;
        break;
      case 'code':
        replacement = `\`${selectedText || 'código'}\``;
        break;
    }

    const newValue = text.substring(0, start) + replacement + text.substring(end);
    setLessonForm(prev => ({ ...prev, conteudo: newValue }));

    // Focus and select the inserted/formatted text
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start,
        start + replacement.length
      );
    }, 0);
  };

  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccess, setAiSuccess] = useState<string | null>(null);

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Por favor, digite o que você deseja criar.');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      setAiError('Chave de API do Gemini (VITE_GEMINI_API_KEY) não configurada no arquivo .env.');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSuccess(null);

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text: `Você é um assistente pedagógico especializado na plataforma "Estudea".
Seu objetivo é ajudar professores a criar ou formatar aulas e atividades práticas a partir de pedidos textuais, links ou descrições cruas.

O professor forneceu a seguinte solicitação:
"""
${aiPrompt}
"""

Você deve retornar um objeto JSON válido estruturado exatamente de acordo com as seguintes regras de negócio da plataforma:
1. Se houver um link na solicitação que aponte para um material de leitura/pdf/drive (ex: link com terminação .pdf, ou link do Google Drive), preencha o campo "arquivo_url" e certifique-se de que "tipo" seja "arquivo".
2. Se a solicitação pedir a criação ou adaptação de um questionário/quiz tradicional vinculado à aula (ex: questões com múltipla escolha, verdadeiro ou falso, abertas ou múltipla seleção), monte a lista de questões no campo "questoes". Defina "tipo" como "quiz".
3. Se a solicitação pedir ou fornecer um conteúdo teórico (texto para leitura), escreva e estruture o texto no campo "conteudo" usando Markdown simples (suportando negrito como **texto** e código inline como \`código\`). Defina "tipo" como "texto".
4. Defina os campos "titulo" (Título da aula) e "descricao" (Descrição/Objetivos da aula) com base nas informações fornecidas ou criadas para a aula.
5. Se for pedida ou inferida uma atividade prática/projeto/exercício de entrega, configure "has_atividade": true e escreva o enunciado em "atividade_enunciado". Caso contrário, configure "has_atividade": false.
6. Para o tipo de entrega da atividade prática ("atividade_tipo_entrega"), os valores aceitos são "texto", "imagem", "quiz" (questionário/perguntas) ou "multipla" (envio misto de texto e imagem).
7. Se a atividade for do formato de entrega "quiz", ela pode possuir um questionário exclusivo (independente do quiz principal da aula). Nesse caso, defina "atividade_quiz_proprio" como true, liste as perguntas dessa atividade no campo "questoes" e configure a flag "pertence_a_atividade": true em cada uma dessas perguntas.

O JSON deve seguir exatamente a seguinte estrutura (não inclua marcações extras como \`\`\`json, apenas retorne o JSON cru):
{
  "titulo": "Título da Aula",
  "descricao": "Uma descrição concisa dos objetivos da aula",
  "tipo": "video | texto | quiz | arquivo",
  "conteudo": "Texto da aula formatado em Markdown se aplicável",
  "video_url": "URL de vídeo se aplicável",
  "arquivo_url": "URL do material de apoio se aplicável",
  "has_atividade": false,
  "atividade_enunciado": "Enunciado da atividade prática se aplicável",
  "atividade_tipo_entrega": "texto | imagem | quiz | multipla",
  "atividade_quiz_proprio": false,
  "questoes": [
    {
      "enunciado": "Texto da pergunta?",
      "opcoes": ["Opção A", "Opção B", "Opção C", "Opção D"],
      "resposta_correta": "Opção correspondente exatamente a uma das opções listadas (ou separadas por ponto e vírgula se for múltipla seleção)",
      "tipo": "multipla_escolha | verdadeiro_falso | aberta | multipla_selecao",
      "pertence_a_atividade": false
    }
  ]
}`
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 8192
            }
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Erro ao conectar à API do Gemini.');
      }

      const data = await response.json();
      const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!textResponse) {
        throw new Error('Nenhuma resposta retornada do Gemini.');
      }

      // Sanitiza a resposta: remove blocos markdown (```json ... ```) caso a IA os inclua
      const sanitizeJsonResponse = (raw: string): string => {
        const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenced) return fenced[1].trim();
        // Extrai o primeiro objeto JSON da string, caso haja texto extra
        const firstBrace = raw.indexOf('{');
        const lastBrace = raw.lastIndexOf('}');
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          return raw.slice(firstBrace, lastBrace + 1);
        }
        return raw.trim();
      };

      let parsedData: any;
      try {
        parsedData = JSON.parse(sanitizeJsonResponse(textResponse));
      } catch (parseErr) {
        console.error('Resposta bruta da IA:', textResponse);
        throw new Error(
          'A IA retornou uma resposta em formato inválido. Tente simplificar ou encurtar o conteúdo colado e tente novamente.'
        );
      }

      // Populate form state with AI response
      const updatedForm = { ...lessonForm };
      
      if (parsedData.titulo) updatedForm.titulo = parsedData.titulo;
      if (parsedData.descricao) updatedForm.descricao = parsedData.descricao;
      if (parsedData.conteudo) updatedForm.conteudo = parsedData.conteudo;
      if (parsedData.video_url) updatedForm.video_url = parsedData.video_url;
      if (parsedData.arquivo_url) updatedForm.arquivo_url = parsedData.arquivo_url;
      
      if (parsedData.has_atividade !== undefined) {
        updatedForm.has_atividade = !!parsedData.has_atividade;
        if (parsedData.atividade_enunciado) updatedForm.atividade_enunciado = parsedData.atividade_enunciado;
        if (parsedData.atividade_tipo_entrega) updatedForm.atividade_tipo_entrega = parsedData.atividade_tipo_entrega;
        if (parsedData.atividade_quiz_proprio !== undefined) {
          updatedForm.atividade_quiz_proprio = !!parsedData.atividade_quiz_proprio;
        }
      }

      if (parsedData.tipo) {
        updatedForm.tipo = parsedData.tipo;
        // Also update activeTypes toggles accordingly
        setActiveTypes({
          video: parsedData.tipo === 'video' || !!parsedData.video_url,
          texto: parsedData.tipo === 'texto' || !!parsedData.conteudo,
          quiz: parsedData.tipo === 'quiz' || (parsedData.questoes && parsedData.questoes.length > 0 && !parsedData.questoes.every((q: any) => q.pertence_a_atividade)),
          arquivo: parsedData.tipo === 'arquivo' || !!parsedData.arquivo_url
        });
      }

      setLessonForm(updatedForm);

      if (parsedData.questoes && Array.isArray(parsedData.questoes)) {
        const formattedQuestions = parsedData.questoes.map((q: any, index: number) => ({
          enunciado: q.enunciado || '',
          opcoes: Array.isArray(q.opcoes) ? q.opcoes : [],
          resposta_correta: q.resposta_correta || '',
          ordem: index + 1,
          tipo: q.tipo || 'multipla_escolha',
          atividade_id: q.pertence_a_atividade ? 'temp_activity_questions_id' : null
        }));
        setQuestoes(formattedQuestions);
      }

      setAiSuccess('Conteúdo gerado e preenchido com sucesso! Revise os campos abaixo antes de salvar.');
      setAiPrompt(''); // Clear prompt input
    } catch (err: any) {
      setAiError(err.message || 'Erro ao processar a requisição com Inteligência Artificial.');
    } finally {
      setAiLoading(false);
    }
  };

  const [questoes, setQuestoes] = useState<Questao[]>([
    { enunciado: 'Qual é a principal função do espaço em branco (whitespace) no design de interfaces?', opcoes: ['Preencher espaços vazios', 'Reduzir a carga cognitiva agrupando elementos logicamente', 'Aumentar o tamanho do arquivo'], resposta_correta: 'Reduzir a carga cognitiva agrupando elementos logicamente', ordem: 1 }
  ]);

  const [activeTypes, setActiveTypes] = useState({
    video: false,
    texto: true,
    quiz: false,
    arquivo: false
  });

  // Load Cursos on Mount
  useEffect(() => {
    fetchCursos();
  }, []);

  const fetchCursos = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('cursos')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setCursos(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar cursos:', err);
      setError(err.message || 'Erro ao carregar cursos.');
    } finally {
      setLoading(false);
    }
  };

  const fetchModulesAndLessons = async (courseId: string) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch Modules
      const { data: mods, error: modError } = await supabase
        .from('modulos')
        .select('*')
        .eq('curso_id', courseId)
        .order('ordem', { ascending: true });
      if (modError) throw modError;

      // Fetch Lessons
      const { data: les, error: lesError } = await supabase
        .from('aulas')
        .select(`
          *,
          atividades(*),
          questoes(*)
        `)
        .order('ordem', { ascending: true });
      if (lesError) throw lesError;

      const lessonsList = les || [];
      const modulesList = (mods || []).map(m => ({
        ...m,
        aulas: lessonsList.filter(l => l.modulo_id === m.id)
      }));

      setModulos(modulesList);
    } catch (err: any) {
      console.error('Erro ao buscar módulos/aulas:', err);
      setError(err.message || 'Erro ao carregar o conteúdo do curso.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCourse = (curso: Curso) => {
    setSelectedCourse(curso);
    fetchModulesAndLessons(curso.id);
    setView('builder');
  };

  const handleOpenEditCourse = (curso: Curso) => {
    setEditingCourse(curso);
    setCourseForm({
      titulo: curso.titulo,
      descricao: curso.descricao || '',
      imagem_capa: curso.imagem_capa || '',
      categoria: curso.categoria || 'Design UI/UX',
      nivel: curso.nivel || 'Iniciante',
      duracao: curso.duracao || '20h'
    });
    setShowCourseModal(true);
  };

  const handleOpenCreateCourse = () => {
    setEditingCourse(null);
    setCourseForm({
      titulo: '',
      descricao: '',
      imagem_capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAtFIMvkZnyEfatqV4viqIQ0qouFfUsJFbC047wwUyKILQPYzvsK0uPEnyeHRBj7thqqT5pUBZs-hPqMChs2xyFalhqbF89Qt4YqROVx_lATJeZjsjgTRp6e4wWqQ9ByL5xdT1O9rVr51uW58HcPkBKc6vjuxE42HVBFtUd95tIDwhUEaCi5fBdaAqo7pgM4uORSEB3vOTuflxF9REKz_rlWJDzJU-q6MF0KI25Tl4xALwMnEYC--UAeWWcwOmYCbgYCs1Ns1tVD4',
      categoria: 'Design UI/UX',
      nivel: 'Iniciante',
      duracao: '20h'
    });
    setShowCourseModal(true);
  };

  const handleSaveCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (!courseForm.titulo.trim()) throw new Error('O título do curso é obrigatório.');

      const fields = {
        titulo: courseForm.titulo.trim(),
        descricao: courseForm.descricao.trim() || null,
        imagem_capa: courseForm.imagem_capa || null,
        categoria: courseForm.categoria,
        nivel: courseForm.nivel,
        duracao: courseForm.duracao
      };

      if (editingCourse) {
        // Update
        const { data, error } = await supabase
          .from('cursos')
          .update(fields)
          .eq('id', editingCourse.id)
          .select()
          .single();

        if (error) throw error;

        setSuccess('Curso atualizado com sucesso!');
        setSelectedCourse(data); // update details immediately in view
      } else {
        // Insert
        const { data, error } = await supabase
          .from('cursos')
          .insert(fields)
          .select()
          .single();

        if (error) throw error;

        setSuccess('Curso criado com sucesso!');
        if (data) {
          handleOpenCourse(data);
        }
      }

      setCourseForm({
        titulo: '',
        descricao: '',
        imagem_capa: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAtFIMvkZnyEfatqV4viqIQ0qouFfUsJFbC047wwUyKILQPYzvsK0uPEnyeHRBj7thqqT5pUBZs-hPqMChs2xyFalhqbF89Qt4YqROVx_lATJeZjsjgTRp6e4wWqQ9ByL5xdT1O9rVr51uW58HcPkBKc6vjuxE42HVBFtUd95tIDwhUEaCi5fBdaAqo7pgM4uORSEB3vOTuflxF9REKz_rlWJDzJU-q6MF0KI25Tl4xALwMnEYC--UAeWWcwOmYCbgYCs1Ns1tVD4',
        categoria: 'Design UI/UX',
        nivel: 'Iniciante',
        duracao: '20h'
      });
      setShowCourseModal(false);
      fetchCursos();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar o curso.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteCourse = async (courseId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este curso e todo o seu conteúdo?')) return;
    setError(null);
    try {
      const { error } = await supabase
        .from('cursos')
        .delete()
        .eq('id', courseId);
      if (error) throw error;
      fetchCursos();
      setSuccess('Curso excluído com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir o curso.');
    }
  };

  // MODULE CRUD
  const handleAddModule = async () => {
    if (!newModuleTitle.trim() || !selectedCourse) return;
    setSaving(true);
    try {
      const order = modulos.length + 1;
      const { error } = await supabase
        .from('modulos')
        .insert({
          curso_id: selectedCourse.id,
          titulo: newModuleTitle.trim(),
          ordem: order
        });
      if (error) throw error;
      setNewModuleTitle('');
      fetchModulesAndLessons(selectedCourse.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao adicionar módulo.');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async (moduleId: string) => {
    if (!editingModuleTitle.trim() || !selectedCourse) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('modulos')
        .update({ titulo: editingModuleTitle.trim() })
        .eq('id', moduleId);
      if (error) throw error;
      setEditingModuleId(null);
      fetchModulesAndLessons(selectedCourse.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar módulo.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!window.confirm('Excluir este módulo apagará todas as aulas associadas. Continuar?') || !selectedCourse) return;
    try {
      const { error } = await supabase
        .from('modulos')
        .delete()
        .eq('id', moduleId);
      if (error) throw error;
      fetchModulesAndLessons(selectedCourse.id);
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir módulo.');
    }
  };

  // LESSON NAVIGATION
  const handleOpenNewLesson = (modulo: Modulo) => {
    setSelectedModule(modulo);
    setSelectedLesson(null);
    setQuizSubTab('standard');
    setLessonForm({
      titulo: '',
      descricao: '',
      tipo: 'texto',
      conteudo: '',
      video_url: '',
      arquivo_url: '',
      pontos: 100,
      nota_aprovacao: 70,
      obrigatorio: true,
      embaralhar_questoes: true,
      permite_arena: true,
      tempo_limite_enabled: false,
      tempo_limite: 15,
      has_atividade: false,
      atividade_enunciado: '',
      atividade_tipo_entrega: 'texto',
      atividade_pontua: true,
      atividade_permite_refazer: true,
      atividade_quiz_proprio: false
    });
    setQuestoes([
      { enunciado: 'Qual é a principal função do espaço em branco (whitespace) no design de interfaces?', opcoes: ['Preencher espaços vazios', 'Reduzir a carga cognitiva agrupando elementos logicamente', 'Aumentar o tamanho do arquivo'], resposta_correta: 'Reduzir a carga cognitiva agrupando elementos logicamente', ordem: 1 }
    ]);
    setActiveTypes({
      video: false,
      texto: true,
      quiz: false,
      arquivo: false
    });
    setView('lesson_creator');
  };

  const handleOpenEditLesson = async (modulo: Modulo, lesson: Aula) => {
    setSelectedModule(modulo);
    setSelectedLesson(lesson);
    setQuizSubTab('standard');
    setLoading(true);
    try {
      // Load questions if they exist
      const { data: qData, error: qError } = await supabase
        .from('questoes')
        .select('*')
        .eq('aula_id', lesson.id)
        .order('ordem', { ascending: true });
      if (qError) throw qError;
      const loadedQuestions = qData || [];

      // 2. Load linked activity if it exists
      const { data: atividadeData, error: atividadeError } = await supabase
          .from('atividades')
          .select('*')
          .eq('aula_id', lesson.id)
          .limit(1);
      
      if (atividadeError) throw atividadeError;
      const activeAtividade = atividadeData && atividadeData.length > 0 ? atividadeData[0] : null;

      const parsed = parseLessonConteudo(lesson.conteudo || '', lesson.tipo);
      setLessonForm({
        titulo: lesson.titulo,
        descricao: parsed.descricao,
        tipo: lesson.tipo,
        conteudo: parsed.conteudo,
        video_url: lesson.video_url || '',
        arquivo_url: lesson.arquivo_url || '',
        pontos: lesson.pontos,
        nota_aprovacao: lesson.nota_aprovacao,
        obrigatorio: lesson.obrigatorio,
        embaralhar_questoes: lesson.embaralhar_questoes,
        permite_arena: lesson.permite_arena ?? true,
        tempo_limite_enabled: lesson.tempo_limite !== null,
        tempo_limite: lesson.tempo_limite || 15,
        has_atividade: !!activeAtividade,
        atividade_enunciado: activeAtividade ? activeAtividade.enunciado : '',
        atividade_tipo_entrega: activeAtividade ? activeAtividade.tipo_entrega as any : 'texto',
        atividade_pontua: activeAtividade ? (activeAtividade.pontua ?? true) : true,
        atividade_permite_refazer: activeAtividade ? (activeAtividade.permite_refazer ?? true) : true,
        atividade_quiz_proprio: activeAtividade ? loadedQuestions.some(q => q.atividade_id === activeAtividade.id) : false
      });

      const hasProprioQuiz = activeAtividade ? loadedQuestions.some(q => q.atividade_id === activeAtividade.id) : false;
      if (hasProprioQuiz) {
        setQuizSubTab('atividade');
      } else {
        setQuizSubTab('standard');
      }

      setActiveTypes({
        video: !!lesson.video_url,
        texto: !!lesson.conteudo,
        quiz: lesson.tipo === 'quiz' || loadedQuestions.length > 0,
        arquivo: !!lesson.arquivo_url
      });
      
      if (loadedQuestions.length > 0) {
        setQuestoes(loadedQuestions);
      } else {
        setQuestoes([
          { enunciado: 'Insira sua pergunta aqui...', opcoes: ['Opção A', 'Opção B'], resposta_correta: 'Opção A', ordem: 1 }
        ]);
      }
      
      setView('lesson_creator');
    } catch (err: any) {
      setError('Erro ao abrir aula para edição.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta aula?') || !selectedCourse) return;
    try {
      const { error } = await supabase
        .from('aulas')
        .delete()
        .eq('id', lessonId);
      if (error) throw error;
      fetchModulesAndLessons(selectedCourse.id);
      setSuccess('Aula excluída com sucesso.');
    } catch (err: any) {
      setError(err.message || 'Erro ao excluir aula.');
    }
  };

  // QUIZ BUILDER FUNCTIONS
  const handleAddQuestion = () => {
    const isArena = quizSubTab === 'arena';
    const isAtividade = quizSubTab === 'atividade';
    const categoryCount = questoes.filter(q => {
      if (isArena) return !!q.para_arena;
      if (isAtividade) return !!q.atividade_id;
      return !q.para_arena && !q.atividade_id;
    }).length;

    setQuestoes([
      ...questoes,
      {
        enunciado: isArena 
          ? 'Pergunta da Arena...' 
          : isAtividade 
            ? 'Pergunta do Questionário...' 
            : 'Qual é o conceito de...',
        opcoes: ['Opção A', 'Opção B'],
        resposta_correta: 'Opção A',
        ordem: categoryCount + 1,
        tipo: 'multipla_escolha',
        para_arena: isArena,
        atividade_id: isAtividade ? 'pending' : null
      }
    ]);
  };

  const handleSetQuestionType = (qIndex: number, tipo: 'multipla_escolha' | 'verdadeiro_falso' | 'aberta' | 'multipla_selecao') => {
    const newQuestions = [...questoes];
    newQuestions[qIndex].tipo = tipo;
    
    if (tipo === 'verdadeiro_falso') {
      newQuestions[qIndex].opcoes = ['Verdadeiro', 'Falso'];
      newQuestions[qIndex].resposta_correta = 'Verdadeiro';
    } else if (tipo === 'aberta') {
      newQuestions[qIndex].opcoes = ['Escreva aqui o gabarito ou explicação da resposta correta.', 'palavra1, palavra2'];
      newQuestions[qIndex].resposta_correta = '';
    } else if (tipo === 'multipla_selecao') {
      newQuestions[qIndex].opcoes = ['Opção 1', 'Opção 2', 'Opção 3', 'Opção 4'];
      newQuestions[qIndex].resposta_correta = 'Opção 1';
    } else {
      newQuestions[qIndex].opcoes = ['Opção 1', 'Opção 2'];
      newQuestions[qIndex].resposta_correta = 'Opção 1';
    }
    setQuestoes(newQuestions);
  };

  const handleUpdateQuestionText = (index: number, text: string) => {
    const newQuestions = [...questoes];
    newQuestions[index].enunciado = text;
    setQuestoes(newQuestions);
  };

  const handleAddOption = (qIndex: number) => {
    const newQuestions = [...questoes];
    newQuestions[qIndex].opcoes.push(`Nova Opção ${newQuestions[qIndex].opcoes.length + 1}`);
    setQuestoes(newQuestions);
  };

  const handleUpdateOptionText = (qIndex: number, optIndex: number, text: string) => {
    const newQuestions = [...questoes];
    const oldVal = newQuestions[qIndex].opcoes[optIndex];
    newQuestions[qIndex].opcoes[optIndex] = text;
    
    // If correct answer was this option, update the correct answer string too
    if (newQuestions[qIndex].tipo === 'multipla_selecao') {
      const currentCorrect = newQuestions[qIndex].resposta_correta
        ? newQuestions[qIndex].resposta_correta.split(';').map(o => o.trim())
        : [];
      const updatedCorrect = currentCorrect.map(o => o === oldVal ? text : o);
      newQuestions[qIndex].resposta_correta = updatedCorrect.join(';');
    } else {
      if (newQuestions[qIndex].resposta_correta === oldVal) {
        newQuestions[qIndex].resposta_correta = text;
      }
    }
    setQuestoes(newQuestions);
  };

  const handleRemoveOption = (qIndex: number, optIndex: number) => {
    const newQuestions = [...questoes];
    if (newQuestions[qIndex].opcoes.length <= 2) {
      alert('Uma questão precisa ter pelo menos 2 opções.');
      return;
    }
    const removedVal = newQuestions[qIndex].opcoes[optIndex];
    newQuestions[qIndex].opcoes.splice(optIndex, 1);
    
    // Fallback correct option if deleted one was correct
    if (newQuestions[qIndex].tipo === 'multipla_selecao') {
      const currentCorrect = newQuestions[qIndex].resposta_correta
        ? newQuestions[qIndex].resposta_correta.split(';').map(o => o.trim())
        : [];
      const updatedCorrect = currentCorrect.filter(o => o !== removedVal);
      newQuestions[qIndex].resposta_correta = updatedCorrect.join(';');
    } else {
      if (newQuestions[qIndex].resposta_correta === removedVal) {
        newQuestions[qIndex].resposta_correta = newQuestions[qIndex].opcoes[0];
      }
    }
    setQuestoes(newQuestions);
  };

  const handleSetCorrectOption = (qIndex: number, optionText: string) => {
    const newQuestions = [...questoes];
    newQuestions[qIndex].resposta_correta = optionText;
    setQuestoes(newQuestions);
  };

  const handleToggleCorrectOptionMulti = (qIndex: number, option: string) => {
    const newQuestions = [...questoes];
    const currentCorrect = newQuestions[qIndex].resposta_correta 
      ? newQuestions[qIndex].resposta_correta.split(';').map(o => o.trim()).filter(o => o.length > 0)
      : [];

    let updatedCorrect: string[];
    if (currentCorrect.includes(option)) {
      updatedCorrect = currentCorrect.filter(o => o !== option);
    } else {
      updatedCorrect = [...currentCorrect, option];
    }

    newQuestions[qIndex].resposta_correta = updatedCorrect.join(';');
    setQuestoes(newQuestions);
  };

  const handleRemoveQuestion = (index: number) => {
    const filtered = questoes.filter((_, idx) => idx !== index);
    let stdIdx = 1;
    let arenaIdx = 1;
    let actIdx = 1;
    const updated = filtered.map(q => {
      if (q.para_arena) {
        return { ...q, ordem: arenaIdx++ };
      } else if (q.atividade_id) {
        return { ...q, ordem: actIdx++ };
      } else {
        return { ...q, ordem: stdIdx++ };
      }
    });
    setQuestoes(updated);
  };

  const handleDuplicateQuestion = (index: number) => {
    const source = questoes[index];
    const newQuestions = [...questoes];
    newQuestions.splice(index + 1, 0, {
      ...source,
      id: undefined,
      enunciado: `${source.enunciado} (Cópia)`,
      ordem: source.ordem + 1
    });
    let stdIdx = 1;
    let arenaIdx = 1;
    let actIdx = 1;
    const updated = newQuestions.map(q => {
      if (q.para_arena) {
        return { ...q, ordem: arenaIdx++ };
      } else if (q.atividade_id) {
        return { ...q, ordem: actIdx++ };
      } else {
        return { ...q, ordem: stdIdx++ };
      }
    });
    setQuestoes(updated);
  };

  const handleGenerateArenaQuestionsWithAI = async () => {
    if (!aiMaterial.trim()) {
      alert('Por favor, forneça algum material de apoio ou descrição para a IA.');
      return;
    }

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      alert('Chave de API do Gemini (VITE_GEMINI_API_KEY) não configurada no arquivo .env.');
      return;
    }

    setAiGeneratingArena(true);
    try {
      const prompt = `Você é o mestre da Arena Estudea, um quiz multiplayer em tempo real similar ao Kahoot.
Seu objetivo é ler o material fornecido pelo professor e criar de 5 a 8 questões de múltipla escolha para a Arena competitiva.

O material fornecido é o seguinte:
"""
${aiMaterial}
"""

Regras importantes:
1. As perguntas devem ser diretas, desafiadoras e rápidas (máximo de 120 caracteres).
2. As opções de resposta devem ser curtas e objetivas (máximo de 50 caracteres) para que os alunos possam ler e responder rapidamente em dispositivos móveis.
3. Forneça exatamente entre 2 e 4 opções de resposta por questão.
4. Garanta que a "resposta_correta" corresponda exatamente a um dos itens da lista "opcoes".
5. Retorne a resposta estruturada estritamente em formato JSON de acordo com o modelo abaixo, sem qualquer tipo de markdown ou comentários adicionais.

Modelo JSON de saída:
[
  {
    "enunciado": "Pergunta para a arena?",
    "opcoes": ["Opção 1", "Opção 2", "Opção 3", "Opção 4"],
    "resposta_correta": "Opção 1"
  }
]`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [{ text: prompt }]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              maxOutputTokens: 4096
            }
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || 'Erro ao conectar à API do Gemini.');
      }

      const resJson = await response.json();
      const rawText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error('Nenhuma resposta retornada do Gemini.');

      const parsed = JSON.parse(rawText.trim());
      if (Array.isArray(parsed) && parsed.length > 0) {
        const currentStandardQuestions = questoes.filter(q => !q.para_arena);
        const newArenaQuestions = parsed.map((item: any, index: number) => ({
          enunciado: item.enunciado,
          opcoes: item.opcoes,
          resposta_correta: item.resposta_correta,
          ordem: index + 1,
          tipo: 'multipla_escolha' as const,
          para_arena: true
        }));

        setQuestoes([...currentStandardQuestions, ...newArenaQuestions]);
        setAiMaterial('');
        alert('Questões da Arena geradas com sucesso!');
      } else {
        throw new Error('Formato inválido retornado pela IA.');
      }
    } catch (err: any) {
      console.error(err);
      alert('Erro ao gerar com IA: ' + err.message);
    } finally {
      setAiGeneratingArena(false);
    }
  };

  // SAVE LESSON / QUIZ FLOW
  const handleSaveLesson = async () => {
    if (!lessonForm.titulo.trim() || !selectedModule || !selectedCourse) {
      setError('Por favor, preencha o título da aula.');
      return;
    }

    if (!activeTypes.video && !activeTypes.texto && !activeTypes.quiz && !activeTypes.arquivo && !(lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz')) {
      setError('Por favor, selecione pelo menos um tipo de conteúdo.');
      return;
    }
    
    setSaving(true);
    setError(null);
    try {
      const totalLessonsCount = modulos.reduce((acc, m) => acc + (m.aulas?.length || 0), 0);
      const lessonOrder = selectedLesson ? selectedLesson.ordem : totalLessonsCount + 1;
      const lessonNumber = selectedLesson ? selectedLesson.numero_aula : Math.min(totalLessonsCount + 1, 40);

      // Determine primary tipo to satisfy DB check constraint:
      let primaryTipo: 'video' | 'texto' | 'quiz' | 'arquivo' = 'texto';
      if (activeTypes.video) {
        primaryTipo = 'video';
      } else if (activeTypes.quiz || (lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz')) {
        primaryTipo = 'quiz';
      } else if (activeTypes.arquivo) {
        primaryTipo = 'arquivo';
      } else if (activeTypes.texto) {
        primaryTipo = 'texto';
      }

      // Compute durations or description labels:
      const typesList: string[] = [];
      if (activeTypes.video) typesList.push('Vídeo');
      if (activeTypes.quiz || (lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz')) typesList.push(`${questoes.length} Questões`);
      if (activeTypes.arquivo) typesList.push('Material');
      if (activeTypes.texto && typesList.length === 0) typesList.push('Leitura');
      const duracaoLabel = typesList.join(' + ') || 'Leitura';

      const combinedConteudo = lessonForm.descricao.trim() + "===DESCRIPTION_END===" + (activeTypes.texto ? lessonForm.conteudo.trim() : '');

      const payload = {
        modulo_id: selectedModule.id,
        titulo: lessonForm.titulo.trim(),
        conteudo: combinedConteudo,
        tipo: primaryTipo,
        numero_aula: lessonNumber,
        ordem: lessonOrder,
        video_url: activeTypes.video ? lessonForm.video_url.trim() : null,
        arquivo_url: activeTypes.arquivo ? lessonForm.arquivo_url.trim() : null,
        pontos: lessonForm.pontos,
        nota_aprovacao: lessonForm.nota_aprovacao,
        obrigatorio: lessonForm.obrigatorio,
        embaralhar_questoes: lessonForm.embaralhar_questoes,
        permite_arena: lessonForm.permite_arena,
        tempo_limite: lessonForm.tempo_limite_enabled ? lessonForm.tempo_limite : null,
        duracao: duracaoLabel
      };

      let aulaId = '';

      if (selectedLesson) {
        // Update
        const { error: updateError } = await supabase
          .from('aulas')
          .update(payload)
          .eq('id', selectedLesson.id);
        if (updateError) throw updateError;
        aulaId = selectedLesson.id;
      } else {
        // Insert
        const { data: insertData, error: insertError } = await supabase
          .from('aulas')
          .insert(payload)
          .select('id')
          .single();
        if (insertError) throw insertError;
        if (!insertData) throw new Error('Erro ao retornar dados da aula salva.');
        aulaId = insertData.id;
      }

      let activityId: string | null = null;

      // Handle Linked Activity Practice
      if (lessonForm.has_atividade) {
        const { data: extAtividade, error: checkError } = await supabase
          .from('atividades')
          .select('id')
          .eq('aula_id', aulaId)
          .limit(1);

        if (checkError) throw checkError;

        const activityPayload = {
          aula_id: aulaId,
          enunciado: lessonForm.atividade_enunciado.trim(),
          tipo_entrega: lessonForm.atividade_tipo_entrega,
          pontua: lessonForm.atividade_tipo_entrega === 'quiz' ? lessonForm.atividade_pontua : true,
          permite_refazer: lessonForm.atividade_permite_refazer
        };

        if (extAtividade && extAtividade.length > 0) {
          // Update existing activity
          const { error: actUpdateError } = await supabase
            .from('atividades')
            .update(activityPayload)
            .eq('id', extAtividade[0].id);
          if (actUpdateError) throw actUpdateError;
          activityId = extAtividade[0].id;
        } else {
          // Insert new activity
          const { data: actInsertData, error: actInsertError } = await supabase
            .from('atividades')
            .insert(activityPayload)
            .select('id')
            .single();
          if (actInsertError) throw actInsertError;
          if (actInsertData) {
            activityId = actInsertData.id;
          }
        }
      } else {
        // Delete activity if teacher disabled it
        const { error: actDeleteError } = await supabase
          .from('atividades')
          .delete()
          .eq('aula_id', aulaId);
        if (actDeleteError) throw actDeleteError;
      }

      // If Quiz, Arena or Activity Questionnaire, handle Questions
      const hasQuestions = activeTypes.quiz || 
        (lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz' && lessonForm.atividade_quiz_proprio) ||
        questoes.some(q => q.para_arena);

      if (hasQuestions) {
        // Delete old questions if updating
        if (selectedLesson) {
          const { error: deleteError } = await supabase
            .from('questoes')
            .delete()
            .eq('aula_id', aulaId);
          if (deleteError) throw deleteError;
        }

        // Insert new questions (only include the ones that are relevant based on configurations)
        const activeQuestions = questoes.filter(q => {
          // 1. If it's an arena question, keep it
          if (q.para_arena) return true;
          // 2. If it's an activity question: keep it only if the activity is a quiz and it's set to has independent quiz
          if (q.atividade_id) {
            return lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz' && lessonForm.atividade_quiz_proprio;
          }
          // 3. If it's a standard lesson quiz question: keep it only if standard quiz is enabled
          return activeTypes.quiz;
        });

        if (activeQuestions.length > 0) {
          const questionsPayload = activeQuestions.map(q => {
            const isActivityQuestion = !!q.atividade_id;
            return {
              aula_id: aulaId,
              enunciado: q.enunciado.trim(),
              opcoes: q.opcoes,
              resposta_correta: q.resposta_correta,
              ordem: q.ordem,
              tipo: q.tipo || 'multipla_escolha',
              para_arena: q.para_arena || false,
              atividade_id: isActivityQuestion ? activityId : null
            };
          });

          const { error: questionsError } = await supabase
            .from('questoes')
            .insert(questionsPayload);
          if (questionsError) throw questionsError;
        }
      } else {
        // Delete old questions if none are configured
        if (selectedLesson) {
          await supabase
            .from('questoes')
            .delete()
            .eq('aula_id', aulaId);
        }
      }

      setSuccess('Aula e conteúdos salvos com sucesso!');
      setTimeout(() => {
        setView('builder');
        fetchModulesAndLessons(selectedCourse.id);
      }, 1000);

    } catch (err: any) {
      console.error('Erro ao salvar aula/material:', err);
      setError(err.message || 'Ocorreu um erro ao salvar a aula.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="app-page relative overflow-hidden">
      
      {/* Messages */}
      {error && (
        <div className="p-4 bg-error-container/30 border border-error/20 rounded-xl text-error text-label-md flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Alert01Icon} size={20} className="mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 bg-secondary-container/10 border border-secondary/20 rounded-xl text-secondary text-label-md flex items-start gap-2 animate-in fade-in duration-300">
          <HugeiconsIcon icon={Tick01Icon} size={20} className="mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* STAGE 1: Course List & Selection */}
      {view === 'courses' && (
        <div className="space-y-6">
          <div className="app-page-header app-page-header-row">
            <div>
              <h2 className="app-title">Criação de Cursos</h2>
              <p className="app-subtitle">Gerencie a grade curricular, crie módulos e organize lições e atividades práticas.</p>
            </div>
            <button
              onClick={handleOpenCreateCourse}
              className="app-primary-action"
            >
              <HugeiconsIcon icon={AddCircleIcon} size={20} />
              Criar Novo Curso
            </button>
          </div>

          {loading ? (
            <p className="text-center text-slate-500 py-12">Carregando cursos...</p>
          ) : cursos.length === 0 ? (
            <div className="app-card-padded text-center text-slate-400 space-y-4">
              <HugeiconsIcon icon={BookOpen01Icon} size={48} className="mx-auto text-slate-300" />
              <p className="text-body-lg font-bold text-on-surface">Nenhum curso cadastrado ainda.</p>
              <p className="text-label-sm max-w-sm mx-auto">Clique em "Criar Novo Curso" para começar a desenhar sua jornada de ensino.</p>
              <button
                onClick={handleOpenCreateCourse}
                className="mt-2 px-5 py-2.5 rounded-xl bg-surface-container-high border border-outline-variant/60 text-primary font-label-md hover:bg-surface-container transition-all"
              >
                Criar Curso
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cursos.map(c => (
                <div
                  key={c.id}
                  onClick={() => handleOpenCourse(c)}
                  className="bg-white border border-slate-200 hover:border-primary/40 rounded-2xl overflow-hidden shadow-level-1 hover:shadow-level-2 hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Cover Photo */}
                    <div className="w-full h-40 bg-slate-100 overflow-hidden relative border-b border-slate-100">
                      <img
                        src={c.imagem_capa || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAtFIMvkZnyEfatqV4viqIQ0qouFfUsJFbC047wwUyKILQPYzvsK0uPEnyeHRBj7thqqT5pUBZs-hPqMChs2xyFalhqbF89Qt4YqROVx_lATJeZjsjgTRp6e4wWqQ9ByL5xdT1O9rVr51uW58HcPkBKc6vjuxE42HVBFtUd95tIDwhUEaCi5fBdaAqo7pgM4uORSEB3vOTuflxF9REKz_rlWJDzJU-q6MF0KI25Tl4xALwMnEYC--UAeWWcwOmYCbgYCs1Ns1tVD4'}
                        alt={c.titulo}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded">
                        {c.nivel}
                      </div>
                    </div>

                    {/* Metadata */}
                    <div className="p-5 space-y-2">
                      <div className="flex justify-between items-center text-label-sm text-primary">
                        <span className="bg-primary/5 px-2.5 py-0.5 rounded border border-primary/10 font-bold">{c.categoria}</span>
                        <span className="text-slate-400 font-medium">{c.duracao}</span>
                      </div>
                      <h3 className="font-heading font-extrabold text-body-lg text-on-surface line-clamp-1 group-hover:text-primary transition-colors">
                        {c.titulo}
                      </h3>
                      <p className="text-on-surface-variant text-label-sm line-clamp-2 leading-relaxed">
                        {c.descricao || 'Sem descrição fornecida.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                    <span className="text-primary font-heading font-bold text-label-md flex items-center gap-1 group-hover:translate-x-1 transition-all">
                      Organizar Grade
                      <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                    </span>
                    <button
                      onClick={(e) => handleDeleteCourse(c.id, e)}
                      className="p-2 text-slate-400 hover:text-error hover:bg-error-container/20 rounded-lg transition-colors"
                      title="Excluir Curso"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* STAGE 2: Curriculum Builder & Module Organizer */}
      {view === 'builder' && selectedCourse && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Breadcrumb Header */}
          <div className="app-page-header app-page-header-row">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-on-surface-variant text-label-sm cursor-pointer" onClick={() => setView('courses')}>
                <span>Cursos</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                <span className="text-primary font-bold">{selectedCourse.titulo}</span>
              </div>
              <h2 className="app-title">Grade do Curso</h2>
            </div>
            <button
              onClick={() => setView('courses')}
              className="app-secondary-action"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
              Voltar para Cursos
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Course Identity Details Widget */}
            <div className="xl:col-span-1 app-card-padded space-y-4 h-fit">
              <div className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden relative">
                <img
                  src={selectedCourse.imagem_capa || 'https://lh3.googleusercontent.com/aida-public/AB6AXuAAtFIMvkZnyEfatqV4viqIQ0qouFfUsJFbC047wwUyKILQPYzvsK0uPEnyeHRBj7thqqT5pUBZs-hPqMChs2xyFalhqbF89Qt4YqROVx_lATJeZjsjgTRp6e4wWqQ9ByL5xdT1O9rVr51uW58HcPkBKc6vjuxE42HVBFtUd95tIDwhUEaCi5fBdaAqo7pgM4uORSEB3vOTuflxF9REKz_rlWJDzJU-q6MF0KI25Tl4xALwMnEYC--UAeWWcwOmYCbgYCs1Ns1tVD4'}
                  alt={selectedCourse.titulo}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface">{selectedCourse.titulo}</h3>
                <p className="text-on-surface-variant text-label-sm leading-relaxed">{selectedCourse.descricao || 'Sem descrição.'}</p>
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-label-sm text-slate-600 font-semibold mb-3">
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">{selectedCourse.categoria}</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">{selectedCourse.nivel}</span>
                  <span className="bg-slate-100 px-2.5 py-1 rounded-md">{selectedCourse.duracao}</span>
                </div>
                <button
                  onClick={() => handleOpenEditCourse(selectedCourse)}
                  className="w-full py-2 border border-primary/20 hover:border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-heading font-bold text-label-sm rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={Edit01Icon} size={16} />
                  Editar Detalhes do Curso
                </button>
              </div>
            </div>

            {/* Modules List and Builder Area */}
            <div className="xl:col-span-2 space-y-5">
              <div className="flex items-center justify-between pb-1">
                <h3 className="app-section-title">Módulos do Curso</h3>
                <span className="text-label-sm font-semibold bg-primary/5 text-primary border border-primary/10 px-2.5 py-1 rounded-full">
                  {modulos.length} Módulos adicionados
                </span>
              </div>

              {loading ? (
                <p className="text-center py-8 text-slate-500">Buscando módulos...</p>
              ) : modulos.length === 0 ? (
                <div className="app-card-padded text-center text-slate-400 space-y-2">
                  <p className="text-body-md font-bold text-on-surface">Grade curricular em branco.</p>
                  <p className="text-label-sm">Crie seu primeiro módulo no formulário abaixo.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {modulos.map((m, idx) => (
                    <div
                      key={m.id}
                      className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-level-1 group/module transition-all duration-200"
                    >
                      {/* Module Header */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100">
                        <div className="flex items-center gap-3 flex-1">
                          <span className="font-label-sm text-label-sm text-primary uppercase font-extrabold tracking-wider bg-primary/10 px-2 py-0.5 rounded border border-primary/20 shrink-0">
                            Módulo {idx + 1}
                          </span>
                          
                          {editingModuleId === m.id ? (
                            <div className="flex items-center gap-2 flex-1 max-w-md">
                              <input
                                type="text"
                                value={editingModuleTitle}
                                onChange={(e) => setEditingModuleTitle(e.target.value)}
                                className="w-full px-3 py-1.5 border border-primary rounded-lg focus:outline-none text-body-md"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateModule(m.id)}
                                className="px-3 py-1.5 bg-primary text-white text-label-sm rounded-lg hover:bg-primary-container"
                              >
                                Salvar
                              </button>
                              <button
                                onClick={() => setEditingModuleId(null)}
                                className="px-3 py-1.5 border border-slate-200 text-slate-600 text-label-sm rounded-lg hover:bg-slate-100"
                              >
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <h4 className="font-heading font-extrabold text-body-md text-on-surface line-clamp-1">{m.titulo}</h4>
                          )}
                        </div>

                        {editingModuleId !== m.id && (
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover/module:opacity-100 transition-opacity ml-2 shrink-0">
                            <button
                              onClick={() => { setEditingModuleId(m.id); setEditingModuleTitle(m.titulo); }}
                              className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-200/50 transition-colors"
                              title="Editar Nome do Módulo"
                            >
                              <HugeiconsIcon icon={Edit01Icon} size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteModule(m.id)}
                              className="p-1.5 text-slate-400 hover:text-error rounded-lg hover:bg-error-container/20 transition-colors"
                              title="Excluir Módulo"
                            >
                              <HugeiconsIcon icon={Delete02Icon} size={16} />
                            </button>
                          </div>
                        )}
                      </div>

            <div className="p-4 bg-white space-y-2">
                        {m.aulas && m.aulas.length > 0 ? (
                          m.aulas.map((lesson) => {
                            const hasAtividade = lesson.atividades && lesson.atividades.length > 0;
                            const atividade = hasAtividade ? lesson.atividades![0] : null;

                            const hasVideo = !!lesson.video_url;
                            const hasQuiz = lesson.tipo === 'quiz' || (lesson.questoes && lesson.questoes.length > 0);
                            const hasArquivo = !!lesson.arquivo_url;
                            const hasTexto = !!lesson.conteudo;

                            const activeLabels: string[] = [];
                            if (hasVideo) activeLabels.push('Vídeo');
                            if (hasQuiz) activeLabels.push('Quiz');
                            if (hasArquivo) activeLabels.push('Material de Apoio');
                            if (hasTexto && activeLabels.length === 0) activeLabels.push('Texto');
                            const typeLabel = activeLabels.join(' + ') || 'Texto';

                            return (
                              <div key={lesson.id} className="space-y-1.5">
                                <div className="flex items-center justify-between p-3 bg-slate-50 border border-transparent hover:border-slate-200 rounded-xl transition-all group/lesson">
                                  <div className="flex items-center gap-3">
                                    {/* Type icon */}
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                                      hasVideo ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                      hasQuiz ? 'bg-purple-50 text-purple-600 border border-purple-100' :
                                      hasArquivo ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                      'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                    }`}>
                                      <HugeiconsIcon 
                                        icon={
                                          hasVideo ? PlayCircleIcon : 
                                          hasQuiz ? Quiz01Icon : 
                                          hasArquivo ? BookOpen01Icon : 
                                          NotebookIcon
                                        } 
                                        size={18} 
                                      />
                                    </div>
                                    <div>
                                      <p className="font-heading font-semibold text-label-md text-on-surface line-clamp-1">{lesson.titulo}</p>
                                      <p className="text-[11px] text-slate-400 font-mono capitalize">
                                        Aula {lesson.numero_aula} &bull; {typeLabel}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] font-bold text-slate-500 font-mono bg-slate-200/50 px-2 py-0.5 rounded border border-slate-200">
                                      {lesson.duracao || (hasVideo ? 'Vídeo' : 'Leitura')}
                                    </span>
                                    <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover/lesson:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => handleOpenEditLesson(m, lesson)}
                                        className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-200/50 transition-colors"
                                        title="Editar Aula"
                                      >
                                        <HugeiconsIcon icon={Edit01Icon} size={15} />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteLesson(lesson.id)}
                                        className="p-1.5 text-slate-400 hover:text-error rounded-lg hover:bg-error-container/20 transition-colors"
                                        title="Excluir Aula"
                                      >
                                        <HugeiconsIcon icon={Delete02Icon} size={15} />
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {atividade && (
                                  <div className="ml-8 p-3 bg-amber-50/40 border border-dashed border-amber-200/60 rounded-xl flex items-center justify-between gap-3 text-label-sm animate-in slide-in-from-top-1 duration-150">
                                    <div className="flex items-center gap-2 text-amber-800 min-w-0">
                                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} className="text-amber-600 shrink-0" />
                                      <div className="min-w-0">
                                        <p className="font-heading font-bold text-amber-900 leading-tight text-[12px]">Atividade Prática</p>
                                        <p className="text-[11px] text-amber-700/80 truncate max-w-lg mt-0.5" title={atividade.enunciado}>
                                          {atividade.enunciado}
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-[10px] font-bold bg-amber-100/80 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200 shrink-0 capitalize">
                                      {atividade.tipo_entrega}
                                    </span>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <p className="text-center py-4 text-slate-400 text-label-sm">Nenhuma aula cadastrada neste módulo.</p>
                        )}

                        {/* Add Lesson Button */}
                        <button
                          onClick={() => handleOpenNewLesson(m)}
                          className="w-full py-2.5 mt-2 flex items-center justify-center gap-1.5 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-600 hover:text-primary rounded-xl font-heading font-bold text-label-sm transition-all"
                        >
                          <HugeiconsIcon icon={AddCircleIcon} size={18} />
                          Adicionar Aula ou Material
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Module Inline Form */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-level-1 space-y-3">
                <h4 className="font-heading font-extrabold text-body-md text-on-surface">Adicionar Novo Módulo</h4>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Ex: Introdução ao Adobe Illustrator"
                    value={newModuleTitle}
                    onChange={(e) => setNewModuleTitle(e.target.value)}
                    disabled={saving}
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md"
                  />
                  <button
                    onClick={handleAddModule}
                    disabled={saving || !newModuleTitle.trim()}
                    className="px-5 py-2.5 bg-primary text-on-primary font-heading font-bold text-label-sm rounded-xl hover:bg-primary-container disabled:opacity-50 transition-all"
                  >
                    {saving ? 'Adicionando...' : 'Adicionar Módulo'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STAGE 3: Lesson & Activity Creator */}
      {view === 'lesson_creator' && selectedModule && selectedCourse && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Breadcrumbs Header */}
          <div className="app-page-header app-page-header-row">
            <div className="space-y-1">
              <div className="flex items-center gap-1 text-on-surface-variant text-label-sm">
                <span className="cursor-pointer hover:text-primary" onClick={() => setView('courses')}>Cursos</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                <span className="cursor-pointer hover:text-primary" onClick={() => setView('builder')}>{selectedCourse.titulo}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                <span className="text-slate-400 font-medium line-clamp-1 max-w-[150px]">{selectedModule.titulo}</span>
                <HugeiconsIcon icon={ArrowRight01Icon} size={12} />
                <span className="text-primary font-bold">{selectedLesson ? 'Editar Aula' : 'Nova Aula'}</span>
              </div>
              <h2 className="app-title">
                {selectedLesson ? 'Editar Aula e Atividade' : 'Cadastrar Aula e Atividade'}
              </h2>
            </div>
            <button
              onClick={() => setView('builder')}
              className="app-secondary-action"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={18} />
              Cancelar
            </button>
          </div>

          <div className="flex flex-col xl:flex-row gap-6">
            
            {/* Left Column: Lesson Content Form */}
            <div className="flex-1 space-y-6">
              
              {/* AI Assistant Card */}
              <section className="app-card-padded bg-gradient-to-br from-indigo-50/70 via-white to-purple-50/50 border-indigo-100 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-indigo-100/50 pb-3">
                  <h3 className="font-heading font-extrabold text-body-lg text-indigo-900 flex items-center gap-2">
                    <HugeiconsIcon icon={SparklesIcon} size={22} className="text-indigo-600 animate-pulse" />
                    Assistente de Criação com IA
                  </h3>
                  <span className="text-[10px] font-extrabold uppercase bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200">
                    Gemini Ativo
                  </span>
                </div>

                <p className="text-label-sm text-slate-500 leading-relaxed">
                  Digite ou cole instruções para que a inteligência artificial configure a aula automaticamente. Ela criará o título, descrição, conteúdo teórico, materiais complementares (links/PDFs) e questionários!
                </p>

                <div className="space-y-3">
                  <textarea
                    placeholder="Ex: Crie uma aula sobre 'Componentes em React' com um quiz de 3 perguntas no final e adicione o material complementar pdf: https://react.dev/assets/react-basics.pdf"
                    value={aiPrompt}
                    onChange={(e) => {
                      setAiPrompt(e.target.value);
                      if (aiError) setAiError(null);
                      if (aiSuccess) setAiSuccess(null);
                    }}
                    rows={4}
                    disabled={aiLoading}
                    className="w-full px-4 py-3 rounded-xl border border-indigo-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/10 focus:outline-none transition-all text-body-md"
                  />

                  {aiError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-label-sm text-red-600 font-medium leading-relaxed">
                      ⚠️ {aiError}
                    </div>
                  )}

                  {aiSuccess && (
                    <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-label-sm text-emerald-700 font-semibold leading-relaxed">
                      🎉 {aiSuccess}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleGenerateWithAI}
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-heading font-bold text-label-sm rounded-xl shadow-md transition-all flex items-center gap-2 hover:-translate-y-0.5"
                    >
                      {aiLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Configurando aula...
                        </>
                      ) : (
                        <>
                          <HugeiconsIcon icon={SparklesIcon} size={16} />
                          Gerar Configurações
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </section>

              {/* Basic Info Card */}
              <section className="app-card-padded space-y-4">
                <h3 className="app-section-title flex items-center gap-2">
                  <HugeiconsIcon icon={Edit01Icon} size={20} className="text-primary" />
                  Informações Básicas
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-slate-600">Título da Aula</label>
                    <input
                      type="text"
                      placeholder="Ex: Introdução à Teoria das Cores"
                      value={lessonForm.titulo}
                      onChange={(e) => setLessonForm({ ...lessonForm, titulo: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-slate-600">Descrição / Objetivos</label>
                    <textarea
                      placeholder="Descreva o que os alunos aprenderão nesta aula ou quais as metas..."
                      value={lessonForm.descricao}
                      onChange={(e) => setLessonForm({ ...lessonForm, descricao: e.target.value })}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all resize-none text-body-md"
                    />
                  </div>
                </div>
              </section>

              {/* Lesson Type Selector Card */}
              <section className="app-card-padded">
                <h3 className="text-label-sm font-extrabold text-slate-500 mb-4 uppercase tracking-wider">Formatos de Conteúdo da Aula</h3>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {/* Video */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="checkbox"
                      checked={activeTypes.video}
                      onChange={() => setActiveTypes({ ...activeTypes, video: !activeTypes.video })}
                      className="peer sr-only"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50 h-28">
                      <HugeiconsIcon icon={PlayCircleIcon} size={28} className="text-slate-400 group-hover:text-primary peer-checked:text-primary" />
                      <span className="font-heading font-bold text-label-sm text-slate-600 peer-checked:text-primary">Vídeo</span>
                    </div>
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    </div>
                  </label>

                  {/* Text */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="checkbox"
                      checked={activeTypes.texto}
                      onChange={() => setActiveTypes({ ...activeTypes, texto: !activeTypes.texto })}
                      className="peer sr-only"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50 h-28">
                      <HugeiconsIcon icon={NotebookIcon} size={28} className="text-slate-400 group-hover:text-primary peer-checked:text-primary" />
                      <span className="font-heading font-bold text-label-sm text-slate-600 peer-checked:text-primary">Texto</span>
                    </div>
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    </div>
                  </label>

                  {/* Quiz */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="checkbox"
                      checked={activeTypes.quiz}
                      onChange={() => setActiveTypes({ ...activeTypes, quiz: !activeTypes.quiz })}
                      className="peer sr-only"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50 h-28">
                      <HugeiconsIcon icon={Quiz01Icon} size={28} className="text-slate-400 group-hover:text-primary peer-checked:text-primary" />
                      <span className="font-heading font-bold text-label-sm text-slate-600 peer-checked:text-primary">Quiz</span>
                    </div>
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    </div>
                  </label>

                  {/* File */}
                  <label className="cursor-pointer group relative">
                    <input
                      type="checkbox"
                      checked={activeTypes.arquivo}
                      onChange={() => setActiveTypes({ ...activeTypes, arquivo: !activeTypes.arquivo })}
                      className="peer sr-only"
                    />
                    <div className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 peer-checked:border-primary peer-checked:bg-primary/5 transition-all hover:border-primary/50 h-28">
                      <HugeiconsIcon icon={BookOpen01Icon} size={28} className="text-slate-400 group-hover:text-primary peer-checked:text-primary" />
                      <span className="font-heading font-bold text-label-sm text-slate-600 peer-checked:text-primary">Material de Apoio</span>
                    </div>
                    <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center opacity-0 peer-checked:opacity-100 transition-opacity">
                      <HugeiconsIcon icon={CheckmarkCircle02Icon} size={12} />
                    </div>
                  </label>
                </div>
              </section>

              {/* Dynamic Content Inputs */}
              {activeTypes.video && (
                <section className="app-card-padded space-y-4">
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">Configurações de Vídeo</h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-slate-600">URL do Vídeo (Youtube, Vimeo, etc.)</label>
                    <input
                      type="url"
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={lessonForm.video_url}
                      onChange={(e) => setLessonForm({ ...lessonForm, video_url: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md font-mono"
                    />
                  </div>
                </section>
              )}

              {activeTypes.arquivo && (
                <section className="app-card-padded space-y-4">
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">Material de Apoio</h4>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-label-sm font-bold text-slate-600">Link do Arquivo / PDF (Google Drive, Dropbox, etc.)</label>
                    <input
                      type="url"
                      placeholder="https://drive.google.com/file/d/.../view  ou  https://exemplo.com/arquivo.pdf"
                      value={lessonForm.arquivo_url}
                      onChange={(e) => setLessonForm({ ...lessonForm, arquivo_url: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md font-mono"
                    />
                    {/* Help box */}
                    <div className="mt-1 p-3.5 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
                      <p className="text-[11px] font-extrabold text-blue-700 uppercase tracking-wider">📄 Visualização de PDF inline no app do aluno</p>
                      <p className="text-[12px] text-blue-800 font-medium leading-relaxed">
                        PDFs do <strong>Google Drive</strong> e links diretos <code className="bg-blue-100 px-1 rounded">.pdf</code> serão exibidos diretamente dentro da plataforma sem precisar baixar.
                      </p>
                      <div className="text-[11.5px] text-blue-700 space-y-1">
                        <p className="font-bold">Para Google Drive:</p>
                        <ol className="list-decimal list-inside space-y-0.5 font-medium">
                          <li>Abra o arquivo no Google Drive</li>
                          <li>Clique em <strong>Compartilhar</strong> → <strong>"Qualquer pessoa com o link"</strong></li>
                          <li>Copie o link e cole aqui</li>
                        </ol>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {activeTypes.texto && (
                <section className="app-card-padded space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h4 className="font-heading font-extrabold text-body-md text-on-surface">Texto da Aula</h4>
                    <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setEditorTab('write')}
                        className={`px-3 py-1.5 rounded-md text-label-sm font-bold transition-all ${
                          editorTab === 'write'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Escrever
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditorTab('preview')}
                        className={`px-3 py-1.5 rounded-md text-label-sm font-bold transition-all ${
                          editorTab === 'preview'
                            ? 'bg-white text-primary shadow-sm'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Visualizar
                      </button>
                    </div>
                  </div>

                  {editorTab === 'write' ? (
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-label-sm font-bold text-slate-600">Conteúdo Teórico da Aula</label>
                        
                        {/* Toolbar */}
                        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 shadow-sm">
                          <button
                            type="button"
                            onClick={() => insertMarkdown('bold')}
                            className="p-1.5 px-3 rounded text-xs font-extrabold hover:bg-slate-200/80 text-slate-700 hover:text-primary transition-all active:scale-95"
                            title="Negrito (**texto**)"
                          >
                            B
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h2')}
                            className="p-1.5 px-3 rounded text-xs font-extrabold hover:bg-slate-200/80 text-slate-700 hover:text-primary transition-all active:scale-95"
                            title="Título Secundário (## Título)"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onClick={() => insertMarkdown('h3')}
                            className="p-1.5 px-3 rounded text-xs font-extrabold hover:bg-slate-200/80 text-slate-700 hover:text-primary transition-all active:scale-95"
                            title="Subtítulo (### Subtítulo)"
                          >
                            H3
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => insertMarkdown('list')}
                            className="p-1.5 px-3 rounded text-xs font-bold hover:bg-slate-200/80 text-slate-700 hover:text-primary transition-all active:scale-95"
                            title="Item de Lista (- item)"
                          >
                            • Lista
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200" />
                          <button
                            type="button"
                            onClick={() => insertMarkdown('code')}
                            className="p-1.5 px-2.5 rounded text-xs font-mono font-bold hover:bg-slate-200/80 text-slate-700 hover:text-primary transition-all active:scale-95"
                            title="Código (`código`)"
                          >
                            &lt;/&gt;
                          </button>
                        </div>
                      </div>

                      <textarea
                        ref={textareaRef}
                        placeholder="Insira as explicações, exemplos de código ou textos informativos... Use a barra de formatação para aplicar negrito, cabeçalhos, listas e códigos."
                        value={lessonForm.conteudo}
                        onChange={(e) => setLessonForm({ ...lessonForm, conteudo: e.target.value })}
                        rows={10}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all font-mono text-body-md"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="text-label-sm font-bold text-slate-600 block">Pré-visualização do Aluno</label>
                      <div className="prose max-w-none text-body-md text-slate-700 leading-relaxed bg-slate-50/50 p-5 rounded-xl border border-slate-100 font-sans space-y-2 min-h-[220px]">
                        {lessonForm.conteudo ? (
                          lessonForm.conteudo.split('\n').map((paragraph, pIdx) => {
                            const trimmed = paragraph.trim();
                            if (!trimmed) return null;

                            if (trimmed.startsWith('###')) {
                              return (
                                <h5 key={pIdx} className="font-heading font-extrabold text-lg text-slate-900 pt-3">
                                  {renderFormattedText(trimmed.replace('###', '').trim())}
                                </h5>
                              );
                            }
                            if (trimmed.startsWith('##')) {
                              return (
                                <h4 key={pIdx} className="font-heading font-extrabold text-xl text-slate-950 pt-4 pb-1.5 border-b border-slate-200">
                                  {renderFormattedText(trimmed.replace('##', '').trim())}
                                </h4>
                              );
                            }
                            if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
                              return (
                                <ul key={pIdx} className="list-disc pl-6 space-y-1 my-1">
                                  <li className="text-body-md text-slate-700">
                                    {renderFormattedText(trimmed.substring(1).trim())}
                                  </li>
                                </ul>
                              );
                            }
                            return (
                              <p key={pIdx} className="my-1.5 leading-relaxed text-justify text-slate-700">
                                {renderFormattedText(paragraph)}
                              </p>
                            );
                          })
                        ) : (
                          <p className="italic text-slate-400">Digite algo na aba "Escrever" para ver a pré-visualização.</p>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* ATIVIDADE PRÁTICA CARD */}
              <section className="app-card-padded space-y-4">
                <div className="flex items-start justify-between pb-2 border-b border-slate-100 gap-4">
                  <div>
                    <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Atividade Prática Vinculada</h3>
                    <p className="text-label-sm text-slate-400 mt-1">Habilite um exercício obrigatório para o aluno enviar resposta e receber nota.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={lessonForm.has_atividade}
                    onChange={(e) => setLessonForm({ ...lessonForm, has_atividade: e.target.checked })}
                    className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                  />
                </div>

                {lessonForm.has_atividade && (
                  <div className="space-y-4 animate-in slide-in-from-top duration-200">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-slate-600">Instruções / Enunciado da Atividade</label>
                      <textarea
                        rows={4}
                        placeholder="Descreva detalhadamente o que o aluno deve executar para esta atividade..."
                        value={lessonForm.atividade_enunciado}
                        onChange={(e) => setLessonForm({ ...lessonForm, atividade_enunciado: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md font-sans"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-label-sm font-bold text-slate-600">Formato de Entrega Exigido</label>
                      <div className="flex flex-wrap gap-6 mt-1">
                        <label className="flex items-center gap-2 text-label-md text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="entrega_tipo"
                            value="texto"
                            checked={lessonForm.atividade_tipo_entrega === 'texto'}
                            onChange={() => setLessonForm({ ...lessonForm, atividade_tipo_entrega: 'texto' })}
                            className="text-primary focus:ring-primary/20 border-slate-300"
                          />
                          <span>Texto Escrito / Código</span>
                        </label>
                        <label className="flex items-center gap-2 text-label-md text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="entrega_tipo"
                            value="imagem"
                            checked={lessonForm.atividade_tipo_entrega === 'imagem'}
                            onChange={() => setLessonForm({ ...lessonForm, atividade_tipo_entrega: 'imagem' })}
                            className="text-primary focus:ring-primary/20 border-slate-300"
                          />
                          <span>Link de Imagem (Upload de Screenshot/Design)</span>
                        </label>
                        <label className="flex items-center gap-2 text-label-md text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="entrega_tipo"
                            value="quiz"
                            checked={lessonForm.atividade_tipo_entrega === 'quiz'}
                            onChange={() => {
                              setLessonForm({ ...lessonForm, atividade_tipo_entrega: 'quiz' });
                              setActiveTypes(prev => ({ ...prev, quiz: true }));
                            }}
                            className="text-primary focus:ring-primary/20 border-slate-300"
                          />
                          <span>Quiz (Questionário)</span>
                        </label>
                        <label className="flex items-center gap-2 text-label-md text-slate-600 cursor-pointer">
                          <input
                            type="radio"
                            name="entrega_tipo"
                            value="multipla"
                            checked={lessonForm.atividade_tipo_entrega === 'multipla'}
                            onChange={() => setLessonForm({ ...lessonForm, atividade_tipo_entrega: 'multipla' })}
                            className="text-primary focus:ring-primary/20 border-slate-300"
                          />
                          <span>Múltipla Entrega (Texto + Imagem)</span>
                        </label>
                      </div>
                    </div>

                    {lessonForm.atividade_tipo_entrega === 'quiz' && (
                      <div className="p-4 bg-indigo-50/50 border border-indigo-150 rounded-2xl space-y-3 animate-in slide-in-from-top duration-200">
                        <label className="flex items-center justify-between cursor-pointer group gap-4">
                          <div className="flex flex-col text-left">
                            <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors font-bold">Atividade Pontuada (Vale nota)</span>
                            <span className="text-label-sm text-slate-400 mt-0.5">Se desmarcado, a atividade servirá apenas como exercício formativo (sem nota/pontos)</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={lessonForm.atividade_pontua}
                            onChange={(e) => setLessonForm({ ...lessonForm, atividade_pontua: e.target.checked })}
                            className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                          />
                        </label>

                        <label className="flex items-center justify-between cursor-pointer group gap-4 pt-2 border-t border-indigo-100/50">
                          <div className="flex flex-col text-left">
                            <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors font-bold">Questionário Exclusivo</span>
                            <span className="text-label-sm text-slate-400 mt-0.5">Se marcado, o questionário terá perguntas específicas para esta atividade (em vez de compartilhar as do quiz principal da aula)</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={lessonForm.atividade_quiz_proprio}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setLessonForm(prev => ({ ...prev, atividade_quiz_proprio: checked }));
                              if (checked) {
                                setQuizSubTab('atividade');
                                const hasActivityQ = questoes.some(q => !!q.atividade_id);
                                if (!hasActivityQ) {
                                  setQuestoes(prev => [
                                    ...prev,
                                    {
                                      enunciado: 'Pergunta do Questionário...',
                                      opcoes: ['Opção A', 'Opção B'],
                                      resposta_correta: 'Opção A',
                                      ordem: 1,
                                      tipo: 'multipla_escolha',
                                      atividade_id: 'pending'
                                    }
                                  ]);
                                }
                              } else {
                                setQuizSubTab('standard');
                              }
                            }}
                            className="w-10 h-6 bg-slate-200 checked:bg-indigo-500 rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                          />
                        </label>

                        <p className="text-[11px] text-indigo-650 italic font-medium leading-relaxed bg-indigo-50/20 p-2.5 rounded-xl border border-indigo-100">
                          {lessonForm.atividade_quiz_proprio 
                            ? 'ℹ As questões cadastradas na aba "Questões da Atividade" abaixo serão utilizadas exclusivamente para esta atividade.'
                            : 'ℹ As questões cadastradas na aba "Questões do Quiz" abaixo serão utilizadas para esta atividade.'}
                        </p>
                      </div>
                    )}

                    {/* Permite Refazer Option */}
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                      <label className="flex items-center justify-between cursor-pointer group gap-4">
                        <div className="flex flex-col text-left">
                          <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors font-bold">Permitir refazer a atividade</span>
                          <span className="text-label-sm text-slate-400 mt-0.5">Se marcado, o aluno poderá reiniciar a atividade e enviar uma nova resposta antes de ser avaliado.</span>
                        </div>
                        <input
                          type="checkbox"
                          checked={lessonForm.atividade_permite_refazer}
                          onChange={(e) => setLessonForm({ ...lessonForm, atividade_permite_refazer: e.target.checked })}
                          className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </section>

              {/* QUIZ BUILDER AREA */}
              {(activeTypes.quiz || (lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz')) && (
                <section className="app-card-padded relative overflow-hidden space-y-6">
                  {/* Quiz tabs */}
                  <div className="flex border-b border-slate-100">
                    {activeTypes.quiz && (
                      <>
                        <button
                          type="button"
                          onClick={() => setQuizSubTab('standard')}
                          className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] ${
                            quizSubTab === 'standard'
                              ? 'border-primary text-primary'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          📝 Questões do Quiz
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuizSubTab('arena')}
                          className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
                            quizSubTab === 'arena'
                              ? 'border-indigo-500 text-indigo-500'
                              : 'border-transparent text-slate-400 hover:text-slate-600'
                          }`}
                        >
                          🎮 Arena Estudea Live
                        </button>
                      </>
                    )}
                    {lessonForm.has_atividade && lessonForm.atividade_tipo_entrega === 'quiz' && lessonForm.atividade_quiz_proprio && (
                      <button
                        type="button"
                        onClick={() => setQuizSubTab('atividade')}
                        className={`px-5 py-3 font-heading font-bold text-label-md transition-all border-b-2 -mb-[1px] flex items-center gap-1.5 ${
                          quizSubTab === 'atividade'
                            ? 'border-pink-500 text-pink-500'
                            : 'border-transparent text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        📋 Questões da Atividade
                      </button>
                    )}
                  </div>

                  {quizSubTab === 'standard' ? (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="font-heading font-extrabold text-body-lg text-on-surface">Questões do Quiz</h3>
                        <p className="text-label-sm text-slate-400 mt-1">Defina perguntas e respostas corretas para o progresso do aluno no estudo individual.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="px-4 py-2 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary font-heading font-bold text-label-sm flex items-center gap-1.5 transition-all"
                      >
                        <HugeiconsIcon icon={AddCircleIcon} size={18} />
                        Nova Questão
                      </button>
                    </div>
                  ) : quizSubTab === 'arena' ? (
                    <div className="space-y-4 pb-2 border-b border-slate-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                        <div>
                          <h3 className="font-heading font-extrabold text-body-lg text-indigo-500 flex items-center gap-1.5">
                            Questões da Arena Estudea
                          </h3>
                          <p className="text-label-sm text-slate-400 mt-1">
                            Perguntas rápidas elaboradas especialmente para a competição multiplayer ao vivo.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={handleAddQuestion}
                          className="px-4 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-500 font-heading font-bold text-label-sm flex items-center gap-1.5 transition-all"
                        >
                          <HugeiconsIcon icon={AddCircleIcon} size={18} />
                          Nova Questão Arena
                        </button>
                      </div>
                      
                      {/* AI material generator block */}
                      <div className="p-4 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-base">✨</span>
                          <span className="font-heading font-bold text-label-md text-indigo-650">Gerar com Inteligência Artificial</span>
                        </div>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          Cole materiais de leitura, conceitos-chave, resumos da aula ou slides abaixo e a IA criará as questões rápidas da Arena automaticamente.
                        </p>
                        <textarea
                          value={aiMaterial}
                          onChange={(e) => setAiMaterial(e.target.value)}
                          placeholder="Cole aqui o material de leitura, notas de aula, slides ou referências teóricas..."
                          className="w-full h-24 p-3 bg-white border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 rounded-xl text-body-md outline-none transition-all resize-y text-slate-800"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleGenerateArenaQuestionsWithAI}
                            disabled={aiGeneratingArena}
                            className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-slate-350 text-white font-heading font-bold text-label-sm rounded-xl transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {aiGeneratingArena ? (
                              <>
                                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></span>
                                Gerando Questões...
                              </>
                            ) : (
                              'Gerar Questões da Arena'
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                      <div>
                        <h3 className="font-heading font-extrabold text-body-lg text-pink-600">Questões da Atividade</h3>
                        <p className="text-label-sm text-slate-400 mt-1">Defina perguntas exclusivas para o questionário de entrega desta atividade prática.</p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddQuestion}
                        className="px-4 py-2 rounded-xl bg-pink-50 hover:bg-pink-100 text-pink-600 font-heading font-bold text-label-sm flex items-center gap-1.5 transition-all"
                      >
                        <HugeiconsIcon icon={AddCircleIcon} size={18} />
                        Nova Questão Atividade
                      </button>
                    </div>
                  )}

                  <div className="space-y-6 font-sans">
                    {questoes.map((q, qIndex) => {
                      const belongsToTab = (() => {
                        if (quizSubTab === 'arena') return !!q.para_arena;
                        if (quizSubTab === 'atividade') return !!q.atividade_id;
                        return !q.para_arena && !q.atividade_id;
                      })();
                      if (!belongsToTab) return null;

                      return (
                        <div
                          key={qIndex}
                          className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative group"
                        >
                          {/* Lefthand active indicator */}
                          <div className={`absolute -left-[1px] top-4 bottom-4 w-[4px] rounded-r-md ${
                            quizSubTab === 'arena' 
                              ? 'bg-indigo-500' 
                              : quizSubTab === 'atividade'
                                ? 'bg-pink-500'
                                : 'bg-primary'
                          }`}></div>
                          
                          {/* Question Header */}
                          <div className="flex justify-between items-start gap-4 mb-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <span className="text-slate-500 font-heading font-extrabold text-[12px] uppercase">Questão {q.ordem}</span>
                                <div className="flex gap-1 bg-slate-200/60 p-1 rounded-xl w-fit border border-slate-200">
                                  {[
                                    { id: 'multipla_escolha', label: 'Múltipla Escolha' },
                                    { id: 'multipla_selecao', label: 'Múltiplas Respostas' },
                                    { id: 'verdadeiro_falso', label: 'V / F' },
                                    { id: 'aberta', label: 'Aberta' }
                                  ].map((t) => {
                                    const isSelected = (q.tipo || 'multipla_escolha') === t.id;
                                    return (
                                      <button
                                        key={t.id}
                                        type="button"
                                        onClick={() => handleSetQuestionType(qIndex, t.id as any)}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-heading font-extrabold uppercase tracking-wider transition-all ${
                                          isSelected
                                            ? 'bg-primary text-white shadow shadow-primary/10'
                                            : 'text-slate-600 hover:text-slate-900 bg-transparent hover:bg-slate-200/50'
                                        }`}
                                      >
                                        {t.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                              <input
                                type="text"
                                value={q.enunciado}
                                onChange={(e) => handleUpdateQuestionText(qIndex, e.target.value)}
                                placeholder="Digite o enunciado da pergunta..."
                                className="w-full bg-transparent border-b border-slate-200 hover:border-slate-300 focus:border-primary focus:ring-0 p-0 py-1 font-heading font-bold text-body-md text-on-surface focus:outline-none"
                              />
                            </div>

                            <div className="flex items-center gap-0.5 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                onClick={() => handleDuplicateQuestion(qIndex)}
                                className="p-1.5 text-slate-400 hover:text-primary rounded-lg hover:bg-slate-200/65"
                                title="Duplicar Questão"
                              >
                                <HugeiconsIcon icon={SparklesIcon} size={16} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveQuestion(qIndex)}
                                className="p-1.5 text-slate-400 hover:text-error rounded-lg hover:bg-error-container/20"
                                title="Excluir Questão"
                              >
                                <HugeiconsIcon icon={Delete02Icon} size={16} />
                              </button>
                            </div>
                          </div>

                          {/* Options Render based on Question Type */}
                          {(!q.tipo || q.tipo === 'multipla_escolha') && (
                            <div className="space-y-3">
                              {q.opcoes.map((opt, optIndex) => {
                                const isCorrect = q.resposta_correta === opt;
                                return (
                                  <div
                                    key={optIndex}
                                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                                      isCorrect 
                                        ? 'bg-primary/5 border-primary/20' 
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Correct check label */}
                                    <label className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-slate-300 cursor-pointer peer-checked:border-primary">
                                      <input
                                        type="radio"
                                        name={`q_${qIndex}_correct`}
                                        checked={isCorrect}
                                        onChange={() => handleSetCorrectOption(qIndex, opt)}
                                        className="sr-only"
                                      />
                                      <div className={`w-3 h-3 rounded-full bg-primary transition-all ${isCorrect ? 'scale-100' : 'scale-0'}`}></div>
                                    </label>

                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdateOptionText(qIndex, optIndex, e.target.value)}
                                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface focus:outline-none"
                                    />

                                    {isCorrect && (
                                      <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">Correta</span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(qIndex, optIndex)}
                                      className="text-slate-300 hover:text-slate-500 p-1 rounded-lg"
                                    >
                                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleAddOption(qIndex)}
                                className="flex items-center gap-1 text-primary font-heading font-bold text-label-sm hover:underline pl-2 mt-2"
                              >
                                <HugeiconsIcon icon={AddCircleIcon} size={14} />
                                Adicionar Opção
                              </button>
                            </div>
                          )}

                          {q.tipo === 'multipla_selecao' && (
                            <div className="space-y-3">
                              <p className="text-[11px] font-bold text-slate-500 font-mono uppercase tracking-wider block pl-2 mb-1">
                                Selecione uma ou mais opções corretas:
                              </p>
                              {q.opcoes.map((opt, optIndex) => {
                                const correctOptions = q.resposta_correta ? q.resposta_correta.split(';').map(o => o.trim()) : [];
                                const isCorrect = correctOptions.includes(opt);
                                return (
                                  <div
                                    key={optIndex}
                                    className={`flex items-center gap-3 p-2 rounded-xl border transition-all ${
                                      isCorrect 
                                        ? 'bg-primary/5 border-primary/20' 
                                        : 'bg-white border-slate-200 hover:border-slate-300'
                                    }`}
                                  >
                                    {/* Correct checkbox */}
                                    <label className="flex items-center justify-center w-6 h-6 rounded border-2 border-slate-300 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={isCorrect}
                                        onChange={() => handleToggleCorrectOptionMulti(qIndex, opt)}
                                        className="sr-only"
                                      />
                                      <span className={`text-[12px] font-extrabold text-primary transition-all ${isCorrect ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`}>✓</span>
                                    </label>

                                    <input
                                      type="text"
                                      value={opt}
                                      onChange={(e) => handleUpdateOptionText(qIndex, optIndex, e.target.value)}
                                      className="flex-1 bg-transparent border-none p-0 focus:ring-0 text-label-md text-on-surface focus:outline-none"
                                    />

                                    {isCorrect && (
                                      <span className="text-[10px] font-extrabold uppercase bg-primary/10 text-primary px-2 py-0.5 rounded">Correta</span>
                                    )}

                                    <button
                                      type="button"
                                      onClick={() => handleRemoveOption(qIndex, optIndex)}
                                      className="text-slate-300 hover:text-slate-500 p-1 rounded-lg"
                                    >
                                      <HugeiconsIcon icon={Cancel01Icon} size={14} />
                                    </button>
                                  </div>
                                );
                              })}

                              <button
                                type="button"
                                onClick={() => handleAddOption(qIndex)}
                                className="flex items-center gap-1 text-primary font-heading font-bold text-label-sm hover:underline pl-2 mt-2"
                              >
                                <HugeiconsIcon icon={AddCircleIcon} size={14} />
                                Adicionar Opção
                              </button>
                            </div>
                          )}

                          {q.tipo === 'verdadeiro_falso' && (
                            <div className="flex gap-4">
                              {['Verdadeiro', 'Falso'].map((val) => {
                                const isCorrect = q.resposta_correta === val;
                                return (
                                  <button
                                    key={val}
                                    type="button"
                                    onClick={() => handleSetCorrectOption(qIndex, val)}
                                    className={`flex-1 py-3 px-4 rounded-xl border font-heading font-bold text-label-md transition-all ${
                                      isCorrect
                                        ? 'bg-primary text-white border-primary shadow'
                                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                                    }`}
                                  >
                                    {val}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {q.tipo === 'aberta' && (
                            <div className="space-y-3">
                              <div>
                                <label className="text-label-sm font-bold text-slate-550 block mb-1">Palavras-chave aceitas (separadas por vírgula):</label>
                                <input
                                  type="text"
                                  value={q.opcoes[1] || ''}
                                  onChange={(e) => {
                                    const newQuestions = [...questoes];
                                    newQuestions[qIndex].opcoes[1] = e.target.value;
                                    setQuestoes(newQuestions);
                                  }}
                                  placeholder="ex: vetor, caneta, traçado (se o aluno digitar todas, a questão é considerada correta)"
                                  className="w-full px-4 py-3 border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none transition-all text-body-md font-mono"
                                />
                                <p className="text-[10px] text-slate-400 mt-1">
                                  * Se deixado em branco, qualquer resposta do aluno que não esteja vazia será validada como correta.
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {questoes.filter(q => {
                      if (quizSubTab === 'arena') return !!q.para_arena;
                      if (quizSubTab === 'atividade') return !!q.atividade_id;
                      return !q.para_arena && !q.atividade_id;
                    }).length === 0 && (
                      <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center">
                        <p className="text-slate-400 text-sm italic">
                          {quizSubTab === 'arena' 
                            ? 'Nenhuma questão criada para a Arena ainda. Use o gerador de IA acima ou clique em "Nova Questão Arena" para começar!'
                            : quizSubTab === 'atividade'
                              ? 'Nenhuma questão cadastrada para o questionário exclusivo da atividade ainda. Clique em "Nova Questão Atividade" para começar!'
                              : 'Nenhuma questão cadastrada para este quiz.'}
                        </p>
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={handleAddQuestion}
                      className="w-full py-3 border-2 border-dashed border-slate-200 hover:border-primary/50 hover:bg-primary/5 text-slate-500 hover:text-primary rounded-2xl font-heading font-bold text-label-md transition-all flex items-center justify-center gap-2"
                    >
                      <HugeiconsIcon icon={AddCircleIcon} size={20} />
                      {quizSubTab === 'arena' ? 'Nova Questão Arena' : quizSubTab === 'atividade' ? 'Nova Questão Atividade' : 'Nova Questão'}
                    </button>
                  </div>
                </section>
              )}
            </div>

            {/* Right Column: Settings Panel */}
            <div className="w-full xl:w-80 space-y-6 shrink-0">
              <aside className="app-card-padded space-y-6">
                <h3 className="font-heading font-extrabold text-body-lg text-on-surface flex items-center gap-2 pb-2 border-b border-slate-100">
                  <HugeiconsIcon icon={Settings01Icon} size={20} className="text-primary" />
                  Configurações
                </h3>

                <div className="space-y-6">
                  {/* Points */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-sm font-bold text-slate-600">Pontuação Total</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={lessonForm.pontos}
                        onChange={(e) => setLessonForm({ ...lessonForm, pontos: Number(e.target.value) })}
                        className="w-24 px-3 py-2 border border-slate-200 rounded-xl text-center font-mono font-bold text-body-md"
                      />
                      <span className="text-label-sm text-slate-500 font-semibold">pontos</span>
                    </div>
                  </div>

                  {/* Passing Score */}
                  <div className="flex flex-col gap-2">
                    <label className="text-label-sm font-bold text-slate-600">Nota de Aprovação</label>
                    <div className="flex justify-between items-center text-label-sm text-slate-500">
                      <span>{lessonForm.nota_aprovacao}%</span>
                      <span>({Math.round((lessonForm.nota_aprovacao / 100) * lessonForm.pontos)} pts)</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={lessonForm.nota_aprovacao}
                      onChange={(e) => setLessonForm({ ...lessonForm, nota_aprovacao: Number(e.target.value) })}
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>

                  <hr className="border-slate-100" />

                  {/* Toggles */}
                  <div className="space-y-4">
                    <label className="flex items-center justify-between cursor-pointer group gap-4">
                      <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors">Obrigatório</span>
                      <input
                        type="checkbox"
                        checked={lessonForm.obrigatorio}
                        onChange={(e) => setLessonForm({ ...lessonForm, obrigatorio: e.target.checked })}
                        className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                      />
                    </label>

                    <label className="flex items-center justify-between cursor-pointer group gap-4">
                      <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors">Embaralhar Questões</span>
                      <input
                        type="checkbox"
                        checked={lessonForm.embaralhar_questoes}
                        onChange={(e) => setLessonForm({ ...lessonForm, embaralhar_questoes: e.target.checked })}
                        className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                      />
                    </label>

                    {activeTypes.quiz && (
                      <label className="flex items-center justify-between cursor-pointer group gap-4">
                        <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors">Permitir na Arena Estudea</span>
                        <input
                          type="checkbox"
                          checked={lessonForm.permite_arena}
                          onChange={(e) => setLessonForm({ ...lessonForm, permite_arena: e.target.checked })}
                          className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                        />
                      </label>
                    )}

                    {/* Time limit */}
                    <div className="space-y-2">
                      <label className="flex items-center justify-between cursor-pointer group gap-4">
                        <span className="text-label-md text-slate-600 group-hover:text-primary transition-colors">Tempo Limite</span>
                        <input
                          type="checkbox"
                          checked={lessonForm.tempo_limite_enabled}
                          onChange={(e) => setLessonForm({ ...lessonForm, tempo_limite_enabled: e.target.checked })}
                          className="w-10 h-6 bg-slate-200 checked:bg-primary rounded-full appearance-none relative before:content-[''] before:absolute before:top-[1px] before:left-[1px] before:w-5 before:h-5 before:rounded-full before:bg-white before:transition-all checked:before:translate-x-4 border border-slate-300 transition-colors cursor-pointer shrink-0"
                        />
                      </label>
                      {lessonForm.tempo_limite_enabled && (
                        <div className="flex items-center gap-2 pl-1 animate-in slide-in-from-top duration-200">
                          <input
                            type="number"
                            min="1"
                            value={lessonForm.tempo_limite}
                            onChange={(e) => setLessonForm({ ...lessonForm, tempo_limite: Number(e.target.value) })}
                            className="w-20 px-2.5 py-1.5 border border-slate-200 rounded-xl text-center text-label-md"
                          />
                          <span className="text-label-sm text-slate-500 font-semibold">minutos</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </aside>
            </div>
          </div>

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-0 left-0 lg:left-[var(--sidebar-width,280px)] right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-4 shadow-[0_-4px_10px_rgba(0,0,0,0.03)] z-40 flex justify-end gap-3 px-6">
            <button
              onClick={() => setView('builder')}
              className="px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 font-heading font-semibold text-label-sm text-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSaveLesson}
              disabled={saving}
              className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-primary to-primary-container text-on-primary font-heading font-bold text-label-sm shadow-md hover:shadow-lg disabled:opacity-50 hover:-translate-y-0.5 transition-all duration-200 flex items-center gap-1.5"
            >
              {saving ? 'Salvando...' : 'Salvar Aula'}
              <HugeiconsIcon icon={Tick01Icon} size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Modal: Novo Curso */}
      {showCourseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg border border-slate-200 rounded-2xl shadow-level-2 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-background flex items-center gap-2">
                <HugeiconsIcon icon={BookOpen01Icon} size={20} className="text-primary" />
                {editingCourse ? 'Editar Curso' : 'Criar Novo Curso'}
              </h3>
              <button
                onClick={() => setShowCourseModal(false)}
                className="text-slate-400 hover:text-slate-600 focus:outline-none"
              >
                &times;
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveCourse} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-slate-600">Título do Curso</label>
                <input
                  type="text"
                  placeholder="Ex: Introdução ao Design Digital"
                  value={courseForm.titulo}
                  onChange={(e) => setCourseForm({ ...courseForm, titulo: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-slate-600">Descrição</label>
                <textarea
                  placeholder="Ex: Aprenda os fundamentos do design digital, tipografia, cores..."
                  value={courseForm.descricao}
                  onChange={(e) => setCourseForm({ ...courseForm, descricao: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-label-sm font-bold text-slate-600">URL da Imagem de Capa</label>
                <input
                  type="text"
                  value={courseForm.imagem_capa}
                  onChange={(e) => setCourseForm({ ...courseForm, imagem_capa: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-body-md font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-slate-600">Categoria</label>
                  <select
                    value={courseForm.categoria}
                    onChange={(e) => setCourseForm({ ...courseForm, categoria: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-label-md"
                  >
                    <option value="Design UI/UX">Design UI/UX</option>
                    <option value="Programação">Programação</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Marketing">Marketing</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-slate-600">Nível</label>
                  <select
                    value={courseForm.nivel}
                    onChange={(e) => setCourseForm({ ...courseForm, nivel: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-label-md"
                  >
                    <option value="Iniciante">Iniciante</option>
                    <option value="Intermediário">Intermediário</option>
                    <option value="Avançado">Avançado</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-label-sm font-bold text-slate-600">Duração Estimada</label>
                  <input
                    type="text"
                    placeholder="Ex: 20h"
                    value={courseForm.duracao}
                    onChange={(e) => setCourseForm({ ...courseForm, duracao: e.target.value })}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 focus:border-primary focus:ring-2 focus:ring-primary/10 focus:outline-none text-label-md text-center"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 font-heading font-semibold text-label-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-primary text-on-primary rounded-xl font-heading font-bold text-label-sm shadow-sm hover:shadow hover:bg-primary-container transition-all"
                >
                  {saving ? 'Salvando...' : (editingCourse ? 'Salvar Alterações' : 'Criar Curso')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
