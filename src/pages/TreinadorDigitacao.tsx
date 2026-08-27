import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  KeyboardIcon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
  ArrowRight01Icon,
  FireIcon,
  Cancel01Icon,
  Award01Icon,
  ArrowLeft01Icon,
  InformationCircleIcon,
  Settings01Icon,
  RefreshIcon
} from '@hugeicons/core-free-icons';

interface TreinadorDigitacaoProps {
  session: any;
}

interface Licao {
  id: number;
  titulo: string;
  descricao: string;
  teclas: string[];
  textos: string[];
  cor: string;
  nivel: 1 | 2 | 3;
  dica?: string;
}

interface SessaoResultado {
  wpm: number;
  acuracia: number;
  duracao: number;
  erros: number;
  totalChars: number;
  grade: 'S+' | 'S' | 'A' | 'B' | 'C';
}

interface ProgressoLicao {
  licao_id: number;
  melhor_wpm: number;
  melhor_acuracia: number;
  concluida: boolean;
}

// ——— Níveis de Aprendizado ———
const NIVEIS = [
  {
    id: 1 as const,
    titulo: 'Iniciante',
    subtitulo: 'Linha Central (Home Row)',
    descricao: 'Domine a linha central do teclado (A S D F / J K L Ç) — a base fundamental de toda a datilografia.',
    emoji: '🟢',
    cor: 'emerald',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    badge: 'bg-emerald-500',
    temGuiaPostura: true,
  },
  {
    id: 2 as const,
    titulo: 'Intermediário',
    subtitulo: 'Linhas Superior e Inferior',
    descricao: 'Expanda o alcance para as fileiras QWERTY e ZXCVB, formando palavras e vocabulário real.',
    emoji: '🟡',
    cor: 'amber',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    text: 'text-amber-600 dark:text-amber-400',
    badge: 'bg-amber-500',
    temGuiaPostura: false,
  },
  {
    id: 3 as const,
    titulo: 'Avançado',
    subtitulo: 'Fluidez, Frases & TI',
    descricao: 'Pratique textos do cotidiano digital, termos de informática, pontuação e alta velocidade.',
    emoji: '🔵',
    cor: 'blue',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-600 dark:text-blue-400',
    badge: 'bg-primary',
    temGuiaPostura: false,
  },
];

