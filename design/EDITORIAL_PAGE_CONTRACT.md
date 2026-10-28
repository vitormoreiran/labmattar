# LABMATTAR — Contrato de pagina e interacao
Definicao funcional v0.2 | 2026-10-28 | Proposta de produto (nao implementada)

## Decisao de produto
Um documento editorial gera apresentacoes, projetos e narrativas web na mesma interface. A pagina e a unidade de autoria, sem obrigacao de proporcao fixa. Uma pagina admite regioes livres, regioes em fluxo e combinacoes das duas. O canvas de edicao visual nao e o formato canônico da publicacao.

## Objetos e relacoes
- Document: titulo, idioma, identidade, pages[], assets referenciados, versoes, destino e estado de publicacao.
- Page: id persistente, nome, ordem, visibilidade, background, regions[], responsiveConfig, navegacao e transicoes opcionais.
- Region: id, modo (free|flow), constraints, alinhamento, limites, elementos ou subregioes, regras de reflow. Regioes podem agrupar objetos para comportamento compartilhado.
- Element: id, type, content ou assetRef, styleRole, layout, responsiveOverrides, ordem semantica e propriedades acessiveis.
- Template: definicao versionada de Page/Region com slots semanticos e comportamento responsivo; aplicado por copia parametrizada, sem apagar conteudo.
- Asset: referencia estavel ao original, metadados e variantes de exibicao. Crop/focalPoint pertencem a instancia Element, nao ao original.

## Regras da composicao
- Livre: manipulacao visual, posicoes relativas a regiao, alinhamento por guias, z-index e agrupamento; constraints evitam coordenadas rigidamente fixas quando o viewport muda.
- Fluxo: ordem semantica, altura determinada pelo conteudo, espacamentos tokenizados, alinhamento padrao e reflow responsivo.
- Combinada: regioes livres e fluxo na mesma Page. Uma sobreposicao nao pode tornar conteudo essencial inacessivel.
- Defaults do sistema sao seguros; overrides por breakpoint sao excepcionais, rastreaveis e exibidos ao usuario.
- Desktop/mobile usam o mesmo conteudo. Alteracoes de crop e composicao visual sao permitidas sem duplicar os textos.

## Texto
Tres funcoes no produto: titulo, subtitulo, corpo. Mapeamento para tokens atuais (title/body/detail) permanece pendente de validacao editorial. Todos os textos partem do mesmo eixo de alinhamento configuravel do documento/template. O usuario edita conteudo inline, largura, quebra intencional e posicao; excecoes de identidade dependem de permissao explicita.

## Biblioteca e modelos
A biblioteca unifica fontes de conteúdo sem substituir editor.labmattar.com. Abas principais: Inserir, Acervo, Modelos, Camadas. O editor de projetos permanece distinto; sua API/schema nao foram verificados neste repositorio. Modelos iniciais a estudar: abertura, editorial longo, imagem integral, imagem+texto, galeria, informacoes e encerramento. Modelos sao hipóteses e nao normas aprovadas.
A troca de modelo remapeia slots por funcao semantica, exibe conflitos e nao descarta conteudo.

## Interface unica
- Topo: documento, estado de salvamento, historico, preview, publicar.
- Esquerda: Inserir / Acervo / Modelos / Camadas (uma aba por vez).
- Centro: canvas WYSIWYG que renderiza o mesmo documento usado no preview; regioes visiveis como guias editaveis somente ao selecionar.
- Direita: inspector contextual (pagina, regiao, texto, imagem, video, vetor, grupo), recolhivel.
- Inferior: miniaturas de paginas, ordem e gestao.
- Clique seleciona; duplo clique edita texto/crop; drag move; alcas redimensionam; shift multisselecao; atalhos undo/redo.
- Ao selecionar a pagina, mostra propriedades gerais. Ao selecionar um elemento, somente propriedades relevantes.
- O modo de preview esconde guias e controles, mas nao muda o mecanismo de renderizacao.

## Estados e integridade
Rascunho, revisao e publicado sao estados separados. Autosave nao publica. Persistencia registra revision/autor/instante, com conflito detectavel. Acoes destrutivas têm confirmacao ou recuperacao. Dados sao versionados, com migracoes. O primeiro contrato nao pressupoe engine/SDK.

## Aceitacao funcional
1. Criar documento, adicionar 3 paginas com regioes de tipos distintos, renomear e ordenar.
2. Editar 3 funcoes de texto no canvas e preservar conteudo ao trocar de modelo.
3. Inserir um asset duas vezes com crops individuais.
4. Testar a mesma pagina em viewport largo e estreito com ordem semantica preservada, sem overflow.
5. Salvar, recarregar, usar undo/redo e recuperar revisao anterior.
6. Preview renderiza os mesmos elementos/estilos sem chrome do editor.
7. Publicacao e operacao explicita, isolada do rascunho; sem alterar labmattar.com durante POC.

## Analises seguintes, nao precondicoes para o contrato
- Confrontar este modelo com paginas reais de projetos e com o Simposio, avaliando casos de composicao que nao sao expressaveis.
- Confirmar origem e acesso aos assets/publicador do editor de projetos; o codigo deste editor nao foi identificado em vitormoreiran/labmattar.
- Validar papel subtitulo com as definicoes tipograficas existentes.
- Especificar schema tecnico e interoperabilidade somente apos validar a experiencia editorial.
