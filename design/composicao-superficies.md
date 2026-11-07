# LABMATTAR — Composição aplicada: prova de página

**Referência técnica:** o estudo de `04 / COMPOSIÇÃO` utiliza o mesmo núcleo de leitura do `05 / LABORATÓRIO`: `lm-lab-reading` → `lm-lab-kicker`, `lm-lab-main-copy` (Título + Corpo), `lm-lab-bottom`. O arquivo `public/composicao-lab.css` contém essa regra estrutural; `public/composicao-demo.css` apenas adapta o exemplo de imagem, estados e formato.

## Versão oficial — fontes de verdade

Esta é a referência de manutenção da identidade, não um conjunto de exemplos paralelos. Cada regra tem um único responsável:

| Responsabilidade | Arquivo oficial |
| --- | --- |
| Estrutura editorial das páginas e orientação do conteúdo | `design/composicao.html` e `design/laboratorio.html` |
| Título, Corpo e Detalhe, famílias, entrelinha e tracking | `public/manual-headings.css` e `public/manual-type-roles.js` |
| Vetor M, proporções dos canvases, área útil e camadas fotográficas | `public/composicao-lab.css` |
| Estado, presets, marcadores, foco da fotografia e validação da leitura | `public/composicao-lab.js` |
| Controles ilustrados ativos | `public/composicao-lab-controls.css` |
| Comportamento de editor focado e escala da prévia | `public/composicao-studio.js`, `public/composicao-studio.css` e `public/composicao-editor-clean.css` |
| Demonstração aplicada do capítulo 04 | `public/composicao-demo.css` e script da página de Composição |

**Estados que devem existir no canvas:** `data-backdrop` (color, photo, blur), `data-m-content` (off, solid, photo), `data-m-presentation` (elemento, completo), `data-marker-blur`, `data-format` e os atributos de contraste e guias. A preferência de fundo é salva separadamente de sua apresentação efetiva.

**Estados que não devem retornar:** `data-image`, `data-m-mode`, `data-relation` e os antigos modos de relação entre texto e M. Não reintroduzir selects invisíveis de compatibilidade nem regras específicas de blur por modo do M. A régua editorial é única; quando o conteúdo não couber, registrar a condição e rever a composição, sem reduzir automaticamente um título.

**Critério de manutenção:** uma correção só é oficial quando preservar a identidade visível, passar a validação estrutural e os testes de navegador do Laboratório, inclusive nos quatro formatos e na prévia móvel. As alterações são feitas sobre a fonte real em `design/` ou `public/`, nunca somente sobre uma cópia compilada.

## Interface do Laboratório

O inspetor é uma ferramenta de edição, não uma repetição do manual.

- **Visível:** nome do controle, opções acionáveis, proporções de superfície, valores numéricos, foco selecionado e títulos dos grupos ou painéis que podem ser abertos.
- **Sob demanda:** explicações, justificativas e limites de uso ficam nos botões de ajuda `?` relacionados ao próprio controle. Cada botão de ajuda deve abrir conteúdo útil e acessível por teclado.
- **Fora do inspetor:** faixas estáticas como “M central / escala variável / geometria fixa”, subtítulos que repetem as opções disponíveis e etiquetas como “uma hierarquia / duas hierarquias” ou “neutro / acento / estudo”. Essas regras pertencem ao manual, não devem parecer opções de interface.
- A limpeza de interface **não altera** Título, Corpo, Detalhe, geometria oficial do M, blur, marcadores ou a régua dos quatro formatos.

## O que permanece

- Os únicos tratamentos de texto são **Título**, **Corpo** e **Detalhe** com Univers e Perpetua; a escala proporcional à superfície é aplicada por `manual-headings.css`, não por fontes adicionais.
- A origem horizontal, o alinhamento e a margem de leitura são únicos em toda a página.
- O M conserva vetor, proporções e eixo central. A fotografia pode ser reenquadrada. Em Elemento, o M permite posição vertical controlada e legenda em Detalhe, sem deformação.
- O tratamento de leitura pertence à fotografia sob o texto e acompanha o recorte do M. A intensidade é ajustável de 0% a 80%, com atalhos 0%, 20%, 40% e 60%, com preferência e valor inicial de 40% para novas composições. Projetos anteriores mantêm 20%. A escolha deve ser conferida no tamanho final; os atalhos não certificam legibilidade.
- **Relação entre camadas:** sempre que um M ou qualquer marcador estiver ativo, a camada de fundo exibe **a mesma imagem selecionada, ampliada e desfocada (blur)**. O conteúdo interior do M pode ser fotográfico ou sólido; em ambos os casos, a camada inferior não fica como cor plana nem vazia. A geometria não muda.
- A opção de fundo (Cor ou Fotografia) continua como preferência salva. Ela só determina a superfície quando M e marcadores estiverem desligados. Desligar o último elemento restaura a escolha original, sem perda de foto, foco ou escala.
- O blur do fundo e o tratamento preto ajustável são recursos diferentes: o blur define a camada inferior; o véu depende da sobreposição de texto à fotografia.

