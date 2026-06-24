# Segurança — Vila Ema Frota

## Credencial admin exposta (ação imediata)

Se o Google avisou sobre `firebase-adminsdk-*.json` no GitHub:

1. **A chave já foi desativada pelo Google** — não use o arquivo antigo.
2. **Este projeto NÃO precisa de Admin SDK** para rodar no GitHub Pages ou Firebase Hosting.
   - Login: Firebase Auth (cliente)
   - Dados: Firestore (cliente + regras em `firestore.rules`)
   - Config pública: `js/firebase-config.js` (apiKey pública — normal e segura com Firestore Rules)

## O que NUNCA commitar

- `*firebase-adminsdk*.json`
- `firebase-chave.json`, `.env`, service account keys
- Senhas, tokens, chaves privadas

Estão listados em `.gitignore`.

## Limpar repositório no GitHub (se o arquivo já foi publicado)

No repositório `frota-vilaema` (ou outro), **remova o arquivo do histórico**:

### Opção A — Repositório novo (mais simples)

1. Apague o repositório antigo no GitHub (Settings → Delete).
2. Crie um repositório novo **sem** o arquivo admin.
3. Envie só esta pasta (já sem a credencial):

```powershell
cd "c:\Users\User\Desktop\ULTIMA ATUALIZAÇÃO"
git push -u origin main
```

### Opção B — Remover do histórico (manter o repo)

```powershell
git filter-repo --path frota-vila-ema-66c8b-firebase-adminsdk-fbsvc-50be1857b7.json --invert-paths --force
git push origin main --force
```

*(Requer [git-filter-repo](https://github.com/newren/git-filter-repo) instalado.)*

Depois, no GitHub: **Settings → Security → Secret scanning** para confirmar que o alerta sumiu.

## Google Cloud Console

1. [IAM → Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts?project=frota-vila-ema-66c8b)
2. Conta `firebase-adminsdk-fbsvc@...` → aba **Keys**
3. **Delete** a chave comprometida (`50be1857...`) se ainda aparecer
4. **Não crie nova chave** unless você tenha um backend servidor (Cloud Functions, etc.) — este app não usa.

## Rotacionar (só se precisar de Admin SDK no futuro)

- Crie nova chave **apenas** em ambiente servidor seguro (Secret Manager, variável CI criptografada).
- Nunca coloque no repositório público.
