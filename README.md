## Backend Hijack
Simple Express backend using MySQL and Pug templates.

## Installation
- **Prerequisites**
  - Node.js (v18+ recommended)
  - npm (comes with Node)
  - MySQL server (with a database/user you can connect to)

- **Clone & install**
  - `git clone <your-repo-url>`
  - `cd backend-hijack`
  - `npm install`

## Environment configuration
Create a `.env` file in the project root. Example:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=3306
DB_USER=my_user
DB_PASSWORD=my_password
DB_NAME=my_database

SESSION_SECRET=super_secret_string
```

- **Notes**
  - `PORT`: HTTP port the Express app listens on.
  - `DB_*`: MySQL connection details.
  - `SESSION_SECRET`: any long random string used by `express-session`.

## Running the app
- **Development (with auto‑reload if you add nodemon)**
  - `npm run dev`

- **Production**
  - `npm start`

## PM2 (optional)
If you want to run the app with PM2, create/update `pm2.config.json` similar to:

```json
{
  "apps": [
    {
      "name": "backend-hijack",
      "script": "src/index.js",
      "env": {
        "NODE_ENV": "development"
      },
      "env_production": {
        "NODE_ENV": "production"
      }
    }
  ]
}
```

Then start with:
- `pm2 start pm2.config.json --env production`

## Scripts
- **npm start**: runs `node src/index.js`
- **npm run dev**: runs `nodemon src/index.js` (requires `nodemon` installed globally or added as a devDependency)
- **npm run build**: reinstalls all dependencies (as defined in `package.json`)
