const axios = require('axios');
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

// Define the Chrome version you want to download
const chromeVersion = '90.0.4430.212';

// Define the platform (win, mac, linux)
const platform = process.platform === 'win32' ? 'win' : (process.platform === 'darwin' ? 'mac' : 'linux');

// Define the URL to the Chrome download page
const downloadUrl = `https://www.googleapis.com/download/storage/v1/b/chromium-browser-snapshots/o/${platform}%2F${chromeVersion}%2Fchrome-${platform}.zip?alt=media`;

// Define the path where Chrome will be downloaded and extracted
const chromePath = path.join(__dirname, 'chrome');

// Function to check if Chrome is already installed
async function isChromeInstalled() {
  try {
    await puppeteer.launch({
      executablePath: path.join(chromePath, 'chrome.exe'),
      headless: true,
    });
    console.log('Chrome is already installed.');
    return true;
  } catch (error) {
    console.log('Chrome is not installed.');
    return false;
  }
}

// Function to download and extract Chrome
async function downloadAndExtractChrome() {
  console.log(`Downloading Chrome version ${chromeVersion}...`);

  const response = await axios({
    url: downloadUrl,
    method: 'GET',
    responseType: 'stream',
  });

  const zipPath = path.join(__dirname, 'chrome.zip');
  const writer = fs.createWriteStream(zipPath);

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', async () => {
      console.log('Download completed. Extracting...');

      // Extract the downloaded zip file
      const extract = require('extract-zip');
      await extract(zipPath, { dir: chromePath });

      console.log('Extraction completed.');
      fs.unlinkSync(zipPath); // Remove the zip file after extraction
      resolve();
    });

    writer.on('error', (err) => {
      reject(err);
    });
  });
}

// Main function
async function main() {
  if (!(await isChromeInstalled())) {
    await downloadAndExtractChrome();
  }

  // Continue with your automation using puppeteer
  const browser = await puppeteer.launch({
    executablePath: path.join(chromePath, 'chrome.exe'),
    headless: false,
  });

  // Example: Open a new page
  const page = await browser.newPage();
  await page.goto('https://example.com');

  // Close the browser when done
  await browser.close();
}

main();
