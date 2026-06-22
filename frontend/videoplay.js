document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 🛡️ THE BOUNCER (Auth Guard)
    // ==========================================
    const token = localStorage.getItem('dtube_token');
    if (!token) {
        alert("You must be logged in to view videos!");
        window.location.replace("index.html"); // Kick them to the login page
        return; // Stop reading the rest of the file
    }

    // Decode their VIP wristband to get their User ID
    const payloadBase64 = token.split('.')[1];
    const myUserId = JSON.parse(atob(payloadBase64)).id;

    // ==========================================
    // 🎥 SETUP VIDEO PLAYER
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('file');
    const title = urlParams.get('title');

    if (!filename) {
        document.getElementById('video-title').innerText = "Error: No video selected.";
        return;
    }

    // Load the video source and title
    document.getElementById('video-title').innerText = title || "Untitled Video";
    const videoSource = document.getElementById('video-source');
    videoSource.src = `http://localhost:8000/videos/${filename}`;
    document.getElementById('main-player').load();

    // Register a View immediately in the background
    fetch('http://localhost:8000/api/videos/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename })
    }).catch(err => console.error("View count error:", err));

    // Get button references exactly ONCE
    const likeBtn = document.getElementById('like-btn');
    const subBtn = document.getElementById('subscribe-btn');

    // ==========================================
    // 📊 FETCH REAL-TIME STATS & UPLOADER INFO
    // ==========================================
   // ==========================================
    // 📊 FETCH REAL-TIME STATS & SYNC DB STATE
    // ==========================================
    let currentLikes = 0;
    let currentSubs = 0;
    let channelIdToSubscribeTo = 1; 

    fetch(`http://localhost:8000/api/videos/details?filename=${filename}`)
        .then(res => {
            if (!res.ok) throw new Error("Video not found in database.");
            return res.json();
        })
        .then(data => {
            // 1. Set the numbers safely
            currentLikes = data.likes || 0;
            currentSubs = data.subscriber_count || 0;
            
            document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;

            // 2. Set the Uploader Name safely
            const creatorName = data.uploader_name || "Unknown Creator";
            const uploaderElement = document.getElementById('uploader-name');
            if (uploaderElement) {
                uploaderElement.innerText = creatorName;
            }

            // ==========================================
            // 🧠 CHECK DB STATE (Chained inside the .then)
            // ==========================================
            
            // Check Subscription
            fetch('http://localhost:8000/api/check-subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subscriber_id: myUserId, channel_id: channelIdToSubscribeTo })
            })
            .then(res => res.json())
            .then(subData => {
                if (subData.isSubscribed) {
                    subBtn.innerText = "Unsubscribe";
                    subBtn.style.backgroundColor = "#64748b";
                }
            });

            // Check Like
            fetch('http://localhost:8000/api/check-like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: myUserId, filename: filename })
            })
            .then(res => res.json())
            .then(likeData => {
                if (likeData.isLiked) {
                    likeBtn.innerText = "👍 Liked!";
                    likeBtn.style.backgroundColor = "#22c55e";
                }
            });
        })
        .catch(err => {
            console.log("Stats fetch error:", err);
            document.getElementById('like-count').innerText = "0 Likes";
            document.getElementById('sub-count').innerText = "0 Subscribers";
        });
    // ==========================================
    // 🖱️ CLICK EVENTS (Database Updates)
    // ==========================================
    
    // LIKE BUTTON CLICK
    likeBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:8000/api/videos/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename, user_id: myUserId })
            });
            
            const data = await res.json();

            if (res.ok) {
                if (data.isLiked) {
                    likeBtn.innerText = "👍 Liked!";
                    likeBtn.style.backgroundColor = "#22c55e"; // Turn green
                    currentLikes += 1; // Number goes up
                } else {
                    likeBtn.innerText = "👍 Like";
                    likeBtn.style.backgroundColor = "#3b82f6"; // Turn blue
                    currentLikes -= 1; // Number goes down
                }
                document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            }
        } catch (error) {
            console.error("Failed to toggle like.");
        }
    });

    // SUBSCRIBE BUTTON CLICK
    subBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:8000/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    subscriber_id: myUserId, 
                    channel_id: channelIdToSubscribeTo 
                })
            });
            
            const data = await res.json();
            
            if (res.ok) {
                if (data.isSubscribed) {
                    subBtn.innerText = "Unsubscribe";
                    subBtn.style.backgroundColor = "#64748b"; // Turn gray
                    currentSubs += 1; // Number goes up
                } else {
                    subBtn.innerText = "🔔 Subscribe";
                    subBtn.style.backgroundColor = "#ef4444"; // Turn red
                    currentSubs -= 1; // Number goes down
                }
                document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;
            }
        } catch (error) {
            console.error("Subscription failed.");
        }
    });
});

