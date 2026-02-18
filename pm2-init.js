const { exec } = require("child_process");

function run(cmd, { ignoreError = false } = {}) {
  return new Promise((resolve, reject) => {
    console.log(`> ${cmd}`);
    const child = exec(cmd, (err, stdout, stderr) => {
      if (stdout) process.stdout.write(stdout);
      if (stderr) process.stderr.write(stderr);
      if (err && !ignoreError) return reject(err);
      resolve();
    });
  });
}

(async () => {
  try {
    await run("pm2 start pm2.config.json");
    await run("pm2 save");

    if (process.platform === "win32") {
      console.log(
        'Skipping "pm2 startup" on Windows (no supported init system). Processes are still managed by PM2.'
      );
    } else {
      await run("pm2 startup", { ignoreError: true });
    }

    console.log("PM2 init completed.");
  } catch (e) {
    console.error("PM2 init failed:", e.message);
    process.exit(1);
  }
})();

