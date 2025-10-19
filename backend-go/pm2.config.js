module.exports = {
  apps: [
    {
      name: "transgate-backend",               // Friendly name shown in PM2 list
      script: "./app",                         // Compiled Go binary
      cwd: "/www/wwwroot/transgatelb.linksbridge.top/backend-go/cmd/", // Working directory
      exec_mode: "fork",                       // Keep it simple for Go
      instances: 1,                            // You can increase if needed
      env: {
        PORT: 9001,                            // Change if your Go app uses a different port
        NODE_ENV: "production"
      },
      error_file: "/www/wwwlogs/transgate-error.log",
      out_file: "/www/wwwlogs/transgate-out.log",
      merge_logs: true,
      autorestart: true,
      watch: false                             // Keep false for production
    }
  ]
}