## Horizontal e vertical — uma estrutura comum

A composição é uma coluna estrutural com três regiões, tal como no Laboratório:

1. **Identificação — Detalhe:** topo da área útil.
2. **Núcleo editorial — Título + Corpo:** bloco central, com o Corpo acompanhando imediatamente o Título e nunca aparecendo no rodapé por sobreposição.
3. **Créditos — Detalhe:** rodapé independente, dentro da mesma margem.

Em `16:9`, o núcleo ocupa uma coluna proporcional ao formato. Em `9:16`, essa coluna usa toda a largura disponível e permanece centralizada verticalmente. São reescaladas e redistribuídas as áreas de texto, não comprimidas as letras de uma orientação para outra. O M permanece geométrico ao centro e a imagem preserva contraste adequado.

## Aparição do M em todas as superfícies

Todas as superfícies (**16:9, 9:16, 1:1 e editorial**) oferecem duas aplicações do **mesmo vetor oficial** (990,08 × 743,18). Não são símbolos distintos nem deformações do M:

- **Elemento** (padrão, inclusive para composições salvas anteriormente): composição secundária com o M inteiro, centrado horizontalmente e ajustável verticalmente, com a escala manual do Laboratório preservada. É o comportamento já existente na ferramenta e na segunda referência.
- **Completo**: M ocupa exatamente **100% da altura de qualquer canvas**; sua largura decorre do aspecto original (aproximadamente **133,222% da altura**). Em 9:16, sangra simetricamente pelas laterais e mostra os recortes das extremidades; em formatos largos, a lateral pode permanecer livre. Não esticar, achatar ou converter em outro vetor.

A seleção é apresentada em **05 / Composição** e no **06 / Laboratório** para todos os formatos. Alterar a proporção não muda a escolha do M. A geometria é recalculada a partir da altura real da nova superfície; o tamanho salvo de Elemento permanece intocado.

No modo Completo, em qualquer formato, o controle de escala e os marcadores adicionais do M ficam temporariamente inativos para não criar recortes duplicados. Ao retornar para Elemento, a escala e os marcadores anteriormente escolhidos voltam sem perda dos valores. Foto, contraste normativo e campos de texto permanecem independentes do modo do M.

## Interações da demonstração

- **Camadas:** Campo → Máscara → Página. As duas primeiras fases mostram a imagem sem tipografia.
- **Formato:** Horizontal (16:9) / Vertical (9:16). Recompõe os campos; não estica um cartão existente.
- **Leitura:** Resultado / Estrutura. No Resultado o estudo está completo. Estrutura retira a fotografia e contorna os próprios elementos de texto, revelando quatro campos reais (identificação; título; corpo; créditos). Não se usa um retângulo verde de segurança.
- **Contraste:** 0% / 20% / 40% / 60%. Comparação disponível na Página em modo Resultado, sem modificar disposição dos elementos.

A lateral da demonstração explica o estado escolhido, sem comentários redundantes. Os contornos do modo Estrutura correspondem a elementos reais no DOM, portanto se adaptam ao formato.

## Verificação obrigatória

Validar navegador em desktop (1440×900) e celular (390×844, 320×640), em 16:9 e 9:16:

- Nenhuma palavra do Título extrapola a área de leitura;
- Identificação, Título, Corpo e Créditos não se sobrepõem;
- Textos permanecem dentro da área útil e alinhados ao mesmo eixo;
- Os controles refletem o estado visível e funcionam por teclado;
- A interface Estrutura usa os campos reais, sem o antigo guia verde;
- Alternar formato, etapas, modos de leitura e contraste não quebra o layout;
- Nenhuma mudança afeta o funcionamento do Laboratório nem as cinco capas do manual.

**Não usar ajustes por elemento para resolver colisões:** corrigir a régua compartilhada e os conteúdos editoriais quando necessário.

## Escolhas confirmadas em 06/11/2026

A assinatura é única por documento. Univers e Perpetua podem se misturar entre palavras da mesma linha do Título, sem criar outro tratamento de texto. A legenda do Elemento usa Detalhe e começa na borda esquerda do elemento. A exportação de combinações sólidas com contraste baixo avisa e exige confirmação como estudo. Referências digitais: M 24 px, pictogramas 32 px e assinatura 120 px; proteção da assinatura isolada de ¼ da altura do símbolo.
