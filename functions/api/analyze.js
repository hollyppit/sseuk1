export async function onRequestPost(context) {
    const { request, env } = context;

    // CORS 헤더
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const body = await request.json();
        const { image, mimeType } = body;

        if (!image) {
            return new Response(JSON.stringify({ error: '이미지 데이터가 없습니다.' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        const resolvedMime = validMimeTypes.includes(mimeType) ? mimeType : 'image/jpeg';

        const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': env.ANTHROPIC_API_KEY,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-sonnet-4-6',
                max_tokens: 1200,
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'image',
                                source: {
                                    type: 'base64',
                                    media_type: resolvedMime,
                                    data: image,
                                },
                            },
                            {
                                type: 'text',
                                text: `당신은 미술 전문 AI 튜터입니다. 업로드된 그림을 분석해서 아래 형식으로 한국어 피드백을 제공해 주세요. 초보자가 읽기 쉽게, 친근하고 격려하는 톤으로 작성해 주세요.

**전반적인 인상**
(그림의 전체적 느낌과 수준 — 2~3문장)

**잘된 점**
(구체적으로 칭찬할 만한 요소 2가지)

**주요 개선 포인트**
1. (가장 중요한 개선점 — 구체적으로)
2. (두 번째 개선점)
3. (세 번째 개선점)

**지금 바로 할 수 있는 연습**
(초보자가 오늘 당장 실천할 수 있는 구체적 방법 1~2가지)`,
                            },
                        ],
                    },
                ],
            }),
        });

        if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            console.error('Claude API error:', errText);
            return new Response(JSON.stringify({ error: 'AI 분석 서버 오류가 발생했습니다.' }), {
                status: 502,
                headers: corsHeaders,
            });
        }

        const anthropicData = await anthropicRes.json();
        const feedback = anthropicData.content?.[0]?.text;

        if (!feedback) {
            return new Response(JSON.stringify({ error: '분석 결과를 가져올 수 없습니다.' }), {
                status: 500,
                headers: corsHeaders,
            });
        }

        return new Response(JSON.stringify({ feedback }), { headers: corsHeaders });

    } catch (err) {
        console.error('analyze function error:', err);
        return new Response(JSON.stringify({ error: '서버 오류가 발생했습니다.' }), {
            status: 500,
            headers: corsHeaders,
        });
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
