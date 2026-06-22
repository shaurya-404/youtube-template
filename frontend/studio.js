document.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) {
        window.location.replace("index.html");
        return;
    }

    const videoFeed = document.getElementById('video-feed');

    try {
        const response = await fetch('http://localhost:8000/api/trending');
        const videos = await response.json();
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
            });
        });
    } catch (error) {
        videoFeed.innerHTML = "<p>Failed to load trending videos.</p>";
    }

    document.getElementById('logout-btn')?.addEventListener('click', () => {
        localStorage.removeItem('dtube_token');
        window.location.replace('index.html'); 
    });
});