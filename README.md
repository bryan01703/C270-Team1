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

This spins up the app container and a Caddy reverse proxy (configured for the `c270-studyhub.duckdns.org` domain)

## Deployment

- **CI:** GitHub Actions runs on pushes and pull requests to `main`. It installs dependencies, runs validation checks, executes the Ansible playbook, validates Docker Compose, builds the Docker image, and performs Gitleaks and Trivy security scans. Application tests will run once `app.test.js` is integrated.

- **Docker image delivery:** A separate workflow builds the StudyHub Docker image and pushes it to Docker Hub. Kubernetes pulls this image during deployment.

- **CD:** The `Deploy to GCE` workflow connects to the current GCE VM through SSH, pulls the latest repository changes, and deploys the Kubernetes manifests using K3s:

  ```bash
  sudo k3s kubectl apply -f studyhub/K8s/
  sudo k3s kubectl rollout restart deployment/studyhub-app
  sudo k3s kubectl rollout status deployment/studyhub-app --timeout=120s
Kubernetes on GCE: K3s runs on the GCE VM. The manifests in studyhub/K8s/ define:
A two-replica StudyHub application Deployment.
A MySQL Deployment with persistent storage.
ClusterIP Services for the application and database.
A Traefik Ingress routing c270-studyhub.duckdns.org to StudyHub.
Apply the manifests manually with:
sudo k3s kubectl apply -f studyhub/K8s/

Kubernetes secrets: The app and MySQL manifests use a Kubernetes Secret named studyhub-secrets for database credentials and the session secret. This secret is created manually from the VM’s environment configuration and is intentionally not committed to the repository.

Ansible: ansible/deploy-playbook.yml verifies Docker and Docker Compose, then automates the Docker Compose deployment. It is retained as an infrastructure automation component but is separate from the Kubernetes runtime deployment.

## Security / DevSecOps

- **Gitleaks** scans for leaked secrets/API keys on every CI run.
- **Trivy** scans both the filesystem and the built Docker image for HIGH/CRITICAL vulnerabilities, with a scheduled daily scan in addition to push/PR triggers.
- Known accepted CVEs are tracked in `.trivyignore`.

## Tutor Feature CI

A dedicated workflow (`tutor-check.yml`) runs only when tutor-related files change (`routes/tutors.js`, `views/tutors.ejs`, tutor migration scripts). It syntax-checks the JavaScript and confirms the EJS template compiles.

Test case
