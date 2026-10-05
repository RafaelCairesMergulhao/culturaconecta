# Cultura Conecta

Rede social cultural para artistas, produtoras, estúdios e quem faz a cena. Roda no computador e no celular, direto do VS Code.

## Pré-requisitos

Instale isto antes de abrir o projeto:

1. **Node.js 24 ou mais novo** (inclui o npm). Baixe em https://nodejs.org e escolha a versão "Current" 24 ou superior. No terminal, confira com `node -v` e `npm -v`.
2. **Visual Studio Code.** Baixe em https://code.visualstudio.com.

Não precisa de banco de dados, conta no Supabase nem arquivo `.env`. Os dados ficam em `data/network.json`. O arquivo `.env.example` é só um lembrete opcional e pode ser ignorado.

Extensões do VS Code são opcionais. O projeto abre e roda só com o Node e o terminal integrado.

## Como iniciar no VS Code

1. Extraia o zip.
2. Abra no VS Code a pasta que contém o `package.json` (a pasta `CulturaConecta`). Menu **File → Open Folder**.
3. Abra o terminal integrado com **Ctrl+`** (ou Terminal → New Terminal).
4. Rode, um comando por vez:

```
npm install
npm run dev
```

5. Abra http://localhost:3000 no navegador.

O primeiro `npm install` baixa as dependências e pode levar alguns minutos. Deixe terminar antes do `npm run dev`.

Para encerrar o servidor, use **Ctrl+C** no terminal.

## Contas de demonstração

| Conta | Senha | O que é |
|---|---|---|
| `mckalil` | `cultura123` | MC, com conquistas e trajetória |
| `djrima` | `cultura123` | DJ e beatmaker |
| `slamvix` | `cultura123` | Poesia e slam |
| `valecultural` | `cultura123` | Produtora. Confirma participações e publica vagas |
| `rimaforte` | `cultura123` | Estúdio |
| `equipe` | `modera123` | Moderação |

Também dá para criar uma conta nova na tela de entrada. A idade mínima é 16 anos.

## O que já vem pronto

- Entrada com login obrigatório
- Feed, Prismas (stories triangulares), mensagens e avisos
- Vitrine do perfil, personalização (cores, formato e foto de fundo) e kit de imprensa em PDF
- Mural de oportunidades, agenda e explorar
- Conquistas por nicho da cultura (MC, DJ, breaking, graffiti, slam e outros), na aba **Conquistas**
- Jam: cole um link do Spotify ou do YouTube e ouça junto com quem entrar. A música toca no player oficial; o áudio não é baixado
- Editais: currículo artístico no formato das inscrições, com o perfil público do Mapa Cultural (no Espírito Santo, https://mapa.cultura.es.gov.br)

## Onde ficam os dados

- `data/network.json` — contas, publicações, eventos, conquistas e o resto da rede
- `data/uploads` — fotos enviadas pelos usuários (a pasta é criada quando alguém manda a primeira imagem)

Apagar o `network.json` e reiniciar o servidor recria a rede de demonstração.

## Se algo falhar

- **`node -v` abaixo de 24:** instale o Node 24 e feche e abra o VS Code de novo, para o terminal pegar a versão nova.
- **Porta 3000 ocupada:** rode `npx next dev -p 3010` e abra http://localhost:3010.
- **Página em branco depois do install:** confira se o terminal ainda mostra o servidor rodando e se o endereço é o mesmo que ele imprimiu.
