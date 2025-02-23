export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const newQuestions = await request.json();
    if (!Array.isArray(newQuestions) || !newQuestions.length) {
        return new Response(JSON.stringify({ error: 'Invalid or empty question set' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const stmt = env.QUIZ_DB.prepare(`
        INSERT INTO questions (id, text, options, answer, explanation, domain, tags, source, number)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const inserts = newQuestions.map(q =>
        stmt.bind(
            q.id,
            q.text,
            JSON.stringify(q.options),
            q.answer,
            q.explanation,
            q.domain,
            JSON.stringify(q.tags),
            q.source,
            q.number || null
        ).run()
    );

    await Promise.all(inserts);

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}