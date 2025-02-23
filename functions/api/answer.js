export async function onRequestPost({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const { quizId, questionId, selectedAnswer, timeTaken, notes } = await request.json();
    await env.QUIZ_DB.prepare(
        "INSERT INTO answers (quiz_id, question_id, selected_answer, time_taken, notes) VALUES (?, ?, ?, ?, ?)"
    ).bind(quizId, questionId, selectedAnswer, timeTaken, notes || null).run();

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" }
    });
}