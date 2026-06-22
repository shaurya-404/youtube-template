document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('dtube_token');
    if (!token) return window.location.replace("index.html");

    const uploadForm = document.getElementById('uploadForm');
    const uploadStatus = document.getElementById('upload-status');
    const uploadBtn = document.getElementById('upload-btn');

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        uploadBtn.innerText = "Uploading... ⏳";
        uploadBtn.disabled = true;

        const formData = new FormData();
        formData.append('title', document.getElementById('upload-title').value);
        formData.append('video', document.getElementById('upload-file').files[0]);

        try {
            const response = await fetch('http://localhost:8000/api/upload', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (response.ok) {
                uploadStatus.innerHTML = "<p style='color: #22c55e;'>Upload successful! Redirecting...</p>";
                setTimeout(() => window.location.href = "myvideos.html", 1500);
            } else {
                const data = await response.json();
                uploadStatus.innerHTML = `<p style='color: #ef4444;'>${data.message || "Upload failed."}</p>`;
                uploadBtn.innerText = "Publish Video";
                uploadBtn.disabled = false;
            }
        } catch (err) {
            uploadStatus.innerHTML = "<p style='color: #ef4444;'>Server error.</p>";
            uploadBtn.innerText = "Publish Video";
            uploadBtn.disabled = false;
        }
    });
});