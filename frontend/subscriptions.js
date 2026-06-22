document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) return window.location.replace("index.html");

    const videoFeed = document.getElementById('video-feed');

    try {
        // Fetch ONLY videos from channels you are subscribed to
        const response = await fetch('http://localhost:8000/api/videos/subscriptions', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Failed to fetch");
        const videos = await response.json();

        // NEW: If they aren't subscribed to anyone, tell them!
        if (videos.length === 0) {
            videoFeed.innerHTML = "<h3 style='color: white; text-align: center; width: 100%; margin-top: 50px;'>You haven't subscribed to anyone yet, or your subscriptions have no videos!</h3>";
            return;
        }

        videoFeed.innerHTML = "";

        videos.forEach(video => {
            const videoCard = document.createElement('div');
            videoCard.className = 'video-card';
            videoCard.style.cursor = 'pointer';
            const videoUrl = `http://localhost:8000/videos/${video.filename}`;
            const imgId = `thumb-${video.id}`;

            videoCard.innerHTML = `
                <img id="${imgId}" src="https://placehold.co/300x170/3b82f6/white?text=Loading..." style="width: 100%; height: 170px; object-fit: cover;">
                <div class="video-info" id="info-${video.id}">
                    <h3>${video.title}</h3>
                    <p class="stats">👁️ ${video.views} Views • ❤️ ${video.likes} Likes</p>
                </div>
            `;

            videoCard.onclick = () => {
                window.location.href = `videoplay.html?file=${video.filename}&title=${encodeURIComponent(video.title)}`;
            };
            videoFeed.appendChild(videoCard);

            // Thumbnail Extractor (Notice there is NO delete button here!)
            const hiddenVideo = document.createElement('video');
            hiddenVideo.src = videoUrl;
            hiddenVideo.crossOrigin = "anonymous";
            hiddenVideo.addEventListener('loadeddata', () => hiddenVideo.currentTime = 1.0);
            hiddenVideo.addEventListener('seeked', () => {
                const canvas = document.createElement('canvas');
                canvas.width = hiddenVideo.videoWidth;
                canvas.height = hiddenVideo.videoHeight;
                canvas.getContext('2d').drawImage(hiddenVideo, 0, 0, canvas.width, canvas.height);
                document.getElementById(imgId).src = canvas.toDataURL('image/jpeg');
                
                hiddenVideo.removeAttribute('src');
                hiddenVideo.load();
            });
        });
    } catch (error) {
        videoFeed.innerHTML = "<p style='color: #ef4444; text-align: center;'>Failed to load subscriptions. Make sure the server is running!</p>";
    }
});