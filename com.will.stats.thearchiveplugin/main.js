
/**
 * Plugin for "The Archive"
 * Creates a statistics summary of the zettelkasten and a table of monthly note counts
 *   - The user is prompted for a title
 *   - The filename is made from the current timestamp
 *   - A front matter is inserted at the top of the created note
 * 
 * Also Puts a copy of the note in the clipboard for pasting elsewhere.
 * 
 * NB:
 *   - The timestamp is precise to the minute
 *   - The front matter structure is hardcoded
 *
 * @summary create new note with zettelkasten statistics
 * @author Will Simpson <will@kestrelcreek.com>
 *
 * Created on     : 2024-08-29 
 * Last modified  : 2024-10-12 
 */


"use strict";


// Ask user to provide the title for the note
const targetTitle = app.prompt({
  title: "New Note with Timestamp",
  description: "Enter title:",
  placeholder: "Title",
  defaultValue: "",
});
if (targetTitle === null) { // user clicked cancel
    cancel("Creation cancelled");
}

// Generate the UUID
const now = new Date();
const timestampString = [
  now.getFullYear(),
  ('0' + (now.getMonth() + 1)).slice(-2),
  ('0' + now.getDate()).slice(-2),
  ('0' + now.getHours()).slice(-2),
  ('0' + now.getMinutes()).slice(-2),
].join('');

// Create the filename
const targetFilename = `${timestampString} ${targetTitle}`;


//Create Human Readable date
const humanReadableDate = [
  ('0' + now.getDate()).slice(-2),
  ('0' + (now.getMonth() + 1)).slice(-2),
  now.getFullYear(),
].join('-');

//Create Human Readable time
const hours24 = now.getHours();
const minutes = ('0' + now.getMinutes()).slice(-2);
  // Determine AM/PM
const ampm = hours24 >= 12 ? 'PM' : 'AM';
  // Convert to 12-hour format
const hours12 = hours24 % 12 || 12; // Convert '0' to '12'
  // Format hours to always have two digits
const formattedHours = ('0' + hours12).slice(-2);
  // Combine the formatted time
const formattedTime = `${formattedHours}:${minutes} ${ampm}`


// Get the total count of all notes
let totalNotesCount = input.notes.all.length;

// Function to count words in a string
function countWords(text) {
  return text.split(/\s+/).filter(word => word.length > 0).length;
}

// Function to count links in a string
function countLinks(text) {
  const linkRegex = /[ ,§]\[\[/g;
  const matches = text.match(linkRegex);
  return matches ? matches.length : 0;
}

// Function to count notes with the #proofing tag
function countProofingNotes(notes) {
  return notes.filter(note => note.content.includes('#proofing')).length;
}

// Function to extract and count dates from filenames
function countFilesByMonth(notes) {
  let counts = {};
  notes.forEach(note => {
    const match = note.filename.match(/\d{12}/);
    if (match) {
      const dateStr = match[0];
      const year = dateStr.slice(0, 4);
      const month = dateStr.slice(4, 6);
      const key = `${year}-${month}`;
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return counts;
}

// Function to create a Markdown table from counts
function createMonthlyTable(counts) {
  let years = new Set();
  let months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ];
  
  // Collect all years from the counts
  Object.keys(counts).forEach(key => {
    years.add(key.slice(0, 4));
  });
  years = Array.from(years).sort();
  
  // Calculate the maximum width for each column
  const maxYearWidth = Math.max(...years.map(year => year.length), 'Year'.length);
  const maxMonthWidth = Math.max(...months.map(month => month.length));
  const maxCountWidth = Math.max(...Object.values(counts).map(count => String(count).length), 1);
  
  // Create the header row
  let table = `| ${'Year'.padEnd(maxYearWidth)} | ` + months.map(month => month.padEnd(maxMonthWidth)).join(' | ') + ' |\n';
  table += `|${'-'.repeat(maxYearWidth + 2)}|` + months.map(() => '-'.repeat(maxMonthWidth + 2)).join('|') + '|\n';
  
  // Create the rows for each year
  years.forEach(year => {
    let row = `| ${year.padEnd(maxYearWidth)} |`;
    months.forEach((month, index) => {
      const key = `${year}-${String(index + 1).padStart(2, '0')}`;
      row += ` ${String(counts[key] || 0).padEnd(maxMonthWidth)} |`;
    });
    table += row + '\n';
  });
  
  return table;
}

// Calculate the total word count
let totalWordCount = input.notes.all.reduce((acc, note) => acc + countWords(note.content), 0);

// Calculate the total link count
let totalLinkCount = input.notes.all.reduce((acc, note) => acc + countLinks(note.content), 0);

// Calculate the average word count
let averageWordCount = totalNotesCount > 0 ? (totalWordCount / totalNotesCount).toFixed(2) : 0;

// Calculate the average link count
let averageLinkCount = totalNotesCount > 0 ? (totalLinkCount / totalNotesCount).toFixed(2) : 0;

// Calculate the total number of notes with the #proofing tag
let totalProofingNotesCount = countProofingNotes(input.notes.all);

// Calculate the monthly file counts
let monthlyCounts = countFilesByMonth(input.notes.all);

// Create the monthly breakdown table
let monthlyTable = createMonthlyTable(monthlyCounts);

// Use template literals for better formatting
let body = `
---
UUID:     ›[[${timestampString}]]
cdate:    ${humanReadableDate} ${formattedTime} 
tags:     #statistics
---
# ${targetTitle}

Zettelkasten Stats
★★★★★★★★★★★★★★★★★★
Total Number of Notes in Zettelkasten: ${totalNotesCount}
Total Word Count: ${totalWordCount}
Average Word Count: ${averageWordCount}
Total Link Count: ${totalLinkCount}
Average Link Count: ${averageLinkCount}
Total Notes in Proofing Oven: ${totalProofingNotesCount}

Monthly Breakdown:
${monthlyTable}
`;

// Copy the note to the clipboard
app.pasteboardContents = body;

// Set the output with discribed filename and content
output.changeFile.filename = targetFilename;
output.changeFile.content = body;


