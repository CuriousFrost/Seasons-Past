const fs = require('fs');
const path = require('path');

const COMMANDERS_FILE = path.join(__dirname, 'commanders.json');

// Fetch all legal commanders from Scryfall
async function fetchAllCommanders() {
  console.log('Fetching commanders from Scryfall...');
  let allCommanders = [];
  let hasMore = true;
  let nextPage = 'https://api.scryfall.com/cards/search?q=is:commander';

  try {
    while (hasMore) {
      const response = await fetch(nextPage);
      const data = await response.json();
      
      // Extract relevant info from each card
      const commanders = data.data.map(card => ({
        name: card.name,
        colorIdentity: card.color_identity || [],
        colors: card.colors || [],
        type: card.type_line
      }));
      
      allCommanders = allCommanders.concat(commanders);
      
      hasMore = data.has_more;
      if (hasMore) {
        nextPage = data.next_page;
        // Be nice to Scryfall's API - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`Fetched ${allCommanders.length} commanders so far...`);
    }
    
    // Save to file
    fs.writeFileSync(COMMANDERS_FILE, JSON.stringify(allCommanders, null, 2));
    console.log(`✓ Saved ${allCommanders.length} commanders to ${COMMANDERS_FILE}`);
    
    return allCommanders;
  } catch (error) {
    console.error('Error fetching commanders:', error);
    return null;
  }
}

// Load commanders from local file, or fetch if doesn't exist
async function loadCommanders() {
  if (fs.existsSync(COMMANDERS_FILE)) {
    console.log('Loading commanders from cache...');
    const data = fs.readFileSync(COMMANDERS_FILE, 'utf8');
    return JSON.parse(data);
  } else {
    console.log('No cached commanders found, fetching from Scryfall...');
    return await fetchAllCommanders();
  }
}

// Refresh the commander database
async function refreshCommanders() {
  return await fetchAllCommanders();
}

module.exports = {
  loadCommanders,
  refreshCommanders
};