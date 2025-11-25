let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
// The original webexSearchUrl is kept for historical context but is not directly used in the new logic.
const webexSearchUrl = 'https://webexapis.com/v1/people?displayName='; 
// New: URLs for specific API endpoints
const webexMembershipsUrl = 'https://webexapis.com/v1/memberships';
const webexPeopleUrl = 'https://webexapis.com/v1/people?displayName=';

async function get(url, token) {
  if (!token) throw(new Error('No webex token specified'));

  const options = {
    method: 'GET',
    headers: {
      Authorization: 'Bearer ' + token,
    },
  };
  try {
    const data = await fetch(url, options);
    const json = await data.json();
    return json.items || [];
  }
  catch(e) {
    console.log('not able to fetch');
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

// New: Function to validate if a visitor is in a specific Webex space (roomId)
async function validateVisitorInSpace(visitorName, token, roomId, callback) {
  if (!visitorName || !token || !roomId) return;

  currentSearchNumber++;
  const id = currentSearchNumber; // avoid closure
  const url = `${webexMembershipsUrl}?roomId=${roomId}&personDisplayName=${encodeURIComponent(visitorName)}`;
  const result = await get(url, token);

  // a newer search has been requested, discard this one
  if (id < currentSearchNumber) {
    return;
  }

  // If any membership is found, the visitor is considered authenticated
  callback(result.length > 0);
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
