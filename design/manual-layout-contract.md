# LABMATTAR — contrato de diagramação editorial

**Status:** regra de construção para o manual de identidade (cinco capítulos).
**Escopo:** 01 Símbolos, 02 Tipografia, 03 Cores, 04 Composição, 05 Laboratório.
**Fontes da verdade:** este documento define a geometria; `public/manual-layout.css` executa a grade; `public/manual-headings.css` é a única fonte para tipografia.

## 1. Invariantes

- Não existem cinco layouts independentes. Todas as capas usam o mesmo mapa de posição; todas as seções partem da mesma régua.
- Os únicos tratamentos tipográficos são **Título, Corpo e Detalhe**. Nunca criar um quarto peso, tamanho ou entrelinha para resolver uma quebra ou uma composição.
- O título pode quebrar linhas, mas **não diminui** para caber. A banda do título é reservada, inclusive em capas com títulos curtos.
- A cor e o formato mudam o conteúdo visual, não as coordenadas do texto do manual.
- Os exemplos e a ferramenta podem ocupar mais colunas, mas não podem estabelecer outra origem editorial.
- O eixo de leitura coincide com a borda inicial do quadro de 1.350 px: não acrescentar recuos de coluna ao texto. A largura e a posição anteriores à PR #50 são a referência de preservação.
- M, nove vasos e suas proporções originais não são alterados por esta especificação.
- O arquivo de layout não contém `font-size`, `font-family`, `font-weight`, `line-height` nem outros parâmetros tipográficos.

## 2. Grade desktop (>= 1024 px)

| Propriedade | Valor normativo |
| --- | --- |
| Área máxima da grade | 1.350 px, centralizada |
| Colunas | 12 |
| Intervalo | 20 px |
| Margem externa mínima | `clamp(20px, 4vw, 64px)` |
| Origem do texto | Coluna 1 |
| Sobretítulo / identificação | Colunas 1–12 |
| Título | Colunas 1–9 |
| Corpo | Colunas 1–5 |
| Detalhe | Colunas 10–12 |
| Arte, imagem ou demonstração | Colunas 1–12, com a mesma grade |
| Linha de separação | Alinhada ao quadro editorial do capítulo |

As colunas são contadas de 1 a 12, com fim exclusivo no CSS Grid: `1 / 10`, `1 / 6` e `10 / 13`. Para títulos maiores, o conteúdo pode quebrar dentro das colunas; a origem permanece a mesma.

## 3. Contrato vertical da capa

1. Barra de navegação global: **54 px**.
2. Navegação local, quando presente: **48 px**. A capa compensa essa diferença; uma segunda barra nunca empurra os textos da capa para baixo.
3. Topo visual da identificação: `clamp(132px, 18svh, 186px)` desde o topo do viewport, independentemente da presença da navegação local.
4. Distância identificação → título: **48 px**.
5. Banda reservada ao título: **214 px** no desktop, sem redução automática; títulos de uma e duas linhas compartilham a mesma banda.
6. Distância banda do título → Corpo/Detalhe: **44 px**.
7. Corpo e Detalhe começam na mesma linha. O Corpo ocupa a coluna principal; o Detalhe é lateral. Um link no Detalhe continua tendo a tipografia de Detalhe.
8. A capa encerra, no mínimo, no limite inferior do viewport; conteúdos longos expandem a página naturalmente, sem colisão nem corte.
9. Nenhuma capa pode ter ajustes próprios de `margin-top`, `padding-top`, `min-height` ou `max-width`.

## 4. Contrato das seções internas

- A sequência é **identificação → título da seção → Corpo e/ou Detalhe → demonstração**.
- Reutilizar os mesmos eixos horizontais das capas. A demonstração pode atravessar as doze colunas, mas as legendas voltam aos campos de Corpo e Detalhe.
- Ritmo vertical de seção: `clamp(84px, 10vw, 140px)`. Uma seção pode crescer pelo conteúdo, não pela introdução de lacunas arbitrárias.
- A identificação abre a seção; o título vem abaixo, na posição comum. Regras e exemplos não introduzem uma hierarquia de títulos paralela.
- Blocos densos, como o Laboratório, usam o quadro mais amplo da grade sem alterar a origem do texto do manual. Controles internos obedecem à mesma tipografia Detalhe.
- Separadores são linhas simples, sem uso decorativo de cores ou caixas.

## 5. Responsividade

| Largura | Comportamento |
| --- | --- |
| >= 1024 px | 12 colunas, Corpo 1–5 e Detalhe 10–12 |
| 701–1023 px | 12 colunas fluidas, Corpo 1–7 e Detalhe 9–12, mantendo mesmo alinhamento e ordem |
| <= 700 px | Uma coluna de leitura, mantendo a ordem: Identificação, Título, Corpo, Detalhe, conteúdo |
| Todas | Sem `font-fit`, `scale()` ou `font-size` por elemento para remediar excesso de texto |

O título tem banda vertical reservada no desktop/tablet. No celular, a banda é reduzida de forma uniforme para todos os capítulos, nunca escolhida por título individual. A posição inicial da identificação continua compartilhada.

## 6. Controle de qualidade obrigatório

Em 1440×900, 1024×768, 768×1024, 390×844 e 320×640:
- Medir `left` e `top` de Identificação, Título, Corpo e Detalhe nas cinco capas. Cada campo deve apresentar desvio máximo de **2 px** entre capítulos na mesma viewport.
- Conferir nav global 54 px, local 48 px quando existir, sem sobreposição.
- Garantir que todo título cabe horizontalmente por quebra natural, sem redução de fonte.
- Proibir rolagem horizontal e cortes de conteúdo.
- Manter somente os três tratamentos de texto no estilo computado.
- Garantir que o canvas e os controles de Composição/Laboratório continuam funcionais.
- Revisar visualmente desktop e mobile; teste automatizado é necessário, mas não substitui inspeção visual.

## 7. Alteração das regras

Qualquer mudança futura de grade, espaçamento, bandas verticais ou breakpoints deve ser alterada primeiro **neste contrato e nos tokens compartilhados**, aplicada aos cinco capítulos juntos e comprovada pelo teste. Correções isoladas em uma página não são permitidas.
