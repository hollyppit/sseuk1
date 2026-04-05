// 멘토 프로필 사진 / 강의 영상 파일 업로드 → Supabase Storage
// POST: multipart/form-data로 파일 수신 → Supabase Storage 업로드

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
};

export async function onRequestPost(context) {
    const { request, env } = context;

    try {
        const formData = await request.formData();
        const file = formData.get('file');
        const bucket = formData.get('bucket') || 'mentor-videos'; // mentor-profiles or mentor-videos
        const mentorId = formData.get('mentor_id') || 'unknown';

        if (!file || !(file instanceof File)) {
            return new Response(JSON.stringify({ error: '파일이 없습니다.' }), { status: 400, headers: corsHeaders });
        }

        // 파일 크기 제한: 프로필 5MB, 영상 500MB
        const maxSize = bucket === 'mentor-profiles' ? 5 * 1024 * 1024 : 500 * 1024 * 1024;
        if (file.size > maxSize) {
            const limitMB = maxSize / (1024 * 1024);
            return new Response(JSON.stringify({ error: `파일 크기가 ${limitMB}MB를 초과합니다.` }), { status: 400, headers: corsHeaders });
        }

        // 고유 파일명 생성
        const ext = file.name.split('.').pop() || 'bin';
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(2, 8);
        const fileName = `${mentorId}/${timestamp}-${randomStr}.${ext}`;

        // Supabase Storage 업로드
        const arrayBuffer = await file.arrayBuffer();
        const uploadRes = await fetch(
            `${env.SUPABASE_URL}/storage/v1/object/${bucket}/${fileName}`,
            {
                method: 'POST',
                headers: {
                    'apikey': env.SUPABASE_SERVICE_KEY,
                    'Authorization': `Bearer ${env.SUPABASE_SERVICE_KEY}`,
                    'Content-Type': file.type || 'application/octet-stream',
                    'x-upsert': 'true',
                },
                body: arrayBuffer,
            }
        );

        if (!uploadRes.ok) {
            const errText = await uploadRes.text();
            console.error('Supabase Storage upload error:', errText);
            return new Response(JSON.stringify({ error: '파일 업로드 실패' }), { status: 502, headers: corsHeaders });
        }

        // 공개 URL 생성
        const publicUrl = `${env.SUPABASE_URL}/storage/v1/object/public/${bucket}/${fileName}`;

        return new Response(JSON.stringify({
            url: publicUrl,
            fileName,
            bucket,
            size: file.size,
            type: file.type,
        }), { headers: corsHeaders });

    } catch (err) {
        console.error('mentor-upload error:', err);
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), { status: 500, headers: corsHeaders });
    }
}

export async function onRequestOptions() {
    return new Response(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
