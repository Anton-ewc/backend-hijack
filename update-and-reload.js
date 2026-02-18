const { exec } = require("child_process");
const pkg = require("./package.json");

const REPO_URL = pkg?.repository?.url;

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

(async () => {
  try {
    const pullCmd = REPO_URL
      ? `git pull ${REPO_URL}`
      : "git pull";
    await run(pullCmd);
    await run("npm install");
    await run("pm2 reload pm2.config.json --env production");
    console.log("Updated from git and reloaded.");
  } catch (e) {
    console.error("Update failed:", e.message);
    process.exit(1);
  }
})();