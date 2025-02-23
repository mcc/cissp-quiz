export async function onRequestGet({ request, env }) {
/*    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }
*/
    const { results } = await env.QUIZ_DB.prepare("SELECT DISTINCT source FROM questions").all();
    const sources = results.map(row => row.source);
    return new Response(JSON.stringify(sources), {
        headers: { "Content-Type": "application/json" }
    });
}