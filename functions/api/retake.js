export async function onRequestGet({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const quizId = url.searchParams.get("quizId");
    const domain = url.searchParams.get("domain");
    const source = url.searchParams.get("source");

    let query = `
        SELECT q.* 
        FROM answers a 
        JOIN questions q ON a.question_id = q.id 
        WHERE a.quiz_id = ? AND a.selected_answer != q.answer
    `;
    const params = [quizId];

    if (domain && domain !== "all") {
        query += " AND q.domain = ?";
        params.push(domain);
    }
    if (source && source !== "all") {
        query += " AND q.source = ?";
        params.push(source);
    }

    const { results } = await env.QUIZ_DB.prepare(query).bind(...params).all();

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