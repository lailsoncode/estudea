# Instruções de Prompt para a IA Pedagógica (Estudea)

Este documento contém as especificações técnicas, regras de negócios e a estrutura de dados JSON que devem ser fornecidas à Inteligência Artificial no criador de cursos da plataforma **Estudea**.

---

## 🎯 Objetivo da IA
Ajudar os professores a criar e estruturar módulos, aulas teóricas, materiais e questionários ou atividades práticas de forma automatizada a partir de solicitações textuais.

---

## 📋 Regras de Negócio e Tipos de Conteúdo

### 1. Tipos de Aulas principais (`tipo`)
* **`video`**: Aulas focadas em conteúdo audiovisual. Requer o preenchimento de `video_url`.
* **`texto`**: Aulas de leitura teórica. O conteúdo explicativo deve ser escrito em Markdown simples no campo `conteudo`.
* **`arquivo`**: Aulas que fornecem PDFs, slides ou links de downloads. Requer o preenchimento de `arquivo_url`.
* **`quiz`**: Aulas baseadas puramente em questionários tradicionais da aula. Requer preenchimento de `questoes` com a flag `"pertence_a_atividade": false`.

---

### 2. Atividades Práticas Vinculadas
Toda aula pode conter uma atividade prática associada. 
* Para ativar, defina `"has_atividade": true` e descreva as instruções no campo `"atividade_enunciado"`.
* **Formatos de Entrega (`atividade_tipo_entrega`)**:
  * **`texto`**: O aluno envia código ou resposta escrita.
  * **`imagem`**: O aluno anexa a URL de uma imagem (ex: captura de tela).
  * **`multipla`**: O aluno envia **texto E imagem** simultaneamente (ideal para entrega de códigos/explicações junto com prints de tela).
  * **`quiz`**: O aluno responde a um questionário estruturado.

---

### 3. Questionários Exclusivos da Atividade Prática
Caso a atividade seja do tipo `quiz`, o professor pode desejar que as perguntas sejam **exclusivas** daquela atividade (sem misturar com o quiz geral da aula teórica).
* Para isso, a IA deve definir `"atividade_quiz_proprio": true`.
* Todas as questões desse questionário devem ser listadas no campo `"questoes"`, marcadas com a flag `"pertence_a_atividade": true`.

---

## 📝 Regras para Questões (`questoes`)

Cada questão no array deve seguir as diretrizes abaixo dependendo do seu tipo (`tipo`):

1. **`multipla_escolha`**:
   * `opcoes`: Lista de strings (alternativas).
   * `resposta_correta`: String que deve corresponder **exatamente** a uma das alternativas.
2. **`verdadeiro_falso`**:
   * `opcoes`: Deve ser obrigatoriamente `["Verdadeiro", "Falso"]`.
   * `resposta_correta`: Deve ser exatamente `"Verdadeiro"` ou `"Falso"`.
3. **`aberta`** (Dissertativa com correção automática por palavras-chave):
   * `opcoes`: Array onde:
     * `opcoes[0]`: O gabarito ou resposta sugerida/esperada para exibição posterior.
     * `opcoes[1]`: Uma string contendo **palavras-chave obrigatórias separadas por vírgula** (ex: `"variável, escopo, let"`). O validador da plataforma aprova o aluno automaticamente se a resposta dele contiver todas essas palavras.
   * `resposta_correta`: String vazia `""` ou o texto do gabarito.
4. **`multipla_selecao`** (Múltiplas respostas corretas):
   * `opcoes`: Lista de strings (alternativas).
   * `resposta_correta`: Lista contendo as opções corretas **separadas por ponto e vírgula (`;`)** (ex: `"Opção A;Opção C"`).

---

## 📐 Modelo de Resposta JSON Esperado da IA

A IA deve retornar **exclusivamente** um JSON puro estruturado exatamente como no exemplo abaixo:

```json
{
  "titulo": "Introdução às Variáveis no JavaScript",
  "descricao": "Nesta aula você aprenderá a diferença entre var, let e const e como gerenciar escopos.",
  "tipo": "texto",
  "conteudo": "As variáveis são contêineres para armazenar dados...\n\n### Escopo de Bloco\nUse `let` e `const` para...",
  "video_url": null,
  "arquivo_url": null,
  "has_atividade": true,
  "atividade_enunciado": "Crie um script declarando uma variável usando `let` dentro de um bloco e tente acessá-la fora. Envie o código e um print do console.",
  "atividade_tipo_entrega": "multipla",
  "atividade_quiz_proprio": true,
  "questoes": [
    {
      "enunciado": "Qual das seguintes palavras-chave declara uma variável com escopo de bloco?",
      "opcoes": ["var", "let", "global", "define"],
      "resposta_correta": "let",
      "tipo": "multipla_escolha",
      "pertence_a_atividade": true
    },
    {
      "enunciado": "Quais declarações impedem a reatribuição de valor após a inicialização?",
      "opcoes": ["let", "const", "var", "constante"],
      "resposta_correta": "const",
      "tipo": "multipla_escolha",
      "pertence_a_atividade": true
    }
  ]
}
```
