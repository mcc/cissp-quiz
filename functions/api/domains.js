export async function onRequestGet({ request, env }) {
/*    const password = request.headers.get('X-Admin-Password');
    if (password !== env.ADMIN_PASSWORD) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { "Content-Type": "application/json" }
        });
    }
*/
    const { results } = await env.QUIZ_DB.prepare("SELECT DISTINCT domain FROM questions").all();
    const domains = results.map(row => row.domain);
    return new Response(JSON.stringify(domains), {
        headers: { "Content-Type": "application/json" }
    });
}