// Function to ensure service worker files exist
async function validateServiceWorkerFiles() {
  const swFilePath = path.join(__dirname, 'public', 'sw.js');

  try {
    if (fs.existsSync(swFilePath)) {
      console.log(`Service Worker file exists at: ${swFilePath} ✅`);
    } else {
      console.log(`Service Worker file missing at: ${swFilePath} ❌`);
    }
  } catch (err) {
    console.error('Error checking service worker file:', err);
  }
}
