import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  KeyboardIcon,
  CheckmarkCircle02Icon,
  LockPasswordIcon,
  ArrowRight01Icon,
  FireIcon,
  Cancel01Icon,
  Alert01Icon,
  Award01Icon,
  ArrowLeft01Icon,
  InformationCircleIcon,
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
}

interface ProgressoLicao {
  licao_id: number;
  melhor_wpm: number;
  melhor_acuracia: number;
  concluida: boolean;
}

// ——— Níveis ———
const NIVEIS = [
  {
    id: 1 as const,
    titulo: 'Iniciante',
    subtitulo: 'Home Row',
    descricao: 'Domine a linha central do teclado — a base de toda a datilografia.',
    emoji: '🟢',
    cor: 'emerald',
    bg: 'bg-emerald-50', border: 'border-emerald-200',
    text: 'text-emerald-700', badge: 'bg-emerald-500',
    temGuiaPostura: true,
  },
  {
    id: 2 as const,
    titulo: 'Intermediário',
    subtitulo: 'Todas as Linhas',
    descricao: 'Expanda para as linhas superior e inferior, e comece a formar palavras reais.',
    emoji: '🟡',
    cor: 'amber',
    bg: 'bg-amber-50', border: 'border-amber-200',
    text: 'text-amber-700', badge: 'bg-amber-500',
    temGuiaPostura: false,
  },
  {
    id: 3 as const,
    titulo: 'Avançado',
    subtitulo: 'Palavras, Frases & Velocidade',
    descricao: 'Textos do cotidiano digital, vocabulário de TI, pontuação e frases reais.',
    emoji: '🔴',
    cor: 'rose',
    bg: 'bg-rose-50', border: 'border-rose-200',
    text: 'text-rose-700', badge: 'bg-rose-500',
    temGuiaPostura: false,
  },
];

