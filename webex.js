let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
const webexSearchUrl = 'https://webexapis.com/v1/people?displayName=';
const webexMembershipsUrl = 'https://webexapis.com/v1/memberships';
const webexPeopleUrl = 'https://webexapis.com/v1/people?displayName=';

async function get(url, token) {
  console.log('GET: Making HTTP request to:', url);
  console.log('GET: Using token (first 10 chars):', token ? token.substring(0, 10) + '...' : 'No token');

  if (!token) {
    console.error('GET: No webex token specified for request to', url);
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
    console.log('GET: HTTP response status:', data.status);
    const json = await data.json();
    console.log('GET: Received JSON response:', json);
    return json.items || [];
  }
  catch(e) {
    console.error('GET: Error fetching data from', url, ':', e);
    return [];
  }
}

function sendMessage(token, toPersonEmail, markdown, file) {
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

// MODIFIED FUNCTION SIGNATURE AND URL CONSTRUCTION
async function validateVisitorInSpace(visitorEmail, token, roomId, callback) { // <--- CHANGED visitorName to visitorEmail
  console.log('validateVisitorInSpace: Called with:', { visitorEmail, roomId });
  if (!visitorEmail || !token || !roomId) {
    console.error('validateVisitorInSpace: Missing required parameters.', { visitorEmail, token: token ? 'present' : 'missing', roomId });
    callback(false);
    return;
  }

  currentSearchNumber++;
  const id = currentSearchNumber;
  // URL CONSTRUCTION CHANGED TO USE personEmail
  const url = `${webexMembershipsUrl}?roomId=${roomId}&personEmail=${encodeURIComponent(visitorEmail)}`; // <--- CHANGED personDisplayName to personEmail and visitorName to visitorEmail
  console.log('validateVisitorInSpace: Constructed URL:', url);
  const result = await get(url, token);

  if (id < currentSearchNumber) {
    console.log('validateVisitorInSpace: Discarding old search result for:', visitorEmail);
    return;
  }

  const isAuthenticated = result.length > 0;
  console.log('validateVisitorInSpace: Authentication result for', visitorEmail, 'in room', roomId, ':', isAuthenticated);
  callback(isAuthenticated);
}

async function searchHostByName(keyword, token, callback) {
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