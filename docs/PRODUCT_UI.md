# Estudea Product UI

Sistema visual que conecta a identidade expressiva da homepage às telas operacionais do Estudea.

## Princípios

1. **Tecnologia acolhedora:** azul profundo cria confiança; laranja sinaliza energia, avanço e convite para agir.
2. **Clareza antes de densidade:** títulos, ações e estados importantes devem ser reconhecidos sem esforço.
3. **Progresso visível:** métricas, trilhas e feedback devem mostrar claramente onde a pessoa está e qual é o próximo passo.
4. **Uma identidade, duas intensidades:** a homepage é mais editorial e animada; o produto é mais contido e operacional.
5. **Acessibilidade estrutural:** informação nunca depende apenas de cor, controles têm foco visível e alvos adequados para toque.

## Papéis das cores

| Papel | Token ou classe | Uso |
|---|---|---|
| Identidade profunda | `brand-ink`, `brand-navy`, `brand-deep` | Títulos de marca, áreas imersivas e destaques institucionais |
| Ação principal | `primary`, `product-primary-action` | Salvar, continuar, iniciar e confirmar |
| Motivação | `secondary` | XP, conquistas, chamadas especiais e celebrações |
| Superfície do produto | `product-canvas`, `surface-*` | Fundos e camadas das telas autenticadas |
| Sucesso | Esmeralda | Concluído, sincronizado e evolução positiva |
| Atenção | Âmbar ou laranja | Prazo próximo, pendência e acompanhamento |
| Erro ou risco | Vermelho ou rosa | Exclusão, atraso e bloqueio |
| Recurso especial | Violeta | IA, Arena e conteúdo excepcional |

Textos essenciais devem usar `on-surface` ou `on-surface-variant`. Opacidade baixa fica restrita a elementos decorativos.

## Tipografia

- `Plus Jakarta Sans`: títulos, métricas e ações principais.
- `Inter`: textos, formulários, tabelas e informações auxiliares.
- Título de página: `product-title`.
- Introdução da página: `product-subtitle`.
- Etiqueta contextual: `product-eyebrow`.
- Texto operacional: mínimo de 14px.
- Texto entre 10px e 12px: apenas chips, contadores e metadados não essenciais.

## Formas e elevação

| Padrão | Classe |
|---|---|
| Campo e botão | `rounded-product-control` |
| Cartão | `rounded-product-card` |
| Painel e cabeçalho | `rounded-product-panel` |
| Vitrine ou bloco imersivo | `rounded-product-display` |
| Cartão comum | `shadow-product-card` |
| Elemento em destaque | `shadow-product-elevated` |
| Composição de marca | `shadow-product-display` |

## Componentes canônicos

- Página: `product-page`
- Cabeçalho: `product-page-header`
- Ícone principal: `product-icon-tile`
- Painel: `product-panel`
- Cartão: `product-card` ou `product-card-interactive`
- Métrica: `product-metric`, `product-metric-label`, `product-metric-value`
- Barra de busca e filtros: `product-toolbar`
- Campo: `product-control`
- Ações: `product-primary-action`, `product-secondary-action`, `product-icon-action`
- Estado vazio: `product-empty-state`
- Modal: `product-dialog`, `product-dialog-header`, `product-dialog-footer`

As classes `app-*` permanecem disponíveis durante a migração, mas novas revisões devem preferir `product-*`.

## Comportamento e movimento

- Animações ajudam a explicar entrada, progresso ou mudança de estado.
- Duração padrão entre 150ms e 400ms.
- Hover não pode ser a única forma de revelar uma ação essencial.
- `prefers-reduced-motion` deve remover movimentos contínuos ou decorativos.
- Em celulares, priorizar rolagem natural, cartões com largura reconhecível e ações de pelo menos 44px.

## Checklist para migrar uma tela

- [ ] Primeiro viewport apresenta contexto, ação principal e estado atual.
- [ ] Cabeçalho usa o trio `product-eyebrow`, `product-title` e `product-subtitle` quando aplicável.
- [ ] Cards, campos, botões e métricas usam componentes canônicos.
- [ ] Modo claro e escuro preservam contraste e hierarquia.
- [ ] Estados vazio, carregando, erro e sucesso são explícitos.
- [ ] Ações são acessíveis por teclado e têm nomes compreensíveis.
- [ ] Não existe rolagem horizontal acidental.
- [ ] Conteúdo continua utilizável em 360px, 768px e desktop.
- [ ] Build e lint direcionado passam antes da publicação.

## Ordem de adoção

1. Homepage e Kanban — referências iniciais.
2. Trilha do aluno e visualizador de aula.
3. Projeto Integrador e ferramentas práticas.
4. Dashboard, lista e acompanhamento docente.
5. Gestão de cursos, turmas, correções e equipe.
