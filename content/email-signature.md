# Cartão MATTAR — cartão digital e assinatura de e-mail

Publicação autorizada pelo autor em 10/11/2026, com fundo Papel, texto e marca em Preto e forma em Vermelho. Nome escolhido: Cartão MATTAR. O PR #109 conserva o ensaio anterior; esta versão substitui sua proposta de composição e exportação.

Endereço: https://labmattar.com/assinatura-email.html . Acesso também pela página do Laboratório e pelo menu Ferramentas do editor de páginas.

## Composição vigente neste estudo

Uma composição personalizada incorpora nome, função, e-mail e telefone à própria imagem. A marca nativa, o contexto de gastroperformance e o filme aprovado M + Forma fazem parte da arte. Os dados não são armazenados nem enviados a um servidor.

Duas aplicações compartilham o mesmo renderizador Canvas:

- Cartão digital: 480 × 280 px na apresentação; PNG e GIF em 960 × 560 px.
- Assinatura de e-mail: PNG e GIF em 480 × 100 px. A altura acompanha a orientação de tamanho do Gmail: https://support.google.com/mail/answer/11468381?hl=pt-BR .

O painel Cores do cartão oferece três escolhas independentes: Fundo, Texto e marca, e Forma em movimento. Cada uma contém Papel, Branco, Preto, Bege, Verde, Vermelho, Azul e Marrom, com os valores exatos do manual. O padrão usa Papel #F7F6F2, Preto #181818 no texto e na marca e Vermelho #E22E24 na forma; Restaurar padrão recupera essa combinação sem apagar os dados. Um aviso calcula o contraste real entre as cores escolhidas (4,5:1 para texto; 3:1 para a forma) e preserva as escolhas. PNG e GIF recebem os mesmos valores selecionados. A fonte Univers LT Std 45 Light é incorporada à imagem. Não há dependência de fontes instaladas pelo destinatário.

Nome e e-mail são obrigatórios. Função e telefone são opcionais. A composição aceita até duas linhas no nome; função tem até duas linhas no cartão e uma na faixa de e-mail. O editor mede o texto com a fonte carregada e bloqueia a exportação se ultrapassar a área prevista. Não reduz a fonte nem distorce o conteúdo para fazê-lo caber. Nome, contatos, marca e margens permanecem fixos durante todo o GIF.

## Exportação

PNG e GIF são a assinatura completa, personalizada. O PNG usa o primeiro quadro do filme. O GIF usa o mesmo primeiro quadro, amostra o vídeo aprovado em 20 fps, preserva os 10,8 segundos e repete três ciclos. Os quadros seguintes atualizam somente os pixels que mudaram; isso mantém a imagem leve sem redesenhar os textos ou alterar o ritmo. Exportações verificadas com os dados fictícios: cartão de aproximadamente 557 KB; faixa de e-mail de aproximadamente 121 KB. O tamanho varia conforme os dados.

A pausa da prévia não altera o export. A preferência de movimento reduzido inicia no quadro fixo. A geração tem progresso e cancelamento, sem apagar os dados preenchidos. O renderizador usa somente escala uniforme no recorte aprovado do filme e na marca SVG nativa.

O cartão HTML incorpora o PNG para funcionar offline e inclui links reais de e-mail, telefone e site. Salvar contato gera um vCard com os campos preenchidos. Copiar contatos oferece uma alternativa em texto.

## Instalação no Gmail

1. Escolher Para e-mail e preencher os dados.
2. Baixar o GIF personalizado ou o PNG.
3. Gmail no computador → Configurações → Ver todas as configurações → Geral → Assinatura.
4. Criar uma assinatura; Inserir imagem → Fazer upload → escolher o arquivo.
5. Usar Tamanho original, definir a assinatura padrão e salvar.
6. Conferir um envio real no computador e no celular.

O usuário pode adicionar um link à imagem e contatos em texto. Clientes que bloqueiam imagens não conseguem mostrar os dados embutidos; clientes sem animação mostram o primeiro quadro completo. Nenhuma conta de e-mail foi acessada e nenhuma mensagem foi enviada nesta revisão.

## Fontes e manutenção

- public/email-card.mjs: composição, medidas, fonte, adaptação, PNG, GIF, HTML e vCard.
- public/assinatura-email.mjs: formulário, prévia, seleção de formato/cor e ações.
- public/email-signature.mjs: normalização e validação dos dados de contato.
- public/presentation-assets/mattar-published.svg: marca nativa, sem alterações.
- public/motion/videos/m-form.mp4: filme aprovado, sem alterações; hashes em public/motion/exports.json.
- public/vendor/gifenc/gifenc-1.0.3.mjs: codificador MIT, versão fixada e integridade SHA512 conferida contra o pacote npm. Licença no mesmo diretório.

Os GIFs genéricos pequenos pertencem ao estudo anterior do PR #109. Não integram a composição ou o pacote atual: o GIF completo é gerado no navegador com os dados de cada pessoa.

Relatórios e imagens: outputs/email-card-06 no workspace. Conferidos: PNG e GIF reais, duração, três ciclos, dimensões, peso, pausa, textos longos, opcionais, HTML offline, contato vCard e ausência de rolagem horizontal em 320, 390 e 1440 px.
