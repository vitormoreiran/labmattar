# LABMATTAR — cópia limpa do site publicado (28/10/2026)

Esta é a pasta de acesso direto para os cinco capítulos e as apresentações Bradesco, Sesc e Simpósio. Ela reúne arquivos de execução e a captura do conteúdo público; referências históricas, testes e scripts de preparação permanecem somente no acervo maior.

## Conteúdo

- `worker/index.js`, `wrangler.jsonc`, `package.json`: Worker principal e configuração do site, copiados sem alteração do último checkout local usado para publicação.
- `public/assets/`, `public/fonts/`, `public/i18n/`: biblioteca de execução compartilhada pelos capítulos e apresentações.
- `public/capitulo-4/simposio/`: página estática do Simpósio que coincide com a rota publicada. Foram removidos dela scripts de preparação, documentos e mídias sem referência na página.
- `worker-capitulo-2/`: Worker adicional que serve `/capitulo-2`, `/api/content/portfolio`, dois assets dinâmicos e `/media/`, com seus módulos, esquema de banco e configuração originais. A configuração original contém um caminho absoluto de assets no computador de origem; para outro computador esse caminho precisa ser ajustado.
- `public/media/`: 192 mídias referenciadas no conteúdo público do Capítulo 2. Foram copiadas 153 do acervo local e 39 imagens diretamente de `labmattar.com/media/` em 28/10; todas as 39 responderam HTTP 200.
- `estado-publicado/portfolio-publico.json`: conteúdo retornado pela API pública em 28/10, revisão 83. É uma captura de consulta, não o banco D1 editável completo.

## Rotas verificadas em 28/10

- Capítulo 1: `/`
- Capítulos 2 a 5: `/capitulo-2`, `/capitulo-3`, `/capitulo-4`, `/capitulo-5`
- Apresentações: `/capitulo-4/bradesco/`, `/capitulo-4/sesc/`, `/capitulo-4/simposio/`

Todas responderam HTTP 200 no domínio `labmattar.com`. As referências de assets absolutos presentes no HTML dessas rotas foram encontradas neste pacote. O HTML, o CSS principal e o script de conteúdo do Simpósio coincidiram por SHA-256 com os arquivos publicados. Os 464 arquivos públicos copiados inicialmente da origem local coincidiram por SHA-256; depois foram acrescentadas as 192 mídias atuais do Capítulo 2.

## Limites

Esta é uma cópia dos arquivos de execução e do conteúdo público observável. A base D1 privada e o armazenamento KV do Cloudflare não foram exportados integralmente. Sem esses serviços e suas configurações/credenciais, a pasta não reproduz sozinha o editor nem constitui um deploy pronto em outra conta. A configuração original do Worker adicional referencia caminhos da máquina de origem. As pastas antigas e originais de produção permanecem no acervo principal.
