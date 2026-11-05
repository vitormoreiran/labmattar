# LABMATTAR — identidade, Motion e Laboratório

Este repositório mantém o manual de identidade e as ferramentas do LABMATTAR. O GitHub prepara e valida a prévia; o workflow oficial promove o mesmo artefato para labmattar.com, preservando os projetos existentes. As instruções de publicação estão em [site-oficial/README.md](site-oficial/README.md).

## Referências vigentes

- Manual: capítulos 00 Introdução, 01 Símbolos, 02 Motion, 03 Tipografia, 04 Cores, 05 Composição, 06 Laboratório e 07 Redes Sociais. A ordem vem de [design/identity-system.json](design/identity-system.json).
- Matriz atual: /motion/matriz/index.html; código em tools/matriz-vetorial/. Os oito roteiros aprovados e suas geometrias são a referência. A interface não é reconstruída pelo Laboratório.
- /editor/ e o editor de contornos são legados preservados para abrir trabalhos anteriores. Não são o acesso principal à Matriz atual.
- Compor: /compor.html?studio=1. Cria páginas e seções com fundo compartilhado e usa os motions registrados.
- Fontes vigentes: Univers LT Std 45 Light e Perpetua Titling MT Light. O manifesto content/identity-fonts.json registra os arquivos exatos; scripts/prepare-identity-kit.py verifica e prepara /identidade-kit/fontes-vigentes.zip.
- Tipografia: Título, Corpo e Detalhe, definidos em public/manual-headings.css. A Introdução e o índice preservam as aberturas autorais; suas exceções são explicitadas no contrato de layout.

## Regras e escolhas em validação

O manifesto registra as referências e os estados do sistema; o CSS executa a tipografia e a grade. As verificações devem detectar divergências entre esses arquivos. Recursos disponíveis não tornam uma aplicação aprovada.

O tratamento preto de leitura é ajustável de 0% a 80%, com atalhos 0%, 20%, 40% e 60%. Projetos anteriores mantêm 20%. A intensidade acompanha a fotografia e seu recorte; não substitui a conferência de leitura no tamanho real. Novas composições recomendam branco puro sobre vermelho; projetos anteriores conservam seu perfil de cor até o usuário escolher novamente a cor do fundo ou Padrão.

O material /validacao-identidade.html reúne comparativos e escolhas do bloco 3. Azul e marrom, limites de redução e proteção, usos compositivos do M, assinaturas e exceções editoriais continuam sujeitos à validação do autor. Oito motions aprovados permanecem aprovados.

## Produção e publicação

PNG, PDF, HTML e MP4 usam a cena lógica do Laboratório. PDF incorpora fontes e preserva texto e vetores; PNG/PDF capturam o quadro escolhido do motion. HTML conserva os movimentos. MP4 usa H.264, 30 fps e não contém áudio. A exportação não publica o projeto.

Para o capítulo 4, exporte HTML, prepare um pacote com scripts/prepare-chapter4-publication.mjs, revise as mídias, marque o manifesto como published e envie por PR. Consulte as instruções completas em site-oficial/README.md.

Projetos ficam no navegador e podem ser transferidos por JSON. Fotografias locais são incorporadas ao JSON; vídeos locais dependem do original ou do HTML com mídia incorporada. O acervo público usa um índice de 19 projetos; atualizar arquivos no Drive exige atualizar o índice. PPTX, intercâmbio After Effects, perfis de gráfica e o formato 4:5 são desenvolvimento futuro.

## Desenvolvimento

Use Node 22.13+ e terminal Bash/WSL para a compilação principal. Execute npm ci. A preparação das páginas está descrita em .github/workflows/preview-cloudflare.yml; os scripts de design/ continuam necessários. Não editar saídas compiladas para corrigir o conteúdo.

Na Matriz: npm ci --prefix tools/matriz-vetorial, npm test --prefix tools/matriz-vetorial e npm run build --prefix tools/matriz-vetorial. Depois execute node scripts/prepare-motion.mjs. O catálogo, os JSONs e a galeria são gerados dos mesmos projetos; vídeos divergentes bloqueiam a preparação.

## Preservação

- Preservar os SVGs, modelos, roteiros e interface aprovados da Matriz.
- Preservar site-oficial/: é a base congelada de recuperação, protegida por hashes.
- Validar em prévia antes de integrar ao main. A publicação oficial ocorre pelo workflow autorizado, sem substituir rotas existentes.
- O ZIP antigo e as branches anteriores são históricos. O build usa os fontes versionados.
- Original, estudo, export e cache têm funções diferentes. Limpeza do acervo exige conferência de dependências e não faz parte dos blocos 1–3.
