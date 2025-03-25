module.exports = {
    apps: [
      {
        name: "imagepro-backend",
        script: "backend/server.js",
        cwd: "./",
        env: {
          NODE_ENV: "production",
          PORT: 3000,
          MONGODB_URI: "mongodb://localhost:27017/realestate-imagepro",
          JWT_SECRET: "your_jwt_secret_here"
        },
        error_file: "./logs/backend-error.log",
        out_file: "./logs/backend-output.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss",
        watch: false,
        max_memory_restart: "500M"
      },
      {
        name: "imagepro-frontend",
        script: "serve",
        cwd: "./frontend/build",
        args: "-s",
        env: {
          NODE_ENV: "production"
        },
        error_file: "./logs/frontend-error.log",
        out_file: "./logs/frontend-output.log",
        log_date_format: "YYYY-MM-DD HH:mm:ss",
        watch: false,
        max_memory_restart: "300M"
      }
    ],
    deploy: {
      production: {
        user: "your_deploy_user",
        host: "your_server_ip_or_domain",
        ref: "origin/main",
        repo: "git@github.com:yourusername/realestate-imagepro.git",
        path: "/var/www/realestate-imagepro",
        "pre-deploy-local": "",
        "post-deploy": 
          "npm install && " +
          "cd backend && npm install && " +
          "cd ../frontend && npm install && npm run build && " +
          "npm install -g serve && " +
          "cd .. && " +
          "pm2 reload ecosystem.config.js",
        env: {
          NODE_ENV: "production"
        }
      }
    }
  };