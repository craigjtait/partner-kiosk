let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
const webexMembershipsUrl = 'https://webexapis.com/v1/memberships';

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

async function checkVisitorMembership(email, roomId, token, callback) {
  if (!email || !roomId) {
    callback(false); // Cannot check without email or roomId
    return;
  }
  if (!token) {
    // If token is missing, we cannot perform a real check.
    callback(false); // Assume not authorized if no token
    return;
  }

  const url = `${webexMembershipsUrl}?roomId=${roomId}&personEmail=${encodeURIComponent(email)}`;
  try {
    const result = await get(url, token);
    callback(result.length > 0); // True if any membership found, false otherwise
  } catch (e) {
    console.error('Error checking visitor membership:', e);
    callback(false); // Assume not authorized on error
  }
}


async function searchMembership(keyword, token, roomId, callback) {
  if (!keyword) return;
  if (!token || !roomId) {
    // If token or roomId is missing, we cannot perform a real search.
    // This case should ideally be handled before calling this function.
    callback([]); // Return empty list if config is missing
    return;
  }

  currentSearchNumber++;
  const id = currentSearchNumber; // avoid closure
  const url = `${webexMembershipsUrl}?roomId=${roomId}&displayName=${encodeURIComponent(keyword)}`;
  const result = await get(url, token);

  // a newer search has been requested, discard this one
  if (id < currentSearchNumber) {
    return;
  }

  callback(result);
}
