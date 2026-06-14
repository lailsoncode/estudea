<div align="center">

# 🎓 Estudea

**Plataforma de ensino moderna, gratuita e open source.**  
Criada com ❤️ pela [Oxente Code](https://github.com/oxentecode) para democratizar o acesso à educação digital.

[![Licença MIT](https://img.shields.io/badge/licença-MIT-22c55e?style=for-the-badge)](LICENSE)
[![Open Source](https://img.shields.io/badge/open%20source-100%25-6366f1?style=for-the-badge&logo=github)](https://github.com/oxentecode/estudea)
[![Gratuito](https://img.shields.io/badge/gratuito-para%20sempre-f59e0b?style=for-the-badge)](https://github.com/oxentecode/estudea)
[![Feito com React](https://img.shields.io/badge/react-19-61dafb?style=for-the-badge&logo=react)](https://react.dev)
[![Supabase](https://img.shields.io/badge/backend-supabase-3ecf8e?style=for-the-badge&logo=supabase)](https://supabase.com)

</div>

---

## 🌟 O que é o Estudea?

O **Estudea** é uma plataforma LMS (Learning Management System) completa, desenvolvida para professores que querem criar e distribuir cursos online de forma profissional — **sem pagar nada por isso**.

Qualquer professor pode usar, instalar e modificar o Estudea livremente. O projeto é **100% gratuito**, **sem mensalidades**, **sem limites de alunos** e **sem pegadinhas**.

---

## 💡 Por que gratuito e open source?

Acreditamos que a tecnologia de ensino de qualidade não deveria ser um privilégio de quem pode pagar por ferramentas caras. O Estudea nasce com a missão de ser um instrumento acessível para educadores de todos os contextos — das escolas públicas às academias independentes.

> _"Educação é o passaporte para o futuro, e o futuro pertence a quem se prepara hoje."_

---

## ✨ Funcionalidades

| Área | O que você pode fazer |
|---|---|
| 🏗️ **Criação de Cursos** | Crie cursos com módulos, aulas em vídeo, texto, quiz e arquivos |
| 👨‍🎓 **Trilha do Aluno** | Trilha gamificada com progresso, desbloqueio sequencial e conquistas |
| 📊 **Dashboard do Professor** | Métricas de progresso, mapa de calor de aulas, entregas pendentes |
| ✅ **Central de Correções** | Corrija atividades práticas e dê feedback individual para cada aluno |
| 📄 **Visualizador de PDF** | PDFs do Google Drive ou links diretos são exibidos inline na plataforma |
| 🏆 **Conquistas e Gamificação** | Sistema de XP, ofensivas diárias, conquistas e ranking de turma |
| 🔐 **Gestão de Turmas** | Crie turmas, gere códigos de acesso e vincule alunos |
| 👤 **Perfil de Usuário** | Personalização de avatar, nome e dados do aluno |

---

## 🛠️ Stack Tecnológica

- **Frontend:** [React 19](https://react.dev) + [TypeScript](https://typescriptlang.org)
- **Build:** [Vite](https://vitejs.dev)
- **Estilização:** [Tailwind CSS](https://tailwindcss.com)
- **Backend / Banco de dados:** [Supabase](https://supabase.com) (PostgreSQL)
- **Ícones:** [HugeIcons](https://hugeicons.com)
- **Roteamento:** [React Router DOM v7](https://reactrouter.com)

---

## 🚀 Como rodar localmente

### Pré-requisitos

- [Node.js](https://nodejs.org) v18 ou superior
- Uma conta gratuita no [Supabase](https://supabase.com)

### 1. Clone o repositório

```bash
git clone https://github.com/oxentecode/estudea.git
cd estudea
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Copie o arquivo de exemplo e preencha com suas credenciais do Supabase:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://SEU_PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_ANONIMA
```

### 4. Execute o servidor de desenvolvimento

```bash
npm run dev
```

Acesse em: **http://localhost:5173**

---

## 🗄️ Banco de Dados

O Estudea usa o Supabase como backend. As migrations e o schema do banco estão disponíveis na pasta [`/supabase`](./supabase).

Para configurar o banco, importe os arquivos SQL no seu projeto Supabase ou use a CLI:

```bash
supabase db push
```

---

## 📁 Estrutura do Projeto

```
estudea/
├── src/
│   ├── components/     # Componentes reutilizáveis (layout, UI, common)
│   ├── pages/          # Páginas da aplicação
│   │   ├── TrilhaAluno.tsx          # Ambiente gamificado do aluno
│   │   ├── CourseBuilder.tsx        # Editor de cursos do professor
│   │   ├── DashboardProfessor.tsx   # Painel de controle do professor
│   │   ├── CentralCorrecoes.tsx     # Correção de atividades
│   │   └── GerenciadorTurmas.tsx    # Gestão de turmas
│   ├── lib/            # Configuração do Supabase
│   ├── services/       # Serviços e chamadas de API
│   ├── types/          # Tipos TypeScript
│   └── utils/          # Utilitários (celebração, helpers)
├── supabase/           # Migrations e schema do banco
└── public/             # Assets estáticos
```

---

## 🤝 Contribuindo

Contribuições são muito bem-vindas! O Estudea é feito pela comunidade, para a comunidade.

1. Faça um fork do projeto
2. Crie uma branch para sua feature: `git checkout -b feature/minha-feature`
3. Faça commit das suas mudanças: `git commit -m 'feat: adiciona minha feature'`
4. Faça push para a branch: `git push origin feature/minha-feature`
5. Abra um Pull Request

---

## 📄 Licença

Distribuído sob a licença **MIT**. Veja [`LICENSE`](LICENSE) para mais informações.

Isso significa que você pode **usar, copiar, modificar, mesclar, publicar, distribuir, sublicenciar** o Estudea — inclusive para fins comerciais — **de forma completamente gratuita**.

---

## 🧡 Sobre a Oxente Code

A **Oxente Code** é um coletivo de desenvolvimento de software do Nordeste brasileiro, com o compromisso de criar soluções tecnológicas abertas e acessíveis.

Acreditamos em código aberto, em educação de qualidade e em fazer mais com menos.

---

<div align="center">

Feito com muito ☕ e 🧡 pela **Oxente Code** 🧡

⭐ Se o Estudea te ajudou, deixa uma estrela no repositório!

</div>
