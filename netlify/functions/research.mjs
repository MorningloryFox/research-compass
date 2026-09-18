import corpus from '../../data/corpus.json' with { type: 'json' };

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const tokens = value => new Set(String(value).toLocaleLowerCase('pt-BR').match(/[\p{L}\p{N}]{3,}/gu) || []);
const retrieve = question => {
  const query = tokens(question);
  return corpus.map(item => {
    const words = tokens(`${item.title} ${item.abstract} ${item.keywords || ''}`);
    const overlap = [...query].filter(word => words.has(word)).length;
    return { ...item, score: overlap / Math.max(query.size, 1) };
  }).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3);
};

export default async request => {
  if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const { question } = await request.json().catch(() => ({}));
  if (typeof question !== 'string' || question.trim().length < 8) return json({ error: 'Escreva uma pergunta com pelo menos 8 caracteres.' }, 400);
  const sources = retrieve(question);
  if (!sources.length) return json({ error: 'Não encontrei evidência no acervo demonstrativo. Tente RAG, embeddings, OpenAlex ou alucinação.' }, 422);
  const evidence = sources.map((source, index) => `[${index + 1}] ${source.title} (${source.year}): ${source.abstract}`).join('\n\n');
  if (!process.env.GOOGLE_API_KEY) return json({ answer: `Modo demonstrativo: a pergunta foi associada a ${sources.length} fonte(s). A síntese Gemini será habilitada quando GOOGLE_API_KEY estiver configurada no Netlify.`, sources, mode: 'retrieval-only' });
  const prompt = `Você é um assistente de pesquisa. Responda em português, em no máximo 130 palavras, somente com base nas evidências abaixo. Cite [1], [2] ou [3] em cada afirmação factual. Se as evidências não bastarem, diga isso.\n\nPergunta: ${question}\n\nEvidências:\n${evidence}`;
  try {
    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent', { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': process.env.GOOGLE_API_KEY }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2, maxOutputTokens: 300 } }) });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload?.error?.message || 'Gemini indisponível.');
    return json({ answer: payload.candidates?.[0]?.content?.parts?.map(part => part.text).join('') || 'O modelo não retornou texto.', sources, mode: 'gemini-grounded' });
  } catch (error) { return json({ answer: `A recuperação funcionou, mas a síntese não está disponível agora: ${error.message}`, sources, mode: 'retrieval-only' }, 200); }
};