// ——— Currículo Completo — 17 Lições Gradativas ———
const LICOES: Licao[] = [
  // ═══════════ NÍVEL 1 — INICIANTE (HOME ROW) ═══════════
  {
    id: 1, nivel: 1, titulo: 'Home Row Esquerda', cor: 'blue',
    descricao: 'Posição inicial da mão esquerda: A S D F. Use a saliência tátil da tecla F como ponto de partida!',
    teclas: ['a', 's', 'd', 'f'],
    dica: 'Sinta a marquinha em relevo na tecla F com o indicador esquerdo. Ele é seu guia permanente!',
    textos: [
      'aaa sss ddd fff aaa sss ddd fff fff ddd sss aaa asd fds daf fad asdf fdsa sadf dafa asd fds daf fad asdf fdsa sad dad fad add dada fada safa dasa asdf fdsa sadf dafa sad fad add dad fads adds dada sass fads adds sass fad sad dad add asdf fdsa dafa sadf fdsa',
      'as as as as fd fd fd fd sf sf sf sf da da da da df df df df asdf asdf asdf fdsa fdsa fdsa sadf sadf dafa dafa adds adds sass sass fads fads dada dada fada fada sadf sadf asdf asdf fdsa fdsa sad dad fad add dads adds fads sass dada fada safa asdf fdsa',
      'asd fds sda fda asd fds sda fda daf fad fad daf daf fad asdf fdsa sadf dafa asdf fdsa sadf dafa dada sass fads adds dad sad fad add dad sad fad add fads dads sass adds asdf fdsa sadf dafa asd fds sda fda daf fad sad dad add fads dada fada safa asdf',
      'sad fad dad fads dada adds sass asd asdf sadf dafa fdsa fads dads sass adds fad dad sad aaa sss ddd fff sad fad dad fads dada adds sass asd asdf sadf dafa fdsa fads dads sass adds fad dad sad aaa sss ddd fff asd fds daf fad asdf fdsa sadf dafa sad',
      'asdf fdsa sadf dafa fada dada fads adds sass fad sad dad add asdf fdsa dafa fada sadf fdsa asdf sad fad asdf fdsa sadf dafa fada dada fads adds sass fad sad dad add asdf fdsa dafa fada sadf fdsa dada fada safa dasa asdf fdsa sadf asd fds sad dad add',
    ]
  },
  {
    id: 2, nivel: 1, titulo: 'Home Row Direita', cor: 'green',
    descricao: 'Posição inicial da mão direita: J K L Ç. O relevo na tecla J orienta seu indicador!',
    teclas: ['j', 'k', 'l', 'ç'],
    dica: 'Sinta o relevo na tecla J com o indicador direito. Retorne os dedos sempre para J K L Ç.',
    textos: [
      'jjj kkk lll ççç jjj kkk lll ççç ççç lll kkk jjj jkl jlç kçl çlk jklç çlkj kjlç lçkj jkl jlç kçl çlk jklç çlkj kjlç lçkj jkç klç lkj çkl jkl klç lkj çkl jlç kçl çlk jklç çlkj kjlç lçkj jklç çlkj jjj kkk lll ççç jkl klç lkj çkl jklç çlkj kjlç',
      'jk jk jk jl jl jl jç jç jç kl kl kl lç lç lç jklç jklç jklç çlkj çlkj çlkj kjlç kjlç lçkj lçkj jkl klç lkj çkl jlç kçl çlk lkj jklç çlkj kjlç lçkj jkl klç lkj çkl jlç kçl jklç çlkj kjlç lçkj jjj kkk lll ççç jklç çlkj',
      'jkl kçl ljk çjl jklç lçkj kjlç çlkj jkl kçl ljk çjl jklç lçkj kjlç çlkj jkl kçl ljç çjk kçl jklç lçkj kjlç jkl kçl ljk çjl jklç lçkj kjlç çlkj jkl kçl ljç çjk kçl jklç lçkj kjlç jkl kçl ljk çjl jklç lçkj çlkj',
      'lkj çkl jkl ljç çjk kçl jklç çlkj kjlç lkjç çjkl jklç lçkj kjlç lkj çkl jkl ljç çjk kçl jklç çlkj kjlç lkjç çjkl jklç lçkj kjlç lkj çkl jkl ljç çjk kçl jklç çlkj kjlç jjj kkk lll ççç jklç',
      'jklç çlkj kjlç lçkj jkl kçl ljk çjl lkj çkl jkl ljç çjk kçl jklç jjj kkk lll ççç jklç çlkj kjlç lçkj jkl kçl ljk çjl lkj çkl jkl ljç çjk kçl jklç jjj kkk lll ççç jklç çlkj kjlç lçkj jkl kçl ljk çjl lkj çkl',
    ]
  },
  {
    id: 3, nivel: 1, titulo: 'Home Row Completa', cor: 'purple',
    descricao: 'Combine ambas as mãos na linha central. Mantenha os pulsos retos e sem apoiar na mesa.',
    teclas: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ç'],
    dica: 'Cada dedo tem sua tecla de repouso. Após pressionar, retorne instantaneamente à base.',
    textos: [
      'asdf jklç asdf jklç fdsa çlkj fdsa çlkj asdf jklç fdsa çlkj asdf jklç fdsa çlkj ask all fall skill flask sal ask all fall skill flask sal alfa sala flask lakal fall skill flask sala alfa dada fads adds asdf jklç fdsa çlkj ask all fall skill flask',
      'ask all fall skill flask sal alfa sala flask lakal asdf jklç fall skill flask sala alfa dada fads adds ask all fall skill flask sal alfa sala flask lakal asdf jklç fall skill flask sala alfa dada fads adds jacks lacks dada salad slack lads falls',
      'alfa sala flask lakal asdf jklç fall skill flask sala alfa dads adds fads jacks lacks dada salad slack alfa sala flask lakal asdf jklç fall skill flask sala alfa dads adds fads jacks lacks dada salad slack asdf jklç fdsa çlkj ask all fall skill',
      'fall skill flask sala alfa asdf jklç flask salad slack lads falls alfa sala dads adds fads jacks lacks fall skill flask sala alfa asdf jklç flask salad slack lads falls alfa sala dads adds fads jacks lacks asdf jklç fdsa çlkj ask all fall skill flask',
      'flask salad slack lads falls alfa sala dads adds fads asdf jklç fall skill alfa jacks lacks dada lads flask salad slack lads falls alfa sala dads adds fads asdf jklç fall skill alfa jacks lacks dada lads asks falls sala flask salad slack alfa dada',
    ]
  },

  // ═══════════ NÍVEL 2 — INTERMEDIÁRIO (EXPANSÃO) ═══════════
  {
    id: 4, nivel: 2, titulo: 'Linha Superior Esquerda', cor: 'orange',
    descricao: 'Teclas Q W E R T — os dedos sobem a partir da linha central e retornam.',
    teclas: ['q', 'w', 'e', 'r', 't'],
    dica: 'Mova apenas o dedo necessário para cima; mantenha os demais relaxados na base.',
    textos: [
      'qqq www eee rrr ttt qwert qwert qwert trew rewt wret sweet street tweet water refer reel steel feel deer qqq www eee rrr ttt qwert qwert trew rewt wret sweet street tweet water refer reel steel feel deer steer sewer fewer ewer refer tree were free',
      'were tree free quer rete sweet street tweet water refer ewer sewer fewer deer feel reel steel steer sweet were tree free quer rete sweet street tweet water refer ewer sewer fewer deer feel reel steel steer sweet tweet street water refer reel steel',
      'quer tere reter sweet street tweet tree were free sewer fewer refer ewer steel feel reel deer steer tweet quer tere reter sweet street tweet tree were free sewer fewer refer ewer steel feel reel deer steer tweet street water sweet refer reel steel',
      'tweet tree free reter quer trete week sweet street water refer ewer deer feel reel steel sewer steer free tweet tree free reter quer trete week sweet street water refer ewer deer feel reel steel sewer steer free tree were ewer fewer refer sweet',
      'rew stew tree water street sweet reel steel sewer fewer refer were tree free quer trete tweet street deed rew stew tree water street sweet reel steel sewer fewer refer were tree free quer trete tweet street deer steer ewer fewer sweet refer reel',
    ]
  },
  {
    id: 5, nivel: 2, titulo: 'Palavras da Linha Central', cor: 'teal',
    descricao: 'Forme palavras reais do português usando apenas as teclas dominadas até agora.',
    teclas: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ç'],
    dica: 'Mantenha um ritmo constante: precisão primeiro, a velocidade vem naturalmente.',
    textos: [
      'asa dada fala sala caça faca salada casca falsa daga alfa fala asa dada sala caça faca salada casca falsa asa dada fala sala caça faca salada casca falsa daga alfa fala asa dada sala caça faca salada casca falsa dada alfa sala asa fala daga casca',
      'salada casca falsa daga alfa fala asa dada sala caça faca falsa dada alfa sala casca salada asa fala daga salada casca falsa daga alfa fala asa dada sala caça faca falsa dada alfa sala casca salada asa fala dada caça faca alfa sala asa fala casca',
      'flask salad slack lads falls alfa sala dada fala caça faca salada casca falsa daga alfa asa dad fala sala flask salad slack lads falls alfa sala dada fala caça faca salada casca falsa daga alfa asa dad fala sala dada caça faca casca salada falsa',
      'dada fada safa dasa caça faca fala sala salada casca falsa alfa daga dada fada safa dasa caça faca fala sala salada casca falsa alfa daga dada fada safa dasa caça faca fala sala salada casca falsa alfa daga dada fada safa dasa caça faca fala sala',
      'caça faca fala sala salada casca falsa alfa daga dada fada safa dasa caça faca fala sala salada casca falsa alfa daga caça faca fala sala salada casca falsa alfa daga dada fada safa dasa caça faca fala sala salada casca falsa alfa daga dada fada',
    ]
  },
  {
    id: 6, nivel: 2, titulo: 'Linha Superior Direita', cor: 'cyan',
    descricao: 'Teclas Y U I O P — extensão superior com a mão direita.',
    teclas: ['y', 'u', 'i', 'o', 'p'],
    dica: 'O dedo mindinho direito alcança a tecla P com suavidade.',
    textos: [
      'yyy uuu iii ooo ppp yuiop yuiop poiuy poiuy you our out pour pour pour trip pipe polo pulp popup pop yyy uuu iii ooo ppp yuiop yuiop poiuy poiuy you our out pour pour pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority',
      'you our out pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority you our out pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority your out pour trip pipe polo pulp popup pop prior pilot tulip',
      'utility parity priority tulip output pilot prior pop popup pulp polo pipe trip pour out our you utility parity priority tulip output pilot prior pop popup pulp polo pipe trip pour out our you your out pour trip pipe polo pulp popup pop prior pilot tulip',
      'prior pilot tulip output utility parity priority you our out pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority you our out pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority you our out',
      'polo pulp popup pop prior pilot tulip output utility parity priority you our out pour trip pipe polo pulp popup pop prior pilot tulip output utility parity priority you our out pour trip pipe your out pour trip pipe polo pulp popup pop prior pilot tulip',
    ]
  },
  {
    id: 7, nivel: 2, titulo: 'Linhas Central e Superior', cor: 'indigo',
    descricao: 'Integração completa das duas primeiras fileiras do teclado.',
    teclas: ['a','s','d','f','g','h','j','k','l','ç','q','w','e','r','t','y','u','i','o','p'],
    dica: 'Alterne entre as mãos com equilíbrio e respire entre as palavras.',
    textos: [
      'para toda parte pelo que se sabe tudo pode ser feito com qualidade e foco sempre que voce treinar para toda parte pelo que se sabe tudo pode ser feito com qualidade e foco sempre que voce treinar para toda parte pelo que se sabe tudo pode ser feito',
      'qualquer projeto requer esforco estudo e dedicacao para alcancar resultados reais e duradouros qualquer projeto requer esforco estudo e dedicacao para alcancar resultados reais e duradouros qualquer projeto requer esforco estudo e dedicacao para alcancar',
      'o teclado e a ferramenta de trabalho mais utilizada no mundo digital aprenda a usar com destreza o teclado e a ferramenta de trabalho mais utilizada no mundo digital aprenda a usar com destreza o teclado e a ferramenta de trabalho mais utilizada no mundo digital',
      'praticar todos os dias melhora a velocidade a precisao e a confianca ao escrever qualquer texto praticar todos os dias melhora a velocidade a precisao e a confianca ao escrever qualquer texto praticar todos os dias melhora a velocidade a precisao e a confianca',
      'escreva com calma sem olhar para as teclas confie na memoria dos seus dedos e na sua mente escreva com calma sem olhar para as teclas confie na memoria dos seus dedos e na sua mente escreva com calma sem olhar para as teclas confie na memoria dos seus dedos',
    ]
  },
  {
    id: 8, nivel: 2, titulo: 'Linha Inferior Esquerda', cor: 'rose',
    descricao: 'Teclas Z X C V B — o movimento descendente da mão esquerda.',
    teclas: ['z', 'x', 'c', 'v', 'b'],
    dica: 'Dobre levemente o dedo para baixo sem mover o pulso inteiro.',
    textos: [
      'zzz xxx ccc vvv bbb zxcvb zxcvb bvcxz bvcxz zebra caixa vaso barco cabo zero voz vez cruz zzz xxx ccc vvv bbb zxcvb zxcvb bvcxz bvcxz zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base bravo bloco breve busca base',
      'zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo',
      'bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca',
      'zero voz vez cruz zebra caixa vaso barco cabo bravo bloco breve busca base zero voz vez cruz zebra caixa vaso barco cabo bravo bloco breve busca base zero voz vez cruz zebra caixa vaso barco cabo bravo bloco breve busca base zero voz vez cruz zebra',
      'cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz bravo bloco breve busca base zebra caixa vaso barco cabo zero voz vez cruz',
    ]
  },
  {
    id: 9, nivel: 2, titulo: 'Linha Inferior Direita', cor: 'amber',
    descricao: 'Teclas N M e pontuação (. , ;) — mão direita em movimento inferior.',
    teclas: ['n', 'm', ',', '.', ';'],
    dica: 'Use o indicador para N e M, médio para vírgula e anelar para o ponto.',
    textos: [
      'nnn mmm nmnm mnm mano mapa mina modo muro nome nuvem mano mapa mina modo muro nome nuvem mano mapa mina modo muro nome nuvem mano mapa mina modo muro nome nuvem mano mapa mina modo muro nome nuvem mano mapa mina modo muro nome nuvem',
      'ponto final, virgula, ponto e virgula; texto com pontuacao. ponto final, virgula, ponto e virgula; texto com pontuacao. ponto final, virgula, ponto e virgula; texto com pontuacao. ponto final, virgula, ponto e virgula; texto com pontuacao.',
      'um, dois, tres. quatro, cinco, seis; sete, oito, nove. dez. um, dois, tres. quatro, cinco, seis; sete, oito, nove. dez. um, dois, tres. quatro, cinco, seis; sete, oito, nove. dez. um, dois, tres. quatro, cinco, seis; sete, oito, nove. dez.',
      'menu, nome, nota, novo, num; mano, mapa, meta, mina, modo, muro. menu, nome, nota, novo, num; mano, mapa, meta, mina, modo, muro. menu, nome, nota, novo, num; mano, mapa, meta, mina, modo, muro. menu, nome, nota, novo, num; mano, mapa, meta, mina.',
      'aprender, praticar, evoluir; digitar com calma, rapidez e precisao. aprender, praticar, evoluir; digitar com calma, rapidez e precisao. aprender, praticar, evoluir; digitar com calma, rapidez e precisao. aprender, praticar, evoluir; digitar com calma.',
    ]
  },
  {
    id: 10, nivel: 2, titulo: 'Teclado Alfanumérico Completo', cor: 'emerald',
    descricao: 'Todas as letras integradas em frases estruturadas.',
    teclas: ['todas as letras'],
    dica: 'Você já desbloqueou todas as letras do teclado! Foque na continuidade.',
    textos: [
      'o computador e uma maquina incrivel que nos ajuda a aprender trabalhar e nos comunicar com o mundo inteiro todos os dias de forma rapida',
      'a internet conecta pessoas lugares ideias e conhecimentos de todas as partes do planeta em segundos com muita facilidade e praticidade',
      'estudar tecnologia abre muitas portas para o mercado de trabalho e permite criar solucoes que transformam a vida das pessoas para melhor',
      'com dedicacao e treino constante qualquer pessoa pode se tornar muito produtiva e confianca ao usar o teclado no seu dia a dia profissional',
      'escrever bem e com rapidez e uma habilidade que vai acompanhar voce por toda a vida nos estudos no trabalho e nos projetos pessoais',
    ]
  },

  // ═══════════ NÍVEL 3 — AVANÇADO (AGILIDADE E TÉCNICA) ═══════════
  {
    id: 11, nivel: 3, titulo: 'Vocabulário de TI & Informática', cor: 'blue',
    descricao: 'Termos técnicos essenciais do ecossistema de software e tecnologia.',
    teclas: ['todas'],
    dica: 'Palavras em inglês e termos técnicos exigem padrões motores variados.',
    textos: [
      'hardware software sistema arquivo pasta navegador internet rede dados nuvem programa codigo teclado monitor mouse processador memoria',
      'backup upload download link site pagina usuario senha seguranca configuracao atualizacao instalar remover reiniciar conectar desconectar',
      'desktop laptop servidor roteador conexao bluetooth wireless ethernet impressora scanner webcam microfone fone cabo adaptador dispositivo',
      'algoritmo variavel funcao banco de dados servidor cliente api nuvem deploy frontend backend fullstack design interface usuario experiencia',
      'computador letramento digital inclusao tecnologia informatica senac aprendizagem produtividade automacao desenvolvimento programacao',
    ]
  },
  {
    id: 12, nivel: 3, titulo: 'Frases do Dia a Dia Profissional', cor: 'purple',
    descricao: 'Redação de e-mails corporativos, mensagens e comunicações formais.',
    teclas: ['todas'],
    dica: 'Treine a cadência rítmica sem interrupções bruscas.',
    textos: [
      'bom dia, segue em anexo o relatorio com os dados solicitados na reuniao de ontem para sua revisao e aprovacao final.',
      'agradeco a atencao e fico a disposicao para esclarecer quaisquer duvidas sobre o andamento do projeto neste periodo.',
      'favor confirmar o recebimento desta mensagem e o agendamento da nossa proxima conversa para alinhamento da equipe.',
      'solicitamos que todos os membros da turma entreguem as atividades pendentes ate o final da semana no horario combinado.',
      'parabens pelo excelente trabalho e dedicacao demonstrados ao longo de todo o modulo do curso com resultados muito positivos.',
    ]
  },
  {
    id: 13, nivel: 3, titulo: 'Comandos & Atalhos de Teclado', cor: 'orange',
    descricao: 'Textos com termos e sequências de atalhos comuns em editores e navegadores.',
    teclas: ['todas'],
    dica: 'Fixe mentalmente os atalhos de produtividade que você usará todo dia.',
    textos: [
      'ctrl c copia o texto selecionado e ctrl v cola no local desejado com muita agilidade no documento ou aplicativo',
      'ctrl z desfaz a ultima acao realizada e ctrl y refaz a acao que foi desfeita de maneira simples e rapida no sistema',
      'ctrl s salva o arquivo atual e ctrl p abre a janela de impressao para imprimir ou salvar como documento em formato pdf',
      'alt tab alterna entre as janelas abertas e ctrl w fecha a aba ativa do navegador sem precisar clicar com o mouse',
      'ctrl f abre a ferramenta de busca para encontrar palavras no texto e ctrl a seleciona todo o conteudo da pagina atual',
    ]
  },
  {
    id: 14, nivel: 3, titulo: 'Números e Símbolos Básicos', cor: 'amber',
    descricao: 'Fileira numérica superior (1 ao 0) e pontuações complementares.',
    teclas: ['0','1','2','3','4','5','6','7','8','9'],
    dica: 'Estique os dedos verticalmente para os números sem levantar a mão toda.',
    textos: [
      '1 2 3 4 5 6 7 8 9 0 10 20 30 40 50 60 70 80 90 100 ano 2026 versao 2.0 sala 104 turma 3 nota 10 aluno 45 codigo 7890 data 25 08 2026',
      'o curso tem 120 horas distribuidas em 24 semanas com aulas de 4 horas por dia de segunda a sexta feira na sala 205 do bloco 3',
      'matricula 2026001 turma ti 26 telefone 79 98765 4321 cep 49000 000 cpf 123 456 789 00 rg 1234567 data de nascimento 15 03 2005',
      'em 2026 mais de 80 por cento dos empregos exigem letramento digital basico e dominio do teclado com pelo menos 40 palavras por minuto',
      'exercicio 1 pagina 45 questao 3 valor 10 pontos media 7.0 aprovados 28 reprovados 0 total de participantes na turma 28 alunos',
    ]
  },
  {
    id: 15, nivel: 3, titulo: 'Textos de Filosofia & Conhecimento', cor: 'teal',
    descricao: 'Frases reflexivas e textos ricos para treino de fluidez de longo prazo.',
    teclas: ['todas'],
    dica: 'Deixe os olhos sempre 2 ou 3 palavras à frente do que você está digitando.',
    textos: [
      'o conhecimento e a unica riqueza que cresce quando e compartilhada com outras pessoas ao nosso redor e transforma toda a sociedade',
      'a persistencia e o caminho do exito e cada linha digitada com atencao aproxima voce da maestria no uso do teclado e da tecnologia',
      'aprender nao e apenas acumular informacoes mas transformar o modo como pensamos agimos e nos relacionamos com o mundo que nos cerca',
      'a educacao e a arma mais poderosa que voce pode usar para mudar a sua vida a sua comunidade e o futuro de todo o nosso pais',
      'o futuro pertence aqueles que acreditam na beleza dos seus sonhos e trabalham com disciplina todos os dias para torna los realidade',
    ]
  },
  {
    id: 16, nivel: 3, titulo: 'Desafio Senac de Agilidade', cor: 'cyan',
    descricao: 'Frases rápidas com ritmos dinâmicos para atingir metas de WPM elevadas.',
    teclas: ['todas'],
    dica: 'Mantenha as mãos relaxadas. Tensão muscular reduz a velocidade máxima.',
    textos: [
      'o senac e referencia nacional em formacao profissional de qualidade preparando pessoas para o mundo do trabalho com excelencia e inovacao',
      'a tecnologia e a educacao caminham juntas para construir um futuro melhor mais justo mais produtivo e com muitas oportunidades para todos',
      'digitar com rapidez precisao e ergonomia e um diferencial competitivo valioso em qualquer profissao do seculo vinte e um',
      'parabens pelo seu empenho e dedicacao nesta jornada de aprendizado do teclado continue praticando sempre para manter sua habilidade afiada',
      'cada modulo concluido e uma vitoria que comprova sua capacidade de aprender evoluir e alcancar voos cada vez mais altos na sua carreira',
    ]
  },
  {
    id: 17, nivel: 3, titulo: 'Desafio Final — Modo Mestre', cor: 'emerald',
    descricao: 'O teste definitivo de velocidade e precisão para consagrar seu domínio datilográfico.',
    teclas: ['todas'],
    dica: 'Respire fundo, relaxe os ombros e confie plenamente na memória muscular dos seus dedos!',
    textos: [
      'o letramento digital e essencial no mundo moderno onde a tecnologia esta presente em todos os aspectos da vida cotidiana e profissional',
      'aprender a digitar com todos os dedos aumenta sua produtividade e reduz o cansaco nas maos ao longo do dia de trabalho no computador',
      'a informatica basica inclui conhecer o teclado o mouse os arquivos e a navegacao segura e eficiente na internet do dia a dia',
      'com pratica diaria voce consegue aumentar sua velocidade de digitacao e cometer cada vez menos erros ao escrever textos e mensagens',
      'salvar copiar colar criar arquivos e pastas sao habilidades fundamentais para qualquer pessoa que usa computador no trabalho ou estudo',
    ]
  },
];

