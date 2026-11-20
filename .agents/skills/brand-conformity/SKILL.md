---
name: brand-conformity
description: Auditar alterações visuais no LABMATTAR contra o sistema de identidade e aplicações aprovadas. Usar em revisão do manual, cartão de email, páginas públicas, laboratório e exportação para detectar regressões sem redesenhar a marca.
---

# Conformidade visual LABMATTAR

1. Ler `AGENTS.md`, `README.md`, `design/identity-system.json` e `content/application-review-approved.json`, além dos contratos específicos da área.
2. Distinguir itens aprovados, experimentais e legados. Funcionalidade disponível não implica aplicação aprovada.
3. Comparar alteração, estado anterior e regras versionadas; não improvisar novas paletas, geometrias do M, tipografia, grades ou identidade.
4. Conferir Univers LT Std 45 Light, Perpetua Titling MT Light, papéis Título/Corpo/Detalhe e regras de contraste nos manifestos vigentes.
5. Executar testes existentes relacionados. Para cartão de email, consultar `tests/email-signature.test.mjs` e `scripts/smoke-email-card.mjs`.
6. Para mudança visual, comparar renderizações desktop/mobile em navegador real, se disponível. Não afirmar inspeção visual sem evidência.
7. Relatar arquivo, evidência, severidade e correção mínima. Solicitar aprovação para qualquer mudança de direção artística.
8. Não alterar deploy, excluir históricos nem substituir `site-oficial/`.
