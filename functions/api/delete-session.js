export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { quizId } = await request.json();
    if (!quizId) {
        return new Response(JSON.stringify({ error: 'Quiz ID is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await env.QUIZ_DB.prepare("DELETE FROM answers WHERE quiz_id = ?").bind(quizId).run();
    const { meta } = await env.QUIZ_DB.prepare("DELETE FROM quiz_sessions WHERE id = ?").bind(quizId).run();

    if (meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Quiz session not found' }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}