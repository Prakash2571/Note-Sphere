module.exports = {
  apps: [
    {
      name: "notesphere",
      cwd: __dirname,
      script: "./node_modules/next/dist/bin/next",
      args: "start --hostname 127.0.0.1 --port 3000",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
