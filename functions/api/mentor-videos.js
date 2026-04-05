// 멘토 영상 CRUD + 순서 변경 + 코멘트 API
// GET: ?mentor_id=xxx 영상 목록
// POST: 새 영상 추가
// PUT: 영상 정보/코멘트 수정, 순서 변경
// DELETE: 영상 삭제

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
    const mentorId = url.searchParams.get('mentor_id');

    if (!mentorId) {
        return new Response(JSON.stringify({ error: 'mentor_id가 필요합니다.' }), { status: 400, headers: corsHeaders });
    }

    try {
        const res = await fetch(
            `${env.SUPABASE_URL}/rest/v1/mentor_videos?mentor_id=eq.${mentorId}&select=*&order=sort_order.asc`,
            { headers: supabaseHeaders(env) }
        );
        const data = await res.json();
        return new Response(JSON.stringify(data), { headers: corsHeaders });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const body = await request.json();

        // 순서 일괄 업데이트
        if (body.reorder && Array.isArray(body.items)) {
            for (const item of body.items) {
                await fetch(`${env.SUPABASE_URL}/rest/v1/mentor_videos?id=eq.${item.id}`, {
                    method: 'PATCH',
                    headers: supabaseHeaders(env),
                    body: JSON.stringify({ sort_order: item.sort_order }),
                });
            }
            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        const { mentor_id, title, video_url, thumbnail_url, comment, sort_order } = body;

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/mentor_videos`, {
            method: 'POST',
            headers: {
                ...supabaseHeaders(env),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({ mentor_id, title, video_url, thumbnail_url, comment: comment || '', sort_order: sort_order || 0 }),
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

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/mentor_videos?id=eq.${id}`, {
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
        // 영상 정보 조회 (Storage 삭제용)
        const infoRes = await fetch(`${env.SUPABASE_URL}/rest/v1/mentor_videos?id=eq.${id}&select=video_url,thumbnail_url`, {
            headers: supabaseHeaders(env),
        });
        const info = await infoRes.json();

        // DB에서 삭제
        await fetch(`${env.SUPABASE_URL}/rest/v1/mentor_videos?id=eq.${id}`, {
            method: 'DELETE',
            headers: supabaseHeaders(env),
        });

        // 커리큘럼 연결도 삭제
        await fetch(`${env.SUPABASE_URL}/rest/v1/curriculum_videos?video_id=eq.${id}`, {
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
