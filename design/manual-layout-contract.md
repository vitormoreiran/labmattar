# LABMATTAR — contrato de diagramação editorial

**Status:** regra de construção para o manual de identidade (seis capítulos).
**Escopo:** 01 Símbolos, 02 Tipografia, 03 Cores, 04 Composição, 05 Laboratório, 06 Redes Sociais.
**Fontes da verdade:** este documento define a geometria; `public/manual-layout.css` executa a grade; `public/manual-headings.css` é a única fonte para tipografia.

## 1. Invariantes

- Não existem cinco layouts independentes. Todas as capas usam o mesmo mapa de posição; todas as seções partem da mesma régua.
- Os únicos tratamentos tipográficos são **Título, Corpo e Detalhe**. Nunca criar um quarto peso, tamanho ou entrelinha para resolver uma quebra ou uma composição.
- O título pode quebrar linhas, mas **não diminui** para caber. Sua banda é reservada e o conteúdo é centralizado verticalmente dentro dela: um título curto não cria uma lacuna exagerada antes do Corpo.
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

1. A capa ocupa, no mínimo, a altura disponível depois da navegação. **A composição inteira — identificação, título, Corpo e Detalhe — é centralizada verticalmente na área útil**, sem uma coordenada fixa para a identificação.
2. Navegação global: **54 px**; navegação local, quando houver: **48 px**. A compensação óptica de **−24 px** nas páginas com menu local mantém os mesmos campos verticais nas cinco capas, independentemente de haver uma segunda barra.
3. Respiro mínimo externo no desktop: topo `clamp(36px,5svh,56px)` e base `clamp(44px,6svh,70px)`. A base ligeiramente mais ampla favorece o equilíbrio visual.
4. Distância entre Identificação e banda do Título: **44 px** no desktop. O bloco do título conserva **214 px** de altura mínima, com o conteúdo centrado verticalmente; não se altera escala, peso ou entrelinha para compensar títulos curtos.
5. Distância entre a banda do Título e a leitura: **30 px** no desktop. Corpo e Detalhe começam na mesma linha, em suas colunas fixas.
6. A linha de leitura reserva uma banda mínima de **176 px** no desktop/tablet. O maior texto introdutório define esta reserva comum: a extensão dos textos não empurra outras capas para posições distintas.
7. No celular, a composição se empilha na ordem Identificação → Título → Corpo → Detalhe, com bandas de Título `clamp(88px,12svh,104px)` e leitura **245 px** (**290 px** em telas até 350 px) para abrigar os textos mais longos sem cortes. Em telas de até 350 px, o respiro externo é redistribuído em **42 px acima** e **30 px abaixo** para evitar um desvio entre capas com e sem navegação local. Os intervalos diminuem proporcionalmente, não a tipografia.
8. Quando a soma dos conteúdos e respiros exceder a altura disponível, a capa **cresce naturalmente**. É preferível uma rolagem vertical legítima a cortes, sobreposição ou escala de fonte inconsistente.
9. A origem horizontal continua na **coluna 1**, com quadro de **1.350 px**. Não adicionar margens ou deslocamentos por página para ajustar um caso individual.

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

O título tem banda vertical reservada no desktop/tablet e conteúdo centralizado nessa banda. No celular, a banda é reduzida de forma uniforme para todos os capítulos. A posição inicial da identificação permanece compartilhada; o conjunto é centralizado pela altura real disponível, não pelo topo arbitrário de um capítulo.

## 6. Controle de qualidade obrigatório

Em 1440×900, 1024×768, 768×1024, 390×844 e 320×640:
- Medir `left` e `top` de Identificação, Título, Corpo e Detalhe nas cinco capas. Os campos estruturais devem apresentar desvio máximo de **2 px** entre capítulos na mesma viewport (o Detalhe empilhado no celular segue naturalmente a altura do Corpo).
- Conferir que o centro vertical da composição acompanha o centro da área útil da tela, com compensação óptica de no máximo **26 px**, e que o conteúdo do título fica centralizado na banda reservada.
- Conferir nav global 54 px, local 48 px quando existir, sem sobreposição.
- Garantir que todo título cabe horizontalmente por quebra natural, sem redução de fonte.
- Proibir rolagem horizontal e cortes de conteúdo.
- Manter somente os três tratamentos de texto no estilo computado.
- Garantir que o canvas e os controles de Composição/Laboratório continuam funcionais.
- Revisar visualmente desktop e mobile; teste automatizado é necessário, mas não substitui inspeção visual.

## 7. Alteração das regras

Qualquer mudança futura de grade, espaçamento, bandas verticais ou breakpoints deve ser alterada primeiro **neste contrato e nos tokens compartilhados**, aplicada aos cinco capítulos juntos e comprovada pelo teste. Correções isoladas em uma página não são permitidas.

## 7. Extensão / Redes Sociais

O capítulo 06 reutiliza a mesma geometria de capas e seções, os únicos três tratamentos Título/Corpo/Detalhe e os SVGs oficiais. As demonstrações internas são superfícies contextuais, não uma nova escala de identidade. O feed é uma simulação editorial; nenhuma assinatura, cor, ícone ou motion é compulsório em cada publicação. Em caso de dúvida, preservar o documento visual original.
