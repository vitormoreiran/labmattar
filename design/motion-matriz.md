# Motion e Matriz Vetorial

A área `/motion.html` reúne a Matriz atual e os roteiros exportados. Motion tem acesso próprio logo após Símbolos e compartilha a grade editorial e os três tratamentos de texto do manual. O Laboratório de composição mantém seu próprio acesso e sua ferramenta. Em Símbolos, uma prévia Motion substitui a antiga demonstração de contornos.

## Fontes de verdade

- `tools/matriz-vetorial/`: versão atual da ferramenta, com dependências e CSS isolados. O site publica seu build em `/motion/matriz/index.html`.
- `tools/matriz-vetorial/src/motion-catalog.mjs`: catálogo dos oito percursos e seus estados editoriais.
- `tools/matriz-vetorial/src/timeline.mjs`: pares preparados, presets, tempos e orientação acumulada.
- `tools/matriz-vetorial/src/roteiros/`: cinco projetos complementares. Os três primeiros percursos vêm dos presets existentes.
- `design/motion.html`, `public/motion.css` e `public/motion.js`: estrutura, apresentação e reprodução da galeria.
- `public/motion/exports.json`: vínculo verificável entre cada MP4 e o projeto que o gerou.
- `scripts/prepare-motion.mjs`: valida os exports, gera a página e os downloads JSON, e copia o build da Matriz para o manual.

`/editor/` permanece como ferramenta anterior. Os acessos principais do manual apontam para a Matriz atual; o editor de contornos preservado também está disponível dentro dela. As regras de composição, tipografia e fotografia não são reimplementadas por Motion.

## Uso

Na galeria e na prévia em Símbolos, os vídeos iniciam automaticamente, sem áudio, em loop e sem controles de reprodução. Cada vídeo toca independentemente dos demais. Use Baixar MP4 para obter o arquivo e Editar na Matriz para abrir o projeto correspondente. Baixar roteiro JSON guarda o projeto portátil; salvamentos do navegador pertencem ao domínio em que foram feitos. Para levar um projeto de localhost ao manual publicado, importe seu JSON.

Na Matriz, escolha o roteiro à esquerda. Esta letra controla destino, duração e giro; Roteiro inteiro controla velocidade, cores e formato. A velocidade global mantém as relações entre as pistas. Os pontos de corte dos testes de transição estão descritos em 1× e devem ser recalculados proporcionalmente quando a velocidade mudar.

## Organização da galeria

A sequência pública segue a função: Símbolo em movimento (M + Forma); Assinaturas e aberturas (Onda e resposta, Composição MATTAR, Acervo vira MATTAR e Abertura e fecho); Transições (Perfil · corte, Passagem de bastão e Forma · intervalo). A galeria não exibe status, cores de aprovação nem subdivisões por avaliação. Os controles e estados internos da Matriz são preservados.

## Estados editoriais internos

Em 4 de novembro de 2026, o autor aprovou os oito roteiros: M + Forma, Onda e resposta, Composição MATTAR, Acervo vira MATTAR, Abertura e fecho, Perfil · corte, Passagem de bastão e Forma · intervalo. O catálogo e os cartões da Matriz registram a aprovação; a galeria pública apresenta somente os grupos por função.

Assinaturas devem encerrar com uma leitura reconhecível e uma pausa adequada. Transições precisam ser testadas entre conteúdos reais: o vídeo da Matriz fornece o gesto; o corte A→B acontece na edição.

## Lógica de aplicação

Os volumes nativos fazem os giros. A transformação entre letra e pictograma interpola contornos no perfil compatível de 90°. Uma volta não é descartada: 90° + 360° termina em 450°. Entradas e saídas por linha deformam a própria malha a partir de uma linha degenerada, permitindo que o giro comece durante a aparição; isso não é escala do objeto nem um morph volumétrico entre letra e pictograma.

| Posição | Assinatura / volumes densos | Estudos / volumes leves |
| --- | --- | --- |
| M | P8 | P8 |
| A1 | P3 | P3 |
| T1 | P4 | P2 |
| T2 | P2 | P4 |
| A2 | P9 | P9 |
| R | P5 | P5 |

As associações dos dois T diferem nos materiais de origem. Não misturar os conjuntos silenciosamente. A fase inicial de P2 já está incorporada nas malhas; não acrescentar outra correção de 180°.

Faça: preserve geometria, pivô, proporções e pares preparados; reveja vazados, entradas, retornos e enquadramento; aplique as cores do manual; guarde o JSON associado ao MP4. Evite: esticar letras, pular o perfil, trocar uma malha por uma vista frontal durante o giro, sobrepor movimento excessivo a texto de leitura ou tratar um experimento como norma aprovada. Os tempos dos presets são escolhas autorais editáveis.

## Registrar um export pronto

Abra o projeto da versão integrada, exporte seu JSON, um quadro PNG representativo e o MP4. Use um encerramento legível para as assinaturas e o ponto de corte para as transições; não use o frame inicial invisível como pôster de uma entrada.

```sh
node scripts/register-motion-export.mjs ID VIDEO.mp4 POSTER.png PROJETO.json
node scripts/prepare-motion.mjs
python3 design/integrate-areas.py motion.html
```

O registro verifica H.264, formato, duração e correspondência do projeto com o catálogo. O preparo exige oito exports válidos e seus pôsteres: se um roteiro mudar, o build rejeita seu vídeo antigo. `--allow-pending-exports` existe apenas para revisão local e não é utilizado na publicação.

Somente os exports web otimizados, menores que 20 MiB cada, são versionados em `public/motion/videos/`. Os vídeos originais do acervo e os arquivos de produção grandes continuam fora do Git. Não subir `node_modules/`, saídas compiladas, dados pessoais de navegador ou identidade de outro Site.

Os workflows preparam Motion antes de compilar o manual. Testar também importação e edição pelos oito links, reprodução automática silenciosa em loop, download dos arquivos e leitura em desktop e celular. A publicação validada segue pelo GitHub para a prévia e para o domínio oficial, conforme `site-oficial/README.md`. A Matriz atual é a referência; `/editor/` permanece identificado como legado.

## Exportação reproduzível em CI

O workflow **Exportar roteiros Motion** abre uma instância isolada da própria Matriz e usa seus botões para exportar os oito JSON, PNG e MP4 em 1080 px / 30 fps. Valida os arquivos com o mesmo registrador, verifica reprodução na galeria em desktop e celular e disponibiliza o pacote como artefato do Actions.

O job tem apenas `contents: read`: não envia commits, não publica e não acessa um perfil de navegador local. Depois de baixar o artefato, copie `public/motion/videos/`, `public/motion/posters/` e `public/motion/exports.json` para o checkout e rode o preparo estrito. Os arquivos finais são integrados pelo fluxo normal de revisão do repositório.
