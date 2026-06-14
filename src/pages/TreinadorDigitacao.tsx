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

// ——— Mapa do teclado visual ———
const KEYBOARD_ROWS = [
  ['q','w','e','r','t','y','u','i','o','p'],
  ['a','s','d','f','g','h','j','k','l','ç'],
  ['z','x','c','v','b','n','m'],
];

const FINGER_COLORS: Record<string, string> = {
  a: 'bg-red-400', s: 'bg-orange-400', d: 'bg-yellow-400', f: 'bg-green-400',
  g: 'bg-green-300', h: 'bg-blue-300', j: 'bg-blue-400', k: 'bg-purple-400',
  l: 'bg-pink-400', ç: 'bg-rose-400',
  q: 'bg-red-400', w: 'bg-orange-400', e: 'bg-yellow-400', r: 'bg-green-400',
  t: 'bg-green-300', y: 'bg-blue-300', u: 'bg-blue-400', i: 'bg-purple-400',
  o: 'bg-pink-400', p: 'bg-rose-400',
  z: 'bg-red-400', x: 'bg-orange-400', c: 'bg-yellow-400', v: 'bg-green-400',
  b: 'bg-green-300', n: 'bg-blue-300', m: 'bg-blue-400',
};

const FINGER_LABELS: Record<string, string> = {
  a: 'Min.E', s: 'Anel.E', d: 'Méd.E', f: 'Ind.E',
  g: 'Ind.E', h: 'Ind.D', j: 'Ind.D', k: 'Méd.D',
  l: 'Anel.D', ç: 'Min.D',
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

  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const textoAlvo = licaoAtiva ? licaoAtiva.textos[textoIndex] : '';

  useEffect(() => {
    if (session?.user?.id) fetchProgressos();
  }, [session]);

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
    if (!iniciado) { setIniciado(true); setStartTime(Date.now()); }
    const novosErros = new Set(erros);
    for (let i = 0; i < val.length; i++) {
      if (val[i] !== textoAlvo[i]) novosErros.add(i);
    }
    setErros(novosErros);
    setDigitado(val);
    if (val.length >= textoAlvo.length) finalizarLicao(novosErros);
  }, [concluido, iniciado, erros, textoAlvo]);

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
    <div className="w-full space-y-5 animate-fade-in pb-12">
      {mostrarGuia && <ModalPostura onClose={() => setMostrarGuia(false)} />}

      {/* Header breadcrumb + stats */}
      <div className={`${cores.bg} border ${cores.border} rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setLicaoAtiva(null)}
            className="p-2 rounded-xl bg-white/60 hover:bg-white transition-colors text-on-surface-variant"
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
              className={`p-2 rounded-xl bg-white/60 hover:bg-white transition-colors ${cores.text}`}
              title="Ver guia de postura"
            >
              <HugeiconsIcon icon={InformationCircleIcon} size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Dica da lição */}
      {licaoAtiva.dica && !iniciado && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2.5">
          <span className="text-amber-500 text-sm mt-0.5">💡</span>
          <p className="text-xs text-amber-800 font-semibold leading-relaxed">{licaoAtiva.dica}</p>
        </div>
      )}

      {/* ——— Teclado Visual MAIOR ——— */}
      <div className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-extrabold text-on-surface-variant/50 uppercase tracking-widest mb-5">
          Teclado — tecla atual em destaque · código de cores por dedo
        </p>
        <div className="space-y-3">
          {KEYBOARD_ROWS.map((row, ri) => (
            <div key={ri} className={`flex gap-2.5 ${ri === 1 ? 'pl-7' : ri === 2 ? 'pl-[68px]' : ''}`}>
              {row.map(key => {
                const isActive = key === teclaEsperada.toLowerCase();
                const isHomeRow = ri === 1;
                const fingerColor = FINGER_COLORS[key] || 'bg-slate-300';
                const isFJ = key === 'f' || key === 'j';
                return (
                  <div
                    key={key}
                    className={`relative w-14 h-14 rounded-xl flex flex-col items-center justify-center text-base font-extrabold border-2 transition-all select-none uppercase shadow-sm ${
                      isActive
                        ? `${fingerColor} text-white border-transparent shadow-xl scale-110 ring-2 ring-offset-2 ring-current`
                        : isHomeRow
                          ? `${fingerColor}/20 text-on-surface/80 border-current/40`
                          : 'bg-slate-100 text-on-surface-variant/60 border-slate-200'
                    }`}
                  >
                    {key}
                    {isFJ && (
                      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-current opacity-60" />
                    )}
                    {isHomeRow && FINGER_LABELS[key] && !isActive && (
                      <span className="absolute -bottom-5 text-[7px] font-bold text-on-surface-variant/40 whitespace-nowrap">
                        {FINGER_LABELS[key]}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {/* Barra de espaço */}
          <div className="pl-20 pt-5">
            <div className={`h-14 w-[400px] rounded-xl flex items-center justify-center text-sm font-extrabold border-2 transition-all shadow-sm ${
              teclaEsperada === ' '
                ? 'bg-slate-500 text-white border-transparent shadow-xl scale-105 ring-2 ring-offset-2 ring-slate-500'
                : 'bg-slate-100 text-on-surface-variant/40 border-slate-200'
            }`}>
              Barra de Espaço — Polegar
            </div>
          </div>
        </div>
      </div>

      {/* Área de digitação */}
      <div
        className="bg-white border border-outline-variant/30 rounded-2xl p-6 shadow-sm cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {!iniciado && (
          <p className="text-xs text-on-surface-variant/50 mb-4 text-center animate-pulse">
            ⌨️ Clique aqui ou comece a digitar para iniciar o cronômetro...
          </p>
        )}

        <div className="font-mono text-xl leading-loose tracking-wide select-none flex flex-wrap">
          {textoAlvo.split('').map((char, i) => {
            let className = 'text-on-surface-variant/30';
            if (i < digitado.length) {
              className = erros.has(i) ? 'text-error bg-red-100 rounded px-0.5' : 'text-emerald-600';
            } else if (i === digitado.length) {
              className = 'text-on-surface border-b-2 border-primary animate-pulse';
            }
            return (
              <span key={i} className={`transition-colors ${className}`}>
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
        </div>

        <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${cores.badge}`}
            style={{ width: `${textoAlvo.length > 0 ? (digitado.length / textoAlvo.length) * 100 : 0}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
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

      {/* Modal resultado */}
      {concluido && resultado && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className={`p-6 ${resultado.acuracia >= 85 ? 'bg-emerald-50' : 'bg-amber-50'} border-b border-outline-variant/20`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${resultado.acuracia >= 85 ? 'bg-emerald-500' : 'bg-amber-500'}`}>
                  <HugeiconsIcon icon={resultado.acuracia >= 85 ? Award01Icon : Alert01Icon} size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-on-surface">
                    {resultado.acuracia >= 85 ? '🎉 Lição Concluída!' : '💪 Continue Treinando!'}
                  </h3>
                  <p className="text-xs text-on-surface-variant/70">
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
                { label: 'Tempo', value: `${resultado.duracao}s`, sub: `${resultado.erros} erros`, color: 'text-on-surface' },
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
                className="flex-1 px-4 py-2.5 border border-outline-variant/50 rounded-xl text-sm font-bold text-on-surface hover:bg-slate-50 transition-colors"
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
