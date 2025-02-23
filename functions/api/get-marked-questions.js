export async function onRequestGet({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const name = url.searchParams.get("name");
    if (!name) {
        return new Response(JSON.stringify({ error: 'User name is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { results } = await env.QUIZ_DB.prepare(`
        SELECT q.*, GROUP_CONCAT(a.notes, '; ') as notes
        FROM marked_for_review m
        JOIN questions q ON m.question_id = q.id
        LEFT JOIN answers a ON a.question_id = q.id
        JOIN quiz_sessions s ON a.quiz_id = s.id
        WHERE s.name = ?
        GROUP BY q.id, q.text, q.options, q.answer, q.explanation, q.domain, q.tags, q.source, q.number
    `).bind(name).all();

    const markedQuestions = results.map(row => ({
        id: row.id,
        text: row.text,
        options: JSON.parse(row.options),
        answer: row.answer,
        explanation: row.explanation,
        domain: row.domain,
        tags: JSON.parse(row.tags),
        source: row.source,
        number: row.number,
        notes: row.notes ? row.notes.split('; ').filter(n => n) : []
    }));

    return new Response(JSON.stringify(markedQuestions), {
        headers: { "Content-Type": "application/json" }
    });
}