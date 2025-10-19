module.exports = {
  apps: [
    {
      name: "transgate-backend",
      script: "/www/wwwroot/transgatelb.linksbridge.top/backend-go/cmd/app", // ✅ absolute path to binary
      cwd: "/www/wwwroot/transgatelb.linksbridge.top/backend-go/cmd",        // working directory
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      error_file: "/www/wwwlogs/transgate-error.log",
      out_file: "/www/wwwlogs/transgate-out.log",
      merge_logs: true,
      env: {
        PORT: 9001,
        NODE_ENV: "production"
      }
    }
  ]
}