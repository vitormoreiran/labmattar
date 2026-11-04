# LABMATTAR — Contrato de produção, acervo e exportação do Laboratório

**Situação:** direção de produto acordada em 03/11/2026; roteiro técnico para execução incremental. **Não é uma declaração de funcionalidade já entregue.**

**Prioridade máxima:** fidelidade visual e qualidade do arquivo final. A composição aprovada deve corresponder ao resultado exportado, sem depender da resolução da tela, sem rasterizar desnecessariamente a identidade e sem perder editabilidade quando o destino a suporta.

## Marco 1B — Páginas, Motion e publicação em arquivo

O Laboratório passa a manter uma sequência ordenada no editor existente: criar, duplicar, nomear, reordenar, excluir, salvar e reabrir páginas nos quatro formatos atuais. O contrato `labmattar.presentation` v1 contém composições v1, preservando a leitura dos JSON anteriores. O rascunho multipágina usa armazenamento local; o JSON continua sendo a cópia portátil de autoria.

A cena lógica compartilhada alimenta PNG, PDF e HTML. PDF conserva texto selecionável, Univers/Perpetua incorporadas e paths oficiais; fotografias, filtros, sombras e quadros de motion são camadas raster nas dimensões de entrega. A qualidade 2K/4K determina essas camadas, não uma captura da tela. O PDF usa o formato de cada página; ele não declara PDF/X, CMYK ou qualidade de master fotográfico sem verificação.

O acervo recebe os motions registrados da Matriz por `/motion/catalog.json`, com hashes do projeto e do MP4. Cada instância guarda posição, largura e o tempo do quadro estático. A prévia pode mostrar movimento ou o quadro do PDF. O HTML toca os MP4 silenciosos em loop; o PDF e o PNG usam o quadro selecionado. O motor e a interface da Matriz permanecem responsáveis por editar e renderizar os roteiros.

A saída web é um arquivo HTML independente: navegação por páginas, texto/SVG reais, fontes e mídias incorporadas, projeto JSON recuperável e impressão com formatos definidos. Exportar HTML não publica automaticamente uma composição no servidor. Fotografias privadas só entram no arquivo quando o navegador possui acesso ao recurso; credenciais OAuth não fazem parte do projeto ou da saída.

**Uso:** em Páginas, escolha a página pela lista numerada, organize sua ordem e use Editar esta página para compor. Editar página reúne Superfície, Fundo, M, Texto, Assinatura e Construção. Motion possui entrada própria para adicionar animações da Matriz e ajustar posição, tamanho e quadro estático. Revisar e exportar abre uma área própria: lista das páginas incluídas, escolha de PDF / site HTML / imagem PNG, qualidade das imagens e confirmação do escopo antes de baixar. PDF e HTML incluem a sequência; PNG inclui apenas a página em edição. A barra superior contém somente a entrada dessa etapa. Salvar/Abrir projeto fica em Páginas / Projeto e preserva a sequência editável; os documentos v1 continuam compatíveis.

**Verificação:** contratos em `scripts/test-lab-sequence.mjs`; fluxo real em `scripts/smoke-lab-pages.mjs` e inspeção do PDF em `scripts/verify-lab-pdf.py`. A prova usa quatro páginas, um formato por página, motion, fotografia, vetor e marcadores. Confere ordem, fontes incorporadas, texto extraível, paths, correspondência visual PNG/PDF, HTML independente e restauração do editor após exportar.

O marco 1A abaixo descreve a etapa anterior e seus limites à época. PPTX, intercâmbio After Effects e perfis de gráfica permanecem no roteiro futuro.

## Marco 1A — Documento reversível (escopo de implementação)

**Implementado no Laboratório:** botão para baixar e abrir um documento JSON `labmattar.composition` (schema v1), com um único quadro editável, Título/Corpo/Detalhe, assinatura, ajustes da página, M e marcadores, fotografia selecionada, foco e referências explícitas aos SVG oficiais. O documento declara a resolução do perfil 2K/4K e faz round-trip para o estado do editor com validação antes de substituir o rascunho. O PNG 2K/4K permanece no renderizador Canvas 2D já testado.

**Compatibilidade preparada, ainda não conectada:** o campo `motion` referencia a Matriz Vetorial apenas como origem futura, com `projectRef: null`. Os paths de identidade (`/identidade/` e `m-publicado.svg`) não são tratados como iguais às malhas e SVGs próprios da Matriz. Não há timeline, morfologia ou geometria 3D reimplementada no Laboratório.

