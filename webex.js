let currentSearchNumber = 0;

const webexMsgUrl = 'https://webexapis.com/v1/messages';
const webexSearchPeopleUrl = 'https://webexapis.com/v1/people?displayName='; // Renamed
const webexSearchMembershipsUrl = 'https://webexapis.com/v1/memberships'; // New

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

function mockResult(keyword) {
  const img = Math.ceil(Math.random() * 60);
  return [
    {
      displayName: `${keyword} Johnson`,
      avatar: `https://i.pravatar.cc/500?img=${img}`,
      emails: [`${keyword}@acme.com`],
    },
  ];
}

async function searchPerson(keyword, token, roomId, callback) { // Added roomId parameter
  if (!keyword) return;
  if (!token) {
    callback(mockResult(keyword));
    return;
  }

  currentSearchNumber++;
  const id = currentSearchNumber; // Avoid closure issues with multiple concurrent searches

  let result = [];
  if (roomId) {
    // Search for memberships within a specific room
    // Note: The memberships API does not directly return 'avatar' in the membership object.
    // We map personDisplayName and personEmail. Avatar will be undefined for this search type.
    const url = `${webexSearchMembershipsUrl}?roomId=${roomId}&displayName=${encodeURIComponent(keyword)}`;
    const memberships = await get(url, token);
    result = memberships.map(membership => ({
      displayName: membership.personDisplayName,
      avatar: membership.personAvatar, // This will likely be undefined from memberships API
      emails: [membership.personEmail],
      id: membership.personId // Include personId for potential future use
    }));
  } else {
    // Fallback to searching all people (original behavior)
    const url = webexSearchPeopleUrl + keyword;
    result = await get(url, token);
  }

  // a newer search has been requested, discard this one
  if (id < currentSearchNumber) {
    return;
  }

  callback(result);
}
