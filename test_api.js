const key = "AIzaSyDmXzUEWfYyHtHDx1BA7dk_-vySN-e-N2A";
fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
