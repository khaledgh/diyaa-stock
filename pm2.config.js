module.exports = {
    apps: [
      {
        name: "transgate-backend",
        script: "./app", // Replace with your built Go binary name
        cwd: "/www/wwwroot/transgatelb.linksbridge.top/backend-go/cmd/",
        exec_mode: "fork",
        autorestart: true
      },
    ]
  };