// ——— Mapeamento de Cores e Dedos ———
type FingerType = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

interface FingerInfo {
  hand: 'left' | 'right';
  finger: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky';
  fingerCode: FingerType;
  label: string;
  colorName: string;
  hex: string;
}

const FINGER_PALETTE: Record<FingerType, { bg: string; border: string; text: string; ring: string; glow: string; hex: string; name: string }> = {
  L5: { bg: 'bg-rose-500/15 dark:bg-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500', glow: 'shadow-rose-500/40', hex: '#f43f5e', name: 'Mindinho Esquerdo' },
  L4: { bg: 'bg-orange-500/15 dark:bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500', glow: 'shadow-orange-500/40', hex: '#f97316', name: 'Anelar Esquerdo' },
  L3: { bg: 'bg-amber-500/15 dark:bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500', glow: 'shadow-amber-500/40', hex: '#eab308', name: 'Médio Esquerdo' },
  L2: { bg: 'bg-sky-500/15 dark:bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500', glow: 'shadow-sky-500/40', hex: '#0284c7', name: 'Indicador Esquerdo' },
  L1: { bg: 'bg-emerald-500/15 dark:bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500', glow: 'shadow-emerald-500/40', hex: '#10b981', name: 'Polegar' },
  R1: { bg: 'bg-emerald-500/15 dark:bg-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-600 dark:text-emerald-400', ring: 'ring-emerald-500', glow: 'shadow-emerald-500/40', hex: '#10b981', name: 'Polegar' },
  R2: { bg: 'bg-sky-500/15 dark:bg-sky-500/10', border: 'border-sky-500/40', text: 'text-sky-600 dark:text-sky-400', ring: 'ring-sky-500', glow: 'shadow-sky-500/40', hex: '#0284c7', name: 'Indicador Direito' },
  R3: { bg: 'bg-amber-500/15 dark:bg-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-600 dark:text-amber-400', ring: 'ring-amber-500', glow: 'shadow-amber-500/40', hex: '#eab308', name: 'Médio Direito' },
  R4: { bg: 'bg-orange-500/15 dark:bg-orange-500/10', border: 'border-orange-500/40', text: 'text-orange-600 dark:text-orange-400', ring: 'ring-orange-500', glow: 'shadow-orange-500/40', hex: '#f97316', name: 'Anelar Direito' },
  R5: { bg: 'bg-rose-500/15 dark:bg-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-600 dark:text-rose-400', ring: 'ring-rose-500', glow: 'shadow-rose-500/40', hex: '#f43f5e', name: 'Mindinho Direito' }
};

const getFingerForKey = (key: string): FingerInfo => {
  const k = key.toLowerCase();
  
  if (k === ' ' || k === 'space') {
    return { hand: 'right', finger: 'thumb', fingerCode: 'R1', label: 'Polegar Direito', colorName: 'emerald', hex: '#10b981' };
  }
  
  const leftPinky = ["'", '"', '1', '!', 'q', 'a', 'z', '\\', '|', 'tab', 'capslock', 'shift_l', 'ctrl_l', 'win_l', 'alt_l', '`', '~'];
  const leftRing = ['2', '@', 'w', 's', 'x'];
  const leftMiddle = ['3', '#', 'e', 'd', 'c'];
  const leftIndex = ['4', '$', 'r', 'f', 'v', '5', '%', 't', 'g', 'b'];
  
  const rightIndex = ['6', '¨', 'y', 'h', 'n', '7', '&', 'u', 'j', 'm'];
  const rightMiddle = ['8', '*', 'i', 'k', ',', '<'];
  const rightRing = ['9', '(', 'o', 'l', '.', '>'];
  const rightPinky = ['0', ')', 'p', 'ç', ';', ':', '/', '?', '-', '_', '=', '+', '[', '{', ']', '}', '´', '`', '~', '^', 'enter', 'backspace', 'delete', 'altgr', 'shift_r', 'ctrl_r', 'win_r'];
  
  if (leftPinky.includes(k)) return { hand: 'left', finger: 'pinky', fingerCode: 'L5', label: 'Mindinho Esquerdo', colorName: 'rose', hex: '#f43f5e' };
  if (leftRing.includes(k)) return { hand: 'left', finger: 'ring', fingerCode: 'L4', label: 'Anelar Esquerdo', colorName: 'orange', hex: '#f97316' };
  if (leftMiddle.includes(k)) return { hand: 'left', finger: 'middle', fingerCode: 'L3', label: 'Médio Esquerdo', colorName: 'amber', hex: '#eab308' };
  if (leftIndex.includes(k)) return { hand: 'left', finger: 'index', fingerCode: 'L2', label: 'Indicador Esquerdo', colorName: 'sky', hex: '#0284c7' };
  
  if (rightIndex.includes(k)) return { hand: 'right', finger: 'index', fingerCode: 'R2', label: 'Indicador Direito', colorName: 'sky', hex: '#0284c7' };
  if (rightMiddle.includes(k)) return { hand: 'right', finger: 'middle', fingerCode: 'R3', label: 'Médio Direito', colorName: 'amber', hex: '#eab308' };
  if (rightRing.includes(k)) return { hand: 'right', finger: 'ring', fingerCode: 'R4', label: 'Anelar Direito', colorName: 'orange', hex: '#f97316' };
  if (rightPinky.includes(k)) return { hand: 'right', finger: 'pinky', fingerCode: 'R5', label: 'Mindinho Direito', colorName: 'rose', hex: '#f43f5e' };
  
  return { hand: 'right', finger: 'index', fingerCode: 'R2', label: 'Indicador Direito', colorName: 'sky', hex: '#0284c7' };
};

interface KeyConfig {
  key: string;
  display: string;
  shiftDisplay?: string;
  finger: FingerType;
  width: string;
}

