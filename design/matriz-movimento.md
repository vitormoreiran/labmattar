# Matriz Vetorial — movimento e roteiros

**Escopo:** versão de roteiros desenvolvida a partir das sequências, perfis e volumes do acervo Mattar. Ferramenta em `tools/matriz-vetorial/`; acesso pela área Laboratório → Movimento. Este guia registra o funcionamento atual e recomendações de aplicação. Os presets são pontos de partida editáveis, não durações obrigatórias da marca. Novas associações continuam experimentais até revisão visual.

## O que esta versão contém

Biblioteca com nove pictogramas (P1–P9) e seis posições da assinatura (M, A1, T1, T2, A2, R). Cada forma reúne vista frontal, perfil e malha para giro. As posições repetidas de A e T são pistas distintas: podem assumir destinos e tempos diferentes.

A Matriz de roteiros é independente do compositor de páginas e do editor vetorial já publicado em `/editor/`. Seu editor de contornos de compatibilidade fica em `legacy.html`, dentro da própria ferramenta. As regras de tipografia, cor, composição, fotografia e geometria oficial do manual continuam nas fontes indicadas em [composicao-superficies.md](composicao-superficies.md). Um frame intermediário de transformação não redefine o símbolo estático oficial.

## Começar e ajustar

1. Abra `/matriz-vetorial/index.html` e escolha um roteiro à esquerda. Use **M + Forma** para uma transformação isolada; **MATTAR · onda e resposta** para entradas e retornos entre letras; **MATTAR · composição** para um percurso mais espaçado. Uma composição em branco permite construir outro percurso.
2. Em **Esta letra**, selecione a posição da assinatura. **Trocar ícone** mostra os nove destinos; o par preparado aparece identificado. Ajuste o tempo da transformação, o giro do ícone e sua duração. A troca de destino atualiza a ida e o retorno da pista.
3. Use o giro predefinido (meia volta, uma volta, duas voltas), outro ângulo ou o sentido de rotação. A orientação acumulada continua no trecho seguinte. Se o novo giro não terminar no perfil de passagem, a ferramenta pode acrescentar um alinhamento; confira o resultado e a duração final.
4. Em **Roteiro inteiro**, ajuste a velocidade geral, as cores e o formato. A velocidade muda o tempo de todas as pistas proporcionalmente, inclusive os atrasos; os tempos autorais permanecem guardados. `1×` corresponde ao roteiro original; `2×` dura metade do tempo.
5. Para um ajuste específico, selecione o trecho na linha do tempo e altere duração, curva, ordem ou pausa. Os controles avançados da letra permitem posição e escala. Preserve as proporções e o encaixe da assinatura ao editar.
6. Salve o projeto e baixe seu JSON. Reabra o arquivo para continuar em outro computador. Exporte uma prova no formato final e assista à ida, ao giro, ao retorno e à junção do loop antes de finalizar.

**Armazenamento:** o salvamento automático e os projetos nomeados ficam no navegador e na origem do site. Não são sincronizados com GitHub nem com outros dispositivos. Projetos do endereço local não aparecem automaticamente no domínio do manual; transfira-os por JSON. Limpar os dados do navegador pode remover esses projetos.

**Exportações:** PNG para quadro estático; MP4 para movimento, com opções de resolução e quadros por segundo. MP4 depende de WebCodecs e de codificação H.264 disponível no navegador. Mantenha a página aberta até a conclusão. Se a exportação falhar, preserve o JSON e tente outro navegador compatível ou uma resolução menor. Nunca considere a exportação concluída apenas porque a prévia funcionou.

## Escolher um roteiro para a aplicação

| Ponto de partida | Ritmo e intenção | Uso sugerido |
| --- | --- | --- |
| M + Forma · respiração | 10,8 s em 1×; pausa, giro de 90°, passagem M→P8, volta completa, retorno e pausa. Curvas suaves nas junções. | Vinheta, pontuação entre conteúdos, abertura ou fechamento com uma única ideia. |
| MATTAR · onda e resposta | 5,8 s em 1×; entradas da esquerda para a direita, retornos em ordem inversa. | Assinatura com mais ritmo, alternância entre a palavra e seus pictogramas. |
| MATTAR · composição | 18,2 s em 1×; percursos longos defasados entre as seis letras. | Exibição mais contemplativa, com tempo para observar os volumes. |

Esses tempos descrevem os presets desta versão. Ao trocar um giro ou acrescentar alinhamento, a duração pode mudar. Escolha velocidade e pausas conforme o suporte e o tempo de leitura do conteúdo. Um roteiro curto não exige eliminar as pausas nem acelerar todas as letras ao mesmo tempo.

## Lógica da transformação

O percurso é **letra → giro até o perfil compatível → transformação → giro do pictograma → perfil compatível → retorno à letra**. As rotações usam malhas 3D rígidas nativas; a passagem entre duas formas interpola seus contornos em 2D no perfil de 90°. Esta versão não faz morph volumétrico 3D e não reproduz os vídeos quadro a quadro.

O giro conserva sua história: partindo de 90°, uma volta de 360° termina em 450°. A aparência pode repetir a orientação inicial, mas o movimento continua existindo. Antes da passagem, o compilador alinha ao próximo perfil equivalente a 90°, preservando essa continuidade. Evite substituir essa lógica por um salto para um ângulo normalizado.

O perfil do M foi derivado da própria malha para encaixar o contorno no volume. A volta utiliza a correspondência da ida. Vazados e contornos que não têm correspondência exigem atenção especial durante a revisão: observar apenas o primeiro e o último frame não comprova uma boa passagem.

