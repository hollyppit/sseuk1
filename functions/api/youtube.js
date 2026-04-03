export async function onRequestPost(context) {
    const { request, env } = context;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'application/json',
    };

    try {
        const body = await request.json();
        const { keywords } = body;

        if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
            return new Response(JSON.stringify({ error: '키워드가 없습니다.' }), {
                status: 400,
                headers: corsHeaders,
            });
        }

        const videos = [];

        for (const keyword of keywords.slice(0, 3)) {
            const url = new URL('https://www.googleapis.com/youtube/v3/search');
            url.searchParams.set('part', 'snippet');
            url.searchParams.set('q', keyword);
            url.searchParams.set('type', 'video');
            url.searchParams.set('maxResults', '2');
            url.searchParams.set('relevanceLanguage', 'ko');
            url.searchParams.set('key', env.YOUTUBE_API_KEY);

            const res = await fetch(url.toString());

            if (!res.ok) {
                console.error('YouTube API error for keyword:', keyword, await res.text());
                continue;
            }

            const data = await res.json();

            if (data.items) {
                for (const item of data.items) {
                    videos.push({
                        videoId: item.id.videoId,
                        title: item.snippet.title,
                        thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
                        channel: item.snippet.channelTitle,
                        keyword,
                    });
                }
            }
        }

        return new Response(JSON.stringify({ videos }), { headers: corsHeaders });

    } catch (err) {
        console.error('youtube function error:', err);
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
