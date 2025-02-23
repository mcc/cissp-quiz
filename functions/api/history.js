export async function onRequestGet({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const sessions = await env.QUIZ_DB.prepare("SELECT * FROM quiz_sessions").all();
    const history = await Promise.all(sessions.results.map(async session => {
        const answers = await env.QUIZ_DB.prepare(
            "SELECT a.*, q.answer, q.domain FROM answers a JOIN questions q ON a.question_id = q.id WHERE a.quiz_id = ?"
        ).bind(session.id).all();

        const stats = answers.results.reduce((acc, answer) => {
            acc[answer.domain] = acc[answer.domain] || { correct: 0, total: 0 };
            acc[answer.domain].total++;
            if (answer.selected_answer === answer.answer) acc[answer.domain].correct++;
            return acc;
        }, {});

        const notesSummary = answers.results.map(a => a.notes).filter(n => n).join('; ') || 'None';

        return {
            id: session.id,
            start_time: session.start_time,
            source: session.source,
            name: session.name,
            remark: session.remark,
            stats,
            notesSummary
        };
    }));

    return new Response(JSON.stringify(history), {
        headers: { "Content-Type": "application/json" }
    });
}