**Limites observáveis:** o JSON não incorpora fotografias ou fontes, e o acervo atual refere amostras locais, ainda sem confirmação de master original, hash, resolução efetiva ou licença de incorporação. `output.masterVerified` é `false`. Isso não conclui o aceite de master 4K original, SVG/PDF vetorial, acervo durável, multipágina, PPTX ou After Effects.

**Arquivos do marco:** `public/composicao-document.mjs`, `public/composicao-document-ui.mjs`, `scripts/test-composicao-document.mjs` e teste de download/importação em `scripts/smoke-laboratorio-export.mjs`. O estado de autoria continua no editor atual; o documento é serializado a partir dele, sem criar um segundo editor ou depender da viewport.

## 1. Objetivo e fronteiras

Evoluir o **05 / Laboratório** de prova de identidade para uma ferramenta de produção de composições estáticas, sequências editoriais e entregas audiovisuais. Um mesmo documento deve alimentar redes sociais, apresentações, PDFs, páginas do site e preparação de materiais para After Effects.

**Não criar um editor paralelo nem substituir a Matriz Vetorial.** Preservar as cinco partes do manual, seus princípios de layout, o M oficial, as assinaturas, os três tratamentos de texto (**Título, Corpo e Detalhe**) e a regra fotográfica aprovada. O que muda é o modelo de documento e suas saídas, não a identidade.

A prévia e os testes continuam no Worker de desenvolvimento. **Não publicar em `labmattar.com` por meio deste plano.** Esta documentação também não autoriza uma publicação de produto nem a introdução de regras de marca novas.

## 2. Estado real verificado na base atual

| Superfície / módulo | Existe hoje | Limite observado / integração necessária |
| --- | --- | --- |
| Laboratório de composição (`public/composicao-lab.js`) | M e fundo, foco fotográfico, Título/Corpo/Detalhe, assinaturas compostas, quatro proporções, Play dos textos e rascunho local | Amostras fotográficas limitadas; não há motor geral de exportação de páginas em alta qualidade nem documento multipágina |
| Editor editorial (`public/ambiente-editorial/editorial-v2.js` e `editorial-sequences.js`) | Áreas, páginas, ordem, fundos compartilhados, biblioteca simples e exportação/importação de projeto JSON | Upload atual em Data URL limitado a 1,4 MB; armazenamento local não atende a masters de imagem |
| **Matriz Vetorial atual** (`tools/matriz-vetorial/`) | Roteiros, timelines, pistas, giros, duração, velocidade, controles de composição e projetos JSON; saída PNG e MP4 | O motor responde a formas vetoriais/volumétricas; ainda não é um renderizador geral de páginas editoriais |
| Motion no manual (`/motion.html`, `/motion/matriz/index.html`) | Matriz atual integrada, galeria de oito roteiros, projetos, pôsteres e MP4 registrados/verificados | Fluxo de galeria não é sinônimo de exportação editável para After Effects ou de publicação editorial |
| Pipeline Motion (`scripts/render-motion-exports.mjs`, `scripts/register-motion-export.mjs`, `.github/workflows/motion-export.yml`) | Exportação/validação reproduzível de oito roteiros em **1080 px / 30 fps** com JSON, PNG e MP4; associação por fingerprints do projeto/renderizador | Referência técnica reutilizável; 1080/30 é parâmetro **do pipeline atual**, não teto do futuro Laboratório |

**Atenção ao desenvolvimento concorrente:** a Matriz está sendo atualizada em paralelo. Sempre conferir `main`, `tools/matriz-vetorial/README.md`, `design/motion-matriz.md` e os módulos `src/timeline.mjs`, `src/stage.js`, `src/export-video.js` **antes** de implementar uma integração. Nunca sobrescrever suas alterações nem copiar código da versão antiga `/editor/` supondo que seja a Matriz atual. Não acoplar o motor editorial diretamente aos detalhes internos das malhas ou do morph.

### Responsabilidades separadas

