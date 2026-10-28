# LABMATTAR — Ambiente Editorial
Especificacao funcional v0.1 | 2026-10-28 | Estado: proposta, sem alterar normas aprovadas

## Proposito
Ambiente unico de criacao, composicao, organizacao e publicacao de paginas editoriais para apresentacoes, projetos e narrativas visuais. A pagina e a unidade de edicao; uma publicacao e uma sequencia de paginas. Conteudo e apresentacao visual devem ser separados para permitir reuso.

## Principios
1. Edicao direta como regra: clique seleciona, duplo clique edita, arraste move, alcas transformam.
2. Canvas em primeiro plano. Painel de propriedades contextual; menus ocultaveis.
3. Identidade compartilhada, composicao local: normas globais nao devem ser alteradas silenciosamente.
4. Conteudo independente de template e de posicao: preservar ativos, metadados e textos quando o layout muda.
5. Desktop e mobile sao representacoes da mesma pagina, com ordem semantica unica e ajustes responsivos permitidos.
6. Preview usa o mesmo renderizador da publicacao, sem divergencia de conteudo.
7. Projetos de portfolio e mesa de edicao existentes NAO sao substituidos; podem ser fontes de conteudo, mediante integracao posteriormente validada.

## Anatomia da interface
- Topo: voltar, titulo do documento, salvar/estado de salvamento, undo/redo, preview, publicar.
- Esquerda: inserir [Texto, Imagem, Video, Elementos, Modelos], abas de Acervo e Camadas.
- Centro: canvas com pagina, guias e manipulacao direta; zoom e modo de visualizacao.
- Direita: propriedades contextuais (Pagina, Texto, Imagem, Video, Grupo, Elemento); sem inspecionar CSS como tarefa obrigatoria.
- Inferior: miniaturas da sequencia, criar/duplicar/reordenar/ocultar/excluir paginas; recolhivel.
- Estado vazio: escolher modelo ou iniciar pagina em branco, com acao obvia de inserir texto/imagem.

## Modelo de dominio
- Asset: id imutavel, tipo, source, titulo, creditos, metadados, variantes. O mesmo asset pode ser usado em varias composicoes.
- Document: id, titulo, idioma, status, pagina inicial, pages[], references; categoria editorial opcional (apresentacao/portfolio/narrativa).
- Page: id, templateRef opcional, nodes[], responsividade, transicao, visibilidade, ordem.
- Node: id, tipo (title/subtitle/body/image/video/vector/group), assetRef ou content, styleRole, geometry, constraints, responsiveOverrides, zIndex, accessibility.
- Template: id, versao, slots nomeados, defaults de geometria e comportamento; instancia personalizavel, sem copiar nem perder conteudo.
- Identity: tokens oficiais e estados de governanca oriundos de design/identity-system.json.
- Publication: ref para snapshot validado, URL/caminho, status, revisao e metadados de SEO/acessibilidade.
- Project content existente: fonte externa para selecionar/instanciar material; nao duplicar editor atual.

## Edicao de texto
Tres funcoes editoriais solicitadas: titulo, subtitulo e corpo. O registro atual em identity-system.json usa title/body/detail; compatibilidade e status desses papeis devem ser resolvidos explicitamente antes de alterar tokens. Campos de texto compartilham eixo de alinhamento; texto quebra naturalmente, sem posicionamento por caracteres soltos. Controles de edicao: conteudo inline, funcao tipografica, quebra, largura, posicao vertical, espacamento previsto pelo sistema. Fonte e peso fora do sistema so por excecao aprovada.

## Imagens e midia
Galeria central pesquisavel e filtravel por projeto, tipo, orientacao e credito. Upload e referencia a acervo existente; nenhuma duplicacao obrigatoria. Na instancia da pagina: inserir/substituir, fit (cover/contain), focal point, crop, escala, posicao, legenda, texto alternativo e creditos. Preservar original; armazenamento de media nao deve usar arquivos grandes no Git. Video usa posterior/legendas/controles e estados de carregamento.

