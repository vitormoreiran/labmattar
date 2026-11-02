# LABMATTAR — contrato de composição por superfície

**Escopo:** demonstração de construção da página em `04 / Composição` (horizontal 16:9 e vertical 9:16).
**Norma tipográfica:** `public/manual-headings.css`. Nunca criar um quarto formato de texto.

## O que permanece

1. Os papéis semânticos são sempre **Título**, **Corpo**, **Detalhe**, com Univers e Perpetua conforme a identidade. A aplicação em miniatura usa a escala relativa ao próprio canvas, nunca ao viewport do navegador.
2. Margens do campo de leitura são comuns aos quatro blocos: identificação, título, Corpo e créditos.
3. O M mantém a geometria, as proporções e o eixo central. A fotografia pode ser reenquadrada; o M não é deformado.
4. O véu preto de 20% só é ativado na fotografia sob texto na etapa `03 / Página`, quando `20%` estiver selecionado. `0%` serve como comparação, não como regra alternativa.

## Regras do vertical (9:16)

- **Identificação:** fixa no topo da área útil, dentro das margens.
- **Título:** área superior, com quebras editoriais em grupos de palavras; nunca pode ultrapassar a largura da área de leitura, cortar letras ou colidir com Corpo.
- **Centro visual:** campo livre para o M e a fotografia, sem exigir que os textos acompanhem o centro geométrico do M.
- **Corpo:** bloco independente, encostado ao fim do campo de leitura, *acima* dos créditos; preserva entrelinha do papel Corpo.
- **Créditos / detalhes:** faixa final separada. Nenhum crédito se mistura com o parágrafo.
- **Escala:** token de Título, Corpo e Detalhe calculado em `cqw` a partir da largura real da superfície; esse é um único perfil de escala para cada orientação, sem ajuste automático por palavra e sem mudanças manuais de `font-size`.
- **Margens:** o guia `Área de leitura` evidencia a régua mas não atravessa a tipografia. A legenda da guia aparece abaixo do campo, sem cobrir a identificação.

## Regras do horizontal (16:9)

- Mantém a leitura central, com identificação no topo e créditos ao fim.
- Usa os mesmos papéis tipográficos, dimensionados pela largura real do quadro horizontal.
- Mudança de formato **recompõe a página**, nunca usa o título do horizontal apenas espremido no vertical.

## Verificação de regressão

A prova visual e a verificação em navegador devem inspecionar o vertical em janelas de 1440, 390 e 320 px de largura, e conferir que:

- `Identificação.bottom < Título.top`;
- `Título.bottom < Corpo.top`;
- `Corpo.bottom < Créditos.top`;
- todos os campos, inclusive os grupos do Título, permanecem dentro da régua;
- a tipografia se ajusta ao tamanho da própria página de prova (não ao viewport);
- camadas, comparação de contraste e exibição de guias continuam interativas.

**Importante:** corrigir o exemplo não altera escala nem posições gerais das cinco capas do manual; essas são governadas por `design/manual-layout-contract.md`.
