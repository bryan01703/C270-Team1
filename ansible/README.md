# Ansible Deployment — Infrastructure as Code

## What is IaC?

Infrastructure as Code (IaC) is the practice of managing and provisioning infrastructure through machine-readable configuration files rather than manual processes. This playbook embodies IaC by encoding the entire deployment of the StudyHub stack — dependency checks, container teardown, rebuild, and startup — into a single declarative file.

## What the Playbook Does

1. **Verifies prerequisites** — confirms `docker` and `docker compose` are installed on the host.
2. **Validates directory structure** — ensures the `./studyhub` application directory exists.
3. **Rebuilds the stack** — runs `docker compose down` then `docker compose up --build -d` inside `./studyhub` to pull the latest code and start fresh containers.
4. **Reports status** — outputs the Docker/Compose versions and confirms the application URL.

## Usage

From the `ansible/` directory:

```bash
ansible-playbook -i inventory.ini deploy-playbook.yml
```

## Requirements

- Ansible installed on the host (`pip install ansible`).
- Docker and Docker Compose V2 installed.
- The `studyhub/` directory must exist at the repository root.
