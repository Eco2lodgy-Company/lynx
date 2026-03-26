module.exports = {
  apps: [
    {
      name: "lynx-api",
      script: "npx",
      args: "tsx apps/api/src/index.ts",
      cwd: "/var/www/lynx",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      }
    },
    {
      name: "lynx-web",
      script: "node_modules/.bin/next",
      args: "start",
      cwd: "/var/www/lynx/apps/web",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};
