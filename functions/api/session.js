export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { source, name, remark } = await request.json();
    const quizId = Date.now().toString();
    await env.QUIZ_DB.prepare(
        "INSERT INTO quiz_sessions (id, start_time, source, name, remark) VALUES (?, ?, ?, ?, ?)"
    ).bind(quizId, new Date().toISOString(), source, name, remark || null).run();

    return new Response(JSON.stringify({ quizId }), {
        headers: { "Content-Type": "application/json" }
    });
}