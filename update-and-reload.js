const { exec } = require("child_process");
const pkg = require("./package.json");

const REPO_URL = pkg?.repository?.url;
const CURRENT_VERSION = pkg?.version;

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

// Run a command and capture its stdout without printing it to the console
function runSilent(cmd) {
  return new Promise((resolve, reject) => {
    exec(cmd, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
  });
}

async function checkCurrentVersion() {
  console.log(`CURRENT_VERSION: ${CURRENT_VERSION}`);
  let versionOnGithub;
  try {
    console.log(`Checking for updates on git: ${REPO_URL}`);
    let verRez = await runSilent(`git ls-remote ${REPO_URL} refs/tags/v${CURRENT_VERSION}`);
    //console.log(verRez);
    versionOnGithub = (verRez.replace(/.*\/v/g, '')).trim();
  } catch (e) {
    const urlHttps = REPO_URL.replace("git@github.com:", "https://github.com/").replace(".git", "");
    try {
      console.log(`Checking for updates on https releases page: ${urlHttps}/releases/latest`);
      versionPageJson = (await runSilent(`curl -s ${urlHttps}/releases/latest`)).trim();
      versionOnGithub = versionPageJson.match(/<meta property="og:title" content="v(\d+\.\d+\.\d+)"/)[1];
    } catch(e) {
      console.log(`Checking for updates on https package.json: ${urlHttps}/blob/main/package.json`);
      versionPageJson = (await runSilent(`curl -s ${urlHttps}/blob/main/package.json`)).trim();
      versionOnGithub = versionPageJson.match(/"version": "(\d+\.\d+\.\d+)"/)[1];
    }
  }
  return versionOnGithub;
}

(async () => {
  console.log(`Checking for updates`);
  try {
    const currentVersion = await checkCurrentVersion();
    if(currentVersion === CURRENT_VERSION) {
      console.log("Current version is the latest version");
      process.exit(0);
    } else {
      console.log(`Current version is not the latest version, updating to ${currentVersion}`);
    }
    /*
    console.log(`isCurrentVersion: ${isCurrentVersion}`);
    if (!isCurrentVersion) {
      console.log("Current version is not the latest version");
      process.exit(0);
    }
    */
    /*
    const pullCmd = REPO_URL
      ? `git pull ${REPO_URL}`
      : "git pull";
    await run(pullCmd);
    await run("npm install");
    await run("pm2 reload pm2.config.json --env production");
    console.log("Updated from git and reloaded.");
    */
  } catch (e) {
    console.error("Update failed:", e.message);
    process.exit(1);
  }
})();