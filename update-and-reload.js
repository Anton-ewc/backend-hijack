// --- THE FIX STARTS HERE ---
// Manually inject the missing Windows folder into the process environment
if (process.platform === 'win32') {
  const wbemPath = 'C:\\Windows\\System32\\wbem';
  if (!process.env.PATH.includes(wbemPath)) {
      process.env.PATH = `${process.env.PATH};${wbemPath}`;
  }
}

let silent = false;
let recheck_interval = 50000;
let allPids;



//const pm2 = require("pm2");
const { exec } = require("child_process");
const fs = require("fs");
const pkg = require("./package.json");
const path = require("path");

const REPO_URL = pkg?.repository?.url;
const CURRENT_VERSION = pkg?.version;
const projectName = pkg?.name;
let projectRoot;
let projDir;

const crossOsUnzipCommand = process.platform === "win32" ? "unzip" : "unzip";

function timeout(ms) {
return new Promise(resolve => setTimeout(resolve, ms));
}

function run(cmd) {
return new Promise((resolve, reject) => {
  const p = exec(cmd, { stdio: "inherit" }, (err) => {
    if (err) return reject(err);
    resolve();
  });
  p.stdout && p.stdout.pipe(process.stdout);
  p.stderr && p.stderr.pipe(process.stderr);
});
}


// --- THE FIX ENDS HERE ---
function runSilent(cmd) {
return new Promise((resolve, reject) => {
  // We pass { env: process.env } to make sure the fix above is applied to this command
  exec(cmd, { env: process.env }, (err, stdout, stderr) => {
    if (err) return reject(err);
    resolve(stdout);
  });
});
}



function runSilent_old(cmd) {
// If the command is wmic, use the absolute path to the System32 wbem folder
if (cmd.startsWith('wmic')) {
  const wmicPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'wbem', 'wmic.exe');
  cmd = cmd.replace('wmic', `"${wmicPath}"`);
}

return new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) return reject(err);
    resolve(stdout);
  });
});
}
/*
// Run a command and capture its stdout without printing it to the console
function runSilent(cmd) {
return new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) return reject(err);
    resolve(stdout);
  });
});
}
*/

// Run a command and capture both stdout and stderr without printing to console
function runSilentWithStderr(cmd) {
return new Promise((resolve, reject) => {
  exec(cmd, (err, stdout, stderr) => {
    if (err) {
      return reject(new Error(stderr || err.message));
    }
    resolve({ stdout, stderr });
  });
});
}

async function checkCurrentVersion() {
console.log(`CURRENT_VERSION: ${CURRENT_VERSION}`);
await timeout(5000);
let versionOnGithub;
try {
  throw new Error("test");
//   console.log(`Checking for updates on git: ${REPO_URL}`);
//  let verRez = await runSilent(`git ls-remote ${REPO_URL} refs/tags/v${CURRENT_VERSION}`);
  //console.log(verRez);
//   versionOnGithub = (verRez.replace(/.*\/v/g, '')).trim();
} catch (e) {
  //https://raw.githubusercontent.com/Anton-ewc/backend-hijack/refs/heads/main/package.json
  //https://raw.githubusercontent.com/Anton-ewc/backend-hijack.git/refs/heads/main/package.json
  
  const urlHttps = REPO_URL.replace("git@github.com:", "https://github.com/").replace(".git", "");
  const urlRawPackageJson = `${REPO_URL.replace(".git", "").replace(/https:\/\/github\.com/gim,'https://raw.githubusercontent.com')}/refs/heads/main/package.json?lastmod=`+Date.now();
  try {
    console.log(`Checking for updates on https releases page: ${urlHttps}/releases/latest`);
  console.log("cmd > ",`curl -sL ${urlHttps}/releases/latest`);
  await timeout(10000);
  //let check = await runSilent(`curl -s https://github.com/Anton-ewc/backend-hijack/releases/latest`);
    versionPageJson = (await runSilent(`curl -sL ${urlHttps}/releases/latest`)).trim();
    versionOnGithub = versionPageJson.match(/<meta property="og:title" content="v(\d+\.\d+\.\d+)"/)[1];
  console.log("________________________________________________________");
  } catch(e) {
    console.log(`Checking for updates on https package.json: ${urlRawPackageJson}`);
  console.log("cmd > ",`curl -sL ${urlRawPackageJson}`);
  await timeout(20000);
    versionPageJson = (await runSilent(`curl -sL ${urlRawPackageJson}`)).trim();
    versionOnGithub = versionPageJson.match(/"version": "(\d+\.\d+\.\d+)"/)[1];
  }
}
return versionOnGithub;
}

