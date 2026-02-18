const { exec } = require("child_process");

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
    await run("git pull");
    await run("npm install");
    await run("pm2 reload pm2.config.json --env production");
    console.log("Updated from git and reloaded.");
  } catch (e) {
    console.error("Update failed:", e.message);
    process.exit(1);
  }
})();