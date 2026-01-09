let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
// The original webexSearchUrl is kept for historical context but is not directly used in the new logic.
const webexSearchUrl = 'https://webexapis.com/v1/people?displayName='; 
// New: URLs for specific API endpoints
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
  console.log('validateVisitorInSpace: Called with:', { visitorEmail, roomId }); // LOG UPDATED
  if (!visitorEmail || !token || !roomId) { // PARAMETER CHECK UPDATED
    console.error('validateVisitorInSpace: Missing required parameters.', { visitorEmail, token: token ? 'present' : 'missing', roomId }); // ADDED LOG
    callback(false);
    return;
  }

  currentSearchNumber++;
  const id = currentSearchNumber;
  // URL CONSTRUCTION CHANGED TO USE personEmail
  const url = `${webexMembershipsUrl}?roomId=${roomId}&personEmail=${encodeURIComponent(visitorEmail)}`; // <--- CHANGED personDisplayName to personEmail
  console.log('validateVisitorInSpace: Constructed URL:', url); // ADDED LOG
  const result = await get(url, token);

  if (id < currentSearchNumber) {
    console.log('validateVisitorInSpace: Discarding old search result for:', visitorEmail); // LOG UPDATED
    return;
  }

  const isAuthenticated = result.length > 0;
  console.log('validateVisitorInSpace: Authentication result for', visitorEmail, 'in room', roomId, ':', isAuthenticated); // LOG UPDATED
  callback(isAuthenticated);
}

// New: Function to search for a host by display name using the Webex People API
async function searchHostByName(keyword, token, callback) {
  if (!keyword || !token) return;

  // Note: Re-using currentSearchNumber for both search types might lead to issues
  // if both are called rapidly. For this specific use case (visitor validation then host search),
  // it should be fine as they are sequential.
  currentSearchNumber++;
  const id = currentSearchNumber;
  const url = webexPeopleUrl + encodeURIComponent(keyword);
  const result = await get(url, token);

  // a newer search has been requested, discard this one
  if (id < currentSearchNumber) {
    return;
  }

  callback(result);
}