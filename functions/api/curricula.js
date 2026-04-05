// 커리큘럼 CRUD + 영상 연결 API
// GET: ?mentor_id=xxx 커리큘럼 목록 (영상 포함)
// POST: 새 커리큘럼 생성 / 영상 연결
// PUT: 커리큘럼 수정
// DELETE: 커리큘럼 삭제

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
    const id = url.searchParams.get('id');

    try {
        if (id) {
            // 단건 조회 + 연결된 영상
            const curRes = await fetch(
                `${env.SUPABASE_URL}/rest/v1/curricula?id=eq.${id}&select=*`,
                { headers: supabaseHeaders(env) }
            );
            const curricula = await curRes.json();
            if (curricula.length === 0) {
                return new Response(JSON.stringify({ error: '커리큘럼을 찾을 수 없습니다.' }), { status: 404, headers: corsHeaders });
            }

            // 연결된 영상 조회
            const cvRes = await fetch(
                `${env.SUPABASE_URL}/rest/v1/curriculum_videos?curriculum_id=eq.${id}&select=*,mentor_videos(*)&order=sort_order.asc`,
                { headers: supabaseHeaders(env) }
            );
            const cvData = await cvRes.json();

            return new Response(JSON.stringify({ ...curricula[0], videos: cvData }), { headers: corsHeaders });
        }

        if (!mentorId) {
            return new Response(JSON.stringify({ error: 'mentor_id가 필요합니다.' }), { status: 400, headers: corsHeaders });
        }

        const res = await fetch(
            `${env.SUPABASE_URL}/rest/v1/curricula?mentor_id=eq.${mentorId}&select=*&order=created_at.desc`,
            { headers: supabaseHeaders(env) }
        );
        const data = await res.json();

        // 각 커리큘럼에 영상 수 추가
        for (const cur of data) {
            const countRes = await fetch(
                `${env.SUPABASE_URL}/rest/v1/curriculum_videos?curriculum_id=eq.${cur.id}&select=id`,
                { headers: supabaseHeaders(env) }
            );
            const countData = await countRes.json();
            cur.video_count = countData.length;
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

        // 커리큘럼에 영상 연결/해제
        if (body.action === 'set_videos') {
            const { curriculum_id, video_ids } = body;

            // 기존 연결 삭제
            await fetch(`${env.SUPABASE_URL}/rest/v1/curriculum_videos?curriculum_id=eq.${curriculum_id}`, {
                method: 'DELETE',
                headers: supabaseHeaders(env),
            });

            // 새 연결 추가
            if (video_ids && video_ids.length > 0) {
                const rows = video_ids.map((vid, i) => ({
                    curriculum_id,
                    video_id: vid,
                    sort_order: i,
                }));

                await fetch(`${env.SUPABASE_URL}/rest/v1/curriculum_videos`, {
                    method: 'POST',
                    headers: supabaseHeaders(env),
                    body: JSON.stringify(rows),
                });
            }

            return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        }

        // 새 커리큘럼 생성
        const { mentor_id, name, description } = body;
        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/curricula`, {
            method: 'POST',
            headers: {
                ...supabaseHeaders(env),
                'Prefer': 'return=representation',
            },
            body: JSON.stringify({ mentor_id, name, description: description || '' }),
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

        const res = await fetch(`${env.SUPABASE_URL}/rest/v1/curricula?id=eq.${id}`, {
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
        // 연결된 영상 관계 삭제
        await fetch(`${env.SUPABASE_URL}/rest/v1/curriculum_videos?curriculum_id=eq.${id}`, {
            method: 'DELETE',
            headers: supabaseHeaders(env),
        });

        // 커리큘럼 삭제
        await fetch(`${env.SUPABASE_URL}/rest/v1/curricula?id=eq.${id}`, {
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
