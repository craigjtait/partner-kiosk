let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
const webexSearchUrl = 'https://webexapis.com/v1/people?displayName=';
const webexMembershipsUrl = 'https://webexapis.com/v1/memberships';
const webexPeopleUrl = 'https://webexapis.com/v1/people?displayName=';

async function get(url, token) {
  console.log('GET: Making HTTP request to:', url); // ADDED LOG
  console.log('GET: Using token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'No token'); // ADDED LOG

  if (!token) {
    console.error('GET: No webex token specified for request to', url); // ADDED LOG
    throw(new Error('No webex token specified'));
  }

  const options = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };
  try {
    const data = await fetch(url, options);
    console.log('GET: HTTP response status:', data.status); // ADDED LOG
    const json = await data.json();
    console.log('GET: Received JSON response:', json); // ADDED LOG
    return json.items || [];
  }
  catch(e) {
    console.error('GET: Error fetching data from', url, ':', e); // ADDED LOG
    return [];
  }
}

function sendMessage(token, toPersonEmail, markdown, file) {
  // ... (no changes needed here for now) ...
  const formData = new FormData();
  if (file) {
    formData.append('files', file);
  }
  formData.set('markdown', markdown);
  formData.set('toPersonEmail', toPersonEmail);

  const options = {
    headers: {
      Authorization: 'Bearer ' + token,
    },
    method: 'POST',
    body: formData,
  };

  return fetch(webexMsgUrl, options);
}

async function validateVisitorInSpace(visitorName, token, roomId, callback) {
  console.log('validateVisitorInSpace: Called with:', { visitorName, roomId }); // ADDED LOG
  if (!visitorName || !token || !roomId) {
    console.error('validateVisitorInSpace: Missing required parameters.', { visitorName, token: token ? 'present' : 'missing', roomId }); // ADDED LOG
    callback(false); // Ensure callback is called even on error
    return;
  }

  currentSearchNumber++;
  const id = currentSearchNumber;
  const url = `${webexMembershipsUrl}?roomId=${roomId}&personDisplayName=${encodeURIComponent(visitorName)}`;
  console.log('validateVisitorInSpace: Constructed URL:', url); // ADDED LOG
  const result = await get(url, token);

  if (id < currentSearchNumber) {
    console.log('validateVisitorInSpace: Discarding old search result for:', visitorName); // ADDED LOG
    return;
  }

  const isAuthenticated = result.length > 0;
  console.log('validateVisitorInSpace: Authentication result for', visitorName, 'in room', roomId, ':', isAuthenticated); // ADDED LOG
  callback(isAuthenticated);
}

async function searchHostByName(keyword, token, callback) {
  // ... (no changes needed here for now, this function is no longer used in index.js but kept for completeness) ...
  if (!keyword || !token) return;

  currentSearchNumber++;
  const id = currentSearchNumber;
  const url = webexPeopleUrl + encodeURIComponent(keyword);
  const result = await get(url, token);

  if (id < currentSearchNumber) {
    return;
  }

  callback(result);
}