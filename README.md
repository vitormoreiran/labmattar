# LABMATTAR — plataforma de identidade visual

Repositório de desenvolvimento da prévia independente da identidade LABMATTAR. **Este projeto não deve publicar alterações em `labmattar.com`**.

## Para trabalhar com Codex local

1. Faça checkout da branch `main` atualizada. Os diretórios `app/` e `public/` já estão versionados. A branch `refactor/source-files` é histórica; não é necessária para iniciar o trabalho.
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
- `tools/matriz-vetorial/`: Matriz atual de Motion, isolada do editor anterior.
- `design/motion.html` e `scripts/prepare-motion.mjs`: galeria de oito roteiros, vídeos e projetos correspondentes.

## Contrato de produção e exportação do Laboratório

A direção aprovada para a próxima etapa do Laboratório está documentada em **[design/LABORATORIO_PRODUCAO_EXPORTACAO.md](design/LABORATORIO_PRODUCAO_EXPORTACAO.md)**: renderização de alta qualidade, acervo e sequências, PDF/PPTX/web e intercâmbio editável com After Effects.

A **Matriz Vetorial atual** já integra o manual em `/motion/matriz/index.html`. Seus controles de timeline, roteiros e saídas PNG/MP4/JSON são uma referência real para o desenvolvimento, **não** uma funcionalidade a reconstruir. A Matriz segue sendo atualizada em paralelo; conferir a versão corrente de `tools/matriz-vetorial/` antes de qualquer integração. O contrato distingue explicitamente recursos existentes, metas e critérios de aceite e **não publica recursos novos por si só**.

O pacote `LABMATTAR_CODIGO_PARA_GITHUB (1).zip` permanece como legado. Os fluxos atuais de compilação e publicação usam os arquivos editáveis, sem extrair o pacote. **Não editar o ZIP**; o código-fonte deve ser alterado nos diretórios acima.

### Observação sobre a prévia

O workflow ainda aplica scripts de `design/` para montar páginas e integrar o editor antes de compilar. A migração do ZIP **não implica** que esses scripts estejam eliminados; simplificá-los será uma etapa posterior, depois de verificar equivalência visual e funcional.

## Próxima etapa: vídeos locais

Os arquivos de vídeo originais permanecem no computador do autor. Não colocar arquivos `.mp4`/`.mov` grandes no Git.

Estrutura preparada:
- `content/media.json`: catálogo vazio inicial, com validação em `npm run validate:media` e esquema em `content/media.schema.json`.
- `public/media/posters/`: capas otimizadas, se tiverem dimensão apropriada.
- Cloudflare R2 ou outro storage: vídeos publicados, servidos por URL.
- Interface de acervo: player com poster, controles, legendas opcionais, loading e suporte mobile.

Não criar URLs fictícias nem considerar qualquer material aprovado sem validação do autor.

Os exports web de Motion são uma exceção aos originais grandes: somente MP4 otimizados, menores que 20 MiB, entram em `public/motion/videos/`. A correspondência entre vídeo e projeto é verificada no build. As instruções estão em [design/motion-matriz.md](design/motion-matriz.md).

## Motion e Matriz atual

O manual aponta para `/motion.html` e para `/motion/matriz/index.html`. `/editor/` permanece disponível como versão anterior. Motion é uma área do Laboratório; os cinco capítulos e suas regras visuais são preservados.

```sh
npm ci --prefix tools/matriz-vetorial
npm test --prefix tools/matriz-vetorial
npm run build --prefix tools/matriz-vetorial
node scripts/prepare-motion.mjs
python3 design/integrate-areas.py motion.html
```

Os workflows executam essa preparação antes de compilar o manual. O catálogo e os downloads JSON são gerados dos mesmos projetos que alimentam a Matriz. Vídeos desatualizados ou ausentes bloqueiam a publicação; `--allow-pending-exports` serve apenas para prévia local.

## Proteções

- Nunca publicar na conta ou domínio de produção; usar somente o Worker de prévia.
- Preservar os SVGs oficiais e a lógica de transformação vetorial enquanto não houver instrução específica.
- Validar em ambiente local e CI antes de integrar mudanças em `main`.

## Situação da migração

A versão atual de `main` contém os fontes editáveis e o workflow de prévia não depende mais do ZIP. Os scripts em `design/` ainda transformam arquivos durante a publicação; mantenha essa etapa enquanto os resultados finais não forem convertidos em páginas-fonte definitivas. A entrada `/` continua direcionando para `/manual.html`; a introdução editorial separada encontra-se em `/inicio.html`.
