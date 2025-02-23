export async function onRequestGet({ request, env }) {
    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }

    const url = new URL(request.url);
    const num = parseInt(url.searchParams.get("num"));
    const domain = url.searchParams.get("domain");
    const source = url.searchParams.get("source");
    const randomize = url.searchParams.get("randomize") === "true";
    const startRange = url.searchParams.get("start") ? parseInt(url.searchParams.get("start")) : null;
    const endRange = url.searchParams.get("end") ? parseInt(url.searchParams.get("end")) : null;

    let query = "SELECT * FROM questions WHERE 1=1";
    const params = [];
    if (domain !== "all") {
        query += " AND domain = ?";
        params.push(domain);
    }
    if (source !== "all") {
        query += " AND source = ?";
        params.push(source);
    }
    if (startRange && endRange) {
        query += " AND CAST(SUBSTR(number, 2) AS INTEGER) BETWEEN ? AND ?";
        params.push(startRange, endRange);
    }
    if (randomize) {
        query += " ORDER BY RANDOM()";
    } else {
        query += " ORDER BY CAST(SUBSTR(number, 2) AS INTEGER)";
    }
    query += " LIMIT ? OFFSET 0";
    params.push(num);

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