const getKeyboardLayout = (layout: 'abnt2' | 'us'): KeyConfig[][] => {
  if (layout === 'abnt2') {
    return [
      [
        { key: "'", display: "'", shiftDisplay: '"', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '1', display: '1', shiftDisplay: '!', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '2', display: '2', shiftDisplay: '@', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '3', display: '3', shiftDisplay: '#', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '4', display: '4', shiftDisplay: '$', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '5', display: '5', shiftDisplay: '%', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '6', display: '6', shiftDisplay: '¨', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '7', display: '7', shiftDisplay: '&', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '8', display: '8', shiftDisplay: '*', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '9', display: '9', shiftDisplay: '(', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '0', display: '0', shiftDisplay: ')', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '-', display: '-', shiftDisplay: '_', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '=', display: '=', shiftDisplay: '+', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'backspace', display: '⌫ Apagar', finger: 'R5', width: 'flex-[1.8] min-w-[65px] text-[11px]' }
      ],
      [
        { key: 'tab', display: 'Tab ⇥', finger: 'L5', width: 'flex-[1.5] min-w-[55px] text-xs' },
        { key: 'q', display: 'Q', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'w', display: 'W', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'e', display: 'E', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'r', display: 'R', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 't', display: 'T', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'y', display: 'Y', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'u', display: 'U', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'i', display: 'I', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'o', display: 'O', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'p', display: 'P', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '´', display: '´', shiftDisplay: '`', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '[', display: '[', shiftDisplay: '{', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'enter', display: 'Enter ↵', finger: 'R5', width: 'flex-[1.4] min-w-[55px] text-xs' }
      ],
      [
        { key: 'capslock', display: 'Caps ⇪', finger: 'L5', width: 'flex-[1.7] min-w-[60px] text-xs' },
        { key: 'a', display: 'A', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 's', display: 'S', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'd', display: 'D', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'f', display: 'F', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'g', display: 'G', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'h', display: 'H', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'j', display: 'J', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'k', display: 'K', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'l', display: 'L', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'ç', display: 'Ç', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '~', display: '~', shiftDisplay: '^', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ']', display: ']', shiftDisplay: '}', finger: 'R5', width: 'flex-[1.2] min-w-[45px]' }
      ],
      [
        { key: 'shift_l', display: 'Shift ⇧', finger: 'L5', width: 'flex-[1.4] min-w-[50px] text-xs' },
        { key: '\\', display: '\\', shiftDisplay: '|', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'z', display: 'Z', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'x', display: 'X', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'c', display: 'C', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'v', display: 'V', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'b', display: 'B', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'n', display: 'N', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'm', display: 'M', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ',', display: ',', shiftDisplay: '<', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '.', display: '.', shiftDisplay: '>', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ';', display: ';', shiftDisplay: ':', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '/', display: '/', shiftDisplay: '?', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'shift_r', display: 'Shift ⇧', finger: 'R5', width: 'flex-[1.6] min-w-[60px] text-xs' }
      ],
      [
        { key: 'ctrl_l', display: 'Ctrl', finger: 'L5', width: 'flex-[1.2] min-w-[45px] text-xs' },
        { key: 'win_l', display: 'Win', finger: 'L5', width: 'flex-[1] min-w-[36px] text-[10px]' },
        { key: 'alt_l', display: 'Alt', finger: 'L5', width: 'flex-[1.2] min-w-[45px] text-xs' },
        { key: ' ', display: 'Espaço', finger: 'L1', width: 'flex-[6] min-w-[180px] sm:min-w-[260px] text-xs' },
        { key: 'altgr', display: 'Alt Gr', finger: 'R1', width: 'flex-[1.2] min-w-[45px] text-xs' },
        { key: 'win_r', display: 'Win', finger: 'R5', width: 'flex-[1] min-w-[36px] text-[10px]' },
        { key: 'ctrl_r', display: 'Ctrl', finger: 'R5', width: 'flex-[1.2] min-w-[45px] text-xs' }
      ]
    ];
  } else {
    return [
      [
        { key: '`', display: '`', shiftDisplay: '~', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '1', display: '1', shiftDisplay: '!', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '2', display: '2', shiftDisplay: '@', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '3', display: '3', shiftDisplay: '#', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '4', display: '4', shiftDisplay: '$', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '5', display: '5', shiftDisplay: '%', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '6', display: '6', shiftDisplay: '^', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '7', display: '7', shiftDisplay: '&', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '8', display: '8', shiftDisplay: '*', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '9', display: '9', shiftDisplay: '(', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '0', display: '0', shiftDisplay: ')', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '-', display: '-', shiftDisplay: '_', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '=', display: '=', shiftDisplay: '+', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'backspace', display: '⌫ Delete', finger: 'R5', width: 'flex-[1.8] min-w-[65px] text-[11px]' }
      ],
      [
        { key: 'tab', display: 'Tab ⇥', finger: 'L5', width: 'flex-[1.5] min-w-[55px] text-xs' },
        { key: 'q', display: 'Q', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'w', display: 'W', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'e', display: 'E', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'r', display: 'R', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 't', display: 'T', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'y', display: 'Y', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'u', display: 'U', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'i', display: 'I', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'o', display: 'O', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'p', display: 'P', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '[', display: '[', shiftDisplay: '{', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ']', display: ']', shiftDisplay: '}', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '\\', display: '\\', shiftDisplay: '|', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' }
      ],
      [
        { key: 'capslock', display: 'Caps ⇪', finger: 'L5', width: 'flex-[1.7] min-w-[60px] text-xs' },
        { key: 'a', display: 'A', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 's', display: 'S', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'd', display: 'D', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'f', display: 'F', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'g', display: 'G', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'h', display: 'H', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'j', display: 'J', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'k', display: 'K', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'l', display: 'L', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ';', display: ';', shiftDisplay: ':', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: "'", display: "'", shiftDisplay: '"', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'enter', display: 'Enter ↵', finger: 'R5', width: 'flex-[1.7] min-w-[60px] text-xs' }
      ],
      [
        { key: 'shift_l', display: 'Shift ⇧', finger: 'L5', width: 'flex-[2.1] min-w-[70px] text-xs' },
        { key: 'z', display: 'Z', finger: 'L5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'x', display: 'X', finger: 'L4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'c', display: 'C', finger: 'L3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'v', display: 'V', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'b', display: 'B', finger: 'L2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'n', display: 'N', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'm', display: 'M', finger: 'R2', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: ',', display: ',', shiftDisplay: '<', finger: 'R3', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '.', display: '.', shiftDisplay: '>', finger: 'R4', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: '/', display: '/', shiftDisplay: '?', finger: 'R5', width: 'flex-[1] min-w-[32px] sm:min-w-[42px]' },
        { key: 'shift_r', display: 'Shift ⇧', finger: 'R5', width: 'flex-[2.1] min-w-[70px] text-xs' }
      ],
      [
        { key: 'ctrl_l', display: 'Ctrl', finger: 'L5', width: 'flex-[1.3] min-w-[45px] text-xs' },
        { key: 'win_l', display: 'Cmd', finger: 'L5', width: 'flex-[1.1] min-w-[38px] text-[10px]' },
        { key: 'alt_l', display: 'Alt', finger: 'L5', width: 'flex-[1.2] min-w-[45px] text-xs' },
        { key: ' ', display: 'Space', finger: 'L1', width: 'flex-[6] min-w-[180px] sm:min-w-[260px] text-xs' },
        { key: 'alt_r', display: 'Alt', finger: 'R1', width: 'flex-[1.2] min-w-[45px] text-xs' },
        { key: 'win_r', display: 'Cmd', finger: 'R5', width: 'flex-[1.1] min-w-[38px] text-[10px]' },
        { key: 'ctrl_r', display: 'Ctrl', finger: 'R5', width: 'flex-[1.3] min-w-[45px] text-xs' }
      ]
    ];
  }
};

// ——— Síntese de Áudio Mecânico Profissional (Web Audio API) ———
const playSynthesizedSound = (soundType: 'thock' | 'apple' | 'pop' | 'typewriter', isError: boolean = false, volume: number = 0.5) => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime((volume / 100) * 0.4, now);
    masterGain.connect(ctx.destination);

    if (isError) {
      // Soft Error Thud
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.08);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.09);
      return;
    }

    if (soundType === 'thock') {
      // Deep creamy mechanical clack
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(450 + Math.random() * 40, now);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.04);
      gain.gain.setValueAtTime(0.6, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.055);
    } else if (soundType === 'apple') {
      // Crisp Magic Keyboard chiclet click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1800 + Math.random() * 100, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.025);
      gain.gain.setValueAtTime(0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.035);
    } else if (soundType === 'pop') {
      // ASMR playful water bubble pop
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.03);
      gain.gain.setValueAtTime(0.5, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.045);
    } else {
      // Typewriter sharp metal strike
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1200 + Math.random() * 80, now);
      osc.frequency.exponentialRampToValueAtTime(200, now + 0.03);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
      osc.connect(gain);
      gain.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch (e) {
    // Audio contexts can fail gracefully on un-interacted documents
  }
};

// ——— Modelo Ergonômico de Mãos 3D Glassmorphism ———
const ErgonomicHandSvg: React.FC<{
  side: 'left' | 'right';
  activeFinger: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky' | null;
  activeColorHex?: string;
}> = ({ side, activeFinger, activeColorHex = '#0284c7' }) => {
  const isLeft = side === 'left';

  // Finger coordinates for indicators
  const fingerPositions = isLeft
    ? {
        pinky: { cx: 28, cy: 78, angle: -18 },
        ring: { cx: 48, cy: 45, angle: -10 },
        middle: { cx: 72, cy: 30, angle: 0 },
        index: { cx: 98, cy: 42, angle: 12 },
        thumb: { cx: 128, cy: 110, angle: 35 }
      }
    : {
        thumb: { cx: 22, cy: 110, angle: -35 },
        index: { cx: 52, cy: 42, angle: -12 },
        middle: { cx: 78, cy: 30, angle: 0 },
        ring: { cx: 102, cy: 45, angle: 10 },
        pinky: { cx: 122, cy: 78, angle: 18 }
      };

  const renderFingerJoint = (name: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky') => {
    const pos = fingerPositions[name];
    const isActive = activeFinger === name;

    return (
      <g key={name} className="transition-all duration-300">
        {isActive && (
          <>
            {/* Ambient radiant ripple pulse */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r="18"
              fill={activeColorHex}
              fillOpacity="0.25"
              className="animate-ping origin-center"
            />
            {/* Soft luminous aura */}
            <circle
              cx={pos.cx}
              cy={pos.cy}
              r="14"
              fill={activeColorHex}
              fillOpacity="0.4"
              filter="blur(3px)"
            />
            {/* Guide line down towards palm */}
            <line
              x1={pos.cx}
              y1={pos.cy + 6}
              x2={isLeft ? 80 : 70}
              y2={150}
              stroke={activeColorHex}
              strokeWidth="2"
              strokeDasharray="3 3"
              strokeOpacity="0.6"
            />
          </>
        )}
        
        {/* Core fingertip pad */}
        <circle
          cx={pos.cx}
          cy={pos.cy}
          r={isActive ? 8.5 : 5.5}
          fill={isActive ? activeColorHex : 'currentColor'}
          fillOpacity={isActive ? '1' : '0.2'}
          stroke={isActive ? '#ffffff' : 'currentColor'}
          strokeWidth={isActive ? '2.5' : '1.2'}
          strokeOpacity={isActive ? '1' : '0.5'}
          className="transition-all duration-200"
        />

        {/* Fingertip label badge on active */}
        {isActive && (
          <circle
            cx={pos.cx}
            cy={pos.cy}
            r="3"
            fill="#ffffff"
            className="animate-pulse"
          />
        )}
      </g>
    );
  };

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center select-none pointer-events-none">
      <svg
        viewBox="0 0 150 210"
        className="w-full h-full max-h-[190px] drop-shadow-md text-slate-400 dark:text-slate-600 transition-colors duration-300"
      >
        <defs>
          <linearGradient id={`hand-grad-${side}`} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
            <stop offset="60%" stopColor="currentColor" stopOpacity="0.08" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.03" />
          </linearGradient>
          <filter id={`glow-${side}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Ergonomic Hand Contour */}
        {isLeft ? (
          <path
            d="M 85,210 
               C 85,210 102,175 106,145 
               C 108,130 120,132 134,120 
               C 142,112 138,98 126,102 
               C 114,106 104,115 104,102 
               C 104,82 105,48 102,38 
               C 99,28 88,28 88,38 
               C 88,58 87,90 87,90 
               C 87,90 80,58 74,26 
               C 70,16 60,18 62,28 
               C 68,52 74,90 74,90 
               C 74,90 63,65 54,38 
               C 50,28 40,32 43,42 
               C 50,68 58,98 58,98 
               C 58,98 46,82 36,68 
               C 32,60 22,64 24,74 
               C 28,94 40,122 42,140 
               C 44,162 48,188 38,210 
               Z"
            fill={`url(#hand-grad-${side})`}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.6"
          />
        ) : (
          <path
            d="M 65,210 
               C 65,210 48,175 44,145 
               C 42,130 30,132 16,120 
               C 8,112 12,98 24,102 
               C 36,106 46,115 46,102 
               C 46,82 45,48 48,38 
               C 51,28 62,28 62,38 
               C 62,58 63,90 63,90 
               C 63,90 70,58 76,26 
               C 80,16 90,18 88,28 
               C 82,52 76,90 76,90 
               C 76,90 87,65 96,38 
               C 100,28 110,32 107,42 
               C 100,68 92,98 92,98 
               C 92,98 104,82 114,68 
               C 118,60 128,64 126,74 
               C 122,94 110,122 108,140 
               C 106,162 102,188 112,210 
               Z"
            fill={`url(#hand-grad-${side})`}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeOpacity="0.6"
          />
        )}

        {/* Palm life line accent */}
        <path
          d={isLeft ? "M 55,145 Q 75,130 95,140" : "M 95,145 Q 75,130 55,140"}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeOpacity="0.25"
          strokeDasharray="2 3"
        />

        {/* Fingertip interactive joint nodes */}
        {renderFingerJoint('pinky')}
        {renderFingerJoint('ring')}
        {renderFingerJoint('middle')}
        {renderFingerJoint('index')}
        {renderFingerJoint('thumb')}
      </svg>
      
      {/* Hand Label Badge */}
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant/50 mt-1">
        {isLeft ? 'Mão Esquerda' : 'Mão Direita'}
      </span>
    </div>
  );
};