## Modelos de pagina
Modelos sao padroes de composicao, nao documentos fechados. Biblioteca inicial a validar: abertura, texto editorial, imagem + texto, imagem integral, dupla de imagens, galeria, secao informativa, encerramento. Cada modelo declara slots, margens, alinhamento, comportamento responsivo e exemplos de uso. Trocar modelo nao pode apagar conteudo; informar quando nao houver correspondencia automatica.

## Responsividade
Desktop e mobile visualizados no editor. Uma fonte de conteudo e ordem semantica. Reflow padrao por constraints e slots; overrides explicitos por breakpoint para crop, ordem visual e tamanho, sem criar paginas independentes. Inspecionar overflow, legibilidade, proporcoes e comportamento de imagens antes de publicar.

## Historico e persistencia
Autosave com indicador claro, salvamento versionado, undo/redo por operacao, restauracao, erro recuperavel. Nao presumir armazenamento em browser como unica origem. Publicacao separada do rascunho, com revisao e preview. Nao alterar labmattar.com por este documento.

## Fluxos prioritarios
A. Novo documento -> selecionar formato -> modelo/blank -> inserir tres papeis de texto -> imagens -> ajustar desktop/mobile -> salvar -> preview.
B. Abrir documento -> selecionar pagina -> editar diretamente -> duplicar/reordenar -> validar -> publicar.
C. Escolher asset do portfolio/acervo -> inserir em varias paginas -> enquadrar independentemente -> atualizar metadados na origem sem sobrescrever crops locais.
D. Trocar modelo -> preservar texto/imagens -> remapear slots -> mostrar conflitos sem descartar material.

## Mapa de reaproveitamento e limites verificados
- design/identity-system.json: fonte inicial de tokens, status e elementos oficiais; title/body/detail (nao reinterpretar como approved automaticamente).
- design/composicao.html: experimento de artboard, margens, grid, disposicao de titulo, cores, simbolos; referencial, NAO motor completo de paginas.
- design/imagem.html: experimento de upload local, fit/crop/foco e sobreposicao de texto; reutilizar conceitos e testar extracao.
- design/EditorialAssembly.tsx e app/editor/page.tsx: sequenciamento e edicao do sistema vetorial; nao acoplar motor de morph ao editor de paginas.
- content/media.json e schema: catalogo inicial de midia (principalmente video); validar extensao de schema para imagens se necessario.
- editor.labmattar.com: interface observada de gestao de projetos, sequencia e captions, mas origem de codigo/contrato API ainda NAO estabelecidos neste repositorio.
- labmattar.com: comportamento visual/responsivo tomado como referencia do produto; auditoria tecnica do codigo de producao pendente, sem assumir correspondencia com este repositorio.
- design/ARCHITECTURE.md: principios de fundamentos/laboratorio/biblioteca e governanca; preservar.
 
## Fora do escopo agora
Escolha de novos SDKs, substituicao da mesa de projetos, refatoracao do motor vetorial, implementacao tecnica, publicacao em dominio principal.

## Criterios de aceitacao da primeira versao
- Criar documento com ao menos tres paginas e reordenar por miniaturas.
- Editar titulo, subtitulo e corpo diretamente no canvas, mantendo papeis globais.
- Selecionar imagem existente, inserir em duas paginas, aplicar crops diferentes sem duplicar asset.
- Aplicar e trocar modelo sem perda silenciosa de conteudo.
- Visualizar desktop/mobile, corrigir overflow e preservar ordem de leitura.
- Salvar, reabrir e recuperar a edicao sem perda; undo/redo em transformacoes.
- Preview correspondente ao resultado publicado e publicacao separada do rascunho.
- Preservar componentes e publicacoes existentes; nao modificar main/producao sem revisao.

## Proxima tarefa de analise
Documentar contratos de dados e operacoes do canvas; depois mapear tres paginas reais de projeto e o Simposio para testar se o modelo suporta os seus comportamentos, sem toma-los como unico limite do produto.
