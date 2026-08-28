export const ESTUDEA_CREATION_GUIDE_URI = 'estudea://guias/criacao-aulas';

export const ESTUDEA_CREATION_GUIDE = `# Guia de criação de aulas pelo MCP do Estudea

Este recurso descreve o contrato pedagógico do MCP. O formato com tags [TÍTULO], [CONTEÚDO] e similares pertence ao importador de copiar e colar; nas ferramentas de criação e edição, use sempre o JSON estruturado do MCP.

## Fluxo seguro

1. Localize curso e módulo pelas ferramentas de listagem; nunca invente UUIDs.
2. Estruture conteúdo teórico aprofundado, objetivos claros e uma atividade prática realista quando solicitada.
3. Se o usuário fornecer texto com tags, converta uma aula por vez com interpretar_importacao_formatada.
4. Use validar_aula e apresente ao professor erros, alertas e contagens antes de gravar.
5. Crie apenas como rascunho. Antes de liberar, consulte a aula novamente, revise a validação e envie o revision_id atual com a confirmação explícita.
6. Liberação, retirada de turma e arquivamento são operações separadas e nunca devem ser inferidas a partir do pedido de criação.

## Questões

- Use opções {id,texto} e respostas_corretas contendo os IDs.
- Em múltipla seleção, use exatamente dois ou três IDs corretos, sem repetição.
- Se preencher o campo legado resposta_correta junto com respostas_corretas, ambos precisam representar o mesmo gabarito.
- Tipos aceitos no Estudea: multipla_escolha, verdadeiro_falso, aberta e multipla_selecao.
- Em questão aberta, use gabarito_recomendado e palavras_chave_aprovacao; não transforme esses valores em alternativas.
- Questões de atividade ficam em atividades[].questoes e exigem tipo_entrega igual a quiz.
- Uma atividade quiz precisa conter ao menos uma questão; atividades de outros tipos não podem carregar questões.

## Arena

- Use arena.questoes, separada do quiz comum.
- Aceite somente multipla_escolha ou verdadeiro_falso.
- Limite o enunciado a 120 caracteres e use apenas uma resposta correta.
- Múltipla escolha aceita no máximo quatro opções; ao gerar uma nova, prefira exatamente quatro.
- Verdadeiro/falso usa exatamente Verdadeiro e Falso.
- Ao gerar conteúdo novo, produza de 5 a 10 questões. Ao converter material que já contém questões, preserve todas, até o limite técnico de 100.

## Materiais

- arquivo_url mantém compatibilidade com um anexo principal.
- Para vários materiais, use materiais[] com título, URL, tipo, uso e obrigatoriedade.
- Atividades podem manter um material_url próprio quando o apoio pertence exclusivamente à prática.
`;