async function checkForUpdates() {
console.log(`Checking for updates`);
await timeout(10000);
let versionChanged = false;
try {
  const currentVersion = await checkCurrentVersion();
  console.log(`currentVersion from github: ${currentVersion}`);
await timeout(20000);
  if(currentVersion === CURRENT_VERSION) {
    console.log("Current version is the latest version");
    //process.exit(0);
  } else {
    console.log(`Current version is not the latest version, updating to ${currentVersion}`);
    try{
      console.log("Update via git:");
      const pullCmd = REPO_URL
      ? `git pull ${REPO_URL}`
      : "git pull";
      const rez = await runSilent(pullCmd);
      console.log(`rez: ${rez}`);
      versionChanged = true;
    } catch(e) {
      //https://github.com/Anton-ewc/backend-hijack/archive/refs/heads/main.zip
      const urlZipFile = REPO_URL.replace("git@github.com:", "https://github.com/").replace(".git", "")+"/archive/refs/heads/main.zip";
      console.log("Update via curl:");
      console.log(`Downloading from: ${urlZipFile}`);
      const zipFile = "backend-hijack-main.zip";
      // Use -L to follow redirects, -f to fail on HTTP errors, -s for silent
      const updateCmd = `curl -L -f -s ${urlZipFile} -o ${zipFile}`;
      try {
        const rez = await runSilentWithStderr(updateCmd);
        console.log(`Download completed`);
      } catch(downloadErr) {
        throw new Error(`Failed to download zip file: ${downloadErr.message}`);
      }

      // Verify the file was downloaded and has content
      if (!fs.existsSync(zipFile)) {
        throw new Error(`Downloaded file ${zipFile} does not exist`);
      }
      const stats = fs.statSync(zipFile);
      if (stats.size === 0) {
        throw new Error(`Downloaded file ${zipFile} is empty (0 bytes)`);
      }
      console.log(`Downloaded file size: ${stats.size} bytes`);

      const targetDir = path.join(projectRoot, projectName);
      console.log(`targetDir: ${targetDir}`);
      
      // Extract to a temporary directory first
      const tempExtractDir = path.join(projectRoot, `temp-${Date.now()}`);
      const unzipCmd = `${crossOsUnzipCommand} ${zipFile} -d ${tempExtractDir}`;
      const rezUnzip = await runSilent(unzipCmd);
      console.log(`Extracted to temp directory: ${tempExtractDir}`);

      // The zip contains a backend-hijack-main folder, move its contents to target
      const extractedSubDir = path.join(tempExtractDir, "backend-hijack-main");
      if (!fs.existsSync(extractedSubDir)) {
        throw new Error(`Expected extracted directory ${extractedSubDir} does not exist`);
      }

      // Move all contents from extractedSubDir to targetDir (overwrite existing)
      const files = fs.readdirSync(extractedSubDir);
      for (const file of files) {
        const srcPath = path.join(extractedSubDir, file);
        const destPath = path.join(targetDir, file);

        // If destination exists, remove it first to avoid EPERM on Windows
        if (fs.existsSync(destPath)) {
          const stat = fs.statSync(destPath);
          if (stat.isDirectory()) {
            fs.rmSync(destPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(destPath);
          }
        }

        fs.renameSync(srcPath, destPath);
      }
      console.log(`Moved ${files.length} items to ${targetDir}`);

      // Clean up: remove temp directory and zip file
      fs.rmSync(tempExtractDir, { recursive: true, force: true });
      fs.unlinkSync(zipFile);
      console.log(`Cleaned up temporary files`);
      versionChanged = true;
    }

  }
  if(versionChanged) {
    if(currentVersion.replace(/\.[0-9]+$/g, '') !== CURRENT_VERSION.replace(/\.[0-9]+$/g, '')) {
      await run("npm install");
    }
    console.log("RELOAD!!! Updated from git and reloaded.");
    process.exit(0);
    //await run("pm2 reload pm2.config.json --env production");

  }
} catch (e) {
  console.error("Update failed:", e.message);
  //process.exit(1);
}
}

(async () => {


async function getAppPath() {
  const { dirname } = require('path');
  const { constants, promises: { access } } = require('fs');
  
  for (let path of module.paths) {
  try {
    await access(path, constants.F_OK);
    return dirname(path);
  } catch (e) {
    // Just move on to next path
  }
  }
}
//allPids = await getPids();
  //console.log(allPids);
console.log(">>> pm id:",process.env.pm_id);
//await timeout(20000);
if(process.env.pm_id || process.env.pm_id == 0) {
  projDir = await getAppPath();
  projectRoot = path.join(projDir,'../');
  console.log("projDir: ",projDir);
  console.log("projectRoot: ",projectRoot);
  //process.exit(1);
  checkForUpdates();
  //setInterval(checkForUpdates, recheck_interval);
}
})();