# C270-Team1
# StudyHub — C270 Team 1

StudyHub is a Node.js/Express web application for students to manage announcements, study groups, tasks, grades, a peer marketplace for notes, and tutor listings, with role-based access for students and admins. The project is containerized, deployed to the cloud, and built with a full CI/CD, security, and orchestration pipeline as a DevOps case study.

## Tech Stack

- **Backend:** Node.js, Express 5
- **Views:** EJS
- **Database:** MySQL (via `mysql2`)
- **Auth/Sessions:** `express-session`, `bcryptjs`
- **File uploads:** `multer`
- **Containerization:** Docker, Docker Compose, Caddy (reverse proxy / HTTPS)
- **CI/CD:** GitHub Actions
- **IaC / Config management:** Ansible
- **Orchestration:** Kubernetes
- **Security:** Gitleaks, Trivy

## Features

- User registration, login, and role-based access control (student/admin)
- Admin dashboard
- Study groups (create, edit, view details)
- Task management
- Announcements
- Grades view
- Marketplace for buying/selling/sharing notes (student & admin permissions)
- Tutor listings

## Project Structure

```
C270-Team1/
├── studyhub/                  # Main application
│   ├── app.js                 # Express entry point
│   ├── config/                # DB config, CA cert
│   ├── database/              # SQL schema, migrations, seed scripts
│   ├── middleware/             # Auth middleware
│   ├── routes/                 # Route handlers (auth, admin, tasks, grades, etc.)
│   ├── views/                   # EJS templates
│   ├── public/                  # Static assets (CSS, JS, images)
│   ├── K8s/                      # Kubernetes manifests (Deployment, Service, Ingress, PVC)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── Caddyfile                 # Reverse proxy config for HTTPS
├── ansible/                     # IaC playbook for deployment
│   ├── deploy-playbook.yml
│   └── inventory.ini
└── .github/workflows/            # CI/CD, security scan, cloud deploy, tutor-specific CI
```

## Getting Started (Local)

1. Clone the repo and move into the app folder:
   ```bash
   cd studyhub
   ```
2. Create a `.env` file with:
   ```
   DB_HOST=
   DB_PORT=
   DB_USER=
   DB_PASSWORD=
   DB_NAME=
   SESSION_SECRET=
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run database setup/migrations as needed (see `database/init.sql`, `database/migrate*.js`).
5. Start the app:
   ```bash
   npm start
   ```
   The app runs on `http://localhost:3000`.

### Run with Docker Compose

```bash
docker compose up --build
```

This spins up the app container and a Caddy reverse proxy (configured for the `c270-studyhub.duckdns.org` domain).

## Deployment

- **CI:** On every push/PR to `main`, GitHub Actions installs dependencies, runs an Ansible IaC playbook, validates and builds the Docker Compose config.
- **CD:** On success, a Render deploy hook is triggered to push the latest build live.
- **Cloud deployment:** A separate workflow builds and pushes the Docker image to Docker Hub, and another SSHes into a GCE VM to pull the latest code and restart the stack via Docker Compose.
- **Kubernetes:** Manifests in `studyhub/K8s/` define a 2-replica app Deployment, a MySQL Deployment with persistent storage, and an Ingress routing `c270-studyhub.duckdns.org` traffic to the app. Apply with:
  ```bash
  kubectl apply -f K8s/
  ```
  > **Note:** the app and MySQL manifests reference a Kubernetes Secret named `studyhub-secrets` (DB credentials, session secret) that must be created manually before applying — it is intentionally not committed to the repo.
- **Ansible:** `ansible/deploy-playbook.yml` verifies Docker/Compose are installed, tears down and rebuilds the stack (`docker compose down` → `up --build -d`).

## Security / DevSecOps

- **Gitleaks** scans for leaked secrets/API keys on every CI run.
- **Trivy** scans both the filesystem and the built Docker image for HIGH/CRITICAL vulnerabilities, with a scheduled daily scan in addition to push/PR triggers.
- Known accepted CVEs are tracked in `.trivyignore`.

## Tutor Feature CI

A dedicated workflow (`tutor-check.yml`) runs only when tutor-related files change (`routes/tutors.js`, `views/tutors.ejs`, tutor migration scripts). It syntax-checks the JavaScript and confirms the EJS template compiles.

## Team Contributions

| Member | Area |
|---|---|
| Vickson | Containerization, CI |
| Bryan | CD, cloud deployment |
| Angelo | DevSecOps |
| WeiHao | Kubernetes, Ansible |
| Aisha | Tutor-specific CI |