// ——————————————————————————————
//  CURRÍCULO COMPLETO — 17 lições
// ——————————————————————————————
const LICOES: Licao[] = [
  // ═══════════ NÍVEL 1 — INICIANTE ═══════════
  {
    id: 1, nivel: 1, titulo: 'Home Row Esquerda', cor: 'blue',
    descricao: 'Posição inicial da mão esquerda: A S D F. Use os saliências do F como guia!',
    teclas: ['a', 's', 'd', 'f'],
    dica: 'Sinta o calombinho na tecla F com o indicador esquerdo. É o seu ponto de partida!',
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
    descricao: 'Posição inicial da mão direita: J K L Ç. O J é seu ponto de referência!',
    teclas: ['j', 'k', 'l', 'ç'],
    dica: 'Sinta o calombinho na tecla J com o indicador direito. Volte sempre para ele!',
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
    descricao: 'Combine as duas mãos! As 8 teclas centrais são sua base permanente.',
    teclas: ['a', 's', 'd', 'f', 'j', 'k', 'l', 'ç'],
    dica: 'Cada dedo tem sua casa. Após apertar qualquer tecla, volte ao repouso!',
    textos: [
      'asdf jklç asdf jklç fdsa çlkj fdsa çlkj asdf jklç fdsa çlkj asdf jklç fdsa çlkj ask all fall skill flask sal ask all fall skill flask sal alfa sala flask lakal fall skill flask sala alfa dada fads adds asdf jklç fdsa çlkj ask all fall skill flask',
      'ask all fall skill flask sal alfa sala flask lakal asdf jklç fall skill flask sala alfa dada fads adds ask all fall skill flask sal alfa sala flask lakal asdf jklç fall skill flask sala alfa dada fads adds jacks lacks dada salad slack lads falls',
      'alfa sala flask lakal asdf jklç fall skill flask sala alfa dads adds fads jacks lacks dada salad slack alfa sala flask lakal asdf jklç fall skill flask sala alfa dads adds fads jacks lacks dada salad slack asdf jklç fdsa çlkj ask all fall skill',
      'fall skill flask sala alfa asdf jklç flask salad slack lads falls alfa sala dads adds fads jacks lacks fall skill flask sala alfa asdf jklç flask salad slack lads falls alfa sala dads adds fads jacks lacks asdf jklç fdsa çlkj ask all fall skill flask',
      'flask salad slack lads falls alfa sala dads adds fads asdf jklç fall skill alfa jacks lacks dada lads flask salad slack lads falls alfa sala dads adds fads asdf jklç fall skill alfa jacks lacks dada lads asks falls sala flask salad slack alfa dada',
    ]
  },

  // ═══════════ NÍVEL 2 — INTERMEDIÁRIO ═══════════
  {
    id: 4, nivel: 2, titulo: 'Linha Superior Esquerda', cor: 'orange',
    descricao: 'Teclas Q W E R T — dedos sobem da home row e voltam.',
    teclas: ['q', 'w', 'e', 'r', 't'],
    dica: 'Lembre: após apertar Q, W, E, R ou T, volte o dedo para A, S, D, F!',
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
    descricao: 'Forme palavras reais usando só as teclas que você já aprendeu.',
    teclas: ['a', 's', 'd', 'f', 'j', 'k', 'l'],
    dica: 'Você já sabe todas essas teclas! Foque na fluidez, sem pressa.',
    textos: [
      'asa dada fala sala caça faca salada casca falsa daga alfa fala asa dada sala caça faca salada casca falsa asa dada fala sala caça faca salada casca falsa daga alfa fala asa dada sala caça faca salada casca falsa dada alfa sala asa fala daga casca',
      'salada casca falsa daga alfa fala asa dada sala caça faca falsa dada alfa sala casca salada asa fala daga salada casca falsa daga alfa fala asa dada sala caça faca falsa dada alfa sala casca salada asa fala dada caça faca alfa sala asa fala casca',
      'flask salad slack lads falls alfa sala dada fala caça faca salada casca falsa daga alfa asa dad fala sala flask salad slack lads falls alfa sala dada fala caça faca salada casca falsa daga alfa asa dad fala sala dada caça faca casca salada falsa',
      'alfa sala dada fala caça faca salada casca falsa daga flask salad slack lads falls alfa asa sala dada fala alfa sala dada fala caça faca salada casca falsa daga flask salad slack lads falls alfa asa sala dada fala caça faca falsa casca salada alfa',
      'asa dada salada fala casca caça faca alfa sala falsa daga flask salad slack lads falls alfa sala asa dada asa dada salada fala casca caça faca alfa sala falsa daga flask salad slack lads falls alfa sala asa dada caça faca salada falsa casca daga',
    ]
  },
  {
    id: 6, nivel: 2, titulo: 'Linha Superior Direita', cor: 'indigo',
    descricao: 'Teclas Y U I O P — mão direita vai para cima.',
    teclas: ['y', 'u', 'i', 'o', 'p'],
    dica: 'Após apertar Y, U, I, O ou P, volte para J, K, L, Ç!',
    textos: [
      'yyy uuu iii ooo ppp yuiop yuiop oiuy puio yoyo your pour tour sour out put tip top pot pit yet pull pill yyy uuu iii ooo ppp yuiop yuiop oiuy puio yoyo your pour tour sour out put tip top pot pit yet pull pill',
      'you yip oil pout upon polo tipo oyster pupil pour your tour sour out put tip top pot pit pull pill fill top you yip oil pout upon polo tipo oyster pupil pour your tour sour out put tip top pot pit pull pill fill',
      'polo piu yup oily tipo poio your pour tour sour out put tip top pot pit yet pull pill fill hill still kill polo piu yup oily tipo poio your pour tour sour out put tip top pot pit yet pull pill fill hill still',
      'tipo polo upon yip oily pout up oyster pupil pour your tour top pot pit yet pull pill still kill will fill tipo polo upon yip oily pout up oyster pupil pour your tour top pot pit yet pull pill still kill will',
      'oyster pupil pour your tour sour out put tip top pot pit yet pull pill fill still tipo polo upon yip oily oyster pupil pour your tour sour out put tip top pot pit yet pull pill fill still tipo polo upon yip',
    ]
  },
  {
    id: 7, nivel: 2, titulo: 'Superior + Central: Palavras', cor: 'cyan',
    descricao: 'Misture as linhas superior e central para formar palavras do dia a dia.',
    teclas: ['q','w','e','r','t','y','u','i','o','p','a','s','d','f','j','k','l'],
    dica: 'Respire fundo. Após cada palavra, pause e reposicione os dedos na home row.',
    textos: [
      'rato teto roda doce sapato prato quero porta falar treino salto rapido suporte digital tela rede aula rato teto roda doce sapato prato quero porta falar treino salto rapido suporte digital tela rede aula',
      'quero porta falar treino salto rapido suporte digital tela rede tutorial porta sopro folha dura teto rato quero porta falar treino salto rapido suporte digital tela rede tutorial porta sopro folha dura teto',
      'rapido suporte digital tela rede tutorial porta sopro folha dura projeto setor trofeu aula treino rato teto rapido suporte digital tela rede tutorial porta sopro folha dura projeto setor trofeu aula treino',
      'tutorial porta sopro folha dura projeto setor digital trofeu aula treino rapido suporte rede tela rota prato tutorial porta sopro folha dura projeto setor digital trofeu aula treino rapido suporte rede tela',
      'projeto setor digital trofeu aula treino rapido suporte rede tela tutorial folha dura porta sopro rato doce projeto setor digital trofeu aula treino rapido suporte rede tela tutorial folha dura porta sopro',
    ]
  },
  {
    id: 8, nivel: 2, titulo: 'Linha Inferior Esquerda', cor: 'rose',
    descricao: 'Teclas Z X C V — dedos descem da home row.',
    teclas: ['z', 'x', 'c', 'v'],
    dica: 'Após Z, X, C ou V, os dedos voltam para A, S, D, F imediatamente!',
    textos: [
      'zzz xxx ccc vvv zxcv zxcv zxcv cave vex cox zinc vex cave coxa vaca vice vexa zica voz vez coco vivo cave zzz xxx ccc vvv zxcv cave vex cox zinc vex cave coxa vaca vice vexa zica voz vez coco vivo zxcv cave',
      'cave vex cox zinc vex cave coxa vaca vice vexa zica voz vez coco vaca cave vice coxa vexa zica vez vox vivo cave vex cox zinc vex cave coxa vaca vice vexa zica voz vez coco vaca cave vice coxa vexa zica vez',
      'vaca cave vice coxa vexa zica voz vez coco cave vex cox zinc vaca cave vice coxa vexa voz vez cave vex vivo vaca cave vice coxa vexa zica voz vez coco cave vex cox zinc vaca cave vice coxa vexa voz vez cave',
      'coxa vaca vice cave zinc vex coco voz vez vexa zica cave vex cox zinc vaca vice cave coxa vez vivo voz cave coxa vaca vice cave zinc vex coco voz vez vexa zica cave vex cox zinc vaca vice cave coxa vez vivo',
      'voz vez vaca cave zica coxa vivo vex cox zinc cave vice coxa vexa zica voz vez coco vaca cave zinc vex vez voz vez vaca cave zica coxa vivo vex cox zinc cave vice coxa vexa zica voz vez coco vaca cave zinc',
    ]
  },
  {
    id: 9, nivel: 2, titulo: 'Linha Inferior Direita + Tudo', cor: 'amber',
    descricao: 'Teclas B N M — e depois pratique com o teclado inteiro.',
    teclas: ['b', 'n', 'm'],
    dica: 'Você quase sabe o teclado todo! Mantenha o ritmo constante.',
    textos: [
      'bbb nnn mmm bnm bnm nome menu bonito banda numero bem boca mano nobre bom mundo mar bambu boneca numero bbb nnn mmm bnm nome menu bonito banda numero bem boca mano nobre bom mundo mar bambu boneca numero bem',
      'nome menu bonito banda numero bem boca mano nobre bom mundo mar bambu boneca numero nome menu bonito bem nome menu bonito banda numero bem boca mano nobre bom mundo mar bambu boneca numero nome menu bonito',
      'numero nome menu bonito banda bom mundo mar bambu boneca nome menu bonito bem nobre boca mano banda mar numero nome menu bonito banda bom mundo mar bambu boneca nome menu bonito bem nobre boca mano banda',
      'boca mano nobre bom mundo mar bambu boneca mundo numero bem man nome menu bonito banda bem nobre boca mano boca mano nobre bom mundo mar bambu boneca mundo numero bem man nome menu bonito banda bem nobre boca',
      'bambu boneca mundo numero bem man nome menu bonito banda boca mano nobre bom mundo mar bambu bem mano nome bambu boneca mundo numero bem man nome menu bonito banda boca mano nobre bom mundo mar bambu bem mano',
    ]
  },

  // ═══════════ NÍVEL 3 — AVANÇADO ═══════════
  {
    id: 10, nivel: 3, titulo: 'Termos Digitais Básicos', cor: 'blue',
    descricao: 'Palavras curtas do mundo da internet que você vai usar toda hora.',
    teclas: ['todas'],
    dica: 'Essas são as palavras do seu dia a dia no computador. Conheça cada uma!',
    textos: [
      'mouse link senha email site chat web login wifi rede usuario browser janela arquivo pasta sistema acesso mouse link senha email site chat web login wifi rede usuario browser janela arquivo pasta sistema acesso',
      'senha mouse email login site web link chat wifi rede navegador janela arquivo pasta usuario sistema acesso senha mouse email login site web link chat wifi rede navegador janela arquivo pasta usuario sistema',
      'wifi rede senha link site login email usuario mouse browser janela aplicativo pasta arquivo sistema chat web wifi rede senha link site login email usuario mouse browser janela aplicativo pasta arquivo sistema',
      'browser site link senha email login wifi rede mouse janela arquivo pasta usuario sistema acesso web chat browser site link senha email login wifi rede mouse janela arquivo pasta usuario sistema acesso web',
      'chat web login email mouse senha site link wifi rede browser janela arquivo pasta usuario sistema acesso rede chat web login email mouse senha site link wifi rede browser janela arquivo pasta usuario sistema',
    ]
  },
  {
    id: 11, nivel: 3, titulo: 'Comandos do Computador', cor: 'green',
    descricao: 'Verbos de ação em TI — o vocabulário de quem controla o computador.',
    teclas: ['todas'],
    dica: 'Cada palavra aqui é um comando que você vai dar ao computador!',
    textos: [
      'salvar arquivo pasta copiar colar criar abrir fechar deletar renomear mover imprimir formatar instalar salvar arquivo pasta copiar colar criar abrir fechar deletar renomear mover imprimir formatar instalar',
      'abrir fechar copiar colar arquivo pasta salvar deletar renomear mover imprimir formatar instalar criar abrir fechar copiar colar arquivo pasta salvar deletar renomear mover imprimir formatar instalar criar',
      'criar pasta salvar arquivo copiar colar abrir fechar deletar renomear mover imprimir formatar instalar criar pasta salvar arquivo copiar colar abrir fechar deletar renomear mover imprimir formatar instalar',
      'deletar renomear mover copiar salvar arquivo abrir fechar criar pasta colar imprimir formatar instalar deletar renomear mover copiar salvar arquivo abrir fechar criar pasta colar imprimir formatar instalar',
      'colar copiar recortar salvar criar pasta abrir fechar deletar renomear mover imprimir formatar instalar colar copiar recortar salvar criar pasta abrir fechar deletar renomear mover imprimir formatar instalar',
    ]
  },
  {
    id: 12, nivel: 3, titulo: 'Frases do Dia a Dia', cor: 'purple',
    descricao: 'Frases completas simulando conversas e interações no computador.',
    teclas: ['todas'],
    dica: 'Use o espaço com o polegar! Mantenha o ritmo e não olhe para o teclado.',
    textos: [
      'bom dia professor preciso de ajuda com o mouse nao estou conseguindo clicar no arquivo correto e gostaria de saber como posso salvar minha atividade e enviar ao senhor pelo sistema hoje',
      'como faco para salvar o arquivo no computador preciso entregar a atividade ainda hoje para o professor e nao sei onde clicar para abrir a pasta e anexar o documento no sistema da escola',
      'nao consigo abrir o site pode me ajudar por favor quero acessar o sistema e fazer o login mas a senha nao esta funcionando e nao sei como recuperar meu acesso para entregar a tarefa',
      'terminei a atividade e quero enviar agora como faco para anexar o arquivo no sistema de entregas preciso de ajuda para abrir a pasta certa e selecionar o documento que quero enviar',
      'vou copiar o texto e colar na pasta certa depois vou salvar tudo e enviar para o professor pelo chat aprendi a usar o mouse para clicar e o teclado para digitar e agora consigo fazer tudo',
    ]
  },
  {
    id: 13, nivel: 3, titulo: 'Comunicação e Envio', cor: 'orange',
    descricao: 'Frases simulando o uso do chat, entrega de tarefas e comunicação digital.',
    teclas: ['todas'],
    dica: 'Digitar frases inteiras é o objetivo final. Fluidez vence velocidade!',
    textos: [
      'vou enviar minha atividade agora obrigado ja organizei todos os arquivos na pasta correta do sistema e copiei os documentos para o local certo antes de fechar o computador hoje cedo',
      'ja entrei no sistema e fiz o login com sucesso agora vou abrir a atividade e comecar a responder cada questao com cuidado para entregar tudo certinho antes do prazo final de hoje',
      'abri a pasta e copiei todos os arquivos para o local correto agora vou salvar e enviar ao professor que pediu para entregar a atividade no sistema digital da escola ate o final do dia',
      'preciso de mais tempo para terminar a tarefa posso entregar amanha professor obrigado pela compreensao vou fazer tudo com cuidado e garantir que os arquivos estejam na pasta correta',
      'enviei o email com o arquivo em anexo hoje de manha espero que chegue corretamente ao destinatario certo e que o professor consiga abrir e ler o documento sem nenhum problema no sistema',
    ]
  },
  {
    id: 14, nivel: 3, titulo: 'Vocabulário Técnico de TI', cor: 'teal',
    descricao: 'Termos técnicos do dia a dia de quem trabalha com tecnologia.',
    teclas: ['todas'],
    dica: 'Esses termos vão aparecer bastante no seu curso. Treine-os com atenção!',
    textos: [
      'rede dados codigo wifi sistema programa usuario tela monitor teclado arquivo backup servidor digital rede dados codigo wifi sistema programa usuario tela monitor teclado arquivo backup servidor digital',
      'tela monitor teclado arquivo backup servidor digital ferramenta software hardware suporte navegador rede tela monitor teclado arquivo backup servidor digital ferramenta software hardware suporte navegador',
      'digital ferramenta software hardware suporte navegador janela aplicativo instalacao sistema rede dados digital ferramenta software hardware suporte navegador janela aplicativo instalacao sistema rede dados',
      'navegador janela aplicativo instalacao sistema rede dados codigo wifi programa usuario backup servidor navegador janela aplicativo instalacao sistema rede dados codigo wifi programa usuario backup servidor',
      'codigo fonte arquivo pasta servidor digital rede dados wifi sistema programa usuario tela monitor backup codigo fonte arquivo pasta servidor digital rede dados wifi sistema programa usuario tela monitor backup',
    ]
  },
  {
    id: 15, nivel: 3, titulo: 'Frases Tecnológicas', cor: 'rose',
    descricao: 'Frases completas sobre tecnologia para ganhar fluência.',
    teclas: ['todas'],
    dica: 'Tente atingir pelo menos 20 WPM aqui sem erros. Vá devagar no começo!',
    textos: [
      'o computador e uma ferramenta poderosa para aprender e trabalhar melhor no dia a dia de qualquer pessoa seja ela estudante trabalhador ou aposentado que precisa usar a tecnologia com mais confianca',
      'salve seus arquivos com frequencia para nao perder seu trabalho e sempre organize as pastas com nomes claros e descritivos para encontrar facilmente os documentos quando precisar deles no futuro',
      'a internet conecta pessoas ao redor do mundo todo e permite o acesso a informacoes recursos digitais cursos online videos aulas e tudo o que precisamos para aprender e nos desenvolver cada dia mais',
      'aprenda a usar o teclado com os dez dedos corretos e sua velocidade vai aumentar com a pratica diaria porque a memoria muscular se desenvolve com repeticao e dedicacao ao longo do tempo de treino',
      'o letramento digital e essencial no mundo de hoje pois a tecnologia esta presente em todos os lugares do trabalho da escola da saude e do comercio e quem sabe usar bem o computador tem mais oportunidades',
    ]
  },
  {
    id: 16, nivel: 3, titulo: 'Pontuação Essencial', cor: 'amber',
    descricao: 'Use vírgula, ponto, interrogação e maiúsculas com o Shift.',
    teclas: ['todas'],
    dica: 'Use o Shift com o dedo mindinho oposto à letra que vai digitar!',
    textos: [
      'Ola, professor. Tudo bem? Preciso salvar o link. Pode me ajudar? Obrigado, vou tentar novamente. Ja abri a pasta. Onde salvo o arquivo? Obrigado pela ajuda, professor. Vou tentar agora.',
      'Bom dia! Como abro a pasta? Obrigado, professor. Vou tentar. Salvei o arquivo. Esta tudo certo assim? Pode conferir? Sim, entendi. Vou salvar e enviar. Obrigado, professor. Ate logo!',
      'Eu copiei. Agora vou colar. Esta correto assim? Sim, funcionou! Obrigado, professor. Vou salvar agora. Terminei. Posso enviar? Sim. Ate logo, professor. Obrigado pela paciencia comigo.',
      'Sim, entendi. Vou salvar o arquivo e enviar. Pode conferir? Obrigado pela ajuda, professor. Ate logo! Ja salvei tudo. Esta na pasta certa. Posso fechar o sistema? Obrigado, professor.',
      'Ok, professor. Terminei a tarefa. Posso enviar? Vou anexar o arquivo. Esta tudo pronto. Obrigado! Ja organizei as pastas. Copiei os arquivos. Salvei tudo. Estou pronto para enviar!',
    ]
  },
  {
    id: 17, nivel: 3, titulo: 'Velocidade Máxima', cor: 'emerald',
    descricao: 'Textos longos para medir sua velocidade real de digitação.',
    teclas: ['todas'],
    dica: 'Este é o desafio final. Respire, mantenha o ritmo e confie nos seus dedos!',
    textos: [
      'o letramento digital e essencial no mundo moderno onde a tecnologia esta presente em todos os aspectos da vida cotidiana e profissional',
      'aprender a digitar com todos os dedos aumenta sua produtividade e reduz o cansaco nas maos ao longo do dia de trabalho no computador',
      'a informatica basica inclui conhecer o teclado o mouse os arquivos e a navegacao segura e eficiente na internet do dia a dia',
      'com pratica diaria voce consegue aumentar sua velocidade de digitacao e cometer cada vez menos erros ao escrever textos e mensagens',
      'salvar copiar colar criar arquivos e pastas sao habilidades fundamentais para qualquer pessoa que usa computador no trabalho ou estudo',
    ]
  },
];