### Pares preparados por conjunto

| Posição | Assinatura — volumes densos | Estudos — volumes leves |
| --- | --- | --- |
| M | P8 | P8 |
| A1 | P3 | P3 |
| T1 | P4 | P2 |
| T2 | P2 | P4 |
| A2 | P9 | P9 |
| R | P5 | P5 |

As duas posições de T têm associações diferentes nos materiais de origem. Preserve o conjunto escolhido durante a comparação. **Par preparado** significa percurso configurado nesta ferramenta; não é uma aprovação automática de toda velocidade, composição ou exportação. Outros destinos são estudos que precisam de revisão, inclusive P1, P6 e P7, que integram a biblioteca sem ocupar um par padrão na assinatura.

## Dos & don'ts

| Faça | Evite | Motivo |
| --- | --- | --- |
| Parta de um par preparado e verifique a ida e o retorno. | Tratar qualquer combinação disponível como aplicação aprovada. | A biblioteca permite explorar; correspondência geométrica e intenção precisam ser avaliadas. |
| Gire até o perfil compatível antes de transformar. | Passar diretamente entre vistas frontais para abreviar o roteiro. | O perfil é o ponto de encaixe entre as formas. |
| Preserve proporções, pivôs e disposição nativa das seis letras. | Esticar letras, igualar suas alturas individualmente ou trocar o M oficial por um frame intermediário. | Movimento e identidade estática devem manter sua relação. |
| Use pausas e defasagens para construir uma leitura clara. | Sobrepor várias transformações rápidas a um texto que precisa ser lido. | O ritmo deve apoiar o conteúdo. |
| Reenquadre para 1:1, 16:9 ou 9:16 e confira os extremos do giro. | Cortar partes essenciais por reaproveitar o mesmo enquadramento sem revisão. | O volume pode ocupar larguras diferentes ao girar. |
| Use a paleta e o contraste do capítulo Cores; mantenha a leitura do símbolo. | Criar novas regras cromáticas a partir das opções livres do seletor. | Possibilidade de edição não define uma nova regra de marca. |
| Prepare um encerramento reconhecível e uma alternativa estática quando necessário. | Fazer um loop sem pausa ou depender de movimento para transmitir a única informação da peça. | O conteúdo deve continuar compreensível sem acompanhar toda a animação. |
| Reveja o MP4 exportado e guarde o JSON que o gerou. | Entregar apenas a prévia ou depender do salvamento local para recuperar o projeto. | O arquivo final e o projeto têm funções diferentes. |

Recomendações de ritmo e aplicação acima são critérios de revisão, não novos valores normativos de duração, margem ou contraste. Para peças com fotografia, texto e M, consulte também Composição e use o sistema existente do Laboratório.

## Dependências e limites para manutenção

| Responsabilidade | Fonte |
| --- | --- |
| Catálogo de formas e caminhos | `tools/matriz-vetorial/src/library.json` e `catalog.mjs` |
| Pares, presets, tempos e orientação acumulada | `src/timeline.mjs` |
| Controles de destino, giro e duração | `src/script-controls.mjs` e `src/ui/` |
| Prévia 3D e passagem vetorial | `src/stage.js`, `vector-engine.tsx`, `morph-continuity.mjs` |
| Proporções e disposição das letras | `src/word-layout.mjs` e `static/models/word-layout.json` |
| Malhas e contornos derivados do acervo | `static/models/`, `static/library/`, `static/presets/` |
| Codificação do vídeo | `src/export-video.js` |
| Preparação para o manual | `build.mjs` da ferramenta e `scripts/prepare-motion-matrix.mjs` do repositório |

- Não substituir uma malha por um SVG frontal durante giros 3D.
- Não aplicar outra correção de 180° ao P2: essa fase já está incorporada nas malhas.
- Não descartar voltas acumuladas ou substituir o perfil do M por uma aproximação genérica.
- Não alterar o mapa dos dois T para fazer conjuntos de origem diferentes parecerem iguais.
- Não usar a ferramenta para reimplementar os sistemas oficiais de tipografia, blur ou composição.

Os materiais derivados registram origem e medidas em `static/models/`. Caminhos absolutos de estações locais são removidos desta integração; as malhas e as medidas permanecem. O arquivo Blender original não é necessário para executar o site, mas deve ser preservado no acervo para novas derivações.

### Referências audiovisuais

Os vídeos originais permanecem fora do Git, conforme a política de mídia do repositório. A comparação local opcional procura em `static/references/`: `m-p8-m.mp4`, `assinatura-capitulo-2.mp4` e `assinatura-capitulo-5.mp4`. Recompile após copiá-los. Sem esses arquivos, o painel de referências informa a ausência; roteiros, giros e exportações continuam disponíveis. Para disponibilizá-los na web, use o catálogo `content/media.json` e URLs reais de storage após a publicação dos arquivos; não invente endereços.

### Atualizar com segurança

Execute `npm ci`, `npm test`, `npm run format:check` e `npm run build` dentro da ferramenta. Depois execute `node scripts/prepare-motion-matrix.mjs` na raiz e o build do manual. Os workflows fazem essa preparação antes de compilar a prévia. Não versione `node_modules/`, saídas `dist/`, projetos pessoais do navegador ou identidades de outro serviço de hospedagem.

Os testes preservam 30 cenários anteriores à limpeza e verificam regras de tempo, orientação e controles. Eles não substituem a revisão visual de novas combinações. Para mudança de geometria, revisar também os instantes imediatamente antes e depois das passagens, a metade da transformação, os vazados, o fechamento do loop e o export final.
