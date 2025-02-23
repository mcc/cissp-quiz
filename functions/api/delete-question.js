export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { id } = await request.json();
    if (!id) {
        return new Response(JSON.stringify({ error: 'Question ID is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await env.QUIZ_DB.prepare("DELETE FROM answers WHERE question_id = ?").bind(id).run();
    await env.QUIZ_DB.prepare("DELETE FROM marked_for_review WHERE question_id = ?").bind(id).run();
    const { meta } = await env.QUIZ_DB.prepare("DELETE FROM questions WHERE id = ?").bind(id).run();

    if (meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'Question not found' }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}