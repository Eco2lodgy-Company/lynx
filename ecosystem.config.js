module.exports = {
  apps: [
    {
      name: "lynx-api",
      script: "node",
      args: "dist/index.js",
      cwd: "/var/www/lynx/apps/api",
      env: {
        NODE_ENV: "production",
        PORT: 3021
      }
    },
    {
      name: "lynx-web",
      script: "npx",
      args: "next start -p 3020",
      cwd: "/var/www/lynx/apps/web",
      env: {
        NODE_ENV: "production"
      }
    }
  ]
};
