# start-k8s.ps1
Write-Host "Deploying StudyHub to Kubernetes..." -ForegroundColor Cyan

# Apply all Kubernetes manifests inside the K8s folder
kubectl apply -f K8s/

Write-Host "`nWaiting for pods to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Show running resources
Write-Host "`nCurrent Cluster Status:" -ForegroundColor Green
kubectl get pods
kubectl get svc,ingress