// ——— Mapeamento de Dedos por Dedo ———
type FingerType = 'L5' | 'L4' | 'L3' | 'L2' | 'L1' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';

const FINGER_BG_CLASSES: Record<FingerType, { bg: string, text: string, border: string, active: string }> = {
  L5: { bg: 'bg-red-500/10 dark:bg-red-500/5', border: 'border-red-500/30', text: 'text-red-600 dark:text-red-400', active: 'bg-red-500 text-white shadow-red-500/50 shadow-lg border-transparent ring-2 ring-red-500' },
  L4: { bg: 'bg-orange-500/10 dark:bg-orange-500/5', border: 'border-orange-500/30', text: 'text-orange-600 dark:text-orange-400', active: 'bg-orange-500 text-white shadow-orange-500/50 shadow-lg border-transparent ring-2 ring-orange-500' },
  L3: { bg: 'bg-amber-500/10 dark:bg-amber-500/5', border: 'border-amber-500/30', text: 'text-amber-600 dark:text-amber-400', active: 'bg-amber-500 text-white shadow-amber-500/50 shadow-lg border-transparent ring-2 ring-amber-500' },
  L2: { bg: 'bg-emerald-500/10 dark:bg-emerald-500/5', border: 'border-emerald-500/30', text: 'text-emerald-600 dark:text-emerald-400', active: 'bg-emerald-500 text-white shadow-emerald-500/50 shadow-lg border-transparent ring-2 ring-emerald-500' },
  L1: { bg: 'bg-slate-500/10 dark:bg-slate-500/5', border: 'border-slate-500/30', text: 'text-slate-600 dark:text-slate-400', active: 'bg-slate-500 text-white shadow-slate-500/50 shadow-lg border-transparent ring-2 ring-slate-500' },
  R1: { bg: 'bg-slate-500/10 dark:bg-slate-500/5', border: 'border-slate-500/30', text: 'text-slate-600 dark:text-slate-400', active: 'bg-slate-500 text-white shadow-slate-500/50 shadow-lg border-transparent ring-2 ring-slate-500' },
  R2: { bg: 'bg-blue-500/10 dark:bg-blue-500/5', border: 'border-blue-500/30', text: 'text-blue-600 dark:text-blue-400', active: 'bg-blue-500 text-white shadow-blue-500/50 shadow-lg border-transparent ring-2 ring-blue-500' },
  R3: { bg: 'bg-indigo-500/10 dark:bg-indigo-500/5', border: 'border-indigo-500/30', text: 'text-indigo-600 dark:text-indigo-400', active: 'bg-indigo-500 text-white shadow-indigo-500/50 shadow-lg border-transparent ring-2 ring-indigo-500' },
  R4: { bg: 'bg-purple-500/10 dark:bg-purple-500/5', border: 'border-purple-500/30', text: 'text-purple-600 dark:text-purple-400', active: 'bg-purple-500 text-white shadow-purple-500/50 shadow-lg border-transparent ring-2 ring-purple-500' },
  R5: { bg: 'bg-rose-500/10 dark:bg-rose-500/5', border: 'border-rose-500/30', text: 'text-rose-600 dark:text-rose-400', active: 'bg-rose-500 text-white shadow-rose-500/50 shadow-lg border-transparent ring-2 ring-rose-500' }
};

