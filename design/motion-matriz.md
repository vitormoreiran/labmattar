# Motion e Matriz Vetorial

A área `/motion.html` reúne a Matriz atual e os roteiros exportados. Ela pertence ao Laboratório e usa a mesma navegação dos cinco capítulos, a mesma grade editorial e os três tratamentos de texto do manual.

## Fontes de verdade

- `tools/matriz-vetorial/`: versão atual da ferramenta, com dependências e CSS isolados. O site publica seu build em `/motion/matriz/index.html`.
- `tools/matriz-vetorial/src/motion-catalog.mjs`: catálogo dos oito percursos e seus estados editoriais.
- `tools/matriz-vetorial/src/timeline.mjs`: pares preparados, presets, tempos e orientação acumulada.
- `tools/matriz-vetorial/src/roteiros/`: cinco projetos em avaliação. Os três aprovados vêm dos presets existentes.
- `design/motion.html`, `public/motion.css` e `public/motion.js`: estrutura, apresentação e reprodução da galeria.
- `public/motion/exports.json`: vínculo verificável entre cada MP4 e o projeto que o gerou.
- `scripts/prepare-motion.mjs`: valida os exports, gera a página e os downloads JSON, e copia o build da Matriz para o manual.

`/editor/` permanece como ferramenta anterior. Os acessos principais do manual apontam para a Matriz atual; o editor de contornos preservado também está disponível dentro dela. As regras de composição, tipografia e fotografia não são reimplementadas por Motion.

## Uso

Na galeria, use Reproduzir para assistir, Baixar MP4 para obter o vídeo e Editar na Matriz para abrir o projeto correspondente. Os vídeos não iniciam automaticamente. Baixar roteiro JSON guarda o projeto portátil; salvamentos do navegador pertencem ao domínio em que foram feitos. Para levar um projeto de localhost ao manual publicado, importe seu JSON.

Na Matriz, escolha o roteiro à esquerda. Esta letra controla destino, duração e giro; Roteiro inteiro controla velocidade, cores e formato. A velocidade global mantém as relações entre as pistas. Os pontos de corte dos testes de transição estão descritos em 1× e devem ser recalculados proporcionalmente quando a velocidade mudar.

## Estados editoriais

M + Forma, Onda e resposta e Composição MATTAR foram aprovados pelo autor. Acervo vira MATTAR, Abertura e fecho, Perfil · corte, Passagem de bastão e Forma · intervalo permanecem em avaliação. Publicar um vídeo na galeria não aprova seu uso final.

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

Os workflows preparam Motion antes de compilar o manual. Testar também importação e edição pelos oito links, reprodução deliberada, download dos arquivos e leitura em desktop e celular. A publicação continua limitada ao Worker de prévia; não alterar `labmattar.com`.
