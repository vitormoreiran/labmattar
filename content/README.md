# Catálogo de mídia LABMATTAR

O arquivo `media.json` é a lista oficial de materiais da plataforma. Está vazio até que os vídeos locais sejam selecionados.

## Fluxo local (Codex / VS Code)
1. Coloque os arquivos originais em uma pasta **fora do repositório**. Nunca faça commit dos vídeos em `main`.
2. Para cada item, registre título, autoria/créditos, ano, categoria, duração e situação de publicação.
3. Gere um poster otimizado (WebP/JPEG), com autorização, e salve-o em `public/media/posters/` (somente arquivos pequenos).
4. Publique o vídeo em Cloudflare R2 ou outro serviço de mídia configurado. Use **URL HTTPS real** em `source`; não coloque caminhos locais Windows no catálogo publicado.
5. Insira o item em `media.json`, marque `status: "published"` **somente depois** de testar acesso e reprodução. Enquanto faltar URL, mantenha `status: "draft"` e `source: ""`.
6. Rode `npm run validate:media` antes de realizar commit.

Campos necessários por item: `id`, `title`, `kind`, `status`, `source`. O restante é opcional; consulte `media.schema.json`.

Para vídeos grandes, prefira entrega com HTTP Range, formatos MP4 (H.264/AAC) para ampla compatibilidade, poster e legendas quando disponíveis. Não suba materiais privados antes de decidir suas permissões de acesso. O repositório não contém credenciais do R2.

A interface de arquivo em `design/inicio.html` ainda é apenas editorial. O passo seguinte é implementar um player real que consuma este catálogo, sem duplicar dados no HTML.