const getFingerForKey = (key: string): { hand: 'left' | 'right', finger: 'thumb' | 'index' | 'middle' | 'ring' | 'pinky', label: string } => {
  const k = key.toLowerCase();
  
  if (k === ' ') {
    return { hand: 'right', finger: 'thumb', label: 'Polegar D.' };
  }
  
  const leftPinky = ['1', 'q', 'a', 'z', 'tab', 'capslock', 'shift_l', 'ctrl_l', 'win_l', 'alt_l', '`', '~', "'", '"', '\\', '|'];
  const leftRing = ['2', 'w', 's', 'x'];
  const leftMiddle = ['3', 'e', 'd', 'c'];
  const leftIndex = ['4', 'r', 'f', 'v', '5', 't', 'g', 'b'];
  
  const rightIndex = ['6', 'y', 'h', 'n', '7', 'u', 'j', 'm'];
  const rightMiddle = ['8', 'i', 'k', ','];
  const rightRing = ['9', 'o', 'l', '.'];
  const rightPinky = ['0', 'p', ';', 'ç', '/', '-', '_', '=', '+', '[', '{', ']', '}', 'enter', 'backspace', 'delete', 'altgr', 'shift_r', 'ctrl_r', 'win_r', "'", '"', '?', ':', '´', '`', '~', '^'];
  
  if (leftPinky.includes(k)) return { hand: 'left', finger: 'pinky', label: 'Mindinho E.' };
  if (leftRing.includes(k)) return { hand: 'left', finger: 'ring', label: 'Anelar E.' };
  if (leftMiddle.includes(k)) return { hand: 'left', finger: 'middle', label: 'Médio E.' };
  if (leftIndex.includes(k)) return { hand: 'left', finger: 'index', label: 'Indicador E.' };
  
  if (rightIndex.includes(k)) return { hand: 'right', finger: 'index', label: 'Indicador D.' };
  if (rightMiddle.includes(k)) return { hand: 'right', finger: 'middle', label: 'Médio D.' };
  if (rightRing.includes(k)) return { hand: 'right', finger: 'ring', label: 'Anelar D.' };
  if (rightPinky.includes(k)) return { hand: 'right', finger: 'pinky', label: 'Mindinho D.' };
  
  return { hand: 'right', finger: 'index', label: 'Indicador D.' };
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
        { key: "'", display: "'", shiftDisplay: '"', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '1', display: '1', shiftDisplay: '!', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '2', display: '2', shiftDisplay: '@', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '3', display: '3', shiftDisplay: '#', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '4', display: '4', shiftDisplay: '$', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '5', display: '5', shiftDisplay: '%', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '6', display: '6', shiftDisplay: '¨', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '7', display: '7', shiftDisplay: '&', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '8', display: '8', shiftDisplay: '*', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '9', display: '9', shiftDisplay: '(', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '0', display: '0', shiftDisplay: ')', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '-', display: '-', shiftDisplay: '_', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '=', display: '=', shiftDisplay: '+', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'backspace', display: 'apagar', finger: 'R5', width: 'flex-1 min-w-[55px] h-10 sm:h-11 text-[10px]' }
      ],
      [
        { key: 'tab', display: 'tab', finger: 'L5', width: 'w-14 sm:w-16 h-10 sm:h-11 text-xs' },
        { key: 'q', display: 'Q', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'w', display: 'W', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'e', display: 'E', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'r', display: 'R', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 't', display: 'T', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'y', display: 'Y', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'u', display: 'U', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'i', display: 'I', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'o', display: 'O', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'p', display: 'P', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '´', display: '´', shiftDisplay: '`', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '[', display: '[', shiftDisplay: '{', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'enter', display: 'enter', finger: 'R5', width: 'flex-1 min-w-[50px] h-10 sm:h-11 text-xs' }
      ],
      [
        { key: 'capslock', display: 'caps', finger: 'L5', width: 'w-16 sm:w-18 h-10 sm:h-11 text-xs' },
        { key: 'a', display: 'A', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 's', display: 'S', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'd', display: 'D', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'f', display: 'F', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'g', display: 'G', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'h', display: 'H', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'j', display: 'J', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'k', display: 'K', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'l', display: 'L', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'ç', display: 'Ç', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '~', display: '~', shiftDisplay: '^', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ']', display: ']', shiftDisplay: '}', finger: 'R5', width: 'flex-1 min-w-[45px] h-10 sm:h-11' }
      ],
      [
        { key: 'shift_l', display: 'shift', finger: 'L5', width: 'w-12 sm:w-14 h-10 sm:h-11 text-xs' },
        { key: '\\', display: '\\', shiftDisplay: '|', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'z', display: 'Z', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'x', display: 'X', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'c', display: 'C', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'v', display: 'V', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'b', display: 'B', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'n', display: 'N', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'm', display: 'M', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ',', display: ',', shiftDisplay: '<', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '.', display: '.', shiftDisplay: '>', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ';', display: ';', shiftDisplay: ':', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '/', display: '/', shiftDisplay: '?', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'shift_r', display: 'shift', finger: 'R5', width: 'flex-1 h-10 sm:h-11 text-xs' }
      ],
      [
        { key: 'ctrl_l', display: 'ctrl', finger: 'L5', width: 'w-10 sm:w-12 h-10 sm:h-11 text-xs' },
        { key: 'win_l', display: 'win', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-[10px]' },
        { key: 'alt_l', display: 'alt', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-xs' },
        { key: ' ', display: 'barra de espaço', finger: 'L1', width: 'w-[180px] sm:w-[260px] md:w-[300px] h-10 sm:h-11 text-xs' },
        { key: 'altgr', display: 'alt gr', finger: 'R1', width: 'w-10 sm:w-11 h-10 sm:h-11 text-[10px]' },
        { key: 'win_r', display: 'win', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-[10px]' },
        { key: 'ctrl_r', display: 'ctrl', finger: 'R5', width: 'flex-1 h-10 sm:h-11 text-xs' }
      ]
    ];
  } else {
    return [
      [
        { key: '`', display: '`', shiftDisplay: '~', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '1', display: '1', shiftDisplay: '!', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '2', display: '2', shiftDisplay: '@', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '3', display: '3', shiftDisplay: '#', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '4', display: '4', shiftDisplay: '$', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '5', display: '5', shiftDisplay: '%', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '6', display: '6', shiftDisplay: '^', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '7', display: '7', shiftDisplay: '&', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '8', display: '8', shiftDisplay: '*', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '9', display: '9', shiftDisplay: '(', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '0', display: '0', shiftDisplay: ')', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '-', display: '-', shiftDisplay: '_', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '=', display: '=', shiftDisplay: '+', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'backspace', display: 'delete', finger: 'R5', width: 'flex-1 min-w-[55px] h-10 sm:h-11 text-xs' }
      ],
      [
        { key: 'tab', display: 'tab', finger: 'L5', width: 'w-14 sm:w-16 h-10 sm:h-11 text-xs' },
        { key: 'q', display: 'Q', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'w', display: 'W', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'e', display: 'E', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'r', display: 'R', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 't', display: 'T', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'y', display: 'Y', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'u', display: 'U', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'i', display: 'I', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'o', display: 'O', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'p', display: 'P', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '[', display: '[', shiftDisplay: '{', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ']', display: ']', shiftDisplay: '}', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '\\', display: '\\', shiftDisplay: '|', finger: 'R5', width: 'flex-1 min-w-[40px] h-10 sm:h-11' }
      ],
      [
        { key: 'capslock', display: 'caps', finger: 'L5', width: 'w-16 sm:w-18 h-10 sm:h-11 text-xs' },
        { key: 'a', display: 'A', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 's', display: 'S', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'd', display: 'D', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'f', display: 'F', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'g', display: 'G', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'h', display: 'H', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'j', display: 'J', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'k', display: 'K', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'l', display: 'L', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ';', display: ';', shiftDisplay: ':', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: "'", display: "'", shiftDisplay: '"', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'enter', display: 'enter', finger: 'R5', width: 'flex-1 h-10 sm:h-11 text-xs' }
      ],
      [
        { key: 'shift_l', display: 'shift', finger: 'L5', width: 'w-20 sm:w-22 h-10 sm:h-11 text-xs' },
        { key: 'z', display: 'Z', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'x', display: 'X', finger: 'L4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'c', display: 'C', finger: 'L3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'v', display: 'V', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'b', display: 'B', finger: 'L2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'n', display: 'N', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'm', display: 'M', finger: 'R2', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: ',', display: ',', shiftDisplay: '<', finger: 'R3', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '.', display: '.', shiftDisplay: '>', finger: 'R4', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: '/', display: '/', shiftDisplay: '?', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11' },
        { key: 'shift_r', display: 'shift', finger: 'R5', width: 'flex-1 h-10 sm:h-11 text-xs' }
      ],
      [
        { key: 'ctrl_l', display: 'ctrl', finger: 'L5', width: 'w-10 sm:w-12 h-10 sm:h-11 text-xs' },
        { key: 'win_l', display: 'alt/cmd', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-[9px]' },
        { key: 'alt_l', display: 'alt', finger: 'L5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-xs' },
        { key: ' ', display: 'space', finger: 'L1', width: 'w-[180px] sm:w-[260px] md:w-[300px] h-10 sm:h-11 text-xs' },
        { key: 'alt_r', display: 'alt', finger: 'R1', width: 'w-10 sm:w-11 h-10 sm:h-11 text-xs' },
        { key: 'win_r', display: 'alt/cmd', finger: 'R5', width: 'w-10 sm:w-11 h-10 sm:h-11 text-[9px]' },
        { key: 'ctrl_r', display: 'ctrl', finger: 'R5', width: 'flex-1 h-10 sm:h-11 text-xs' }
      ]
    ];
  }
};

// ——— Visual Hands Overlay Components ———
const VisualHandsLeft: React.FC<{ activeFinger: string | null }> = ({ activeFinger }) => {
  const getFingerIndicator = (finger: 'pinky' | 'ring' | 'middle' | 'index' | 'thumb', cx: number, cy: number) => {
    const isActive = activeFinger === finger;
    if (isActive) {
      return (
        <g key={finger}>
          <circle cx={cx} cy={cy} r="9" className="fill-primary/20 stroke-primary/30 animate-ping" />
          <circle cx={cx} cy={cy} r="5" className="fill-primary stroke-white stroke-2 shadow-lg" />
        </g>
      );
    }
    return <circle key={finger} cx={cx} cy={cy} r="3.5" className="fill-slate-400 dark:fill-slate-600 stroke-slate-500 dark:stroke-slate-500 stroke-1" />;
  };

  return (
    <svg viewBox="0 0 150 200" className="w-full h-full text-slate-400/30 dark:text-slate-700/40">
      <path
        d="M 90,200 
           C 90,200 110,160 110,140 
           C 110,120 130,125 140,110 
           C 148,102 140,90 130,100 
           C 118,112 105,120 105,112 
           C 105,95 105,50 105,35 
           C 105,27 92,27 92,35 
           C 92,55 90,90 90,90 
           C 90,90 82,60 75,22 
           C 71,14 60,18 63,26 
           C 71,48 78,92 78,92 
           C 78,92 66,70 58,40 
           C 54,32 43,36 47,44 
           C 55,66 63,98 63,98 
           C 63,98 51,82 43,62 
           C 39,54 28,58 32,66 
           C 40,86 52,114 52,130 
           C 52,150 56,178 40,200 
           Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-400/50 dark:text-slate-500/50"
      />
      {getFingerIndicator('thumb', 132, 102)}
      {getFingerIndicator('index', 98, 35)}
      {getFingerIndicator('middle', 69, 22)}
      {getFingerIndicator('ring', 49, 40)}
      {getFingerIndicator('pinky', 32, 66)}
    </svg>
  );
};

const VisualHandsRight: React.FC<{ activeFinger: string | null }> = ({ activeFinger }) => {
  const getFingerIndicator = (finger: 'pinky' | 'ring' | 'middle' | 'index' | 'thumb', cx: number, cy: number) => {
    const isActive = activeFinger === finger;
    if (isActive) {
      return (
        <g key={finger}>
          <circle cx={cx} cy={cy} r="9" className="fill-primary/20 stroke-primary/30 animate-ping" />
          <circle cx={cx} cy={cy} r="5" className="fill-primary stroke-white stroke-2 shadow-lg" />
        </g>
      );
    }
    return <circle key={finger} cx={cx} cy={cy} r="3.5" className="fill-slate-400 dark:fill-slate-600 stroke-slate-500 dark:stroke-slate-500 stroke-1" />;
  };

  return (
    <svg viewBox="0 0 150 200" className="w-full h-full text-slate-400/30 dark:text-slate-700/40">
      <path
        d="M 60,200 
           C 60,200 40,160 40,140 
           C 40,120 20,125 10,110 
           C 2,102 10,90 20,100 
           C 32,112 45,120 45,112 
           C 45,95 45,50 45,35 
           C 45,27 58,27 58,35 
           C 58,55 60,90 60,90 
           C 60,90 68,60 75,22 
           C 79,14 90,18 87,26 
           C 79,48 72,92 72,92 
           C 72,92 84,70 92,40 
           C 96,32 107,36 103,44 
           C 95,66 87,98 87,98 
           C 87,98 99,82 107,62 
           C 111,54 122,58 118,66 
           C 110,86 98,114 98,130 
           C 98,150 94,178 110,200 
           Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-slate-400/50 dark:text-slate-500/50"
      />
      {getFingerIndicator('thumb', 18, 102)}
      {getFingerIndicator('index', 52, 35)}
      {getFingerIndicator('middle', 81, 22)}
      {getFingerIndicator('ring', 101, 40)}
      {getFingerIndicator('pinky', 118, 66)}
    </svg>
  );
};

// ——— Sons Dinâmicos Web Audio API ———
const playClickSound = (volume: number = 0.5) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04);
    
    gain.gain.setValueAtTime(volume * 0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  } catch (e) {
    console.error('Audio play error', e);
  }
};

