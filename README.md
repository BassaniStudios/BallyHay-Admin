# BallyHay Admin (Static)

Painel administrativo **HTML estático** para o BallyHay — economia GTA Roleplay multi-servidor.

- UI em português, tema **summer** (amarelo, laranja, azul claro)
- API / comandos em inglês
- Autenticação por **API key** (sem login Discord no site)
- Pronto para **GitHub Pages**
- Layout com sidebar, tabelas por área e guias explicativos

## O que o painel faz

| Área | Função |
|------|--------|
| **Dashboard** | Status, uptime, servidores, Turso/SQLite, cogs |
| **Servidores** | Lista de guilds, detalhe de economia, staff role por servidor |
| **Ações & Backup** | Wake/Refresh, backup manual, restore `.db` |
| **Sistemas** | Cogs carregados + mapa dos módulos da economy (missões, heists, cassino…) |
| **Testes** | ping, economy, storage |
| **Guia do Bot** | Como funcionam painéis embeds, staff e dados |
| **Configuração** | URL da API e chave |

## API key

Use o mesmo valor de:

```text
ADMIN_PANEL_PASSWORD=...
```

no bot (Render). No site a chave fica só no `localStorage` do navegador.

## Bot (obrigatório)

No Render do **bot**:

```text
ADMIN_PANEL_PASSWORD=sua_chave_secreta
ADMIN_SESSION_SECRET=opcional
```

Redeploy o bot com o `api.py` que aceita header `X-API-Key`.

## GitHub Pages

1. Envie o conteúdo desta pasta (index.html na raiz do repo Pages)
2. Settings → Pages → Deploy from branch → `main` / `/ (root)`
3. Abra a URL e informe:
   - URL do bot: `https://ballyhay.onrender.com`
   - API key: sua `ADMIN_PANEL_PASSWORD`

## Sobre o bot

BallyHay é privado (convite manual), focado só em economia GTA RP, planejado para ~5–6 servidores. Nos servidores ele publica painéis embeds (`/gtarp panel`, `adm1`–`adm5`) para jogadores e staff.

## Segurança

- A chave **não** vai na URL
- Quem tem a API key tem poder de admin na API do bot
- Use chave forte e não compartilhe

Created by **BassaniStudios**.