/* document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('file');
    const title = urlParams.get('title');

    const token = localStorage.getItem('dtube_token');
    if (!token) {
        alert("You must be logged in to view videos!");
        window.location.replace("index.html");
        return;
    }
    const payloadBase64 = token.split('.')[1];
    const myUserId = JSON.parse(atob(payloadBase64)).id;

    if (!filename) {
        document.getElementById('video-title').innerText = "Error: No video selected.";
        return;
    }

    // Set up the player
    document.getElementById('video-title').innerText = title || "Untitled Video";
    const videoSource = document.getElementById('video-source');
    videoSource.src = `http://localhost:8000/videos/${filename}`;
    document.getElementById('main-player').load();

    // Send a view immediately
    fetch('http://localhost:8000/api/videos/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename })
    }).then(() => console.log("View counted!"));
    
    const likeBtn = document.getElementById('like-btn');
    const subBtn = document.getElementById('subscribe-btn');

    /* let currentLikes = 0;
    let currentSubs = 0;

    fetch(`http://localhost:8000/api/videos/details?filename=${filename}`)
        .then(res => res.json())
        .then(data => {
            currentLikes = data.likes;
            currentSubs = data.subscriber_count;
            
            document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;
        })
        .catch(err => console.log("Stats fetch error or missing HTML spans")); *
    
    let currentLikes = 0;

    fetch(`http://localhost:8000/api/videos/details?filename=${filename}`)
        .then(res => {
            if (!res.ok) throw new Error("Video not found");
            return res.json();
        })
        .then(data => {
            currentLikes = data.likes || 0;
            document.getElementById('like-count').innerText = `${currentLikes} Likes`;
        })
        .catch(err => {
            console.log("Error loading likes:", err);
            document.getElementById('like-count').innerText = "0 Likes";
        });


    // ==========================================
    // 🧠 MEMORY CHECK (Did they already click these?)
    // ==========================================
    if (localStorage.getItem(`liked_${filename}`)) {
        likeBtn.innerText = "👍 Liked!";
        likeBtn.style.backgroundColor = "#22c55e";
        likeBtn.disabled = true;
    }

    const token = localStorage.getItem('dtube_token');
    const channelIdToSubscribeTo = 1;
    
    if (token) {
        const payloadBase64 = token.split('.')[1];
        const myUserId = JSON.parse(atob(payloadBase64)).id;

        fetch('http://localhost:8000/api/check-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriber_id: myUserId, channel_id: channelIdToSubscribeTo })
        })
        .then(res => res.json())
        .then(data => {
            if (data.isSubscribed) {
                subBtn.innerText = "Unsubscribe";
                subBtn.style.backgroundColor = "#64748b";
            }
        });
    }

    // ==========================================
    // 🖱️ CLICK EVENTS
    // ==========================================
    
    // LIKE BUTTON CLICK
    /*likeBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:8000/api/videos/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
            });
            if (res.ok) {
                likeBtn.innerText = "👍 Liked!";
                likeBtn.style.backgroundColor = "#22c55e";
                likeBtn.disabled = true; 
                localStorage.setItem(`liked_${filename}`, 'true'); 
                
                // Instantly update the number on screen
                currentLikes += 1;
                document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            }
        } catch (error) {
            console.error("Failed to like video.");
        }
    }); *

    likeBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:8000/api/videos/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
            });
            
            if (res.ok) {
                likeBtn.innerText = "👍 Liked!";
                likeBtn.style.backgroundColor = "#22c55e";
                likeBtn.disabled = true; 
                localStorage.setItem(`liked_${filename}`, 'true'); 
                
                currentLikes += 1;
                document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            }
        } catch (error) {
            console.error("Failed to like video.");
        }
    });

    // SUBSCRIBE BUTTON CLICK (Removed the redeclaration of subBtn here!)
    subBtn.addEventListener('click', async () => {
        if (!token) {
            alert("You must be logged in to subscribe!");
            window.location.href = "index.html"; // Make sure this goes to your login page!
            return;
        }

        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const myUserId = decodedPayload.id;

        try {
            const res = await fetch('http://localhost:8000/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    subscriber_id: myUserId, 
                    channel_id: channelIdToSubscribeTo 
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                if (data.isSubscribed) {
                    subBtn.innerText = "Unsubscribe";
                    subBtn.style.backgroundColor = "#64748b"; 
                    // Instantly update the number on screen
                    currentSubs += 1;
                } else {
                    subBtn.innerText = "🔔 Subscribe";
                    subBtn.style.backgroundColor = "#ef4444"; 
                    // Instantly update the number on screen
                    currentSubs -= 1;
                }
                document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;
            }
        } catch (error) {
            console.error("Subscription failed.");
        }
    });
});
*/