const playErrorSound = (volume: number = 0.3) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(180, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.16);
  } catch (e) {
    console.error('Audio play error', e);
  }
};

const corMap: Record<string, { bg: string; border: string; text: string; badge: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',    badge: 'bg-blue-500' },
  green:   { bg: 'bg-green-50',   border: 'border-green-200',  text: 'text-green-700',   badge: 'bg-green-500' },
  purple:  { bg: 'bg-purple-50',  border: 'border-purple-200', text: 'text-purple-700',  badge: 'bg-purple-500' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200', text: 'text-orange-700',  badge: 'bg-orange-500' },
  teal:    { bg: 'bg-teal-50',    border: 'border-teal-200',   text: 'text-teal-700',    badge: 'bg-teal-500' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',   text: 'text-rose-700',    badge: 'bg-rose-500' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',  text: 'text-amber-700',   badge: 'bg-amber-500' },
  indigo:  { bg: 'bg-indigo-50',  border: 'border-indigo-200', text: 'text-indigo-700',  badge: 'bg-indigo-500' },
  cyan:    { bg: 'bg-cyan-50',    border: 'border-cyan-200',   text: 'text-cyan-700',    badge: 'bg-cyan-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700', badge: 'bg-emerald-500' },
};

// ——— Modal de Posicionamento dos Dedos ———
const ModalPostura: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
    <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-extrabold text-xl">🏠 A Posição de Descanso</h2>
            <p className="text-emerald-100 text-xs mt-1">Aprenda antes de começar a digitar</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 transition-colors">
            <HugeiconsIcon icon={Cancel01Icon} size={18} className="text-white" />
          </button>
        </div>
      </div>

      <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">

        {/* Calombinhos */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
          <p className="text-sm font-extrabold text-emerald-700 mb-1">👆 Passo 1 — Encontre os "Calombinhos"</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Passe as pontas dos <strong>indicadores</strong> nas teclas <strong>F</strong> e <strong>J</strong>. 
            Sente uma pequena linha em relevo? Elas existem exatamente para você posicionar as mãos 
            <strong> sem precisar olhar para o teclado!</strong>
          </p>
        </div>

        {/* Mãos */}
        <div className="grid grid-cols-2 gap-4">
          {/* Mão Esquerda */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
            <p className="text-xs font-extrabold text-blue-700 mb-3 flex items-center gap-1.5">
              🖐️ Mão Esquerda
            </p>
            <div className="space-y-2">
              {[
                { dedo: 'Mindinho', tecla: 'A', cor: 'bg-red-400' },
                { dedo: 'Anelar', tecla: 'S', cor: 'bg-orange-400' },
                { dedo: 'Médio', tecla: 'D', cor: 'bg-yellow-400' },
                { dedo: 'Indicador ★', tecla: 'F', cor: 'bg-green-500' },
              ].map(({ dedo, tecla, cor }) => (
                <div key={tecla} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${cor} text-white text-xs font-extrabold flex items-center justify-center shadow-sm`}>
                    {tecla}
                  </div>
                  <span className="text-xs text-on-surface-variant font-semibold">{dedo}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mão Direita */}
          <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
            <p className="text-xs font-extrabold text-purple-700 mb-3 flex items-center gap-1.5">
              🤚 Mão Direita
            </p>
            <div className="space-y-2">
              {[
                { dedo: 'Indicador ★', tecla: 'J', cor: 'bg-blue-500' },
                { dedo: 'Médio', tecla: 'K', cor: 'bg-purple-400' },
                { dedo: 'Anelar', tecla: 'L', cor: 'bg-pink-400' },
                { dedo: 'Mindinho', tecla: 'Ç', cor: 'bg-rose-400' },
              ].map(({ dedo, tecla, cor }) => (
                <div key={tecla} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-lg ${cor} text-white text-xs font-extrabold flex items-center justify-center shadow-sm`}>
                    {tecla}
                  </div>
                  <span className="text-xs text-on-surface-variant font-semibold">{dedo}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Polegares */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-300 text-slate-700 font-extrabold text-xs flex items-center justify-center shadow-sm leading-tight text-center">
            Espaço
          </div>
          <div>
            <p className="text-xs font-extrabold text-on-surface">👍 Os Polegares</p>
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Ficam levemente apoiados sobre a <strong>Barra de Espaço</strong>. 
              Qualquer polegar pode pressionar o espaço!
            </p>
          </div>
        </div>

        {/* Dica de ouro */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-xs font-extrabold text-amber-700 mb-1">✨ Dica de Ouro</p>
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Após digitar qualquer letra nas linhas de cima ou de baixo, 
            <strong> seu dedo deve voltar imediatamente</strong> para a sua tecla casa aqui no meio. 
            Isso é o segredo de quem digita rápido sem olhar!
          </p>
        </div>
      </div>

      <div className="p-5 border-t border-outline-variant/20">
        <button
          onClick={onClose}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-heading font-extrabold text-sm rounded-2xl shadow-md transition-all"
        >
          Entendido! Vamos treinar 💪
        </button>
      </div>
    </div>
  </div>
);

// ——————————————————————————————
//  COMPONENTE PRINCIPAL
// ——————————————————————————————
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
  const [elapsed, setElapsed] = useState(0);
  const [wpmLive, setWpmLive] = useState(0);
  const [resultado, setResultado] = useState<SessaoResultado | null>(null);
  const [progressos, setProgressos] = useState<ProgressoLicao[]>([]);
  const [salvando, setSalvando] = useState(false);

  // Preferências de customização do teclado
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
  const [volume, setVolume] = useState<number>(() => {
    const saved = localStorage.getItem('estudea_teclado_volume');
    return saved === null ? 50 : Number(saved);
  });
  const [showHands, setShowHands] = useState<boolean>(() => {
    const saved = localStorage.getItem('estudea_teclado_showhands');
    return saved === null ? true : saved === 'true';
  });
  const [showKeyboard, setShowKeyboard] = useState<boolean>(() => {
    const saved = localStorage.getItem('estudea_teclado_showkeyboard');
    return saved === null ? true : saved === 'true';
  });
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textoAlvo = licaoAtiva ? licaoAtiva.textos[textoIndex] : '';

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
    localStorage.setItem('estudea_teclado_volume', String(volume));
  }, [volume]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_showhands', String(showHands));
  }, [showHands]);
  useEffect(() => {
    localStorage.setItem('estudea_teclado_showkeyboard', String(showKeyboard));
  }, [showKeyboard]);

  // Captura global de foco para começar a digitar
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (licaoAtiva && !concluido && !mostrarGuia) {
        if (document.activeElement?.tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) {
          return;
        }
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [licaoAtiva, concluido, mostrarGuia]);

  // Mostrar guia automaticamente na primeira visita ao nível 1
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
    const { data } = await supabase
      .from('sessoes_digitacao')
      .select('licao_id, wpm, acuracia')
      .eq('aluno_id', session.user.id)
      .order('created_at', { ascending: false });
    if (!data) return;
    const mapa: Record<number, ProgressoLicao> = {};
    for (const row of data) {
      if (!mapa[row.licao_id] || row.wpm > mapa[row.licao_id].melhor_wpm) {
        mapa[row.licao_id] = {
          licao_id: row.licao_id, melhor_wpm: row.wpm,
          melhor_acuracia: row.acuracia, concluida: row.acuracia >= 85,
        };
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
    return { ...nivel, licoes, concluidas, desbloqueado: isNivelDesbloqueado(nivel.id) };
  });

  // Timer
  useEffect(() => {
    if (iniciado && !concluido) {
      timerRef.current = setInterval(() => {
        if (startTime) {
          const s = Math.floor((Date.now() - startTime) / 1000);
          setElapsed(s);
          if (digitado.length > 0 && s > 0) {
            const words = digitado.trim().split(/\s+/).filter(Boolean).length;
            setWpmLive(Math.round((words / s) * 60));
          }
        }
      }, 500);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [iniciado, concluido, startTime, digitado]);

  const handleInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (concluido) return;
    
    if (!iniciado) { 
      setIniciado(true); 
      setStartTime(Date.now()); 
    }
    
    const novosErros = new Set<number>();
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== textoAlvo[i]) novosErros.add(i);
    }
    
    // Play sound effects
    if (val.length > digitado.length) {
      const lastCharIndex = val.length - 1;
      const typedChar = val[lastCharIndex];
      const targetChar = textoAlvo[lastCharIndex];
      
      if (typedChar === targetChar) {
        if (soundEnabled) playClickSound(volume / 100);
      } else {
        if (soundEnabled) playErrorSound(volume / 100);
      }
    } else if (val.length < digitado.length) {
      // Backspace pressed
      if (soundEnabled) playClickSound((volume / 100) * 0.7);
    }
    
    setErros(novosErros);
    setDigitado(val);
    if (val.length >= textoAlvo.length) finalizarLicao(novosErros);
  }, [concluido, iniciado, textoAlvo, digitado, soundEnabled, volume]);

  const finalizarLicao = (novosErros: Set<number>) => {
    if (timerRef.current) clearInterval(timerRef.current);
    const duracao = startTime ? Math.max(1, Math.floor((Date.now() - startTime) / 1000)) : 1;
    const totalCaracteres = textoAlvo.length;
    const acuracia = Math.max(0, Math.round(((totalCaracteres - novosErros.size) / totalCaracteres) * 100));
    const words = textoAlvo.trim().split(/\s+/).length;
    const wpm = Math.round((words / duracao) * 60);
    setConcluido(true);
    setResultado({ wpm, acuracia, duracao, erros: novosErros.size });
    salvarSessao(wpm, acuracia, duracao);
  };

  const salvarSessao = async (wpm: number, acuracia: number, duracao: number) => {
    if (!session?.user?.id || !licaoAtiva) return;
    setSalvando(true);
    try {
      await supabase.from('sessoes_digitacao').insert({
        aluno_id: session.user.id, licao_id: licaoAtiva.id,
        wpm, acuracia, duracao_segundos: duracao,
      });
      await fetchProgressos();
    } finally { setSalvando(false); }
  };

  const resetLicao = (nextIndex?: number) => {
    setTextoIndex(nextIndex ?? (textoIndex + 1) % (licaoAtiva?.textos.length ?? 1));
    setDigitado(''); setErros(new Set()); setIniciado(false); setConcluido(false);
    setStartTime(null); setElapsed(0); setWpmLive(0); setResultado(null);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const abrirLicao = (licao: Licao) => {
    setLicaoAtiva(licao); setTextoIndex(0); setDigitado(''); setErros(new Set());
    setIniciado(false); setConcluido(false); setStartTime(null);
    setElapsed(0); setWpmLive(0); setResultado(null);
    setTimeout(() => inputRef.current?.focus(), 200);
  };

  const proximaLicao = () => {
    if (!licaoAtiva) return;
    const proxima = LICOES.find(l => l.id === licaoAtiva.id + 1);
    if (proxima && isLicaoDesbloqueada(proxima.id)) abrirLicao(proxima);
    else setLicaoAtiva(null);
  };

  const acuraciaLive = useMemo(() => {
    if (digitado.length === 0) return 100;
    return Math.max(0, Math.round(((digitado.length - erros.size) / digitado.length) * 100));
  }, [digitado, erros]);

  const teclaEsperada = textoAlvo[digitado.length] ?? '';
  const cores = licaoAtiva ? corMap[licaoAtiva.cor] : corMap.blue;
  const totalMelhorWpm = progressos.length > 0 ? Math.max(...progressos.map(p => p.melhor_wpm)) : 0;

  const activeFingerInfo = useMemo(() => {
    return getFingerForKey(teclaEsperada);
  }, [teclaEsperada]);

  const isKeyActive = useCallback((keyConfigKey: string): boolean => {
    const targetChar = teclaEsperada;
    if (!targetChar) return false;
    
    const targetLower = targetChar.toLowerCase();
    
    // 1. Direct match
    if (keyConfigKey === targetLower) return true;
    
    // 2. Spacebar match
    if (targetChar === ' ' && keyConfigKey === ' ') return true;
    
    // 3. Ç and ; layout mapping fallback
    if (targetLower === 'ç' && keyConfigKey === ';') return true;
    
    // 4. Shift key highlighting:
    // If typing an uppercase letter or standard shift characters
    const isShiftNeeded = targetChar !== targetLower || ['!', '@', '#', '$', '%', '¨', '&', '*', '(', ')', '_', '+', '{', '}', '|', ':', '"', '<', '>', '?', 'Ç', '^', '~'].includes(targetChar);
    
    if (isShiftNeeded) {
      const fingerInfo = getFingerForKey(targetLower);
      if (fingerInfo.hand === 'left' && keyConfigKey === 'shift_r') {
        return true;
      }
      if (fingerInfo.hand === 'right' && keyConfigKey === 'shift_l') {
        return true;
      }
    }
    
    return false;
  }, [teclaEsperada]);

  const fontSizeClasses = useMemo(() => {
    return {
      sm: 'typing-lines-container-sm typing-char-sm',
      md: 'typing-lines-container-md typing-char-md',
      lg: 'typing-lines-container-lg typing-char-lg'
    }[fontSize];
  }, [fontSize]);
  const totalConcluidas = progressos.filter(p => p.concluida).length;

  // ══════════════════════════════════════════
  //  VIEW 1 — Seletor de Níveis
  // ══════════════════════════════════════════
  if (!nivelAtivo && !licaoAtiva) {
    return (
      <div className="w-full space-y-8 animate-fade-in pb-12">
        {mostrarGuia && <ModalPostura onClose={() => setMostrarGuia(false)} />}

        <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <HugeiconsIcon icon={KeyboardIcon} size={28} className="text-primary" strokeWidth={2} />
            </div>
            <div>
              <h2 className="font-heading font-extrabold text-2xl text-on-surface">Treinador de Datilografia</h2>
              <p className="text-sm text-on-surface-variant/70 mt-0.5">
                17 lições em 3 níveis progressivos. Complete cada nível para avançar.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-6 mt-5 pt-5 border-t border-outline-variant/20">
            <div className="flex items-center gap-2">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={16} className="text-emerald-600" />
              <span className="text-xs font-bold text-on-surface-variant">
                {totalConcluidas} / {LICOES.length} lições concluídas
              </span>
            </div>
            {totalMelhorWpm > 0 && (
              <div className="flex items-center gap-2">
                <HugeiconsIcon icon={FireIcon} size={16} className="text-secondary" />
                <span className="text-xs font-bold text-on-surface-variant">
                  Melhor WPM: {totalMelhorWpm} pal/min
                </span>
              </div>
            )}
            <button
              onClick={() => setMostrarGuia(true)}
              className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors ml-auto"
            >
              <HugeiconsIcon icon={InformationCircleIcon} size={15} />
              Ver Guia de Postura
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {niveisStats.map((nivel) => {
            const percent = nivel.licoes.length > 0
              ? Math.round((nivel.concluidas / nivel.licoes.length) * 100) : 0;
            return (
              <button
                key={nivel.id}
                onClick={() => nivel.desbloqueado && setNivelAtivo(nivel.id)}
                disabled={!nivel.desbloqueado}
                className={`text-left p-6 rounded-2xl border-2 transition-all flex flex-col gap-4 group ${
                  nivel.desbloqueado
                    ? `${nivel.bg} ${nivel.border} hover:shadow-lg hover:scale-[1.02] cursor-pointer`
                    : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${nivel.desbloqueado ? nivel.badge : 'bg-slate-300'}`}>
                    {nivel.emoji}
                  </div>
                  {!nivel.desbloqueado && <HugeiconsIcon icon={LockPasswordIcon} size={20} className="text-slate-400" />}
                  {nivel.desbloqueado && nivel.concluidas === nivel.licoes.length && nivel.licoes.length > 0 && (
                    <span className={`text-[10px] font-extrabold ${nivel.text} bg-white border ${nivel.border} px-2.5 py-1 rounded-full`}>
                      Concluído ✓
                    </span>
                  )}
                </div>
                <div>
                  <p className={`text-[10px] font-extrabold uppercase tracking-widest mb-1 ${nivel.desbloqueado ? nivel.text : 'text-slate-400'}`}>
                    Nível {nivel.id} · {nivel.licoes.length} lições
                  </p>
                  <h3 className={`font-heading font-extrabold text-lg leading-tight ${nivel.desbloqueado ? 'text-on-surface' : 'text-slate-400'}`}>
                    {nivel.titulo}
                  </h3>
                  <p className={`text-xs mt-1 font-semibold ${nivel.desbloqueado ? nivel.text : 'text-slate-400'}`}>{nivel.subtitulo}</p>
                  <p className="text-xs text-on-surface-variant/60 mt-2 leading-relaxed">{nivel.descricao}</p>
                </div>
                {nivel.desbloqueado && (
                  <div>
                    <div className="flex justify-between text-[10px] font-bold text-on-surface-variant/60 mb-1.5">
                      <span>{nivel.concluidas}/{nivel.licoes.length} lições</span>
                      <span>{percent}%</span>
                    </div>
                    <div className="h-1.5 bg-white/60 rounded-full overflow-hidden border border-white">
                      <div className={`h-full rounded-full transition-all ${nivel.badge}`} style={{ width: `${percent}%` }} />
                    </div>
                  </div>
                )}
                {nivel.desbloqueado && (
                  <div className={`flex items-center gap-1.5 text-xs font-extrabold ${nivel.text} group-hover:gap-2.5 transition-all`}>
                    <span>{nivel.concluidas === nivel.licoes.length ? 'Rever lições' : 'Entrar no nível'}</span>
                    <HugeiconsIcon icon={ArrowRight01Icon} size={14} />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  VIEW 2 — Seletor de Lições do Nível
  // ══════════════════════════════════════════
  if (nivelAtivo && !licaoAtiva) {
    const nivel = NIVEIS.find(n => n.id === nivelAtivo)!;
    const licoesDoNivel = licoesPorNivel(nivelAtivo);

    return (
      <div className="w-full space-y-6 animate-fade-in pb-12">
        {mostrarGuia && <ModalPostura onClose={() => setMostrarGuia(false)} />}

        <div className={`${nivel.bg} border ${nivel.border} rounded-2xl p-5`}>
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setNivelAtivo(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              Todos os Níveis
            </button>
            {nivel.temGuiaPostura && (
              <button
                onClick={() => setMostrarGuia(true)}
                className={`flex items-center gap-1.5 text-xs font-extrabold ${nivel.text} hover:opacity-80 transition-opacity`}
              >
                <HugeiconsIcon icon={InformationCircleIcon} size={15} />
                Guia de Postura
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${nivel.badge}`}>
              {nivel.emoji}
            </div>
            <div>
              <p className={`text-[10px] font-extrabold uppercase tracking-widest ${nivel.text}`}>Nível {nivel.id} · {licoesDoNivel.length} lições</p>
              <h2 className={`font-heading font-extrabold text-xl ${nivel.text}`}>{nivel.titulo} — {nivel.subtitulo}</h2>
              <p className="text-xs text-on-surface-variant/70 mt-0.5">{nivel.descricao}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {licoesDoNivel.map((licao) => {
            const desbloqueada = isLicaoDesbloqueada(licao.id);
            const concluida = licaoConcluida(licao.id);
            const wpm = melhorWpm(licao.id);
            const c = corMap[licao.cor];
            return (
              <button
                key={licao.id}
                onClick={() => desbloqueada && abrirLicao(licao)}
                disabled={!desbloqueada}
                className={`text-left p-5 rounded-2xl border-2 transition-all group ${
                  desbloqueada
                    ? `${c.bg} ${c.border} hover:shadow-md hover:scale-[1.02] cursor-pointer`
                    : 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-extrabold ${desbloqueada ? c.badge : 'bg-slate-300'}`}>
                    {concluida ? '✓' : licao.id}
                  </div>
                  {!desbloqueada && <HugeiconsIcon icon={LockPasswordIcon} size={18} className="text-slate-400" />}
                  {concluida && (
                    <span className={`text-[10px] font-extrabold ${c.text} bg-white border ${c.border} px-2 py-0.5 rounded-full`}>Concluída ✓</span>
                  )}
                </div>
                <h3 className={`font-heading font-extrabold text-sm ${desbloqueada ? c.text : 'text-slate-400'}`}>{licao.titulo}</h3>
                <p className="text-[11px] text-on-surface-variant/60 mt-1 leading-relaxed">{licao.descricao}</p>
                {desbloqueada && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {licao.teclas[0] !== 'todas'
                      ? licao.teclas.map(t => (
                          <span key={t} className={`w-6 h-6 rounded-md border ${c.border} bg-white ${c.text} text-xs font-extrabold flex items-center justify-center shadow-sm uppercase`}>{t}</span>
                        ))
                      : <span className={`text-[10px] font-bold ${c.text}`}>Todas as teclas</span>
                    }
                  </div>
                )}
                {wpm > 0 && (
                  <div className={`mt-3 text-[10px] font-extrabold ${c.text} opacity-80`}>
                    ⚡ Melhor: {wpm} pal/min
                  </div>
                )}
                {desbloqueada && licao.dica && (
                  <div className="mt-3 text-[10px] text-on-surface-variant/50 italic border-t border-current/10 pt-2">
                    💡 {licao.dica}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════
  //  VIEW 3 — Área de Treino
  // ══════════════════════════════════════════
  if (!licaoAtiva) return null;
  const nivelDaLicao = NIVEIS.find(n => n.id === licaoAtiva.nivel)!;

  return (
    <div className="w-full space-y-5 animate-fade-in pb-12 relative">
      <style>{`
        .typing-lines-container-sm {
          background-image: linear-gradient(to bottom, transparent 39px, rgb(var(--color-outline-variant) / 0.15) 39px, rgb(var(--color-outline-variant) / 0.15) 40px);
          background-size: 100% 2.5rem;
          line-height: 2.5rem;
        }
        .typing-char-sm {
          font-size: 1.125rem;
          font-family: 'JetBrains Mono', 'Fira Code', Courier New, monospace;
          letter-spacing: 0.05em;
        }
        
        .typing-lines-container-md {
          background-image: linear-gradient(to bottom, transparent 47px, rgb(var(--color-outline-variant) / 0.15) 47px, rgb(var(--color-outline-variant) / 0.15) 48px);
          background-size: 100% 3rem;
          line-height: 3rem;
        }
        .typing-char-md {
          font-size: 1.45rem;
          font-family: 'JetBrains Mono', 'Fira Code', Courier New, monospace;
          letter-spacing: 0.06em;
        }
        
        .typing-lines-container-lg {
          background-image: linear-gradient(to bottom, transparent 59px, rgb(var(--color-outline-variant) / 0.15) 59px, rgb(var(--color-outline-variant) / 0.15) 60px);
          background-size: 100% 3.75rem;
          line-height: 3.75rem;
        }
        .typing-char-lg {
          font-size: 1.8rem;
          font-family: 'JetBrains Mono', 'Fira Code', Courier New, monospace;
          letter-spacing: 0.07em;
        }
      `}</style>

      {mostrarGuia && <ModalPostura onClose={() => setMostrarGuia(false)} />}

      {/* Header breadcrumb + stats */}
      <div className={`${cores.bg} border ${cores.border} rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLicaoAtiva(null)}
            className="p-2 rounded-xl bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors text-on-surface-variant"
            title="Voltar às lições"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={18} />
          </button>
          <div>
            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${cores.text} opacity-70`}>
              Nível {licaoAtiva.nivel} — {nivelDaLicao.titulo} · Lição {licaoAtiva.id} · Texto {textoIndex + 1}/{licaoAtiva.textos.length}
            </p>
            <h3 className={`font-heading font-extrabold text-lg ${cores.text}`}>{licaoAtiva.titulo}</h3>
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">WPM</p>
            <p className={`text-xl font-extrabold ${cores.text}`}>{wpmLive}</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Acurácia</p>
            <p className={`text-xl font-extrabold ${acuraciaLive >= 85 ? 'text-emerald-600' : 'text-error'}`}>{acuraciaLive}%</p>
          </div>
          <div className="text-center">
            <p className="text-[9px] font-extrabold text-on-surface-variant/50 uppercase tracking-wider">Tempo</p>
            <p className="text-xl font-extrabold text-on-surface">
              {Math.floor(elapsed / 60).toString().padStart(2, '0')}:{(elapsed % 60).toString().padStart(2, '0')}
            </p>
          </div>
          {licaoAtiva.nivel === 1 && (
            <button
              onClick={() => setMostrarGuia(true)}
              className={`p-2 rounded-xl bg-white/60 hover:bg-white dark:bg-slate-800/60 dark:hover:bg-slate-800 transition-colors ${cores.text}`}
              title="Ver guia de postura"
            >
              <HugeiconsIcon icon={InformationCircleIcon} size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Dica da lição */}
      {licaoAtiva.dica && !iniciado && (
        <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-sm mt-0.5">💡</span>
          <p className="text-xs text-amber-800 dark:text-amber-300 font-semibold leading-relaxed">{licaoAtiva.dica}</p>
        </div>
      )}

      {/* Área de digitação Caderno de Linhas */}
      <div
        className="bg-white dark:bg-slate-900 border border-outline-variant/30 rounded-2xl p-8 shadow-sm cursor-text relative overflow-hidden"
        onClick={() => inputRef.current?.focus()}
      >
        {!iniciado && (
          <p className="text-xs text-on-surface-variant/50 mb-3 text-center animate-pulse">
            ⌨️ Clique na área de texto ou simplesmente comece a digitar para iniciar...
          </p>
        )}

        <div className={`w-full select-none flex flex-wrap pt-2 pb-2 ${fontSizeClasses}`}>
          {textoAlvo.split('').map((char, i) => {
            let className = 'text-on-surface-variant/30 dark:text-on-surface-variant/20';
            if (i < digitado.length) {
              className = erros.has(i) 
                ? 'text-error bg-red-100 dark:bg-red-950/50 rounded px-0.5 font-bold' 
                : 'text-emerald-600 dark:text-emerald-400 font-bold';
            } else if (i === digitado.length) {
              className = 'text-on-surface dark:text-white border-b-2 border-primary animate-pulse relative';
            }
            return (
              <span key={i} className={`transition-colors duration-100 ${className}`}>
                {i === digitado.length && !iniciado && (
                  <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-slate-900 dark:bg-slate-700 text-white text-[10px] font-bold rounded-lg whitespace-nowrap shadow-md z-30 animate-bounce">
                    Comece a digitar!
                    <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
                  </span>
                )}
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        <div className="mt-6 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-150 ${cores.badge}`}
            style={{ width: `${textoAlvo.length > 0 ? (digitado.length / textoAlvo.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-2.5">
          <span className="text-[10px] text-on-surface-variant/40 font-semibold">{digitado.length} / {textoAlvo.length} caracteres</span>
          <span className="text-[10px] text-on-surface-variant/40 font-semibold">{erros.size} erros</span>
        </div>

        <input
          ref={inputRef}
          value={digitado}
          onChange={handleInput}
          disabled={concluido}
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck={false}
        />
      </div>

      {/* ——— Teclado Visual Personalizável + Mãos Overlay ——— */}
      {showKeyboard && (
        <div className="bg-white dark:bg-slate-950 border border-outline-variant/30 rounded-3xl p-6 shadow-sm flex flex-col items-center relative overflow-hidden">
          {/* Header do Teclado */}
          <div className="flex justify-between items-center mb-5 w-full max-w-4xl px-1">
            <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest">
              {layout === 'abnt2' ? 'Layout do Teclado: ABNT2 (Brasil)' : 'Layout do Teclado: US International'}
            </p>
            <button
              onClick={() => setShowSettingsModal(true)}
              className="text-[11px] font-bold text-primary hover:text-primary-container transition-colors flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full"
            >
              <HugeiconsIcon icon={KeyboardIcon} size={13} />
              Personalizar Tipos de Teclado
            </button>
          </div>

          {/* Rows of keys */}
          <div className="w-full max-w-4xl space-y-2 relative z-10">
            {getKeyboardLayout(layout).map((row, ri) => (
              <div key={ri} className="flex justify-center gap-1.5 w-full">
                {row.map(key => {
                  const isActive = isKeyActive(key.key);
                  const isModifier = ['tab', 'capslock', 'shift_l', 'shift_r', 'ctrl_l', 'ctrl_r', 'alt_l', 'alt_r', 'altgr', 'win_l', 'win_r', 'backspace', 'enter'].includes(key.key);
                  
                  const keyStyleClass = isActive
                    ? FINGER_BG_CLASSES[key.finger].active
                    : isModifier
                      ? 'bg-slate-100 dark:bg-slate-800 text-on-surface-variant/70 dark:text-on-surface-variant/60 border-slate-200 dark:border-slate-800'
                      : `${FINGER_BG_CLASSES[key.finger].bg} ${FINGER_BG_CLASSES[key.finger].border} ${FINGER_BG_CLASSES[key.finger].text}`;

                  const isFJ = key.key === 'f' || key.key === 'j';

                  return (
                    <div
                      key={key.key}
                      className={`relative rounded-lg flex flex-col items-center justify-center font-bold border select-none transition-all duration-100 text-xs sm:text-sm uppercase shadow-sm ${key.width} ${keyStyleClass}`}
                    >
                      {/* Secondary value on shift (for symbols) */}
                      {key.shiftDisplay && (
                        <span className="absolute top-1 left-2 text-[8px] sm:text-[9px] opacity-40 leading-none">
                          {key.shiftDisplay}
                        </span>
                      )}
                      
                      {/* Main Key Display */}
                      <span className={key.shiftDisplay ? 'pt-1.5' : ''}>
                        {key.display}
                      </span>
                      
                      {/* Home row anchor line (calombinhos) on F & J */}
                      {isFJ && (
                        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-current opacity-60" />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Hands Overlay */}
          {showHands && (
            <div className="absolute inset-x-0 bottom-0 top-14 pointer-events-none flex justify-between px-8 sm:px-16 z-20">
              <div className="w-[32%] max-w-[200px] h-full flex items-end">
                <VisualHandsLeft activeFinger={activeFingerInfo.hand === 'left' ? activeFingerInfo.finger : null} />
              </div>
              <div className="w-[32%] max-w-[200px] h-full flex items-end">
                <VisualHandsRight activeFinger={activeFingerInfo.hand === 'right' ? activeFingerInfo.finger : null} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl border border-outline-variant/20 overflow-hidden">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-heading font-extrabold text-lg flex items-center gap-2">
                    ⌨️ Configurar Teclado
                  </h2>
                  <p className="text-white/70 text-xs mt-1">Ajuste as preferências do treino de digitação</p>
                </div>
                <button
                  onClick={() => setShowSettingsModal(false)}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={18} className="text-white" />
                </button>
              </div>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-6">
              {/* Layout Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">Layout do Teclado</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setLayout('abnt2')}
                    className={`py-3 px-4 rounded-xl border-2 text-xs font-bold text-center transition-all ${
                      layout === 'abnt2'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-on-surface-variant/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    ABNT2 (Brasil)
                  </button>
                  <button
                    onClick={() => setLayout('us')}
                    className={`py-3 px-4 rounded-xl border-2 text-xs font-bold text-center transition-all ${
                      layout === 'us'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-on-surface-variant/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    US International
                  </button>
                </div>
              </div>
              
              {/* Font Size Selection */}
              <div className="space-y-2">
                <label className="text-[10px] font-extrabold text-on-surface-variant uppercase tracking-wider block">Tamanho da Letra</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'sm', label: 'Pequeno' },
                    { id: 'md', label: 'Médio' },
                    { id: 'lg', label: 'Grande' }
                  ].map(item => (
                    <button
                      key={item.id}
                      onClick={() => setFontSize(item.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold text-center transition-all ${
                        fontSize === item.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 dark:border-slate-800 text-on-surface-variant dark:text-on-surface-variant/80 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Audio Toggle & Volume */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-surface-variant dark:text-on-surface-variant/80">Sons de Digitação</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`w-12 h-6 rounded-full p-1 transition-colors ${soundEnabled ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${soundEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                {soundEnabled && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-[10px] text-on-surface-variant/60 font-bold">
                      <span>Volume</span>
                      <span>{volume}%</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={volume}
                      onChange={e => setVolume(Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                  </div>
                )}
              </div>
              
              {/* Display Toggles */}
              <div className="space-y-3 pt-4 border-t border-outline-variant/10 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface-variant dark:text-on-surface-variant/80">Exibir Mãos Auxiliares</span>
                  <button
                    onClick={() => setShowHands(!showHands)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${showHands ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${showHands ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-xs font-medium text-on-surface-variant dark:text-on-surface-variant/80">Exibir Teclado Virtual</span>
                  <button
                    onClick={() => setShowKeyboard(!showKeyboard)}
                    className={`w-10 h-5 rounded-full p-0.5 transition-colors ${showKeyboard ? 'bg-primary' : 'bg-slate-300 dark:bg-slate-700'}`}
                  >
                    <div className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ${showKeyboard ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-5 border-t border-outline-variant/10 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  setShowSettingsModal(false);
                  if (soundEnabled) playClickSound(volume / 100);
                }}
                className="w-full py-2.5 bg-primary text-white font-bold text-xs rounded-xl hover:bg-primary/95 transition-all shadow-sm"
              >
                Confirmar Configurações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal resultado */}
      {concluido && resultado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-outline-variant/20">
            <div className={`p-6 ${resultado.acuracia >= 85 ? 'bg-emerald-50 dark:bg-emerald-950/20' : 'bg-amber-50 dark:bg-amber-950/20'} border-b border-outline-variant/20 dark:border-slate-800`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${resultado.acuracia >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  <HugeiconsIcon icon={resultado.acuracia >= 85 ? Award01Icon : Alert01Icon} size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-on-surface dark:text-white">
                    {resultado.acuracia >= 85 ? '🎉 Lição Concluída!' : '💪 Continue Treinando!'}
                  </h3>
                  <p className="text-xs text-on-surface-variant/70 dark:text-on-surface-variant/80">
                    {resultado.acuracia >= 85
                      ? 'Acurácia ≥ 85% — próxima lição desbloqueada!'
                      : `Acurácia de ${resultado.acuracia}% — precisa de 85% para avançar.`}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 grid grid-cols-3 gap-4">
              {[
                { label: 'WPM', value: resultado.wpm, sub: 'palavras/min', color: 'text-primary' },
                { label: 'Acurácia', value: `${resultado.acuracia}%`, sub: 'precisão', color: resultado.acuracia >= 85 ? 'text-emerald-600' : 'text-amber-600' },
                { label: 'Tempo', value: `${resultado.duracao}s`, sub: `${resultado.erros} erros`, color: 'text-on-surface dark:text-white' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="text-center">
                  <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest mb-1">{label}</p>
                  <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
                  <p className="text-[10px] text-on-surface-variant/40">{sub}</p>
                </div>
              ))}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => resetLicao()}
                className="flex-1 px-4 py-2.5 border border-outline-variant/50 dark:border-slate-800 rounded-xl text-sm font-bold text-on-surface dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Outro Texto
              </button>
              {resultado.acuracia >= 85 && licaoAtiva.id < LICOES.length && (
                <button
                  onClick={proximaLicao}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <span>Próxima Lição</span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
                </button>
              )}
              {(resultado.acuracia < 85 || licaoAtiva.id === LICOES.length) && (
                <button
                  onClick={() => setLicaoAtiva(null)}
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-colors"
                >
                  {licaoAtiva.id === LICOES.length ? 'Ver Níveis' : 'Escolher Lição'}
                </button>
              )}
            </div>

            {salvando && (
              <p className="text-center text-[10px] text-on-surface-variant/40 pb-4 animate-pulse">
                Salvando progresso...
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
