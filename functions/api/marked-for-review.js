export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { questionId } = await request.json();
    if (!questionId) {
        return new Response(JSON.stringify({ error: 'Question ID is required' }), {
            status: 400,
            headers: { "Content-Type": "application/json" }
        });
    }

    await env.QUIZ_DB.prepare(
        "INSERT OR IGNORE INTO marked_for_review (question_id) VALUES (?)"
    ).bind(questionId).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}