// ——— COMPONENTE PRINCIPAL ———
export const TreinadorDigitacao: React.FC<TreinadorDigitacaoProps> = ({ session }) => {
  const [nivelAtivo, setNivelAtivo] = useState<1 | 2 | 3 | null>(null);
  const [licaoAtiva, setLicaoAtiva] = useState<Licao | null>(null);
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Lesson state
  const [textoIndex, setTextoIndex] = useState(0);
  const [digitado, setDigitado] = useState('');
  const [erros, setErros] = useState<Set<number>>(new Set());
  const [iniciado, setIniciado] = useState(false);
  const [concluido, setConcluido] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [wpmLive, setWpmLive] = useState(0);
  const [resultado, setResultado] = useState<SessaoResultado | null>(null);
  const [progressos, setProgressos] = useState<ProgressoLicao[]>([]);
  const [comboCount, setComboCount] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [pressedPhysicalKeys, setPressedPhysicalKeys] = useState<Set<string>>(new Set());

  // Preferences & Customization
  const [layout, setLayout] = useState<'abnt2' | 'us'>(() => {
    return (localStorage.getItem('estudea_teclado_layout') as 'abnt2' | 'us') || 'abnt2';
  });
  const [fontSize, setFontSize] = useState<'sm' | 'md' | 'lg'>(() => {
    return (localStorage.getItem('estudea_teclado_fontsize') as 'sm' | 'md' | 'lg') || 'md';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('estudea_teclado_sound');
    return saved === null ? true : saved === 'true';
  });
  const [soundProfile, setSoundProfile] = useState<'thock' | 'apple' | 'pop' | 'typewriter'>(() => {
    return (localStorage.getItem('estudea_teclado_sound_profile') as any) || 'thock';
  });
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('estudea_teclado_volume');
    return saved === null ? 60 : Number(saved);
  });
  const [handsMode, setHandsMode] = useState<'docked' | 'overlay' | 'none'>(() => {
    const saved = localStorage.getItem('estudea_teclado_hands_mode');
    return (saved as any) || 'docked';
  });
  const [showKeyboard, setShowKeyboard] = useState<boolean>(() => {
    const saved = localStorage.getItem('estudea_teclado_showkeyboard');
    return saved === null ? true : saved === 'true';
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const activeCharRef = useRef<HTMLSpanElement>(null);
  const textoAlvo = licaoAtiva ? licaoAtiva.textos[textoIndex] : '';

  // Structured word segments with global character indices for perfect non-locking wrapping
  const wordsData = useMemo(() => {
    if (!textoAlvo) return [];
    const rawWords = textoAlvo.split(' ');
    let globalIdx = 0;
    return rawWords.map((word, wIdx) => {
      const chars = word.split('').map((char) => {
        const item = { char, index: globalIdx };
        globalIdx++;
        return item;
      });
      // Add space separator for all words except the last
      if (wIdx < rawWords.length - 1) {
        chars.push({ char: ' ', index: globalIdx });
        globalIdx++;
      }
      return { word, chars };
    });
  }, [textoAlvo]);

  // Smooth rolling auto-scroll to keep current typing line centered
  useEffect(() => {
    if (activeCharRef.current && textContainerRef.current) {
      const charEl = activeCharRef.current;
      const container = textContainerRef.current;
      const charOffsetTop = charEl.offsetTop;
      const containerScrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;

      if (charOffsetTop - containerScrollTop > containerHeight * 0.6 || charOffsetTop - containerScrollTop < 20) {
        container.scrollTo({
          top: Math.max(0, charOffsetTop - 35),
          behavior: 'smooth'
        });
      }
    }
  }, [digitado.length]);

  useEffect(() => {
    if (session?.user?.id) fetchProgressos();
  }, [session]);

  useEffect(() => {
    localStorage.setItem('estudea_teclado_layout', layout);
  }, [layout]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_fontsize', fontSize);
  }, [fontSize]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_sound', String(soundEnabled));
  }, [soundEnabled]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_sound_profile', soundProfile);
  }, [soundProfile]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_volume', String(volume));
  }, [volume]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_hands_mode', handsMode);
  }, [handsMode]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_showkeyboard', String(showKeyboard));
  }, [showKeyboard]);

  // Physical keyboard keydown/keyup tracker for mechanical feedback
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shortcut Tab + Enter or Esc to restart lesson
      if (e.key === 'Escape' && licaoAtiva) {
        reiniciarLicao();
        return;
      }

      setPressedPhysicalKeys(prev => new Set(prev).add(e.key.toLowerCase()));

      if (licaoAtiva && !concluido && !mostrarGuia && !showSettingsModal) {
        if (document.activeElement !== inputRef.current) {
          inputRef.current?.focus();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setPressedPhysicalKeys(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [licaoAtiva, concluido, mostrarGuia, showSettingsModal]);

  // Show posture guide on first entry into level 1
  useEffect(() => {
    if (nivelAtivo === 1 && !licaoAtiva) {
      const visto = localStorage.getItem('estudea_guia_postura_visto');
      if (!visto) {
        setMostrarGuia(true);
        localStorage.setItem('estudea_guia_postura_visto', '1');
      }
    }
  }, [nivelAtivo, licaoAtiva]);

  const fetchProgressos = async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('sessoes_digitacao')
      .select('licao_id, wpm, acuracia')
      .eq('aluno_id', session.user.id)
      .order('created_at', { ascending: false });

    if (error || !data) return;
    const mapa: Record<number, ProgressoLicao> = {};
    for (const row of data) {
      const licaoId = row.licao_id;
      const wpm = Number(row.wpm) || 0;
      const acuracia = Number(row.acuracia) || 0;
      const isAcuraciaOk = acuracia >= 85;

      if (!mapa[licaoId]) {
        mapa[licaoId] = {
          licao_id: licaoId,
          melhor_wpm: wpm,
          melhor_acuracia: acuracia,
          concluida: isAcuraciaOk,
        };
      } else {
        mapa[licaoId].melhor_wpm = Math.max(mapa[licaoId].melhor_wpm, wpm);
        mapa[licaoId].melhor_acuracia = Math.max(mapa[licaoId].melhor_acuracia, acuracia);
        if (isAcuraciaOk) {
          mapa[licaoId].concluida = true;
        }
      }
    }
    setProgressos(Object.values(mapa));
  };

  const isLicaoDesbloqueada = (licaoId: number) => {
    if (licaoId === 1) return true;
    return progressos.some(p => p.licao_id === licaoId - 1 && p.concluida);
  };
  const melhorWpm = (licaoId: number) => progressos.find(p => p.licao_id === licaoId)?.melhor_wpm ?? 0;
  const licaoConcluida = (licaoId: number) => progressos.some(p => p.licao_id === licaoId && p.concluida);
  
  const isNivelDesbloqueado = (nivelId: number) => {
    if (nivelId === 1) return true;
    return LICOES.filter(l => l.nivel === (nivelId - 1) as 1|2|3).every(l => licaoConcluida(l.id));
  };
  const licoesPorNivel = (nivelId: 1|2|3) => LICOES.filter(l => l.nivel === nivelId);

  const niveisStats = NIVEIS.map(nivel => {
    const licoes = licoesPorNivel(nivel.id);
    const concluidas = licoes.filter(l => licaoConcluida(l.id)).length;
    const total = licoes.length;
    const desbloqueado = isNivelDesbloqueado(nivel.id);
    const wpmMedio = concluidas > 0
      ? Math.round(licoes.reduce((acc, l) => acc + melhorWpm(l.id), 0) / concluidas)
      : 0;
    return { ...nivel, concluidas, total, desbloqueado, wpmMedio };
  });

  // Calculate realtime WPM & accuracy
  useEffect(() => {
    if (iniciado && !concluido) {
      timerRef.current = setInterval(() => {
        if (!startTime) return;
        const now = Date.now();
        const mins = (now - startTime) / 60000;
        if (mins > 0.05) {
          const palavras = digitado.length / 5;
          setWpmLive(Math.round(palavras / mins));
        }
      }, 250);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [iniciado, concluido, startTime, digitado]);

  // Start specific lesson
  const iniciarLicao = (licao: Licao, tIdx = 0) => {
    setLicaoAtiva(licao);
    setTextoIndex(tIdx);
    setDigitado('');
    setErros(new Set());
    setIniciado(false);
    setConcluido(false);
    setStartTime(null);
    setWpmLive(0);
    setResultado(null);
    setComboCount(0);
    setMaxCombo(0);
    setTimeout(() => inputRef.current?.focus(), 150);
  };

  const reiniciarLicao = () => {
    if (!licaoAtiva) return;
    iniciarLicao(licaoAtiva, textoIndex);
  };

  const proximoTexto = () => {
    if (!licaoAtiva) return;
    const nextIdx = (textoIndex + 1) % licaoAtiva.textos.length;
    iniciarLicao(licaoAtiva, nextIdx);
  };

  // Keyboard typing input handler with robust backspace & error handling
  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (concluido) return;
    const val = e.target.value;
    
    // Prevent typing beyond the target text length
    if (val.length > textoAlvo.length) return;

    if (!iniciado && val.length > 0) {
      setIniciado(true);
      setStartTime(Date.now());
    }

    // Handle Backspace: remove cleared character error states
    if (val.length < digitado.length) {
      setErros(prev => {
        const next = new Set(prev);
        for (let i = val.length; i < digitado.length; i++) {
          next.delete(i);
        }
        return next;
      });
      setDigitado(val);
      return;
    }

    // Evaluate newly typed characters
    const newErros = new Set(erros);
    let hasNewError = false;

    for (let i = digitado.length; i < val.length; i++) {
      if (val[i] !== textoAlvo[i]) {
        newErros.add(i);
        hasNewError = true;
      }
    }

    if (hasNewError) {
      setComboCount(0);
      if (soundEnabled) playSynthesizedSound(soundProfile, true, volume);
    } else if (val.length > digitado.length) {
      setComboCount(prev => {
        const next = prev + (val.length - digitado.length);
        setMaxCombo(m => Math.max(m, next));
        return next;
      });
      if (soundEnabled) playSynthesizedSound(soundProfile, false, volume);
    }

    setErros(newErros);
    setDigitado(val);

    // Finished text check
    if (val.length >= textoAlvo.length) {
      finalizarLicao(val);
    }
  };

  const finalizarLicao = async (valDigitado: string) => {
    setConcluido(true);
    if (timerRef.current) clearInterval(timerRef.current);

    const duracaoTotal = startTime ? Math.max(1, (Date.now() - startTime) / 1000) : 1;
    const mins = duracaoTotal / 60;
    const palavras = valDigitado.length / 5;
    const wpmFinal = Math.round(palavras / mins);

    let errosTotal = 0;
    for (let i = 0; i < textoAlvo.length; i++) {
      if (valDigitado[i] !== textoAlvo[i]) errosTotal++;
    }

    const acuraciaFinal = Math.max(0, Math.round(((textoAlvo.length - errosTotal) / textoAlvo.length) * 100));

    // Grade calculation
    let grade: 'S+' | 'S' | 'A' | 'B' | 'C' = 'C';
    if (acuraciaFinal >= 98 && wpmFinal >= 45) grade = 'S+';
    else if (acuraciaFinal >= 95 && wpmFinal >= 35) grade = 'S';
    else if (acuraciaFinal >= 90 && wpmFinal >= 25) grade = 'A';
    else if (acuraciaFinal >= 85) grade = 'B';

    const res: SessaoResultado = {
      wpm: wpmFinal,
      acuracia: acuraciaFinal,
      duracao: Math.round(duracaoTotal),
      erros: errosTotal,
      totalChars: textoAlvo.length,
      grade
    };
    setResultado(res);

    if (session?.user?.id && licaoAtiva) {
      try {
        await supabase.from('sessoes_digitacao').insert({
          aluno_id: session.user.id,
          licao_id: licaoAtiva.id,
          wpm: wpmFinal,
          acuracia: acuraciaFinal,
          duracao_segundos: Math.round(duracaoTotal),
          erros: errosTotal,
        });
        await fetchProgressos();
      } catch (err) {
        console.error('Erro ao salvar progresso:', err);
      }
    }
  };

  // Target next character & finger information
  const nextChar = textoAlvo[digitado.length] || '';
  const activeFingerInfo = useMemo(() => {
    return getFingerForKey(nextChar);
  }, [nextChar]);

  // Check if a virtual key is the active target
  const isKeyTarget = (key: string) => {
    if (!nextChar) return false;
    const k = key.toLowerCase();
    const nc = nextChar.toLowerCase();
    if (nextChar === ' ' && (k === ' ' || k === 'space')) return true;
    if (nc === k) return true;
    return false;
  };

  // Realtime accuracy computation
  const acuraciaAtual = useMemo(() => {
    if (digitado.length === 0) return 100;
    const acertos = digitado.length - erros.size;
    return Math.max(0, Math.round((acertos / digitado.length) * 100));
  }, [digitado.length, erros.size]);

  // Helper colors
  const coresNivel = nivelAtivo ? NIVEIS.find(n => n.id === nivelAtivo) : null;

  return (
    <div className="product-page max-w-7xl mx-auto space-y-6 relative overflow-hidden animate-fade-in pb-10">
      
      {/* ——————————————————————————————
          1. HEADER & HUD DO TREINADOR
         —————————————————————————————— */}
      <header className="product-card p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-product-control bg-primary/10 text-primary flex items-center justify-center border border-primary/20 shrink-0">
            <HugeiconsIcon icon={KeyboardIcon} size={24} strokeWidth={2} />
          </div>
          <div>
            <span className="product-section-kicker">Gamificação & Habilidade</span>
            <h1 className="product-section-heading mt-0 text-xl sm:text-2xl flex items-center gap-2">
              <span>Treino de Digitação</span>
              <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Pro
              </span>
            </h1>
            <p className="product-subtitle">
              Aprenda datilografia profissional, aumente sua velocidade (WPM) e desenvolva memória muscular sem olhar para o teclado.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          <button
            onClick={() => setMostrarGuia(true)}
            className="product-secondary-action text-xs"
            title="Ver Guia de Postura e Ergonomia"
          >
            <HugeiconsIcon icon={InformationCircleIcon} size={15} className="text-secondary" strokeWidth={2} />
            <span>Guia de Postura</span>
          </button>

          <button
            onClick={() => setShowSettingsModal(true)}
            className="product-secondary-action text-xs"
            title="Ajustar Preferências de Teclado, Mãos e Sons"
          >
            <HugeiconsIcon icon={Settings01Icon} size={15} strokeWidth={2} />
            <span>Preferências</span>
          </button>
        </div>
      </header>

      {/* ——————————————————————————————
          2. SELEÇÃO DE NÍVEL (SE NÃO HOUVER LIÇÃO ATIVA)
         —————————————————————————————— */}
      {!licaoAtiva && (
        <div className="space-y-8 animate-fade-in">
          {/* Level Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {niveisStats.map((nivel) => {
              const isSelected = nivelAtivo === nivel.id;
              const percentual = nivel.total > 0 ? Math.round((nivel.concluidas / nivel.total) * 100) : 0;

              return (
                <div
                  key={nivel.id}
                  onClick={() => {
                    if (nivel.desbloqueado) {
                      setNivelAtivo(nivel.id);
                    }
                  }}
                  className={`product-card p-5 relative overflow-hidden transition-all duration-300 flex flex-col justify-between gap-5 border-2 ${
                    nivel.desbloqueado
                      ? 'cursor-pointer hover:border-primary/50'
                      : 'opacity-60 cursor-not-allowed border-dashed'
                  } ${isSelected ? 'border-primary shadow-lg shadow-primary/10 ring-2 ring-primary/20' : 'border-outline-variant/60'}`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{nivel.emoji}</span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${nivel.bg} ${nivel.text} border ${nivel.border}`}>
                        Nível {nivel.id}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-heading font-extrabold text-sm text-on-surface">
                        {nivel.titulo}
                      </h3>
                      <p className="text-xs font-bold text-primary mt-0.5">{nivel.subtitulo}</p>
                    </div>

                    <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                      {nivel.descricao}
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-outline-variant/60">
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className="text-on-surface-variant">{nivel.concluidas} de {nivel.total} lições</span>
                      <span className="text-primary">{percentual}%</span>
                    </div>

                    <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-500 rounded-full"
                        style={{ width: `${percentual}%` }}
                      />
                    </div>

                    {nivel.wpmMedio > 0 && (
                      <p className="text-[11px] text-on-surface-variant font-semibold">
                        Média de Velocidade: <strong className="text-secondary font-mono">{nivel.wpmMedio} WPM</strong>
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Lessons List for Selected Level */}
          {nivelAtivo && (
            <div className="product-card p-5 space-y-5 animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/60">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{coresNivel?.emoji}</span>
                  <div>
                    <h3 className="font-heading font-extrabold text-sm text-on-surface">
                      Lições: {coresNivel?.titulo} — {coresNivel?.subtitulo}
                    </h3>
                    <p className="text-xs text-on-surface-variant">Selecione uma lição para iniciar o treinamento interativo.</p>
                  </div>
                </div>
                
                <button
                  onClick={() => setNivelAtivo(null)}
                  className="product-secondary-action text-xs !min-h-7 !px-2.5"
                >
                  <HugeiconsIcon icon={ArrowLeft01Icon} size={14} strokeWidth={2} />
                  <span>Ver Todos os Níveis</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {licoesPorNivel(nivelAtivo).map((licao, idx) => {
                  const desbloqueada = isLicaoDesbloqueada(licao.id);
                  const concluida = licaoConcluida(licao.id);
                  const wpm = melhorWpm(licao.id);

                  return (
                    <div
                      key={licao.id}
                      onClick={() => {
                        if (desbloqueada) iniciarLicao(licao);
                      }}
                      className={`p-4 rounded-product-control border transition-all duration-200 flex flex-col justify-between gap-3 ${
                        desbloqueada
                          ? 'bg-surface-container-low hover:bg-surface-container border-outline-variant/60 hover:border-primary/40 cursor-pointer shadow-xs hover:shadow-md'
                          : 'bg-surface-container-low/40 border-outline-variant/30 opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-product-control font-heading font-extrabold text-xs flex items-center justify-center shrink-0 ${
                            concluida
                              ? 'bg-emerald-500 text-white shadow-xs'
                              : desbloqueada
                                ? 'bg-primary/10 text-primary border border-primary/20'
                                : 'bg-surface-container-high text-on-surface-variant'
                          }`}>
                            {concluida ? <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} strokeWidth={2} /> : idx + 1}
                          </div>
                          <div>
                            <h4 className="font-heading font-extrabold text-xs text-on-surface line-clamp-1">
                              {licao.titulo}
                            </h4>
                            <span className="text-[10px] text-on-surface-variant font-mono font-bold">
                              Teclas: {licao.teclas.join(' ')}
                            </span>
                          </div>
                        </div>

                        {!desbloqueada && (
                          <HugeiconsIcon icon={LockPasswordIcon} size={16} className="text-on-surface-variant/40 shrink-0" />
                        )}
                      </div>

                      <p className="text-[11px] text-on-surface-variant line-clamp-2 leading-relaxed font-medium">
                        {licao.descricao}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-outline-variant/60 text-[11px]">
                        <span className="font-bold text-on-surface-variant">
                          {concluida ? 'Concluída' : desbloqueada ? 'Disponível' : 'Bloqueada'}
                        </span>
                        {wpm > 0 && (
                          <span className="font-bold text-secondary font-mono">
                            {wpm} WPM
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ——————————————————————————————
          3. ARENA DE DIGITAÇÃO INTERATIVA
         —————————————————————————————— */}
      {licaoAtiva && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Top Bar of Active Lesson */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 product-card p-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setLicaoAtiva(null)}
                className="product-icon-action"
                title="Voltar para a seleção de lições"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} size={16} strokeWidth={2} />
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary font-mono uppercase">
                    Lição {licaoAtiva.id}
                  </span>
                  <span className="text-xs text-outline">•</span>
                  <h3 className="font-heading font-extrabold text-body-md text-on-surface">
                    {licaoAtiva.titulo}
                  </h3>
                </div>
                <p className="text-[11px] text-on-surface-variant">{licaoAtiva.descricao}</p>
              </div>
            </div>

            {/* Realtime Live Telemetry HUD */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* WPM Speedometer */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <HugeiconsIcon icon={FireIcon} size={16} className={wpmLive > 40 ? 'text-orange-500 animate-bounce' : 'text-primary'} />
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Velocidade</span>
                  <span className="font-mono font-extrabold text-body-md text-on-surface leading-tight">
                    {wpmLive} <span className="text-[10px] font-bold text-on-surface-variant">WPM</span>
                  </span>
                </div>
              </div>

              {/* Accuracy */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-container-low border border-outline-variant/30">
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className={acuraciaAtual >= 90 ? 'text-emerald-500' : 'text-amber-500'} />
                <div>
                  <span className="text-[10px] text-on-surface-variant font-bold block uppercase leading-none">Precisão</span>
                  <span className="font-mono font-extrabold text-body-md text-on-surface leading-tight">
                    {acuraciaAtual}%
                  </span>
                </div>
              </div>

              {/* Streak Combo */}
              {comboCount >= 5 && (
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500/15 to-amber-500/15 border border-orange-500/30 text-orange-600 dark:text-orange-400 font-mono font-extrabold text-xs animate-in zoom-in-50">
                  <HugeiconsIcon icon={FireIcon} size={14} className="animate-pulse" />
                  <span>{comboCount}x Combo!</span>
                </div>
              )}

              {/* Restart Button */}
              <button
                onClick={reiniciarLicao}
                className="p-2 rounded-xl border border-outline-variant/30 hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-all"
                title="Reiniciar Lição (Esc)"
              >
                <HugeiconsIcon icon={RefreshIcon} size={18} />
              </button>
            </div>
          </div>

          {/* Dynamic Active Finger Callout HUD */}
          {nextChar && (
            <div className="flex items-center justify-between px-5 py-2.5 rounded-2xl bg-gradient-to-r from-primary/10 via-surface-container-lowest to-secondary/10 border border-primary/20 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center font-mono font-extrabold text-white text-sm shadow-sm"
                  style={{ backgroundColor: activeFingerInfo.hex }}
                >
                  {nextChar === ' ' ? '␣' : nextChar.toUpperCase()}
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">
                    Próxima Tecla: <strong className="font-mono text-primary text-sm">[{nextChar === ' ' ? 'Barra de Espaço' : nextChar}]</strong>
                  </p>
                  <p className="text-[11px] font-semibold text-on-surface-variant">
                    Use o <strong style={{ color: activeFingerInfo.hex }}>{activeFingerInfo.label}</strong> ({activeFingerInfo.hand === 'left' ? 'Mão Esquerda' : 'Mão Direita'})
                  </p>
                </div>
              </div>

              {licaoAtiva.dica && (
                <div className="hidden md:flex items-center gap-1.5 text-xs text-on-surface-variant bg-surface-container-low px-3 py-1.5 rounded-xl border border-outline-variant/20">
                  <HugeiconsIcon icon={InformationCircleIcon} size={14} className="text-secondary shrink-0" />
                  <span className="line-clamp-1">{licaoAtiva.dica}</span>
                </div>
              )}
            </div>
          )}

          {/* ——————————————————————————————
              TYPING PROMPT BOX (MONKEYTYPE STYLE COM ROLAGEM SUAVE)
             —————————————————————————————— */}
          <div
            onClick={() => inputRef.current?.focus()}
            className="bg-surface-container-lowest dark:bg-slate-950 border-2 border-outline-variant/30 hover:border-primary/40 rounded-3xl p-6 sm:p-8 shadow-md relative cursor-text transition-all duration-300 overflow-hidden"
          >
            {/* Hidden capture input */}
            <input
              ref={inputRef}
              type="text"
              value={digitado}
              onChange={handleInput}
              disabled={concluido}
              className="absolute opacity-0 w-0 h-0 pointer-events-none"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
            />

            {/* Prompt Text Stream with Word Wrapping and Smooth Line Scrolling */}
            <div
              ref={textContainerRef}
              className={`font-mono tracking-wider leading-relaxed select-none transition-all max-h-[140px] sm:max-h-[160px] overflow-y-auto scrollbar-none flex flex-wrap content-start ${
                fontSize === 'sm' ? 'text-base sm:text-lg' : fontSize === 'lg' ? 'text-2xl sm:text-3xl' : 'text-xl sm:text-2xl'
              }`}
              style={{ scrollBehavior: 'smooth' }}
            >
              {wordsData.map((wordObj, wIdx) => (
                <span key={wIdx} className="inline-flex mr-3 mb-2 whitespace-nowrap">
                  {wordObj.chars.map((charObj) => {
                    const idx = charObj.index;
                    const isTyped = idx < digitado.length;
                    const isCurrent = idx === digitado.length;
                    const isError = erros.has(idx);
                    const isTypedCorrect = isTyped && !isError;

                    let charClass = 'text-on-surface-variant/35 dark:text-slate-600';
                    if (isTypedCorrect) {
                      charClass = 'text-primary dark:text-sky-400 font-bold';
                    } else if (isTyped && isError) {
                      charClass = 'text-error dark:text-rose-400 bg-error/15 rounded font-bold underline decoration-wavy';
                    }

                    return (
                      <span
                        key={idx}
                        ref={isCurrent ? activeCharRef : null}
                        className={`relative transition-colors duration-100 ${charClass}`}
                      >
                        {/* Glowing Smooth Caret */}
                        {isCurrent && (
                          <span className="absolute -left-0.5 top-0 bottom-0 w-0.5 bg-primary dark:bg-sky-400 animate-pulse rounded-full shadow-[0_0_8px_rgba(2,132,199,0.8)] z-20">
                            {!iniciado && (
                              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-slate-900 dark:bg-slate-800 text-white text-[10px] font-sans font-bold rounded-lg whitespace-nowrap shadow-lg animate-bounce">
                                Comece a digitar!
                                <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                              </span>
                            )}
                          </span>
                        )}
                        {charObj.char === ' ' ? '\u00A0' : charObj.char}
                      </span>
                    );
                  })}
                </span>
              ))}
            </div>

            {/* Progress Bar under text */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
              <div className="h-2 rounded-full bg-surface-container-low overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-secondary transition-all duration-150 rounded-full"
                  style={{ width: `${textoAlvo.length > 0 ? (digitado.length / textoAlvo.length) * 100 : 0}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[11px] font-mono text-on-surface-variant/60 font-semibold">
                <span>{digitado.length} / {textoAlvo.length} caracteres</span>
                <span>{erros.size} {erros.size === 1 ? 'erro' : 'erros'}</span>
              </div>
            </div>
          </div>

          {/* ——————————————————————————————
              4. TECLADO VIRTUAL 3D + MODELO DE MÃOS
             —————————————————————————————— */}
          {showKeyboard && (
            <div className="bg-surface-container-lowest dark:bg-slate-950 border border-outline-variant/30 rounded-3xl p-5 sm:p-7 shadow-md flex flex-col items-center relative overflow-hidden">
              
              {/* Keyboard Top Toolbar */}
              <div className="flex justify-between items-center mb-5 w-full max-w-4xl px-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-on-surface-variant/60">
                    Layout: {layout === 'abnt2' ? 'ABNT2 (Brasil)' : 'US International'}
                  </span>
                  <span className="text-xs text-outline">•</span>
                  <span className="text-[10px] font-semibold text-primary">
                    Mãos: {handsMode === 'docked' ? 'Base Ergonômica' : handsMode === 'overlay' ? 'Modo Sobreposto' : 'Ocultas'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setHandsMode(h => h === 'docked' ? 'overlay' : h === 'overlay' ? 'none' : 'docked')}
                    className="text-[11px] font-bold text-on-surface-variant hover:text-on-surface bg-surface-container-low px-3 py-1 rounded-full border border-outline-variant/30 transition-all"
                  >
                    Alternar Mãos ({handsMode === 'docked' ? 'Abaixo' : handsMode === 'overlay' ? 'Sobre' : 'Off'})
                  </button>
                </div>
              </div>

              {/* 3D Keycaps Matrix */}
              <div className="w-full max-w-4xl space-y-1.5 relative z-10">
                {getKeyboardLayout(layout).map((row, ri) => (
                  <div key={ri} className="flex justify-center gap-1.5 w-full">
                    {row.map(key => {
                      const isTarget = isKeyTarget(key.key);
                      const isPhysicallyPressed = pressedPhysicalKeys.has(key.key.toLowerCase());
                      const isModifier = ['tab', 'capslock', 'shift_l', 'shift_r', 'ctrl_l', 'ctrl_r', 'alt_l', 'alt_r', 'altgr', 'win_l', 'win_r', 'backspace', 'enter'].includes(key.key);
                      const fingerConfig = FINGER_PALETTE[key.finger];
                      const isFJ = key.key === 'f' || key.key === 'j';

                      // Key appearance
                      let keyClasses = `relative rounded-xl flex flex-col items-center justify-center font-mono font-bold select-none transition-all duration-75 text-xs sm:text-sm uppercase ${key.width} h-11 sm:h-12 shadow-[0_3px_0_rgba(0,0,0,0.15)] dark:shadow-[0_3px_0_rgba(0,0,0,0.5)] border `;

                      if (isTarget) {
                        // High-visibility target glow with pulsing ring
                        keyClasses += `bg-primary text-white border-primary shadow-lg shadow-primary/40 ring-4 ring-primary/30 z-20 scale-105 `;
                      } else if (isPhysicallyPressed) {
                        // Physically depressed state
                        keyClasses += `bg-secondary text-white border-secondary translate-y-1 shadow-none `;
                      } else if (isModifier) {
                        keyClasses += `bg-surface-container-low text-on-surface-variant/70 border-outline-variant/30 text-[10px] sm:text-xs `;
                      } else {
                        keyClasses += `${fingerConfig.bg} ${fingerConfig.border} ${fingerConfig.text} hover:bg-surface-container `;
                      }

                      return (
                        <div key={key.key} className={keyClasses}>
                          {/* Shift secondary symbol */}
                          {key.shiftDisplay && (
                            <span className="absolute top-1 left-2 text-[8px] sm:text-[9px] opacity-40 leading-none">
                              {key.shiftDisplay}
                            </span>
                          )}

                          {/* Primary letter display */}
                          <span className={key.shiftDisplay ? 'pt-1.5' : ''}>
                            {key.display}
                          </span>

                          {/* Home Row Tactile Guide Nodule (Calombinho F & J) */}
                          {isFJ && (
                            <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-current opacity-70" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>

              {/* OVERLAY HANDS MODE */}
              {handsMode === 'overlay' && (
                <div className="absolute inset-x-0 bottom-0 top-14 pointer-events-none flex justify-between px-6 sm:px-16 z-20 opacity-85">
                  <div className="w-[30%] max-w-[210px] h-full flex items-end">
                    <ErgonomicHandSvg
                      side="left"
                      activeFinger={activeFingerInfo.hand === 'left' ? activeFingerInfo.finger : null}
                      activeColorHex={activeFingerInfo.hex}
                    />
                  </div>
                  <div className="w-[30%] max-w-[210px] h-full flex items-end">
                    <ErgonomicHandSvg
                      side="right"
                      activeFinger={activeFingerInfo.hand === 'right' ? activeFingerInfo.finger : null}
                      activeColorHex={activeFingerInfo.hex}
                    />
                  </div>
                </div>
              )}

              {/* DOCKED ERGONOMIC HANDS BAY */}
              {handsMode === 'docked' && (
                <div className="w-full max-w-4xl mt-6 pt-6 border-t border-outline-variant/20 grid grid-cols-2 gap-8 items-center">
                  <div className="h-44 flex items-center justify-center p-2 bg-surface-container-low/50 rounded-2xl border border-outline-variant/20">
                    <ErgonomicHandSvg
                      side="left"
                      activeFinger={activeFingerInfo.hand === 'left' ? activeFingerInfo.finger : null}
                      activeColorHex={activeFingerInfo.hex}
                    />
                  </div>

                  <div className="h-44 flex items-center justify-center p-2 bg-surface-container-low/50 rounded-2xl border border-outline-variant/20">
                    <ErgonomicHandSvg
                      side="right"
                      activeFinger={activeFingerInfo.hand === 'right' ? activeFingerInfo.finger : null}
                      activeColorHex={activeFingerInfo.hex}
                    />
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* ——————————————————————————————
          5. MODAL DE RESULTADOS & VITÓRIA
         —————————————————————————————— */}
      {resultado && licaoAtiva && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-lg shadow-2xl border border-outline-variant/30 overflow-hidden font-sans">
            
            {/* Modal Hero Banner */}
            <div className={`p-8 text-center text-white relative overflow-hidden ${
              resultado.acuracia >= 85
                ? 'bg-gradient-to-br from-primary via-[#003B70] to-secondary'
                : 'bg-gradient-to-br from-amber-600 to-orange-700'
            }`}>
              <div className="relative z-10 space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center mx-auto text-3xl shadow-lg">
                  {resultado.acuracia >= 85 ? '🏆' : '💪'}
                </div>
                <h2 className="font-heading font-extrabold text-2xl">
                  {resultado.acuracia >= 85 ? 'Lição Concluída com Sucesso!' : 'Bom Treino! Continue Praticando'}
                </h2>
                <p className="text-white/80 text-xs max-w-sm mx-auto">
                  {resultado.acuracia >= 85
                    ? 'Excelente precisão! Seu progresso e velocidade foram registrados no seu perfil.'
                    : 'A meta para desbloquear a próxima lição é atingir pelo menos 85% de precisão.'}
                </p>
              </div>
            </div>

            {/* Stats Metrics Cards */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Velocidade</span>
                  <span className="font-heading font-extrabold text-2xl text-primary font-mono">{resultado.wpm}</span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">WPM</span>
                </div>

                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Precisão</span>
                  <span className={`font-heading font-extrabold text-2xl font-mono ${
                    resultado.acuracia >= 85 ? 'text-emerald-500' : 'text-amber-500'
                  }`}>
                    {resultado.acuracia}%
                  </span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">Acertos</span>
                </div>

                <div className="p-3.5 bg-surface-container-low rounded-2xl border border-outline-variant/30">
                  <span className="text-[10px] font-bold text-on-surface-variant uppercase block">Classificação</span>
                  <span className="font-heading font-extrabold text-2xl text-secondary font-mono">{resultado.grade}</span>
                  <span className="text-[10px] text-on-surface-variant font-bold block">Desempenho</span>
                </div>
              </div>

              <div className="p-3 bg-surface-container-low rounded-xl text-xs space-y-1 text-on-surface-variant">
                <div className="flex justify-between">
                  <span>Tempo de digitação:</span>
                  <strong className="text-on-surface font-mono">{resultado.duracao}s</strong>
                </div>
                <div className="flex justify-between">
                  <span>Total de caracteres digitados:</span>
                  <strong className="text-on-surface font-mono">{resultado.totalChars}</strong>
                </div>
                <div className="flex justify-between">
                  <span>Maior combo sem erros:</span>
                  <strong className="text-orange-500 font-mono">{maxCombo} caracteres</strong>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={reiniciarLicao}
                  className="flex-1 py-3 px-4 border border-outline-variant/40 hover:bg-surface-container text-on-surface font-heading font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                >
                  <HugeiconsIcon icon={RefreshIcon} size={16} />
                  <span>Repetir Lição</span>
                </button>

                {resultado.acuracia >= 85 ? (
                  <button
                    onClick={() => {
                      if (licaoAtiva.id < LICOES.length) {
                        const next = LICOES.find(l => l.id === licaoAtiva.id + 1);
                        if (next) iniciarLicao(next);
                      } else {
                        setLicaoAtiva(null);
                      }
                    }}
                    className="flex-1 py-3 px-4 bg-primary hover:bg-primary/90 text-on-primary font-heading font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Próxima Lição</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                  </button>
                ) : (
                  <button
                    onClick={proximoTexto}
                    className="flex-1 py-3 px-4 bg-secondary hover:bg-secondary/90 text-on-secondary font-heading font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>Tentar Outro Texto</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——————————————————————————————
          6. MODAL DE PREFERÊNCIAS & CUSTOMIZAÇÃO
         —————————————————————————————— */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-outline-variant/30 overflow-hidden font-sans">
            
            <div className="p-5 border-b border-outline-variant/30 flex items-center justify-between">
              <h3 className="text-body-lg font-heading font-extrabold text-on-surface flex items-center gap-2">
                <HugeiconsIcon icon={Settings01Icon} size={20} className="text-primary" />
                Preferências de Digitação
              </h3>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-on-surface-variant hover:text-on-surface p-1 rounded-lg"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-5 space-y-5 text-xs">
              
              {/* Keyboard Layout */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Layout Físico do Teclado
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLayout('abnt2')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      layout === 'abnt2'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    ABNT2 (Com tecla Ç)
                  </button>
                  <button
                    type="button"
                    onClick={() => setLayout('us')}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                      layout === 'us'
                        ? 'bg-primary text-on-primary border-primary shadow-xs'
                        : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                    }`}
                  >
                    US International
                  </button>
                </div>
              </div>

              {/* Hands Mode */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Exibição das Mãos Guia
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className="text-[10px] font-bold text-primary hover:underline"
                  >
                    {showKeyboard ? 'Ocultar Teclado' : 'Mostrar Teclado'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'docked', label: 'Abaixo' },
                    { id: 'overlay', label: 'Sobreposta' },
                    { id: 'none', label: 'Oculta' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setHandsMode(item.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                        handsMode === item.id
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Font Size */}
              <div className="space-y-2">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                  Tamanho do Texto
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sm', label: 'Normal' },
                    { id: 'md', label: 'Médio' },
                    { id: 'lg', label: 'Grande' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFontSize(item.id as any)}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all ${
                        fontSize === item.id
                          ? 'bg-primary text-on-primary border-primary shadow-xs'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Profile */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-extrabold uppercase tracking-wider text-on-surface-variant block">
                    Perfil de Áudio Mecânico
                  </label>
                  <button
                    type="button"
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      soundEnabled ? 'bg-emerald-500/10 text-emerald-600' : 'bg-surface-container text-on-surface-variant'
                    }`}
                  >
                    {soundEnabled ? 'Ativado' : 'Mudo'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'thock', label: '🔊 Thock Mecânico' },
                    { id: 'apple', label: '💻 Apple Magic' },
                    { id: 'pop', label: '🫧 ASMR Pop' },
                    { id: 'typewriter', label: '⌨️ Máquina Escrever' }
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSoundProfile(item.id as any);
                        playSynthesizedSound(item.id as any, false, volume);
                      }}
                      className={`py-2 px-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                        soundProfile === item.id
                          ? 'bg-primary/10 border-primary text-primary'
                          : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Volume Slider */}
              {soundEnabled && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-xs font-bold text-on-surface-variant">
                    <span>Volume do Teclado</span>
                    <span>{volume}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-outline-variant/30 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-5 py-2 bg-primary text-on-primary font-heading font-bold text-xs rounded-xl shadow-xs"
                >
                  Concluir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ——————————————————————————————
          7. MODAL DO GUIA DE POSTURA E ERGONOMIA
         —————————————————————————————— */}
      {mostrarGuia && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-3xl w-full max-w-2xl shadow-2xl border border-outline-variant/30 overflow-hidden font-sans max-h-[90vh] flex flex-col">
            
            <div className="p-6 bg-gradient-to-r from-primary via-[#003B70] to-secondary text-white flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-headline-sm font-heading font-extrabold flex items-center gap-2">
                  🧘 Guia de Postura & Ergonomia Datilográfica
                </h3>
                <p className="text-white/80 text-xs mt-1">Regras de ouro para velocidade sem fadiga ou dores musculares</p>
              </div>
              <button
                onClick={() => setMostrarGuia(false)}
                className="text-white/70 hover:text-white p-1.5 rounded-xl bg-white/10 hover:bg-white/20 transition-all"
              >
                <HugeiconsIcon icon={Cancel01Icon} size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs text-on-surface-variant leading-relaxed">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">🪑</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">1. Coluna e Cotovelos</h4>
                  <p>Mantenha as costas apoiadas no encosto da cadeira com os cotovelos dobrados em um ângulo próximo a <strong>90 graus</strong>.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">✋</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">2. Pulsos Flutuantes</h4>
                  <p>Nunca apoie os pulsos ou a palma da mão na mesa enquanto digita. Os pulsos devem flutuar levemente como ao tocar piano.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">📍</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">3. Teclas Âncora (F e J)</h4>
                  <p>Os dedos indicadores devem repousar sobre as teclas <strong>F</strong> e <strong>J</strong>, sentindo suas saliências táteis de referência.</p>
                </div>

                <div className="p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 space-y-2">
                  <span className="text-xl">👀</span>
                  <h4 className="font-heading font-extrabold text-body-md text-on-surface">4. Olhos na Tela</h4>
                  <p>Evite olhar para o teclado. Confie na memória muscular dos seus dedos; os erros diminuem exponencialmente com o tempo.</p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-2 text-on-surface">
                <p className="font-bold text-primary text-sm flex items-center gap-1.5">
                  <HugeiconsIcon icon={Award01Icon} size={18} />
                  Dica de Mestre do Senac
                </p>
                <p>
                  A velocidade de digitação não é força, é <strong>ritmo e relaxamento</strong>. Comece devagar com 100% de precisão e deixe a velocidade se desenvolver com a prática diária de 10 minutos.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setMostrarGuia(false)}
                  className="px-6 py-2.5 bg-primary text-on-primary font-heading font-bold text-xs rounded-xl shadow-xs"
                >
                  Entendi, vamos treinar!
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
