# BallyHay Admin (Static)

Painel administrativo **HTML estático** para o BallyHay.

- UI em português  
- API / comandos em inglês  
- Autenticação por **API key** (sem login Discord no site)  
- Pronto para **GitHub Pages**

## API key

Use o mesmo valor de:

```text
ADMIN_PANEL_PASSWORD=...
```

no bot (Render).

No site você cola essa chave uma vez; ela fica no `localStorage` do seu navegador.

## Bot (obrigatório)

No Render do **bot**:

```text
ADMIN_PANEL_PASSWORD=sua_chave_secreta
ADMIN_SESSION_SECRET=opcional
```

Redeploy o bot com o `api.py` atualizado (aceita header `X-API-Key`).

## GitHub Pages

1. Crie um repositório e envie **todo o conteúdo desta pasta** (index.html na raiz)
2. Settings → Pages → Source: **Deploy from a branch**
3. Branch: `main` / folder `/ (root)`
4. Abra a URL do Pages
5. Informe:
   - URL do bot: `https://ballyhay.onrender.com`
   - API key: sua `ADMIN_PANEL_PASSWORD`

## Funções

- Wake / Refresh  
- Backup manual  
- Restore `.db`  
- Status / systems / cogs  
- Lista de servidores  
- Detalhe por servidor  
- Definir staff role (cargo ADM) por servidor  
- Testes: ping, economy, storage  

## Segurança

- A chave **não** vai na URL  
- Qualquer um com a API key tem poder de admin na API do bot  
- Use chave forte e não compartilhe o link + chave  
