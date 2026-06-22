// Function to hide all sections and show only the one we want
function showSection(sectionId) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('signup-section').style.display = 'none';
    document.getElementById('forgot-section').style.display = 'none';
    document.getElementById('message-box').style.display = 'none';
    document.getElementById(sectionId).style.display = 'block';
}

function showMessage(text, isError = false) {
    const msgBox = document.getElementById('message-box');
    msgBox.innerText = text;
    msgBox.style.display = 'block';
    msgBox.style.backgroundColor = isError ? '#ef4444' : '#22c55e';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch('http://localhost:8000/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage("Login successful! Redirecting...");
            localStorage.setItem('dtube_token', data.token);
            setTimeout(() => {
                window.location.href = "studio.html"; 
            }, 1000);
        } else {
            showMessage(data.message, true);
        }
    } catch (err) {
        showMessage("Server error.", true);
    }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;

    try {
        const response = await fetch('http://localhost:8000/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage("Account created! Please log in.");
            showSection('login-section');
        } else {
            showMessage(data.message, true);
        }
    } catch (err) {
        showMessage("Server error.", true);
    }
});

document.getElementById('forgotForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('forgot-email').value;
    const newPassword = document.getElementById('forgot-new-password').value;

    try {
        const response = await fetch('http://localhost:8000/api/reset-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, newPassword })
        });
        const data = await response.json();

        if (response.ok) {
            showMessage("Password reset successfully! Please log in.");
            showSection('login-section');
        } else {
            showMessage(data.message, true);
        }
    } catch (err) {
        showMessage("Server error.", true);
    }
});