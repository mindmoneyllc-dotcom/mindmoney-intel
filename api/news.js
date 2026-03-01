export const config = { runtime: 'edge' };

const NEWS_QUERIES = {
  geopolitics: { q: 'ukraine OR russia OR china OR nato OR taiwan OR iran OR middle east OR war', sortBy: 'publishedAt' },
  business: { category: 'business', sortBy: 'publishedAt' },
  ai: { q: 'artificial intelligence OR openai OR nvidia OR semiconductor OR robotics', sortBy: 'publishedAt' },
  macro: { q: 'inflation OR federal reserve OR economy OR GDP OR interest rates OR recession', sortBy: 'publishedAt' }
};

export default async function handler(req) {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }
    });
  }

  try {
    const { category, prompt } = await req.json();
    const apiKey = process.env.NEWS_API_KEY;

    // If we have a news API key and category, fetch live news
    if (apiKey && category && NEWS_QUERIES[category]) {
      const params = NEWS_QUERIES[category];
      let url;

      if (params.category) {
        url = `https://newsapi.org/v2/top-headlines?category=${params.category}&language=en&pageSize=5&apiKey=${apiKey}`;
      } else {
        url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(params.q)}&language=en&pageSize=5&sortBy=publishedAt&apiKey=${apiKey}`;
      }

      const newsRes = await fetch(url);
      const newsData = await newsRes.json();

      if (newsData.status === 'ok' && newsData.articles?.length > 0) {
        // Use Claude to format the articles into our card format
        const articles = newsData.articles.slice(0, 5).map(a => 
          `HEADLINE: ${a.title}\nSOURCE: ${a.source?.name}\nDESCRIPTION: ${a.description || ''}`
        ).join('\n\n');

        const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': process.env.ANTHROPIC_API_KEY,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1500,
            messages: [{
              role: 'user',
              content: `Convert these real news articles into a JSON array. Return ONLY valid JSON, no markdown, no text before or after.

Articles:
${articles}

Return a JSON array of exactly ${newsData.articles.slice(0,5).length} objects, each with:
"headline": the original headline (keep it)
"summary": 2-3 sentence summary based on the description
"region": geographic region or market sector
"urgency": HIGH, MEDIUM, or LOW based on significance
"source": the news source name
"publishedAt": "${newsData.articles[0]?.publishedAt || new Date().toISOString()}"

Start with [ and end with ]`
            }]
          })
        });

        const claudeData = await claudeRes.json();
        return new Response(JSON.stringify({ type: 'live', data: claudeData }), {
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // Fallback: use Claude knowledge
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await claudeRes.json();
    return new Response(JSON.stringify({ type: 'knowledge', data }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
