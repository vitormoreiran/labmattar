# LABMATTAR — Composição aplicada: prova de página

**Referência técnica:** o estudo de `04 / COMPOSIÇÃO` utiliza o mesmo núcleo de leitura do `05 / LABORATÓRIO`: `lm-lab-reading` → `lm-lab-kicker`, `lm-lab-main-copy` (Título + Corpo), `lm-lab-bottom`. O arquivo `public/composicao-lab.css` contém essa regra estrutural; `public/composicao-demo.css` apenas adapta o exemplo de imagem, estados e formato.

## O que permanece

- Os únicos tratamentos de texto são **Título**, **Corpo** e **Detalhe** com Univers e Perpetua; a escala proporcional à superfície é aplicada por `manual-headings.css`, não por fontes adicionais.
- A origem horizontal, o alinhamento e a margem de leitura são únicos em toda a página.
- O M conserva vetor, proporções e eixo central. A fotografia pode ser reenquadrada, nunca o vetor.
- O preto de 20% pertence à fotografia sob o texto e acompanha o recorte do M; o modo 0% existe só para comparação, jamais como nova norma.
- **Relação entre camadas:** sempre que um M ou qualquer marcador estiver ativo, a camada de fundo exibe **a mesma imagem selecionada, ampliada e desfocada (blur)**. O conteúdo interior do M pode ser fotográfico ou sólido; em ambos os casos, a camada inferior não fica como cor plana nem vazia. A geometria não muda.
- A opção de fundo (Cor ou Fotografia) continua como preferência salva. Ela só determina a superfície quando M e marcadores estiverem desligados. Desligar o último elemento restaura a escolha original, sem perda de foto, foco ou escala.
- O blur do fundo e o véu preto de 20% são recursos diferentes: o blur define a camada inferior; o véu depende da sobreposição de texto à fotografia.

## Horizontal e vertical — uma estrutura comum

A composição é uma coluna estrutural com três regiões, tal como no Laboratório:

1. **Identificação — Detalhe:** topo da área útil.
2. **Núcleo editorial — Título + Corpo:** bloco central, com o Corpo acompanhando imediatamente o Título e nunca aparecendo no rodapé por sobreposição.
3. **Créditos — Detalhe:** rodapé independente, dentro da mesma margem.

Em `16:9`, o núcleo ocupa uma coluna proporcional ao formato. Em `9:16`, essa coluna usa toda a largura disponível e permanece centralizada verticalmente. São reescaladas e redistribuídas as áreas de texto, não comprimidas as letras de uma orientação para outra. O M permanece geométrico ao centro e a imagem preserva contraste adequado.

## Aparição do M em todas as superfícies

Todas as superfícies (**16:9, 9:16, 1:1 e editorial**) oferecem duas aplicações do **mesmo vetor oficial** (990,08 × 743,18). Não são símbolos distintos nem deformações do M:

- **Elemento** (padrão, inclusive para composições salvas anteriormente): M inteiro, centralizado no eixo da página, com a escala manual do Laboratório preservada. É o comportamento já existente na ferramenta e na segunda referência.
- **Completo**: M ocupa exatamente **100% da altura de qualquer canvas**; sua largura decorre do aspecto original (aproximadamente **133,222% da altura**). Em 9:16, sangra simetricamente pelas laterais e mostra os recortes das extremidades; em formatos largos, a lateral pode permanecer livre. Não esticar, achatar ou converter em outro vetor.

A seleção é apresentada em **04 / Composição** e no **05 / Laboratório** para todos os formatos. Alterar a proporção não muda a escolha do M. A geometria é recalculada a partir da altura real da nova superfície; o tamanho salvo de Elemento permanece intocado.

No modo Completo, em qualquer formato, o controle de escala e os marcadores adicionais do M ficam temporariamente inativos para não criar recortes duplicados. Ao retornar para Elemento, a escala e os marcadores anteriormente escolhidos voltam sem perda dos valores. Foto, contraste normativo e campos de texto permanecem independentes do modo do M.

## Interações da demonstração

- **Camadas:** Campo → Máscara → Página. As duas primeiras fases mostram a imagem sem tipografia.
- **Formato:** Horizontal (16:9) / Vertical (9:16). Recompõe os campos; não estica um cartão existente.
- **Leitura:** Resultado / Estrutura. No Resultado o estudo está completo. Estrutura retira a fotografia e contorna os próprios elementos de texto, revelando quatro campos reais (identificação; título; corpo; créditos). Não se usa um retângulo verde de segurança.
- **Contraste:** 0% / 20%. Comparação disponível na Página em modo Resultado, sem modificar disposição dos elementos.

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