- **Identidade / Laboratório:** regras de página, tipografia, fotografia, assinatura, fundos, M e composição aprovada.
- **Documento editorial:** acervo, áreas, páginas, sequências, estados e ordem semântica.
- **Matriz Vetorial / Motion:** roteiros de movimento, trilhas temporais, interpolação, renderização vetorial/volumétrica e exportações de motion já existentes.
- **Motor de exportação compartilhável:** resolve o documento e as mídias originais em dimensões de entrega, aplica validação e produz derivados específicos, sem alterar o estado de edição.

A integração entre ferramentas deve ocorrer por **contratos versionados** (projeto, asset, timeline, parâmetros de render) e testes de compatibilidade; não por um segundo conjunto de regras tipográficas, pelo HTML da prévia ou pelo `dist/` de outra ferramenta.

## 3. Princípios não negociáveis

1. **Uma fonte de verdade:** a mesma composição (versão, textos, vetores, imagens, foco, máscaras, cor, assinatura, ordem e duração) é usada na prévia e em cada render.
2. **Preview não é master:** zoom e dispositivo modificam apenas a visualização; nunca definir a saída como captura de um canvas ampliado.
3. **Vetores permanecem vetoriais** quando o formato suporta; fotografias são renderizadas a partir do original, não de thumbnails.
4. **Identidade inviolável:** Título/Corpo/Detalhe, Univers/Perpetua, geometria e proporções do M, relação foto–M–blur, véu de contraste, margens e regras de assinatura são herdados das fontes oficiais.
5. **Editar sem destruir:** troca de formato, template ou destino não apaga conteúdo nem altera silenciosamente enquadramentos; salvar rascunho e exportar são ações distintas.
6. **Qualidade mensurável:** cada exportação oferece pré-checagem, relatório de advertências, dimensões exatas e validação de integridade.
7. **Evolução segura:** desenvolvimento incremental, CI e comparação visual. Não mexer no motor ativo da Matriz para implementar exportações de página.

## 4. Modelo de documento e acervo

Modelo conceitual inicial, a versionar antes da implementação:

- **Asset:** `id` estável, tipo (foto, vídeo, SVG, áudio, fonte/referência), URI do original, hash, dimensões, perfil de cor, nome, créditos, licença/permissões, orientação, variantes de preview e metadados.
- **Document:** `id`, `schemaVersion`, título, projeto, idioma, revisão, `pages[]`, `sections[]`, `assetRefs[]`, presets de exportação e status de validação.
- **Section / área:** ordem, identificador, fundo compartilhado e comportamento de continuidade (por exemplo fundo estático enquanto o conteúdo rola).
- **Page:** proporção, tamanho de entrega, regras de margem, `nodes[]`, assinatura, composição M, conteúdo e variações responsivas explícitas.
- **Node:** ID, função (`title`/`body`/`detail` ou mídia/vetor/grupo), conteúdo ou `assetId`, caixa/constraints, z-order, máscara, crop/foco, visibilidade e parâmetros específicos aprovados.
- **Timeline / MotionRef:** duração, FPS de trabalho, pistas e transições referenciadas por projeto/versionamento da Matriz; material estático não precisa de timeline artificial.
- **RenderJob / ExportManifest:** revisão exata do documento, destino, tamanho, cor, formato, versões dos renderizadores, hashes das dependências e arquivos resultantes.

**Acervo:** originais em armazenamento durável (Cloudflare R2 ou equivalente, após avaliação de acesso, custo e permissões); derivados menores apenas para a interface. Não embutir fotos grandes em `localStorage` ou nos JSON de projeto. Não colocar originais grandes ou segredos no Git. O mesmo asset pode servir a várias páginas, com `crop` e foco próprios de cada instância.

**Migração:** importar estados atuais do Laboratório e JSONs do editor editorial sem apagá-los; mapear legendas/créditos para **Detalhe** e resolver subtítulos segundo a hierarquia oficial, sem inaugurar uma quarta tipografia. Toda migração requer teste de ida/volta e tratamento de dados ausentes.

## 5. Matriz de formatos e qualidade (alvos, não capacidade atual)

