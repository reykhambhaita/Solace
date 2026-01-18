require('dotenv').config();
console.log('--- DEBUG ENV ---');
console.log('GROQ_API_KEY:', process.env.GROQ_API_KEY ? 'Present' : 'Missing');
console.log('GITHUB_TOKEN:', process.env.GITHUB_TOKEN ? 'Present' : 'Missing');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? 'Present' : 'Missing');
console.log('YOUTUBE_API_KEY:', process.env.YOUTUBE_API_KEY ? 'Present' : 'Missing');
console.log('PORT:', process.env.PORT);
console.log('--- END DEBUG ---');
