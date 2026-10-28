# LABMATTAR — plataforma de identidade visual

Repositório de desenvolvimento da prévia independente da identidade LABMATTAR. **Este projeto não deve publicar alterações em `labmattar.com`**.

## Para trabalhar com Codex local

1. Faça checkout da branch `refactor/source-files` (até o PR de migração ser integrado).
2. Abra a pasta raiz do repositório no VS Code / Codex.
3. Utilize Node.js 22.13+ e um terminal Unix compatível (WSL no Windows, pois os scripts atuais são Bash).
4. Execute `npm ci` e `npm run dev` para iniciar o aplicativo.
5. Antes de publicar, execute `npm run build`.

## Estrutura

- `app/`: aplicativo React/Next com Vinext e editor vetorial.
- `public/`: assets estáticos, SVGs oficiais e manual.
- `design/`: páginas de identidade, componentes editoriais e scripts de integração.
- `scripts/`: instalação, compilação e validação.
- `.github/workflows/build.yml`: verificação de compilação.
- `.github/workflows/preview-cloudflare.yml`: publicação exclusiva da prévia `labmattar-identidade-previa`.

O pacote `LABMATTAR_CODIGO_PARA_GITHUB (1).zip` foi mantido temporariamente apenas como histórico. **Não editar o ZIP**; o código-fonte deve ser alterado nos diretórios acima.

### Observação sobre a prévia

O workflow ainda aplica scripts de `design/` para montar páginas e integrar o editor antes de compilar. A migração do ZIP **não implica** que esses scripts estejam eliminados; simplificá-los será uma etapa posterior, depois de verificar equivalência visual e funcional.

## Próxima etapa: vídeos locais

Os arquivos de vídeo originais permanecem no computador do autor. Não colocar arquivos `.mp4`/`.mov` grandes no Git.

Modelo proposto:
- `content/media.json`: catálogo de itens (id, título, ano, categoria, poster, descrição, créditos e origem).
- `public/media/posters/`: capas otimizadas, se tiverem dimensão apropriada.
- Cloudflare R2 ou outro storage: vídeos publicados, servidos por URL.
- Interface de acervo: player com poster, controles, legendas opcionais, loading e suporte mobile.

Não criar URLs fictícias nem considerar qualquer material aprovado sem validação do autor.

## Proteções

- Nunca publicar na conta ou domínio de produção; usar somente o Worker de prévia.
- Preservar os SVGs oficiais e a lógica de transformação vetorial enquanto não houver instrução específica.
- Validar em ambiente local e CI antes de integrar mudanças em `main`.