| Destino | Perfil inicial | Saídas previstas | Critério de master |
| --- | --- | --- | --- |
| Site / apresentação horizontal | 16:9, 1920×1080 px | PNG, SVG onde aplicável, HTML e PPTX | Master opcional 3840×2160 px; imagens e vetores originais |
| Social vertical | 9:16, 1080×1920 px | PNG e derivados web | Master opcional 2160×3840 px |
| Social quadrado | 1:1, 1080×1080 px | PNG e derivados web | Master opcional 2160×2160 px |
| Social feed retrato | **4:5**, 1080×1350 px | PNG e derivados web | Master opcional 2160×2700 px; **novo perfil a implementar**, não existente no Laboratório atual |
| Editorial impresso | A4 210×297 mm inicialmente | PDF vetorial/multipágina | Imagens a ~300 ppi **efetivos no tamanho de aplicação**, fontes incorporadas quando licenciadas, sangria e perfis conforme a gráfica |
| Motion / After Effects | proporção da peça, 30 fps base; 60 fps opcional | ZIP de camadas/JSX/JSON/assets e renders de referência | Composição nativa editável no AE após executar importação; sem promessa de `.aep` gerado diretamente no browser |

- **Cores:** sRGB/gerenciamento consistente para digital; PDF de gráfica com perfil ICC adequado e eventual PDF/X **somente após prova com o fornecedor**. Não converter automaticamente tudo para CMYK.
- **Transparência:** suportada quando solicitada; diferenciada de fundo branco e de máscara de M.
- **Vetores:** SVG/PDF preservam os paths oficiais e proporções; nenhuma reconstrução aproximada do M.
- **Raster:** arquivos e dimensões finais definidos pelo preset de exportação; nunca aumentar a resolução por interpolação sem sinalizar perda de detalhe.
- **Vídeo:** FPS, duração, codec, bitrate, proporção, fundo e primeiro/último quadro explícitos; falha clara quando navegador/encoder não suporta o perfil. Reaproveitar estratégia de exportação e telemetria já validada na Matriz.
- **Preview:** sempre oferecer modo de avaliação em tamanho real/100%, área segura e comparação com o master gerado.

## 6. Perfis de saída

### Estático digital

PNG de alta fidelidade como primeira entrega; SVG quando toda a hierarquia visual puder ser reproduzida sem perder máscaras, fontes ou mídias. JPEG/WebP/AVIF são derivados de distribuição, **não** substituem o master. O arquivo conserva metadados úteis e informa dimensões, perfil de cor e conteúdo rasterizado.

### PDF e apresentações

Um documento com páginas ordenadas deve produzir PDF multipágina e apresentação PPTX. Texto e vetores editáveis sempre que o destino permitir; registrar qualquer parte rasterizada, sobretudo blur, máscaras e composições complexas. Para site, manter HTML/CSS e navegação reais, com uma mesma ordem semântica e fundo compartilhado por área, em vez de converter tudo em slides-imagem.

### After Effects — contrato de intercâmbio

O pacote previsto é um ZIP com `montar-composicao.jsx`, `composicao.json`, diretórios de `fotografias/`, `vetores/`, `camadas/` e `referencia.png`. O script monta no AE composição, dimensões, duração, FPS, camadas, ordem, posições e nomes; textos são nativos/editáveis quando as fontes estão instaladas, e máscaras/vetores devem manter contorno e transparência. Se algum efeito não tiver equivalência confiável, usar camada renderizada **mais** referência e relatório, em vez de silenciosamente alterar a imagem.

O `.aep` resulta da abertura/montagem no After Effects; não fingir que um PNG, SVG ou ZIP renomeado é projeto AE. Precisamos de prova prática de round-trip (Laboratório → AE → alteração de texto/imagem e re-render). Animações vindas da Matriz entram por versão do roteiro ou render/comp de referência, **não** pela reimplementação do morph no Laboratório.

## 7. Etapas e portões de aceite

### Fase 1 — Motor de qualidade e exportação estática (primeira entrega)

- Renderer independente de viewport e zoom, com presets de dimensão e escala reais.
- PNG master e SVG onde viável; registro de fontes, cores e recursos rasterizados.
- Preflight: ausência de asset/fonte, overflow, crop, vetores, resolução efetiva e semelhança entre prova e arquivo.
- **Aceite:** a composição de referência com fotografia, M, Título/Corpo/Detalhe e assinatura sai em 3840×2160 px com geometria, enquadramento e legibilidade coerentes com a prova; reabrir o master e inspecionar dimensões e detalhes.

### Fase 2 — Acervo durável e sequências editoriais

