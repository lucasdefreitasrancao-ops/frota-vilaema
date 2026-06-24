# Vila Ema — Controle de Frota v3.8 (Firebase + GitHub Pages)

Sistema de gestão de frota. Frontend estático no **GitHub Pages**; dados e login no **Firebase** (Firestore + Auth).

---

## Publicar no GitHub Pages

### 1. Criar repositório e enviar código

```powershell
cd "c:\Users\User\Desktop\ULTIMA ATUALIZAÇÃO"
git remote add origin https://github.com/SEU-USUARIO/NOME-DO-REPO.git
git push -u origin main
```

### 2. Ativar GitHub Pages

1. Repositório no GitHub → **Settings** → **Pages**
2. **Build and deployment** → Source: **GitHub Actions** (não use "Deploy from a branch")
3. Se a implantação falhar: **Actions** → workflow **Deploy GitHub Pages** → **Re-run all jobs**
4. Na primeira vez, pode pedir para aprovar o ambiente **github-pages** — clique **Approve**
5. URL: `https://SEU-USUARIO.github.io/NOME-DO-REPO/login.html`

### 3. Autorizar domínio no Firebase (obrigatório)

Sem isso o login fica girando ou dá erro de rede.

1. [Firebase Console](https://console.firebase.google.com/) → projeto **frota-vila-ema-66c8b**
2. **Authentication** → **Settings** → **Authorized domains**
3. Clique **Add domain** e adicione:
   - `SEU-USUARIO.github.io` (substitua pelo seu usuário GitHub)
   - `frota-vila-ema-66c8b.web.app` (se ainda não estiver)
4. **Authentication** → **Sign-in method** → **E-mail/Senha** → **Ativar**
5. **Authentication** → **Users** → **Add user** → crie e-mail e senha para acesso

### 4. Acessar o sistema

| URL | Uso |
|-----|-----|
| `https://SEU-USUARIO.github.io/NOME-DO-REPO/login.html` | Login |
| `https://SEU-USUARIO.github.io/NOME-DO-REPO/` | Dashboard (redireciona para login se não autenticado) |

Use o **e-mail e senha criados no Firebase** (não são mais usuários fixos do README antigo).

---

## Deploy Firebase (opcional — site alternativo)

Para publicar também em `frota-vila-ema-66c8b.web.app`:

```powershell
firebase login
firebase deploy
firebase deploy --only firestore:rules
```

---

## Funcionalidades

- Dashboard, frota, manutenções, pneus, tacógrafo
- Checklist (Google Forms + formulário QR)
- **Multas** com exportação de dashboard
- **Lavagem da frota** (ciclo de 3 meses)
- Relatórios de manutenção com dashboard exportável
- Backup JSON em Configurações

---

## Arquivos principais

| Arquivo | Função |
|---------|--------|
| `index.html` | SPA principal |
| `login.html` | Login Firebase Auth |
| `js/firebase-storage.js` | Firestore + interceptação da API |
| `js/firebase-config.js` | Config do projeto Firebase |
| `.github/workflows/deploy-pages.yml` | Deploy automático GitHub Pages |

---

## Stack

Preact · Tailwind CSS · Chart.js · Firebase Auth · Firestore · GitHub Pages

---

## Segurança

- **Não** inclua arquivos `*firebase-adminsdk*.json` no repositório (já estão no `.gitignore`).
- Este app usa apenas SDK **cliente** (`js/firebase-config.js` + `firestore.rules`).
- Se a credencial admin foi exposta no GitHub, veja **`SECURITY.md`**.

