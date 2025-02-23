export async function onRequestGet({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const source = url.searchParams.get("source");
    if (!source) {
        return new Response(JSON.stringify({ error: 'Source is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { results } = await env.QUIZ_DB.prepare(
        "SELECT * FROM questions WHERE source = ?"
    ).bind(source).all();

    const questions = results.map(row => ({
        id: row.id,
        text: row.text,
        options: JSON.parse(row.options),
        answer: row.answer,
        explanation: row.explanation,
        domain: row.domain,
        tags: JSON.parse(row.tags),
        source: row.source,
        number: row.number
    }));

    return new Response(JSON.stringify(questions), {
        headers: { "Content-Type": "application/json" }
    });
}