- Cadastro/upload de originais sem limite arbitrário de 1,4 MB baseado em Data URL; thumbnails separados e storage durável.
- Documentos com múltiplas páginas; áreas com fundo compartilhado; duplicar, reordenar e editar sem perder original.
- Histórico/versionamento; export/import de projeto com manifesto de assets; adequação da hierarquia Título/Corpo/Detalhe.
- **Aceite:** usar uma foto em pelo menos duas páginas com crops diferentes; reabrir documento e reproduzir as mesmas composições; testar três páginas e continuidade de fundo.

### Fase 3 — Publicação editorial multiformato

- PDF com páginas ordenadas, formato físico e preflight; PPTX com máximo de editabilidade preservada; saída HTML para o site.
- Variações 16:9, 9:16, 1:1, editorial e novo 4:5 sem distorcer o M ou criar regras de texto.
- **Aceite:** mesma sequência renderizada em PDF e PPTX, comparada visualmente com a referência, com aviso das camadas não editáveis; HTML responsivo e navegável sem divergência editorial.

### Fase 4 — Intercâmbio AE e motion

- Empacotar camadas + JSON + JSX; reconstruir no AE e permitir edição posterior.
- Reaproveitar técnicas verificadas da Matriz para timeline, estados e exportação, via contrato versionado e testes; integração progressiva com `/motion/matriz/index.html`.
- **Aceite:** exportar página com M, fotografia, três tratamentos de texto e assinatura, abrir no AE, editar texto/imagem, renderizar novamente com dimensões corretas e documentar limitações. Testar transição/roteiro da Matriz sem alterar seu projeto original.

**Regra transversal:** nenhuma fase está concluída por haver somente botão, mockup ou teste de compilação. Exige arquivo gerado, inspeção visual e funcional e relatório das diferenças.

## 8. Validação e governança

- **CI estático:** schema, dependências, checksums, dimensões, alpha, integridade dos arquivos e status dos originais.
- **CI visual:** composição comparativa nos quatro formatos atuais (e 4:5 após implementação), navegadores desktop/mobile, fontes carregadas, textos sem colisão, vetores e máscaras preservados.
- **Regressão:** imagens de referência aprovadas para foto, M sólido/fotográfico, blur, título, corpo, detalhe e quatro variantes de assinatura, incluindo **Sem assinatura**.
- **CI Motion:** conservar testes, fingerprint dos roteiros, verificação do primeiro e último quadro, duração/FPS e H.264; não misturar parâmetros de render de Motion com resoluções do editor editorial.
- **Release:** mudança do código da Matriz exige revisão de seus próprios testes e contrato de interoperabilidade, sem substituir automaticamente um motor pelo outro. Testes e deploy apenas na prévia autorizada.
- **Documentação de limites:** toda opção informa se é **implementada**, **experimental** ou **planejada**. Nenhum formato de exportação aparece como disponível antes de funcionar.

## 9. Decisão operacional

**Ordem mantida:** (1) renderização fiel, (2) acervo e sequências, (3) PDF/PPTX/web, (4) After Effects e motion interoperável. O primeiro protótipo deve ser orientado por um **master estático 4K validado** e pelo contrato de documento, não por uma nova interface de exportação sem motor.

A Matriz Vetorial já é produto real e continua sendo desenvolvida em paralelo. Tratar sua timeline, seus controles e sua cadeia PNG/MP4/JSON como **base de experiência e possível infraestrutura compartilhável**, sujeitos a auditoria técnica e testes de equivalência. **Não copiar funções cegamente, não retroceder a Matriz a uma versão antiga e não unificar os projetos antes do contrato de dados.**

### Referências de implementação

- Identidade e régua: `design/composicao-superficies.md`, `design/manual-layout-contract.md`, `public/manual-headings.css`.
- Experiência editorial existente: `design/AMBIENTE_EDITORIAL_SPEC.md`, `public/ambiente-editorial/editorial-v2.js`, `public/ambiente-editorial/editorial-sequences.js`.
- Motion atual: `design/motion-matriz.md`, `tools/matriz-vetorial/README.md`, `tools/matriz-vetorial/src/timeline.mjs`, `tools/matriz-vetorial/src/export-video.js`.
- Automações Motion existentes: `.github/workflows/motion-export.yml`, `scripts/render-motion-exports.mjs`, `scripts/register-motion-export.mjs`.

**Atualizar este contrato quando houver uma decisão aprovada ou mudança comprovada de capacidade.** Não registrar propostas como funcionalidade entregue.
