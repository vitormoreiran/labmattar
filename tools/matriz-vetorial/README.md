# Matriz Vetorial · Lab Mattar

Biblioteca de nove pictogramas e seis letras originais, com roteiros editáveis, giros 3D e transformações vetoriais.

## Como usar

Escolha um roteiro à esquerda. No painel **Esta letra**, escolha a letra, troque o ícone de destino e ajuste os tempos e as voltas. Em **Roteiro inteiro**, ajuste a velocidade geral, as cores e o enquadramento.

Os projetos continuam salvos neste navegador e podem ser transferidos por JSON. A exportação oferece PNG e MP4; vídeo exige WebCodecs e um codificador H.264 compatível. O editor de contornos permanece acessível no topo.

## Organização do código

- `src/app.js`: estado da interface, eventos e coordenação da prévia.
- `src/ui/`: controles do painel, ícones e pequenas funções de HTML/DOM.
- `src/timeline.mjs`: projetos, roteiros, pares preparados, orientação acumulada e cálculo dos tempos.
- `src/script-controls.mjs`: troca de destino e identificação do giro de cada letra.
- `src/catalog.mjs` e `src/library.json`: catálogo único das formas. As associações entre letras e pictogramas ficam somente em `timeline.mjs`.
- `src/entrance.mjs` e `src/line-volume.mjs`: entrada e saída por linha, com deformação na malha durante o giro.
- `src/stage.js`: carregamento e desenho dos volumes 3D e das passagens vetoriais.
- `src/vector-engine.tsx` e `src/morph-continuity.mjs`: geometria e correspondência entre contornos.
- `src/export-video.js`: codificação MP4 e restauração da prévia depois da exportação.
- `src/style.css`: estilos da ferramenta atual.
- `compatibility/`: editor de contornos preservado, carregado apenas por `legacy.html`. Seu código não participa da interface principal.
- `tests/`: continuidade, controles e comparação com os 30 cenários anteriores à limpeza.

## Desenvolvimento

Node.js 22 ou mais recente:

```sh
npm ci
npm test
npm run format:check
npm run build
```

Para formatar mudanças futuras, use `npm run format`. Publique `dist/` como site estático. O build gera nomes por conteúdo para JavaScript e CSS; não acrescente versões manuais às URLs. Somente arquivos gerados antigos em `dist/assets/` são removidos na compilação.

**Os assets editáveis ficam em `static/`; o build os copia para `dist/`.** Publique somente a saída gerada. Esta cópia usa a hospedagem do manual e não contém a identidade de outro Site. Os vídeos finais ficam na galeria Motion; originais do acervo não são versionados.

No manual, execute também `node scripts/prepare-motion.mjs` na raiz. A galeria e seus links usam o mesmo catálogo de projetos da ferramenta. Nunca altere as saídas compiladas para corrigir um roteiro.

## Formas e continuidade

Os GLBs vêm de `Sequencia-1.blend`. As letras mantêm as proporções e a disposição nativas. **Assinatura** usa os volumes densos; **Estudos** usa os volumes leves. Os dois T têm associações diferentes nesses conjuntos, preservadas em `timeline.mjs`. A fase inicial de P2 já está incorporada nas malhas.

As passagens ocorrem no perfil de 90°, mantendo o giro acumulado. O perfil do M é derivado da própria malha, e sua passagem de retorno reutiliza a correspondência da ida. As demais combinações podem ser experimentadas e são identificadas na interface.

Os roteiros são reconstruções editáveis; não representam reprodução quadro a quadro dos vídeos do acervo. As origens e medidas das geometrias estão em `dist/models/`.