/* document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const filename = urlParams.get('file');
    const title = urlParams.get('title');

    if (!filename) {
        document.getElementById('video-title').innerText = "Error: No video selected.";
        return;
    }

    document.getElementById('video-title').innerText = title || "Untitled Video";
    const videoSource = document.getElementById('video-source');
    videoSource.src = `http://localhost:8000/videos/${filename}`;
    document.getElementById('main-player').load();

    let currentLikes = 0;
    let currentSubs = 0;

    fetch(`http://localhost:8000/api/videos/details?filename=${filename}`)
        .then(res => res.json())
        .then(data => {
            currentLikes = data.likes;
            currentSubs = data.subscriber_count;
            
            document.getElementById('like-count').innerText = `${currentLikes} Likes`;
            document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;
        });

    fetch('http://localhost:8000/api/videos/view', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: filename })
    }).then(() => console.log("View counted!"));

    const likeBtn = document.getElementById('like-btn');
    const subBtn = document.getElementById('subscribe-btn');

    if (localStorage.getItem(`liked_${filename}`)) {
        likeBtn.innerText = "👍 Liked!";
        likeBtn.style.backgroundColor = "#22c55e";
        likeBtn.disabled = true;
    }

    const token = localStorage.getItem('dtube_token');
    const channelIdToSubscribeTo = 1;
    
    if (token) {
        const payloadBase64 = token.split('.')[1];
        const myUserId = JSON.parse(atob(payloadBase64)).id;

        fetch('http://localhost:8000/api/check-subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriber_id: myUserId, channel_id: channelIdToSubscribeTo })
        })
        .then(res => res.json())
        .then(data => {
            if (data.isSubscribed) {
                subBtn.innerText = "Unsubscribe";
                subBtn.style.backgroundColor = "#64748b";
            }
        });
    }
    likeBtn.addEventListener('click', async () => {
        try {
            const res = await fetch('http://localhost:8000/api/videos/like', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filename: filename })
            });
            if (res.ok) {
                likeBtn.innerText = "👍 Liked!";
                likeBtn.style.backgroundColor = "#22c55e";
                likeBtn.disabled = true; 
                localStorage.setItem(`liked_${filename}`, 'true');
                currentLikes += 1;
                document.getElementById('like-count').innerText = `${currentLikes} Likes`; 
            }
        } catch (error) {
            console.error("Failed to like video.");
        }
    });

    subBtn.addEventListener('click', async () => {
        const token = localStorage.getItem('dtube_token');
        if (!token) {
            alert("You must be logged in to subscribe!");
            window.location.href = "login.html";
            return;
        }

        const payloadBase64 = token.split('.')[1];
        const decodedPayload = JSON.parse(atob(payloadBase64));
        const myUserId = decodedPayload.id;
        const channelIdToSubscribeTo = 1; 

        try {
            const res = await fetch('http://localhost:8000/api/subscribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    subscriber_id: myUserId, 
                    channel_id: channelIdToSubscribeTo 
                })
            });
            
            const data = await res.json();
            if (res.ok) {
                if (data.isSubscribed) {
                    subBtn.innerText = "🔔 Subscribe";
                    subBtn.style.backgroundColor = "#ef4444"; 
                    currentSubs -= 1;
                } else {
                    subBtn.innerText = "Unsubscribe";
                    subBtn.style.backgroundColor = "#64748b"; 
                    currentSubs += 1;
                }
                document.getElementById('sub-count').innerText = `${currentSubs} Subscribers`;
            }
        } catch (error) {
            console.error("Subscription failed.");
        }
    });
});
*/

// document.addEventListener('DOMContentLoaded', () => {
//     const urlParams = new URLSearchParams(window.location.search);
//     const filename = urlParams.get('file');
//     const title = urlParams.get('title');

//     if (!filename) {
//         document.getElementById('video-title').innerText = "Error: No video selected.";
//         return;
//     }

//     document.getElementById('video-title').innerText = title || "Untitled Video";
    
//     const videoSource = document.getElementById('video-source');
//     videoSource.src = `http://localhost:8000/videos/${filename}`;

//     const player = document.getElementById('main-player');
//     player.load();
// });