# LABMATTAR — fluxo de autoria e publicação

## Decisão de produto
Projetos são criados, editados e guardados na Mesa/Laboratório. Publicar é uma ação separada, nunca efeito colateral de salvar.

## Estado observado em 19/11/2026
- `public/lab-desk.mjs`: a Mesa apresenta múltiplos projetos e salva registros por id no IndexedDB.
- `public/lab-project-library.mjs`: banco `labmattar-presentation-library-v1`.
- `public/composicao-pages-ui.mjs`: o editor embutido usa o rascunho `labmattar-pages-v1` em localStorage como estado transitório e recuperação.
- A exportação JSON é cópia portátil, não substitui a gravação no acervo local.
- Publicação de apresentação exige pacote/manifesto e PR; o deploy oficial é isolado em workflow.

## Primeiro ajuste neste PR
Serializar escritas assíncronas da Mesa. Antes, duas revisões do mesmo projeto podiam concluir gravações fora de ordem; agora uma escrita só começa quando a anterior termina. A falha de uma não bloqueia a próxima. Isso não muda formato de dados nem ativa deploy.

## Critérios de aceite antes de qualquer migração
1. Criar projetos A e B, editar, trocar e recarregar navegador sem misturar seus dados.
2. Verificar aviso real quando IndexedDB/localStorage recusarem gravação.
3. Preservar as cópias JSON e a chave legada durante toda a transição.
4. Testar Chromium e WebKit e restauração com mídia.
5. Não declarar sincronização entre dispositivos: o armazenamento atual é local ao navegador.

## Etapas posteriores
- Medir frequências e tempos dos workflows; classificar verificações por alterações.
- Avaliar robustez do IndexedDB: ciclo de vida, quota, reversões e opções de backup.
- Investigar falhas observáveis da Matriz (interface/roteiros/renderização) sem confundir com os bloqueios dos hashes.
- Inventariar dependências dos arquivos antes de sugerir arquivamento/remoção.
