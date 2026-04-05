// 멘토 CRUD API
// GET: 전체 목록 or ?id=xxx 단건 조회
// POST: 새 멘토 생성
// PUT: 멘토 정보 수정

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
};

function supabaseHeaders(env) {
    return {
        'apikey': env.SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
    };
}

export async function onRequestGet(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');
    const featured = url.searchParams.get('featured');

    try {
        let endpoint = `${env.SUPABASE_URL}/rest/v1/mentors?select=*`;
        if (id) {
            endpoint += `&id=eq.${id}`;
        }
        if (featured === 'true') {
            endpoint += `&is_featured=eq.true`;
        }
        endpoint += `&order=created_at.desc`;

        const res = await fetch(endpoint, { headers: supabaseHeaders(env) });
        const data = await res.json();

        if (id && data.length > 0) {
            return new Response(JSON.stringify(data[0]), { headers: corsHeaders });
        }

        return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { name, specialty, bio, profile_image_url, is_featured } = body;

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/mentors`, {
            method: 'POST',
            headers: {
                ...supabaseHeaders(env),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({ name, specialty, bio, profile_image_url, is_featured: is_featured || false }),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), { status: 201, headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPut(context) {
    const { request, env } = context;

    try {
        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return new Response(JSON.stringify({ error: 'id가 필요합니다.' }), { status: 400, headers: corsHeaders });
        }

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/mentors?id=eq.${id}`, {
            method: 'PATCH',
            headers: {
                ...supabaseHeaders(env),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify(updates),
        });

        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestDelete(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
        return new Response(JSON.stringify({ error: 'id가 필요합니다.' }), { status: 400, headers: corsHeaders });
    }

    try {
        await fetch(`${env.SUPABASE_URL}/rest/v1/mentors?id=eq.${id}`, {
            method: 'DELETE',
            headers: supabaseHeaders(env),
        });

        return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
