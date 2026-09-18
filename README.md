# Research Compass

Assistente demonstrativo de pesquisa com recuperação rastreável. Ele usa um acervo público compacto, mostra as evidências recuperadas e só então pede uma síntese ao Gemini.

## Executar

```bash
npx netlify dev
```

Defina `GOOGLE_API_KEY` somente no ambiente Netlify ou local. Sem chave, a recuperação continua disponível em modo demonstrativo.

## Limites e dados

- O corpus é público e versionado em `data/corpus.json`.
- A demonstração limita a interface a cinco consultas por navegador; isso não é controle antifraude.
- Não envie dados pessoais, corporativos ou confidenciais.

## Arquitetura

`pergunta → recuperação no corpus → fontes explícitas → Function Netlify → Gemini → resposta citada`

