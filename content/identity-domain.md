# Domínio da identidade LABMATTAR

O endereço canônico do manual e das ferramentas é https://identidade.labmattar.com . A raiz abre a Introdução 00. Laboratório abre o overview com Matriz Vetorial, Composição e Cartão MATTAR.

Os dois endereços usam o mesmo Worker mattar-portfolio, os mesmos arquivos aprovados e o mesmo processo de publicação. A home e os projetos do portfólio continuam em labmattar.com. Links para os capítulos do portfólio no host da identidade retornam ao domínio principal.

Os endereços anteriores do manual e das ferramentas continuam funcionando. Isso preserva o acesso a projetos e mídias salvos no navegador no domínio anterior. Para levar um projeto ao novo endereço, baixe o projeto JSON no editor antigo e importe-o no novo. O subdomínio permanece público.

## Publicação

A publicação oficial valida o pacote antes de ativar a versão existente. Depois, scripts/configure-identity-domain.mjs vincula somente identidade.labmattar.com ao serviço oficial, usando a credencial que já está no ambiente preview do GitHub. Uma configuração já correta não é regravada. Um vínculo com outro serviço ou um registro DNS existente interrompe a operação sem substituí-lo.

A verificação aguarda DNS, HTTPS e a revisão correta; confere Introdução, capítulos, overview, editor, Matriz, Cartão, fontes, vídeo e API do acervo. Um teste de navegador abre as ferramentas e registra capturas e relatório nos artefatos do GitHub.

O workflow Validar domínio da identidade faz apenas uma consulta de leitura em pull requests. A alteração de DNS ocorre somente no workflow oficial após a integração no main.

As conexões pessoais Google e Dropbox já estavam desativadas nesta migração. Quando forem habilitadas, devem receber os callbacks do novo domínio nos respectivos provedores e a origem OAuth correspondente. O acervo público e os arquivos locais continuam disponíveis.
