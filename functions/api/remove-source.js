export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { source } = await request.json();
    if (!source) {
        return new Response(JSON.stringify({ error: 'Source is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { meta } = await env.QUIZ_DB.prepare("DELETE FROM questions WHERE source = ?").bind(source).run();
    if (meta.changes === 0) {
        return new Response(JSON.stringify({ error: 'No questions found for this source' }), {
            status: 404,
            headers: { "Content-Type": "application/json" }
        });
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}