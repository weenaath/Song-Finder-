const clientId = '2d17b5cbde5348d1a218fba9032d1830';
const clientSecret = '92ada8c7f25c4d52ac923dd89f8164d5';
const musixmatchApiKey = 'YOUR_MUSIXMATCH_API_KEY';

async function getAccessToken() {
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + btoa(clientId + ':' + clientSecret)
    },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  return data.access_token;
}

async function getArtistGenres(artistId, token) {
  try {
    const response = await fetch(`https://api.spotify.com/v1/artists/${artistId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    return data.genres.length > 0 ? data.genres.join(', ') : 'Unknown';
  } catch {
    return 'Unknown';
  }
}

async function getLyrics(trackName, artistName) {
  const proxyUrl = 'https://cors-anywhere.herokuapp.com/';
  const apiUrl = `https://api.musixmatch.com/ws/1.1/matcher.lyrics.get?format=json&q_track=${encodeURIComponent(trackName)}&q_artist=${encodeURIComponent(artistName)}&apikey=${musixmatchApiKey}`;
  try {
    const response = await fetch(proxyUrl + apiUrl);
    const data = await response.json();
    if (data.message.header.status_code === 200 && data.message.body.lyrics) {
      let lyrics = data.message.body.lyrics.lyrics_body;
      return lyrics.replace('******* This Lyrics is NOT for Commercial use *******', '').trim() || 'Lyrics not available.';
    }
    return 'Lyrics not available.';
  } catch {
    return 'Lyrics could not be loaded.';
  }
}

function toggleLyrics(event, lyricsDiv) {
  event.stopPropagation();
  lyricsDiv.classList.toggle('visible');
  event.target.textContent = lyricsDiv.classList.contains('visible') ? 'Hide Lyrics' : 'Show Lyrics';
}

async function searchSongs() {
  const query = document.getElementById('searchInput').value.trim();
  const loading = document.getElementById('loading');
  const resultsDiv = document.getElementById('results');

  if (!query) {
    alert('Please enter a search term.');
    return;
  }

  loading.style.display = 'block';
  resultsDiv.innerHTML = '';

  try {
    const token = await getAccessToken();
    const response = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=12`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();

    if (data.tracks.items.length === 0) {
      resultsDiv.innerHTML = '<p>No results found.</p>';
      return;
    }

    const songElements = await Promise.all(data.tracks.items.map(async (track) => {
      const artistId = track.artists[0]?.id;
      const genres = artistId ? await getArtistGenres(artistId, token) : 'Unknown';
      const releaseYear = track.album.release_date?.split('-')[0] || 'Unknown';
      const lyrics = await getLyrics(track.name, track.artists[0].name);

      const songDiv = document.createElement('div');
      songDiv.className = 'song';
      songDiv.innerHTML = `
        <img src="${track.album.images[1]?.url || 'https://via.placeholder.com/150'}" alt="${track.name}">
        <div class="song-info">
          <h3>${track.name}</h3>
          <p><strong>Artist:</strong> ${track.artists.map(a => a.name).join(', ')}</p>
          <p><strong>Album:</strong> ${track.album.name}</p>
          <p><strong>Year:</strong> ${releaseYear}</p>
          <p><strong>Genres:</strong> ${genres}</p>
          <div class="toggle-lyrics">Show Lyrics</div>
          <div class="lyrics">${lyrics}</div>
        </div>
      `;
      const toggleLink = songDiv.querySelector('.toggle-lyrics');
      const lyricsDiv = songDiv.querySelector('.lyrics');
      toggleLink.addEventListener('click', (e) => toggleLyrics(e, lyricsDiv));
      return songDiv;
    }));

    songElements.forEach(el => resultsDiv.appendChild(el));
  } catch (error) {
    console.error('Search error:', error);
    resultsDiv.innerHTML = '<p>Something went wrong. Please try again.</p>';
  } finally {
    loading.style.display = 'none';
  }
}

document.getElementById('searchInput').addEventListener('keyup', function(e) {
  if (e.key === 'Enter') searchSongs();
});
